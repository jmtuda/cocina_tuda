import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CatalogService } from '../../catalog/application/catalog.service.js';
import { ClassificationService } from '../../catalog/application/classification.service.js';
import { RecipeService } from '../../library/application/recipe.service.js';
import {
  RECIPE_INTERPRETER,
  type RecipeInterpreter,
} from './recipe-interpreter.js';
import { SOURCE_EXTRACTOR, type SourceExtractor } from './source-extractor.js';
import { UNIT_OF_WORK, type UnitOfWork } from './unit-of-work.js';
import type {
  ConfirmedIngredient,
  ConfirmedRecipeImport,
  ConfirmedReference,
  ImportSource,
  RawRecipeProposal,
  Resolution,
  ResolvedRecipeProposal,
} from '../domain/import-proposal.js';

type Named = { id: string; name: string; normalizedName: string };

@Injectable()
export class ImportService {
  constructor(
    @Inject(SOURCE_EXTRACTOR) private readonly extractor: SourceExtractor,
    @Inject(RECIPE_INTERPRETER)
    private readonly interpreter: RecipeInterpreter,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    private readonly catalog: CatalogService,
    private readonly classifications: ClassificationService,
    private readonly recipes: RecipeService,
  ) {}

  async propose(source: ImportSource, consent: boolean) {
    if (!consent)
      throw new BadRequestException(
        'Debes confirmar el envío al proveedor externo',
      );
    const input = await this.extractor.extract(source);
    const raw = this.validateRaw(await this.interpreter.interpret(input));
    return {
      importId: randomUUID(),
      proposal: await this.resolve(raw),
    };
  }

  confirm(input: ConfirmedRecipeImport) {
    this.validateConfirmation(input);
    return this.unitOfWork.runIdempotent(
      input.importId,
      (recipeId) => this.recipes.get(recipeId),
      async () => {
        const categoryIds: string[] = [];
        for (const reference of input.categories) {
          const id = await this.resolveClassification('category', reference);
          if (id) categoryIds.push(id);
        }
        const tagIds: string[] = [];
        for (const reference of input.tags) {
          const id = await this.resolveClassification('tag', reference);
          if (id) tagIds.push(id);
        }
        const ingredients = [];
        for (const [position, item] of input.ingredients.entries()) {
          ingredients.push(await this.resolveIngredient(item, position));
        }
        return this.recipes.create({
          name: input.name,
          description: input.description,
          author: input.author,
          servings: input.servings,
          difficulty: input.difficulty,
          notes: input.notes,
          steps: input.steps.map((text, position) => ({ position, text })),
          ingredients,
          categoryIds,
          tagIds,
        });
      },
    );
  }

  private async resolve(
    raw: RawRecipeProposal,
  ): Promise<ResolvedRecipeProposal> {
    const [ingredients, units, categories, tags] = await Promise.all([
      this.catalog.listIngredients(),
      this.catalog.listUnits(),
      this.classifications.list('category'),
      this.classifications.list('tag'),
    ]);
    const resolvedIngredients = raw.ingredients.map((item) => {
      const ingredientResolution = this.resolveName(
        item.ingredient,
        ingredients,
      );
      const parent = ingredients.find(
        (ingredient) => ingredient.id === ingredientResolution.existingId,
      );
      const variantResolution = item.variant
        ? this.resolveName(item.variant, parent?.variants ?? [], !!parent)
        : null;
      const unitResolution = item.unit
        ? this.resolveName(item.unit, units)
        : null;
      return {
        ...item,
        ingredientResolution,
        variantResolution,
        unitResolution,
      };
    });
    const issues = [
      ...(!raw.name?.trim() ? ['La propuesta no contiene nombre'] : []),
      ...resolvedIngredients.flatMap((item, index) =>
        item.ingredientResolution.status === 'unresolved' ||
        item.ingredientResolution.status === 'ambiguous'
          ? [`Ingrediente ${index + 1} sin resolver`]
          : [],
      ),
    ];
    return {
      ...raw,
      ingredients: resolvedIngredients,
      categories: raw.categories.map((name) => ({
        name,
        resolution: this.resolveName(name, categories),
      })),
      tags: raw.tags.map((name) => ({
        name,
        resolution: this.resolveName(name, tags),
      })),
      issues,
    };
  }

  private resolveName(
    rawName: string | null,
    candidates: Named[],
    canCreate = true,
  ): Resolution {
    const name = rawName?.trim();
    if (!name) return { status: 'unresolved', suggestions: [] };
    const normalized = this.normalize(name);
    const exact = candidates.find(
      (candidate) => candidate.normalizedName === normalized,
    );
    if (exact) {
      return {
        status: 'matched',
        existingId: exact.id,
        suggestions: [{ id: exact.id, name: exact.name }],
      };
    }
    const suggestions = candidates
      .filter(
        (candidate) =>
          candidate.normalizedName.includes(normalized) ||
          normalized.includes(candidate.normalizedName),
      )
      .slice(0, 5)
      .map(({ id, name }) => ({ id, name }));
    if (suggestions.length) {
      return { status: 'ambiguous', proposedName: name, suggestions };
    }
    return canCreate
      ? { status: 'new', proposedName: name, suggestions: [] }
      : { status: 'unresolved', proposedName: name, suggestions: [] };
  }

  private async resolveIngredient(item: ConfirmedIngredient, position: number) {
    const ingredientId = await this.resolveIngredientReference(item.ingredient);
    const variantId = await this.resolveVariantReference(
      ingredientId,
      item.variant,
    );
    const unitId = await this.resolveUnitReference(item.unit);
    return {
      position,
      ingredientId,
      variantId,
      quantity: item.quantity,
      unitId,
      optional: item.optional,
      observations: item.observations,
    };
  }

  private async resolveIngredientReference(reference: ConfirmedReference) {
    if (reference.existingId) return reference.existingId;
    if (reference.createName)
      return (await this.catalog.createIngredient(reference.createName)).id;
    throw new BadRequestException('Todos los ingredientes deben resolverse');
  }

  private async resolveVariantReference(
    ingredientId: string,
    reference: ConfirmedReference,
  ) {
    if (reference.discarded) return undefined;
    if (reference.existingId) return reference.existingId;
    if (reference.createName)
      return (
        await this.catalog.createVariant(ingredientId, reference.createName)
      ).id;
    throw new BadRequestException('La variante no está resuelta');
  }

  private async resolveUnitReference(reference: ConfirmedReference) {
    if (reference.discarded) return undefined;
    if (reference.existingId) return reference.existingId;
    if (reference.createName && reference.createAbbreviation) {
      return (
        await this.catalog.createUnit(
          reference.createName,
          reference.createAbbreviation,
        )
      ).id;
    }
    throw new BadRequestException('La unidad no está resuelta');
  }

  private async resolveClassification(
    kind: 'category' | 'tag',
    reference: ConfirmedReference,
  ) {
    if (reference.discarded) return null;
    if (reference.existingId) return reference.existingId;
    if (reference.createName)
      return (await this.classifications.create(kind, reference.createName)).id;
    throw new BadRequestException('La clasificación no está resuelta');
  }

  private validateConfirmation(input: ConfirmedRecipeImport) {
    if (!input.name?.trim())
      throw new BadRequestException('El nombre es obligatorio');
    for (const item of input.ingredients) {
      this.assertReference(item.ingredient, false);
      this.assertReference(item.variant, true);
      this.assertReference(item.unit, true);
    }
    for (const reference of [...input.categories, ...input.tags])
      this.assertReference(reference, true);
  }

  private assertReference(
    reference: ConfirmedReference,
    allowDiscard: boolean,
  ) {
    const choices = [
      Boolean(reference.existingId),
      Boolean(reference.createName),
      reference.discarded === true,
    ].filter(Boolean).length;
    if (choices !== 1 || (reference.discarded && !allowDiscard))
      throw new BadRequestException(
        'Cada referencia debe resolverse, aprobarse como nueva o descartarse explícitamente',
      );
  }

  private validateRaw(value: unknown): RawRecipeProposal {
    if (!value || typeof value !== 'object')
      throw new BadGatewayException('La propuesta del proveedor no es válida');
    const raw = value as Partial<RawRecipeProposal>;
    if (
      !Array.isArray(raw.steps) ||
      !raw.steps.every((item) => typeof item === 'string') ||
      !Array.isArray(raw.ingredients) ||
      !Array.isArray(raw.categories) ||
      !raw.categories.every((item) => typeof item === 'string') ||
      !Array.isArray(raw.tags) ||
      !raw.tags.every((item) => typeof item === 'string') ||
      !raw.ingredients.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.optional === 'boolean',
      )
    ) {
      throw new BadGatewayException('La propuesta del proveedor no es válida');
    }
    return raw as RawRecipeProposal;
  }

  private normalize(value: string) {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/\s+/g, ' ');
  }
}

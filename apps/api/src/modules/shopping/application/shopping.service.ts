import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CATALOG_REFERENCE_READER,
  type CatalogReferenceReader,
} from '../../catalog/application/catalog-reference.reader.js';
import {
  RECIPE_REFERENCE_READER,
  type RecipeReferenceReader,
  type ShoppingRecipeSnapshot,
} from '../../library/application/recipe-reference.reader.js';
import {
  PLANNING_SOURCE_READER,
  type PlanningSourceReader,
} from '../../planning/application/planning-source.reader.js';
import {
  consolidateContributions,
  isShoppingDate,
  normalizeQuantity,
  normalizeShoppingName,
  type ShoppingContribution,
} from '../domain/shopping.js';
import {
  SHOPPING_REPOSITORY,
  type ShoppingItemInput,
  type ShoppingRepository,
} from './shopping.repository.js';

export type GenerateShoppingListInput = {
  name: string;
  from: string;
  to: string;
  excludedPlannedMealIds?: string[];
};

@Injectable()
export class ShoppingService {
  constructor(
    @Inject(SHOPPING_REPOSITORY)
    private readonly repository: ShoppingRepository,
    @Inject(PLANNING_SOURCE_READER)
    private readonly planning: PlanningSourceReader,
    @Inject(RECIPE_REFERENCE_READER)
    private readonly recipes: RecipeReferenceReader,
    @Inject(CATALOG_REFERENCE_READER)
    private readonly catalog: CatalogReferenceReader,
  ) {}

  async generate(input: GenerateShoppingListInput) {
    const name = this.name(input.name, 'El nombre de la lista');
    this.range(input.from, input.to);
    const sources = await this.planning.findPlanningSources(
      input.from,
      input.to,
      input.excludedPlannedMealIds ?? [],
    );
    const snapshots = new Map<string, ShoppingRecipeSnapshot>();
    const contributions: ShoppingContribution[] = [];
    for (const source of sources) {
      let recipe = snapshots.get(source.recipeId);
      if (!recipe) {
        recipe =
          (await this.recipes.findShoppingRecipeSnapshot(source.recipeId)) ??
          undefined;
        if (!recipe) {
          throw new BadRequestException(
            `La receta ${source.recipeId} ya no está disponible`,
          );
        }
        snapshots.set(source.recipeId, recipe);
      }
      for (const item of recipe.ingredients) {
        contributions.push({
          plannedMealId: source.id,
          recipeId: source.recipeId,
          recipeIngredientId: item.id,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          unitId: item.unitId,
          unitName: item.unitName,
          unitAbbreviation: item.unitAbbreviation,
          optional: item.optional,
          observations: item.observations,
        });
      }
    }
    return this.repository.createGenerated({
      name,
      from: input.from,
      to: input.to,
      sources: sources.map((source) => ({
        plannedMealId: source.id,
        recipeId: source.recipeId,
        recipeName: source.recipeName,
        plannedDate: source.plannedDate,
      })),
      items: consolidateContributions(contributions),
    });
  }

  list() {
    return this.repository.list();
  }

  async get(id: string) {
    const list = await this.repository.findById(id);
    if (!list) throw new NotFoundException('Lista de compra no encontrada');
    return list;
  }

  async rename(id: string, rawName: string) {
    const list = await this.repository.rename(
      id,
      this.name(rawName, 'El nombre de la lista'),
    );
    if (!list) throw new NotFoundException('Lista de compra no encontrada');
    return list;
  }

  async addItem(listId: string, input: ShoppingItemInput) {
    const item = await this.repository.addItem(listId, await this.item(input));
    if (!item) throw new NotFoundException('Lista de compra no encontrada');
    return item;
  }

  async updateItem(listId: string, itemId: string, input: ShoppingItemInput) {
    const item = await this.repository.updateItem(
      listId,
      itemId,
      await this.item(input),
    );
    if (!item) throw new NotFoundException('Elemento de compra no encontrado');
    return item;
  }

  async removeItem(listId: string, itemId: string) {
    if (!(await this.repository.deleteItem(listId, itemId))) {
      throw new NotFoundException('Elemento de compra no encontrado');
    }
  }

  private async item(input: ShoppingItemInput): Promise<ShoppingItemInput> {
    const manualName = input.manualName
      ? this.name(input.manualName, 'El nombre del elemento')
      : null;
    if ((manualName == null) === (input.ingredientId == null)) {
      throw new BadRequestException(
        'Indica un ingrediente de catálogo o un nombre manual, pero no ambos',
      );
    }
    if (manualName && input.variantId) {
      throw new BadRequestException(
        'Un elemento manual no puede utilizar una variante de catálogo',
      );
    }
    if (input.ingredientId) {
      const reference = await this.catalog.findShoppingCatalogReference({
        ingredientId: input.ingredientId,
        variantId: input.variantId,
        unitId: input.unitId,
      });
      if (!reference)
        throw new BadRequestException('Referencia de catálogo no válida');
    } else if (
      input.unitId &&
      !(await this.catalog.findShoppingUnitReference(input.unitId))
    ) {
      throw new BadRequestException('Unidad no válida');
    }
    let quantity: string | null;
    try {
      quantity = normalizeQuantity(input.quantity);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Cantidad no válida',
      );
    }
    return {
      ingredientId: input.ingredientId ?? null,
      variantId: input.variantId ?? null,
      manualName,
      quantity,
      unitId: input.unitId ?? null,
      observations: input.observations?.trim() || null,
      optional: input.optional,
      purchased: input.purchased,
    };
  }

  private name(value: string, label: string) {
    try {
      return normalizeShoppingName(value, label);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : `${label} no válido`,
      );
    }
  }

  private range(from: string, to: string) {
    if (!isShoppingDate(from) || !isShoppingDate(to) || from > to) {
      throw new BadRequestException('Intervalo de fechas no válido');
    }
    const days =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000;
    if (days > 366)
      throw new BadRequestException('El intervalo no puede superar 367 días');
  }
}

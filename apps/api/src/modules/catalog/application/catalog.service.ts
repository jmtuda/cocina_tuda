import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogName } from '../domain/catalog.js';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './catalog.repository.js';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly repository: CatalogRepository,
  ) {}

  removeIngredient(id: string) {
    return this.remove(() => this.repository.removeIngredient(id));
  }

  removeVariant(ingredientId: string, id: string) {
    return this.remove(() => this.repository.removeVariant(ingredientId, id));
  }

  removeUnit(id: string) {
    return this.remove(() => this.repository.removeUnit(id));
  }

  private async remove(operation: () => Promise<void>) {
    try {
      await operation();
      return { deleted: true };
    } catch (error) {
      if (this.errorCode(error) === 'P2025')
        throw new NotFoundException('Elemento no encontrado');
      if (this.errorCode(error) === 'P2003')
        throw new ConflictException(
          'No se puede eliminar: el elemento está en uso en recetas, compras o variantes. Retira primero sus asociaciones.',
        );
      throw error;
    }
  }

  async createIngredient(rawName: string) {
    const name = new CatalogName(rawName);
    try {
      return await this.repository.createIngredient(
        name.value,
        name.normalized,
      );
    } catch (error) {
      this.handleConflict(error, 'Ya existe un ingrediente con ese nombre');
    }
  }

  async createVariant(ingredientId: string, rawName: string) {
    const name = new CatalogName(rawName);
    try {
      return await this.repository.createVariant(
        ingredientId,
        name.value,
        name.normalized,
      );
    } catch (error) {
      if (this.errorCode(error) === 'P2003') {
        throw new NotFoundException('Ingrediente no encontrado');
      }
      this.handleConflict(error, 'Ya existe esa variante para el ingrediente');
    }
  }

  async createUnit(rawName: string, abbreviation: string) {
    const name = new CatalogName(rawName);
    const trimmedAbbreviation = abbreviation.trim();
    if (!trimmedAbbreviation)
      throw new BadRequestException('La abreviatura es obligatoria');
    try {
      return await this.repository.createUnit(
        name.value,
        trimmedAbbreviation,
        name.normalized,
      );
    } catch (error) {
      this.handleConflict(error, 'Ya existe una unidad con ese nombre');
    }
  }

  listIngredients() {
    return this.repository.listIngredients();
  }

  async updateIngredient(id: string, rawName: string) {
    const name = new CatalogName(rawName);
    try {
      return await this.repository.updateIngredient(
        id,
        name.value,
        name.normalized,
      );
    } catch (error) {
      this.handleUpdateError(error);
    }
  }

  async updateVariant(ingredientId: string, id: string, rawName: string) {
    const name = new CatalogName(rawName);
    try {
      return await this.repository.updateVariant(
        ingredientId,
        id,
        name.value,
        name.normalized,
      );
    } catch (error) {
      this.handleUpdateError(error);
    }
  }

  async updateUnit(id: string, rawName: string, abbreviation: string) {
    const name = new CatalogName(rawName);
    if (!abbreviation.trim())
      throw new BadRequestException('La abreviatura es obligatoria');
    try {
      return await this.repository.updateUnit(
        id,
        name.value,
        abbreviation.trim(),
        name.normalized,
      );
    } catch (error) {
      this.handleUpdateError(error);
    }
  }

  private handleUpdateError(error: unknown): never {
    if (this.errorCode(error) === 'P2025')
      throw new NotFoundException('Elemento no encontrado');
    this.handleConflict(error, 'Ya existe un elemento con ese nombre');
  }

  listUnits() {
    return this.repository.listUnits();
  }

  async findShoppingCatalogReference(input: {
    ingredientId: string;
    variantId?: string | null;
    unitId?: string | null;
  }) {
    const [ingredients, units] = await Promise.all([
      this.repository.listIngredients(),
      this.repository.listUnits(),
    ]);
    const ingredient = ingredients.find(
      (item) => item.id === input.ingredientId,
    );
    if (!ingredient) return null;
    const variant = input.variantId
      ? ingredient.variants.find((item) => item.id === input.variantId)
      : null;
    if (input.variantId && !variant) return null;
    const unit = input.unitId
      ? units.find((item) => item.id === input.unitId)
      : null;
    if (input.unitId && !unit) return null;
    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      unitId: unit?.id ?? null,
      unitName: unit?.name ?? null,
      unitAbbreviation: unit?.abbreviation ?? null,
    };
  }

  async findShoppingUnitReference(unitId: string) {
    const units = await this.repository.listUnits();
    return units.find((item) => item.id === unitId) ?? null;
  }

  private handleConflict(error: unknown, message: string): never {
    if (this.errorCode(error) === 'P2002') throw new ConflictException(message);
    throw error;
  }

  private errorCode(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
  }
}

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

  listUnits() {
    return this.repository.listUnits();
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

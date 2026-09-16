import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogName } from '../domain/catalog.js';
import {
  CLASSIFICATION_REPOSITORY,
  type ClassificationKind,
  type ClassificationRepository,
} from './classification.repository.js';

@Injectable()
export class ClassificationService {
  constructor(
    @Inject(CLASSIFICATION_REPOSITORY)
    private readonly repository: ClassificationRepository,
  ) {}

  list(kind: ClassificationKind) {
    return this.repository.list(kind);
  }

  async create(kind: ClassificationKind, rawName: string) {
    const name = new CatalogName(rawName);
    try {
      return await this.repository.create(kind, name.value, name.normalized);
    } catch (error) {
      this.handleConflict(error, 'Ya existe una clasificación con ese nombre');
    }
  }

  async rename(kind: ClassificationKind, id: string, rawName: string) {
    const name = new CatalogName(rawName);
    try {
      const result = await this.repository.rename(
        kind,
        id,
        name.value,
        name.normalized,
      );
      if (!result) throw new NotFoundException('Clasificación no encontrada');
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleConflict(error, 'Ya existe una clasificación con ese nombre');
    }
  }

  async remove(kind: ClassificationKind, id: string) {
    try {
      if (!(await this.repository.remove(kind, id)))
        throw new NotFoundException('Clasificación no encontrada');
      return { deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        throw new ConflictException('La clasificación está asociada a recetas');
      }
      throw error;
    }
  }

  private handleConflict(error: unknown, message: string): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }
}

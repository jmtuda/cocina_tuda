import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { CatalogRepository } from '../application/catalog.repository.js';

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  createIngredient(name: string, normalizedName: string) {
    return this.prisma.ingredient.create({ data: { name, normalizedName } });
  }

  createVariant(ingredientId: string, name: string, normalizedName: string) {
    return this.prisma.ingredientVariant.create({
      data: { ingredientId, name, normalizedName },
    });
  }

  createUnit(name: string, abbreviation: string, normalizedName: string) {
    return this.prisma.unit.create({
      data: { name, abbreviation, normalizedName },
    });
  }

  listIngredients() {
    return this.prisma.ingredient.findMany({
      orderBy: { normalizedName: 'asc' },
      include: { variants: true },
    });
  }

  listUnits() {
    return this.prisma.unit.findMany({ orderBy: { normalizedName: 'asc' } });
  }
}

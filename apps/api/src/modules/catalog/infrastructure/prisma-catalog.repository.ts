import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { CatalogRepository } from '../application/catalog.repository.js';

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  createIngredient(name: string, normalizedName: string) {
    return this.prisma.getDb().ingredient.create({
      data: { name, normalizedName },
      select: { id: true, name: true, normalizedName: true },
    });
  }

  createVariant(ingredientId: string, name: string, normalizedName: string) {
    return this.prisma.getDb().ingredientVariant.create({
      data: { ingredientId, name, normalizedName },
      select: {
        id: true,
        ingredientId: true,
        name: true,
        normalizedName: true,
      },
    });
  }

  createUnit(name: string, abbreviation: string, normalizedName: string) {
    return this.prisma.getDb().unit.create({
      data: { name, abbreviation, normalizedName },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        normalizedName: true,
      },
    });
  }

  listIngredients() {
    return this.prisma.getDb().ingredient.findMany({
      orderBy: { normalizedName: 'asc' },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        variants: {
          orderBy: { normalizedName: 'asc' },
          select: {
            id: true,
            ingredientId: true,
            name: true,
            normalizedName: true,
          },
        },
      },
    });
  }

  listUnits() {
    return this.prisma.getDb().unit.findMany({
      orderBy: { normalizedName: 'asc' },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        normalizedName: true,
      },
    });
  }
}

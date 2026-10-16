import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { shoppingDateToUtc, utcToShoppingDate } from '../domain/shopping.js';
import type {
  GeneratedListInput,
  ShoppingItemInput,
  ShoppingItemRecord,
  ShoppingListRecord,
  ShoppingRepository,
} from '../application/shopping.repository.js';

const detailInclude = {
  sources: { orderBy: { plannedDate: 'asc' as const } },
  items: {
    orderBy: { position: 'asc' as const },
    include: {
      ingredient: true,
      variant: true,
      unit: true,
      sources: { include: { listSource: true } },
    },
  },
};

type PersistedItem = {
  id: string;
  position: number;
  ingredientId: string | null;
  variantId: string | null;
  manualName: string | null;
  quantity: { toString(): string } | null;
  unitId: string | null;
  observations: string | null;
  optional: boolean;
  purchased: boolean;
  ingredient: { id: string; name: string } | null;
  variant: { id: string; name: string } | null;
  unit: { id: string; name: string; abbreviation: string } | null;
  sources: Array<{
    recipeIngredientId: string;
    listSource: {
      plannedMealId: string;
      recipeId: string;
      recipeName: string;
      plannedDate: Date;
    };
  }>;
};

type PersistedList = {
  id: string;
  name: string;
  sourceFrom: Date | null;
  sourceTo: Date | null;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sources: Array<{
    plannedMealId: string;
    recipeId: string;
    recipeName: string;
    plannedDate: Date;
  }>;
  items: PersistedItem[];
};

const toItem = (item: PersistedItem): ShoppingItemRecord => ({
  id: item.id,
  position: item.position,
  ingredientId: item.ingredientId,
  variantId: item.variantId,
  manualName: item.manualName,
  quantity: item.quantity?.toString() ?? null,
  unitId: item.unitId,
  observations: item.observations,
  optional: item.optional,
  purchased: item.purchased,
  ingredient: item.ingredient,
  variant: item.variant,
  unit: item.unit,
  sources: item.sources.map((source) => ({
    plannedMealId: source.listSource.plannedMealId,
    recipeId: source.listSource.recipeId,
    recipeName: source.listSource.recipeName,
    plannedDate: utcToShoppingDate(source.listSource.plannedDate),
    recipeIngredientId: source.recipeIngredientId,
  })),
});

const toList = (list: PersistedList): ShoppingListRecord => ({
  id: list.id,
  name: list.name,
  sourceFrom: list.sourceFrom ? utcToShoppingDate(list.sourceFrom) : null,
  sourceTo: list.sourceTo ? utcToShoppingDate(list.sourceTo) : null,
  generatedAt: list.generatedAt,
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
  sources: list.sources.map((source) => ({
    plannedMealId: source.plannedMealId,
    recipeId: source.recipeId,
    recipeName: source.recipeName,
    plannedDate: utcToShoppingDate(source.plannedDate),
  })),
  items: list.items.map(toItem),
});

@Injectable()
export class PrismaShoppingRepository implements ShoppingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createGenerated(input: GeneratedListInput) {
    // Allocate identities before writing so each table can be inserted in batches.
    const id = randomUUID();
    const sources = input.sources.map((source) => ({
      id: randomUUID(),
      shoppingListId: id,
      plannedMealId: source.plannedMealId,
      recipeId: source.recipeId,
      recipeName: source.recipeName,
      plannedDate: shoppingDateToUtc(source.plannedDate),
    }));
    const sourceIds = new Map(
      sources.map((source) => [source.plannedMealId, source.id]),
    );
    const itemSources: Array<{
      shoppingItemId: string;
      listSourceId: string;
      recipeIngredientId: string;
    }> = [];
    const items = input.items.map((item, position) => {
      const itemId = randomUUID();
      for (const source of item.sources) {
        const listSourceId = sourceIds.get(source.plannedMealId);
        if (!listSourceId) throw new Error('Procedencia no encontrada');
        itemSources.push({
          shoppingItemId: itemId,
          listSourceId,
          recipeIngredientId: source.recipeIngredientId,
        });
      }
      return {
        id: itemId,
        shoppingListId: id,
        position,
        ingredientId: item.ingredientId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitId: item.unitId,
        observations: item.observations,
        optional: item.optional,
      };
    });
    await this.prisma.run(
      async () => {
        const db = this.prisma.getDb();
        await db.shoppingList.create({
          data: {
            id,
            name: input.name,
            sourceFrom: shoppingDateToUtc(input.from),
            sourceTo: shoppingDateToUtc(input.to),
            generatedAt: new Date(),
          },
        });
        // Bound batch sizes to avoid PostgreSQL's parameter limit on large lists.
        for (let offset = 0; offset < sources.length; offset += 500)
          await db.shoppingListSource.createMany({
            data: sources.slice(offset, offset + 500),
          });
        for (let offset = 0; offset < items.length; offset += 500)
          await db.shoppingItem.createMany({
            data: items.slice(offset, offset + 500),
          });
        for (let offset = 0; offset < itemSources.length; offset += 500)
          await db.shoppingItemSource.createMany({
            data: itemSources.slice(offset, offset + 500),
          });
      },
      { timeout: 30000 },
    );
    const result = await this.findById(id);
    if (!result) throw new Error('No se pudo leer la lista recién creada');
    return result;
  }

  async list() {
    const lists = await this.prisma.shoppingList.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: detailInclude,
    });
    return lists.map((list) => toList(list));
  }

  async findById(id: string) {
    const list = await this.prisma.shoppingList.findUnique({
      where: { id },
      include: detailInclude,
    });
    return list ? toList(list) : null;
  }

  async rename(id: string, name: string) {
    const result = await this.prisma.shoppingList.updateMany({
      where: { id },
      data: { name },
    });
    return result.count ? this.findById(id) : null;
  }

  async addItem(listId: string, input: ShoppingItemInput) {
    const list = await this.prisma.shoppingList.findUnique({
      where: { id: listId },
      select: {
        id: true,
        items: { orderBy: { position: 'desc' }, take: 1 },
      },
    });
    if (!list) return null;
    const item = await this.prisma.shoppingItem.create({
      data: {
        shoppingListId: listId,
        position: (list.items[0]?.position ?? -1) + 1,
        ...this.itemData(input),
      },
      include: detailInclude.items.include,
    });
    return toItem(item);
  }

  async updateItem(listId: string, itemId: string, input: ShoppingItemInput) {
    const exists = await this.prisma.shoppingItem.findFirst({
      where: { id: itemId, shoppingListId: listId },
    });
    if (!exists) return null;
    const item = await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: this.itemData(input),
      include: detailInclude.items.include,
    });
    return toItem(item);
  }

  async deleteItem(listId: string, itemId: string) {
    const result = await this.prisma.shoppingItem.deleteMany({
      where: { id: itemId, shoppingListId: listId },
    });
    return result.count > 0;
  }

  private itemData(input: ShoppingItemInput) {
    return {
      ingredientId: input.ingredientId ?? null,
      variantId: input.variantId ?? null,
      manualName: input.manualName ?? null,
      quantity: input.quantity ?? null,
      unitId: input.unitId ?? null,
      observations: input.observations ?? null,
      optional: input.optional,
      purchased: input.purchased,
    };
  }
}

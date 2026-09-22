import { describe, expect, it } from 'vitest';
import type { CatalogReferenceReader } from '../../catalog/application/catalog-reference.reader.js';
import type { RecipeReferenceReader } from '../../library/application/recipe-reference.reader.js';
import type { PlanningSourceReader } from '../../planning/application/planning-source.reader.js';
import type {
  GeneratedListInput,
  ShoppingItemInput,
  ShoppingListRecord,
  ShoppingRepository,
} from './shopping.repository.js';
import { ShoppingService } from './shopping.service.js';

class MemoryShoppingRepository implements ShoppingRepository {
  lists: ShoppingListRecord[] = [];

  createGenerated(input: GeneratedListInput) {
    const list: ShoppingListRecord = {
      id: `list-${this.lists.length + 1}`,
      name: input.name,
      sourceFrom: input.from,
      sourceTo: input.to,
      generatedAt: new Date(0),
      createdAt: new Date(0),
      updatedAt: new Date(0),
      sources: structuredClone(input.sources),
      items: input.items.map((item, position) => ({
        id: `item-${position}`,
        position,
        ingredientId: item.ingredientId,
        variantId: item.variantId,
        manualName: null,
        quantity: item.quantity,
        unitId: item.unitId,
        observations: item.observations,
        optional: item.optional,
        purchased: false,
        ingredient: { id: item.ingredientId, name: item.ingredientName },
        variant: item.variantId
          ? { id: item.variantId, name: item.variantName! }
          : null,
        unit: item.unitId
          ? {
              id: item.unitId,
              name: item.unitName!,
              abbreviation: item.unitAbbreviation!,
            }
          : null,
        sources: item.sources.map((source) => {
          const listSource = input.sources.find(
            (candidate) => candidate.plannedMealId === source.plannedMealId,
          )!;
          return {
            ...listSource,
            recipeIngredientId: source.recipeIngredientId,
          };
        }),
      })),
    };
    this.lists.push(structuredClone(list));
    return Promise.resolve(structuredClone(list));
  }

  list() {
    return Promise.resolve(structuredClone(this.lists));
  }
  findById(id: string) {
    return Promise.resolve(
      structuredClone(this.lists.find((list) => list.id === id) ?? null),
    );
  }
  rename() {
    return Promise.resolve(null);
  }
  addItem() {
    return Promise.resolve(null);
  }
  updateItem() {
    return Promise.resolve(null);
  }
  deleteItem() {
    return Promise.resolve(false);
  }
}

const catalog: CatalogReferenceReader = {
  findShoppingCatalogReference: () => Promise.resolve(null),
  findShoppingUnitReference: () => Promise.resolve(null),
};

describe('ShoppingService generation', () => {
  it('honors exclusions, repeated meals and creates independent snapshots', async () => {
    const repository = new MemoryShoppingRepository();
    const meals = [
      {
        id: 'meal-1',
        plannedDate: '2026-09-21',
        recipeId: 'recipe-1',
        recipeName: 'Tortilla',
      },
      {
        id: 'meal-2',
        plannedDate: '2026-09-22',
        recipeId: 'recipe-1',
        recipeName: 'Tortilla',
      },
      {
        id: 'meal-3',
        plannedDate: '2026-09-23',
        recipeId: 'recipe-2',
        recipeName: 'Sopa',
      },
    ];
    const planning: PlanningSourceReader = {
      findPlanningSources: (_from, _to, excluded) =>
        Promise.resolve(meals.filter((meal) => !excluded.includes(meal.id))),
    };
    const recipes: RecipeReferenceReader = {
      findRecipeReference: () => Promise.resolve(null),
      findShoppingRecipeSnapshot: (id) =>
        Promise.resolve({
          id,
          name: id === 'recipe-1' ? 'Tortilla' : 'Sopa',
          status: 'ACTIVE',
          ingredients: [
            {
              id: `use-${id}`,
              ingredientId: 'egg',
              ingredientName: 'Huevo',
              variantId: null,
              variantName: null,
              quantity: '2',
              unitId: null,
              unitName: null,
              unitAbbreviation: null,
              optional: false,
              observations: null,
            },
          ],
        }),
    };
    const service = new ShoppingService(repository, planning, recipes, catalog);
    const first = await service.generate({
      name: 'Semana',
      from: '2026-09-21',
      to: '2026-09-27',
      excludedPlannedMealIds: ['meal-3'],
    });
    expect(first.sources.map((source) => source.plannedMealId)).toEqual([
      'meal-1',
      'meal-2',
    ]);
    expect(first.items[0]).toMatchObject({ quantity: '4' });

    const firstMeal = meals[0];
    if (!firstMeal) throw new Error('Comida de prueba ausente');
    firstMeal.recipeName = 'Receta modificada';
    expect((await service.get(first.id)).sources[0]?.recipeName).toBe(
      'Tortilla',
    );
    const second = await service.generate({
      name: 'Regenerada',
      from: '2026-09-21',
      to: '2026-09-27',
      excludedPlannedMealIds: ['meal-3'],
    });
    expect(second.id).not.toBe(first.id);
  });

  it('accepts free manual items without catalog references', async () => {
    const repository = new MemoryShoppingRepository();
    const service = new ShoppingService(
      repository,
      { findPlanningSources: () => Promise.resolve([]) },
      {
        findRecipeReference: () => Promise.resolve(null),
        findShoppingRecipeSnapshot: () => Promise.resolve(null),
      },
      catalog,
    );
    const input: ShoppingItemInput = {
      manualName: 'Papel de cocina',
      quantity: '2',
      optional: false,
      purchased: false,
    };
    await expect(service.addItem('missing', input)).rejects.toThrow(
      'Lista de compra no encontrada',
    );
  });
});

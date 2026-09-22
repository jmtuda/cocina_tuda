import type { PlannedMealInput } from '../domain/planned-meal.js';

export type PlannedMealRecord = PlannedMealInput & {
  id: string;
  mealName: string | null;
  createdAt: Date;
  updatedAt: Date;
  recipe: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'ARCHIVED';
  };
};

export const PLANNING_REPOSITORY = Symbol('PLANNING_REPOSITORY');

export interface PlanningRepository {
  create(input: PlannedMealInput): Promise<PlannedMealRecord>;
  findById(id: string): Promise<PlannedMealRecord | null>;
  findBetween(from: string, to: string): Promise<PlannedMealRecord[]>;
  update(
    id: string,
    input: PlannedMealInput,
  ): Promise<PlannedMealRecord | null>;
  delete(id: string): Promise<boolean>;
}

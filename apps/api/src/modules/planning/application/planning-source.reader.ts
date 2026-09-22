export type PlanningSource = {
  id: string;
  plannedDate: string;
  recipeId: string;
  recipeName: string;
};

export const PLANNING_SOURCE_READER = Symbol('PLANNING_SOURCE_READER');

export interface PlanningSourceReader {
  findPlanningSources(
    from: string,
    to: string,
    excludedIds: string[],
  ): Promise<PlanningSource[]>;
}

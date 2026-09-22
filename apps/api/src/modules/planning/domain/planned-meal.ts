export type PlannedMealInput = {
  recipeId: string;
  plannedDate: string;
  mealName?: string | null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizePlannedMeal(
  input: PlannedMealInput,
): PlannedMealInput {
  if (!input.recipeId) throw new Error('La receta es obligatoria');
  if (!isCalendarDate(input.plannedDate)) {
    throw new Error('La fecha debe ser un día de calendario válido');
  }
  const mealName = input.mealName?.trim().replace(/\s+/g, ' ') || null;
  if (mealName && mealName.length > 120) {
    throw new Error('La denominación no puede superar 120 caracteres');
  }
  return { ...input, mealName };
}

export function calendarDateToUtc(value: string): Date {
  if (!isCalendarDate(value)) throw new Error('Fecha no válida');
  return new Date(`${value}T00:00:00.000Z`);
}

export function utcToCalendarDate(value: Date): string {
  return [
    value.getUTCFullYear().toString().padStart(4, '0'),
    (value.getUTCMonth() + 1).toString().padStart(2, '0'),
    value.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

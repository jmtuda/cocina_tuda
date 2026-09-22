import { describe, expect, it } from 'vitest';
import {
  calendarDateToUtc,
  isCalendarDate,
  normalizePlannedMeal,
  utcToCalendarDate,
} from './planned-meal.js';

describe('PlannedMeal', () => {
  it('validates real calendar dates', () => {
    expect(isCalendarDate('2026-09-21')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
  });

  it('keeps optional free-form meal names and normalizes whitespace', () => {
    expect(
      normalizePlannedMeal({
        recipeId: 'recipe',
        plannedDate: '2026-09-21',
        mealName: '  Cena   con invitados  ',
      }).mealName,
    ).toBe('Cena con invitados');
    expect(
      normalizePlannedMeal({
        recipeId: 'recipe',
        plannedDate: '2026-09-21',
      }).mealName,
    ).toBeNull();
  });

  it('round-trips a day without local timezone conversions', () => {
    const stored = calendarDateToUtc('2026-09-21');
    expect(stored.toISOString()).toBe('2026-09-21T00:00:00.000Z');
    expect(utcToCalendarDate(stored)).toBe('2026-09-21');
  });
});

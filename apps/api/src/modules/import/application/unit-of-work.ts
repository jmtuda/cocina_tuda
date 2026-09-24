export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
  runIdempotent<T extends { id: string }>(
    key: string,
    load: (id: string) => Promise<T>,
    work: () => Promise<T>,
  ): Promise<T>;
}

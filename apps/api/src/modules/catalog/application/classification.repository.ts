export const CLASSIFICATION_REPOSITORY = Symbol('CLASSIFICATION_REPOSITORY');

export type Classification = {
  id: string;
  name: string;
  normalizedName: string;
};
export type ClassificationKind = 'category' | 'tag';

export interface ClassificationRepository {
  list(kind: ClassificationKind): Promise<Classification[]>;
  create(
    kind: ClassificationKind,
    name: string,
    normalizedName: string,
  ): Promise<Classification>;
  rename(
    kind: ClassificationKind,
    id: string,
    name: string,
    normalizedName: string,
  ): Promise<Classification | null>;
  remove(kind: ClassificationKind, id: string): Promise<boolean>;
}

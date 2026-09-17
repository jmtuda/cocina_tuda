import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  ClassificationKind,
  ClassificationRepository,
} from '../application/classification.repository.js';

@Injectable()
export class PrismaClassificationRepository implements ClassificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(kind: ClassificationKind) {
    return kind === 'category'
      ? this.prisma
          .getDb()
          .category.findMany({ orderBy: { normalizedName: 'asc' } })
      : this.prisma
          .getDb()
          .tag.findMany({ orderBy: { normalizedName: 'asc' } });
  }

  create(kind: ClassificationKind, name: string, normalizedName: string) {
    return kind === 'category'
      ? this.prisma.getDb().category.create({ data: { name, normalizedName } })
      : this.prisma.getDb().tag.create({ data: { name, normalizedName } });
  }

  async rename(
    kind: ClassificationKind,
    id: string,
    name: string,
    normalizedName: string,
  ) {
    const exists =
      kind === 'category'
        ? await this.prisma.getDb().category.findUnique({ where: { id } })
        : await this.prisma.getDb().tag.findUnique({ where: { id } });
    if (!exists) return null;
    return kind === 'category'
      ? this.prisma.getDb().category.update({
          where: { id },
          data: { name, normalizedName },
        })
      : this.prisma.getDb().tag.update({
          where: { id },
          data: { name, normalizedName },
        });
  }

  async remove(kind: ClassificationKind, id: string) {
    const result =
      kind === 'category'
        ? await this.prisma.getDb().category.deleteMany({ where: { id } })
        : await this.prisma.getDb().tag.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

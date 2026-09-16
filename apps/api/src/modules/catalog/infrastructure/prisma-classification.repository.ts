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
      ? this.prisma.category.findMany({ orderBy: { normalizedName: 'asc' } })
      : this.prisma.tag.findMany({ orderBy: { normalizedName: 'asc' } });
  }

  create(kind: ClassificationKind, name: string, normalizedName: string) {
    return kind === 'category'
      ? this.prisma.category.create({ data: { name, normalizedName } })
      : this.prisma.tag.create({ data: { name, normalizedName } });
  }

  async rename(
    kind: ClassificationKind,
    id: string,
    name: string,
    normalizedName: string,
  ) {
    const exists =
      kind === 'category'
        ? await this.prisma.category.findUnique({ where: { id } })
        : await this.prisma.tag.findUnique({ where: { id } });
    if (!exists) return null;
    return kind === 'category'
      ? this.prisma.category.update({
          where: { id },
          data: { name, normalizedName },
        })
      : this.prisma.tag.update({
          where: { id },
          data: { name, normalizedName },
        });
  }

  async remove(kind: ClassificationKind, id: string) {
    const result =
      kind === 'category'
        ? await this.prisma.category.deleteMany({ where: { id } })
        : await this.prisma.tag.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

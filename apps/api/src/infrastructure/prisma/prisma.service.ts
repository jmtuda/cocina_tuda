import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { UnitOfWork } from '../../modules/import/application/unit-of-work.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, UnitOfWork
{
  private readonly transactions =
    new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor() {
    const adapter = new PrismaPg({
      connectionString:
        process.env['DATABASE_URL'] ??
        'postgresql://postgres:postgres@localhost:5432/cocina_tuda',
    });
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  getDb(): PrismaClient | Prisma.TransactionClient {
    return this.transactions.getStore() ?? this;
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.transactions.getStore()) return work();
    return this.$transaction((transaction) =>
      this.transactions.run(transaction, work),
    );
  }
}

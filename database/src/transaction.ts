import type { Prisma } from '@prisma/client';
import { prisma } from './client.js';

export type TransactionClient = Prisma.TransactionClient;

export async function withTransaction<T>(
  work: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(work);
}

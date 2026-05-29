import { PrismaClient } from '@PrismaGen/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
	adapter,
	log:
		env.NODE_ENV === 'development'
			? ['query', 'info', 'warn', 'error']
			: ['error'],
});

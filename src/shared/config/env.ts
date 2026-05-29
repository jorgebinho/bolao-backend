import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production']).default('development'),
	PORT: z.coerce.number().default(3333),
	DATABASE_URL: z.string().min(1),
	DIRECT_URL: z.string().min(1),
	JWT_SECRET: z.string().min(1),
	JWT_EXPIRES_IN: z.string().default('7d'),
	FRONTEND_URL: z.string().optional(),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
	console.error(
		'[Bolão API] Error when parsing process.env: Check the environment variables and try again',
	);

	process.exit(1);
}

export const env = envResult.data;

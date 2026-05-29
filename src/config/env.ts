import 'dotenv/config';
import z from 'zod';

const schema = z.object({
	NODE_ENV: z.enum(['development', 'production']),
	PORT: z.coerce.number().default(3333),
	DATABASE_URL: z.string(),
	DIRECT_URL: z.string(),
	JWT_SECRET: z.string(),
	JWT_EXPIRES_IN: z.string(),
	FRONTEND_URL: z.string(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
	console.error(
		'[Bolão API] Error when parsing process.env: Check the environment variables and try again',
	);

	process.exit(1);
}

export const env = result.data;

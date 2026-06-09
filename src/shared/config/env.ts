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
	MATCH_REMINDERS_ENABLED: z
		.enum(['true', 'false'])
		.default('true')
		.transform((value) => value === 'true'),
	MATCH_REMINDER_INTERVAL_MINUTES: z.coerce.number().positive().default(5),
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().default(587),
	SMTP_SECURE: z
		.enum(['true', 'false'])
		.default('false')
		.transform((value) => value === 'true'),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	SMTP_FROM: z.string().optional(),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
	console.error(
		'[Bolão API] Error when parsing process.env: Check the environment variables and try again',
	);

	process.exit(1);
}

export const env = envResult.data;

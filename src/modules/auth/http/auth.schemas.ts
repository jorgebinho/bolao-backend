import { z } from 'zod';

const trimmedString = z.coerce.string().transform((value) => value.trim());

export const registerSchema = z.object({
	name: trimmedString,
	email: z.coerce
		.string()
		.transform((value) => value.trim().toLowerCase()),
	password: z.coerce.string(),
});

export const loginSchema = z.object({
	email: z.coerce
		.string()
		.transform((value) => value.trim().toLowerCase()),
	password: z.coerce.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

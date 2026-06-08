import { z } from 'zod';

const trimmedString = z.coerce.string().transform((value) => value.trim());

export const profileQuerySchema = z.object({
	groupId: z.coerce.string().optional(),
});

export const updateProfileSchema = z.object({
	name: trimmedString,
});

export const updatePasswordSchema = z.object({
	currentPassword: z.coerce.string(),
	newPassword: z.coerce.string(),
});

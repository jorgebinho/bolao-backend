import { z } from 'zod';

const trimmedString = z.coerce.string().transform((value) => value.trim());

export const createGroupSchema = z.object({
	name: trimmedString,
	description: z.coerce
		.string()
		.transform((value) => value.trim())
		.optional(),
});

export const joinGroupSchema = z.object({
	code: z.coerce.string().transform((value) => value.trim().toUpperCase()),
});

export const groupIdParamsSchema = z.object({
	id: z.string().min(1),
});

export const removeGroupMemberParamsSchema = z.object({
	id: z.string().min(1),
	userId: z.string().min(1),
});

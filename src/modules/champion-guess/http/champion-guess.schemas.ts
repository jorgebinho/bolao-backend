import { z } from 'zod';

export const saveChampionGuessSchema = z.object({
	team: z.coerce.string().transform((value) => value.trim()),
});

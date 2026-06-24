import { z } from 'zod';

export const guessParamsSchema = z.object({
	id: z.string().min(1),
});

export const guessBodySchema = z.object({
	homeGuess: z.coerce.number().int().min(0),
	awayGuess: z.coerce.number().int().min(0),
	advancingTeam: z.string().trim().min(1).nullable().optional(),
});

export type GuessParams = z.infer<typeof guessParamsSchema>;
export type GuessBody = z.infer<typeof guessBodySchema>;

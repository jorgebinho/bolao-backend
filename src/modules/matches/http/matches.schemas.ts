import { z } from 'zod';

export const guessParamsSchema = z.object({
	id: z.string().min(1),
});

export const guessBodySchema = z.object({
	homeGuess: z.coerce.number().int().min(0),
	awayGuess: z.coerce.number().int().min(0),
});

export type GuessParams = z.infer<typeof guessParamsSchema>;
export type GuessBody = z.infer<typeof guessBodySchema>;

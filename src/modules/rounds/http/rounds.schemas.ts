import { z } from 'zod';

export const stageParamsSchema = z.object({
	stage: z.string().min(1),
});

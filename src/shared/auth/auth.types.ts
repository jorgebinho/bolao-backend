import type { Prisma } from '@prisma/client';

export const authenticatedUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	points: true,
} satisfies Prisma.UserSelect;

export type AuthenticatedUser = Prisma.UserGetPayload<{
	select: typeof authenticatedUserSelect;
}>;

export interface AuthTokenPayload {
	userId: string;
	iat?: number;
	exp?: number;
}

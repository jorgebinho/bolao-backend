import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
	authenticatedUserSelect,
	type AuthenticatedUser,
} from '../../../shared/auth/auth.types.js';

const registerUserSelect = {
	...authenticatedUserSelect,
} satisfies Prisma.UserSelect;

export type LoginUser = User;

export class UserRepository {
	findByEmail(email: string): Promise<LoginUser | null> {
		return prisma.user.findUnique({ where: { email } });
	}

	create(data: {
		name: string;
		email: string;
		password: string;
	}): Promise<AuthenticatedUser> {
		return prisma.user.create({
			data,
			select: registerUserSelect,
		});
	}

	findAuthenticatedUserById(userId: string): Promise<AuthenticatedUser | null> {
		return prisma.user.findUnique({
			where: { id: userId },
			select: authenticatedUserSelect,
		});
	}
}

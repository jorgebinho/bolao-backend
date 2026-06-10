import type { Prisma, User } from '@PrismaGen/client.js';
import {
	type AuthenticatedUser,
	authenticatedUserSelect,
} from '../../../shared/auth/auth.types.js';
import { prisma } from '../../../shared/database/prisma.js';

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

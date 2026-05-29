import bcrypt from 'bcryptjs';
import { ensureGlobalMembership } from '../../groups/index.js';
import { signAccessToken } from '../../../shared/auth/jwt.js';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import { UserRepository, type LoginUser } from '../repositories/user.repository.js';
import type { LoginInput, RegisterInput } from '../http/auth.schemas.js';

export class AuthServiceError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export interface AuthResponse<TUser> {
	user: TUser;
	token: string;
}

export class AuthService {
	constructor(private readonly userRepository: UserRepository) {}

	async register({
		name,
		email,
		password,
	}: RegisterInput): Promise<AuthResponse<AuthenticatedUser>> {
		const existingUser = await this.userRepository.findByEmail(email);

		if (existingUser) {
			throw new AuthServiceError(409, 'Este email já está cadastrado.');
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await this.userRepository.create({
			name,
			email,
			password: hashedPassword,
		});

		await ensureGlobalMembership(user.id);

		return { user, token: signAccessToken(user.id) };
	}

	async login({
		email,
		password,
	}: LoginInput): Promise<AuthResponse<Omit<LoginUser, 'password'>>> {
		const user = await this.userRepository.findByEmail(email);

		if (!user || !(await bcrypt.compare(password, user.password))) {
			throw new AuthServiceError(401, 'Email ou senha incorretos.');
		}

		await ensureGlobalMembership(user.id);

		const { password: _password, ...userWithoutPassword } = user;

		return { user: userWithoutPassword, token: signAccessToken(user.id) };
	}
}

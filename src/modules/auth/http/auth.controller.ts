import type { Request, Response } from 'express';
import {
	AuthService,
	AuthServiceError,
} from '../services/auth.service.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export class AuthController {
	constructor(private readonly authService: AuthService) {}

	async register(req: Request, res: Response): Promise<Response> {
		const parseResult = registerSchema.safeParse(req.body);

		if (!parseResult.success) {
			return res
				.status(400)
				.json({ error: 'Nome, email e senha são obrigatórios.' });
		}

		const payload = parseResult.data;
		const { name, email, password } = payload;

		if (!name || !email || !password) {
			return res
				.status(400)
				.json({ error: 'Nome, email e senha são obrigatórios.' });
		}

		if (password.length < 6) {
			return res
				.status(400)
				.json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
		}

		try {
			const result = await this.authService.register(payload);
			return res.status(201).json(result);
		} catch (error) {
			return handleAuthError(
				error,
				res,
				'Erro no registro:',
				'Erro interno ao criar usuário.',
			);
		}
	}

	async login(req: Request, res: Response): Promise<Response> {
		const parseResult = loginSchema.safeParse(req.body);

		if (!parseResult.success) {
			return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
		}

		const payload = parseResult.data;
		const { email, password } = payload;

		if (!email || !password) {
			return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
		}

		try {
			const result = await this.authService.login(payload);
			return res.json(result);
		} catch (error) {
			return handleAuthError(
				error,
				res,
				'Erro no login:',
				'Erro interno ao fazer login.',
			);
		}
	}

	me(req: Request, res: Response): Response {
		return res.json({ user: req.user });
	}
}

function handleAuthError(
	error: unknown,
	res: Response,
	logLabel: string,
	fallbackMessage: string,
): Response {
	if (error instanceof AuthServiceError) {
		return res.status(error.statusCode).json({ error: error.message });
	}

	console.error(logLabel, error);
	return res.status(500).json({ error: fallbackMessage });
}

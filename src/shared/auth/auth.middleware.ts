import type {
	NextFunction,
	Request,
	Response,
} from 'express';
import { prisma } from '../database/prisma.js';
import { authenticatedUserSelect } from './auth.types.js';
import { verifyAccessToken } from './jwt.js';

export async function authenticate(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<Response | void> {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ error: 'Token de autenticação não fornecido.' });
	}

	const token = authHeader.split(' ')[1];

	try {
		const decoded = verifyAccessToken(token);
		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
			select: authenticatedUserSelect,
		});

		if (!user) {
			return res.status(401).json({ error: 'Usuário não encontrado.' });
		}

		req.user = user;
		next();
	} catch {
		return res.status(401).json({ error: 'Token inválido ou expirado.' });
	}
}

export function requireAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Response | void {
	if (!req.user || req.user.role !== 'ADMIN') {
		return res
			.status(403)
			.json({ error: 'Acesso negado. Requer permissão de administrador.' });
	}

	next();
}

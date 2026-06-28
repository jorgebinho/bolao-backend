import type { CorsOptions } from 'cors';
import { env } from '../config/env.js';

export function createCorsOptions(): CorsOptions {
	const allowedOrigins = new Set([
		env.FRONTEND_URL,
		'http://localhost:5173',
		'http://127.0.0.1:5173',
		'http://localhost:3000',
		'http://127.0.0.1:3000',
	].filter(Boolean).flatMap((origin) => {
		const value = String(origin).replace(/\/$/, '');
		return [value, `${value}/`];
	}));

	return {
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.has(origin)) {
				return callback(null, true);
			}

			console.log(`Origem bloqueada pelo CORS do servidor: ${origin}`);
			return callback(new Error('Não permitido pelo CORS'));
		},
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	};
}

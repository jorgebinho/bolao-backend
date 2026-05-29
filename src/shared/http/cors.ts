import type { CorsOptions } from 'cors';
import { env } from '../config/env.js';

export function createCorsOptions(): CorsOptions {
	const allowedOrigins = [
		env.FRONTEND_URL,
		'http://localhost:5173',
		'http://localhost:3000',
	].filter(Boolean);

	return {
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, true);
			}

			console.log(`Origem bloqueada pelo CORS do servidor: ${origin}`);
			return callback(new Error('Não permitido pelo CORS'));
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		optionsSuccessStatus: 200,
	};
}

import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (req, res) => {
	res
		.status(404)
		.json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
};

export const internalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	console.error('Erro não tratado:', err);
	res.status(500).json({ error: 'Erro interno do servidor.' });
};

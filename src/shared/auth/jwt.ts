import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthTokenPayload } from './auth.types.js';

export function signAccessToken(userId: string): string {
	return jwt.sign({ userId }, env.JWT_SECRET, {
		expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
	});
}

export function verifyAccessToken(token: string): AuthTokenPayload {
	return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

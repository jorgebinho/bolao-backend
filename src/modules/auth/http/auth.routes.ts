import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

export const authRouter = express.Router();

authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.get('/me', authenticate, (req, res) => authController.me(req, res));

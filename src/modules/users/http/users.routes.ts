import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { UsersService } from '../services/users.service.js';
import { UsersController } from './users.controller.js';

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

export const usersRouter = express.Router();

usersRouter.use(authenticate);

usersRouter.get('/me/profile', (req, res) => usersController.getProfile(req, res));
usersRouter.patch('/me', (req, res) => usersController.updateProfile(req, res));
usersRouter.patch('/me/password', (req, res) =>
	usersController.updatePassword(req, res),
);

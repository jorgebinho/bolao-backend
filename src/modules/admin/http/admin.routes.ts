import express from 'express';
import {
	authenticate,
	requireAdmin,
} from '../../../shared/auth/auth.middleware.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from '../repositories/admin.repository.js';
import { AdminService } from '../services/admin.service.js';

const adminRepository = new AdminRepository();
const adminService = new AdminService(adminRepository);
const adminController = new AdminController(adminService);

export const adminRouter = express.Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.post('/matches', (req, res) => adminController.createMatch(req, res));
adminRouter.put('/matches/:id', (req, res) =>
	adminController.updateMatch(req, res),
);
adminRouter.delete('/matches/:id', (req, res) =>
	adminController.deleteMatch(req, res),
);
adminRouter.post('/score-match', (req, res) =>
	adminController.scoreMatch(req, res),
);
adminRouter.post('/champion-result', (req, res) =>
	adminController.saveChampionResult(req, res),
);
adminRouter.get('/users', (req, res) => adminController.listUsers(req, res));
adminRouter.delete('/users/:id', (req, res) =>
	adminController.deleteUser(req, res),
);
adminRouter.patch('/users/:id/promote', (req, res) =>
	adminController.promoteUser(req, res),
);
adminRouter.patch('/users/:id/demote', (req, res) =>
	adminController.demoteUser(req, res),
);

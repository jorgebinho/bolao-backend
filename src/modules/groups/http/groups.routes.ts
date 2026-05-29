import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { GroupsRepository } from '../repositories/groups.repository.js';
import { GroupsService } from '../services/groups.service.js';
import { GroupsController } from './groups.controller.js';

const groupsRepository = new GroupsRepository();
const groupsService = new GroupsService(groupsRepository);
const groupsController = new GroupsController(groupsService);

export const groupsRouter = express.Router();

groupsRouter.use(authenticate);

groupsRouter.get('/', (req, res) => groupsController.listGroups(req, res));
groupsRouter.post('/', (req, res) => groupsController.createGroup(req, res));
groupsRouter.post('/join', (req, res) => groupsController.joinGroup(req, res));
groupsRouter.get('/:id', (req, res) => groupsController.getGroup(req, res));
groupsRouter.get('/:id/ranking', (req, res) =>
	groupsController.getGroupRanking(req, res),
);
groupsRouter.get('/:id/members', (req, res) =>
	groupsController.listMembers(req, res),
);
groupsRouter.delete('/:id/members/:userId', (req, res) =>
	groupsController.removeMember(req, res),
);

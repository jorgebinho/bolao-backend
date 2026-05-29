import { GroupsRepository } from './repositories/groups.repository.js';
import {
	GLOBAL_GROUP_CODE,
	GroupsService,
	makeGroupCode,
	serializeGroupMember,
} from './services/groups.service.js';

const groupsRepository = new GroupsRepository();
const groupsService = new GroupsService(groupsRepository);

export {
	GLOBAL_GROUP_CODE,
	GroupsService,
	GroupsServiceError,
	makeGroupCode,
	serializeGroupMember,
} from './services/groups.service.js';

export async function ensureGlobalGroup() {
	return groupsService.ensureGlobalGroup();
}

export async function ensureGlobalMembership(userId: string) {
	return groupsService.ensureGlobalMembership(userId);
}

export async function ensureAllUsersInGlobalGroup() {
	return groupsService.ensureAllUsersInGlobalGroup();
}

export async function requireGroupMember(groupId: string, userId: string) {
	return groupsService.requireGroupMember(groupId, userId);
}

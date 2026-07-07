import assert from 'node:assert/strict';
import test from 'node:test';
import { MatchRemindersService } from '../src/modules/match-reminders/services/match-reminders.service.js';

test('renders team flag PNG images in reminder emails', async () => {
	const sentEmails: Array<{ html: string }> = [];
	const service = new MatchRemindersService(
		{
			findMatchesInReminderWindow: async () => [
				{
					id: 'match-1',
					homeTeam: 'Portugal',
					awayTeam: 'Brasil',
					homeFlag: 'https://flagcdn.com/w80/pt.png',
					awayFlag: 'https://flagcdn.com/w80/br.png',
					matchDate: new Date('2026-06-18T23:50:00.000Z'),
					stage: 'Semifinal',
					status: 'UPCOMING',
					homeScore: null,
					awayScore: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					guesses: [],
					reminders: [],
				},
			],
			findUsersWithoutGuessOrReminder: async () => [
				{
					id: 'user-1',
					name: 'Jorge',
					email: 'jorge@example.com',
				},
			],
			recordReminderSent: async () => undefined,
		},
		{
			isConfigured: () => true,
			send: async (input: { html: string }) => {
				sentEmails.push(input);
			},
		} as never,
	);

	await service.sendPendingReminders(new Date('2026-06-18T22:00:00.000Z'));

	assert.equal(sentEmails.length, 1);
	assert.match(
		sentEmails[0].html,
		/<img[^>]+src="https:\/\/flagcdn\.com\/w80\/pt\.png"/,
	);
	assert.match(
		sentEmails[0].html,
		/<img[^>]+src="https:\/\/flagcdn\.com\/w80\/br\.png"/,
	);
});

test('falls back to team name when reminder match has no saved flag URL', async () => {
	const sentEmails: Array<{ html: string }> = [];
	const service = new MatchRemindersService(
		{
			findMatchesInReminderWindow: async () => [
				{
					id: 'match-1',
					homeTeam: 'Brasil',
					awayTeam: 'Argentina',
					homeFlag: null,
					awayFlag: null,
					matchDate: new Date('2026-06-18T23:50:00.000Z'),
					stage: 'Copa do Mundo 2026',
					status: 'UPCOMING',
					homeScore: null,
					awayScore: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					guesses: [],
					reminders: [],
				},
			],
			findUsersWithoutGuessOrReminder: async () => [
				{
					id: 'user-1',
					name: 'Bernardo',
					email: 'bernardo@example.com',
				},
			],
			recordReminderSent: async () => undefined,
		},
		{
			isConfigured: () => true,
			send: async (input: { html: string }) => {
				sentEmails.push(input);
			},
		} as never,
	);

	await service.sendPendingReminders(new Date('2026-06-18T22:00:00.000Z'));

	assert.equal(sentEmails.length, 1);
	assert.match(
		sentEmails[0].html,
		/<img[^>]+src="https:\/\/flagcdn\.com\/w80\/br\.png"/,
	);
	assert.match(
		sentEmails[0].html,
		/<img[^>]+src="https:\/\/flagcdn\.com\/w80\/ar\.png"/,
	);
	assert.doesNotMatch(sentEmails[0].html, />BR<\/div>/);
	assert.doesNotMatch(sentEmails[0].html, />AR<\/div>/);
});

test('uses Scotland flag when falling back from team name', async () => {
	const sentEmails: Array<{ html: string }> = [];
	const service = new MatchRemindersService(
		{
			findMatchesInReminderWindow: async () => [
				{
					id: 'match-1',
					homeTeam: 'Escócia',
					awayTeam: 'Inglaterra',
					homeFlag: null,
					awayFlag: null,
					matchDate: new Date('2026-06-18T23:50:00.000Z'),
					stage: 'Copa do Mundo 2026',
					status: 'UPCOMING',
					homeScore: null,
					awayScore: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					guesses: [],
					reminders: [],
				},
			],
			findUsersWithoutGuessOrReminder: async () => [
				{
					id: 'user-1',
					name: 'Bernardo',
					email: 'bernardo@example.com',
				},
			],
			recordReminderSent: async () => undefined,
		},
		{
			isConfigured: () => true,
			send: async (input: { html: string }) => {
				sentEmails.push(input);
			},
		} as never,
	);

	await service.sendPendingReminders(new Date('2026-06-18T22:00:00.000Z'));

	assert.equal(sentEmails.length, 1);
	assert.match(
		sentEmails[0].html,
		/<img[^>]+src="https:\/\/flagcdn\.com\/w80\/gb-sct\.png"/,
	);
	assert.match(
		sentEmails[0].html,
		/<img[^>]+src="https:\/\/flagcdn\.com\/w80\/gb\.png"/,
	);
});

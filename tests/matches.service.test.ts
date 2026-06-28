import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthenticatedUser } from '../src/shared/auth/auth.types.js';
import type {
	MatchesRepository,
	MatchWithGuesses,
} from '../src/modules/matches/repositories/matches.repository.js';
import { MatchesService } from '../src/modules/matches/services/matches.service.js';

const currentUser: AuthenticatedUser = {
	id: 'user-1',
	name: 'Sidnei Junior',
	email: 'sidnei@example.com',
	role: 'USER',
	points: 0,
};

function makeMatch(status: 'UPCOMING' | 'LOCKED'): MatchWithGuesses {
	const now = new Date();
	return {
		id: 'match-1',
		homeTeam: 'África do Sul',
		awayTeam: 'Canadá',
		homeFlag: null,
		awayFlag: null,
		matchDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
		stage: 'Fase de 32',
		status,
		homeScore: null,
		awayScore: null,
		advancingTeam: null,
		createdAt: now,
		updatedAt: now,
		guesses: [
			{
				id: 'guess-1',
				userId: 'user-1',
				matchId: 'match-1',
				homeGuess: 1,
				awayGuess: 2,
				advancingTeam: null,
				points: 0,
				createdAt: now,
				updatedAt: now,
				user: { id: 'user-1', name: 'Sidnei Junior' },
			},
			{
				id: 'guess-2',
				userId: 'user-2',
				matchId: 'match-1',
				homeGuess: 0,
				awayGuess: 2,
				advancingTeam: 'África do Sul',
				points: 0,
				createdAt: now,
				updatedAt: now,
				user: { id: 'user-2', name: 'Pedro' },
			},
			{
				id: 'guess-3',
				userId: 'user-3',
				matchId: 'match-1',
				homeGuess: 1,
				awayGuess: 1,
				advancingTeam: null,
				points: 0,
				createdAt: now,
				updatedAt: now,
				user: { id: 'user-3', name: 'Bruno' },
			},
		],
	};
}

function makeService(match: MatchWithGuesses): MatchesService {
	const repository = {
		findAllWithGuesses: async () => [match],
		lockMatches: async () => ({ count: 0 }),
	} as unknown as MatchesRepository;

	return new MatchesService(repository);
}

test('derives unambiguous legacy advancing teams in locked knockout guesses', async () => {
	const [match] = await makeService(makeMatch('LOCKED')).listMatchesForUser(
		currentUser,
	);

	assert.equal(match.myGuess?.advancingTeam, 'Canadá');
	assert.equal(match.guesses[0].advancingTeam, 'Canadá');
	assert.equal(match.guesses[1].advancingTeam, 'África do Sul');
	assert.equal(match.guesses[2].advancingTeam, null);
});

test('keeps other participants hidden before the match locks', async () => {
	const [match] = await makeService(makeMatch('UPCOMING')).listMatchesForUser(
		currentUser,
	);

	assert.equal(match.guesses.length, 1);
	assert.equal(match.guesses[0].userId, currentUser.id);
	assert.equal(match.guesses[0].advancingTeam, 'Canadá');
});

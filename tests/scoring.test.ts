import assert from 'node:assert/strict';
import test from 'node:test';
import {
	normalizeRankingUsers,
	summarizeFinishedGuesses,
} from '../src/shared/scoring/scoring.js';

test('returns zero statistics when there are no finished guesses', () => {
	const summary = summarizeFinishedGuesses([
		{ points: 0, match: { status: 'UPCOMING' } },
		{ points: 0, match: { status: 'LOCKED' } },
	]);

	assert.deepEqual(summary, {
		finishedGuesses: 0,
		exactScores: 0,
		partialScores: 0,
		errors: 0,
		hitRate: 0,
	});
});

test('counts exact, partial and errors only for finished guesses', () => {
	const summary = summarizeFinishedGuesses([
		{ points: 3, match: { status: 'FINISHED' } },
		{ points: 1, match: { status: 'FINISHED' } },
		{ points: 0, match: { status: 'FINISHED' } },
		{ points: 0, match: { status: 'UPCOMING' } },
	]);

	assert.deepEqual(summary, {
		finishedGuesses: 3,
		exactScores: 1,
		partialScores: 1,
		errors: 1,
		hitRate: 67,
	});
});

test('ranking ignores unfinished guesses when counting errors', () => {
	const [user] = normalizeRankingUsers(
		[
			{
				id: 'user-1',
				name: 'Usuario',
				points: 4,
				_count: { guesses: 4 },
				guesses: [
					{ points: 3, match: { status: 'FINISHED' } },
					{ points: 1, match: { status: 'FINISHED' } },
					{ points: 0, match: { status: 'FINISHED' } },
					{ points: 0, match: { status: 'UPCOMING' } },
				],
			},
		],
		'user-1',
	);

	assert.equal(user.totalGuesses, 4);
	assert.equal(user.exactScores, 1);
	assert.equal(user.partialScores, 1);
	assert.equal(user.errors, 1);
});

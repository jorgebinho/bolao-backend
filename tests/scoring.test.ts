import assert from 'node:assert/strict';
import test from 'node:test';
import {
	calculateMatchPoints,
	normalizeRankingUsers,
	summarizeFinishedGuesses,
} from '../src/shared/scoring/scoring.js';

test('keeps group-stage scoring unchanged', () => {
	assert.equal(calculateMatchPoints(2, 1, 2, 1), 3);
	assert.equal(calculateMatchPoints(2, 1, 1, 0), 1);
	assert.equal(calculateMatchPoints(1, 1, 0, 0), 1);
	assert.equal(calculateMatchPoints(2, 1, 0, 1), 0);
});

test('scores knockout with base points plus advancing team bonus', () => {
	assert.equal(
		calculateMatchPoints(1, 1, 1, 1, {
			stage: 'Oitavas de Final',
			guessAdvancingTeam: 'Brasil',
			matchAdvancingTeam: 'Brasil',
		}),
		4,
	);
	assert.equal(
		calculateMatchPoints(0, 0, 1, 1, {
			stage: 'Oitavas de Final',
			guessAdvancingTeam: 'Brasil',
			matchAdvancingTeam: 'Brasil',
		}),
		2,
	);
	assert.equal(
		calculateMatchPoints(2, 1, 1, 1, {
			stage: 'Oitavas de Final',
			guessAdvancingTeam: 'Brasil',
			matchAdvancingTeam: 'Brasil',
		}),
		1,
	);
	assert.equal(
		calculateMatchPoints(0, 0, 1, 1, {
			stage: 'Oitavas de Final',
			guessAdvancingTeam: 'Argentina',
			matchAdvancingTeam: 'Brasil',
		}),
		1,
	);
	assert.equal(
		calculateMatchPoints(2, 0, 2, 0, {
			stage: 'Quartas de Final',
			guessAdvancingTeam: 'Brasil',
			matchAdvancingTeam: 'Brasil',
		}),
		4,
	);
});

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
		{ points: 4, match: { status: 'FINISHED' } },
		{ points: 3, match: { status: 'FINISHED' } },
		{ points: 2, match: { status: 'FINISHED' } },
		{ points: 1, match: { status: 'FINISHED' } },
		{ points: 0, match: { status: 'FINISHED' } },
		{ points: 0, match: { status: 'UPCOMING' } },
	]);

	assert.deepEqual(summary, {
		finishedGuesses: 5,
		exactScores: 2,
		partialScores: 2,
		errors: 1,
		hitRate: 80,
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

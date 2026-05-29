import express from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const router = express.Router();

router.use(authenticate);

function normalizeStage(stage) {
	return stage || "Sem fase definida";
}

function serializeHistoryGuess(guess) {
	return {
		id: guess.id,
		homeGuess: guess.homeGuess,
		awayGuess: guess.awayGuess,
		points: guess.points,
		match: guess.match,
	};
}

router.get("/", async (req, res) => {
	try {
		const matches = await prisma.match.findMany({
			select: { stage: true, id: true, status: true },
			orderBy: { matchDate: "asc" },
		});

		const map = new Map();
		for (const match of matches) {
			const stage = normalizeStage(match.stage);
			if (!map.has(stage))
				map.set(stage, { stage, totalMatches: 0, finishedMatches: 0 });
			const item = map.get(stage);
			item.totalMatches += 1;
			if (match.status === "FINISHED") item.finishedMatches += 1;
		}

		return res.json({ rounds: Array.from(map.values()) });
	} catch (err) {
		console.error("Erro ao listar rodadas:", err);
		return res.status(500).json({ error: "Erro ao buscar rodadas." });
	}
});

router.get("/me/history", async (req, res) => {
	try {
		const guesses = await prisma.guess.findMany({
			where: { userId: req.user.id },
			orderBy: { match: { matchDate: "desc" } },
			include: {
				match: {
					select: {
						id: true,
						homeTeam: true,
						awayTeam: true,
						homeScore: true,
						awayScore: true,
						matchDate: true,
						stage: true,
						status: true,
					},
				},
			},
		});

		const grouped = {};
		for (const guess of guesses) {
			const stage = normalizeStage(guess.match.stage);
			grouped[stage] ||= { stage, totalPoints: 0, guesses: [] };
			grouped[stage].totalPoints += guess.points;
			grouped[stage].guesses.push(serializeHistoryGuess(guess));
		}

		return res.json({ history: Object.values(grouped) });
	} catch (err) {
		console.error("Erro ao buscar histórico:", err);
		return res.status(500).json({ error: "Erro ao buscar histórico." });
	}
});

router.get("/:stage", async (req, res) => {
	const stage = decodeURIComponent(req.params.stage);

	try {
		const matches = await prisma.match.findMany({
			where: stage === "Sem fase definida" ? { stage: null } : { stage },
			orderBy: { matchDate: "asc" },
			include: { guesses: { where: { userId: req.user.id } } },
		});

		return res.json({
			stage,
			matches: matches.map((match) => ({
				id: match.id,
				homeTeam: match.homeTeam,
				awayTeam: match.awayTeam,
				homeScore: match.homeScore,
				awayScore: match.awayScore,
				matchDate: match.matchDate,
				status: match.status,
				myGuess: match.guesses[0] || null,
			})),
		});
	} catch (err) {
		console.error("Erro ao buscar rodada:", err);
		return res.status(500).json({ error: "Erro ao buscar rodada." });
	}
});

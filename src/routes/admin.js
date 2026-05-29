import express from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import {
	CHAMPION_BONUS_POINTS,
	calculateMatchPoints,
} from "../services/scoring.js";

export const router = express.Router();

router.use(authenticate, requireAdmin);

function cleanText(value) {
	const text = String(value || "").trim();
	return text || null;
}

router.post("/matches", async (req, res) => {
	const homeTeam = cleanText(req.body.homeTeam);
	const awayTeam = cleanText(req.body.awayTeam);
	const matchDate = req.body.matchDate ? new Date(req.body.matchDate) : null;

	if (
		!homeTeam ||
		!awayTeam ||
		!matchDate ||
		Number.isNaN(matchDate.getTime())
	) {
		return res
			.status(400)
			.json({ error: "Times e data do jogo são obrigatórios." });
	}

	if (homeTeam === awayTeam) {
		return res
			.status(400)
			.json({ error: "Os times do jogo devem ser diferentes." });
	}

	try {
		const match = await prisma.match.create({
			data: {
				homeTeam,
				awayTeam,
				homeFlag: cleanText(req.body.homeFlag),
				awayFlag: cleanText(req.body.awayFlag),
				matchDate,
				stage: cleanText(req.body.stage),
			},
		});

		return res.status(201).json({ match });
	} catch (err) {
		console.error("Erro ao criar jogo:", err);
		return res.status(500).json({ error: "Erro ao criar jogo." });
	}
});

router.put("/matches/:id", async (req, res) => {
	const { id } = req.params;

	try {
		const match = await prisma.match.findUnique({ where: { id } });
		if (!match) return res.status(404).json({ error: "Jogo não encontrado." });
		if (match.status === "FINISHED") {
			return res
				.status(400)
				.json({ error: "Não é possível editar um jogo já finalizado." });
		}

		const nextDate = req.body.matchDate
			? new Date(req.body.matchDate)
			: match.matchDate;
		if (Number.isNaN(nextDate.getTime())) {
			return res.status(400).json({ error: "Data do jogo inválida." });
		}

		const homeTeam = cleanText(req.body.homeTeam) || match.homeTeam;
		const awayTeam = cleanText(req.body.awayTeam) || match.awayTeam;
		if (homeTeam === awayTeam) {
			return res
				.status(400)
				.json({ error: "Os times do jogo devem ser diferentes." });
		}

		const updated = await prisma.match.update({
			where: { id },
			data: {
				homeTeam,
				awayTeam,
				homeFlag:
					req.body.homeFlag !== undefined
						? cleanText(req.body.homeFlag)
						: match.homeFlag,
				awayFlag:
					req.body.awayFlag !== undefined
						? cleanText(req.body.awayFlag)
						: match.awayFlag,
				matchDate: nextDate,
				stage:
					req.body.stage !== undefined
						? cleanText(req.body.stage)
						: match.stage,
			},
		});

		return res.json({ match: updated });
	} catch (err) {
		console.error("Erro ao editar jogo:", err);
		return res.status(500).json({ error: "Erro ao editar jogo." });
	}
});

router.delete("/matches/:id", async (req, res) => {
	const { id } = req.params;

	try {
		const match = await prisma.match.findUnique({ where: { id } });
		if (!match) return res.status(404).json({ error: "Jogo não encontrado." });
		if (match.status !== "UPCOMING") {
			return res.status(400).json({
				error: "Só é possível deletar jogos que ainda não foram bloqueados.",
			});
		}

		await prisma.match.delete({ where: { id } });
		return res.json({ message: "Jogo removido com sucesso." });
	} catch (err) {
		console.error("Erro ao deletar jogo:", err);
		return res.status(500).json({ error: "Erro ao deletar jogo." });
	}
});

router.post("/score-match", async (req, res) => {
	const { matchId } = req.body;
	const homeScore = Number(req.body.homeScore);
	const awayScore = Number(req.body.awayScore);

	if (
		!matchId ||
		!Number.isInteger(homeScore) ||
		!Number.isInteger(awayScore) ||
		homeScore < 0 ||
		awayScore < 0
	) {
		return res.status(400).json({
			error: "matchId, homeScore e awayScore válidos são obrigatórios.",
		});
	}

	try {
		const match = await prisma.match.findUnique({
			where: { id: matchId },
			include: { guesses: true },
		});

		if (!match) return res.status(404).json({ error: "Jogo não encontrado." });
		if (match.status === "FINISHED") {
			return res.status(400).json({ error: "Este jogo já foi pontuado." });
		}

		const updates = match.guesses.map((guess) => ({
			guessId: guess.id,
			userId: guess.userId,
			points: calculateMatchPoints(
				guess.homeGuess,
				guess.awayGuess,
				homeScore,
				awayScore,
			),
		}));

		await prisma.$transaction(async (tx) => {
			for (const { guessId, points } of updates) {
				await tx.guess.update({ where: { id: guessId }, data: { points } });
			}

			for (const { userId, points } of updates) {
				if (points > 0) {
					await tx.user.update({
						where: { id: userId },
						data: { points: { increment: points } },
					});
				}
			}

			await tx.match.update({
				where: { id: matchId },
				data: { status: "FINISHED", homeScore, awayScore },
			});
		});

		const updatedMatch = await prisma.match.findUnique({
			where: { id: matchId },
			include: {
				guesses: { include: { user: { select: { id: true, name: true } } } },
			},
		});

		return res.json({
			message: `Jogo pontuado com sucesso. ${updates.length} palpite(s) processado(s).`,
			match: updatedMatch,
			summary: updates,
		});
	} catch (err) {
		console.error("Erro ao pontuar jogo:", err);
		return res.status(500).json({ error: "Erro ao processar pontuação." });
	}
});

router.post("/champion-result", async (req, res) => {
	const champion = cleanText(req.body.champion);
	if (!champion)
		return res.status(400).json({ error: "Campeão oficial é obrigatório." });

	try {
		const result = await prisma.$transaction(async (tx) => {
			await tx.appConfig.upsert({
				where: { key: "champion_result" },
				update: { value: champion },
				create: { key: "champion_result", value: champion },
			});

			const guesses = await tx.championGuess.findMany();
			for (const guess of guesses) {
				const isCorrect = guess.team.toLowerCase() === champion.toLowerCase();
				await tx.championGuess.update({
					where: { id: guess.id },
					data: { isCorrect, points: isCorrect ? CHAMPION_BONUS_POINTS : 0 },
				});
			}

			return { processed: guesses.length };
		});

		return res.json({ champion, ...result, message: "Campeão oficial salvo." });
	} catch (err) {
		console.error("Erro ao salvar campeão:", err);
		return res.status(500).json({ error: "Erro ao salvar campeão oficial." });
	}
});

router.get("/users", async (req, res) => {
	try {
		const users = await prisma.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				points: true,
				createdAt: true,
				_count: { select: { guesses: true, groupMemberships: true } },
				championGuess: {
					select: { team: true, points: true, isCorrect: true },
				},
			},
			orderBy: [{ points: "desc" }, { name: "asc" }],
		});

		return res.json({ users });
	} catch (err) {
		console.error("Erro ao listar usuários:", err);
		return res.status(500).json({ error: "Erro ao buscar usuários." });
	}
});

router.delete("/users/:id", async (req, res) => {
	const { id } = req.params;
	if (id === req.user.id)
		return res.status(400).json({ error: "Você não pode remover a si mesmo." });

	try {
		const user = await prisma.user.findUnique({ where: { id } });
		if (!user)
			return res.status(404).json({ error: "Usuário não encontrado." });

		await prisma.user.delete({ where: { id } });
		return res.json({
			message: `Usuário "${user.name}" removido com sucesso.`,
		});
	} catch (err) {
		console.error("Erro ao remover usuário:", err);
		return res.status(500).json({ error: "Erro ao remover usuário." });
	}
});

router.patch("/users/:id/promote", async (req, res) => {
	const { id } = req.params;

	try {
		const user = await prisma.user.findUnique({ where: { id } });
		if (!user)
			return res.status(404).json({ error: "Usuário não encontrado." });
		if (user.role === "ADMIN")
			return res
				.status(400)
				.json({ error: "Este usuário já é administrador." });

		const updated = await prisma.user.update({
			where: { id },
			data: { role: "ADMIN" },
			select: { id: true, name: true, email: true, role: true },
		});

		return res.json({
			user: updated,
			message: `${updated.name} agora é ADMIN.`,
		});
	} catch (err) {
		console.error("Erro ao promover usuário:", err);
		return res.status(500).json({ error: "Erro ao promover usuário." });
	}
});

router.patch("/users/:id/demote", async (req, res) => {
	const { id } = req.params;
	if (id === req.user.id)
		return res
			.status(400)
			.json({ error: "Você não pode rebaixar a si mesmo." });

	try {
		const updated = await prisma.user.update({
			where: { id },
			data: { role: "USER" },
			select: { id: true, name: true, email: true, role: true },
		});

		return res.json({ user: updated });
	} catch (err) {
		console.error("Erro ao rebaixar usuário:", err);
		return res.status(500).json({ error: "Erro ao rebaixar usuário." });
	}
});

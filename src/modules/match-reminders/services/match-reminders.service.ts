import { format } from 'node:util';
import type { Mailer } from '../../../shared/email/mailer.js';
import {
	MatchRemindersRepository,
	type ReminderMatch,
	type ReminderUser,
} from '../repositories/match-reminders.repository.js';

const REMINDER_LEAD_TIME_MS = 2 * 60 * 60 * 1000;
const LOCK_BEFORE_MATCH_MS = 15 * 60 * 1000;

export interface ReminderSummary {
	matchesChecked: number;
	emailsSent: number;
	emailsSkipped: number;
}

export class MatchRemindersService {
	constructor(
		private readonly matchRemindersRepository: MatchRemindersRepository,
		private readonly mailer: Mailer,
	) {}

	async sendPendingReminders(now = new Date()): Promise<ReminderSummary> {
		if (!this.mailer.isConfigured()) {
			return { matchesChecked: 0, emailsSent: 0, emailsSkipped: 0 };
		}

		const matches =
			await this.matchRemindersRepository.findMatchesInReminderWindow({
				minMatchDate: new Date(now.getTime() + LOCK_BEFORE_MATCH_MS),
				maxMatchDate: new Date(now.getTime() + REMINDER_LEAD_TIME_MS),
			});

		let emailsSent = 0;
		let emailsSkipped = 0;

		for (const match of matches) {
			const users = await this.matchRemindersRepository.findUsersWithoutGuessOrReminder({
				guessedUserIds: match.guesses.map((guess) => guess.userId),
				remindedUserIds: match.reminders.map((reminder) => reminder.userId),
			});

			for (const user of users) {
				try {
					await this.mailer.send(this.buildReminderEmail(user, match));
					await this.matchRemindersRepository.recordReminderSent({
						userId: user.id,
						matchId: match.id,
					});
					emailsSent += 1;
				} catch (error) {
					emailsSkipped += 1;
					console.error(
						format(
							'Erro ao enviar lembrete de palpite para %s no jogo %s:',
							user.email,
							match.id,
						),
						error,
					);
				}
			}
		}

		return { matchesChecked: matches.length, emailsSent, emailsSkipped };
	}

	private buildReminderEmail(user: ReminderUser, match: ReminderMatch) {
		const matchDate = new Date(match.matchDate);
		const dateLabel = new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'short',
			timeStyle: 'short',
			timeZone: 'America/Sao_Paulo',
		}).format(matchDate);

		const subject = `Você ainda não palpitou: ${match.homeTeam} x ${match.awayTeam}`;
		const frontendUrl = process.env.FRONTEND_URL || '';
		const actionLine = frontendUrl
			? `Acesse ${frontendUrl} para registrar seu palpite.`
			: 'Acesse o Bolão para registrar seu palpite.';
		const greetingName = user.name.split(' ')[0] || user.name;

		const text = [
			`Olá, ${greetingName}!`,
			'',
			`O jogo ${match.homeTeam} x ${match.awayTeam} começa em breve (${dateLabel}) e você ainda não fez seu palpite.`,
			actionLine,
			'',
			'Depois que o jogo bloquear, não será mais possível palpitar.',
		].join('\n');

		const html = `
			<div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5">
				<h1 style="font-size: 22px">Você ainda não palpitou</h1>
				<p>Olá, <strong>${this.escapeHtml(greetingName)}</strong>!</p>
				<p>O jogo <strong>${this.escapeHtml(match.homeTeam)} x ${this.escapeHtml(match.awayTeam)}</strong> começa em breve (${this.escapeHtml(dateLabel)}) e você ainda não fez seu palpite.</p>
				<p>${this.escapeHtml(actionLine)}</p>
				<p><strong>Depois que o jogo bloquear, não será mais possível palpitar.</strong></p>
			</div>
		`;

		return {
			to: user.email,
			subject,
			text,
			html,
		};
	}

	private escapeHtml(value: string): string {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}
}

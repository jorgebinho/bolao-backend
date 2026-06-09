import { format } from 'node:util';
import { env } from '../../../shared/config/env.js';
import type { Mailer } from '../../../shared/email/mailer.js';
import {
	MatchRemindersRepository,
	type ReminderMatch,
	type ReminderUser,
} from '../repositories/match-reminders.repository.js';

const REMINDER_LEAD_TIME_MS = 2 * 60 * 60 * 1000;
const LOCK_BEFORE_MATCH_MS = 15 * 60 * 1000;
const DEFAULT_FRONTEND_URL = 'https://bolao-frontend-dusky.vercel.app/';

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
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo',
		}).format(matchDate);
		const timeLabel = new Intl.DateTimeFormat('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo',
		}).format(matchDate);
		const lockTime = new Date(matchDate.getTime() - LOCK_BEFORE_MATCH_MS);
		const minutesToLock = Math.max(
			Math.ceil((lockTime.getTime() - Date.now()) / 60000),
			0,
		);
		const lockLabel = this.formatCountdown(minutesToLock);

		const subject = `Você ainda não palpitou: ${match.homeTeam} x ${match.awayTeam}`;
		const frontendUrl = env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
		const actionLine = `Acesse ${frontendUrl} para registrar seu palpite.`;
		const greetingName = user.name.split(' ')[0] || user.name;

		const text = [
			`Olá, ${greetingName}!`,
			'',
			`O jogo ${match.homeTeam} x ${match.awayTeam} começa em breve (${dateLabel}) e você ainda não fez seu palpite.`,
			actionLine,
			'',
			'Depois que o jogo bloquear, não será mais possível palpitar.',
		].join('\n');

		const html = this.buildReminderHtml({
			greetingName,
			match,
			dateLabel,
			timeLabel,
			lockLabel,
			frontendUrl,
		});

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

	private buildReminderHtml(input: {
		greetingName: string;
		match: ReminderMatch;
		dateLabel: string;
		timeLabel: string;
		lockLabel: string;
		frontendUrl: string;
	}): string {
		const { greetingName, match, dateLabel, timeLabel, lockLabel, frontendUrl } =
			input;
		const stageLabel = match.stage || 'Copa do Mundo 2026';
		const homeInitial = this.teamInitial(match.homeTeam);
		const awayInitial = this.teamInitial(match.awayTeam);

		return `
			<div style="margin:0;padding:24px;background:#e8e8e8;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
				<div style="max-width:680px;margin:0 auto;">
					<p style="margin:0 0 12px;font-size:16px;font-weight:800;">Olá, ${this.escapeHtml(greetingName)}!</p>
					<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#333;">Você ainda não fez seu palpite para este jogo. Ele bloqueia em breve.</p>

					<div style="background:#fafafa;border:4px solid #0a0a0a;box-shadow:8px 8px 0 #0a0a0a;">
						<div style="background:#ffe600;border-bottom:4px solid #0a0a0a;padding:16px 20px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
								<tr>
									<td style="font-size:14px;font-weight:900;line-height:1.35;">
										${this.escapeHtml(stageLabel)}<br>
										${this.escapeHtml(dateLabel)}
									</td>
									<td align="right">
										<span style="display:inline-block;border:3px solid #0a0a0a;background:#00ff85;padding:8px 14px;font-size:13px;font-weight:900;">Aberto</span>
									</td>
								</tr>
							</table>
						</div>

						<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
							<tr>
								<td width="34%" align="center" style="padding:28px 12px;">
									<div style="display:inline-block;border:4px solid #0a0a0a;background:#fff;padding:14px 16px;font-size:20px;font-weight:900;">${this.escapeHtml(homeInitial)}</div>
									<div style="margin-top:12px;font-size:18px;font-weight:900;">${this.escapeHtml(match.homeTeam)}</div>
								</td>
								<td width="32%" align="center" style="padding:28px 8px;">
									<div style="font-size:42px;line-height:1;font-weight:900;">${this.escapeHtml(timeLabel)}</div>
									<div style="margin-top:8px;font-size:14px;font-weight:800;color:#777;">Fecha ${this.escapeHtml(lockLabel)}</div>
								</td>
								<td width="34%" align="center" style="padding:28px 12px;">
									<div style="display:inline-block;border:4px solid #0a0a0a;background:#fff;padding:14px 16px;font-size:20px;font-weight:900;">${this.escapeHtml(awayInitial)}</div>
									<div style="margin-top:12px;font-size:18px;font-weight:900;">${this.escapeHtml(match.awayTeam)}</div>
								</td>
							</tr>
						</table>

						<div style="border-top:4px solid #0a0a0a;background:#d9d9d9;padding:18px 20px;">
							<a href="${this.escapeHtml(frontendUrl)}" style="display:block;background:#0a0a0a;color:#ffe600;text-align:center;text-decoration:none;border:4px solid #0a0a0a;box-shadow:6px 6px 0 #ffe600;padding:16px 18px;font-size:15px;font-weight:900;letter-spacing:.04em;">PALPITAR AGORA</a>
						</div>
					</div>

					<p style="margin:22px 0 0;font-size:13px;font-weight:700;color:#555;">Depois que o jogo bloquear, não será mais possível palpitar.</p>
				</div>
			</div>
		`;
	}

	private formatCountdown(minutesToLock: number): string {
		if (minutesToLock <= 0) return 'agora';
		if (minutesToLock < 60) return `em ${minutesToLock} min`;

		const hours = Math.floor(minutesToLock / 60);
		const minutes = minutesToLock % 60;
		return minutes > 0 ? `em ${hours}h ${minutes}min` : `em ${hours}h`;
	}

	private teamInitial(team: string): string {
		const words = team
			.split(/\s+/)
			.map((word) => word.replace(/[^\p{L}]/gu, ''))
			.filter(Boolean);
		const initials =
			words.length > 1 ? `${words[0][0]}${words.at(-1)?.[0]}` : words[0]?.slice(0, 2);
		return (initials || '?').toUpperCase();
	}
}

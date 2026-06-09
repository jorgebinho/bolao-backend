import { env } from '../../shared/config/env.js';
import { Mailer } from '../../shared/email/mailer.js';
import { MatchRemindersRepository } from './repositories/match-reminders.repository.js';
import { MatchRemindersService } from './services/match-reminders.service.js';

export function startMatchRemindersScheduler(): void {
	if (!env.MATCH_REMINDERS_ENABLED) {
		console.log('[Bolão API] Lembretes por e-mail desativados.');
		return;
	}

	const mailer = new Mailer();
	if (!mailer.isConfigured()) {
		console.warn(
			'[Bolão API] SMTP não configurado. Lembretes por e-mail serão ignorados.',
		);
	}

	const service = new MatchRemindersService(
		new MatchRemindersRepository(),
		mailer,
	);
	const intervalMs = env.MATCH_REMINDER_INTERVAL_MINUTES * 60 * 1000;
	let running = false;

	async function run() {
		if (running) return;
		running = true;

		try {
			const summary = await service.sendPendingReminders();
			if (summary.matchesChecked > 0 || summary.emailsSent > 0) {
				console.log(
					`[Bolão API] Lembretes: ${summary.matchesChecked} jogo(s), ${summary.emailsSent} e-mail(s) enviado(s), ${summary.emailsSkipped} ignorado(s).`,
				);
			}
		} catch (error) {
			console.error('[Bolão API] Erro ao processar lembretes por e-mail:', error);
		} finally {
			running = false;
		}
	}

	void run();
	const timer = setInterval(() => void run(), intervalMs);
	timer.unref?.();
}

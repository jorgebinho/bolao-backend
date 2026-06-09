import 'dotenv/config';

import { Mailer } from '../src/shared/email/mailer.js';
import { prisma } from '../src/shared/database/prisma.js';
import { MatchRemindersRepository } from '../src/modules/match-reminders/repositories/match-reminders.repository.js';
import { MatchRemindersService } from '../src/modules/match-reminders/services/match-reminders.service.js';

function parseNowArgument() {
	const nowArg = process.argv.find((arg) => arg.startsWith('--now='));
	if (!nowArg) return new Date();

	const value = nowArg.slice('--now='.length);
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Data invalida em --now: ${value}`);
	}

	return date;
}

async function main() {
	const now = parseNowArgument();
	const mailer = new Mailer();

	if (!mailer.isConfigured()) {
		throw new Error(
			'SMTP nao configurado. Configure SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM antes de enviar lembretes.',
		);
	}

	const service = new MatchRemindersService(
		new MatchRemindersRepository(),
		mailer,
	);
	const summary = await service.sendPendingReminders(now);

	console.log(
		[
			'Lembretes de palpite processados.',
			`Referencia: ${now.toISOString()}`,
			`Jogos verificados: ${summary.matchesChecked}`,
			`E-mails enviados: ${summary.emailsSent}`,
			`E-mails ignorados: ${summary.emailsSkipped}`,
		].join('\n'),
	);
}

main()
	.catch((error) => {
		console.error('Erro ao enviar lembretes de palpite:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

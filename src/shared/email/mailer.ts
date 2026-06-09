import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { env } from '../config/env.js';

export interface SendEmailInput {
	to: string;
	subject: string;
	text: string;
	html: string;
}

export class Mailer {
	private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null;
	private readonly from: string;
	private warnedMissingConfig = false;

	constructor() {
		this.from = env.SMTP_FROM || env.SMTP_USER || 'Bolão <no-reply@bolao.local>';
		this.transporter = env.SMTP_HOST
			? nodemailer.createTransport({
					host: env.SMTP_HOST,
					port: env.SMTP_PORT,
					secure: env.SMTP_SECURE,
					auth:
						env.SMTP_USER && env.SMTP_PASS
							? { user: env.SMTP_USER, pass: env.SMTP_PASS }
							: undefined,
				})
			: null;
	}

	isConfigured(): boolean {
		return Boolean(this.transporter);
	}

	async send(input: SendEmailInput): Promise<void> {
		if (!this.transporter) {
			if (!this.warnedMissingConfig) {
				console.warn(
					'[Bolão API] SMTP não configurado. Lembretes por e-mail serão ignorados.',
				);
				this.warnedMissingConfig = true;
			}
			return;
		}

		await this.transporter.sendMail({
			from: this.from,
			to: input.to,
			subject: input.subject,
			text: input.text,
			html: input.html,
		});
	}
}

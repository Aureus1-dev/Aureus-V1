import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailService } from './email.service.interface';

/**
 * SMTP-backed transactional email delivery.
 *
 * When SMTP_HOST is configured, mail is sent through a real SMTP transport
 * (works with any SMTP-speaking provider — SES, SendGrid, Postmark, etc.,
 * per ADR-005 §7's "SES/SendGrid" follow-up note — without binding the
 * codebase to a vendor-specific SDK). When it is not configured (local
 * development, CI, this environment), nodemailer's own `jsonTransport` is
 * used instead: the real send path still runs end-to-end, but the message
 * is captured rather than handed to a network socket, and is logged for
 * visibility. This is nodemailer's own supported mechanism for exactly this
 * situation, not a hand-rolled stand-in — see nodemailer's transports docs.
 */
@Injectable()
export class NodemailerEmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transport!: nodemailer.Transporter;
  private fromAddress!: string;
  private frontendUrl!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    this.fromAddress = this.config.get<string>('SMTP_FROM_EMAIL', 'no-reply@aureus.app');
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');

    if (host) {
      this.transport = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASSWORD'),
        },
      });
      this.logger.log(`Email transport: SMTP (${host})`);
    } else {
      this.transport = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn(
        'SMTP_HOST is not configured — emails will be captured locally, not delivered. ' +
          'Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD before deploying to production.',
      );
    }
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Verify your Aureus account',
      text: `Welcome to Aureus. Verify your email address by visiting: ${link}\n\nThis link expires in 48 hours.`,
      html: this.wrapHtml(
        'Verify your email address',
        `Welcome to Aureus. Click the button below to verify your email address.`,
        link,
        'Verify Email',
        'This link expires in 48 hours.',
      ),
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Reset your Aureus password',
      text: `A password reset was requested for your account. Reset it by visiting: ${link}\n\nIf you did not request this, you can safely ignore this email. This link expires in 30 minutes.`,
      html: this.wrapHtml(
        'Reset your password',
        'A password reset was requested for your Aureus account. Click the button below to choose a new password.',
        link,
        'Reset Password',
        'If you did not request this, you can safely ignore this email. This link expires in 30 minutes.',
      ),
    });
  }

  private async send(message: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const info = await this.transport.sendMail({
      from: this.fromAddress,
      ...message,
    });
    this.logger.log(`Email sent to ${message.to} (subject: "${message.subject}", messageId: ${info.messageId})`);
  }

  private wrapHtml(heading: string, intro: string, link: string, cta: string, footnote: string): string {
    return `<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
    <h2>${heading}</h2>
    <p>${intro}</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:4px;">${cta}</a>
    </p>
    <p style="color:#666666;font-size:13px;">${footnote}</p>
    <p style="color:#666666;font-size:13px;">If the button above doesn't work, copy and paste this link into your browser: ${link}</p>
  </body>
</html>`;
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailService } from './email.service.interface';

/**
 * SMTP-backed transactional email delivery.
 *
 * Production validates the configured SMTP transport during API startup so
 * Aureus never waits for a member's registration or password-recovery attempt
 * to discover that the mail provider cannot authenticate. Development/test
 * continue to use nodemailer's jsonTransport when SMTP_HOST is absent.
 */
@Injectable()
export class NodemailerEmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transport!: nodemailer.Transporter;
  private fromAddress!: string;
  private frontendUrl!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    this.fromAddress = this.config.get<string>('SMTP_FROM_EMAIL', 'no-reply@aureus.app');
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');

    if (host) {
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASSWORD');
      this.transport = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        ...(user || pass ? { auth: { user, pass } } : {}),
      });

      // Fail deployment, not a member interaction, when the configured SMTP
      // endpoint or credentials cannot establish a usable transport. This is
      // especially important because registration persists the account before
      // the verification message is delivered.
      await this.transport.verify();
      this.logger.log(`Email transport verified: SMTP (${host})`);
    } else {
      this.transport = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn(
        'SMTP_HOST is not configured — emails will be captured locally, not delivered. ' +
          'Email verification, password-reset delivery, and notification email are unavailable until SMTP is configured.',
      );
    }
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await this.send({
        to,
        subject: 'Verify your Aureus account',
        text: `Welcome to Aureus. Verify your email address by visiting: ${link}\n\nThis link expires in 48 hours.`,
        html: this.wrapHtml(
          'Verify your email address',
          'Welcome to Aureus. Click the button below to verify your email address.',
          link,
          'Verify Email',
          'This link expires in 48 hours.',
        ),
      });
    } catch (error) {
      // Registration/guest-claim has already persisted the account before this
      // call. Throwing here would make the client report that account creation
      // failed even though it succeeded, and a retry would then collide with
      // the now-registered email. Preserve the truthful successful account
      // state and leave the verification token valid for resend/recovery.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Verification email delivery failed for ${to}; the account remains created and the verification token can be resent: ${message}`,
      );
    }
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

  async sendNotification(to: string, subject: string, body: string): Promise<void> {
    await this.send({
      to,
      subject,
      text: body,
      html: `<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
    <p>${body}</p>
  </body>
</html>`,
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

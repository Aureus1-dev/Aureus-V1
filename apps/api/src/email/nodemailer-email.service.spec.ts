import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NodemailerEmailService } from './nodemailer-email.service';

jest.mock('nodemailer');

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-001' });
const mockVerify = jest.fn().mockResolvedValue(true);
const mockCreateTransport = nodemailer.createTransport as jest.Mock;

const makeConfig = (values: Record<string, unknown> = {}): ConfigService =>
  ({
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  }) as unknown as ConfigService;

describe('NodemailerEmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'msg-001' });
    mockVerify.mockResolvedValue(true);
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail, verify: mockVerify });
  });

  describe('transport selection', () => {
    it('uses and verifies a real SMTP transport when SMTP_HOST is configured', async () => {
      const service = new NodemailerEmailService(
        makeConfig({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587, SMTP_USER: 'u', SMTP_PASSWORD: 'p' }),
      );
      await service.onModuleInit();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          auth: { user: 'u', pass: 'p' },
        }),
      );
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it('allows an explicit liveness-only smoke test to skip the external SMTP probe', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const service = new NodemailerEmailService(
        makeConfig({ SMTP_HOST: 'smtp.example.com', SMTP_VERIFY_ON_STARTUP: false }),
      );

      await service.onModuleInit();

      expect(mockVerify).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('explicitly disabled'));
      warnSpy.mockRestore();
    });

    it('propagates SMTP verification failure so deployment fails before members hit broken email', async () => {
      mockVerify.mockRejectedValueOnce(new Error('authentication failed'));
      const service = new NodemailerEmailService(makeConfig({ SMTP_HOST: 'smtp.example.com' }));

      await expect(service.onModuleInit()).rejects.toThrow('authentication failed');
    });

    it('falls back to jsonTransport when SMTP_HOST is not configured', async () => {
      const service = new NodemailerEmailService(makeConfig({}));
      await service.onModuleInit();

      expect(mockCreateTransport).toHaveBeenCalledWith({ jsonTransport: true });
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('warns clearly that email delivery is unavailable when SMTP_HOST is absent', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const service = new NodemailerEmailService(makeConfig({ NODE_ENV: 'development' }));
      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Email verification'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('password-reset'));

      warnSpy.mockRestore();
    });
  });

  describe('sendEmailVerification', () => {
    it('sends a verification email with a link built from the token', async () => {
      const service = new NodemailerEmailService(
        makeConfig({ FRONTEND_URL: 'https://app.aureus.test', SMTP_FROM_EMAIL: 'hello@aureus.test' }),
      );
      await service.onModuleInit();

      await service.sendEmailVerification('alice@example.com', 'plain-token-123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'hello@aureus.test',
          to: 'alice@example.com',
          subject: expect.stringContaining('Verify'),
          text: expect.stringContaining('https://app.aureus.test/verify-email?token=plain-token-123'),
          html: expect.stringContaining('https://app.aureus.test/verify-email?token=plain-token-123'),
        }),
      );
    });

    it('URL-encodes the token in the link', async () => {
      const service = new NodemailerEmailService(makeConfig({ FRONTEND_URL: 'https://app.aureus.test' }));
      await service.onModuleInit();

      await service.sendEmailVerification('alice@example.com', 'a/b+c');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining(encodeURIComponent('a/b+c')) }),
      );
    });

    it('logs delivery failure without turning an already-created account into a failed registration', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      mockSendMail.mockRejectedValueOnce(new Error('temporary smtp failure'));
      const service = new NodemailerEmailService(makeConfig({ FRONTEND_URL: 'https://app.aureus.test' }));
      await service.onModuleInit();

      await expect(service.sendEmailVerification('alice@example.com', 'token')).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('account remains created'));

      errorSpy.mockRestore();
    });
  });

  describe('sendPasswordReset', () => {
    it('sends a password-reset email with a link built from the token', async () => {
      const service = new NodemailerEmailService(makeConfig({ FRONTEND_URL: 'https://app.aureus.test' }));
      await service.onModuleInit();

      await service.sendPasswordReset('alice@example.com', 'reset-token-456');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alice@example.com',
          subject: expect.stringContaining('Reset'),
          text: expect.stringContaining('https://app.aureus.test/reset-password?token=reset-token-456'),
        }),
      );
    });
  });
});
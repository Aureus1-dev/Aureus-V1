import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NodemailerEmailService } from './nodemailer-email.service';

jest.mock('nodemailer');

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-001' });
const mockCreateTransport = nodemailer.createTransport as jest.Mock;

const makeConfig = (values: Record<string, unknown> = {}): ConfigService =>
  ({
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  }) as unknown as ConfigService;

describe('NodemailerEmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  describe('transport selection', () => {
    it('uses a real SMTP transport when SMTP_HOST is configured', () => {
      const service = new NodemailerEmailService(
        makeConfig({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587, SMTP_USER: 'u', SMTP_PASSWORD: 'p' }),
      );
      service.onModuleInit();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'smtp.example.com', port: 587 }),
      );
    });

    it('falls back to jsonTransport when SMTP_HOST is not configured', () => {
      const service = new NodemailerEmailService(makeConfig({}));
      service.onModuleInit();

      expect(mockCreateTransport).toHaveBeenCalledWith({ jsonTransport: true });
    });
  });

  describe('sendEmailVerification', () => {
    it('sends a verification email with a link built from the token', async () => {
      const service = new NodemailerEmailService(
        makeConfig({ FRONTEND_URL: 'https://app.aureus.test', SMTP_FROM_EMAIL: 'hello@aureus.test' }),
      );
      service.onModuleInit();

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
      service.onModuleInit();

      await service.sendEmailVerification('alice@example.com', 'a/b+c');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining(encodeURIComponent('a/b+c')) }),
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('sends a password-reset email with a link built from the token', async () => {
      const service = new NodemailerEmailService(makeConfig({ FRONTEND_URL: 'https://app.aureus.test' }));
      service.onModuleInit();

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

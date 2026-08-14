import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WardConversationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicWardService } from './public-ward.service';

const CONTINUATION_TTL_MS = 15 * 60 * 1000;

type ContinuationPayload = {
  v: 1;
  slug: string;
  conversationId: string;
  tokenHashPrefix: string;
  exp: number;
};

@Injectable()
export class TelephonyContinuityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly wards: PublicWardService,
  ) {}

  async startPhoneContinuity(slug: string, suppliedWebhookSecret: string | undefined) {
    this.requireWebhookSecret(suppliedWebhookSecret);
    const started = await this.wards.startConversation(slug);
    const tokenHashPrefix = this.hash(started.accessToken).slice(0, 24);
    const payload: ContinuationPayload = {
      v: 1,
      slug: slug.toLowerCase().trim(),
      conversationId: started.conversationId,
      tokenHashPrefix,
      exp: Date.now() + CONTINUATION_TTL_MS,
    };
    const continuationToken = this.sign(payload);
    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const continuationUrl = `${frontend.replace(/\/$/, '')}/ward/${encodeURIComponent(payload.slug)}?continue=${encodeURIComponent(continuationToken)}`;

    return {
      conversationId: started.conversationId,
      continuationUrl,
      expiresAt: new Date(payload.exp),
      disclosure:
        'This is Aureus assisting the business. It is not a human. Continue on the private web link if you want to keep going there.',
      recording: {
        enabled: false,
        reason:
          'PF-011 does not enable call recording by default. A provider integration must separately prove jurisdictional configuration and affirmative recording consent before storing audio.',
      },
    };
  }

  async redeem(slug: string, continuationToken: string) {
    const payload = this.verify(continuationToken);
    if (payload.slug !== slug.toLowerCase().trim()) throw new NotFoundException('Continuation not found');
    if (payload.exp <= Date.now()) throw new NotFoundException('Continuation not found');

    const conversation = await this.prisma.db.wardConversation.findFirst({
      where: {
        id: payload.conversationId,
        status: { in: [WardConversationStatus.OPEN, WardConversationStatus.ESCALATION_OFFERED] },
        expiresAt: { gt: new Date() },
        organization: {
          deletedAt: null,
          businessProfile: { is: { publicSlug: payload.slug } },
        },
      },
      select: { id: true, accessTokenHash: true, tokenExpiresAt: true },
    });
    if (!conversation || !conversation.accessTokenHash.startsWith(payload.tokenHashPrefix)) {
      throw new NotFoundException('Continuation not found');
    }

    const freshAccessToken = randomBytes(32).toString('base64url');
    const freshHash = this.hash(freshAccessToken);
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const rotated = await this.prisma.db.wardConversation.updateMany({
      where: {
        id: conversation.id,
        accessTokenHash: conversation.accessTokenHash,
      },
      data: { accessTokenHash: freshHash, tokenExpiresAt, lastActivityAt: new Date() },
    });
    if (rotated.count !== 1) throw new NotFoundException('Continuation not found');

    return {
      conversationId: conversation.id,
      accessToken: freshAccessToken,
      tokenExpiresAt,
      notice:
        'The phone-to-web continuation was redeemed and its prior bearer secret was rotated. Reusing the same continuation link is denied.',
    };
  }

  private requireWebhookSecret(supplied: string | undefined) {
    const expected = this.config.get<string>('TELEPHONY_WEBHOOK_SECRET');
    if (!expected || expected.length < 32) {
      throw new ForbiddenException('Telephony provider integration is not configured');
    }
    if (!supplied) throw new NotFoundException('Route not found');
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new NotFoundException('Route not found');
  }

  private sign(payload: ContinuationPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.signingSecret()).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verify(token: string): ContinuationPayload {
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra) throw new NotFoundException('Continuation not found');
    const expected = createHmac('sha256', this.signingSecret()).update(encoded).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new NotFoundException('Continuation not found');
    try {
      const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ContinuationPayload;
      if (value.v !== 1 || !value.slug || !value.conversationId || !value.tokenHashPrefix || !value.exp) {
        throw new Error('invalid');
      }
      return value;
    } catch {
      throw new NotFoundException('Continuation not found');
    }
  }

  private signingSecret(): string {
    return (
      this.config.get<string>('TELEPHONY_CONTINUATION_SECRET') ??
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      'development-only-continuation-secret-change-me'
    );
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

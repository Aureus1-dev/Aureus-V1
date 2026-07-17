import { Injectable } from '@nestjs/common';
import { ConnectedAccount, ConnectedAccountStatus, ConnectedProviderType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateConnectedAccountInput,
  IConnectedAccountRepository,
  ReconnectConnectedAccountInput,
} from './connected-account.repository.interface';

@Injectable()
export class PrismaConnectedAccountRepository implements IConnectedAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, providerType: ConnectedProviderType): Promise<ConnectedAccount | null> {
    return this.prisma.db.connectedAccount.findUnique({ where: { userId_providerType: { userId, providerType } } });
  }

  async findAllByUser(userId: string): Promise<ConnectedAccount[]> {
    return this.prisma.db.connectedAccount.findMany({ where: { userId } });
  }

  async create(data: CreateConnectedAccountInput): Promise<ConnectedAccount> {
    return this.prisma.db.connectedAccount.create({
      data: {
        userId: data.userId,
        providerType: data.providerType,
        grantedScopes: data.grantedScopes,
        externalAccountRef: data.externalAccountRef,
      },
    });
  }

  async reconnect(id: string, data: ReconnectConnectedAccountInput): Promise<ConnectedAccount> {
    return this.prisma.db.connectedAccount.update({
      where: { id },
      data: {
        status: ConnectedAccountStatus.CONNECTED,
        grantedScopes: data.grantedScopes,
        externalAccountRef: data.externalAccountRef,
        connectedAt: new Date(),
        revokedAt: null,
      },
    });
  }

  async setStatus(id: string, status: ConnectedAccountStatus, revokedAt?: Date): Promise<ConnectedAccount> {
    return this.prisma.db.connectedAccount.update({ where: { id }, data: { status, revokedAt } });
  }
}

import { Injectable } from '@nestjs/common';
import { Announcement, AnnouncementScope, AnnouncementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateAnnouncementInput,
  IAnnouncementRepository,
  ListAnnouncementsQuery,
  PaginatedAnnouncements,
  UpdateAnnouncementInput,
  VisibleAnnouncementsQuery,
} from './announcement.repository.interface';

@Injectable()
export class PrismaAnnouncementRepository implements IAnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAnnouncementInput): Promise<Announcement> {
    return this.prisma.db.announcement.create({ data });
  }

  async findById(id: string): Promise<Announcement | null> {
    return this.prisma.db.announcement.findUnique({ where: { id } });
  }

  async findAll(query: ListAnnouncementsQuery): Promise<PaginatedAnnouncements> {
    const where: Prisma.AnnouncementWhereInput = {
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.announcement.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit,
      }),
      this.prisma.db.announcement.count({ where }),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async findVisibleForUser(query: VisibleAnnouncementsQuery): Promise<PaginatedAnnouncements> {
    const now = new Date();
    const where: Prisma.AnnouncementWhereInput = {
      status: AnnouncementStatus.PUBLISHED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { scope: AnnouncementScope.PLATFORM },
            { scope: AnnouncementScope.ORGANIZATION, organizationId: { in: query.organizationIds } },
            { scope: AnnouncementScope.ROLE, targetRole: { in: query.roles } },
            { scope: AnnouncementScope.STEWARD_MEMBERS, stewardId: { in: query.stewardIds } },
          ],
        },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.db.announcement.findMany({
        where, orderBy: { publishedAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit,
      }),
      this.prisma.db.announcement.count({ where }),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async update(id: string, data: UpdateAnnouncementInput): Promise<Announcement> {
    return this.prisma.db.announcement.update({ where: { id }, data });
  }

  async updateStatus(
    id: string, status: AnnouncementStatus, fields?: { publishedAt?: Date; archivedAt?: Date },
  ): Promise<Announcement> {
    return this.prisma.db.announcement.update({ where: { id }, data: { status, ...fields } });
  }
}

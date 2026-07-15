import { Announcement, AnnouncementScope, AnnouncementStatus, UserRole } from '@prisma/client';

export const ANNOUNCEMENT_REPOSITORY = 'ANNOUNCEMENT_REPOSITORY';

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  scope: AnnouncementScope;
  organizationId?: string;
  targetRole?: UserRole;
  stewardId?: string;
  isCritical?: boolean;
  scheduledFor?: Date;
  expiresAt?: Date;
  authorId: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  isCritical?: boolean;
}

export interface ListAnnouncementsQuery {
  page: number;
  limit: number;
  scope?: AnnouncementScope;
  status?: AnnouncementStatus;
  organizationId?: string;
}

export interface VisibleAnnouncementsQuery {
  page: number;
  limit: number;
  organizationIds: string[];
  roles: UserRole[];
  stewardIds: string[];
}

export interface PaginatedAnnouncements {
  data: Announcement[];
  total: number;
  page: number;
  limit: number;
}

export interface IAnnouncementRepository {
  create(data: CreateAnnouncementInput): Promise<Announcement>;
  findById(id: string): Promise<Announcement | null>;
  findAll(query: ListAnnouncementsQuery): Promise<PaginatedAnnouncements>;
  /** PUBLISHED, non-expired announcements whose audience includes this caller — see ADR-012 Decision 3. */
  findVisibleForUser(query: VisibleAnnouncementsQuery): Promise<PaginatedAnnouncements>;
  update(id: string, data: UpdateAnnouncementInput): Promise<Announcement>;
  updateStatus(
    id: string, status: AnnouncementStatus, fields?: { publishedAt?: Date; archivedAt?: Date },
  ): Promise<Announcement>;
}

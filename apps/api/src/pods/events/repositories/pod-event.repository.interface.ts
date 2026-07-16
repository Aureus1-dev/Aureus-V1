import { PodEvent, PodEventRsvp, PodEventStatus, PodEventType, RsvpResponse } from '@prisma/client';

export const POD_EVENT_REPOSITORY = 'POD_EVENT_REPOSITORY';

export interface CreateEventInput {
  podId: string;
  title: string;
  description?: string;
  type?: PodEventType;
  startsAt: Date;
  endsAt?: Date;
  location?: string;
  createdById: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
  location?: string | null;
  status?: PodEventStatus;
}

export interface EventQueryParams {
  page: number;
  limit: number;
  podId: string;
}

export interface PaginatedEvents {
  data: PodEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface IPodEventRepository {
  create(data: CreateEventInput): Promise<PodEvent>;
  findById(id: string): Promise<PodEvent | null>;
  findForPod(params: EventQueryParams): Promise<PaginatedEvents>;
  countHeldSince(podId: string, since: Date): Promise<number>;
  countByPodAndStatus(podId: string, status: PodEventStatus): Promise<number>;
  update(id: string, data: UpdateEventInput): Promise<PodEvent>;

  upsertRsvp(eventId: string, userId: string, response: RsvpResponse): Promise<PodEventRsvp>;
  setAttendance(eventId: string, userId: string, attended: boolean): Promise<PodEventRsvp>;
  findRsvpsForEvent(eventId: string): Promise<PodEventRsvp[]>;
  countAttendanceForPod(podId: string): Promise<{ total: number; attended: number }>;
}

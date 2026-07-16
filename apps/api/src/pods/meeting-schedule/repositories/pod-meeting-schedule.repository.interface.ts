import { MeetingCadence, PodMeetingSchedule } from '@prisma/client';

export const POD_MEETING_SCHEDULE_REPOSITORY = 'POD_MEETING_SCHEDULE_REPOSITORY';

export interface UpsertScheduleInput {
  podId: string;
  cadence: MeetingCadence;
  dayOfWeek?: number;
  timeOfDay?: string;
  location?: string;
  durationMinutes?: number;
  createdById: string;
}

export interface IPodMeetingScheduleRepository {
  findByPod(podId: string): Promise<PodMeetingSchedule | null>;
  upsert(data: UpsertScheduleInput): Promise<PodMeetingSchedule>;
}

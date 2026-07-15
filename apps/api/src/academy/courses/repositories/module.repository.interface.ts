import { Module as ModuleModel } from '@prisma/client';

export const MODULE_REPOSITORY = 'MODULE_REPOSITORY';

export interface CreateModuleInput {
  courseId: string;
  title: string;
  description?: string;
  position: number;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string | null;
  position?: number;
}

export interface IModuleRepository {
  create(data: CreateModuleInput): Promise<ModuleModel>;
  findById(id: string): Promise<ModuleModel | null>;
  findByCourse(courseId: string): Promise<ModuleModel[]>;
  countByCourse(courseId: string): Promise<number>;
  update(id: string, data: UpdateModuleInput): Promise<ModuleModel>;
  remove(id: string): Promise<void>;
}

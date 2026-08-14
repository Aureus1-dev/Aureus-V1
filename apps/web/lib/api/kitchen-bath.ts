import { apiRequest } from './http';
import type {
  CreatePublicWardHandoff,
  PublicWardHandoff,
} from './public-ward';

export type KitchenBathProjectType =
  | 'KITCHEN'
  | 'BATHROOM'
  | 'KITCHEN_AND_BATH'
  | 'OTHER_REMODELING';
export type KitchenBathDecisionStatus =
  | 'OWNER_DECISION_MAKER'
  | 'OWNER_WITH_OTHER_DECISION_MAKERS'
  | 'AUTHORIZED_REPRESENTATIVE'
  | 'EXPLORING';
export type KitchenBathBudgetRange =
  | 'UNDER_25000'
  | 'FROM_25000_TO_50000'
  | 'FROM_50000_TO_100000'
  | 'FROM_100000_TO_200000'
  | 'OVER_200000'
  | 'UNSURE';

export interface KitchenBathAttachmentReference {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageRef: string;
}

export interface KitchenBathIntake {
  projectType: KitchenBathProjectType;
  rooms: string[];
  scope: string;
  decisionStatus?: KitchenBathDecisionStatus;
  budgetRange?: KitchenBathBudgetRange;
  designNeeds?: string;
  attachments?: KitchenBathAttachmentReference[];
}

export interface KitchenBathPackProfile {
  active: boolean;
  vertical: 'KITCHEN_BATH' | null;
  intakeAvailable: boolean;
  estimationBoundary: string | null;
  attachments: null | {
    optional: true;
    maxItems: number;
    maxBytesEach: number;
    storageMode: 'OPAQUE_REFERENCE';
    note: string;
  };
}

const path = (slug: string) => `/public/wards/${encodeURIComponent(slug)}`;

export function getKitchenBathPack(slug: string): Promise<KitchenBathPackProfile> {
  return apiRequest(`${path(slug)}/kitchen-bath-pack`, { retryOn401: false });
}

export function createKitchenBathHandoff(
  slug: string,
  conversationId: string,
  accessToken: string,
  handoff: CreatePublicWardHandoff & { kitchenBath: KitchenBathIntake },
): Promise<PublicWardHandoff> {
  return apiRequest(
    `${path(slug)}/conversations/${encodeURIComponent(conversationId)}/kitchen-bath-handoff`,
    {
      method: 'POST',
      headers: { 'x-ward-token': accessToken },
      retryOn401: false,
      body: handoff,
    },
  );
}

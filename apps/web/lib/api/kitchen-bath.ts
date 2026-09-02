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
export type KitchenBathPriority =
  | 'LOOK_AND_FEEL'
  | 'FUNCTION_AND_LAYOUT'
  | 'DURABILITY'
  | 'BUDGET_CONTROL'
  | 'TIMING'
  | 'ACCESSIBILITY'
  | 'LOW_MAINTENANCE'
  | 'RESALE_VALUE'
  | 'ENERGY_EFFICIENCY'
  | 'OTHER';

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
  priorities?: KitchenBathPriority[];
  mustHaves?: string;
  concerns?: string;
  attachments?: KitchenBathAttachmentReference[];
}

export type ReadyProjectBarrierStatus =
  | 'CUSTOMER_STATED'
  | 'OPEN'
  | 'EXPERT_REQUIRED'
  | 'BUSINESS_REQUIRED'
  | 'NOT_ASSESSED';

export interface KitchenBathCustomerReadyProject {
  contractVersion: 'or003-ready-project-v1';
  vertical: 'KITCHEN_BATH';
  readinessStatus: 'READY_FOR_EXPERT_REVIEW' | 'INCOMPLETE_SOURCE';
  customerIntent: {
    projectType: string | null;
    rooms: string[];
    scope: string | null;
    priorities: string[];
    mustHaves: string | null;
    concerns: string | null;
  };
  constraints: {
    projectLocation: string | null;
    desiredTiming: string | null;
    decisionStatus: string | null;
    budgetRange: string | null;
    designNeeds: string | null;
    attachments: Array<{
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  };
  source: {
    basis: 'CONSENTED_WARD_HANDOFF';
    modelInferencesIncluded: false;
  };
  expertValidationRequired: string[];
  boundaries: string[];
  missingRequiredSource: string[];
}

export interface KitchenBathReadyProject
  extends KitchenBathCustomerReadyProject {
  leadId: string;
  source: KitchenBathCustomerReadyProject['source'] & {
    consentVersion: string;
    intakeIntegrity: 'SYSTEM_HASH_PRESENT' | 'MISSING';
    conversationTurns: number | null;
    submittedAt: string;
    retentionExpiresAt: string;
  };
  transactionBarriers: Array<{
    key:
      | 'DESIRE'
      | 'FIT'
      | 'PRICE'
      | 'FUNDING'
      | 'AVAILABILITY'
      | 'TIMING'
      | 'KNOWLEDGE_UNCERTAINTY'
      | 'TRUST'
      | 'DECISION_AUTHORITY'
      | 'ADMINISTRATIVE_FRICTION'
      | 'ALTERNATIVES';
    status: ReadyProjectBarrierStatus;
    basis: string;
  }>;
}

export type KitchenBathHandoffResult = PublicWardHandoff & {
  readyProject: KitchenBathCustomerReadyProject | null;
};

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
): Promise<KitchenBathHandoffResult> {
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

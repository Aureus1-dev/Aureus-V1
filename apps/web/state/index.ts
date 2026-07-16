export { AppStateProvider } from './AppStateProvider';
export { SessionProvider, useSession, type SessionState } from './session/SessionContext';
export { InterfaceProvider, useInterfaceState, type InterfaceState } from './interface/InterfaceContext';
export { PreferencesProvider, usePreferences, type PreferencesState } from './preferences/PreferencesContext';
export {
  ConversationProvider,
  useConversation,
  type ConversationError,
  type ConversationErrorKind,
} from './conversation/ConversationContext';
export {
  JourneyProvider,
  useJourney,
  type JourneyError,
  type JourneyErrorKind,
  type FirstMissionDraft,
} from './journey/JourneyContext';
export {
  OpportunitiesProvider,
  useOpportunities,
  type OpportunityError,
  type OpportunityErrorKind,
} from './opportunities/OpportunitiesContext';
export {
  RecommendationsProvider,
  useRecommendations,
  type RecommendationError,
  type RecommendationErrorKind,
} from './recommendations/RecommendationsContext';
export {
  VoiceProvider,
  useVoice,
  type VoiceTurnState,
  type VoiceError,
  type VoiceErrorKind,
  type VoiceTranscriptEntry,
  type PendingToolCall,
} from './voice/VoiceContext';
export {
  NotificationsProvider,
  useNotifications,
  type NotificationsError,
  type NotificationsErrorKind,
} from './notifications/NotificationsContext';
export {
  HighlightRegistryProvider,
  useHighlightRegistry,
  useRegisterHighlightTarget,
  type HighlightTargetDescriptor,
  type RegisteredTargetSummary,
  type UseRegisterHighlightTargetOptions,
  type UseRegisterHighlightTargetResult,
} from './highlight/HighlightRegistryContext';

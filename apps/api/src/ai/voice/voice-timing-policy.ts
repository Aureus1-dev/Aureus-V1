/**
 * Conversation Timing Layer — policy component (Founder instruction:
 * "incorporate a Conversation Timing Layer governing turn-taking, silence,
 * interruption, and response timing... treat timing as a first-class
 * architectural concern, not a frontend animation").
 *
 * Because Founder Decision 1 rules out a backend audio proxy (the client
 * connects directly to the provider over WebRTC), the backend cannot
 * observe raw audio timing frame-by-frame. What it *can* own, and what
 * makes timing backend architecture rather than a client-side tuning knob,
 * is: (1) this policy, injected into every brokered session and never
 * accepted from the client; (2) the durable AiTurnEvent log the client
 * reports into, which the Domain Readiness Report validates against.
 *
 * `eagerness: 'low'` is the deliberate default: AFX-003 §4 instructs Aureus
 * to "avoid responding merely because a brief silence occurred" and §5 to
 * "avoid interrupting" — a low-eagerness semantic VAD biases toward waiting
 * for the member to actually finish a thought rather than firing on the
 * first pause, which is the conversational posture both AFX-002 ("Silence")
 * and AFX-003 §3 ("Listening") describe.
 */
export const VOICE_TIMING_POLICY = {
  mode: 'semantic_vad',
  config: {
    type: 'semantic_vad',
    eagerness: 'low',
    create_response: true,
    interrupt_response: true,
  },
} as const;

/**
 * Fallback for any realtime model that does not support semantic VAD.
 * Deliberately generous silence_duration_ms/prefix_padding_ms for the same
 * "don't mistake a pause for a finished thought" reason as above.
 */
export const VOICE_TIMING_POLICY_FALLBACK = {
  mode: 'server_vad',
  config: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 700,
    create_response: true,
    interrupt_response: true,
  },
} as const;

export type VoiceTimingPolicy = typeof VOICE_TIMING_POLICY | typeof VOICE_TIMING_POLICY_FALLBACK;

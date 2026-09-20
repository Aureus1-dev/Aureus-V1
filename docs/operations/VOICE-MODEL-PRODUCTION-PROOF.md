# Voice model production proof

Production voice is currently validated against `gpt-realtime-2.1`.

The Steward Release Gate proved the deployed path end-to-end with the production API and web origins: guest session creation, live Steward response, voice brokerage, OpenAI Realtime WebRTC ready state, explicit voice end, and return to the same text session.

Operational rule: keep `VOICE_MODEL`, the in-code fallback, `.env.example`, and voice pricing coverage aligned with the model proven by the release gate. A model name appearing in provider documentation is not sufficient by itself; the production project/key must also have access.

Current published `gpt-realtime-2.1` token pricing used by the cost ledger is $4/M text input, $24/M text output, $32/M audio input, $64/M audio output, and $0.40/M cached text/audio input.

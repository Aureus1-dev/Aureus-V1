import { RealtimeEventMapper } from './realtime-event-mapper';

describe('RealtimeEventMapper', () => {
  it('maps member speech start/stop directly, without inferring a finished turn', () => {
    const mapper = new RealtimeEventMapper(() => new Date('2026-01-01T00:00:00.000Z'));

    expect(mapper.map({ type: 'input_audio_buffer.speech_started' })).toEqual([
      { kind: 'member-speech-started', occurredAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(mapper.map({ type: 'input_audio_buffer.speech_stopped' })).toEqual([
      { kind: 'member-speech-stopped', occurredAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('maps a finalized member transcript to member-turn-finalized, never from speech-stopped alone', () => {
    const mapper = new RealtimeEventMapper(() => new Date('2026-01-01T00:00:00.000Z'));
    mapper.map({ type: 'input_audio_buffer.speech_stopped' });

    const result = mapper.map({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'What is a Journey?',
    });

    expect(result).toEqual([
      { kind: 'member-turn-finalized', itemId: 'item-1', transcript: 'What is a Journey?', occurredAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('assembles a streamed steward transcript from deltas and emits it on response.done', () => {
    const mapper = new RealtimeEventMapper(() => new Date('2026-01-01T00:00:00.000Z'));

    expect(mapper.map({ type: 'response.created', response: { id: 'resp-1' } })).toEqual([
      { kind: 'steward-response-started', responseId: 'resp-1', occurredAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(mapper.map({ type: 'response.audio_transcript.delta', response_id: 'resp-1', delta: 'A Jour' })).toEqual([
      { kind: 'steward-transcript-delta', responseId: 'resp-1', delta: 'A Jour' },
    ]);
    expect(mapper.map({ type: 'response.audio_transcript.delta', response_id: 'resp-1', delta: 'ney tracks progress.' })).toEqual([
      { kind: 'steward-transcript-delta', responseId: 'resp-1', delta: 'ney tracks progress.' },
    ]);

    const done = mapper.map({
      type: 'response.done',
      response: { id: 'resp-1', status: 'completed', output: [{ id: 'item-2' }] },
    });

    expect(done).toEqual([
      {
        kind: 'steward-response-completed',
        responseId: 'resp-1',
        itemId: 'item-2',
        transcript: 'A Journey tracks progress.',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('reports a barge-in as steward-response-interrupted, not completed, when status is cancelled', () => {
    const mapper = new RealtimeEventMapper(() => new Date('2026-01-01T00:00:00.000Z'));
    mapper.map({ type: 'response.created', response: { id: 'resp-2' } });
    mapper.map({ type: 'response.audio_transcript.delta', response_id: 'resp-2', delta: 'Here is what I fou' });

    const done = mapper.map({
      type: 'response.done',
      response: { id: 'resp-2', status: 'cancelled', output: [{ id: 'item-3' }] },
    });

    expect(done).toEqual([
      {
        kind: 'steward-response-interrupted',
        responseId: 'resp-2',
        itemId: 'item-3',
        transcript: 'Here is what I fou',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('treats an incomplete status the same as cancelled (interrupted, not completed)', () => {
    const mapper = new RealtimeEventMapper(() => new Date('2026-01-01T00:00:00.000Z'));
    mapper.map({ type: 'response.created', response: { id: 'resp-3' } });

    const done = mapper.map({ type: 'response.done', response: { id: 'resp-3', status: 'incomplete', output: [] } });

    expect(done[0]?.kind).toBe('steward-response-interrupted');
  });

  it('forgets a response transcript once resolved, so a stale delta cannot leak into the next response', () => {
    const mapper = new RealtimeEventMapper(() => new Date('2026-01-01T00:00:00.000Z'));
    mapper.map({ type: 'response.created', response: { id: 'resp-1' } });
    mapper.map({ type: 'response.audio_transcript.delta', response_id: 'resp-1', delta: 'First response.' });
    mapper.map({ type: 'response.done', response: { id: 'resp-1', status: 'completed', output: [] } });

    mapper.map({ type: 'response.created', response: { id: 'resp-2' } });
    const done = mapper.map({ type: 'response.done', response: { id: 'resp-2', status: 'completed', output: [] } });

    expect(done).toEqual([
      { kind: 'steward-response-completed', responseId: 'resp-2', itemId: null, transcript: '', occurredAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('maps a provider error event', () => {
    const mapper = new RealtimeEventMapper();
    const result = mapper.map({ type: 'error', error: { message: 'rate limited' } });
    expect(result).toEqual([{ kind: 'provider-error', message: 'rate limited' }]);
  });

  it('ignores unrecognized event types rather than throwing', () => {
    const mapper = new RealtimeEventMapper();
    expect(mapper.map({ type: 'session.created' })).toEqual([]);
    expect(() => mapper.map({ type: 'something.unknown' })).not.toThrow();
  });

  it('ignores response.done with no response id', () => {
    const mapper = new RealtimeEventMapper();
    expect(mapper.map({ type: 'response.done', response: {} })).toEqual([]);
  });
});

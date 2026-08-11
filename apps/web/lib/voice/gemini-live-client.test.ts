import { downsampleToPcm16, mergeTranscript } from './gemini-live-client';

describe('GeminiLiveClient audio and transcript boundaries', () => {
  it('does not duplicate cumulative transcription updates', () => {
    expect(mergeTranscript('I need help', 'I need help with rent')).toBe('I need help with rent');
    expect(mergeTranscript('I need help ', 'with rent')).toBe('I need help with rent');
  });

  it('downsamples browser float audio to bounded 16-bit PCM', () => {
    const input = new Float32Array([1, 0.5, 0, -0.5, -1, 2, -2, 0]);
    const result = downsampleToPcm16(input, 32_000, 16_000);
    expect(Array.from(result)).toEqual([32767, 0, -32768, -32768]);
  });
});

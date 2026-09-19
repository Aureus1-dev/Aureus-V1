import { detectCarryBoundarySignal, detectUrgentSignal } from './signals';

describe('detectCarryBoundarySignal', () => {
  it.each([
    'I need housing',
    'I need a job',
    'I lost my job and fear losing my housing',
    'help me find a place to live',
    'What assistance programs exist for utilities?',
    'I want to plan a move',
  ])('returns null for a bare goal statement: %s', (text) => {
    expect(detectCarryBoundarySignal(text)).toBeNull();
  });

  it('recognizes an explicit request to continue the work later', () => {
    expect(detectCarryBoundarySignal('Keep working on this and remind me tomorrow')?.id).toBe(
      'continue-later',
    );
  });

  it('recognizes an explicit reminder/monitoring request', () => {
    expect(detectCarryBoundarySignal('Remind me tomorrow about this')?.id).toBe('monitoring');
    expect(detectCarryBoundarySignal('Watch for updates and notify me')?.id).toBe('monitoring');
  });

  it('recognizes an explicit request to remember or track a deadline', () => {
    expect(detectCarryBoundarySignal('Remember this for next time')?.id).toBe('reminder');
    expect(detectCarryBoundarySignal('Please track this deadline for me')?.id).toBe('reminder');
  });

  it('recognizes a request to save documents or connect an account', () => {
    expect(detectCarryBoundarySignal('Save these documents for me')?.id).toBe('documents');
    expect(detectCarryBoundarySignal('Can you connect my calendar?')?.id).toBe('connected-account');
  });

  it('every reason carries a plain-language why', () => {
    const reason = detectCarryBoundarySignal('carry this forward for me');
    expect(reason?.why).toEqual(expect.any(String));
    expect(reason?.why.length).toBeGreaterThan(0);
  });
});

describe('detectUrgentSignal', () => {
  it('does not treat an ordinary hardship description as urgent', () => {
    expect(detectUrgentSignal('I fell behind on my utility bills after losing hours at work')).toBe(
      false,
    );
  });

  it('recognizes an explicit safety/emergency signal', () => {
    expect(detectUrgentSignal('This is an emergency, I am in immediate danger')).toBe(true);
    expect(detectUrgentSignal('I am not safe right now')).toBe(true);
  });
});

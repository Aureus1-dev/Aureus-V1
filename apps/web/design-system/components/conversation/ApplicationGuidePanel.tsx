'use client';

import { useEffect, useRef, useState } from 'react';
import {
  analyzeGuidedApplicationFrame,
  endGuidedApplicationSession,
  setGuidedApplicationConsent,
  type GuidedApplicationAnalysisDto,
  type GuidedApplicationSessionDto,
} from '../../../lib/api/application-guide';
import {
  completePeopleApplicationHelp,
  pausePeopleApplicationHelp,
  type PeopleResponsibilityDto,
} from '../../../lib/api/people-help';
import { Button } from '../Button/Button';
import styles from './ApplicationGuidePanel.module.css';

const MAX_ENCODED_FRAME_LENGTH = 80_000;
const SCREEN_CONSENT_WINDOW_MS = 30 * 60 * 1000;
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

interface CapturedFrame {
  mediaType: 'image/jpeg';
  imageBase64: string;
}

export interface ApplicationGuidePanelProps {
  accessToken: string;
  session: GuidedApplicationSessionDto;
  responsibility: PeopleResponsibilityDto | null;
  onSessionChange: (session: GuidedApplicationSessionDto) => void;
  onResponsibilityChange: (responsibility: PeopleResponsibilityDto | null) => void;
  onEnded: () => void;
}

function hasActiveConsent(
  session: GuidedApplicationSessionDto,
  nowMs: number,
): boolean {
  if (
    !session.screenCaptureConsentGrantedAt ||
    session.screenCaptureConsentRevokedAt
  ) {
    return false;
  }
  const grantedAt = new Date(session.screenCaptureConsentGrantedAt).getTime();
  return Number.isFinite(grantedAt) && nowMs - grantedAt <= SCREEN_CONSENT_WINDOW_MS;
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function jpegDataUrlToFrame(dataUrl: string): CapturedFrame {
  const prefix = 'data:image/jpeg;base64,';
  if (!dataUrl.startsWith(prefix)) {
    throw new Error('The browser could not create a safe screen frame.');
  }
  const imageBase64 = dataUrl.slice(prefix.length);
  if (imageBase64.length > MAX_ENCODED_FRAME_LENGTH) {
    throw new Error(
      'This screen is too detailed to share safely. Zoom in on the form section and try again.',
    );
  }
  return { mediaType: 'image/jpeg', imageBase64 };
}

function drawCompressedFrame(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): CapturedFrame {
  if (!sourceWidth || !sourceHeight) {
    throw new Error('The shared screen is not ready yet.');
  }

  const attempts = [
    { maxWidth: 960, quality: 0.62 },
    { maxWidth: 820, quality: 0.48 },
    { maxWidth: 700, quality: 0.36 },
  ];

  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.maxWidth / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Screen capture is unavailable in this browser.');
    context.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', attempt.quality);
    if (dataUrl.length - 'data:image/jpeg;base64,'.length <= MAX_ENCODED_FRAME_LENGTH) {
      return jpegDataUrlToFrame(dataUrl);
    }
  }

  throw new Error(
    'This screen is too detailed to share safely. Zoom in on the form section and try again.',
  );
}

async function captureStreamFrame(stream: MediaStream): Promise<CapturedFrame> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('The shared screen did not become ready.')),
      5000,
    );
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      void video.play().then(() => resolve()).catch(reject);
    };
  });

  try {
    return drawCompressedFrame(video, video.videoWidth, video.videoHeight);
  } finally {
    video.pause();
    video.srcObject = null;
  }
}

async function captureUploadedImage(file: File): Promise<CapturedFrame> {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP screenshot.');
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The screenshot could not be read.'));
      image.src = objectUrl;
    });
    return drawCompressedFrame(
      image,
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ApplicationGuidePanel({
  accessToken,
  session,
  responsibility,
  onSessionChange,
  onResponsibilityChange,
  onEnded,
}: ApplicationGuidePanelProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const revocationInFlightRef = useRef(false);
  const [consentClock, setConsentClock] = useState(() => Date.now());
  const [analysis, setAnalysis] = useState<GuidedApplicationAnalysisDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentActive = hasActiveConsent(session, consentClock);
  const displayCaptureSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setAnalysis(null);
    setError(null);
  }, [session.id]);

  useEffect(() => {
    setConsentClock(Date.now());
    if (!session.screenCaptureConsentGrantedAt || session.screenCaptureConsentRevokedAt) {
      return;
    }
    const expiresAt =
      new Date(session.screenCaptureConsentGrantedAt).getTime() +
      SCREEN_CONSENT_WINDOW_MS;
    const delay = Math.max(0, expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setConsentClock(Date.now());
      stopStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
    }, delay + 50);
    return () => window.clearTimeout(timer);
  }, [
    session.screenCaptureConsentGrantedAt,
    session.screenCaptureConsentRevokedAt,
  ]);

  useEffect(
    () => () => {
      stopStream(streamRef.current);
    },
    [],
  );

  async function changeConsent(granted: boolean) {
    setBusy(true);
    setError(null);
    if (!granted) {
      revocationInFlightRef.current = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
    }
    try {
      const updated = await setGuidedApplicationConsent(
        accessToken,
        session.id,
        granted,
      );
      onSessionChange(updated);
    } catch {
      setError('Aureus could not update screen-sharing consent. No new frame was sent.');
    } finally {
      if (!granted) revocationInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function revokeAfterShareStops() {
    if (revocationInFlightRef.current) return;
    revocationInFlightRef.current = true;
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    try {
      const updated = await setGuidedApplicationConsent(
        accessToken,
        session.id,
        false,
      );
      onSessionChange(updated);
    } catch {
      // The browser has already stopped the local capture. The backend also
      // expires consent after 30 minutes, so a stale grant cannot authorize a
      // later frame indefinitely.
    } finally {
      revocationInFlightRef.current = false;
    }
  }

  async function startScreenShare() {
    if (!consentActive || !navigator.mediaDevices?.getDisplayMedia) return;
    setBusy(true);
    setError(null);
    try {
      const nextStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      stopStream(streamRef.current);
      streamRef.current = nextStream;
      setStream(nextStream);
      const [track] = nextStream.getVideoTracks();
      if (track) {
        track.addEventListener('ended', () => {
          void revokeAfterShareStops();
        }, { once: true });
      }
    } catch {
      setError('Screen sharing was not started. Nothing was sent to Aureus.');
    } finally {
      setBusy(false);
    }
  }

  async function analyzeFrame(frame: CapturedFrame) {
    if (!consentActive) {
      setError('Turn on screen guidance consent before sharing a frame.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeGuidedApplicationFrame(
        accessToken,
        session.id,
        frame,
      );
      setAnalysis(result);
    } catch {
      setError('Aureus could not safely analyze this frame. Nothing was saved as a screenshot.');
    } finally {
      setBusy(false);
    }
  }

  async function guideCurrentScreen() {
    if (!streamRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const frame = await captureStreamFrame(streamRef.current);
      const result = await analyzeGuidedApplicationFrame(
        accessToken,
        session.id,
        frame,
      );
      setAnalysis(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Aureus could not safely analyze this frame.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function guideScreenshot(file: File | null) {
    if (!file || !consentActive) return;
    setBusy(true);
    setError(null);
    try {
      const frame = await captureUploadedImage(file);
      await analyzeFrame(frame);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Aureus could not safely analyze this screenshot.',
      );
      setBusy(false);
    }
  }

  async function endGuide() {
    setBusy(true);
    setError(null);
    revocationInFlightRef.current = true;
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    try {
      if (responsibility) {
        const paused = await pausePeopleApplicationHelp(accessToken, session.id);
        onResponsibilityChange(paused.responsibility);
      } else {
        await endGuidedApplicationSession(accessToken, session.id);
      }
      onEnded();
    } catch {
      setError(
        'The local share is stopped, but Aureus could not finish pausing this guidance session.',
      );
    } finally {
      revocationInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function recordOutcome(outcome: 'APPLIED' | 'NOT_INTERESTED') {
    if (!responsibility) return;
    setBusy(true);
    setError(null);
    revocationInFlightRef.current = true;
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    try {
      const completed = await completePeopleApplicationHelp(
        accessToken,
        session.id,
        outcome,
      );
      onResponsibilityChange(completed.responsibility);
      onEnded();
    } catch {
      setError(
        'Aureus could not record that outcome. Nothing will be marked complete until the server accepts your explicit update.',
      );
    } finally {
      revocationInFlightRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-label="Application guidance">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>See → Guide</p>
          <h2 className={styles.title}>{session.opportunityTitle}</h2>
          <p className={styles.provider}>{session.provider}</p>
        </div>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void endGuide()}>
          {responsibility ? 'Pause for now' : 'End guide'}
        </Button>
      </div>

      <p className={styles.boundary}>
        Aureus can explain the screen you choose to share. It cannot click,
        type, autofill, accept terms, or submit this application for you.
      </p>

      <a
        className={styles.applicationLink}
        href={session.applicationUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open verified application
      </a>

      {responsibility ? (
        <div className={styles.outcomeActions}>
          <p className={styles.outcomeNote}>
            When it is true, tell Aureus what you did. This is recorded as
            reported by you — not as third-party approval or award.
          </p>
          <div className={styles.outcomeButtons}>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void recordOutcome('APPLIED')}
            >
              I submitted / applied
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void recordOutcome('NOT_INTERESTED')}
            >
              I&apos;m not continuing
            </Button>
          </div>
        </div>
      ) : null}

      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={consentActive}
          disabled={busy}
          onChange={(event) => void changeConsent(event.target.checked)}
        />
        <span>
          I choose to share application screen images for guidance. I understand
          each frame is sent to Aureus&apos;s current AI provider for analysis
          and Aureus does not store the screenshot image. This consent expires
          after 30 minutes and I can revoke it sooner.
        </span>
      </label>

      <p className={styles.sensitive}>
        Before every frame, hide any filled password, SSN, bank/card number,
        PIN, security code, identity-document number, signature, or completed
        legal attestation. Enter those yourself.
      </p>

      {consentActive ? (
        <div className={styles.captureActions}>
          {displayCaptureSupported ? (
            stream ? (
              <>
                <Button type="button" disabled={busy} onClick={() => void guideCurrentScreen()}>
                  Guide this screen
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void revokeAfterShareStops()}>
                  Stop sharing
                </Button>
              </>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void startScreenShare()}>
                Choose a screen to share
              </Button>
            )
          ) : (
            <p className={styles.fallback}>
              Live screen sharing is not available in this browser. You can
              still share a screenshot one frame at a time.
            </p>
          )}

          <label className={styles.fileAction}>
            <span>Share a screenshot instead</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                void guideScreenshot(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {analysis ? (
        <div className={styles.analysis}>
          <p className={styles.summary}>{analysis.pageSummary}</p>
          <p><strong>Next:</strong> {analysis.nextStep}</p>

          {analysis.fields.length ? (
            <ul className={styles.fields}>
              {analysis.fields.map((field, index) => (
                <li key={`${field.label}-${index}`} className={styles.field}>
                  <strong>{field.label}</strong>
                  <span>{field.guidance}</span>
                  {field.sensitivity === 'MEMBER_CONTROL' ? (
                    <span className={styles.memberControl}>Member-controlled field</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {analysis.warnings.length ? (
            <ul className={styles.warnings}>
              {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : null}

          <p className={styles.ephemeral}>Screenshot stored by Aureus: no.</p>
        </div>
      ) : null}
    </section>
  );
}

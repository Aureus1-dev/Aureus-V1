import type { RawRealtimeEvent } from './realtime-event-mapper';

const REALTIME_API_URL = 'https://api.openai.com/v1/realtime/calls';
const ICE_GATHERING_TIMEOUT_MS = 5_000;

export interface VoiceWebRtcClientCallbacks {
  onRemoteTrack: (stream: MediaStream) => void;
  onDataChannelMessage: (raw: RawRealtimeEvent) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

async function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      pc.onicegatheringstatechange = null;
      resolve();
    };
    const timeout = setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
  });
}

/**
 * Direct browser-to-provider WebRTC connection (Founder Decision 1: no
 * backend audio proxy). The backend's `clientSecret` (from
 * `startVoiceSession`) is the only credential this class ever sees — it
 * never touches the permanent provider API key. Microphone access begins
 * only inside `connect()`, which callers must only invoke after explicit
 * member action (a "Start voice conversation" press) — never on mount,
 * never automatically.
 */
export class VoiceWebRtcClient {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;

  constructor(private readonly callbacks: VoiceWebRtcClientCallbacks) {}

  async connect(clientSecret: string, _model: string): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const pc = new RTCPeerConnection();
    this.pc = pc;

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange(pc.connectionState);
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.callbacks.onRemoteTrack(stream);
      }
    };

    for (const track of this.micStream.getAudioTracks()) {
      pc.addTrack(track, this.micStream);
    }

    const dataChannel = pc.createDataChannel('oai-events');
    this.dataChannel = dataChannel;
    dataChannel.onmessage = (event) => {
      try {
        this.callbacks.onDataChannelMessage(JSON.parse(event.data) as RawRealtimeEvent);
      } catch {
        // Malformed event from the provider — drop it rather than crash the session.
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // The Realtime create-call endpoint is the one-shot signaling exchange
    // for this direct browser connection. On mobile browsers, ICE candidates
    // may arrive after setLocalDescription(), so give gathering a bounded
    // chance to finish before sending the SDP that OpenAI will use to reach
    // this peer. If gathering exceeds the bound, proceed with the best local
    // description available rather than leaving the member stuck forever.
    await waitForIceGatheringComplete(pc);
    const localSdp = pc.localDescription?.sdp ?? offer.sdp;
    if (!localSdp) {
      throw new Error('Unable to create the voice connection offer.');
    }

    // Current OpenAI Realtime create-call API accepts the SDP as a multipart
    // `sdp` field. Do not set Content-Type manually: the browser must add the
    // multipart boundary. The short-lived client secret remains the only
    // credential exposed to the browser.
    const formData = new FormData();
    formData.append('sdp', localSdp);

    const response = await fetch(REALTIME_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to establish the voice connection (provider status ${response.status}).`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  setMuted(muted: boolean): void {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  /**
   * The accessible, explicit alternative to voice barge-in — a member who
   * cannot reliably speak over the steward (or who simply prefers a
   * button) can still interrupt. Natural barge-in (speaking while the
   * steward is speaking) is handled by the provider itself via the
   * backend-mandated `interrupt_response: true` timing policy and needs
   * no client-sent event.
   */
  interrupt(): void {
    this.sendEvent({ type: 'response.cancel' });
  }

  sendEvent(event: Record<string, unknown>): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(event));
    }
  }

  disconnect(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;
    this.pc?.close();
    this.pc = null;
  }
}

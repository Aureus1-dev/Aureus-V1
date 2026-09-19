import type { RawRealtimeEvent } from './realtime-event-mapper';

const REALTIME_API_URL = 'https://api.openai.com/v1/realtime/calls';
const SIGNALING_TIMEOUT_MS = 20_000;
const CONNECTION_READY_TIMEOUT_MS = 30_000;
const CONNECTION_READY_POLL_MS = 50;

export interface VoiceWebRtcClientCallbacks {
  onRemoteTrack: (stream: MediaStream) => void;
  onDataChannelMessage: (raw: RawRealtimeEvent) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

async function waitForConnectionReady(
  pc: RTCPeerConnection,
  dataChannel: RTCDataChannel,
): Promise<void> {
  const deadline = Date.now() + CONNECTION_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      throw new Error(
        `Voice WebRTC failed before ready (peer=${pc.connectionState}, data=${dataChannel.readyState}).`,
      );
    }

    // An open Realtime data channel is direct proof that ICE, DTLS, and SCTP
    // connectivity are usable. Some mobile Chromium/WebView builds can lag in
    // updating RTCPeerConnection.connectionState even after the data channel
    // is functional, so do not turn that aggregate browser state into a false
    // member-visible failure.
    if (dataChannel.readyState === 'open') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, CONNECTION_READY_POLL_MS));
  }

  throw new Error(
    `Voice WebRTC readiness timed out (peer=${pc.connectionState}, data=${dataChannel.readyState}).`,
  );
}

export class VoiceWebRtcClient {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;

  constructor(private readonly callbacks: VoiceWebRtcClientCallbacks) {}

  async connect(clientSecret: string, _model: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Voice microphone capture is not supported in this browser.');
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const pc = new RTCPeerConnection();
    this.pc = pc;

    pc.onconnectionstatechange = () => {
      // Browser events can already be queued when a failed attempt is torn
      // down. Only the peer connection this client still owns may report
      // state, so a delayed event from the superseded attempt is inert.
      if (this.pc !== pc) return;
      this.callbacks.onConnectionStateChange(pc.connectionState);
    };

    pc.ontrack = (event) => {
      if (this.pc !== pc) return;
      const [stream] = event.streams;
      if (stream) this.callbacks.onRemoteTrack(stream);
    };

    for (const track of this.micStream.getAudioTracks()) {
      pc.addTrack(track, this.micStream);
    }

    const dataChannel = pc.createDataChannel('oai-events');
    this.dataChannel = dataChannel;
    dataChannel.onmessage = (event) => {
      if (this.dataChannel !== dataChannel) return;
      try {
        this.callbacks.onDataChannelMessage(JSON.parse(event.data) as RawRealtimeEvent);
      } catch {
        // Malformed provider events must never crash a live session.
      }
    };

    // Follow OpenAI's browser WebRTC sequence exactly: create the offer, set
    // it locally, then POST the original offer SDP directly. Do not add an
    // extra ICE-gathering wait or substitute pc.localDescription.sdp; the
    // provider's documented browser flow deliberately starts signaling here.
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const offerSdp = offer.sdp;
    if (!offerSdp) throw new Error('Unable to create the voice connection offer.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SIGNALING_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(REALTIME_API_URL, {
        method: 'POST',
        body: offerSdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Voice signaling timed out before OpenAI returned an SDP answer.');
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Voice signaling request failed before an SDP answer was received: ${detail}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(
        `Unable to establish the voice connection (provider status ${response.status}).`,
      );
    }

    const answerSdp = await response.text();
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Voice SDP answer could not be applied: ${detail}`);
    }

    // setRemoteDescription() only proves signaling succeeded. Wait until the
    // Realtime data channel is actually usable before telling the member that
    // Aureus is listening.
    await waitForConnectionReady(pc, dataChannel);
  }

  setMuted(muted: boolean): void {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  interrupt(): void {
    this.sendEvent({ type: 'response.cancel' });
  }

  sendEvent(event: Record<string, unknown>): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(event));
    }
  }

  disconnect(): void {
    const dataChannel = this.dataChannel;
    this.dataChannel = null;
    if (dataChannel) {
      dataChannel.onmessage = null;
      dataChannel.close();
    }

    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;

    const pc = this.pc;
    this.pc = null;
    if (pc) {
      pc.onconnectionstatechange = null;
      pc.ontrack = null;
      pc.close();
    }
  }
}

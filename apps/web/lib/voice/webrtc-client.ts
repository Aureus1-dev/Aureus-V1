import type { RawRealtimeEvent } from './realtime-event-mapper';

const REALTIME_API_URL = 'https://api.openai.com/v1/realtime/calls';
const ICE_GATHERING_TIMEOUT_MS = 15_000;
const SIGNALING_TIMEOUT_MS = 20_000;
const CONNECTION_READY_TIMEOUT_MS = 15_000;
const CONNECTION_READY_POLL_MS = 50;

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
    if (pc.connectionState === 'connected' && dataChannel.readyState === 'open') {
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

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);

    const localSdp = pc.localDescription?.sdp ?? offer.sdp;
    if (!localSdp) throw new Error('Unable to create the voice connection offer.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SIGNALING_TIMEOUT_MS);
    let response: Response;
    try {
      // Follow OpenAI's browser WebRTC contract exactly: the ephemeral key is
      // used directly by the browser and the SDP offer is the raw request body.
      // The REST endpoint also supports multipart requests, but raw
      // application/sdp is the documented browser path and avoids an extra
      // multipart serialization layer on mobile browsers/custom tabs.
      response = await fetch(REALTIME_API_URL, {
        method: 'POST',
        body: localSdp,
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

    // setRemoteDescription() only proves signaling succeeded. A member must
    // not be told Aureus is listening until ICE/DTLS is actually connected
    // and the Realtime data channel is open. This closes the false-success
    // window observed in the Founder mobile walkthrough, where the UI could
    // switch to Listening and immediately fall into "connection interrupted."
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
      pc.onicegatheringstatechange = null;
      pc.close();
    }
  }
}

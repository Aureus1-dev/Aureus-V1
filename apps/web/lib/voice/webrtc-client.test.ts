import { VoiceWebRtcClient } from './webrtc-client';

class FakeDataChannel {
  readyState: RTCDataChannelState = 'open';
  onmessage: ((event: MessageEvent) => void) | null = null;
  sentMessages: string[] = [];
  send(data: string) {
    this.sentMessages.push(data);
  }
  close() {
    this.readyState = 'closed';
  }
}

class FakeRTCPeerConnection {
  static instances: FakeRTCPeerConnection[] = [];
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  onicegatheringstatechange: (() => void) | null = null;
  connectionState: RTCPeerConnectionState = 'new';
  iceGatheringState: RTCIceGatheringState = 'complete';
  localDescription: RTCSessionDescription | null = null;
  dataChannel: FakeDataChannel | null = null;
  addedTracks: MediaStreamTrack[] = [];
  closed = false;

  constructor() {
    FakeRTCPeerConnection.instances.push(this);
  }

  addTrack(track: MediaStreamTrack) {
    this.addedTracks.push(track);
  }

  createDataChannel() {
    this.dataChannel = new FakeDataChannel();
    return this.dataChannel;
  }

  async createOffer() {
    return { type: 'offer' as const, sdp: 'fake-offer-sdp' };
  }

  async setLocalDescription(description: RTCSessionDescriptionInit) {
    this.localDescription = { type: description.type, sdp: `${description.sdp}-with-ice` } as RTCSessionDescription;
  }
  async setRemoteDescription() {}

  close() {
    this.closed = true;
  }
}

function makeFakeTrack(): MediaStreamTrack {
  return { enabled: true, stop: jest.fn() } as unknown as MediaStreamTrack;
}

function makeFakeStream(tracks: MediaStreamTrack[]): MediaStream {
  return { getAudioTracks: () => tracks, getTracks: () => tracks } as unknown as MediaStream;
}

describe('VoiceWebRtcClient', () => {
  let micTrack: MediaStreamTrack;
  let getUserMediaMock: jest.Mock;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    FakeRTCPeerConnection.instances = [];
    micTrack = makeFakeTrack();
    getUserMediaMock = jest.fn().mockResolvedValue(makeFakeStream([micTrack]));

    Object.defineProperty(global, 'RTCPeerConnection', { value: FakeRTCPeerConnection, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: getUserMediaMock }, configurable: true });

    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201, text: async () => 'fake-answer-sdp' });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function makeClient() {
    return new VoiceWebRtcClient({
      onRemoteTrack: jest.fn(),
      onDataChannelMessage: jest.fn(),
      onConnectionStateChange: jest.fn(),
    });
  }

  it('requests the microphone only when connect() is called, never on construction', () => {
    makeClient();
    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('uses the gathered local SDP as an application/sdp multipart part with only the ephemeral client secret', async () => {
    const client = makeClient();
    await client.connect('ephemeral-secret-abc', 'gpt-realtime');

    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true });
    const pc = FakeRTCPeerConnection.instances[0];
    expect(pc.addedTracks).toContain(micTrack);
    expect(pc.dataChannel).not.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/realtime/calls');
    expect(url).not.toContain('?model=');
    expect(init.headers.Authorization).toBe('Bearer ephemeral-secret-abc');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);

    const sdpPart = (init.body as FormData).get('sdp');
    expect(sdpPart).toBeInstanceOf(Blob);
    expect((sdpPart as Blob).type).toBe('application/sdp');
    expect(await (sdpPart as Blob).text()).toBe('fake-offer-sdp-with-ice');
  });

  it('throws with provider status when the provider rejects the offer', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => '' });
    const client = makeClient();
    await expect(client.connect('secret', 'model')).rejects.toThrow('provider status 400');
  });

  it('forwards parsed data-channel events to onDataChannelMessage', async () => {
    const onDataChannelMessage = jest.fn();
    const client = new VoiceWebRtcClient({ onRemoteTrack: jest.fn(), onDataChannelMessage, onConnectionStateChange: jest.fn() });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    pc.dataChannel?.onmessage?.({ data: JSON.stringify({ type: 'response.created', response: { id: 'r1' } }) } as MessageEvent);

    expect(onDataChannelMessage).toHaveBeenCalledWith({ type: 'response.created', response: { id: 'r1' } });
  });

  it('drops a malformed data-channel message instead of throwing', async () => {
    const onDataChannelMessage = jest.fn();
    const client = new VoiceWebRtcClient({ onRemoteTrack: jest.fn(), onDataChannelMessage, onConnectionStateChange: jest.fn() });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    expect(() => pc.dataChannel?.onmessage?.({ data: 'not json' } as MessageEvent)).not.toThrow();
    expect(onDataChannelMessage).not.toHaveBeenCalled();
  });

  it('forwards the remote audio stream', async () => {
    const onRemoteTrack = jest.fn();
    const client = new VoiceWebRtcClient({ onRemoteTrack, onDataChannelMessage: jest.fn(), onConnectionStateChange: jest.fn() });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    const remoteStream = makeFakeStream([]);
    pc.ontrack?.({ streams: [remoteStream] });

    expect(onRemoteTrack).toHaveBeenCalledWith(remoteStream);
  });

  it('reports connection state changes', async () => {
    const onConnectionStateChange = jest.fn();
    const client = new VoiceWebRtcClient({ onRemoteTrack: jest.fn(), onDataChannelMessage: jest.fn(), onConnectionStateChange });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    pc.connectionState = 'failed';
    pc.onconnectionstatechange?.();

    expect(onConnectionStateChange).toHaveBeenCalledWith('failed');
  });

  it('mutes and unmutes by disabling the mic track, not by tearing down the connection', async () => {
    const client = makeClient();
    await client.connect('secret', 'model');
    client.setMuted(true);
    expect(micTrack.enabled).toBe(false);
    client.setMuted(false);
    expect(micTrack.enabled).toBe(true);
  });

  it('interrupt() sends response.cancel over the open data channel', async () => {
    const client = makeClient();
    await client.connect('secret', 'model');
    const pc = FakeRTCPeerConnection.instances[0];
    client.interrupt();
    expect(pc.dataChannel?.sentMessages).toEqual([JSON.stringify({ type: 'response.cancel' })]);
  });

  it('does not send when the data channel is not open', async () => {
    const client = makeClient();
    await client.connect('secret', 'model');
    const pc = FakeRTCPeerConnection.instances[0];
    pc.dataChannel!.readyState = 'connecting';
    client.interrupt();
    expect(pc.dataChannel?.sentMessages).toEqual([]);
  });

  it('disconnect() stops mic tracks, closes the data channel, and closes the peer connection', async () => {
    const client = makeClient();
    await client.connect('secret', 'model');
    const pc = FakeRTCPeerConnection.instances[0];
    client.disconnect();
    expect(micTrack.stop).toHaveBeenCalled();
    expect(pc.dataChannel?.readyState).toBe('closed');
    expect(pc.closed).toBe(true);
  });
});

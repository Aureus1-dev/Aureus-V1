import { VoiceWebRtcClient } from './webrtc-client';

class FakeDataChannel {
  readyState: RTCDataChannelState = 'connecting';
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
  static autoConnect = true;
  static autoOpenDataChannel = true;
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  connectionState: RTCPeerConnectionState = 'new';
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
    this.localDescription = {
      type: description.type,
      sdp: `${description.sdp}-browser-local-description`,
    } as RTCSessionDescription;
  }

  async setRemoteDescription() {
    if (FakeRTCPeerConnection.autoOpenDataChannel && this.dataChannel) {
      this.dataChannel.readyState = 'open';
    }
    if (FakeRTCPeerConnection.autoConnect) {
      this.connectionState = 'connected';
      this.onconnectionstatechange?.();
    }
  }

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
    FakeRTCPeerConnection.autoConnect = true;
    FakeRTCPeerConnection.autoOpenDataChannel = true;
    micTrack = makeFakeTrack();
    getUserMediaMock = jest.fn().mockResolvedValue(makeFakeStream([micTrack]));

    Object.defineProperty(global, 'RTCPeerConnection', {
      value: FakeRTCPeerConnection,
      configurable: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      configurable: true,
    });

    fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 201, text: async () => 'fake-answer-sdp' });
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

  it('posts the original offer SDP exactly as the documented browser flow', async () => {
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
    expect(init.headers['Content-Type']).toBe('application/sdp');
    expect(init.body).toBe('fake-offer-sdp');
    expect(init.body).not.toBe(pc.localDescription?.sdp);
    expect(init.body).not.toBeInstanceOf(FormData);
  });

  it('fails clearly when the browser cannot provide microphone capture', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });

    const client = makeClient();
    await expect(client.connect('secret', 'model')).rejects.toThrow(
      'Voice microphone capture is not supported in this browser.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats an open Realtime data channel as ready even if aggregate peer state lags', async () => {
    FakeRTCPeerConnection.autoConnect = false;
    const client = makeClient();

    await expect(client.connect('secret', 'model')).resolves.toBeUndefined();

    const pc = FakeRTCPeerConnection.instances[0];
    expect(pc.connectionState).toBe('new');
    expect(pc.dataChannel?.readyState).toBe('open');
  });

  it('does not resolve until the Realtime data channel is actually open', async () => {
    FakeRTCPeerConnection.autoConnect = false;
    FakeRTCPeerConnection.autoOpenDataChannel = false;
    const client = makeClient();
    let resolved = false;
    const connecting = client.connect('secret', 'model').then(() => {
      resolved = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(resolved).toBe(false);

    const pc = FakeRTCPeerConnection.instances[0];
    pc.dataChannel!.readyState = 'open';
    await connecting;
    expect(resolved).toBe(true);
  });

  it('throws with provider status when the provider rejects the offer', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => '' });
    const client = makeClient();
    await expect(client.connect('secret', 'model')).rejects.toThrow('provider status 400');
  });

  it('reports signaling fetch failures with the failing stage', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const client = makeClient();
    await expect(client.connect('secret', 'model')).rejects.toThrow(
      'Voice signaling request failed before an SDP answer was received: Failed to fetch',
    );
  });

  it('forwards parsed data-channel events to onDataChannelMessage', async () => {
    const onDataChannelMessage = jest.fn();
    const client = new VoiceWebRtcClient({
      onRemoteTrack: jest.fn(),
      onDataChannelMessage,
      onConnectionStateChange: jest.fn(),
    });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    pc.dataChannel?.onmessage?.({
      data: JSON.stringify({ type: 'response.created', response: { id: 'r1' } }),
    } as MessageEvent);

    expect(onDataChannelMessage).toHaveBeenCalledWith({
      type: 'response.created',
      response: { id: 'r1' },
    });
  });

  it('drops a malformed data-channel message instead of throwing', async () => {
    const onDataChannelMessage = jest.fn();
    const client = new VoiceWebRtcClient({
      onRemoteTrack: jest.fn(),
      onDataChannelMessage,
      onConnectionStateChange: jest.fn(),
    });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    expect(() => pc.dataChannel?.onmessage?.({ data: 'not json' } as MessageEvent)).not.toThrow();
    expect(onDataChannelMessage).not.toHaveBeenCalled();
  });

  it('forwards the remote audio stream', async () => {
    const onRemoteTrack = jest.fn();
    const client = new VoiceWebRtcClient({
      onRemoteTrack,
      onDataChannelMessage: jest.fn(),
      onConnectionStateChange: jest.fn(),
    });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    const remoteStream = makeFakeStream([]);
    pc.ontrack?.({ streams: [remoteStream] });

    expect(onRemoteTrack).toHaveBeenCalledWith(remoteStream);
  });

  it('reports connection state changes', async () => {
    const onConnectionStateChange = jest.fn();
    const client = new VoiceWebRtcClient({
      onRemoteTrack: jest.fn(),
      onDataChannelMessage: jest.fn(),
      onConnectionStateChange,
    });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    pc.connectionState = 'failed';
    pc.onconnectionstatechange?.();

    expect(onConnectionStateChange).toHaveBeenCalledWith('failed');
  });

  it('ignores a delayed connection event from a peer that was already disconnected', async () => {
    const onConnectionStateChange = jest.fn();
    const client = new VoiceWebRtcClient({
      onRemoteTrack: jest.fn(),
      onDataChannelMessage: jest.fn(),
      onConnectionStateChange,
    });
    await client.connect('secret', 'model');

    const pc = FakeRTCPeerConnection.instances[0];
    const delayedConnectionHandler = pc.onconnectionstatechange;
    onConnectionStateChange.mockClear();

    client.disconnect();
    pc.connectionState = 'failed';
    delayedConnectionHandler?.();

    expect(onConnectionStateChange).not.toHaveBeenCalled();
    expect(pc.onconnectionstatechange).toBeNull();
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

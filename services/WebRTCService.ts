export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private ws: WebSocket | null = null;
  private roomId: string;
  private role: 'PC_PLAYER' | 'MOBILE_CONTROLLER';
  private onMessageCallback: ((data: any) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private signalingServerUrl: string;

  constructor(roomId: string, signalingServerUrl: string = 'ws://localhost:8000/ws') {
    this.roomId = roomId;
    this.signalingServerUrl = signalingServerUrl;
    this.role = roomId.includes('PC') ? 'PC_PLAYER' : 'MOBILE_CONTROLLER';
  }

  setRole(role: 'PC_PLAYER' | 'MOBILE_CONTROLLER') {
    this.role = role;
  }

  async initialize(isHost: boolean): Promise<void> {
    const peerConnectionConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(peerConnectionConfig);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ICE_CANDIDATE',
          payload: { candidate: event.candidate }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state:', state);
      if (state === 'connected') {
        this.onConnectedCallback?.();
      } else if (state === 'disconnected' || state === 'failed') {
        console.warn('Peer connection lost');
      }
    };

    if (isHost) {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }

    await this.connectToSignalingServer();
  }

  private async connectToSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.signalingServerUrl);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          type: 'JOIN',
          roomId: this.roomId,
          role: this.role
        }));
      };

      this.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await this.handleSignalingMessage(message);
      };

      this.ws.onclose = () => {
        console.warn('WebSocket closed');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    const { type, payload } = message;

    switch (type) {
      case 'JOINED':
        console.log('Joined room:', payload.roomId, 'as', payload.role);
        if (!this.peerConnection) {
          await this.initialize(this.role === 'PC_PLAYER');
        }
        break;

      case 'READY':
        if (this.role === 'PC_PLAYER') {
          await this.createOffer();
        }
        break;

      case 'OFFER':
        await this.handleOffer(payload);
        break;

      case 'ANSWER':
        await this.handleAnswer(payload);
        break;

      case 'ICE_CANDIDATE':
        await this.addIceCandidate(payload.candidate);
        break;

      case 'FRET_UPDATE':
      case 'STRUM_EVENT':
        this.onMessageCallback?.(message);
        break;

      case 'PEER_DISCONNECTED':
        console.warn('Peer disconnected');
        this.dataChannel?.close();
        break;

      case 'ERROR':
        console.error('Server error:', payload.message);
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.sendSignalingMessage({
      type: 'OFFER',
      payload: { sdp: offer }
    });
  }

  private async handleOffer(payload: any): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'ANSWER',
      payload: { sdp: answer }
    });
  }

  private async handleAnswer(payload: any): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  }

  private async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onmessage = (event) => {
      this.onMessageCallback?.(event.data);
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  private sendSignalingMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not ready');
    }
  }

  onMessage(callback: (data: any) => void) {
    this.onMessageCallback = callback;
  }

  onConnected(callback: () => void) {
    this.onConnectedCallback = callback;
  }

  send(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    } else {
      console.error('Data channel not ready');
    }
  }

  disconnect() {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.ws?.close();
  }
}

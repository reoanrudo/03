
import React, { useState, useEffect, useCallback } from 'react';
import { AppRole } from './types';
import Lobby from './components/Lobby';
import PCPlayer from './components/PCPlayer';
import MobileController from './components/MobileController';
import { WebRTCService } from './services/WebRTCService';

const App: React.FC = () => {
  const [role, setRole] = useState<AppRole>(AppRole.LOBBY);
  const [roomId, setRoomId] = useState<string>('');
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Generate a simple room ID if needed or read from URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.length === 4) {
      setRoomId(hash.toUpperCase());
    }
  }, []);

  const handleRoleSelect = useCallback(async (selectedRole: AppRole, id: string) => {
    setRole(selectedRole);
    setRoomId(id.toUpperCase());

    const signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8000/ws';
    const service = new WebRTCService(id.toUpperCase(), signalingServerUrl);
    service.setRole(selectedRole === AppRole.PC_PLAYER ? 'PC_PLAYER' : 'MOBILE_CONTROLLER');
    setWebrtc(service);

    service.onConnected(() => setConnected(true));
    await service.initialize(selectedRole === AppRole.PC_PLAYER);
  }, []);

  const handleDisconnect = useCallback(() => {
    webrtc?.disconnect();
    setRole(AppRole.LOBBY);
    setConnected(false);
    setWebrtc(null);
  }, [webrtc]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {role === AppRole.LOBBY && (
        <Lobby onSelect={handleRoleSelect} initialRoomId={roomId} />
      )}

      {role === AppRole.PC_PLAYER && webrtc && (
        <PCPlayer 
          webrtc={webrtc} 
          roomId={roomId} 
          connected={connected} 
          onExit={handleDisconnect} 
        />
      )}

      {role === AppRole.MOBILE_CONTROLLER && webrtc && (
        <MobileController 
          webrtc={webrtc} 
          roomId={roomId} 
          connected={connected} 
          onExit={handleDisconnect} 
        />
      )}
    </div>
  );
};

export default App;

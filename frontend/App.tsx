
import React, { useState, useEffect, useCallback } from 'react';
import { AppRole } from './types';
import Lobby from './components/Lobby';
import PCPlayer from './components/PCPlayer';
import MobileController from './components/MobileController';
import SongSelector from './components/SongSelector';
import { WebRTCService } from './services/WebRTCService';
import { Song } from './services/SongData';

const App: React.FC = () => {
  const [role, setRole] = useState<AppRole>(AppRole.LOBBY);
  const [roomId, setRoomId] = useState<string>('');
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongSelector, setShowSongSelector] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.length === 4) {
      setRoomId(hash.toUpperCase());
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      console.log('[App] Hash changed:', hash, 'Current role:', role);
      
      if (hash && hash.length === 4) {
        setRoomId(hash.toUpperCase());
        
        if (role === AppRole.LOBBY && hash.length === 4) {
          console.log('[App] Auto-transitioning to MOBILE_CONTROLLER mode');
          const signalingServerUrl = (import.meta as any).env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8000/ws';
          const service = new WebRTCService(hash.toUpperCase(), signalingServerUrl);
          service.setRole('MOBILE_CONTROLLER');
          setWebrtc(service);
          
          service.onConnected(() => setConnected(true));
          service.initialize(false);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [role]);

  const handleRoleSelect = useCallback(async (selectedRole: AppRole, id: string) => {
    if (selectedRole === AppRole.PC_PLAYER) {
      setShowSongSelector(true);
      setRoomId(id.toUpperCase());
    } else {
      setRole(selectedRole);
      setRoomId(id.toUpperCase());

      const signalingServerUrl = (import.meta as any).env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8000/ws';
      const service = new WebRTCService(id.toUpperCase(), signalingServerUrl);
      service.setRole('MOBILE_CONTROLLER');
      setWebrtc(service);

      service.onConnected(() => setConnected(true));
      await service.initialize(false);
    }
  }, []);

  const handleSongSelect = useCallback(async (song: Song) => {
    setSelectedSong(song);
    setShowSongSelector(false);
    setRole(AppRole.PC_PLAYER);

    const signalingServerUrl = (import.meta as any).env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8000/ws';
    const service = new WebRTCService(roomId.toUpperCase(), signalingServerUrl);
    service.setRole('PC_PLAYER');
    setWebrtc(service);

    service.onConnected(() => setConnected(true));
    await service.initialize(true);
  }, [roomId]);

  const handleDisconnect = useCallback(() => {
    webrtc?.disconnect();
    setRole(AppRole.LOBBY);
    setConnected(false);
    setWebrtc(null);
    setSelectedSong(null);
    setShowSongSelector(false);
  }, [webrtc]);

  const handleBackToSelector = useCallback(() => {
    setShowSongSelector(true);
    setRole(AppRole.LOBBY);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {role === AppRole.LOBBY && !showSongSelector && (
        <Lobby onSelect={handleRoleSelect} initialRoomId={roomId} />
      )}

      {showSongSelector && (
        <SongSelector onSelect={handleSongSelect} />
      )}

      {role === AppRole.PC_PLAYER && webrtc && selectedSong && (
        <PCPlayer
          webrtc={webrtc}
          roomId={roomId}
          connected={connected}
          onExit={handleDisconnect}
          currentSong={selectedSong}
        />
      )}

      {role === AppRole.PC_PLAYER && webrtc && !selectedSong && (
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

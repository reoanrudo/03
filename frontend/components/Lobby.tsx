
import React, { useState } from 'react';
import { AppRole } from '../types';

interface LobbyProps {
  onSelect: (role: AppRole, roomId: string) => void;
  initialRoomId?: string;
}

const Lobby: React.FC<LobbyProps> = ({ onSelect, initialRoomId }) => {
  const [id, setId] = useState(initialRoomId || '');

  const generateId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePCSession = () => {
    const newId = id || generateId();
    onSelect(AppRole.PC_PLAYER, newId);
  };

  const handleMobileSession = () => {
    if (id.length === 4) {
      onSelect(AppRole.MOBILE_CONTROLLER, id);
    } else {
      alert('Please enter a 4-character Room ID first!');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400 mb-2 italic">
          AIR GUITAR PRO
        </h1>
        <p className="text-slate-400">The Ultimate Two-Device Rock Simulator</p>
      </div>

      <div className="w-full bg-slate-900/50 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Room Code</label>
          <input 
            type="text" 
            maxLength={4}
            placeholder="ABCD"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-center focus:border-orange-500 focus:outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={handlePCSession}
            className="group relative bg-white text-slate-950 px-6 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            <i className="fa-solid fa-desktop mr-2"></i> PC MODE (Right Hand)
          </button>

          <button 
            onClick={handleMobileSession}
            className="bg-slate-800 border-2 border-slate-700 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-mobile-screen mr-2"></i> MOBILE MODE (Left Hand)
          </button>
        </div>
      </div>

      <div className="text-slate-500 text-sm text-center px-4 leading-relaxed">
        <p>Pro Tip: Open this app on your PC as <b>PC Mode</b> and on your phone as <b>Mobile Mode</b> using the same room code.</p>
      </div>
    </div>
  );
};

export default Lobby;

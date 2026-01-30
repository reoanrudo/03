
import React, { useState, useEffect } from 'react';
import { AppRole } from '../types';
import QRCode from 'react-qr-code';
import { WebRTCService, RoomInfo } from '../services/WebRTCService';

interface LobbyProps {
  onSelect: (role: AppRole, roomId: string, accessToken?: string) => void;
  initialRoomId?: string;
}

const Lobby: React.FC<LobbyProps> = ({ onSelect, initialRoomId }) => {
  const [id, setId] = useState(initialRoomId || '');
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id.length >= 4 && id.length <= 8) {
      setShowQR(true);
    } else {
      setShowQR(false);
    }
  }, [id]);

  /**
   * 安全なルームIDを生成（暗号論的に強い）
   */
  const generateSecureId = (): string => {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    // Base32風のエンコード（紛れのない文字のみ）
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  };

  /**
   * ルームIDをサニタイズ（英数字のみ、大文字、最大8文字）
   */
  const sanitizeRoomId = (roomId: string): string => {
    return roomId.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);
  };

  const handlePCSession = async () => {
    setIsLoading(true);
    setError('');

    try {
      const sanitizedId = sanitizeRoomId(id);
      const finalRoomId = sanitizedId || generateSecureId();

      // バックエンドAPIでルームを作成し、アクセストークンを取得
      const webrtc = new WebRTCService(finalRoomId);
      const roomInfo: RoomInfo = await webrtc.createRoom(finalRoomId);

      setId(finalRoomId);
      onSelect(AppRole.PC_PLAYER, finalRoomId, roomInfo.access_token);
    } catch (e) {
      console.error('Failed to create room:', e);
      setError('ルームの作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMobileSession = () => {
    const sanitizedId = sanitizeRoomId(id);

    if (sanitizedId.length < 4 || sanitizedId.length > 8) {
      setError('ルームIDは4〜8文字の英数字で入力してください');
      return;
    }

    setError('');
    onSelect(AppRole.MOBILE_CONTROLLER, sanitizedId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // 入力時にサニタイズ
    const sanitized = sanitizeRoomId(value);
    setId(sanitized);
    setError('');
  };

  const isRender = typeof window !== 'undefined' && window.location.hostname.includes('render.com');
  const roomUrl = isRender
    ? `https://air-guitar-pro-frontend.onrender.com/#${id}`
    : `/#${id}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-md mx-auto overflow-y-auto">
      <div className="text-center">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400 mb-2 italic">
          AIR GUITAR PRO
        </h1>
        <p className="text-slate-400">The Ultimate Two-Device Rock Simulator</p>
      </div>

      <div className="w-full bg-slate-900/50 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6 pb-safe">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
            Room Code (4-8文字)
          </label>
          <input
            type="text"
            maxLength={8}
            placeholder="ABCD1234"
            value={id}
            onChange={handleInputChange}
            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-center focus:border-orange-500 focus:outline-none transition-all"
            disabled={isLoading}
          />
          {error && (
            <p className="text-xs font-bold text-red-500 mt-1">{error}</p>
          )}
        </div>

        {showQR && (
          <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-xl relative z-30">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold transition-all z-40"
              aria-label="QRコードを閉じる"
            >
              ×
            </button>
            <div className="text-sm font-bold text-slate-600 mb-2">
              スマホでこの QR コードをスキャンしてください
            </div>
            <div className="bg-white p-2 rounded-lg">
              <QRCode
                value={roomUrl}
                size={200}
                level="M"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
          </div>
        )}

        {!showQR && id.length >= 4 && id.length <= 8 && (
          <button
            onClick={() => setShowQR(true)}
            className="text-xs font-bold text-orange-500 hover:text-orange-400 underline transition-all"
          >
            QR コードを表示
          </button>
        )}

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={handleMobileSession}
            disabled={isLoading}
            className={`mobile-button relative bg-slate-800 border-2 px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
              id.length >= 4 && id.length <= 8 && !showQR ? 'ring-2 ring-offset-2 ring-orange-500 animate-pulse' : 'border-slate-700 text-white'
            }`}
          >
            {id.length >= 4 && id.length <= 8 && !showQR && (
              <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                <span className="text-xs font-bold text-orange-400">QRコード読み込み中...</span>
              </div>
            )}
            <i className="fa-solid fa-mobile-screen mr-2"></i> MOBILE MODE (Left Hand)
          </button>

          <button
            onClick={handlePCSession}
            disabled={isLoading}
            className="group relative bg-white text-slate-950 px-6 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>接続中...</span>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <i className="fa-solid fa-desktop mr-2"></i> PC MODE (Right Hand)
              </>
            )}
          </button>
        </div>
      </div>

      <div className="text-slate-500 text-sm text-center px-4 leading-relaxed">
        <p>PC で <b>PC MODE</b>、スマホで <b>MOBILE MODE</b> を選択して同じルーム ID で接続</p>
        <p className="mt-2">または、<b>QR コード</b>をタップして新しいタブで開いてください</p>
      </div>
    </div>
  );
};

export default Lobby;

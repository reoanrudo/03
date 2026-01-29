
import React, { useState, useCallback, useEffect } from 'react';
import { WebRTCService } from '../services/WebRTCService';

interface MobileControllerProps {
  webrtc: WebRTCService;
  roomId: string;
  connected: boolean;
  onExit: () => void;
}

const MobileController: React.FC<MobileControllerProps> = ({ webrtc, roomId, connected, onExit }) => {
  const [fretStates, setFretStates] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const stringNames = ['E', 'A', 'D', 'G', 'B', 'E'];
  const totalFrets = 4;

  // 弦の太さグラデーション（6弦から1弦まで）
  const stringThickness = ['h-[3.5px]', 'h-[3px]', 'h-[2.5px]', 'h-[2px]', 'h-[1.5px]', 'h-[1px]'];
  
  // 弦の色グラデーション（低音は濃い、高音は薄い）
  const stringColors = [
    'bg-slate-700',  // 6弦（低音）
    'bg-slate-600',  // 5弦
    'bg-slate-500',  // 4弦
    'bg-slate-400',  // 3弦
    'bg-slate-300',  // 2弦
    'bg-slate-200',  // 1弦（高音）
  ];

  // バレーコード検出（複数弦が同じフレットを押している）
  const getBarreFrets = (): number[] => {
    const fretCounts: Record<number, number> = {};
    fretStates.forEach(f => {
      if (f > 0) {
        fretCounts[f] = (fretCounts[f] || 0) + 1;
      }
    });
    return Object.entries(fretCounts)
      .filter(([_, count]) => count >= 2)
      .map(([fret]) => parseInt(fret));
  };

  const handleTouch = useCallback((stringIdx: number, fret: number) => {
    // 振動フィードバック (対応ブラウザのみ)
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
    
    setFretStates(prev => {
      const next = [...prev];
      next[stringIdx] = fret;
      return next;
    });
  }, []);

  useEffect(() => {
    // データ送信
    webrtc.send({ type: 'FRET_UPDATE', payload: fretStates });
  }, [fretStates, webrtc]);

  return (
    <div className="flex-1 flex flex-col min-h-screen w-full bg-slate-950 select-none touch-none font-sans">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`}></div>
          <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase opacity-70">
            {connected ? 'LINKED TO PC' : 'LINKING...'}
          </span>
        </div>
        <div className="text-right">
           <div className="text-[8px] font-bold text-slate-500 uppercase">Room Code</div>
           <div className="font-mono text-sm font-black text-orange-500 leading-none">{roomId}</div>
        </div>
        <button onClick={onExit} className="ml-4 p-2 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold border border-white/5">EXIT</button>
      </div>

      {/* Fretboard Area - 縦持ち用（90度回転） */}
      <div className="flex-1 flex flex-col fret-board relative">
        {/* String Names Rail - 上部 */}
        <div className="h-12 flex items-center justify-around bg-black/40 border-b border-white/10 z-20 px-4">
          {stringNames.map((name, i) => (
            <div key={i} className="text-center font-black text-slate-600 text-xs italic w-10">{name}</div>
          ))}
        </div>

        {/* Frets Grid - 横方向 */}
        <div className="flex-1 flex relative bg-[#0f172a]">
          {/* Fret Horizontal Lines - 横線 */}
          {Array.from({ length: totalFrets }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-[3px] bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 shadow-[0_2px_8px_rgba(0,0,0,0.3)] z-10"
              style={{ top: `${(i + 1) * (100 / totalFrets)}%` }}
            />
          ))}

           {/* バレーコード表示（複数弦が同じフレットを押している） */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {getBarreFrets().map(fret => (
              <div
                key={fret}
                className="absolute w-full h-2 bg-orange-400/30"
                style={{ top: `${(fret - 1) * (100 / totalFrets)}%` }}
              >
                <div className="absolute inset-0 h-1 bg-orange-400 rounded-full" />
              </div>
            ))}
          </div>

          {/* Strings and Interaction Layers - 縦方向 */}
          <div className="flex-1 flex py-4 gap-1">
            {stringNames.map((_, sIdx) => (
              <div key={sIdx} className="flex-1 flex relative items-center group">
                {/* The Physical String Visual - 縦線（色と太さグラデーション） */}
                <div
                  className={`absolute h-full top-0 transition-all duration-75 rounded-full ${
                    fretStates[sIdx] > 0
                    ? 'w-[5px] bg-orange-400 shadow-[0_15px_0_rgba(251,146,60,0.8)] string-vibrate'
                    : `${stringThickness[sIdx]} ${stringColors[sIdx]} shadow-inner`
                  }`}
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                />

                {/* Touch Zones - 縦方向 */}
                <div className="flex h-full w-full relative z-20">
                  {/* Open string zone (Top-most) */}
                  <div
                    className={`flex-1 flex items-center justify-center transition-all ${fretStates[sIdx] === 0 ? 'bg-orange-500/10' : ''}`}
                    onTouchStart={() => handleTouch(sIdx, 0)}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${fretStates[sIdx] === 0 ? 'bg-orange-500 border-orange-400 text-white scale-110 shadow-lg' : 'border-slate-800 text-slate-800'}`}>O</div>
                  </div>

                  {/* Fret zones - 横に並ぶ */}
                  {Array.from({ length: totalFrets }).map((_, fIdx) => (
                    <div
                      key={fIdx}
                      className={`flex-1 flex items-center justify-center transition-all active:bg-white/5`}
                      onTouchStart={() => handleTouch(sIdx, fIdx + 1)}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[12px] font-black transition-all ${
                        fretStates[sIdx] === fIdx + 1
                        ? 'bg-orange-500 border-orange-300 text-white scale-125 shadow-[0_20px_0_rgba(249,115,22,0.5)] z-30'
                        : 'border-slate-800/50 bg-slate-900/30 text-slate-700'
                      }`}>
                        {fIdx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Chord Shortcuts */}
      <div className="h-28 bg-slate-900/80 border-t border-white/5 p-4 grid grid-cols-4 gap-3 backdrop-blur-xl">
         <ChordButton label="C" pattern={[0, 1, 0, 2, 3, 0]} current={fretStates} onClick={setFretStates} />
         <ChordButton label="G" pattern={[3, 0, 0, 0, 2, 3]} current={fretStates} onClick={setFretStates} />
         <ChordButton label="D" pattern={[2, 3, 2, 0, 0, 0]} current={fretStates} onClick={setFretStates} />
         <ChordButton label="Am" pattern={[0, 1, 2, 2, 0, 0]} current={fretStates} onClick={setFretStates} />
      </div>

      <div className="bg-orange-600 h-1 w-full opacity-50"></div>
    </div>
  );
};

interface ChordBtnProps {
  label: string;
  pattern: number[];
  current: number[];
  onClick: (p: number[]) => void;
}

const ChordButton: React.FC<ChordBtnProps> = ({ label, pattern, current, onClick }) => {
  const isActive = pattern.every((v, i) => v === current[i]);
  
  // バレーコードを検出（複数弦が同じフレットを押している）
  const fretCounts = pattern.filter(f => f > 0).reduce((acc, f) => {
    acc[f] = (acc[f] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const barreFrets = Object.entries(fretCounts)
    .filter(([_, count]) => count >= 2)
    .map(([fret]) => parseInt(fret));
  
  const handleClick = () => {
    if (window.navigator.vibrate) window.navigator.vibrate([15, 10, 15]);
    onClick(pattern);
  };
  
  return (
    <button 
      className={`relative rounded-2xl border-2 font-black text-lg transition-all active:scale-95 shadow-lg overflow-hidden ${
        isActive 
          ? 'bg-orange-500 border-orange-300 text-white shadow-orange-500/20' 
          : 'bg-slate-800 border-white/5 text-slate-400'
      }`}
      onTouchStart={handleClick}
    >
      {label}
      
      {/* バレーコードの視覚インジケーター */}
      {isActive && barreFrets.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-px px-2 pb-1">
          {barreFrets.map(fret => (
            <div key={fret} className="flex-1 h-1 bg-orange-300/60 rounded-b shadow-[0_2px_2px_rgba(251,146,60,0.3)]" />
          ))}
        </div>
      )}
    </button>
  );
};

export default MobileController;


import React, { useRef, useEffect, useState } from 'react';
import { WebRTCService } from '../services/WebRTCService';
import { AudioEngine } from '../services/AudioEngine';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

interface PCPlayerProps {
  webrtc: WebRTCService;
  roomId: string;
  connected: boolean;
  onExit: () => void;
}

interface Note {
  id: number;
  x: number;
  fret: number;
  hit: boolean;
  missed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const PCPlayer: React.FC<PCPlayerProps> = ({ webrtc, roomId, connected, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [lastRating, setLastRating] = useState<{text: string, color: string} | null>(null);
  
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const fretStatesRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const notesRef = useRef<Note[]>([]);
  const nextNoteId = useRef(0);
  const lastNoteSpawnTime = useRef(0);
  const isAudioStartedRef = useRef(false);
  
  const lastYRef = useRef<number | null>(null);
  const isStrummingRef = useRef<boolean>(false);
  const lastStrumTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number | null>(null);

  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const CANVAS_W = dims.w;
  const CANVAS_H = dims.h;
  const NOTE_SPEED = 16;
  const HIT_ZONE_X = CANVAS_W - 250; 
  const STRUM_VELOCITY_THRESHOLD = 18; // より鋭い動きを要求
  const HIT_WINDOW = 120;

  // ストラム・ゾーンを下方（腰の高さ）に配置
  const STRUM_ZONE = {
    x: CANVAS_W - 650,
    y: CANVAS_H * 0.65, // 画面の下半分
    w: 600,
    h: CANVAS_H * 0.3
  };
  
  // 判定ライン（この線を通過した瞬間にはじく）
  const STRUM_MID_Y = STRUM_ZONE.y + (STRUM_ZONE.h / 2);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
    }
    
    webrtc.onMessage((data) => {
      if (data.type === 'FRET_UPDATE') {
        fretStatesRef.current = data.payload;
      }
    });

    const init = async () => {
      await tf.setBackend('webgl');
      await tf.ready();
      const model = await handpose.load();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, frameRate: { ideal: 60 } }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          if (videoRef.current) {
            await videoRef.current.play();
            gameLoop(model);
          }
        };
      }
      setIsReady(true);
    };

    const spawnNote = () => {
      const now = Date.now();
      if (now - lastNoteSpawnTime.current > 1100) {
        notesRef.current.push({
          id: nextNoteId.current++,
          x: -100,
          fret: [0, 3, 5, 7, 10, 12][Math.floor(Math.random() * 6)],
          hit: false,
          missed: false
        });
        lastNoteSpawnTime.current = now;
      }
    };

    const drawHandMesh = (ctx: CanvasRenderingContext2D, landmarks: number[][], vScale: number, hScale: number, isStrum: boolean) => {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-CANVAS_W, 0);

      ctx.strokeStyle = isStrum ? '#fb923c' : '#0ea5e9';
      ctx.lineWidth = 3;
      ctx.shadowBlur = isStrum ? 30 : 5;
      ctx.shadowColor = ctx.strokeStyle;

      const fingers = [
        [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]
      ];

      fingers.forEach(finger => {
        ctx.beginPath();
        finger.forEach((idx, i) => {
          const x = landmarks[idx][0] * hScale;
          const y = landmarks[idx][1] * vScale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });

      ctx.restore();
    };

    const gameLoop = async (model: handpose.HandPose) => {
      if (!videoRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d', { alpha: false });
      if (!ctx) return;

      // 背景クリア
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ビデオ描画
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, -CANVAS_W, 0, CANVAS_W, CANVAS_H);
      ctx.restore();

      if (isAudioStartedRef.current) spawnNote();

      // --- 1. リズム・トラック ---
      const trackH = 140;
      const trackY = 80;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, trackY, CANVAS_W, trackH);
      
      ctx.strokeStyle = comboRef.current > 5 ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(HIT_ZONE_X, trackY + 15); ctx.lineTo(HIT_ZONE_X, trackY + trackH - 15); ctx.stroke();

      // --- 2. 弦 (左が高く、右が低い。角度反転) ---
      ctx.save();
      const frets = fretStatesRef.current;
      for (let i = 0; i < 6; i++) {
        const yOff = i * 30;
        const active = frets[i] > 0;
        ctx.strokeStyle = active ? '#fb923c' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = active ? 8 : 2;
        ctx.beginPath();
        // ネック（左）側を高く、ボディ（右）側を低く
        ctx.moveTo(0, STRUM_ZONE.y + yOff);
        ctx.lineTo(CANVAS_W, STRUM_ZONE.y + yOff + 140);
        ctx.stroke();
      }
      ctx.restore();

      // --- 3. ハンドトラッキング & ストローク判定 ---
      const predictions = await model.estimateHands(videoRef.current);
      let didStrum = false;
      let strumDir: 'up' | 'down' = 'down';
      const now = Date.now();

      if (predictions.length > 0) {
        const hScale = CANVAS_W / videoRef.current.videoWidth;
        const vScale = CANVAS_H / videoRef.current.videoHeight;

        // 顔の誤検知防止フィルタ: 画面下部50%付近のみを有効とする
        const validHands = predictions.filter(p => {
          const wristY = p.landmarks[0][1] * vScale;
          return wristY > CANVAS_H * 0.45; // 画面中央より上は顔とみなす
        });

        if (validHands.length > 0) {
          // 最も右側（右利き用のストラム手）を選択
          const hand = validHands.reduce((prev, curr) => (prev.landmarks[0][0] < curr.landmarks[0][0]) ? prev : curr);

          // 指先(8, 12, 16)の平均座標
          const avgTipY = (hand.landmarks[8][1] + hand.landmarks[12][1] + hand.landmarks[16][1]) / 3 * vScale;
          const displayHandX = CANVAS_W - (hand.landmarks[0][0] * hScale);

          drawHandMesh(ctx, hand.landmarks, vScale, hScale, isStrummingRef.current);

          // ゾーン内チェック
          if (displayHandX > STRUM_ZONE.x && displayHandX < STRUM_ZONE.x + STRUM_ZONE.w &&
              avgTipY > STRUM_ZONE.y && avgTipY < STRUM_ZONE.y + STRUM_ZONE.h) {
            
            if (lastYRef.current !== null) {
              const vel = avgTipY - lastYRef.current;
              const speed = Math.abs(vel);
              
              // 中央判定線を跨いだ瞬間のみ「ストローク」として認める
              const crossed = (lastYRef.current < STRUM_MID_Y && avgTipY >= STRUM_MID_Y) ||
                              (lastYRef.current > STRUM_MID_Y && avgTipY <= STRUM_MID_Y);

              if (crossed && speed > STRUM_VELOCITY_THRESHOLD) {
                if (now - lastStrumTimeRef.current > 150) {
                  didStrum = true;
                  strumDir = vel > 0 ? 'down' : 'up';
                  lastStrumTimeRef.current = now;
                  isStrummingRef.current = true;
                  for(let k=0; k<15; k++) particlesRef.current.push({
                    x: displayHandX, y: avgTipY,
                    vx: (Math.random()-0.5)*35, vy: (Math.random()-0.5)*35, life: 1, color: '#f97316'
                  });
                }
              }
            }
            lastYRef.current = avgTipY;
          } else {
            lastYRef.current = null;
            isStrummingRef.current = false;
          }
        }
      }

      // --- 4. ノーツ処理 ---
      const notes = notesRef.current;
      const centerY = trackY + (trackH / 2);
      for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        if (!note.hit && !note.missed) {
          note.x += NOTE_SPEED;
          
          if (didStrum) {
            const dist = Math.abs(note.x - HIT_ZONE_X);
            if (dist < HIT_WINDOW) {
              note.hit = true;
              const isPerfect = dist < HIT_WINDOW / 3.5;
              scoreRef.current += (isPerfect ? 1000 : 500);
              comboRef.current += 1;
              setScoreDisplay(scoreRef.current);
              setComboDisplay(comboRef.current);
              setLastRating({ text: isPerfect ? 'PERFECT' : 'GREAT', color: isPerfect ? 'text-yellow-400' : 'text-sky-400' });
              setTimeout(() => setLastRating(null), 500);
              
              if (audioRef.current) audioRef.current.playStrum(fretStatesRef.current, strumDir);
              
              for(let j=0; j<25; j++) particlesRef.current.push({
                x: HIT_ZONE_X, y: centerY,
                vx: (Math.random()-0.5)*50, vy: (Math.random()-0.5)*50, life: 1, color: isPerfect ? '#fbbf24' : '#38bdf8'
              });
            }
          }
          
          if (note.x > HIT_ZONE_X + HIT_WINDOW) {
            note.missed = true;
            comboRef.current = 0;
            setComboDisplay(0);
            setLastRating({ text: 'MISS', color: 'text-red-500 font-black' });
            setTimeout(() => setLastRating(null), 500);
            if (audioRef.current) audioRef.current.playMuted();
          }
        }
        
        if (!note.hit) {
          ctx.save();
          ctx.globalAlpha = note.missed ? 0.2 : 1.0;
          ctx.fillStyle = note.missed ? '#450a0a' : '#f97316';
          ctx.beginPath(); ctx.roundRect(note.x - 55, centerY - 45, 110, 90, 20); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '900 44px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(`F${note.fret}`, note.x, centerY + 18);
          ctx.restore();
        }
      }
      notesRef.current = notes.filter(n => n.x < CANVAS_W + 200 && !n.hit);

      // --- 5. パーティクル ---
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        if (p.life > 0) {
          ctx.save();
          ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 8 * p.life, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      particlesRef.current = ps.filter(p => p.life > 0);

      frameIdRef.current = requestAnimationFrame(() => gameLoop(model));
    };

    init();
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [dims]);

  const handleStart = async () => {
    if (audioRef.current) {
      await audioRef.current.start();
    }
    setIsAudioStarted(true);
    isAudioStartedRef.current = true;
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden select-none">
      <div className="absolute top-10 left-12 z-30 pointer-events-none flex flex-col items-start">
        <span className="text-[10px] font-black text-slate-500 tracking-[0.8em] uppercase mb-1">Score</span>
        <span className="text-8xl font-mono font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          {scoreDisplay.toLocaleString()}
        </span>
      </div>

      <div className="absolute bottom-40 right-14 z-30 pointer-events-none">
        {comboDisplay > 0 && (
          <div className="flex flex-col items-end">
            <span className="text-[14rem] font-black italic text-orange-500 leading-none drop-shadow-[0_0_80px_rgba(249,115,22,0.7)]">
              {comboDisplay}
            </span>
            <span className="text-4xl font-black italic text-white tracking-[0.4em] -mt-10 uppercase">Combo!</span>
          </div>
        )}
      </div>

      <div className="w-full h-full relative flex items-center justify-center">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full h-full object-cover" />

        {lastRating && (
          <div className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[16rem] font-black italic z-40 animate-ping opacity-0 ${lastRating.color}`}>
            {lastRating.text}
          </div>
        )}

        {!isReady && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 border-[8px] border-orange-500 border-t-transparent rounded-full animate-spin mb-8" />
            <p className="font-black text-white tracking-[1.5em] text-2xl italic animate-pulse">SETTING UP STAGE...</p>
          </div>
        )}

        {!isAudioStarted && isReady && (
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl z-40 flex items-center justify-center p-6 text-center">
            <div className="max-w-4xl bg-white/5 p-20 rounded-[100px] border border-white/10 shadow-2xl">
              <h1 className="text-[10rem] font-black italic text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-600 mb-8 tracking-tighter leading-none uppercase">
                Air Guitar<br/>PRO
              </h1>
              <p className="text-slate-400 mb-14 font-bold text-2xl leading-relaxed px-16">
                右側の<span className="text-white italic underline decoration-orange-500 underline-offset-8">腰の高さ</span>で<br/>
                指を鋭く振り抜いて演奏しよう！
              </p>
              <button 
                onClick={handleStart} 
                className="bg-blue-600 text-white px-40 py-12 rounded-full font-black text-5xl italic hover:scale-110 active:scale-95 transition-all shadow-2xl"
              >
                GIG START
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 w-full flex items-center justify-between px-16 z-20">
        <div className="flex items-center gap-8 bg-black/60 px-8 py-4 rounded-full border border-white/10 backdrop-blur-md">
           <div className={`flex items-center gap-4 ${connected ? 'text-green-400' : 'text-red-500 animate-pulse'}`}>
             <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">{connected ? 'Linked' : 'Linking...'}</span>
           </div>
           <div className="text-[10px] font-black text-slate-500 uppercase">Room: {roomId}</div>
        </div>
        
        <button onClick={onExit} className="bg-white/5 hover:bg-red-600 text-white px-10 py-3 rounded-full text-[10px] font-black border border-white/10 transition-all uppercase tracking-widest">Abort</button>
      </div>
    </div>
  );
};

export default PCPlayer;

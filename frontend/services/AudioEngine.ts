
import * as Tone from 'tone';

export class AudioEngine {
  private dist: Tone.Distortion;
  private synth: Tone.PolySynth;
  private strings: string[] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
  private isStarted: boolean = false;
  private mainGain: Tone.Gain;
  private bgmPlayer?: Tone.Player;
  private bgmGain?: Tone.Gain;

  // 練習曲用BGM
  private practiceBGMGain?: Tone.Gain;
  private practiceBassLoop?: Tone.Loop;
  private practiceDrumLoop?: Tone.Loop;

  constructor() {
    this.mainGain = new Tone.Gain(2.0).toDestination();
    this.dist = new Tone.Distortion(0.8).connect(this.mainGain);
    
    const verb = new Tone.Reverb({ decay: 1.5, wet: 0.35 }).connect(this.dist);
    const filter = new Tone.Filter(2500, "lowpass").connect(verb);
    
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.002, // 鋭いピッキング
        decay: 0.2,
        sustain: 0.2,
        release: 1.2
      }
    }).connect(filter);
  }

  async start() {
    if (this.isStarted) return;
    try {
      await Tone.start();
      await Tone.context.resume();
      this.isStarted = true;
      console.log("🎸 Audio Engine: Ready for Rock");
    } catch (e) {
      console.error("Audio Engine failed to start:", e);
    }
  }

  playMuted() {
    if (!this.isStarted) return;
    this.synth.triggerAttackRelease('E1', '32n', Tone.now(), 0.3);
  }

  playStrum(fretStates: number[], direction: 'up' | 'down') {
    if (!this.isStarted) return;
    const now = Tone.now();
    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    indices.forEach((stringIdx, i) => {
      const baseNote = this.strings[stringIdx];
      const fret = fretStates[stringIdx] || 0;
      const note = Tone.Frequency(baseNote).transpose(fret).toNote();
      const strumDelay = i * 0.015; // 指で弾く時間差
      this.synth.triggerAttackRelease(note, '1n', now + strumDelay, 0.85);
    });
  }

  async loadBGM(url: string): Promise<void> {
    if (!this.isStarted) {
      await this.start();
    }

    if (this.bgmPlayer) {
      this.stopBGM();
      this.bgmPlayer.dispose();
    }

    if (this.bgmGain) {
      this.bgmGain.dispose();
    }

    try {
      this.bgmGain = new Tone.Gain(0.4).toDestination();
      this.bgmPlayer = new Tone.Player(url, () => {
        console.log('🎵 BGM loaded:', url);
      }).connect(this.bgmGain);
      await Tone.loaded();
    } catch (e) {
      console.error('BGM load failed:', e);
    }
  }

  playBGM(): void {
    if (this.bgmPlayer) {
      this.bgmPlayer.start(0);
      console.log('🎵 BGM playing');
    }
  }

  stopBGM(): void {
    if (this.bgmPlayer) {
      this.bgmPlayer.stop();
      console.log('🎵 BGM stopped');
    }
  }

  setBGMVolume(volume: number): void {
    if (this.bgmGain) {
      this.bgmGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // 練習曲用BGM（コードに応じたベースライン）
  playPracticeBGM(chord: string, bpm: number): void {
    if (!this.isStarted) return;

    this.stopPracticeBGM();

    // コードに対応するベース音
    const chordBassNotes: Record<string, string> = {
      'C': 'C2',
      'G': 'G2',
      'Am': 'A2',
      'F': 'F2',
      'D': 'D2',
      'E': 'E2',
      'Em': 'E2',
      'A': 'A2',
      'Dm': 'D2'
    };

    const bassNote = chordBassNotes[chord] || 'C2';
    const beatDuration = 60 / bpm;

    // ゲイン設定
    this.practiceBGMGain = new Tone.Gain(0.25).toDestination();

    // ベースシンセ
    const bassSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
        attackCurve: 'exponential'
      }
    }).connect(this.practiceBGMGain);

    // ベースライン（1拍目と3拍目）
    this.practiceBassLoop = new Tone.Loop((time) => {
      bassSynth.triggerAttackRelease(bassNote, '2n', time);
    }, '2n').start(0);

    // メトロノーム（各拍のクリック）
    const drumSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0
      }
    }).connect(this.practiceBGMGain);

    this.practiceDrumLoop = new Tone.Loop((time) => {
      drumSynth.triggerAttackRelease('16n', time);
    }, '4n').start(0);

    Tone.Transport.start();
  }

  stopPracticeBGM(): void {
    if (this.practiceBassLoop) {
      this.practiceBassLoop.dispose();
      this.practiceBassLoop = undefined;
    }
    if (this.practiceDrumLoop) {
      this.practiceDrumLoop.dispose();
      this.practiceDrumLoop = undefined;
    }
    if (this.practiceBGMGain) {
      this.practiceBGMGain.dispose();
      this.practiceBGMGain = undefined;
    }
  }
}

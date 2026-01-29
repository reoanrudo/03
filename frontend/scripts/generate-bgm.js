import * as Tone from 'tone';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, 'public', 'bgm');

async function generateSimpleBGM(chords: string[], bpm: number, duration: number, filename: string) {
  await Tone.start();

  const recorder = new Tone.Recorder();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 1 }
  }).connect(recorder);

  synth.toDestination();
  Tone.Transport.bpm.value = bpm;

  const chordDuration = 60 / bpm * 4;

  chords.forEach((chord, index) => {
    Tone.Transport.scheduleOnce((time) => {
      const notes = getChordNotes(chord);
      synth.triggerAttackRelease(notes, chordDuration, time);
    }, index * chordDuration);
  });

  recorder.start();

  Tone.Transport.start();
  await Tone.Transport.scheduleOnce(async () => {
    await Tone.Transport.stop();
    const recording = await recorder.stop();
    const blob = recording as unknown as Blob;
    const buffer = await blob.arrayBuffer();
    const arrayBuffer = Buffer.from(buffer);

    fs.writeFileSync(path.join(outputDir, filename), arrayBuffer);
    console.log(`Generated ${filename}`);
  }, duration);
}

function getChordNotes(chordName: string): string[] {
  const chordMap = {
    'C': ['C3', 'E3', 'G3'],
    'G': ['G2', 'B2', 'D3'],
    'Am': ['A2', 'C3', 'E3'],
    'F': ['F2', 'A2', 'C3'],
    'Em': ['E2', 'G2', 'B2'],
    'D': ['D2', 'F#2', 'A2'],
    'Dm': ['D2', 'F2', 'A2']
  };

  return chordMap[chordName] || ['C3'];
}

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await generateSimpleBGM(
    ['C', 'G', 'C', 'G', 'F', 'C', 'C', 'C', 'C', 'C', 'G', 'C', 'C', 'C'],
    60,
    28,
    'twinkle.mp3'
  );

  await generateSimpleBGM(
    ['G', 'Em', 'C', 'D', 'G', 'G', 'Em', 'C', 'D', 'G', 'D'],
    72,
    18,
    'amazing-grace.mp3'
  );

  await generateSimpleBGM(
    ['Am', 'G', 'C', 'F', 'G', 'Am', 'Em', 'Dm', 'Am', 'G'],
    95,
    13,
    'folk-medley.mp3'
  );

  console.log('✅ All BGM files generated!');
}

main().catch(console.error);

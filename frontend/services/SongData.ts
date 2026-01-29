import { useState } from 'react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bpm: number;
  chordChart: { timestamp: number; chord: string }[];
  totalChords: number;
  bgmUrl?: string;
}

export interface Progress {
  songId: string;
  bestScore: number;
  clearCount: number;
  lastPlayed: string;
}

export interface ProgressService {
  loadProgress(): Map<string, Progress>;
  saveProgress(progress: Map<string, Progress>): void;
  updateProgress(songId: string, score: number, cleared: boolean): void;
  getProgress(songId: string): Progress | undefined;
  getOverallProgress(): { cleared: number; total: number } | undefined;
}

export interface SongSelectorProps {
  onSelect: (song: Song) => void;
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const DIFFICULTY_VALUE = {
  EASY: {
    bg: 'bg-green-500',
    text: 'text-green-400',
    label: '初級'
  },
  MEDIUM: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-400',
    label: '中級'
  },
  HARD: {
    bg: 'bg-red-500',
    text: 'text-red-400',
    label: '上級'
  }
};

export const DIFFICULTY = DIFFICULTY_VALUE;

export interface ChordDefinition {
  name: string;
  frets: number[];
}

export const CHORDS: ChordDefinition[] = [
  { name: 'C', frets: [0, 1, 0, 2, 3, 0] },
  { name: 'G', frets: [3, 0, 0, 0, 2, 3] },
  { name: 'D', frets: [2, 3, 2, 0, 0, 0] },
  { name: 'Am', frets: [0, 1, 2, 2, 0, 0] },
  { name: 'E', frets: [0, 2, 2, 1, 0, 0] },
  { name: 'A', frets: [0, 0, 2, 2, 2, 0] },
  { name: 'Dm', frets: [2, 3, 2, 0, 1, 0] },
  { name: 'Em', frets: [0, 2, 2, 0, 0, 0] },
  { name: 'F', frets: [1, 3, 3, 2, 1, 1] }
];

export const getCurrentChord = (frets: number[]): string | null => {
  const normalizedFrets = [...frets].sort((a, b) => a - b);
  return CHORDS.find(chord => {
    const chordFrets = [...chord.frets].sort((a, b) => a - b);
    return chordFrets.every((fret, i) => fret === normalizedFrets[i] || fret === 0);
  })?.name || null;
};

export const SONGS: Song[] = [
  {
    id: 'c-practice',
    title: 'Cコード練習（超入門）',
    artist: '練習曲',
    difficulty: 'EASY',
    bpm: 50,
    chordChart: [
      { timestamp: 0, chord: 'C' },
      { timestamp: 2400, chord: 'C' },
      { timestamp: 4800, chord: 'C' },
      { timestamp: 7200, chord: 'C' },
      { timestamp: 9600, chord: 'C' },
      { timestamp: 12000, chord: 'C' },
      { timestamp: 14400, chord: 'C' },
      { timestamp: 16800, chord: 'C' }
    ],
    totalChords: 8
  },
  {
    id: 'c-am-practice',
    title: 'C→Am 練習（入門）',
    artist: '練習曲',
    difficulty: 'EASY',
    bpm: 55,
    chordChart: [
      { timestamp: 0, chord: 'C' },
      { timestamp: 2182, chord: 'C' },
      { timestamp: 4364, chord: 'Am' },
      { timestamp: 6545, chord: 'Am' },
      { timestamp: 8727, chord: 'C' },
      { timestamp: 10909, chord: 'C' },
      { timestamp: 13091, chord: 'Am' },
      { timestamp: 15273, chord: 'Am' }
    ],
    totalChords: 8
  },
  {
    id: 'twinkle-easy',
    title: 'きらきら星（初級）',
    artist: 'Public Domain',
    difficulty: 'EASY',
    bpm: 60,
    bgmUrl: '/bgm/twinkle.mp3',
    chordChart: [
      { timestamp: 0, chord: 'C' },
      { timestamp: 2000, chord: 'G' },
      { timestamp: 4000, chord: 'C' },
      { timestamp: 6000, chord: 'G' },
      { timestamp: 8000, chord: 'F' },
      { timestamp: 10000, chord: 'C' },
      { timestamp: 12000, chord: 'C' },
      { timestamp: 14000, chord: 'C' },
      { timestamp: 16000, chord: 'C' },
      { timestamp: 18000, chord: 'C' },
      { timestamp: 20000, chord: 'G' },
      { timestamp: 22000, chord: 'C' },
      { timestamp: 26000, chord: 'C' },
      { timestamp: 30000, chord: 'C' }
    ],
    totalChords: 13
  },
  {
    id: 'amazing-grace-medium',
    title: 'Amazing Grace（中級）',
    artist: 'Public Domain',
    difficulty: 'MEDIUM',
    bpm: 72,
    bgmUrl: '/bgm/amazing-grace.mp3',
    chordChart: [
      { timestamp: 0, chord: 'G' },
      { timestamp: 1667, chord: 'Em' },
      { timestamp: 3333, chord: 'C' },
      { timestamp: 5000, chord: 'D' },
      { timestamp: 6667, chord: 'G' },
      { timestamp: 8333, chord: 'G' },
      { timestamp: 10000, chord: 'Em' },
      { timestamp: 11667, chord: 'C' },
      { timestamp: 13333, chord: 'D' },
      { timestamp: 15000, chord: 'G' },
      { timestamp: 16667, chord: 'D' }
    ],
    totalChords: 11
  },
  {
    id: 'folk-hard',
    title: 'Folk Medley（上級）',
    artist: 'Public Domain',
    difficulty: 'HARD',
    bpm: 95,
    bgmUrl: '/bgm/folk-medley.mp3',
    chordChart: [
      { timestamp: 0, chord: 'Am' },
      { timestamp: 1263, chord: 'G' },
      { timestamp: 2526, chord: 'C' },
      { timestamp: 3789, chord: 'F' },
      { timestamp: 5053, chord: 'G' },
      { timestamp: 6316, chord: 'Am' },
      { timestamp: 7579, chord: 'Em' },
      { timestamp: 8842, chord: 'Dm' },
      { timestamp: 10105, chord: 'Am' },
      { timestamp: 11368, chord: 'G' }
    ],
    totalChords: 10
  }
];

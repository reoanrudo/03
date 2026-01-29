import { useState } from 'react';

export interface Progress {
  songId: string;
  bestScore: number;
  clearCount: number;
  lastPlayed: string;
}

class ProgressService {
  private STORAGE_KEY = 'air-guitar-progress';
  private cache: Map<string, Progress> | null = null;

  public loadProgress(): Map<string, Progress> {
    if (this.cache) {
      return new Map(this.cache);
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return new Map();
    
    try {
      const data: Progress[] = JSON.parse(stored);
      this.cache = new Map(data.map(p => [p.songId, p]));
      return this.cache;
    } catch {
      console.error('Failed to load progress:', e);
      return new Map();
    }
  }

  public saveProgress(progress: Map<string, Progress>): void {
    try {
      const data = Array.from(progress.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      this.cache = new Map(progress);
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  public updateProgress(songId: string, score: number, cleared: boolean): void {
    const progressMap = this.loadProgress();
    const existing = progressMap.get(songId);

    if (existing) {
      if (score > existing.bestScore) {
        existing.bestScore = score;
      }
      if (cleared) {
        existing.clearCount += 1;
      }
      existing.lastPlayed = new Date().toISOString();
    } else {
      progressMap.set(songId, {
        songId,
        bestScore: score,
        clearCount: cleared ? 1 : 0,
        lastPlayed: new Date().toISOString()
      });
    }

    this.saveProgress(progressMap);
  }

  public getProgress(songId: string): Progress | undefined {
    const progressMap = this.loadProgress();
    return progressMap.get(songId);
  }

  public getOverallProgress(): { cleared: number; total: number } {
    const progressMap = this.loadProgress();
    const cleared = Array.from(progressMap.values()).filter(p => p.clearCount > 0).length;
    return {
      cleared,
      total: progressMap.size
    };
  }
}

export const progressService = new ProgressService();

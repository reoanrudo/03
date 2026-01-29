import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Song, Difficulty, SONGS, DIFFICULTY } from '../services/songData';
import { progressService } from '../services/ProgressService';

interface SongSelectorProps {
  onSelect: (song: Song) => void;
}

const SongSelector: React.FC<SongSelectorProps> = memo(({ onSelect }) => {
  const [progress, setProgress] = useState<Map<string, any>>(new Map());
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'ALL'>('ALL');

  useEffect(() => {
    const loadedProgress = progressService.loadProgress();
    setProgress(loadedProgress);
  }, []);

  const handleFilterChange = useCallback((difficulty: Difficulty | 'ALL') => {
    setSelectedDifficulty(difficulty);
  }, []);

  const handleSongSelect = useCallback((song: Song) => {
    onSelect(song);
  }, [onSelect]);

  const filteredSongs = useMemo(() => {
    return selectedDifficulty === 'ALL'
      ? SONGS
      : SONGS.filter(s => s.difficulty === selectedDifficulty);
  }, [selectedDifficulty]);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-start p-6">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 mb-8">
          AIR GUITAR PRO
        </h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => handleFilterChange('ALL')}
            className={`px-4 py-2 rounded-full font-black text-sm transition-all ${
              selectedDifficulty === 'ALL'
                ? 'bg-slate-500 text-white scale-110 shadow-lg'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            全て
          </button>
          {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((difficulty) => {
            const isActive = selectedDifficulty === difficulty;
            const difficultyStyle = DIFFICULTY[difficulty];
            return (
              <button
                key={difficulty}
                onClick={() => handleFilterChange(difficulty)}
                className={`px-4 py-2 rounded-full font-black text-sm transition-all ${
                  isActive
                    ? `${difficultyStyle.bg} text-white scale-110 shadow-lg`
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {difficultyStyle.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 mb-8 max-w-4xl mx-auto px-4">
        {filteredSongs.map((song) => {
          const progressData = progress.get(song.id);
          const isActive = progressData?.clearCount > 0;
          const difficultyStyle = DIFFICULTY[song.difficulty];

          return (
            <div
              key={song.id}
              onClick={() => handleSongSelect(song)}
              className={`cursor-pointer transition-all hover:scale-105 active:scale-105 ${
                isActive
                  ? 'ring-2 ring-offset-4 ring-orange-500'
                  : 'hover:ring-2 ring-offset-4 ring-slate-500'
              }`}
            >
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <div className={`inline-flex items-center gap-2 mb-3 ${difficultyStyle.bg} rounded-full px-3 py-1`}>
                  <span className={`text-xs font-black ${difficultyStyle.text}`}>
                    {difficultyStyle.label}
                  </span>
                </div>

                <div className="mb-3">
                  <h3 className="text-xl font-black text-white mb-1 leading-none">
                    {song.title}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {song.artist}
                  </p>
                </div>

                {progressData && (
                  <div className="mt-4 pt-4 border-t border-slate-700 rounded-lg bg-slate-800/50">
                    <div className="flex justify-between items-center text-sm text-slate-400">
                      <div>
                        <span className="text-xs text-slate-500 block">ベストスコア</span>
                        <span className="text-xl font-bold text-orange-400">
                          {progressData.bestScore.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">クリア回数</span>
                        <span className="text-lg font-bold text-green-400">
                          {progressData.clearCount}回
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl font-bold transition-all active:scale-105 hover:scale-110 active:shadow-lg active:shadow-orange-500/50"
                >
                  演奏開始
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SongSelector;

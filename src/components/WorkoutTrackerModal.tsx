/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { WorkoutLog } from '../types';
import { WORKOUT_TEMPLATES } from '../utils';
import { X, Dumbbell, Award, Flame, Check, HelpCircle, Save, Calendar } from 'lucide-react';

interface WorkoutTrackerModalProps {
  onClose: () => void;
  onSaveWorkout: (workout: WorkoutLog) => void;
  todayLog: DailyLog;
}

import { DailyLog } from '../types';

export default function WorkoutTrackerModal({
  onClose,
  onSaveWorkout,
  todayLog
}: WorkoutTrackerModalProps) {
  
  const [selectedTemplate, setSelectedTemplate] = useState<"shoulder_posture" | "chest_upper" | "core_padel" | "custom">(
    todayLog.workout?.templateType || 'shoulder_posture'
  );
  const [isDone, setIsDone] = useState<boolean>(todayLog.workout?.isDone || false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "failed" | "">(
    todayLog.workout?.difficulty || ''
  );
  const [notes, setNotes] = useState<string>(todayLog.workout?.notes || '');

  const handleSave = () => {
    const log: WorkoutLog = {
      templateType: selectedTemplate,
      isDone,
      difficulty,
      notes
    };
    onSaveWorkout(log);
    onClose();
  };

  const currentTemplate = selectedTemplate !== 'custom' ? WORKOUT_TEMPLATES[selectedTemplate] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800/80">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-purple-500" />
            Latihan Hari Ini
          </h3>
          <button onClick={onClose} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Template Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400">PILIH TEMPLATE PROGRAM LATIHAN</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedTemplate('shoulder_posture')}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                  selectedTemplate === 'shoulder_posture'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-450 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                 Shoulder & Posture
              </button>
              <button
                onClick={() => setSelectedTemplate('chest_upper')}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                  selectedTemplate === 'chest_upper'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-450 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                 Chest & Upper
              </button>
              <button
                onClick={() => setSelectedTemplate('core_padel')}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                  selectedTemplate === 'core_padel'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-450 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                 Core & Padel Support
              </button>
              <button
                onClick={() => setSelectedTemplate('custom')}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                  selectedTemplate === 'custom'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-450 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                ✏️ Latihan Custom
              </button>
            </div>
          </div>

          {/* List of exercises recommendation tailored to 3kg and 6kg DB and pull-up setup */}
          {currentTemplate && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 font-extrabold px-2 py-0.5 rounded">
                  {currentTemplate.title}
                </span>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{currentTemplate.description}</p>
              </div>

              <div className="space-y-2 border-t border-zinc-900 pt-2.5">
                {currentTemplate.exercises.map((ex, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed">
                    <span className="text-purple-500 font-bold font-mono">#{idx + 1}</span>
                    <div>
                      <span className="block font-bold text-zinc-200">{ex.name}</span>
                      <span className="text-[10px] text-zinc-500">{ex.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTemplate === 'custom' && (
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-zinc-300">Latihan Custom</span>
              <p className="text-[10px] text-zinc-500">Gunakan dumbbell 3kg dan 6kg milikmu untuk melakukan gerakan squat, press, bicep curl, abs crunch, wadahi porsi gerakanmu di kolom catatan di bawah.</p>
            </div>
          )}

          {/* Completion check */}
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-zinc-300">STATUS SELESAI</span>
              <p className="text-[10.5px] text-zinc-500">Tandai jika kamu sudah menyelesaikan menu hari ini</p>
            </div>
            
            <button
              onClick={() => setIsDone(!isDone)}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                isDone ? 'bg-purple-500 flex justify-end' : 'bg-zinc-800 flex justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>

          {/* Only when isDone, select difficulty */}
          {isDone && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">TINGKAT KESULITAN / FEEL LATIHAN</label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'medium', 'hard', 'failed'] as const).map((diff) => {
                  let label = 'Easy';
                  let colorClass = 'bg-zinc-950 border-zinc-800 text-zinc-400';
                  if (diff === 'easy') {
                    label = 'Ringan';
                    if (difficulty === 'easy') colorClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-400';
                  } else if (diff === 'medium') {
                    label = 'Sedang';
                    if (difficulty === 'medium') colorClass = 'bg-orange-500/15 border-orange-500 text-orange-400';
                  } else if (diff === 'hard') {
                    label = 'Berat';
                    if (difficulty === 'hard') colorClass = 'bg-red-500/15 border-red-500 text-red-400';
                  } else if (diff === 'failed') {
                    label = 'Gagal';
                    if (difficulty === 'failed') colorClass = 'bg-rose-900/40 border-rose-500 text-rose-500';
                  }

                  return (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${colorClass}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workout Notes */}
          <div className="space-y-1.5 animate-fade-in">
            <label className="text-xs font-bold text-zinc-400">CATATAN LATIHAN / REPS & SETS (OPSIONAL)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Lateral raises tempo lambat 3x12 repetisi dengan DB 3kg. Dada terasa kencang."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 focus:outline-none rounded-2xl p-3 text-xs text-zinc-200 placeholder:text-zinc-650 h-20 resize-none font-sans"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-400 rounded-xl transition cursor-pointer border border-zinc-800"
          >
            Tutup
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-lg"
          >
            <Check className="w-3.5 h-3.5" /> Simpan Latihan
          </button>
        </div>

      </div>
    </div>
  );
}

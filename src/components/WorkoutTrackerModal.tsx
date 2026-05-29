/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { WorkoutLog, WorkoutExercise, DailyLog } from '../types';
import { WORKOUT_TEMPLATES } from '../utils';
import { X, Dumbbell, Save, CheckCircle2, Circle, FastForward, Info, Plus } from 'lucide-react';

interface WorkoutTrackerModalProps {
  onClose: () => void;
  onSaveWorkout: (workout: WorkoutLog) => void;
  todayLog: DailyLog;
}

export default function WorkoutTrackerModal({
  onClose,
  onSaveWorkout,
  todayLog
}: WorkoutTrackerModalProps) {
  
  const [selectedTemplate, setSelectedTemplate] = useState<"plan_a" | "plan_b" | "recovery" | "custom">(
    todayLog.workout?.templateType || 'plan_a'
  );
  
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [notes, setNotes] = useState<string>(todayLog.workout?.notes || '');
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "failed" | "">(todayLog.workout?.difficulty || '');

  // Load exercises when template changes
  useEffect(() => {
    // If the selected template matches the todayLog's template, try to load saved exercises
    if (todayLog.workout && todayLog.workout.templateType === selectedTemplate && todayLog.workout.exercises?.length > 0) {
       setExercises(todayLog.workout.exercises);
    } else {
       // Otherwise, load default template exercises
       const template = selectedTemplate !== 'custom' ? WORKOUT_TEMPLATES[selectedTemplate] : null;
       if (template) {
         setExercises(template.exercises.map(ex => ({
           name: ex.name,
           category: ex.category,
           isCompleted: false,
           isSkipped: false,
           weight: ex.defaultWeight,
           sets: 3,
           reps: 10,
           difficulty: ''
         })));
       } else {
         setExercises([]); // custom
       }
    }
  }, [selectedTemplate, todayLog.workout]);

  const updateExercise = (index: number, updates: Partial<WorkoutExercise>) => {
    const newEx = [...exercises];
    newEx[index] = { ...newEx[index], ...updates };
    setExercises(newEx);
  };

  const addQuickExercise = (name: string, category: "main" | "support" | "core" | "mobility" | "bonus") => {
    setExercises([...exercises, {
      name,
      category,
      isCompleted: false,
      isSkipped: false,
      weight: 'bodyweight',
      sets: 3,
      durationSeconds: name.includes('Plank') ? 45 : undefined,
      reps: name.includes('Plank') ? undefined : 10,
      difficulty: ''
    }]);
  };

  const completedCount = exercises.filter(ex => ex.isCompleted).length;
  const isWorkoutValid = completedCount >= 1; // Can save if at least 1 exercise is done

  let completionMessage = "Belum mulai.";
  let completionColor = "text-slate-500";
  let workoutScore: "none" | "mini_session" | "light" | "minimum_effective" | "solid" | "full" = "none";

  if (completedCount >= 5) {
     completionMessage = "Full workout! Mantap.";
     completionColor = "text-emerald-400";
     workoutScore = "full";
  } else if (completedCount === 4) {
     completionMessage = "Latihan solid hari ini.";
     completionColor = "text-blue-400";
     workoutScore = "solid";
  } else if (completedCount === 3) {
     completionMessage = "Minimum efektif sudah kena.";
     completionColor = "text-amber-400";
     workoutScore = "minimum_effective";
  } else if (completedCount === 2) {
     completionMessage = "Light workout.";
     completionColor = "text-orange-400";
     workoutScore = "light";
  } else if (completedCount === 1) {
     completionMessage = "Mini session.";
     completionColor = "text-purple-400";
     workoutScore = "mini_session";
  }

  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleSave = () => {
    if (completedCount === 0) return;
    
    let msg = "";
    if (completedCount === 1) msg = "Mini session tersimpan. Tetap lebih baik daripada nol, tapi jangan sering-sering kalau mau badan cepat kebentuk.";
    else if (completedCount === 2) msg = "Light workout. Lumayan buat jaga ritme, tapi next coba minimal 3 gerakan.";
    else if (completedCount === 3) msg = "Minimum efektif sudah kena. Ini cukup bagus buat hari sibuk.";
    else if (completedCount === 4) msg = "Solid workout. Progress kamu aman.";
    else if (completedCount >= 5) msg = "Full workout. Mantap, ini sesi lengkap.";

    const log: WorkoutLog = {
      templateType: selectedTemplate,
      workoutScore: workoutScore,
      isDone: completedCount >= 3, // Still flag as completely 'done' internally if 3+, but everything is saved
      difficulty: difficulty || 'medium',
      notes,
      exercises
    };
    
    setFeedbackMsg(msg);
    setTimeout(() => {
       onSaveWorkout(log);
       onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto pt-10">
      <div className="w-full max-w-md bg-[#111115] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Dumbbell className="w-4 h-4 text-purple-500" />
            Tracker Latihan
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          
          {/* Template Selector Tabs */}
          <div className="flex gap-2 p-1 bg-black/50 rounded-xl">
            <button
              onClick={() => setSelectedTemplate('plan_a')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                selectedTemplate === 'plan_a' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
               Plan A
            </button>
            <button
              onClick={() => setSelectedTemplate('plan_b')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                selectedTemplate === 'plan_b' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
               Plan B
            </button>
            <button
              onClick={() => setSelectedTemplate('recovery')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                selectedTemplate === 'recovery' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
               Recovery
            </button>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between flex-wrap gap-2 items-end border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Daftar Gerakan</span>
                <span className={`text-[10px] font-black uppercase ${completionColor}`}>
                   Selesai {completedCount}/{exercises.length} — {completionMessage}
                </span>
             </div>

             {exercises.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">Menu custom belum disupport di preview ini.<br/>Pilih Plan A / B.</div>
             )}

             {exercises.map((ex, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border transition-all ${ex.isCompleted ? 'bg-emerald-900/10 border-emerald-500/30' : (ex.isSkipped ? 'bg-red-900/10 border-red-500/20 opacity-75' : 'bg-black/40 border-white/10')}`}>
                   {/* Title Row */}
                   <div className="flex justify-between items-start mb-3">
                      <div>
                         <span className="text-xs font-bold text-white flex items-center gap-1.5">{ex.name}</span>
                         <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1 block">{ex.category}</span>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => updateExercise(idx, { isCompleted: !ex.isCompleted, isSkipped: false })}
                           className={`p-1.5 rounded-full transition cursor-pointer ${ex.isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                         >
                           <CheckCircle2 className="w-5 h-5" />
                         </button>
                         <button 
                           onClick={() => updateExercise(idx, { isSkipped: !ex.isSkipped, isCompleted: false })}
                           className={`p-1.5 rounded-full transition cursor-pointer ${ex.isSkipped ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                         >
                           <FastForward className="w-5 h-5" />
                         </button>
                      </div>
                   </div>

                   {/* Sub Controls - Only if not skipped */}
                   {!ex.isSkipped && (
                     <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                        <select 
                          value={ex.weight || 'bodyweight'}
                          onChange={(e) => updateExercise(idx, { weight: e.target.value as any })}
                          className="bg-black/50 border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none"
                        >
                           <option value="bodyweight">Bodyweight</option>
                           <option value="3kg">Dumbbell 3kg</option>
                           <option value="6kg">Dumbbell 6kg</option>
                        </select>
                        <select 
                          value={ex.difficulty || ''}
                          onChange={(e) => updateExercise(idx, { difficulty: e.target.value as any })}
                          className="bg-black/50 border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none"
                        >
                           <option value="" disabled>Feel?</option>
                           <option value="easy">Ringan</option>
                           <option value="medium">Sedang</option>
                           <option value="hard">Berat / Mentok</option>
                           <option value="failed">Gagal / Sakit</option>
                        </select>
                        <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-lg p-1.5 px-2">
                           <input type="number" value={ex.sets || ''} onChange={e => updateExercise(idx, { sets: parseInt(e.target.value) })} className="w-full bg-transparent text-white text-[10px] text-center outline-none" placeholder="S" />
                           <span className="text-slate-500 text-[10px]">x</span>
                           {ex.durationSeconds ? (
                              <input type="number" value={ex.durationSeconds || ''} onChange={e => updateExercise(idx, { durationSeconds: parseInt(e.target.value) })} className="w-full bg-transparent text-white text-[10px] text-center outline-none" placeholder="Detik" />
                           ) : (
                              <input type="number" value={ex.reps || ''} onChange={e => updateExercise(idx, { reps: parseInt(e.target.value) })} className="w-full bg-transparent text-white text-[10px] text-center outline-none" placeholder="R" />
                           )}
                        </div>
                     </div>
                   )}

                   {ex.isSkipped && (
                     <div className="mt-2 text-[10px] text-slate-500 italic">Latihan dilewatkan.</div>
                   )}
                </div>
             ))}

             <div className="flex gap-2">
               <button onClick={() => addQuickExercise('Scapular Pull-up', 'main')} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-white/5 border-dashed">
                  <Plus className="w-3.5 h-3.5" /> Scapular Pull-up
               </button>
               <button onClick={() => addQuickExercise('Plank Finisher', 'core')} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-white/5 border-dashed">
                  <Plus className="w-3.5 h-3.5" /> Plank
               </button>
               <button onClick={() => addQuickExercise('Side Plank', 'bonus')} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-white/5 border-dashed">
                  <Plus className="w-3.5 h-3.5" /> Side Plank
               </button>
             </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
             <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Keseluruhan (Overall Difficulty & Notes)</label>
             <div className="flex gap-2">
               {(['easy', 'medium', 'hard'] as const).map(diff => (
                 <button 
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition ${difficulty === diff ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-black/30 border-white/10 text-slate-400'}`}
                 >
                    {diff === 'easy' ? 'Ringan' : (diff === 'medium' ? 'Pas' : 'Super Berat')}
                 </button>
               ))}
             </div>
             <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ada rasa nyeri sendi atau progress repetisi? Catat di sini biar gampang dievaluasi minggu depan."
                className="w-full bg-black/50 border border-white/10 focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 h-20 resize-none font-sans"
              />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10">
           {feedbackMsg ? (
              <div className="p-3 mb-2 rounded-xl bg-purple-500/20 border border-purple-500/50 text-purple-200 text-xs text-center font-bold animate-pulse">
                {feedbackMsg}
              </div>
           ) : null}
           <div className="flex justify-between gap-2 items-center">
             <span className="text-[10px] text-slate-500 font-bold uppercase w-1/3">Target: Min. 1 Gerak</span>
             <button
               onClick={handleSave}
               disabled={feedbackMsg !== ""}
               className={`w-2/3 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow-lg ${isWorkoutValid && !feedbackMsg ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-700 text-slate-400 opacity-50'}`}
             >
               {isWorkoutValid ? <><Save className="w-3.5 h-3.5" /> Simpan Sesi</> : 'Belum Selesai'}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}

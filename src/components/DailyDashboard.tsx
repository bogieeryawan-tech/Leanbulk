/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { DailyLog, BodyProgressEntry, UserSettings } from '../types';
import { getLocalDateString, getDailyActionText, get7DayWeightAverage, formatIndoDate, WORKOUT_TEMPLATES, getLeanBulkStatus } from '../utils';
import { 
  Flame, Dumbbell, Scale, Sparkles, Brain, Plus, 
  AlertCircle, Trash2, CheckCircle, 
  Circle, Camera, Check, Utensils, Zap, ClipboardList, Target
} from 'lucide-react';

interface DailyDashboardProps {
  settings: UserSettings | null;
  todayLog: DailyLog;
  logs: DailyLog[];
  bodyProgressHistory: BodyProgressEntry[];
  onOpenScanner: () => void;
  onOpenSupplements: () => void;
  onOpenWeightWaist: () => void;
  onOpenWorkout: () => void;
  onOpenCoach: () => void;
  onOpenProgressCheck: () => void;
  onDeleteMeal?: (mealIndex: number) => void;
  onDeleteSupplement?: (supplementId: string) => void;
  onToggleWorkoutDone?: () => void;
  onAIGoalAdvisor?: () => void;
}

export default function DailyDashboard({
  settings,
  todayLog,
  logs,
  bodyProgressHistory = [],
  onOpenScanner,
  onOpenSupplements,
  onOpenWeightWaist,
  onOpenWorkout,
  onOpenCoach,
  onOpenProgressCheck,
  onDeleteMeal,
  onDeleteSupplement,
  onToggleWorkoutDone,
  onAIGoalAdvisor
}: DailyDashboardProps) {

  // Calculate stats
  const foodProtein = todayLog.meals.reduce((sum, m) => sum + m.total_protein_g, 0);
  const suppProtein = todayLog.supplements.reduce((sum, s) => sum + s.protein_g, 0);
  const totalProtein = foodProtein + suppProtein;
  
  // Calculate dynamic protein target
  let minProtein = 90;
  let maxProtein = 100;
  let targetWeight = 60;
  let waistLimit = 77;
  let currentWeight = 58;

  if (settings) {
    currentWeight = settings.profile.current_weight_kg;
    minProtein = Math.round((currentWeight * settings.goal.protein_multiplier_min) / 5) * 5;
    maxProtein = Math.round((currentWeight * settings.goal.protein_multiplier_max) / 5) * 5;
    targetWeight = settings.goal.target_weight_kg;
    waistLimit = settings.goal.waist_limit_cm;
  }
  
  const progressPercent = Math.min(100, Math.round((totalProtein / minProtein) * 100));

  // Get active workout info
  const workoutDone = todayLog.workout?.isDone;

  // Verdict System
  const latestProgress = bodyProgressHistory.length > 0
    ? [...bodyProgressHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  let verdictIndo = 'Lakukan Check Progres Pertama';
  let verdictColor = 'text-amber-500';

  // Use Goal Analysis if no progress yet
  let remainingWeight = targetWeight - currentWeight;

  if (latestProgress?.analysis) {
    const status = latestProgress.analysis.progress_status;
    const postureChange = latestProgress.analysis.muscle_visual_change?.posture || 'same';
    
    if (status === 'on_track' || status === 'maintain_plan') {
      verdictIndo = 'Aman, Pertahankan!';
      verdictColor = 'text-emerald-400';
    } else if (status === 'need_more_protein') {
      verdictIndo = 'Kurang Protein';
      verdictColor = 'text-amber-400';
    } else if (status === 'need_more_calories') {
      verdictIndo = 'Kurang Kalori';
      verdictColor = 'text-blue-400';
    } else if (status === 'reduce_gain_mass') {
      verdictIndo = 'Perut Mulai Naik';
      verdictColor = 'text-red-400';
    } else if (status === 'improve_training') {
      verdictIndo = 'Tingkatkan Latihan';
      verdictColor = 'text-purple-400';
    }

    if ((postureChange === 'worse' || postureChange === 'same') && (status === 'on_track' || status === 'maintain_plan')) {
      verdictIndo = 'Perbaiki Postur';
      verdictColor = 'text-pink-400';
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Target & Goal Info Card */}
      {settings && (
        <div className="bg-[#111115] border border-white/10 rounded-3xl p-5 shadow-lg relative overflow-hidden">
           <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
           <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-black text-white font-display tracking-wide uppercase">Target & Progres</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                {settings.goal.goal_type.replace('_', ' ')}
              </span>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <span className="text-[10px] text-slate-500 tracking-widest uppercase font-bold block">Berat</span>
                 <div className="mt-1 flex items-end gap-1">
                   <span className="text-xl font-bold font-mono text-white leading-none">{currentWeight}</span>
                   <span className="text-xs text-slate-400 font-bold mb-0.5">kg</span>
                 </div>
                 <span className="text-[10px] text-slate-500 font-bold block mt-1">
                   Target: {targetWeight} kg 
                   {remainingWeight > 0 && <span className="text-blue-400"> (Sisa {remainingWeight.toFixed(1)} kg)</span>}
                   {remainingWeight <= 0 && <span className="text-emerald-400"> (Tercapai!)</span>}
                 </span>
              </div>

              <div>
                 <span className="text-[10px] text-slate-500 tracking-widest uppercase font-bold block">Pinggang</span>
                 <div className="mt-1 flex items-end gap-1">
                   <span className="text-xl font-bold font-mono text-white leading-none">{settings.profile.current_waist_cm}</span>
                   <span className="text-xs text-slate-400 font-bold mb-0.5">cm</span>
                 </div>
                 <span className="text-[10px] text-slate-500 font-bold block mt-1">
                   Batas: <span className={settings.profile.current_waist_cm >= waistLimit ? 'text-red-400' : ''}>{waistLimit} cm</span>
                 </span>
              </div>
           </div>

           <button 
             onClick={onAIGoalAdvisor} 
             className="mt-4 w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-xl transition cursor-pointer flex justify-center items-center gap-2 border border-blue-500/20"
           >
             <Brain className="w-4 h-4" /> Target saya sudah pas belum?
           </button>
        </div>
      )}

      {/* 1. TOP CARD: AI Verdict */}
      <div className="bg-[#111115] border border-white/10 rounded-3xl p-6 shadow-lg relative overflow-hidden flex items-center gap-4 cursor-pointer hover:bg-white/5 transition" onClick={onOpenCoach}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="p-4 bg-amber-500/10 rounded-2xl shrink-0">
          <Brain className={`w-8 h-8 ${verdictColor}`} />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status AI Saat Ini</span>
          <h2 className={`text-xl font-black font-display uppercase tracking-tight leading-tight ${verdictColor}`}>{verdictIndo}</h2>
          <span className="text-[10px] text-slate-500 mt-1 block">Tanya Pelatih AI ➔</span>
        </div>
      </div>

      {/* 2. SECOND CARD: Protein Progress */}
      <div className="bg-[#111115] border border-white/10 rounded-3xl p-6 shadow-lg space-y-4">
        <div className="flex justify-between items-start gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5 leading-none">
            <Flame className="w-4 h-4 text-amber-500" />
            Protein Harian
          </span>
          <span className="text-xs font-mono text-zinc-400 font-bold leading-none">{totalProtein} / {minProtein}-{maxProtein}g</span>
        </div>
        
        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden p-[3px] border border-white/5">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalProtein >= minProtein 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          {totalProtein >= minProtein 
            ? 'Bagus sekali! Target protein harianmu sudah terpenuhi.' 
            : `Kamu perlu sekitar ${Math.max(0, minProtein - totalProtein)}g protein lagi hari ini.`}
        </p>
      </div>

      {/* 3. FOUR BIG BUTTONS (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-4">
        {/* A. Foto Makanan */}
        <button
          onClick={onOpenScanner}
          className="bg-[#111115] border border-white/10 hover:border-amber-500/30 p-5 rounded-3xl text-left transition cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-3xl rounded-full group-hover:bg-amber-500/10 transition"></div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl w-fit">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <span className="text-base font-black text-white block truncate">Foto Makanan</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Lacak protein & kalori</span>
          </div>
        </button>

        {/* B. Tambah Suplemen */}
        <button
          onClick={onOpenSupplements}
          className="bg-[#111115] border border-white/10 hover:border-emerald-500/30 p-5 rounded-3xl text-left transition cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition"></div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-base font-black text-white block truncate">Suplemen</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Catat whey/gainer</span>
          </div>
        </button>

        {/* C. Input Berat / Pinggang */}
        <button
          onClick={onOpenWeightWaist}
          className="bg-[#111115] border border-white/10 hover:border-blue-500/30 p-5 rounded-3xl text-left transition cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition"></div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl w-fit">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-base font-black text-white block truncate">Input Berat/Pinggang</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Catat progres angka harian</span>
          </div>
        </button>

        {/* D. Progress Badan */}
        <button
          onClick={onOpenProgressCheck}
          className="bg-[#111115] border border-white/10 hover:border-purple-500/30 p-5 rounded-3xl text-left transition cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-3xl rounded-full group-hover:bg-purple-500/10 transition"></div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl w-fit">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-base font-black text-white block truncate">Progress Badan</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">AI Body Scanner</span>
          </div>
        </button>
      </div>

      {/* 4. Jurnal Kronologis & Latihan */}
      <div className="bg-[#111115] border border-white/10 rounded-3xl p-6 shadow-lg space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest flex items-center gap-2 font-display">
            <ClipboardList className="w-4 h-4 text-purple-400" />
            Jurnal Hari Ini
          </h3>
          <span className="text-[9px] bg-zinc-800 text-zinc-450 font-black px-2 py-0.5 rounded uppercase tracking-wider">Logbook</span>
        </div>

        <div className="space-y-8 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5 before:bg-white/5">
          
          {/* Latihan Otot / Fitness */}
          <div className="relative pl-10 animate-fade-in">
            <div className={`absolute left-0 top-0.5 p-2 rounded-full border z-10 ${
              workoutDone ? 'bg-purple-500 border-purple-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Dumbbell className="w-4 h-4" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-white tracking-wider">Latihan Fisik</span>
                <button onClick={onOpenWorkout} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer">
                  {todayLog.workout ? 'Ubah Latihan' : 'Pilih Menu Latihan'}
                </button>
              </div>

              {todayLog.workout ? (
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-black text-white block">
                      {todayLog.workout.templateType === 'custom' 
                        ? '✏️ Menu Custom' 
                        : (WORKOUT_TEMPLATES[todayLog.workout.templateType as keyof typeof WORKOUT_TEMPLATES]?.title || 'Latihan Beban')}
                    </span>
                    <button
                      onClick={onToggleWorkoutDone}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider cursor-pointer transition ${
                        todayLog.workout.isDone ? 'bg-emerald-500 text-neutral-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {todayLog.workout.isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {todayLog.workout.isDone ? 'Selesai' : 'Belum'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-4 text-center">
                  <p className="text-[11px] text-slate-400">Belum ada jadwal latihan hari ini.</p>
                </div>
              )}
            </div>
          </div>

          {/* Daftar Makanan & Suplemen */}
          <div className="relative pl-10 animate-fade-in">
            <div className={`absolute left-0 top-0.5 p-2 rounded-full border z-10 ${
              todayLog.meals.length > 0 || todayLog.supplements.length > 0 ? 'bg-amber-500 border-amber-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Utensils className="w-4 h-4" />
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-black text-white tracking-wider block">Log Makanan & Suplemen</span>
              
              {todayLog.meals.length > 0 || todayLog.supplements.length > 0 ? (
                <div className="space-y-3">
                  {todayLog.meals.map((meal, index) => (
                    <div key={`m-${index}`} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex justify-between items-center group">
                      <div>
                        <span className="font-bold text-sm text-white block">{meal.meal_name}</span>
                        <span className="text-[11px] text-amber-500 font-mono mt-1 block font-bold">{meal.total_protein_g}g Pro | {meal.total_calories} kkal</span>
                      </div>
                      {onDeleteMeal && (
                        <button onClick={() => onDeleteMeal(index)} className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer transition">
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {todayLog.supplements.map((supp) => (
                    <div key={`s-${supp.id}`} className="bg-black/20 border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center group">
                      <div>
                        <span className="font-bold text-sm text-emerald-100 block">{supp.name}</span>
                        <span className="text-[11px] text-emerald-400 font-mono mt-1 block font-bold">{supp.protein_g}g Pro | {supp.calories} kkal</span>
                      </div>
                      {onDeleteSupplement && (
                        <button onClick={() => onDeleteSupplement(supp.id)} className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer transition">
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-4 text-center">
                  <p className="text-[11px] text-slate-400">Belum ada makanan terekam.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

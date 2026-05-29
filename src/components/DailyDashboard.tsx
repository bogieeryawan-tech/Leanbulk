/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { DailyLog, BodyProgressEntry, UserSettings } from '../types';
import { getLocalDateString, getDailyActionText, get7DayWeightAverage, formatIndoDate, WORKOUT_TEMPLATES, getLeanBulkStatus } from '../utils';
import { 
  Flame, Dumbbell, Scale, Sparkles, Brain, Plus, 
  AlertCircle, Trash2, CheckCircle, ChevronRight, Activity,
  Circle, Camera, Check, Utensils, Zap, ClipboardList, Target, MessageSquare
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyDashboardProps {
  settings: UserSettings | null;
  todayLog: DailyLog;
  logs: DailyLog[];
  bodyProgressHistory: BodyProgressEntry[];
  onOpenScanner: () => void;
  onOpenSupplements: () => void;
  onOpenWeightWaist: () => void;
  onOpenWorkout: () => void;
  onOpenCoach: (initialPrompt?: string) => void;
  onOpenProgressCheck: () => void;
  onOpenActivity: () => void;
  onDeleteMeal?: (mealIndex: number) => void;
  onDeleteSupplement?: (supplementId: string) => void;
  onDeleteActivity?: (activityId: string) => void;
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
  onOpenActivity,
  onDeleteMeal,
  onDeleteSupplement,
  onDeleteActivity,
  onToggleWorkoutDone,
  onAIGoalAdvisor
}: DailyDashboardProps) {

  // Calculate stats
  const foodProtein = todayLog.meals.reduce((sum, m) => sum + m.total_protein_g, 0);
  const suppProtein = todayLog.supplements.reduce((sum, s) => sum + s.protein_g, 0);
  const totalProtein = foodProtein + suppProtein;

  const foodCalories = todayLog.meals.reduce((sum, m) => sum + m.total_calories, 0);
  const suppCalories = todayLog.supplements.reduce((sum, s) => sum + s.calories, 0);
  const consumedCalories = foodCalories + suppCalories;
  
  const activeBurn = todayLog.activities?.reduce((sum, a) => sum + a.calories_burned, 0) || 0;
  const workoutBurn = todayLog.workout?.isDone ? 250 : 0;
  const totalBurn = activeBurn + workoutBurn;
  
  const totalCalories = Math.max(0, consumedCalories - totalBurn);
  
  const chartData = useMemo(() => {
    if (!settings) return [];
    
    // Create an array of the last 7 days dates ending at todayLog.date
    const dates = [];
    const targetDate = new Date(todayLog.date);
    if (isNaN(targetDate.getTime())) return [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    let latestWeight = settings.profile.starting_weight_kg || 0;
    let latestWaist = settings.profile.starting_waist_cm || 0;
    
    // Find earliest entries before 7 days to set baseline
    const pastLogs = logs.filter(l => l.date < dates[0]).sort((a,b) => a.date.localeCompare(b.date));
    pastLogs.forEach(l => {
       if (l.weightWaist?.weight) latestWeight = l.weightWaist.weight;
       if (l.weightWaist?.waist) latestWaist = l.weightWaist.waist;
    });

    return dates.map(dateStr => {
      const dayLog = logs.find(l => l.date === dateStr);
      if (dayLog?.weightWaist?.weight) latestWeight = dayLog.weightWaist.weight;
      if (dayLog?.weightWaist?.waist) latestWaist = dayLog.weightWaist.waist;
      
      const dateParts = formatIndoDate(dateStr).split(' ');
      return {
        date: `${dateParts[0]} ${dateParts[1].substring(0,3)}`, // e.g., '14 Agt'
        fullDate: formatIndoDate(dateStr),
        weight: latestWeight,
        waist: latestWaist,
      };
    });
  }, [logs, settings, todayLog.date]);

  // Calculate dynamic protein and calorie targets
  let minProtein = 90;
  let maxProtein = 100;
  let targetWeight = 60;
  let waistLimit = 77;
  let currentWeight = 58;
  let currentWaist = 76;
  let targetCalories = 2200;

  if (settings) {
    currentWeight = settings.profile.current_weight_kg;
    currentWaist = settings.profile.current_waist_cm;
    minProtein = Math.round((currentWeight * settings.goal.protein_multiplier_min) / 5) * 5;
    maxProtein = Math.round((currentWeight * settings.goal.protein_multiplier_max) / 5) * 5;
    targetWeight = settings.goal.target_weight_kg;
    waistLimit = settings.goal.waist_limit_cm;

    // Approximate BMR & TDEE (Mifflin)
    const bmr = (10 * currentWeight) + (6.25 * settings.profile.height_cm) - 120;
    const maintenanceCalories = Math.round(bmr * 1.4);
    
    let modifier = 0;
    if (settings.goal.goal_type === 'lean_bulk') {
        modifier = settings.goal.timeline_preference === 'aggressive' ? 400 : (settings.goal.timeline_preference === 'relaxed' ? 200 : 300);
    } else if (settings.goal.goal_type === 'mini_cut') {
        modifier = -300;
    }
    targetCalories = maintenanceCalories + modifier;
  }
  
  const progressPercent = Math.min(100, Math.round((totalProtein / minProtein) * 100));

  // Get active workout info
  const workoutDone = todayLog.workout?.isDone;
  
  // AI Suggestions Fast Insights logic
  let quickInsight = "";
  const isProteinMet = totalProtein >= minProtein;
  const isCaloriesLow = totalCalories < targetCalories - 300;
  const isCaloriesHigh = totalCalories > targetCalories + 300;
  const proteinDiff = Math.max(0, Math.round(minProtein - totalProtein));
  const calorieDiff = Math.abs(Math.round(targetCalories - totalCalories));

  if (totalProtein === 0 && totalCalories === 0) {
      quickInsight = "Masih kosong nih bro! Mulai harimu dengan input makanan/minuman pertamamu.";
  } else if (!isProteinMet && isCaloriesLow) {
      if (proteinDiff > 30) {
          quickInsight = `🚨 Gawat protein masih kurang ${proteinDiff}g dan kalori sisa banyak (${calorieDiff} kkal). Waktunya makan besar padat gizi (ayam bakar + nasi, sate ayam)!`;
      } else {
          quickInsight = `✌️ Dikit lagi nyampe target! Kurang ${proteinDiff}g protein & ${calorieDiff} kkal. Tambah 1 scoop mass gainer atau cemilan roti lapis telur mentega beres nih.`;
      }
  } else if (!isProteinMet && isCaloriesHigh) {
      quickInsight = `⚠️ Protein kurang ${proteinDiff}g tapi kalori udah over ${calorieDiff} kkal! Coba cari sumber protein murni minim kalori (Whey Isolate, dada ayam rebus, putih telur) tanpa karbo/lemak lagi.`;
  } else if (!isProteinMet && !isCaloriesLow && !isCaloriesHigh) {
      quickInsight = `📉 Kalori udah pas target, sisa kejar protein ${proteinDiff}g lagi. Sikat whey atau sebutir dua butir telur rebus bro!`;
  } else if (isProteinMet && isCaloriesLow) {
      quickInsight = `🔥 Protein udah kecapai, tapi kalori masih defisit ${calorieDiff} kkal. Biar bulking maksimal, tambah liquid calories (pisang blender/gainer) atau ngemil sehat!`;
  } else if (isProteinMet && isCaloriesHigh) {
      quickInsight = `⚠️ Target protein aman bro, tapi surplus kalori berlebih (${calorieDiff} kkal)! Untuk kompensasi, coba bakar dengan jalan kaki santai (3-5k steps) malam ini.`;
  } else {
      quickInsight = "✨ PERFECT! Kalori & Protein hari ini tepat di sweet spot. Nggak seret otot, nggak bikin buncit. Pertahankan bro!";
  }

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

  // Local AI Diagnosis Simulation
  let diagStatus = "Aman / On Track";
  let diagDampak = "Latihan dan asupan gizi seimbang, progress pembentukan otot sesuai jalur.";
  let diagSolusi = "Lanjutkan rutinitas harianmu. Jangan lupa istirahat cukup.";
  let diagHindari = "Jangan ubah pola secara drastis.";

  let minimMission = "Hari ini cukup main 3 gerakan utama: push, pull, core.";

  const isLateEvening = new Date().getHours() >= 19;
  const isProteinFarBehind = totalProtein < (minProtein * 0.7);
  const showEveningAlert = todayLog.date === getLocalDateString() && isLateEvening && isProteinFarBehind;

  if (settings) {
     const last7Logs = [...logs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 7);
     
     // 1. Protein Check
     let totalProtein7 = 0;
     let validProteinDays = 0;
     last7Logs.forEach(l => {
       const fdP = l.meals.reduce((sum,m)=>sum+m.total_protein_g,0);
       const spP = l.supplements.reduce((sum,s)=>sum+s.protein_g,0);
       if ((fdP+spP) > 0) { totalProtein7 += (fdP+spP); validProteinDays++; }
     });
     const avgProtein7 = validProteinDays ? (totalProtein7 / validProteinDays) : 0;

     // 2. Training Check
     const workoutCount7 = last7Logs.filter(l => l.workout?.workoutScore !== undefined && l.workout?.workoutScore !== "none").length;
     const skippedPlankCount = last7Logs.filter(l => {
        if (!l.workout?.exercises) return false;
        return l.workout.exercises.some(ex => (ex.name.includes('Plank') || ex.category === 'core') && ex.isSkipped);
     }).length;

     // 3. Waist check
     let waistTrendAlert = false;
     if (currentWaist >= waistLimit || currentWaist > (settings.profile.starting_waist_cm + 3)) waistTrendAlert = true;
     
     if (waistTrendAlert) {
         diagStatus = "Pinggang mulai naik";
         diagDampak = "Surplus terlalu besar, risiko perut maju / buncit.";
         diagSolusi = "Kurangi atau stop Gain Mass, fokus ke Platinum Whey dan protein utuh.";
         diagHindari = "Jangan lanjutkan pola makan dirty bulk.";
         minimMission = "Pinggang naik: Stop/kurangi Gain Mass hari ini.";
     } else if (workoutCount7 < 2 && last7Logs.length >= 3) {
         diagStatus = "Latihan kurang";
         diagDampak = "Protein cukup pun tidak maksimal jadi otot kalau kurang stimulus beban.";
         diagSolusi = "Minimal 3 gerakan: 1 push, 1 pull, 1 core.";
         diagHindari = "Jangan cuma tracking makan tanpa latihan.";
         minimMission = "Cuma sempat 1 gerakan? Simpan sebagai Mini Session, jangan skip total.";
     } else if (avgProtein7 > 0 && avgProtein7 < (minProtein - 10)) {
         diagStatus = "Protein kurang";
         diagDampak = "Otot lebih susah kebentuk, recovery lambat, latihan gampang mentok.";
         diagSolusi = "Tambah 1 scoop Platinum atau 2 telur + tempe.";
         diagHindari = "Jangan langsung Gain Mass full kalau protein masih kurang.";
         minimMission = "Protein kurang: minum Platinum 1 scoop hari ini.";
     } else if (settings.goal.goal_type === "lean_bulk" && workoutCount7 >= 2 && currentWeight <= settings.profile.starting_weight_kg) {
         diagStatus = "Mungkin kurang kalori";
         diagDampak = "Berat badan dan massa otot susah naik walau latihan.";
         diagSolusi = "Tambah nasi/lauk atau Gain Mass 1/2 serving.";
         diagHindari = "Jangan full Gain Mass dulu.";
         minimMission = "Berat stagnan: coba selipkan 1/2 serving Gain Mass.";
     } else if (skippedPlankCount >= 3) {
         diagStatus = "Core sering diskip";
         diagDampak = "Kekuatan panggul, perut, dan stabilitas postur melambat.";
         diagSolusi = "Coba tambah Plank minimal 1 set aja sebelum selesai.";
         diagHindari = "Jangan bolos gerakan perut.";
         minimMission = "Plank sering diskip: usahakan 1 set hari ini buat jaga pinggang.";
     } else if (avgProtein7 >= minProtein) {
         diagStatus = "Protein aman";
         diagDampak = "Recovery dan pembentukan otot lebih kebantu.";
         diagSolusi = "Lanjut latihan, tidak perlu memaksakan tambah whey lagi.";
         diagHindari = "Jangan maksa protein berlebihan.";
         minimMission = "Protein aman, fokus hancurkan set latihanmu.";
     }
  }

  return (
    <div className="space-y-6">
      
      {/* Daily Top Actions / Minimum Mission */}
      {showEveningAlert && (
         <div className="bg-red-900/30 border border-red-500/50 rounded-3xl p-4 flex items-center gap-4 relative overflow-hidden animate-pulse">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none w-24 overflow-hidden flex justify-end">
               <AlertCircle className="w-32 h-32 transform text-red-500 translate-x-8 -translate-y-4" />
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30 relative z-10">
               <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="relative z-10 flex-1">
               <h4 className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-1 mt-0.5">Late Night Alert</h4>
               <p className="text-[13px] font-bold text-white leading-snug">Udah malem brow, tapi protein masih jauh. Buruan minum gainer atau sikat telur rebus sebelum molor!</p>
            </div>
         </div>
      )}

      {settings && !showEveningAlert && (
         <div className="bg-purple-900/20 border border-purple-500/30 rounded-3xl p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none w-24 overflow-hidden flex justify-end">
               <Zap className="w-32 h-32 transform text-purple-500 translate-x-8 -translate-y-4" />
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 relative z-10">
               <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="relative z-10 flex-1">
               <h4 className="text-[10px] font-black text-purple-300 uppercase tracking-widest mb-1 mt-0.5">Today Minimum Mission</h4>
               <p className="text-[13px] font-bold text-white leading-snug">{minimMission}</p>
            </div>
         </div>
      )}

      {/* 2. Protein & Kalori Progress - MOVED TO TOP */}
      <div className={`bg-[#111115] border rounded-3xl p-6 shadow-lg space-y-4 relative overflow-hidden transition-all duration-500 ${totalProtein >= minProtein && workoutDone ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-white/10'}`}>
        {totalProtein >= minProtein && workoutDone && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
        )}
        
        <div className="flex justify-between items-start gap-2 relative z-10">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5 leading-none">
            <Flame className="w-4 h-4 text-amber-500" />
            Protein Harian
          </span>
          <span className="text-xs font-mono text-zinc-400 font-bold leading-none">{totalProtein} / {minProtein}-{maxProtein}g</span>
        </div>
        
        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden p-[3px] border border-white/5 relative z-10">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalProtein >= minProtein 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Kalori Section */}
        <div className="flex justify-between items-center gap-2 relative z-10 pt-4 border-t border-white/5">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5 leading-none">
            <Zap className="w-4 h-4 text-blue-400" />
            Kalori Bersih (Netto)
          </span>
          <div className="text-right">
            <span className="text-xs font-mono text-zinc-400 font-bold leading-none">{totalCalories} / {targetCalories} kkal</span>
            {totalBurn > 0 && <span className="block text-[8px] text-slate-500 mt-1 uppercase font-bold text-right pt-0.5">(-{totalBurn} kcal kebakar)</span>}
          </div>
        </div>
        
        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden p-[3px] border border-white/5 relative z-10">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalCalories >= targetCalories 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                : 'bg-gradient-to-r from-blue-500 to-blue-400'
            }`}
            style={{ width: `${Math.min(100, targetCalories > 0 ? (totalCalories / targetCalories) * 100 : 0)}%` }}
          ></div>
        </div>
        
        <div className="relative z-10 mt-1">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 mt-2">
             <span className="text-[9px] uppercase tracking-widest text-slate-500 font-extrabold flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> AI Insight</span>
             <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
               {quickInsight}
             </p>
          </div>
          {totalProtein >= minProtein && workoutDone && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] uppercase font-black text-emerald-400 rounded-lg animate-pulse">
              <CheckCircle className="w-3 h-3" /> MISI HARI INI SELESAI
            </div>
          )}
        </div>
      </div>

      {/* 3. GROUPED QUICK ACTIONS */}
      <div className="space-y-4">
        {/* Grup 1: Asupan & Aktivitas */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenScanner}
            className="bg-[#111115] border border-white/10 hover:border-amber-500/30 p-4 rounded-2xl text-center transition cursor-pointer group flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
          >
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Makanan</span>
          </button>

          <button
            onClick={onOpenSupplements}
            className="bg-[#111115] border border-white/10 hover:border-emerald-500/30 p-4 rounded-2xl text-center transition cursor-pointer group flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Suplemen</span>
          </button>

          <button
            onClick={onOpenWorkout}
            className="bg-[#111115] border border-white/10 hover:border-purple-500/30 p-4 rounded-2xl text-center transition cursor-pointer group flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
          >
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Latihan</span>
          </button>

          <button
            onClick={onOpenActivity}
            className="bg-[#111115] border border-white/10 hover:border-blue-500/30 p-4 rounded-2xl text-center transition cursor-pointer group flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
          >
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Kardio</span>
          </button>
        </div>

        {/* Grup 2: Tracking Kondisi Tubuh */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenWeightWaist}
            className="bg-[#111115] border border-white/10 hover:border-indigo-500/30 px-4 py-3 rounded-2xl transition cursor-pointer group flex items-center justify-between active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-black text-white uppercase tracking-wider block">Input Angka</span>
                <span className="text-[9px] text-slate-400 font-bold tracking-wider">Berat & Pinggang</span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={onOpenProgressCheck}
            className="bg-[#111115] border border-white/10 hover:border-purple-500/30 px-4 py-3 rounded-2xl transition cursor-pointer group flex items-center justify-between active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-black text-white uppercase tracking-wider block">Body Scan</span>
                <span className="text-[9px] text-slate-400 font-bold tracking-wider">Cek Visual AI</span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
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
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white block">
                        {todayLog.workout.templateType === 'custom' 
                          ? '✏️ Menu Custom' 
                          : (WORKOUT_TEMPLATES[todayLog.workout.templateType as keyof typeof WORKOUT_TEMPLATES]?.title || 'Latihan Beban')}
                      </span>
                      {todayLog.workout.exercises && todayLog.workout.exercises.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider uppercase">
                          Selesai: {todayLog.workout.exercises.filter(ex => ex.isCompleted).length} / {todayLog.workout.exercises.length} Menu
                        </span>
                      )}
                    </div>
                    <button
                      onClick={onToggleWorkoutDone}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider cursor-pointer transition ${
                        todayLog.workout.isDone ? 'bg-emerald-500 text-neutral-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {todayLog.workout.isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {todayLog.workout.isDone ? 'Valid' : 'Belum'}
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
              todayLog.meals.length > 0 || todayLog.supplements.length > 0 || (todayLog.activities && todayLog.activities.length > 0) ? 'bg-amber-500 border-amber-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Utensils className="w-4 h-4" />
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-black text-white tracking-wider block">Log Harian</span>
              
              {todayLog.meals.length > 0 || todayLog.supplements.length > 0 || (todayLog.activities && todayLog.activities.length > 0) ? (
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

                  {todayLog.activities?.map((activity) => (
                    <div key={activity.id} className="bg-black/20 border border-blue-500/20 rounded-2xl p-4 flex justify-between items-center group">
                      <div>
                        <span className="font-bold text-sm text-blue-100 block">{activity.name}</span>
                        <span className="text-[11px] text-blue-400 font-mono mt-1 block font-bold flex items-center gap-1">⌚ {activity.duration_minutes} mnt | 🔥 -{activity.calories_burned} kkal</span>
                      </div>
                      {onDeleteActivity && (
                        <button onClick={() => onDeleteActivity(activity.id)} className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer transition">
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

        {/* Action Button: Tutup Hari */}
        <div className="pt-6 border-t border-white/5 relative z-10">
          <button
            onClick={() => onOpenCoach("Saya sudah selesai input semua makanan (lauk) dan jadwal latihan saya hari ini. Tolong berikan evaluasi jujur, pujian, atau kritikan (roasting) mengenai progress saya hari ini. Apakah sudah cukup bagus untuk lean bulking saya?")}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition cursor-pointer flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" /> Evaluasi & Selesaikan Hari Ini
          </button>
          <p className="text-center text-[10px] text-slate-500 font-bold mt-3">
            Tekan kalau kamu sudah input semua lauk dan latihan hari ini untuk dapat feedback.
          </p>
        </div>

      </div>

      {/* Target & Goal Info Card */}
      {settings && (
        <div className="bg-[#111115] border border-blue-500/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
           <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
           <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-black text-white font-display tracking-wide uppercase">Target {targetWeight} kg Status</span>
              </div>
           </div>

           <div className="flex justify-between items-end mb-4 relative z-10">
              <div>
                 <span className="text-[10px] text-slate-500 tracking-widest uppercase font-bold block">Berat</span>
                 <div className="mt-1 flex items-end gap-1">
                   <span className="text-xl font-bold font-mono text-white leading-none">{currentWeight}</span>
                   <span className="text-xs text-slate-400 font-bold mb-0.5">kg</span>
                 </div>
              </div>
              <div className="text-right">
                 <span className="text-[10px] text-slate-500 tracking-widest uppercase font-bold block">Pinggang</span>
                 <div className="mt-1 flex justify-end items-end gap-1">
                   <span className="text-xl font-bold font-mono text-white leading-none">{settings.profile.current_waist_cm}</span>
                   <span className="text-xs text-slate-400 font-bold mb-0.5">cm</span>
                 </div>
              </div>
           </div>

           <div className="h-44 w-full relative z-10 mb-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name="Berat (kg)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="waist" name="Pinggang (cm)" stroke="#a855f7" strokeWidth={3} dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
           </div>
           
           <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 relative z-10">
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">{remainingWeight <= 0 ? (settings.profile.current_waist_cm >= waistLimit ? 'Kurangi kalori, pinggang mulai lewat batas.' : 'Target tercapai! Lanjut fase berikutnya.') : 'Fokus penuhi harian, biar otot naik progresif.'}</p>
           </div>

           <button 
             onClick={onAIGoalAdvisor} 
             className="mt-3 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer flex justify-center items-center gap-2 border border-white/10 relative z-10"
           >
             <Brain className="w-3.5 h-3.5" /> Evaluasi Goal dengan AI
           </button>
        </div>
      )}

      {/* AI Daily Diagnosis Card */}
      {settings && (
        <div className="bg-[#111115] border border-white/10 rounded-3xl p-5 shadow-lg relative overflow-hidden">
           <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
             <Brain className="w-5 h-5 text-amber-500" />
             <span className="text-sm font-black text-white uppercase tracking-wide">Daily AI Diagnosis</span>
           </div>

           <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Status 7 Hari</span>
                <span className="text-sm font-bold text-amber-400">{diagStatus}</span>
              </div>
              
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Dampak (Bila dibiarkan)</span>
                <p className="text-xs text-white leading-relaxed">{diagDampak}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                   <span className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-widest block mb-1">Solusi Hari Ini</span>
                   <p className="text-xs font-bold text-emerald-400 leading-relaxed">{diagSolusi}</p>
                 </div>
                 <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                   <span className="text-[10px] text-rose-500/70 uppercase font-bold tracking-widest block mb-1">Hindari</span>
                   <p className="text-xs font-bold text-rose-400 leading-relaxed">{diagHindari}</p>
                 </div>
              </div>
           </div>

           <button 
             onClick={onOpenCoach} 
             className="mt-4 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer flex justify-center items-center gap-2 border border-white/10"
           >
             <MessageSquare className="w-3.5 h-3.5" /> Tanya Coach Langsung
           </button>
        </div>
      )}

    </div>
  );
}

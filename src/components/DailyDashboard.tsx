/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { DailyLog, BodyProgressEntry } from '../types';
import { getLocalDateString, getDailyActionText, get7DayWeightAverage, formatIndoDate, WORKOUT_TEMPLATES, getLeanBulkStatus } from '../utils';
import { 
  Flame, Dumbbell, Scale, UserCheck, Sparkles, Brain, Plus, 
  AlertCircle, TrendingUp, ChevronRight, Trash2, CheckCircle, 
  Circle, Camera, Check, Utensils, Zap, ClipboardList, Eye, ShieldAlert, Heart
} from 'lucide-react';

interface DailyDashboardProps {
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
}

export default function DailyDashboard({
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
  onToggleWorkoutDone
}: DailyDashboardProps) {
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState<string>(todayLog.summaryText || '');

  // Calculate stats
  const foodProtein = todayLog.meals.reduce((sum, m) => sum + m.total_protein_g, 0);
  const suppProtein = todayLog.supplements.reduce((sum, s) => sum + s.protein_g, 0);
  const totalProtein = foodProtein + suppProtein;

  const foodCalories = todayLog.meals.reduce((sum, m) => sum + m.total_calories, 0);
  const suppCalories = todayLog.supplements.reduce((sum, s) => sum + s.calories, 0);
  const totalCalories = foodCalories + suppCalories;

  const carbs = todayLog.meals.reduce((sum, m) => sum + m.total_carbs_g, 0);
  const fat = todayLog.meals.reduce((sum, m) => sum + m.total_fat_g, 0);

  // Protein targets
  const minProtein = 90;
  const maxProtein = 100;
  
  // Progress calculations
  const progressPercent = Math.min(100, Math.round((totalProtein / minProtein) * 100));
  
  // Custom styling states for protein target
  let progressColor = 'bg-amber-500';
  let progressBgColor = 'bg-amber-950/40 text-amber-500';
  let targetLabel = 'Kurang Protein';
  let targetDesc = `Kurang ${Math.round(minProtein - totalProtein)} g lagi harian`;

  if (totalProtein >= minProtein && totalProtein <= maxProtein) {
    progressColor = 'bg-emerald-500';
    progressBgColor = 'bg-emerald-950/40 text-emerald-400';
    targetLabel = 'Protein Terpenuhi!';
    targetDesc = 'Target 90-100 g tercapai sempurna!';
  } else if (totalProtein > maxProtein) {
    progressColor = 'bg-cyan-500';
    progressBgColor = 'bg-cyan-950/40 text-cyan-400';
    targetLabel = 'Sangat Cukup';
    targetDesc = 'Sudah melampaui target harian';
  }

  // Get active workout info
  const workoutDone = todayLog.workout?.isDone;
  const workoutType = todayLog.workout?.templateType;

  // Dynamic Calorie Targets: On Training Days we need more calories to maintain bulk (2100-2450 kkal). On Rest Days we need 1800-2100 kkal.
  const targetMinCalories = workoutDone ? 2100 : 1800;
  const targetMaxCalories = workoutDone ? 2450 : 2100;

  // Real-time metabolic burn from completed workout
  let workoutBurn = 0;
  if (workoutDone) {
    const difficulty = todayLog.workout?.difficulty || 'Medium';
    const isHard = difficulty === 'hard';
    const isEasy = difficulty === 'easy';
    const difficultyMultiplier = isEasy ? 0.8 : (isHard ? 1.2 : 1.0);
    const baseBurn = workoutType === 'shoulder_posture' 
      ? 200 
      : workoutType === 'chest_upper' 
        ? 250 
        : workoutType === 'core_padel' 
          ? 280 
          : 220; // fallback / custom
    workoutBurn = Math.round(baseBurn * difficultyMultiplier);
  }
  const netCalories = totalCalories - workoutBurn;

  // Weight info
  const todayWeight = todayLog.weightWaist?.weight;
  const todayWaist = todayLog.weightWaist?.waist;
  
  // Get latest previous weight/waist if not entered today
  const latestWithWeight = [...logs]
    .filter(l => l.weightWaist?.weight !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
    
  const latestWithWaist = [...logs]
    .filter(l => l.weightWaist?.waist !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const displayedWeight = todayWeight ?? latestWithWeight?.weightWaist?.weight ?? 58;
  const displayedWaist = todayWaist ?? latestWithWaist?.weightWaist?.waist ?? 76;
  const weightAvg7Day = get7DayWeightAverage(logs, todayLog.date) ?? displayedWeight;

  // Get today client-side action recommendation text
  const actionText = getDailyActionText(todayLog);

  // Mapped Verdict Engine for the AI Verdict Badge on Dashboard
  const latestProgress = bodyProgressHistory.length > 0
    ? [...bodyProgressHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  let verdictIndo = 'Lakukan Check Progres Pertama';
  let verdictColor = 'text-amber-500';
  let verdictBg = 'bg-amber-950/20 border-amber-500/10';

  if (latestProgress?.analysis) {
    const status = latestProgress.analysis.progress_status;
    const postureChange = latestProgress.analysis.muscle_visual_change.posture;
    
    if (status === 'on_track' || status === 'maintain_plan') {
      verdictIndo = 'Aman, lanjut';
      verdictColor = 'text-emerald-400';
      verdictBg = 'bg-emerald-950/20 border-emerald-500/15';
    } else if (status === 'need_more_protein') {
      verdictIndo = 'Kurang protein';
      verdictColor = 'text-amber-400';
      verdictBg = 'bg-amber-950/20 border-amber-500/15';
    } else if (status === 'need_more_calories') {
      verdictIndo = 'Kurang kalori';
      verdictColor = 'text-blue-400';
      verdictBg = 'bg-blue-950/25 border-blue-500/15';
    } else if (status === 'reduce_gain_mass') {
      verdictIndo = 'Perut mulai naik';
      verdictColor = 'text-red-400';
      verdictBg = 'bg-red-950/20 border-red-500/15';
    } else if (status === 'improve_training') {
      verdictIndo = 'Latihan perlu dinaikkan';
      verdictColor = 'text-purple-400';
      verdictBg = 'bg-purple-950/20 border-purple-500/15';
    }

    if (postureChange === 'worse' || postureChange === 'same') {
      if (status === 'on_track' || status === 'maintain_plan') {
        verdictIndo = 'Postur perlu dibenerin';
        verdictColor = 'text-pink-400';
        verdictBg = 'bg-pink-950/20 border-pink-500/15';
      }
    }
  }

  // Calculation of workout consistency in the last 7 days
  const recentLogs7 = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const totalWorkoutsLogged = recentLogs7.filter(l => l.workout).length;
  const completedWorkouts = recentLogs7.filter(l => l.workout?.isDone).length;
  const consistencyText = totalWorkoutsLogged > 0
    ? `${completedWorkouts}/${totalWorkoutsLogged} diselesaikan (${Math.round((completedWorkouts / totalWorkoutsLogged) * 100)}%)`
    : 'Belum terdata';

  // Generate Gemini custom smart summary
  const generateAISummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await fetch('/api/gemini/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalProtein,
          totalCalories,
          supplements: todayLog.supplements.map(s => s.name),
          workouts: todayLog.workout ? { 
            type: todayLog.workout.templateType, 
            status: todayLog.workout.isDone ? 'Selesai' : 'Belum Selesai',
            difficulty: todayLog.workout.difficulty 
          } : null,
          weightTrend: `Rerata 7 Hari: ${weightAvg7Day} kg, Pinggang: ${displayedWaist} cm`
        }),
      });

      const data = await response.json();
      if (data.text) {
        setSummaryOutput(data.text);
        // Cache it in todayLog
        todayLog.summaryText = data.text;
        // Trigger a save to localStorage by calling global state triggers (handled in App.tsx)
        const cachedLogs = JSON.parse(localStorage.getItem('lean_bulk_logs') || '[]');
        const updatedLogs = cachedLogs.map((l: any) => {
          if (l.date === todayLog.date) {
            return { ...l, summaryText: data.text };
          }
          return l;
        });
        localStorage.setItem('lean_bulk_logs', JSON.stringify(updatedLogs));
      }
    } catch (e) {
      console.error(e);
      setSummaryOutput('Gagal menganalisis data, silakan klik tombol generator kembali.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Dynamic warning generators
  const activeWarnings: { id: string; type: 'warning' | 'danger' | 'info'; title: string; message: string; actionText?: string; onAction?: () => void }[] = [];

  // 1. Protein Warning
  if (totalProtein < 90) {
    activeWarnings.push({
      id: 'warn-protein-low',
      type: 'warning',
      title: 'Target Protein Belum Terpenuhi',
      message: `Asupan protein baru ${totalProtein}g (target: 90-100g). Anda masih kurang ${Math.round(90 - totalProtein)}g lagi hari ini. Konsumsi protein optimal adalah kunci vital agar stimulasi otot berkembang maksimal.`,
      actionText: '+ Tambah Whey',
      onAction: onOpenSupplements,
    });
  } else if (totalProtein > 105) {
    activeWarnings.push({
      id: 'warn-protein-high',
      type: 'info',
      title: 'Kombinasi Protein Super Maksimal',
      message: `Asupan protein Anda (${totalProtein}g) melampaui rentang target optimal (90-100g). Aman untuk proses bulking bersih, namun Anda bisa menghemat L-Men Whey untuk besok agar lebih efisien secara penyerapan biologis.`,
    });
  }

  // 1.5 Dynamic Calorie Warning
  if (totalCalories < targetMinCalories) {
    activeWarnings.push({
      id: 'warn-calories-low',
      type: 'warning',
      title: workoutDone ? 'Target Kalori Latihan Belum Tercapai (Active Day)' : 'Target Kalori Pemulihan Belum Tercapai (Rest Day)',
      message: `Asupan harian Anda baru ${totalCalories} kkal. Karena hari ini adalah ${workoutDone ? 'Hari Latihan (kebutuhan 2100-2450 kkal)' : 'Hari Istirahat/Recovery (kebutuhan 1800-2100 kkal)'}, Anda masih kurang ${Math.round(targetMinCalories - totalCalories)} kkal lagi untuk tetap berada di rentang surplus bersih (clean bulk).`,
      actionText: '+ Tambah Makanan / Mass',
      onAction: onOpenSupplements,
    });
  } else if (totalCalories > targetMaxCalories) {
    activeWarnings.push({
      id: 'warn-calories-high',
      type: 'danger',
      title: 'Peringatan: Kalori Melebihi Batas Bersih (Dirty Bulk!)',
      message: `Asupan harian Anda (${totalCalories} kkal) melampaui batas aman clean bulk hari ini (${targetMaxCalories} kkal untuk ${workoutDone ? 'Hari Latihan' : 'Hari Istirahat'}). Selisih surplus yang terlalu tinggi berisiko disimpan menjadi lemak perut (lingkar pinggang melebar).`,
    });
  }

  // 2. Workout Warning
  if (!todayLog.workout) {
    activeWarnings.push({
      id: 'warn-workout-missing',
      type: 'warning',
      title: 'Menu Latihan Dumbbell Belum Dipilih',
      message: 'Anda belum merencanakan aktivitas latihan otot bahu, dada, atau recovery postur hari ini. Konsistensi harian adalah rahasia peningkatan progres tubuh.',
      actionText: 'Rencanakan Latih',
      onAction: onOpenWorkout,
    });
  } else if (!todayLog.workout.isDone) {
    const wTitle = todayLog.workout.templateType === 'custom' 
      ? '✏️ Custom' 
      : (WORKOUT_TEMPLATES[todayLog.workout.templateType as keyof typeof WORKOUT_TEMPLATES]?.title || 'Dumbbell');
    activeWarnings.push({
      id: 'warn-workout-incomplete',
      type: 'warning',
      title: `Latihan ${wTitle} Belum Diselesaikan`,
      message: `Menu latihan sudah dirancang namun belum dicentang 'Selesai'. Ayo selesaikan beberapa repetisi gerakan Anda hari ini agar tetap on-track!`,
      actionText: 'Tandai Selesai',
      onAction: onToggleWorkoutDone,
    });
  }

  // 3. Weight & Waist Progress Warning from getLeanBulkStatus
  const bulkStatus = getLeanBulkStatus(logs);
  if (bulkStatus.status === 'Perut naik terlalu cepat') {
    activeWarnings.push({
      id: 'warn-waist-alert',
      type: 'danger',
      title: 'PERINGATAN: Lingkar Pinggang Naik Terlalu Cepat!',
      message: bulkStatus.desc,
      actionText: 'Konsultasi Coach',
      onAction: onOpenCoach,
    });
  } else if (bulkStatus.status === 'Mungkin kurang makan') {
    activeWarnings.push({
      id: 'warn-calorie-deficit',
      type: 'warning',
      title: 'Evaluasi: Massa Berat stuck 14 Hari',
      message: bulkStatus.desc,
      actionText: 'Konsultasi Coach',
      onAction: onOpenCoach,
    });
  } else if (bulkStatus.status === 'Tambah kalori sedikit') {
    activeWarnings.push({
      id: 'warn-calorie-add',
      type: 'info',
      title: 'Nutrisi: Tambah Porsi Kalori Bersih',
      message: bulkStatus.desc,
    });
  }

  return (
    <div className="space-y-6">
      
      {/* =========================================================
          SECTION 1: STASIUN JURNAL UTAMA & AI CAMERA SCANNER
          ========================================================= */}
      <div id="ai-photo-scanner-hub" className="bg-[#111115] border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden transition-all duration-300 animate-fade-in">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full pointer-events-none"></div>

        {/* Card Header & Standby status */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">
              AI Food Camera Scanner
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-wider">Ready to Scan</span>
          </div>
        </div>

        {/* Capture Viewfinder Zone */}
        <div className="mt-5 bg-black/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center text-center space-y-4">
          {/* Subtle Corner Brackets for Viewfinder Look */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-zinc-700/80"></div>
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-zinc-700/80"></div>
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-zinc-700/80"></div>
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-zinc-700/80"></div>

          {/* Icon overlay with glowing pulse */}
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl scale-125 animate-pulse"></div>
            <div className="p-4 bg-gradient-to-b from-amber-500/10 to-amber-500/5 border border-amber-500/30 text-amber-400 rounded-full relative">
              <Camera className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-sm font-black text-white font-display tracking-tight">
              {todayLog.meals.length > 0 
                ? `Berhasil Mencatat ${todayLog.meals.length} Makanan`
                : 'Pindai Foto Makanan Anda'}
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {todayLog.meals.length > 0 
                ? `Makan terakhir: "${todayLog.meals[todayLog.meals.length - 1].meal_name}". Ambil foto lagi untuk porsi masakan berikutnya.`
                : 'Foto piring porsimu dengan AI. Gemini akan langsung mendeteksi karbohidrat, lemak, kalori bersih, & gram protein secara real-time.'}
            </p>
          </div>

          <button
            onClick={onOpenScanner}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-450 hover:to-amber-350 text-neutral-950 text-xs font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition duration-155 cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-neutral-950 animate-pulse" />
            AMBIL / UNGGAH FOTO MAKANAN
          </button>
        </div>

        {/* Quick Stats Summary Grid inside Banner */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-0.5">
            <span className="text-[7.5px] font-bold text-slate-400 uppercase block tracking-wider">RECOMP VERDICT</span>
            <span className={`text-[11px] font-black font-display tracking-tight truncate block ${verdictColor}`}>{verdictIndo}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-0.5">
            <span className="text-[7.5px] font-bold text-slate-400 uppercase block tracking-wider">HARI TRAINING</span>
            <span className="text-[11px] font-black text-indigo-400 font-display block leading-none pt-0.5">
              {workoutDone ? 'Aktif (Hari Latihan)' : 'Recovery / Rest'}
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================
          QUICK LOG UTILITY GRID (2x2 Compact Action Desk)
          ========================================================= */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          onClick={onOpenSupplements}
          className="bg-[#111115] border border-white/10 hover:border-white/20 p-4 rounded-3xl text-left transition duration-150 cursor-pointer hover:bg-neutral-900 flex flex-col justify-between h-24 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
            <Plus className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] text-slate-405 font-extrabold uppercase tracking-widest leading-none">Whey & Mass</span>
            <span className="text-xs font-black text-white leading-none block">Catat Suplemen</span>
            <span className="text-[9px] font-semibold text-emerald-400 font-mono block">+{suppProtein}g Protein</span>
          </div>
        </button>

        <button
          onClick={onOpenWeightWaist}
          className="bg-[#111115] border border-white/10 hover:border-white/20 p-4 rounded-3xl text-left transition duration-150 cursor-pointer hover:bg-neutral-900 flex flex-col justify-between h-24 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl w-fit">
            <Scale className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] text-slate-405 font-extrabold uppercase tracking-widest leading-none">Berat & Perut</span>
            <span className="text-xs font-black text-white leading-none block">Kemajuan Fisik</span>
            <span className="text-[9px] font-semibold text-blue-400 font-mono block">{displayedWeight}kg / {displayedWaist}cm</span>
          </div>
        </button>

        <button
          onClick={onOpenWorkout}
          className="bg-[#111115] border border-white/10 hover:border-white/20 p-4 rounded-3xl text-left transition duration-150 cursor-pointer hover:bg-neutral-900 flex flex-col justify-between h-24 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl w-fit">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] text-slate-405 font-extrabold uppercase tracking-widest leading-none">Dumbbell & Postur</span>
            <span className="text-xs font-black text-white leading-none block">Mulai Latihan</span>
            <span className="text-[9px] font-semibold text-purple-400 font-mono block truncate">{workoutDone ? 'Done (Latihan)' : 'Recovery / Rest'}</span>
          </div>
        </button>

        <button
          onClick={onOpenProgressCheck}
          className="bg-[#111115] border border-amber-500/20 hover:border-amber-500/40 p-4 rounded-3xl text-left transition duration-150 cursor-pointer hover:bg-neutral-900 flex flex-col justify-between h-24 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl w-fit">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] text-slate-405 font-extrabold uppercase tracking-widest leading-none">Check Progres</span>
            <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 leading-none block font-display">AI Body Progress</span>
            <span className="text-[9.5px] font-extrabold text-amber-500 uppercase tracking-wider block">Foto Fisik ➔</span>
          </div>
        </button>
      </div>

      {/* =========================================================
          SECTION 2: PUSAT DETEKSI PERINGATAN DAN EVALUASI TARGET
          ========================================================= */}
      <div id="target-warnings-center" className="bg-[#111115] border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest flex items-center gap-2 font-display">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            Evaluasi Deviasi & Target Harian
          </h3>
          <span className="text-[9px] bg-amber-500/10 text-amber-500 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
            Real-time Warning System
          </span>
        </div>

        {activeWarnings.length > 0 ? (
          <div className="space-y-3">
            {activeWarnings.map((warn) => {
              const borderTheme = 
                warn.type === 'danger' 
                  ? 'border-rose-500/20 bg-rose-500/5 text-rose-350 animate-pulse' 
                  : warn.type === 'warning'
                    ? 'border-amber-500/20 bg-amber-500/5 text-amber-305'
                    : 'border-blue-500/20 bg-blue-500/5 text-slate-300';
              
              const iconColor = 
                warn.type === 'danger' 
                  ? 'text-rose-500' 
                  : warn.type === 'warning'
                    ? 'text-amber-400'
                    : 'text-blue-400';

              return (
                <div key={warn.id} className={`p-4 border rounded-2xl flex flex-col gap-3.5 transition duration-155 ${borderTheme} animate-fade-in`}>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider block font-display flex items-center gap-1.5">
                      <AlertCircle className={`w-4 h-4 ${iconColor}`} />
                      {warn.title}
                    </span>
                    <p className="text-[11px] leading-relaxed opacity-90">{warn.message}</p>
                  </div>

                  {warn.actionText && warn.onAction && (
                    <button
                      onClick={warn.onAction}
                      className={`w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer text-center ${
                        warn.type === 'danger'
                          ? 'bg-rose-500 hover:bg-rose-450 text-neutral-950 shadow-md shadow-rose-500/10'
                          : warn.type === 'warning'
                            ? 'bg-amber-500 hover:bg-amber-450 text-neutral-950 shadow-md shadow-amber-500/10'
                            : 'bg-blue-500 hover:bg-blue-450 text-neutral-950'
                      }`}
                    >
                      {warn.actionText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 border border-emerald-500/25 bg-emerald-500/5 rounded-xl flex items-start gap-3 animate-fade-in">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <CheckCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block font-display">
                Luar Biasa! Semua Target Sempurna
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Asupan protein harian (90-100g) dan kalori bulking harian ({targetMinCalories}-{targetMaxCalories} kkal) telah tercapai secara ideal, rencana latihan fisik selesai, serta profil fluktuasi berat & perut Anda terpantau on-track sempurna!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          SECTION 3: METRIK UTAMA HARI INI (Visual Bento Grid)
          ========================================================= */}
      <div id="dashboard-stats" className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-500" />
            Metrik Nutrisi & Kemajuan Fisik Hari Ini
          </h2>
          <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded font-semibold font-mono">Real-time Feed</span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          
          {/* Box 1: Protein Focus */}
          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                PROTEIN INTAKE
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider leading-none shrink-0 ${progressBgColor}`}>
                {targetLabel}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-3xl font-black text-white font-mono">{totalProtein}g</span>
                <span className="text-[10px] text-zinc-500 font-mono font-bold">/ 90-100 g</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalProtein >= minProtein 
                      ? (totalProtein <= maxProtein ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-cyan-400') 
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-350 leading-relaxed">{targetDesc}</p>
          </div>

          {/* Box 2: Kalori Focus (Sensitive to Workout status) */}
          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                {workoutDone ? 'ACTIVE INTAKE' : 'RECOVERY INTAKE'}
              </span>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded leading-none shrink-0 ${
                totalCalories < targetMinCalories
                  ? 'bg-amber-500/10 text-amber-500'
                  : (totalCalories <= targetMaxCalories ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500')
              }`}>
                {totalCalories < targetMinCalories ? 'BULK DEFICIT' : (totalCalories <= targetMaxCalories ? 'TARGET ACC' : 'DIRTY SURPLUS')}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-3xl font-black text-white font-mono">{totalCalories}</span>
                <span className="text-[9px] text-zinc-500 font-mono font-bold">/ {targetMinCalories}-{targetMaxCalories} kkal</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    totalCalories < targetMinCalories 
                      ? 'bg-amber-500' 
                      : (totalCalories <= targetMaxCalories ? 'bg-emerald-500' : 'bg-rose-500')
                  }`}
                  style={{ width: `${Math.min(100, (totalCalories / targetMinCalories) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Workout dynamic adjustments */}
            {workoutDone ? (
              <div className="text-[10px] text-zinc-350 leading-relaxed pt-2.5 border-t border-white/5 flex justify-between items-center gap-1">
                <span className="text-[9px] text-purple-450 font-bold flex items-center gap-1">💪 Burn Latihan: <span className="font-mono">-{workoutBurn} kkal</span></span>
                <span className="font-mono text-emerald-400 font-bold">Net: {netCalories} kkal</span>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-400 leading-relaxed pt-2.5 border-t border-white/5">Target hari istirahat disesuaikan lebih irit kalori & protein untuk mencegah surplus kotor.</p>
            )}
          </div>

          {/* Box 3: Fisik & Berat Badan (Fungsi kontrol lemak perut) */}
          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                KEMAJUAN FISIK
              </span>
              <span className="text-[8px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded leading-none shrink-0">
                {bulkStatus.status}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono">{displayedWeight}</span>
                <span className="text-[10px] text-slate-400 font-bold">kg</span>
                <span className="text-zinc-550 text-[11px] font-mono ml-2">/ Avg7d: {weightAvg7Day}kg</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-300 font-mono">{displayedWaist}</span>
                <span className="text-[9px] text-slate-400 font-semibold">cm (Lingkar Pinggang)</span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-350 leading-relaxed border-t border-white/5 pt-2.5">
              <span>Konsistensi Latihan 7 Hari: </span>
              <span className="font-mono text-white font-bold">{consistencyText}</span>
            </div>
          </div>
        </div>

        {/* Macros split (food only) */}
        <div className="pt-4 flex flex-col gap-2.5 text-[10px] uppercase tracking-wider font-bold border-t border-white/5 text-slate-450">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span>Karbohidrat</span>
            </div>
            <span className="text-slate-200 font-mono font-black">{carbs}g</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>Lemak Jenuh & Sehat</span>
            </div>
            <span className="text-slate-200 font-mono font-black">{fat}g</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Protein Whey / Gainer</span>
            </div>
            <span className="text-slate-200 font-mono font-black">{suppProtein}g Protein</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION 4: LOG FOOTPRINT BRIDGE
          ========================================================= */}

      {/* =========================================================
          SECTION 5: JURNAL & TIMELINE LOG AKTIVITAS HARI INI
          ========================================================= */}
      <div id="journal-timeline" className="bg-[#111115] border border-white/10 rounded-[32px] p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest flex items-center gap-2 font-display">
            <ClipboardList className="w-4 h-4 text-purple-400" />
            Jurnal Kronologis & Aktivitas Hari Ini
          </h3>
          <span className="text-[9px] bg-zinc-800 text-zinc-450 font-black px-2 py-0.5 rounded uppercase tracking-wider">Logbook</span>
        </div>

        {/* TIMELINE SEQUENCE */}
        <div className="space-y-6 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5 before:bg-white/5">
          
          {/* Timeline Item A: Latihan Otot / Fitness */}
          <div className="relative pl-10 animate-fade-in">
            {/* Dot indicator */}
            <div className={`absolute left-0 top-1 p-2 rounded-full border z-10 ${
              workoutDone ? 'bg-purple-500 border-purple-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Dumbbell className="w-4.5 h-4.5" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  Rencana Aktivitas Latihan Beban
                </span>
                <button 
                  onClick={onOpenWorkout}
                  className="text-[9.5px] font-black text-purple-400 hover:underline cursor-pointer"
                >
                  Ganti Latihan
                </button>
              </div>

              {todayLog.workout ? (
                <div className="bg-[#15151c]/60 border border-white/5 rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-xs font-black text-white block">
                        {todayLog.workout.templateType === 'custom' 
                          ? '✏️ Menu Latihan Kustom' 
                          : (WORKOUT_TEMPLATES[todayLog.workout.templateType as keyof typeof WORKOUT_TEMPLATES]?.title || 'Latihan Dumbbell')}
                      </span>
                      {todayLog.workout.difficulty && (
                        <span className="inline-block text-[8px] font-extrabold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 tracking-wider uppercase mt-1">
                          Skala Beban: {todayLog.workout.difficulty}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={onToggleWorkoutDone}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                        todayLog.workout.isDone 
                          ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {todayLog.workout.isDone ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          SELESAI DILAKUKAN
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 shrink-0" />
                          BELUM SELESAI
                        </>
                      )}
                    </button>
                  </div>

                  {/* Move lists */}
                  {todayLog.workout.templateType !== 'custom' && WORKOUT_TEMPLATES[todayLog.workout.templateType as keyof typeof WORKOUT_TEMPLATES] && (
                    <div id="exercise-timeline-bullets" className="pt-2.5 border-t border-white/5 space-y-2">
                      {WORKOUT_TEMPLATES[todayLog.workout.templateType as keyof typeof WORKOUT_TEMPLATES].exercises.map((ex, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[10.5px] leading-relaxed animate-fade-in">
                          <span className="text-purple-400 font-extrabold font-mono mt-0.5">#{idx + 1}</span>
                          <div className="text-slate-350">
                            <strong className="text-slate-200 font-semibold">{ex.name}</strong>
                            <span className="block text-[9.5px] text-slate-500 leading-normal">{ex.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {todayLog.workout.notes && (
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-[10px] text-zinc-400 leading-relaxed italic">
                      Catatan: "{todayLog.workout.notes}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/5 border-dashed rounded-2xl p-4 text-center space-y-2">
                  <p className="text-[10.5px] text-slate-450 italic">Belum memilih checklist dumbbell hari ini.</p>
                  <button
                    onClick={onOpenWorkout}
                    className="mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Susun Menu Latihan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Item B: Sarapan, Makan Siang & Malem */}
          <div className="relative pl-10 animate-fade-in">
            {/* Dot indicator */}
            <div className={`absolute left-0 top-1 p-2 rounded-full border z-10 ${
              todayLog.meals.length > 0 ? 'bg-amber-500 border-amber-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Utensils className="w-4.5 h-4.5" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  Daftar Makanan & AI Food Scanner
                </span>
                <button 
                  onClick={onOpenScanner}
                  className="text-[9.5px] font-black text-amber-400 hover:underline cursor-pointer"
                >
                  + Upload Foto Makanan
                </button>
              </div>

              {todayLog.meals.length > 0 ? (
                <div className="space-y-2.5 max-h-68 overflow-y-auto pr-1">
                  {todayLog.meals.map((meal, index) => (
                    <div key={index} className="bg-[#15151c]/60 border border-white/5 rounded-2xl p-3 flex justify-between items-start gap-2.5 transition hover:border-white/10 animate-fade-in">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-white truncate">{meal.meal_name || `Kombinasi Meal #${index+1}`}</span>
                          <span className="text-[7.5px] font-mono select-none px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/10 uppercase shrink-0">
                            CONF: {meal.confidence}
                          </span>
                        </div>

                        {/* Breakdown elements analyzed by AI food scanner */}
                        {meal.detected_foods && meal.detected_foods.length > 0 && (
                          <div className="text-[9px] text-slate-400 flex flex-wrap gap-x-1.5 gap-y-1 pt-0.5 leading-none">
                            {meal.detected_foods.map((food, fIdx) => (
                              <span key={fIdx} className="bg-black/25 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
                                {food.name} ({food.protein_g}g Pro | {food.calories} kkal)
                              </span>
                            ))}
                          </div>
                        )}

                        {meal.lean_bulk_advice && (
                          <p className="text-[9.5px] text-slate-400 leading-normal italic line-clamp-2 bg-black/10 p-1.5 rounded border border-white/5">
                            Saran Bulk AI: "{meal.lean_bulk_advice}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-1">
                        <div className="text-right font-mono leading-tight">
                          <span className="block text-xs font-black text-emerald-400">+{meal.total_protein_g}g Pro</span>
                          <span className="block text-[9.5px] text-slate-500 font-bold">{meal.total_calories} kkal</span>
                        </div>

                        {onDeleteMeal && (
                          <button
                            onClick={() => onDeleteMeal(index)}
                            className="p-1.5 bg-zinc-850 hover:bg-rose-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition overflow-hidden cursor-pointer shrink-0"
                            title="Hapus Makanan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/5 border-dashed rounded-2xl p-4 text-center space-y-2">
                  <p className="text-[10.5px] text-slate-450 italic">Belum melampirkan foto / data makanan hari ini.</p>
                  <button
                    onClick={onOpenScanner}
                    className="mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Gunakan Kamera AI
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Item C: Whey Protein & Mass Gainer */}
          <div className="relative pl-10 animate-fade-in">
            {/* Dot indicator */}
            <div className={`absolute left-0 top-1 p-2 rounded-full border z-10 ${
              todayLog.supplements && todayLog.supplements.length > 0 ? 'bg-emerald-500 border-emerald-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Zap className="w-4.5 h-4.5" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  Suplemen L-Men & Whey Log
                </span>
                <button 
                  onClick={onOpenSupplements}
                  className="text-[9.5px] font-black text-emerald-400 hover:underline cursor-pointer"
                >
                  + Catat Suplemen
                </button>
              </div>

              {todayLog.supplements && todayLog.supplements.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {todayLog.supplements.map((supp) => (
                    <div key={supp.id} className="bg-[#15151c]/60 border border-white/5 rounded-2xl p-3 flex justify-between items-center text-[10.5px] transition hover:border-white/10 animate-fade-in">
                      <div className="min-w-0 pr-1 space-y-0.5">
                        <span className="font-bold text-slate-200 block truncate">{supp.name}</span>
                        <span className="text-[8.5px] text-slate-500 block leading-none font-mono">Pukul {supp.time} WIB</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono">
                          <span className="block font-black text-emerald-400">+{supp.protein_g}g Pro</span>
                          <span className="block text-[8.5px] text-slate-500 leading-none">{supp.calories} kkal</span>
                        </div>
                        {onDeleteSupplement && (
                          <button
                            onClick={() => onDeleteSupplement(supp.id)}
                            className="p-1.5 bg-zinc-850 hover:bg-rose-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                            title="Hapus suplemen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-3 text-center text-[10px] text-slate-500 border border-dashed border-white/5 rounded-xl italic">
                  Belum mencatat Platinum Whey / Gain Mass di sela makan hari ini.
                </div>
              )}
            </div>
          </div>

          {/* Timeline Item D: Foto Fisik Harian */}
          <div className="relative pl-10 animate-fade-in">
            {/* Dot indicator */}
            {(() => {
              const todayProgress = bodyProgressHistory.find(bp => bp.date === todayLog.date);
              const hasPhotos = todayProgress && (todayProgress.frontPhoto || todayProgress.sidePhoto || todayProgress.backPhoto);
              return (
                <>
                  <div className={`absolute left-0 top-1 p-2 rounded-full border z-10 ${
                    hasPhotos ? 'bg-blue-500 border-blue-400 text-neutral-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}>
                    <Camera className="w-4.5 h-4.5" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                      Dokumentasi Visual & Postur
                    </span>

                    {todayProgress ? (
                      <div className="bg-[#15151c]/70 border border-white/5 rounded-2xl p-3.5 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {todayProgress.frontPhoto ? (
                            <div className="aspect-[3/4] rounded-lg border border-white/10 overflow-hidden bg-zinc-950 relative">
                              <img src={todayProgress.frontPhoto} alt="Depan" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                              <span className="absolute bottom-1 right-1 px-1 bg-black/60 rounded text-[7px] text-white font-mono font-bold leading-none py-0.5">DEPAN</span>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] rounded-lg border border-dashed border-white/5 bg-black/25 flex items-center justify-center flex-col p-1 text-center">
                              <span className="text-[7.5px] font-bold text-zinc-500 block">FOTO DEPAN KOSONG</span>
                            </div>
                          )}

                          {todayProgress.sidePhoto ? (
                            <div className="aspect-[3/4] rounded-lg border border-white/10 overflow-hidden bg-zinc-950 relative">
                              <img src={todayProgress.sidePhoto} alt="Samping" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                              <span className="absolute bottom-1 right-1 px-1 bg-black/60 rounded text-[7px] text-white font-mono font-bold leading-none py-0.5">SAMPING</span>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] rounded-lg border border-dashed border-white/5 bg-black/25 flex items-center justify-center flex-col p-1 text-center">
                              <span className="text-[7.5px] font-bold text-zinc-500 block">FOTO SAMPI KOSONG</span>
                            </div>
                          )}

                          {todayProgress.backPhoto ? (
                            <div className="aspect-[3/4] rounded-lg border border-white/10 overflow-hidden bg-zinc-950 relative">
                              <img src={todayProgress.backPhoto} alt="Belakang" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                              <span className="absolute bottom-1 right-1 px-1 bg-black/60 rounded text-[7px] text-white font-mono font-bold leading-none py-0.5">BELAKANG</span>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] rounded-lg border border-dashed border-white/5 bg-black/25 flex items-center justify-center flex-col p-1 text-center">
                              <span className="text-[7.5px] font-bold text-zinc-500 block">FOTO BELAK KOSONG</span>
                            </div>
                          )}
                        </div>

                        {todayProgress.analysis && (
                          <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-xl border border-white/5 text-[10.5px]">
                            <div className="space-y-0.5 min-w-0 flex-1 pr-1">
                              <span className="block text-[8px] font-black text-slate-450 uppercase leading-none tracking-wider">Verdik Progres AI</span>
                              <p className="text-zinc-200 truncate font-semibold leading-tight mt-0.5">"{todayProgress.analysis.simple_message}"</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 bg-amber-500/15 border border-amber-500/20 px-2 py-1 rounded-lg text-amber-500 text-[10px] font-mono font-extrabold leading-none">
                              <Sparkles className="w-3 h-3" /> Score {todayProgress.analysis.body_progress_score}/100
                            </div>
                          </div>
                        )}

                        <button
                          onClick={onOpenProgressCheck}
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 border border-white/5 font-bold text-white text-[10px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Buka Tab Evaluasi Postur Tubuh
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-[10.5px] bg-[#14141d]/40 p-3 rounded-2xl border border-white/5">
                        <span className="text-slate-450 italic">Belum mengabadikan foto siluet progres hari ini.</span>
                        <button
                          onClick={onOpenProgressCheck}
                          className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[9.5px] font-black uppercase transition cursor-pointer"
                        >
                          Ambil Foto Progres
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

        </div>
      </div>

      {/* =========================================================
          SECTION 6: AI DEEP ANALYTICS & SMART INSIGHT JOURNAL
          ========================================================= */}
      <div id="ai-recap-card" className="bg-[#111115] border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-350 flex items-center gap-2 font-display">
            <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
            AI Smart Daily Insights
          </h3>
          <button
            onClick={generateAISummary}
            disabled={loadingSummary}
            className="text-[9px] uppercase tracking-widest font-black text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 px-3 py-1.5 rounded-xl transition duration-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {loadingSummary ? 'Menganalisis...' : 'Minta Analisis AI'}
          </button>
        </div>

        {/* 1. Daily Action Recommendation */}
        <div className="bg-black/25 p-4 border border-white/5 rounded-2xl space-y-1.5">
          <span className="text-[8.5px] font-black text-amber-500 uppercase tracking-widest block leading-none">Rekomendasi Aksi Utama</span>
          <p className="text-[11px] text-slate-205 leading-relaxed font-sans font-semibold">"{actionText}"</p>
        </div>

        {/* 2. Custom Gemini report summary */}
        {summaryOutput ? (
          <div className="bg-black/25 p-4 border border-white/5 rounded-2xl space-y-2.5 font-sans">
            {summaryOutput.split('\n').filter(Boolean).map((line, idx) => (
              <p key={idx} className={`text-xs leading-relaxed ${idx === 0 ? 'text-slate-105 font-extrabold' : 'text-slate-350 font-normal'}`}>
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed italic px-2">
            Belum ada ringkasan beralur harian Anda. Silakan selesaikan asupan makan / latihan hari ini kemudian klik "Minta Analisis AI" untuk interpretasi medis bulking Anda.
          </p>
        )}
      </div>

      {/* =========================================================
          SECTION 7: PERSONAL COACH CHAT LINK (FOOTER)
          ========================================================= */}
      <div className="bg-amber-600/10 backdrop-blur-xl border border-amber-550/20 rounded-[32px] p-5 flex justify-between items-center shadow-lg transition duration-150 hover:bg-amber-600/15">
        <div>
          <span className="block text-xs font-black text-amber-300 uppercase tracking-wider font-display leading-none mb-1">Butuh Konsultasi Bulking Cepat?</span>
          <span className="text-[11px] text-slate-400">Hubungi personal coach L-Men Anda mengenai porsi kalori dan pola rep latihan.</span>
        </div>
        <button
          onClick={onOpenCoach}
          className="text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-neutral-950 px-4 py-2.5 rounded-full transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/5 active:scale-95 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Kirim Chat Coach
        </button>
      </div>

    </div>
  );
}


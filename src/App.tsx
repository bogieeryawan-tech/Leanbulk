/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DailyLog, FoodScanResult, SupplementLog, WeightWaistLog, WorkoutLog, BodyProgressEntry, UserSettings } from './types';
import { getLocalDateString, formatIndoDate } from './utils';
import DailyDashboard from './components/DailyDashboard';
import FoodScannerModal from './components/FoodScannerModal';
import SupplementLoggerModal from './components/SupplementLoggerModal';
import WeightWaistModal from './components/WeightWaistModal';
import WorkoutTrackerModal from './components/WorkoutTrackerModal';
import AICoachModal from './components/AICoachModal';
import BodyProgressModal from './components/BodyProgressModal';
import DataManagement from './components/DataManagement';
import OnboardingWizard from './components/OnboardingWizard';
import SettingsModal from './components/SettingsModal';
import AIGoalAdvisorModal from './components/AIGoalAdvisorModal';
import InstallPwaModal from './components/InstallPwaModal';
import { ActivityLoggerModal } from './components/ActivityLoggerModal';
import { Sparkles, Brain, Scale, Dumbbell, Zap, RefreshCw, ChevronLeft, ChevronRight, User, Smartphone } from 'lucide-react';


// Generates 5 days of realistic mock seed data for a 58kg male beginner to show graph trends
const SEED_DATA: DailyLog[] = [
  {
    date: '2026-05-22',
    meals: [
      {
        meal_name: 'Nasi Dada Ayam & Tempe Bacem',
        total_protein_g: 48,
        total_calories: 620,
        total_carbs_g: 75,
        total_fat_g: 12,
        confidence: 'high',
        detected_foods: [],
        short_feedback: 'Menu protein luar biasa, rasio kalori seimbang.',
        lean_bulk_advice: 'Dada ayam bakar merupakan sumber leusin tertinggi untuk memicu mTor.'
      }
    ],
    supplements: [
      { id: 'supp-1', time: '08:15', type: 'platinum_whey', name: 'L-Men Platinum (1 Scoop)', protein_g: 25, calories: 120 }
    ],
    weightWaist: { weight: 58.0, waist: 76.0 },
    workout: { templateType: 'plan_a', workoutScore: 'solid', isDone: true, difficulty: 'medium', notes: 'Bagus, postur tegak.', exercises: [] }
  },
  {
    date: '2026-05-23',
    meals: [
      {
        meal_name: 'Daging Sapi & Telur Dadar',
        total_protein_g: 42,
        total_calories: 580,
        total_carbs_g: 60,
        total_fat_g: 18,
        confidence: 'high',
        detected_foods: [],
        short_feedback: 'Sempurna untuk asupan zink alami.',
        lean_bulk_advice: 'Pertahankan lauk hewani padat nutrisi.'
      }
    ],
    supplements: [
      { id: 'supp-2', time: '17:30', type: 'gain_mass_half', name: 'L-Men Gain Mass (1/2 Serving)', protein_g: 11, calories: 150 }
    ],
    weightWaist: { weight: 58.1, waist: 76.0 },
    workout: { templateType: 'plan_b', workoutScore: 'solid', isDone: true, difficulty: 'hard', notes: 'Push-up terasa menantang.', exercises: [] }
  },
  {
    date: '2026-05-24',
    meals: [
      {
        meal_name: 'Nasi Gila Telur Orak Arik',
        total_protein_g: 30,
        total_calories: 510,
        total_carbs_g: 70,
        total_fat_g: 14,
        confidence: 'medium',
        detected_foods: [],
        short_feedback: 'Karbo tinggi, telur penyuplai lemak baik.',
        lean_bulk_advice: 'Bagus, tapi esok kurangi minyak berlebih.'
      }
    ],
    supplements: [
      { id: 'supp-3', time: '10:00', type: 'platinum_whey', name: 'L-Men Platinum (1 Scoop)', protein_g: 25, calories: 120 }
    ],
    weightWaist: { weight: 58.2, waist: 76.1 },
    workout: { templateType: 'recovery', workoutScore: 'light', isDone: true, difficulty: 'easy', notes: 'Core plank terasa kuat.', exercises: [] }
  },
  {
    date: '2026-05-25',
    meals: [
      {
        meal_name: 'Sate Ayam Tanpa Kulit',
        total_protein_g: 45,
        total_calories: 490,
        total_carbs_g: 45,
        total_fat_g: 10,
        confidence: 'high',
        detected_foods: [],
        short_feedback: 'Daging dada murni penyuplai protein bulking.',
        lean_bulk_advice: 'Cocok disantap pasca latihan dumbbell malam hari.'
      }
    ],
    supplements: [
      { id: 'supp-4', time: '20:15', type: 'platinum_whey', name: 'L-Men Platinum (1 Scoop)', protein_g: 25, calories: 120 }
    ],
    weightWaist: { weight: 58.3, waist: 76.1 },
    workout: { templateType: 'plan_a', workoutScore: 'none', isDone: false, difficulty: '', notes: 'Hari istirahat.', exercises: [] }
  },
  {
    date: '2026-05-26',
    meals: [
      {
        meal_name: 'Dada Ayam & Tahu Tempe Tumis',
        total_protein_g: 50,
        total_calories: 640,
        total_carbs_g: 65,
        total_fat_g: 12,
        confidence: 'high',
        detected_foods: [],
        short_feedback: 'Rasio protein kian konsisten.',
        lean_bulk_advice: 'Bagus sekali! Kandungan tempe menyajikan delivers asam amino komplit.'
      }
    ],
    supplements: [
      { id: 'supp-5', time: '09:00', type: 'platinum_whey', name: 'L-Men Platinum (1 Scoop)', protein_g: 25, calories: 120 },
      { id: 'supp-6', time: '15:20', type: 'gain_mass_half', name: 'L-Men Gain Mass (1/2 Serving)', protein_g: 11, calories: 150 }
    ],
    weightWaist: { weight: 58.4, waist: 76.2 },
    workout: { templateType: 'plan_a', workoutScore: 'solid', isDone: true, difficulty: 'medium', notes: 'Gerakan dumbbell row mulus.', exercises: [] }
  }
];

const SEED_PROGRESS: BodyProgressEntry[] = [
  {
    id: 'bp-seed',
    date: '2026-05-22',
    weight: 58.0,
    waist: 76.0,
    analysis: {
      visual_summary: "Bahu terlihat lebar namun dada atas masih kosong. Pinggang terlihat ramping dan stabil, sangat bagus untuk memulai program lean bulking bersih.",
      body_progress_score: 7,
      muscle_visual_change: {
        shoulders: "same",
        chest: "same",
        back: "same",
        arms: "same",
        waist_belly: "stable",
        posture: "same"
      },
      confidence: "high",
      progress_status: "on_track",
      main_issue: "Otot dada atas (upper chest) terlihat masih tipis, target pengembangan prioritas.",
      next_action: "Lanjutkan latihan Dumbbell Press dengan fokus tempo lambat (time under tension) 3 detik saat menurunkan beban.",
      simple_message: "Lean bulk kamu aman."
    }
  }
];

export default function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [bodyProgressHistory, setBodyProgressHistory] = useState<BodyProgressEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  
  // Modal overlay visibility states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [supplementsOpen, setSupplementsOpen] = useState(false);
  const [weightWaistOpen, setWeightWaistOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInitialPrompt, setCoachInitialPrompt] = useState<string | undefined>(undefined);
  const [progressOpen, setProgressOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalAdvisorOpen, setGoalAdvisorOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  // Initialize and load logs & body progress from localStorage
  useEffect(() => {
    const storedSettings = localStorage.getItem('lean_bulk_settings');
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (err) {
        console.error('Error parsing settings', err);
      }
    }

    const todayStr = getLocalDateString();
    setSelectedDate(todayStr);

    const storedLogs = localStorage.getItem('lean_bulk_logs');
    if (storedLogs !== null) {
      try {
        const parsed = JSON.parse(storedLogs);
        setLogs(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error('Error parsing logs', err);
        setLogs([]);
      }
    } else {
      setLogs([]);
      localStorage.setItem('lean_bulk_logs', JSON.stringify([]));
    }

    const storedProgress = localStorage.getItem('lean_bulk_body_progress');
    if (storedProgress !== null) {
      try {
        const parsedProgress = JSON.parse(storedProgress);
        setBodyProgressHistory(Array.isArray(parsedProgress) ? parsedProgress : []);
      } catch (err) {
        console.error('Error parsing body progress', err);
        setBodyProgressHistory([]);
      }
    } else {
      setBodyProgressHistory([]);
      localStorage.setItem('lean_bulk_body_progress', JSON.stringify([]));
    }
  }, []);

  // Sync back to localstorage whenever logs change
  const saveLogs = (newLogs: DailyLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem('lean_bulk_logs', JSON.stringify(newLogs));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'QuotaExceeded') {
        alert('Memori peramban (localStorage) penuh! Tidak bisa menyimpan data. Silakan hapus riwayat lama atau hapus semua data.');
      }
    }
  };

  // Safe getter for the selected date's log
  const getLogForDate = (dateStr: string): DailyLog => {
    const existing = logs.find(log => log.date === dateStr);
    if (existing) return existing;

    // Return virtual safe fallback
    return {
      date: dateStr,
      meals: [],
      supplements: [],
      weightWaist: undefined,
      workout: undefined,
      summaryText: ''
    };
  };

  const todayLog = getLogForDate(selectedDate);

  // Updates single properties of the active date log
  const updateTodayLog = (updates: Partial<DailyLog>) => {
    const targetDateLog = getLogForDate(selectedDate);
    const updatedLog: DailyLog = {
      ...targetDateLog,
      ...updates
    };

    const exists = logs.some(l => l.date === selectedDate);
    let newLogs: DailyLog[];

    if (exists) {
      newLogs = logs.map(l => (l.date === selectedDate ? updatedLog : l));
    } else {
      newLogs = [...logs, updatedLog];
    }

    saveLogs(newLogs);
  };

  // 1. Food Meal Saving
  const handleSaveMeal = (mealResult: FoodScanResult) => {
    const freshMeals = [...todayLog.meals, mealResult];
    updateTodayLog({ meals: freshMeals });
  };

  const handleDeleteMeal = (mealIndex: number) => {
    const freshMeals = todayLog.meals.filter((_, idx) => idx !== mealIndex);
    updateTodayLog({ meals: freshMeals });
  };

  // 2. Supplement Logs
  const handleSaveSupplement = (supp: SupplementLog) => {
    const freshSupps = [...todayLog.supplements, supp];
    updateTodayLog({ supplements: freshSupps });
  };

  const handleDeleteSupplement = (id: string) => {
    const freshSupps = todayLog.supplements.filter(s => s.id !== id);
    updateTodayLog({ supplements: freshSupps });
  };

  const handleDeleteActivity = (id: string) => {
    const freshActivities = (todayLog.activities || []).filter(a => a.id !== id);
    updateTodayLog({ activities: freshActivities });
  };

  // 3. Weight/Waist logs
  const handleSaveWeightWaist = (weight: number, waist: number) => {
    updateTodayLog({
      weightWaist: { weight, waist }
    });
    
    // Also update current profile settings if they exist
    if (settings) {
       const newSettings = {
         ...settings,
         profile: {
           ...settings.profile,
           current_weight_kg: weight,
           current_waist_cm: waist
         }
       };
       setSettings(newSettings);
       localStorage.setItem('lean_bulk_settings', JSON.stringify(newSettings));
    }
  };

  // 4. Workout checklist logger
  const handleSaveWorkout = (workout: WorkoutLog) => {
    updateTodayLog({ workout });
  };

  const handleToggleWorkoutDone = () => {
    const currentWorkout = todayLog.workout || {
      templateType: 'plan_a',
      workoutScore: 'none',
      isDone: false,
      difficulty: '',
      notes: '',
      exercises: []
    } as any;
    updateTodayLog({
      workout: {
        ...currentWorkout,
        isDone: !currentWorkout.isDone
      }
    });
  };

  // 5. Body Progress Check list
  const handleSaveProgressEntry = (entry: BodyProgressEntry) => {
    const exists = bodyProgressHistory.some(e => e.date === entry.date);
    let newHistory: BodyProgressEntry[];
    if (exists) {
      newHistory = bodyProgressHistory.map(e => e.date === entry.date ? entry : e);
    } else {
      newHistory = [entry, ...bodyProgressHistory];
    }
    setBodyProgressHistory(newHistory);
    try {
      localStorage.setItem('lean_bulk_body_progress', JSON.stringify(newHistory));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'QuotaExceeded') {
        alert('Memori peramban (localStorage) penuh! Foto/Progres tidak bisa disimpan. Coba Ekspor data lalu Hapus Riwayat Lama.');
      }
    }
  };

  const handleClearPhotosAndHistory = () => {
    setBodyProgressHistory([]);
    localStorage.removeItem('lean_bulk_body_progress');
  };

  // Prev/Next Day navigation
  const adjustDay = (days: number) => {
    let dateObj = new Date(selectedDate);
    if (!selectedDate || isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
    dateObj.setDate(dateObj.getDate() + days);
    const dateStr = dateObj.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  // Backup handlers
  const handleImportData = (importedLogs: DailyLog[], importedProgress: BodyProgressEntry[]) => {
    saveLogs(importedLogs);
    setBodyProgressHistory(importedProgress);
    localStorage.setItem('lean_bulk_body_progress', JSON.stringify(importedProgress));
  };

  const handleResetData = () => {
    saveLogs([]);
    setBodyProgressHistory([]);
    localStorage.setItem('lean_bulk_body_progress', JSON.stringify([]));
  };
  
  const handleLoadSampleData = () => {
    saveLogs(SEED_DATA);
    setBodyProgressHistory(SEED_PROGRESS);
    localStorage.setItem('lean_bulk_body_progress', JSON.stringify(SEED_PROGRESS));
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-slate-100 font-sans md:max-w-md md:mx-auto md:shadow-2xl md:border-x md:border-white/5 flex flex-col pb-12 relative overflow-hidden">
      {!settings && (
        <OnboardingWizard onComplete={(s) => {
          setSettings(s);
          localStorage.setItem('lean_bulk_settings', JSON.stringify(s));
        }} />
      )}
      {/* Mesh Background Gradients */}
      <div className="absolute top-[-5%] left-[-10%] w-[380px] h-[380px] bg-amber-600/15 blur-[100px] rounded-full pointer-events-none z-0 animate-pulse [animation-duration:8s]"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[320px] h-[320px] bg-orange-700/10 blur-[90px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-amber-700/5 blur-[110px] rounded-full pointer-events-none z-0"></div>

      {/* Visual Ambient Brand Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-5 py-4 flex flex-col gap-2 relative shadow-lg z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-sm tracking-tighter shadow-md">
              LB
            </div>
            <div>
              <h1 className="text-sm font-black text-white font-display uppercase tracking-wide leading-none">
                Lean Bulk <span className="text-amber-500">AI</span>
              </h1>
              <span className="text-[10px] text-slate-400 font-bold block">AI TRACKER</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setInstallOpen(true)}
              className="flex items-center gap-1.5 px-3 py-0.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-full cursor-pointer text-purple-400 text-[9px] font-black uppercase tracking-wider transition shrink-0"
              title="Pasang Aplikasi di HP"
            >
              <Smartphone className="w-3 h-3 text-purple-400" />
              Install App
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full cursor-pointer hover:bg-white/10 transition" onClick={() => setSettingsOpen(true)}>
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-slate-300 font-bold font-mono">
                {settings ? `${settings.profile.current_weight_kg}kg / ${settings.profile.height_cm}cm` : 'Setup'}
              </span>
            </div>
          </div>
        </div>

        {/* Date Navigator Grid bar */}
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 mt-1">
          <button 
            onClick={() => adjustDay(-1)} 
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-bold text-slate-200 font-mono select-none flex items-center gap-2">
            {selectedDate === getLocalDateString() ? 'Hari Ini' : formatIndoDate(selectedDate)}
            {selectedDate !== getLocalDateString() && (
              <button 
                onClick={() => setSelectedDate(getLocalDateString())}
                className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-wider rounded-md transition cursor-pointer"
              >
                Ke Hari Ini
              </button>
            )}
          </span>

          <button 
            onClick={() => adjustDay(1)} 
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main dashboard space scroll wrapper */}
      <main className="flex-1 p-5 space-y-6 relative z-10 overflow-y-auto">
        
        {/* Core Daily Dashboard widgets */}
        <DailyDashboard
          settings={settings}
          todayLog={todayLog}
          logs={logs}
          bodyProgressHistory={bodyProgressHistory}
          onOpenScanner={() => setScannerOpen(true)}
          onOpenSupplements={() => setSupplementsOpen(true)}
          onOpenWeightWaist={() => setWeightWaistOpen(true)}
          onOpenWorkout={() => setWorkoutOpen(true)}
          onOpenActivity={() => setActivityOpen(true)}
          onOpenCoach={(prompt?: string) => {
             setCoachInitialPrompt(prompt);
             setCoachOpen(true);
          }}
          onOpenProgressCheck={() => setProgressOpen(true)}
          onDeleteMeal={handleDeleteMeal}
          onDeleteSupplement={handleDeleteSupplement}
          onDeleteActivity={handleDeleteActivity}
          onToggleWorkoutDone={handleToggleWorkoutDone}
          onAIGoalAdvisor={() => setGoalAdvisorOpen(true)}
        />

        {/* Local database data backup */}
        <DataManagement
          logs={logs}
          onImportData={handleImportData}
          onResetData={handleResetData}
          onLoadSampleData={handleLoadSampleData}
        />

      </main>

      {/* Overlay modal views */}
      <ActivityLoggerModal
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
        dayLog={todayLog}
        onUpdateDay={(log) => updateTodayLog(log)}
        userWeightKg={settings?.profile.current_weight_kg || 58}
      />

      {scannerOpen && (
        <FoodScannerModal
          onClose={() => setScannerOpen(false)}
          onSaveMeal={handleSaveMeal}
        />
      )}

      {supplementsOpen && (
        <SupplementLoggerModal
          onClose={() => setSupplementsOpen(false)}
          onSaveSupplement={handleSaveSupplement}
          onDeleteSupplement={handleDeleteSupplement}
          todaySupplements={todayLog.supplements}
        />
      )}

      {weightWaistOpen && (
        <WeightWaistModal
          onClose={() => setWeightWaistOpen(false)}
          onSaveWeightWaist={handleSaveWeightWaist}
          todayLog={todayLog}
          logs={logs}
        />
      )}

      {workoutOpen && (
        <WorkoutTrackerModal
          onClose={() => setWorkoutOpen(false)}
          onSaveWorkout={handleSaveWorkout}
          todayLog={todayLog}
        />
      )}

      {coachOpen && (
        <AICoachModal
          settings={settings}
          todayLog={todayLog}
          initialPrompt={coachInitialPrompt}
          onClose={() => {
            setCoachOpen(false);
            setCoachInitialPrompt(undefined);
          }}
        />
      )}

      {progressOpen && (
        <BodyProgressModal
          onClose={() => setProgressOpen(false)}
          onSaveEntry={handleSaveProgressEntry}
          history={bodyProgressHistory}
          todayWeight={todayLog.weightWaist?.weight}
          todayWaist={todayLog.weightWaist?.waist}
          onClearPhotos={handleClearPhotosAndHistory}
        />
      )}

      {settingsOpen && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(newSettings) => {
            if (settings.goal.target_weight_kg !== newSettings.goal.target_weight_kg) {
               const storedHist = localStorage.getItem('lean_bulk_goal_history');
               const histData = storedHist ? JSON.parse(storedHist) : [];
               histData.push({
                  id: crypto.randomUUID(),
                  date: getLocalDateString(),
                  old_target_kg: settings.goal.target_weight_kg,
                  new_target_kg: newSettings.goal.target_weight_kg,
                  reason: 'Edit Manual dari Pengaturan',
               });
               localStorage.setItem('lean_bulk_goal_history', JSON.stringify(histData));
            }
            setSettings(newSettings);
            localStorage.setItem('lean_bulk_settings', JSON.stringify(newSettings));
            setSettingsOpen(false);
          }}
        />
      )}

       {goalAdvisorOpen && settings && (
        <AIGoalAdvisorModal
          settings={settings}
          logs={logs}
          bodyProgressHistory={bodyProgressHistory}
          onClose={() => setGoalAdvisorOpen(false)}
          onUpdateTarget={(newTarget, reason, aiSuggestion) => {
             const newSettings = {
                ...settings,
                goal: { ...settings.goal, target_weight_kg: newTarget }
             };
             setSettings(newSettings);
             localStorage.setItem('lean_bulk_settings', JSON.stringify(newSettings));
             
             // Save history
             const storedHist = localStorage.getItem('lean_bulk_goal_history');
             const histData = storedHist ? JSON.parse(storedHist) : [];
             histData.push({
                id: crypto.randomUUID(),
                date: getLocalDateString(),
                old_target_kg: settings.goal.target_weight_kg,
                new_target_kg: newTarget,
                reason: reason,
                ai_suggestion: aiSuggestion
             });
             localStorage.setItem('lean_bulk_goal_history', JSON.stringify(histData));

             setGoalAdvisorOpen(false);
          }}
        />
      )}

      {installOpen && (
        <InstallPwaModal onClose={() => setInstallOpen(false)} />
      )}

    </div>
  );
}

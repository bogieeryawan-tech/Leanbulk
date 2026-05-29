import { useState, useEffect } from 'react';
import { UserSettings, DailyLog, BodyProgressEntry, GoalHistoryEntry } from '../types';
import { Brain, Star, CheckCircle, TrendingDown, Target, Loader2, X } from 'lucide-react';

interface AIGoalAdvisorModalProps {
  settings: UserSettings;
  logs: DailyLog[];
  bodyProgressHistory: BodyProgressEntry[];
  onClose: () => void;
  onUpdateTarget: (newWeight: number, reason: string, aiSuggestion: string) => void;
}

export default function AIGoalAdvisorModal({ settings, logs, bodyProgressHistory, onClose, onUpdateTarget }: AIGoalAdvisorModalProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    analyzeGoal();
  }, []);

  const analyzeGoal = async () => {
    try {
      setLoading(true);

      const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
      const recentLogs = sortedLogs.slice(0, 14);
      
      let avgWeight = 0;
      let validWeights = 0;
      recentLogs.forEach(l => {
        if (l.weightWaist?.weight) {
           avgWeight += l.weightWaist.weight;
           validWeights++;
        }
      });
      if (validWeights > 0) avgWeight /= validWeights;

      // Calculate waist trend 14 days
      let waistTrendStr = "Stabil";
      let latestWaist = 0;
      let oldestWaist = 0;
      const waistLogs = recentLogs.filter(l => l.weightWaist?.waist).map(l => l.weightWaist!.waist);
      if (waistLogs.length >= 2) {
         latestWaist = waistLogs[0];
         oldestWaist = waistLogs[waistLogs.length - 1];
         if (latestWaist > oldestWaist + 1) waistTrendStr = "Naik cepat";
         else if (latestWaist < oldestWaist - 1) waistTrendStr = "Turun";
      }

      // Calculate protein avg 7 days
      const last7Logs = sortedLogs.slice(0, 7);
      let totalProtein7 = 0;
      let validProteinDays = 0;
      let workoutDoneCount = 0;
      last7Logs.forEach(l => {
         const foodPro = l.meals.reduce((sum, m) => sum + m.total_protein_g, 0);
         const suppPro = l.supplements.reduce((sum, s) => sum + s.protein_g, 0);
         if (foodPro + suppPro > 0) {
            totalProtein7 += (foodPro + suppPro);
            validProteinDays++;
         }
         if (l.workout?.isDone) {
            workoutDoneCount++;
         }
      });
      const avgProtein7 = validProteinDays ? (totalProtein7 / validProteinDays) : 0;
      
      const latestBodyProgress = bodyProgressHistory.length > 0
        ? [...bodyProgressHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
        : null;

      const response = await fetch('/api/gemini/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          avgWeight,
          waistTrendStr,
          avgProtein7,
          workoutDoneCount,
          latestBodyProgress
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi AI');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
         goal_status: 'good_target',
         suggested_target_weight: settings.goal.target_weight_kg,
         reason: 'Maaf, AI sedang offline. Tapi kalau dari angka, target kamu masih masuk akal.',
         timeline: '1-2 Bulan',
         next_action: 'Lanjutkan saja dulu rutinitasmu.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col pt-12 p-4 overflow-y-auto items-center justify-center">
      <div className="bg-[#111115] border border-blue-500/20 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-slide-up">
        
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-3xl pointer-events-none rounded-full"></div>

        <div className="p-4 flex justify-between items-center border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-black text-white font-display uppercase tracking-widest leading-none">Analisis Target</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 relative z-10">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Meninjau Progress Kamu...</p>
             </div>
          ) : (
            <div className="space-y-6">
               <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-4">
                 <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl shrink-0">
                   {result?.goal_status === 'good_target' && <CheckCircle className="w-6 h-6" />}
                   {result?.goal_status === 'maintain_first' && <Target className="w-6 h-6" />}
                   {(result?.goal_status === 'increase_target_later' || result?.goal_status === 'target_too_low') && <TrendingDown className="w-6 h-6" />}
                   {result?.goal_status === 'target_too_high' && <Star className="w-6 h-6" />}
                 </div>
                 
                 <div>
                   <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">Kesimpulan AI</h3>
                   <p className="text-xs text-slate-300 leading-relaxed">{result?.reason}</p>
                 </div>
               </div>

               <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase block border-b border-white/5 pb-1">Detail Saran</span>
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                     <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                        <span className="text-[10px] text-slate-500 block mb-0.5 font-bold uppercase">Estimasi Waktu</span>
                        <span className="text-xs text-slate-300 font-bold">{result?.timeline || '-'}</span>
                     </div>
                     <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                        <span className="text-[10px] text-slate-500 block mb-0.5 font-bold uppercase">Target Ideal</span>
                        <span className="text-xs text-white font-black">{result?.suggested_target_weight} kg</span>
                     </div>
                  </div>

                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 mt-2">
                     <span className="text-[10px] text-slate-500 block mb-0.5 font-bold uppercase">Fokus Minggu Ini</span>
                     <span className="text-xs text-slate-300 font-bold">{result?.next_action}</span>
                  </div>
               </div>

               {result?.suggested_target_weight !== settings.goal.target_weight_kg && (
                  <button 
                    onClick={() => {
                       onUpdateTarget(result.suggested_target_weight, "Update by AI Advisor", result.reason);
                       onClose();
                    }}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-neutral-900 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Ganti Target ke {result?.suggested_target_weight} kg
                  </button>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

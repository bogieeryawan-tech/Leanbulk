/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyLog, WorkoutLog, UserSettings } from './types';
import { getTargetProtein, getProteinRecommendation } from './nutritionLogic';

export const WORKOUT_TEMPLATES = {
  plan_a: {
    templateType: 'plan_a' as const,
    title: 'Hari A - Upper Body / Postur',
    description: 'Fokus dada, bahu, punggung, postur tegap.',
    exercises: [
      { name: 'Dead Hang (Wajib)', category: 'mobility' as const, defaultWeight: 'bodyweight' as const, sets: 3, durationSeconds: 20 },
      { name: 'Scapular Pull-up (Wajib)', category: 'main' as const, defaultWeight: 'bodyweight' as const, sets: 3, reps: 8 },
      { name: 'Plank (Wajib)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, durationSeconds: 20 },
      { name: 'Side Plank (Wajib)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, durationSeconds: 20 },
      { name: 'Dumbbell Floor Press', category: 'main' as const, defaultWeight: '6kg' as const, sets: 3, reps: 15 },
      { name: 'One-Arm Dumbbell Row', category: 'main' as const, defaultWeight: '6kg' as const, sets: 3, reps: 15 },
      { name: 'Dumbbell Shoulder Press', category: 'main' as const, defaultWeight: '3kg' as const, sets: 3, reps: 12 },
      { name: 'Lateral Raise', category: 'support' as const, defaultWeight: '3kg' as const, sets: 3, reps: 20 },
      { name: 'Rear Delt Fly', category: 'support' as const, defaultWeight: '3kg' as const, sets: 3, reps: 15 },
      { name: 'Abs Roll (kneeling)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 3, reps: 8 }
    ]
  },
  plan_b: {
    templateType: 'plan_b' as const,
    title: 'Hari B - Lower Body / Core',
    description: 'Fokus kaki atletis, core kuat, badan proporsional.',
    exercises: [
      { name: 'Dead Hang (Wajib)', category: 'mobility' as const, defaultWeight: 'bodyweight' as const, sets: 3, durationSeconds: 20 },
      { name: 'Scapular Pull-up (Wajib)', category: 'main' as const, defaultWeight: 'bodyweight' as const, sets: 3, reps: 8 },
      { name: 'Plank (Wajib)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, durationSeconds: 20 },
      { name: 'Side Plank (Wajib)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, durationSeconds: 20 },
      { name: 'Goblet Squat', category: 'main' as const, defaultWeight: '6kg' as const, sets: 3, reps: 15 },
      { name: 'Dumbbell Romanian Deadlift', category: 'main' as const, defaultWeight: '6kg' as const, sets: 3, reps: 15 },
      { name: 'Reverse Lunge / Split Squat', category: 'support' as const, defaultWeight: '3kg' as const, sets: 3, reps: 12 },
      { name: 'Calf Raise', category: 'support' as const, defaultWeight: '6kg' as const, sets: 3, reps: 25 },
      { name: 'Dumbbell Curl', category: 'support' as const, defaultWeight: '6kg' as const, sets: 2, reps: 15 },
      { name: 'Triceps Ext / Close-Grip Press', category: 'support' as const, defaultWeight: '6kg' as const, sets: 2, reps: 15 },
      { name: 'Abs Roll (kneeling ringan)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, reps: 5 }
    ]
  },
  recovery: {
    templateType: 'recovery' as const,
    title: 'Recovery / Bonus 3 Menit',
    description: 'Bahu lebih rileks, terbuka, dan tidak terangkat.',
    exercises: [
      { name: 'Dead Hang (Wajib)', category: 'mobility' as const, defaultWeight: 'bodyweight' as const, sets: 3, durationSeconds: 20 },
      { name: 'Scapular Pull-up (Wajib)', category: 'main' as const, defaultWeight: 'bodyweight' as const, sets: 3, reps: 8 },
      { name: 'Plank (Wajib)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, durationSeconds: 20 },
      { name: 'Side Plank (Wajib)', category: 'core' as const, defaultWeight: 'bodyweight' as const, sets: 2, durationSeconds: 20 },
      { name: 'Wall Slide (Bonus)', category: 'mobility' as const, defaultWeight: 'bodyweight' as const, sets: 1, reps: 10 },
      { name: 'Chin Tuck (Bonus)', category: 'mobility' as const, defaultWeight: 'bodyweight' as const, sets: 1, reps: 10 },
      { name: 'Hip Flexor Stretch (Bonus)', category: 'mobility' as const, defaultWeight: 'bodyweight' as const, sets: 1, durationSeconds: 30 }
    ]
  }
};

// Date helper in WIB / local time (forcing local dates)
export function getLocalDateString(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

// Convert Date string to pleasant Indonesian format (e.g. "27 Mei 2026")
export function formatIndoDate(dateStr: string): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = months[parseInt(parts[1], 10) - 1];
    const day = parseInt(parts[2], 10);
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

// 7-day weight average
export function get7DayWeightAverage(logs: DailyLog[], targetDateStr: string): number | null {
  if (!targetDateStr) return null;
  const targetDate = new Date(targetDateStr);
  if (isNaN(targetDate.getTime())) return null;
  
  const weights: number[] = [];
  
  // Sort logs by date descending
  const sortedUserLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  
  for (let i = 0; i < 7; i++) {
    const checkTime = targetDate.getTime() - i * 24 * 60 * 60 * 1000;
    if (isNaN(checkTime)) continue;
    const checkDate = new Date(checkTime);
    const checkDateStr = checkDate.toISOString().split('T')[0];
    const log = sortedUserLogs.find(l => l.date === checkDateStr);
    if (log?.weightWaist?.weight) {
      weights.push(log.weightWaist.weight);
    }
  }
  
  if (weights.length === 0) return null;
  const sum = weights.reduce((acc, w) => acc + w, 0);
  return Math.round((sum / weights.length) * 10) / 10;
}

// Get weight change compared to 7 days ago
export function getWeightChange(logs: DailyLog[]): { change: number; text: string } {
  const sorted = [...logs]
    .filter(l => l.weightWaist?.weight !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
    
  if (sorted.length < 2) {
    return { change: 0, text: 'Belum cukup data' };
  }
  
  const current = sorted[sorted.length - 1].weightWaist!.weight!;
  const previous = sorted[0].weightWaist!.weight!; // Compared to the oldest logged
  const diff = current - previous;
  const diffFormatted = diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`;
  return { change: diff, text: diffFormatted };
}

// Get waist change compared to first entry
export function getWaistChange(logs: DailyLog[]): { change: number; text: string } {
  const sorted = [...logs]
    .filter(l => l.weightWaist?.waist !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
    
  if (sorted.length < 2) {
    return { change: 0, text: 'Belum cukup data' };
  }
  
  const current = sorted[sorted.length - 1].weightWaist!.waist!;
  const first = sorted[0].weightWaist!.waist!;
  const diff = current - first;
  const diffFormatted = diff > 0 ? `+${diff.toFixed(1)} cm` : `${diff.toFixed(1)} cm`;
  return { change: diff, text: diffFormatted };
}

/// Rule status tracker:
// - "Lean bulk aman" if weight slowly increases and waist stable
// - "Mungkin kurang makan" if weight stuck 14 days and protein low
// - "Tambah kalori sedikit" if weight stuck 14 days but protein target achieved
// - "Perut naik terlalu cepat" if waist increases more than 1 cm in 2 weeks
export function getLeanBulkStatus(logs: DailyLog[], settings?: UserSettings | null): { status: string; color: string; desc: string } {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const logsWithWeight = sorted.filter(l => l.weightWaist?.weight !== undefined);
  const logsWithWaist = sorted.filter(l => l.weightWaist?.waist !== undefined);
  
  if (logsWithWeight.length < 2) {
    return { 
      status: 'Memulai Program', 
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/5', 
      desc: 'Silakan isi berat dan lingkar pinggang secara rutin untuk melihat tren.' 
    };
  }

  const latestWeight = logsWithWeight[logsWithWeight.length - 1].weightWaist!.weight!;
  const oldestWeight = logsWithWeight[0].weightWaist!.weight!;
  const weightDiff = latestWeight - oldestWeight;

  // Let's check waist increase in the last 14 days
  let waistIncreaseInc = 0;
  if (logsWithWaist.length >= 2) {
    try {
      const latestDateStr = logsWithWaist[logsWithWaist.length - 1].date;
      const latestDate = new Date(latestDateStr);
      if (!isNaN(latestDate.getTime())) {
        const latestWaist = logsWithWaist[logsWithWaist.length - 1].weightWaist!.waist!;
        const fourteenDaysAgo = new Date(latestDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];
        
        // Find closest entry in logs
        const approximateOlderLog = logsWithWaist.find(l => l.date >= fourteenDaysAgoStr) || logsWithWaist[0];
        if (approximateOlderLog) {
          waistIncreaseInc = latestWaist - approximateOlderLog.weightWaist!.waist!;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Check if weight is stuck (using 14 days check)
  let isWeightStuck14Days = false;
  if (logsWithWeight.length >= 2) {
    try {
      const latestDateStr = logsWithWeight[logsWithWeight.length - 1].date;
      const latestDate = new Date(latestDateStr);
      if (!isNaN(latestDate.getTime())) {
        const fourteenDaysAgo = new Date(latestDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];
        
        const approximateOlderLog = logsWithWeight.find(l => l.date >= fourteenDaysAgoStr) || logsWithWeight[0];
        if (approximateOlderLog) {
          const weightDiff14 = latestWeight - approximateOlderLog.weightWaist!.weight!;
          if (Math.abs(weightDiff14) < 0.2) {
            isWeightStuck14Days = true;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Calculate average protein over logs to see if low
  const totalDaysSample = Math.min(sorted.length, 7);
  let averageProtein = 0;
  if (totalDaysSample > 0) {
    const recentLogs = sorted.slice(-totalDaysSample);
    const sumProtein = recentLogs.reduce((acc, log) => {
      const mealProtein = log.meals.reduce((mAcc, m) => mAcc + m.total_protein_g, 0);
      const suppProtein = log.supplements.reduce((sAcc, s) => sAcc + s.protein_g, 0);
      return acc + mealProtein + suppProtein;
    }, 0);
    averageProtein = sumProtein / totalDaysSample;
  }

  const weightKg = settings?.profile.current_weight_kg || 58;
  const { target: targetProtein } = getTargetProtein(weightKg);

  // 1. Perut naik terlalu cepat
  if (waistIncreaseInc > 1.0) {
    return {
      status: 'Perut naik terlalu cepat',
      color: 'text-red-400 border-red-500/30 bg-red-500/5',
      desc: 'Lingkar pinggang naik > 1 cm dalam 2 minggu. Kurangi porsi L-Men Gain Mass harianmu, jangan full serving dulu.'
    };
  }

  // 2. Weight stuck but protein is low
  if (isWeightStuck14Days && averageProtein < targetProtein * 0.9) {
    return {
      status: 'Mungkin kurang makan',
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
      desc: `Berat stuck selama 14 hari terakhir dan konsumsi protein harianmu rata-rata masih rendah (di bawah target ±${targetProtein}g). Prioritaskan protein gap!`
    };
  }

  // 3. Weight stuck but protein target achieved
  if (isWeightStuck14Days && averageProtein >= targetProtein * 0.9) {
    return {
      status: 'Tambah kalori sedikit',
      color: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
      desc: `Protein sudah sesuai target (±${targetProtein}g) tapi berat stuck 14 hari. Tambah asupan kalori bersih sedikit (bisa dari nasi, tempe, atau 1/2 serving Gain Mass).`
    };
  }

  // 4. Lean bulk aman
  return {
    status: 'Lean bulk aman',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    desc: 'Bagus! Berat badan naik secara perlahan dan lingkar pinggang terkendali stabil. Jaga konsistensi latihan bebanmu.'
  };
}

// Daily action card logic
export function getDailyActionText(todayLogs: DailyLog, settings?: UserSettings | null): string {
  const totalProtein = todayLogs.meals.reduce((acc, m) => acc + m.total_protein_g, 0) +
                       todayLogs.supplements.reduce((acc, s) => acc + s.protein_g, 0);

  const weightKg = settings?.profile.current_weight_kg || 58;
  const { target: targetProtein } = getTargetProtein(weightKg);
  const remaining = targetProtein - totalProtein;

  if (remaining <= 0) {
    return `Target protein harianmu tercapai (±${targetProtein}g)! Nutrisi ototmu aman hari ini. Tinggal konsisten maksimalkan latihan beban.`;
  }

  return getProteinRecommendation(remaining);
}

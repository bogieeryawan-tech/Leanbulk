/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyLog, UserSettings } from './types';

/**
 * Calculates dynamic protein targets for lean bulk.
 * Default target is 1.6x body weight, upper is 2.0x body weight.
 */
export function getTargetProtein(weightKg: number) {
  const target = Math.round(weightKg * 1.6);
  const upper = Math.round(weightKg * 2.0);
  return {
    target,
    upper,
    rangeText: `±${target}–${upper}g`
  };
}

/**
 * Evaluates protein status based on percentage of target.
 */
export function getProteinStatus(consumedG: number, targetG: number): {
  status: "Protein kurang" | "Hampir cukup" | "Protein cukup" | "Protein tinggi, masih oke asal pencernaan aman";
  percentage: number;
} {
  if (targetG <= 0) {
    return { status: "Protein cukup", percentage: 100 };
  }
  const percentage = Math.round((consumedG / targetG) * 100);
  if (percentage < 70) {
    return { status: "Protein kurang", percentage };
  } else if (percentage >= 70 && percentage < 95) {
    return { status: "Hampir cukup", percentage };
  } else if (percentage >= 95 && percentage <= 120) {
    return { status: "Protein cukup", percentage };
  } else {
    return { status: "Protein tinggi, masih oke asal pencernaan aman", percentage };
  }
}

/**
 * Dynamically recommends protein sources based on magnitude of deficiency.
 */
export function getProteinRecommendation(remainingProteinG: number): string {
  if (remainingProteinG <= 0) {
    return "Target protein harian kamu sudah tercapai! Mantap brow!";
  }

  const roundedRemaining = Math.max(0, Math.round(remainingProteinG));

  if (roundedRemaining <= 25) {
    return `Kekurangan ±${roundedRemaining}g protein lagi. Opsi praktis: Cukup sikat 1 scoop whey protein (±22–25g protein) atau cemilin 2–3 butir telur rebus.`;
  } else if (roundedRemaining > 25 && roundedRemaining <= 45) {
    return `Kekurangan ±${roundedRemaining}g protein. Opsi praktis: Minum 1 scoop whey protein plus tambahkan makanan protein ringan seperti 2 butir telur atau 100g tempe goreng/rebus.`;
  } else {
    return `Protein kamu masih kurang ±${roundedRemaining}g. 1 scoop whey saja belum cukup. Rekomendasi kombinasi: Ambil 1 scoop whey, sikat nasi dengan lauk tinggi protein (porsi makan lengkap dengan ayam ±100g atau beef/ikan), plus selipkan telur/tempe biar makin padat otot!`;
  }
}

/**
 * Calculates consumed calories from meals and supplements.
 */
export function getConsumedCalories(todayLog: DailyLog): number {
  const foodCalories = todayLog.meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
  const suppCalories = todayLog.supplements.reduce((sum, s) => sum + (s.calories || 0), 0);
  return foodCalories + suppCalories;
}

/**
 * Calculates active exercise calories burned.
 * Standard weight workout is calculated based on completed exercises, plus any manually logged activities.
 */
export function getExerciseCalories(todayLog: DailyLog): number {
  let calories = 0;
  
  // 1. Sum from manually logged activities (like Padel, walking, etc.)
  if (todayLog.activities) {
    calories += todayLog.activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
  }
  
  // 2. Automatically estimate calories burned from dumbbells/weight training (latihan beban)
  if (todayLog.workout) {
    const score = todayLog.workout.workoutScore;
    const exercises = todayLog.workout.exercises || [];
    const completedExercises = exercises.filter(ex => ex.isCompleted);
    
    let workoutBurn = 0;
    if (completedExercises.length > 0) {
      // Precise calculation based on actual completed exercises, category, sets, and weight!
      completedExercises.forEach(ex => {
        const setsCount = ex.sets || 3;
        let baseKcal = 0;
        
        switch (ex.category) {
          case 'main':
            // Compound strength exercises like Goblet Squat, DB Romanian Deadlift, floor press
            if (ex.weight === '6kg') {
              baseKcal = 12; // 12 kcal per set
            } else if (ex.weight === '3kg') {
              baseKcal = 10;
            } else {
              baseKcal = 8; // bodyweight
            }
            break;
          case 'support':
            // Isolation exercises like curl, lateral raise, lunge
            if (ex.weight === '6kg' || ex.weight === '3kg') {
              baseKcal = 8;
            } else {
              baseKcal = 6;
            }
            break;
          case 'core':
            // Abs training like Plank, Abs Roll
            baseKcal = 5;
            break;
          case 'mobility':
          case 'bonus':
            // Mobility or warm up/stretching
            baseKcal = 3;
            break;
          default:
            baseKcal = 6;
        }
        
        workoutBurn += Math.round(baseKcal * setsCount);
      });
    } else if (score && score !== 'none') {
      // Fallback to workoutScore if exercises array is empty or not tracked
      if (score === 'full') workoutBurn = 250;
      else if (score === 'solid') workoutBurn = 200;
      else if (score === 'minimum_effective') workoutBurn = 150;
      else if (score === 'light') workoutBurn = 100;
      else if (score === 'mini_session') workoutBurn = 50;
    }
    calories += workoutBurn;
  }
  
  return calories;
}

/**
 * Calculates net calories (Consumed - Burned).
 */
export function getNetCalories(consumed: number, burned: number): number {
  return Math.max(0, consumed - burned);
}

/**
 * Evaluates calorie status suited for lean bulk goal.
 */
export function getCalorieStatus(consumed: number, target: number): {
  status: string;
  copy: string;
  percentage: number;
} {
  if (target <= 0) {
    return {
      status: "Kalori aman",
      copy: "Kalori pas mantap.",
      percentage: 100
    };
  }
  const percentage = Math.round((consumed / target) * 100);
  if (percentage < 60) {
    return {
      status: "Kalori terlalu rendah untuk lean bulk",
      copy: "Kalori masuk sangat minim brow, otot bisa seret berkembang. Tambah minimal porsi karbo + protein biar bertenaga!",
      percentage
    };
  } else if (percentage >= 60 && percentage < 85) {
    return {
      status: "Kalori masih kurang",
      copy: "Nutrisi harian masih defisit nih. Tambahkan karbohidrat padat gizi (seperti nasi putih, kentang) + lauk protein biar bertenaga.",
      percentage
    };
  } else if (percentage >= 85 && percentage <= 110) {
    return {
      status: "Kalori aman",
      copy: "Asupan kalori pas di range lean bulk! Pertahankan porsi seimbang ini biar bulking-nya bersih (otot naik, perut nggak buncit).",
      percentage
    };
  } else if (percentage > 110 && percentage <= 125) {
    return {
      status: "Surplus ringan, masih oke",
      copy: "Masuk fase surplus ringan. Bagus untuk nambah massa otot secara bertahap, tetap pantau lingkar pinggang harian ya.",
      percentage
    };
  } else {
    return {
      status: "Surplus tinggi, pantau perut dan berat badan",
      copy: "Surplus kalori agak over nih brow. Kurangi makanan manis/berminyak biar lemak nggak numpuk di perut yang bikin buncit.",
      percentage
    };
  }
}

/**
 * Advanced Padel Calorie Calculator based on Met 6.0, duration, weight, and player count.
 */
export function calculatePadelCalories(
  weightKg: number,
  durationMinutes: number,
  playerCount?: number
): {
  calories: number;
  activeFactor: number;
  note: string;
} {
  const durationHours = durationMinutes / 60;
  const met = 6.0;
  
  let activeFactor = 1.0;
  let hasPlayerCount = false;
  if (playerCount !== undefined && playerCount > 0) {
    hasPlayerCount = true;
    if (playerCount <= 4) {
      activeFactor = 1.0;
    } else {
      activeFactor = 4 / playerCount;
    }
  }
  
  if (activeFactor < 0.35) activeFactor = 0.35;
  if (activeFactor > 1.0) activeFactor = 1.0;
  
  const rawCalories = weightKg * met * durationHours * activeFactor;
  const calories = Math.round(rawCalories);
  
  let note = "Estimasi ini menganggap kamu main aktif penuh tanpa rotasi.";
  if (hasPlayerCount && playerCount! > 4) {
    note = "Dihitung berdasarkan berat badan, durasi, dan rotasi jumlah pemain. Karena ada rotasi, estimasi lebih rendah dibanding main full tanpa henti.";
  }
  
  return {
    calories,
    activeFactor,
    note
  };
}

/**
 * Creates casual, practical, non-panic daily quick insights.
 */
export function getDailyQuickInsight(
  consumedCalories: number,
  targetCalories: number,
  totalProtein: number,
  targetProtein: number
): string {
  const isProteinMet = totalProtein >= targetProtein;
  const isCaloriesLow = consumedCalories < targetCalories - 300;
  const isCaloriesHigh = consumedCalories > targetCalories + 300;
  const proteinDiff = Math.max(0, Math.round(targetProtein - totalProtein));
  const calorieDiff = Math.abs(Math.round(targetCalories - consumedCalories));

  if (totalProtein === 0 && consumedCalories === 0) {
    return "Masih kosong nih bro! Yuk catat makanan atau cemilan pertamamu hari ini biar target nutrisi kepantau.";
  }

  if (!isProteinMet && isCaloriesLow) {
    return `Protein masih kurang ±${proteinDiff}g, dan kalori harianmu juga masih santai (kurang ±${calorieDiff} kkal). ${getProteinRecommendation(proteinDiff)} Tetap imbungi karbohidrat biar latihan padel atau bebanmu makin bertenaga!`;
  }
  
  if (!isProteinMet && isCaloriesHigh) {
    return `Asupan protein kurang ±${proteinDiff}g tapi kalori udah surplus ±${calorieDiff} kkal. Cari cemilan protein murni minim kalori saja ya (contoh: Putih telur, whey isolate, dada ayam tanpa kulit) biar lemak perut tetap terjaga.`;
  }
  
  if (!isProteinMet) {
    return `Secara kalori asukanmu pas mantap! Cukup kejar sisa protein ±${proteinDiff}g lagi biar recovery otot dari latihan harian berjalan lancar. ${getProteinRecommendation(proteinDiff)}`;
  }
  
  if (isProteinMet && isCaloriesLow) {
    return `Target protein aman bro! Tapi kalori makanmu masih kurang ±${calorieDiff} kkal untuk dukung lean bulk. Masih ada celah buat nambah energi, coba selipin buah atau susu gainer sore/malam sebelum tidur.`;
  }
  
  if (isProteinMet && isCaloriesHigh) {
    return `Protein mantap kelar! Kalori sedikit surplus ±${calorieDiff} kkal dari target, masih aman terkendali. Agar lean bulk bersih tanpa perut majuan, sikat aktivitas harian santai aja (contoh jalan kaki ringan).`;
  }

  return "Perfect! Kalori & Protein hari ini tepat di sweet spot lean bulk. Serat otot terpenuhi, kalori pas, perut pun aman dari buncit. Pertahankan, bro!";
}

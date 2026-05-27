/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MealFoodItem {
  name: string;
  estimated_portion: string;
  protein_g: number;
  calories: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
}

export interface FoodScanResult {
  meal_name: string;
  detected_foods: MealFoodItem[];
  total_protein_g: number;
  total_calories: number;
  total_carbs_g: number;
  total_fat_g: number;
  confidence: "low" | "medium" | "high";
  short_feedback: string;
  lean_bulk_advice: string;
}

export interface SupplementLog {
  id: string;
  time: string; // HH:MM
  type: "platinum_whey" | "gain_mass_half" | "gain_mass_full";
  name: string;
  protein_g: number;
  calories: number;
}

export interface WeightWaistLog {
  weight?: number; // kg
  waist?: number;  // cm
}

export interface WorkoutLog {
  templateType: "shoulder_posture" | "chest_upper" | "core_padel" | "custom";
  isDone: boolean;
  difficulty: "easy" | "medium" | "hard" | "failed" | "";
  notes: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: FoodScanResult[];
  supplements: SupplementLog[];
  weightWaist?: WeightWaistLog;
  workout?: WorkoutLog;
  summaryText?: string; // Cache the Gemini daily summary
}

export interface BodyProgressAnalysis {
  visual_summary: string;
  body_progress_score: number;
  muscle_visual_change: {
    shoulders: "less" | "same" | "better" | "much_better";
    chest: "less" | "same" | "better" | "much_better";
    back: "less" | "same" | "better" | "much_better";
    arms: "less" | "same" | "better" | "much_better";
    waist_belly: "smaller" | "stable" | "slightly_bigger" | "too_much_bigger";
    posture: "worse" | "same" | "better" | "much_better";
  };
  confidence: "low" | "medium" | "high";
  progress_status: "on_track" | "need_more_protein" | "need_more_calories" | "reduce_gain_mass" | "improve_training" | "maintain_plan";
  main_issue: string;
  next_action: string;
  simple_message: string;
}

export interface BodyProgressEntry {
  id: string;
  date: string;
  frontPhoto?: string; // base64
  sidePhoto?: string; // base64
  backPhoto?: string; // base64
  weight: number;
  waist: number;
  note?: string;
  analysis?: BodyProgressAnalysis;
}

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface UserProfile {
  name: string;
  gender: string;
  height: number; // cm
  weight: number; // kg
  goal: string;
  targetType: string;
  proteinTargetMin: number;
  proteinTargetMax: number;
  weightGainTargetMin: number; // per month
  weightGainTargetMax: number;
  supplements: string[];
  equipment: string[];
  mainConcern: string;
}

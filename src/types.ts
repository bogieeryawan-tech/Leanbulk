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

export interface WorkoutExercise {
  name: string;
  category: "main" | "support" | "core" | "mobility" | "bonus";
  isCompleted: boolean;
  isSkipped: boolean;
  skipReason?: "capek" | "waktu_habis" | "sakit" | "tidak_sempat" | "lainnya" | string;
  weight?: "bodyweight" | "3kg" | "6kg" | "custom";
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  difficulty?: "easy" | "medium" | "hard" | "failed" | "";
}

export interface WorkoutLog {
  templateType: "plan_a" | "plan_b" | "recovery" | "custom";
  workoutScore: "none" | "mini_session" | "light" | "minimum_effective" | "solid" | "full";
  isDone: boolean;
  difficulty: "easy" | "medium" | "hard" | "failed" | "";
  notes: string;
  exercises: WorkoutExercise[];
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: FoodScanResult[];
  supplements: SupplementLog[];
  activities?: { id: string; time: string; name: string; duration_minutes: number; calories_burned: number; }[];
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

export interface UserSettings {
  profile: {
    nickname: string;
    gender: 'male' | 'female';
    height_cm: number;
    starting_weight_kg: number;
    current_weight_kg: number;
    starting_waist_cm: number;
    current_waist_cm: number;
    training_level: 'beginner' | 'intermediate';
  };
  goal: {
    goal_type: 'lean_bulk' | 'body_recomposition' | 'maintain' | 'mini_cut';
    target_weight_kg: number;
    waist_limit_cm: number;
    target_gain_min_kg_per_month: number;
    target_gain_max_kg_per_month: number;
    protein_multiplier_min: number;
    protein_multiplier_max: number;
    timeline_preference: 'relaxed' | 'normal' | 'aggressive';
  };
  equipment: string[];
  supplements: string[];
}

export interface GoalHistoryEntry {
  id: string;
  date: string;
  old_target_kg: number;
  new_target_kg: number;
  reason: string;
  ai_suggestion?: string;
}


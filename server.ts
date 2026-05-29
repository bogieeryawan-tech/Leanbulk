/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Set bigger payload limits for base64 food images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Gemini SDK with telemetry header and apiKey
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cache for Chat sessions to keep it simple, or handle history on client
// Let's handle history on client so the server remains stateless and robust! This is the standard API route design.

function applyNutritionGuardrails(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (!data.detected_foods || !Array.isArray(data.detected_foods)) {
    data.detected_foods = [];
  }

  const mealNameLower = (data.meal_name || "").toLowerCase();

  let totalProtein = 0;
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  data.detected_foods.forEach((food: any) => {
    if (!food || typeof food !== 'object') return;
    
    const nameLower = (food.name || "").toLowerCase();
    if (!food.assumptions || !Array.isArray(food.assumptions)) {
      food.assumptions = [];
    }

    // Gula detection for calorie mapping (C)
    const isSugarIndicated = nameLower.includes("gula") || nameLower.includes("aren") || nameLower.includes("sirup") || nameLower.includes("manis");

    // Check if contains dairy milk / creamer / whey etc
    const hasSusuOrProteinOptions = (
      nameLower.includes("susu") || 
      nameLower.includes("milk") || 
      nameLower.includes("creamer") || 
      nameLower.includes("cream") || 
      nameLower.includes("whey") || 
      nameLower.includes("protein") || 
      nameLower.includes("gainer") ||
      mealNameLower.includes("susu") ||
      mealNameLower.includes("milk") ||
      mealNameLower.includes("creamer") ||
      mealNameLower.includes("cream") ||
      mealNameLower.includes("whey") ||
      mealNameLower.includes("protein") ||
      mealNameLower.includes("gainer")
    );

    // Rule A: Kopi hitam / Americano / Long Black / Kopi Gula Aren / Kopi Hitam Gula Aren without Susu/Protein
    const isKopiHitamPattern = (
      nameLower.includes("kopi hitam") || 
      nameLower.includes("americano") || 
      nameLower.includes("long black") || 
      nameLower.includes("kopi gula aren") || 
      nameLower.includes("kopi hitam gula aren") ||
      mealNameLower.includes("kopi hitam") ||
      mealNameLower.includes("americano") ||
      mealNameLower.includes("long black") ||
      mealNameLower.includes("kopi gula aren") ||
      mealNameLower.includes("kopi hitam gula aren")
    ) && !hasSusuOrProteinOptions;

    // Rule B: Minuman manis tanpa susu
    const isMinumanManisTanpaSusuPattern = (
      nameLower.includes("teh manis") || 
      nameLower.includes("es teh manis") || 
      nameLower.includes("soda") || 
      nameLower.includes("sirup") || 
      nameLower.includes("minuman gula") ||
      isKopiHitamPattern
    ) && !hasSusuOrProteinOptions;

    // Apply Rule A & B: protein must be 0
    if (isKopiHitamPattern || isMinumanManisTanpaSusuPattern) {
      food.protein_g = 0;
      food.source_type = "estimated_common_food";
      if (!food.assumptions.some((a: string) => a.toLowerCase().includes("protein 0g"))) {
        food.assumptions.push("Kopi hitam tanpa susu/creamer diasumsikan protein 0g.");
      }
    }

    // Rule C: Kalori Gula (calories minimal = gram gula x 4 or carbs_g x 4 if it is a sugary drink)
    if (isSugarIndicated && (food.carbs_g || 0) > 0) {
      const minCals = Math.round((food.carbs_g || 0) * 4);
      if ((food.calories || 0) < minCals) {
        food.calories = minCals;
      }
    }

    // Rule D: Kopi Susu
    const isKopiSusuPattern = (
      nameLower.includes("kopi susu") || 
      nameLower.includes("latte") || 
      nameLower.includes("cappuccino") || 
      nameLower.includes("milk coffee") || 
      nameLower.includes("susu")
    ) && !(
      nameLower.includes("non-dairy") || 
      nameLower.includes("almond") || 
      nameLower.includes("oat") || 
      nameLower.includes("soy") ||
      nameLower.includes("tempe") || 
      nameLower.includes("tahu")
    );

    if (isKopiSusuPattern) {
      if ((food.protein_g || 0) === 0) {
        food.protein_g = 4; // default 3-6g
      }
      if ((food.calories || 0) < 120) {
        food.calories = 140; // default 120-180 kkal
      }
      if (!food.assumptions.some((a: string) => a.includes("kopi susu diasumsikan"))) {
        food.assumptions.push("Kopi susu diasumsikan memakai susu sekitar 120–150ml.");
      }
    }

    // Rule F: Telur must have protein
    if (nameLower.includes("telur") || nameLower.includes("egg")) {
      if ((food.protein_g || 0) <= 0) {
        food.protein_g = 6;
      }
      if ((food.calories || 0) <= 0) {
        food.calories = 75;
      }
    }

    // Rule G: Whey/Gainer must have protein
    const isWhey = nameLower.includes("whey") || nameLower.includes("protein powder") || nameLower.includes("l-men platinum") || nameLower.includes("wpi");
    const isGainer = nameLower.includes("gainer") || nameLower.includes("l-men gain mass") || nameLower.includes("gain mass");

    if (isWhey) {
      if ((food.protein_g || 0) < 20) {
        food.protein_g = 25;
      }
      if ((food.calories || 0) <= 0) {
        food.calories = 120;
      }
    } else if (isGainer) {
      if ((food.protein_g || 0) < 10) {
        food.protein_g = 22;
      }
      if ((food.calories || 0) <= 0) {
        food.calories = 280;
      }
    }

    // Rule E: Kalori tidak boleh 0 jika ada bahan berkalori
    const hasCalorieDenseIng = (
      nameLower.includes("nasi") ||
      nameLower.includes("mie") || 
      nameLower.includes("tepung") || 
      nameLower.includes("gula") || 
      nameLower.includes("susu") || 
      nameLower.includes("minyak") || 
      nameLower.includes("santan") || 
      nameLower.includes("roti") || 
      nameLower.includes("goreng") || 
      nameLower.includes("rendang") ||
      nameLower.includes("ayam") ||
      nameLower.includes("daging")
    );

    if (hasCalorieDenseIng && (food.calories || 0) <= 0) {
      const calculatedCals = Math.round((food.protein_g || 0) * 4 + (food.carbs_g || 0) * 4 + (food.fat_g || 0) * 9);
      food.calories = calculatedCals > 0 ? calculatedCals : 100;
    }

    // Ensure source_type is set
    if (!food.source_type) {
      if (isKopiSusuPattern || isMinumanManisTanpaSusuPattern || isSugarIndicated) {
        food.source_type = "estimated_common_food";
      } else {
        food.source_type = "fallback_estimate";
      }
    }

    totalProtein += food.protein_g || 0;
    totalCalories += food.calories || 0;
    totalCarbs += food.carbs_g || 0;
    totalFat += food.fat_g || 0;
  });

  // Assign overall total summaries
  data.total_protein_g = Math.round(totalProtein);
  data.total_calories = Math.round(totalCalories);
  data.total_carbs_g = Math.round(totalCarbs);
  data.total_fat_g = Math.round(totalFat);

  // Global properties setup
  if (!data.source_type) {
    const types = data.detected_foods.map((f: any) => f.source_type).filter(Boolean);
    if (types.includes("fallback_estimate")) {
      data.source_type = "fallback_estimate";
    } else if (types.includes("estimated_common_food")) {
      data.source_type = "estimated_common_food";
    } else if (types.includes("ai_search")) {
      data.source_type = "ai_search";
    } else if (types.includes("user_input")) {
      data.source_type = "user_input";
    } else {
      data.source_type = "estimated_common_food";
    }
  }

  if (!data.assumptions || !Array.isArray(data.assumptions)) {
    data.assumptions = [];
  }

  // Populate overall assumptions from food items
  data.detected_foods.forEach((food: any) => {
    if (food.assumptions && Array.isArray(food.assumptions)) {
      food.assumptions.forEach((ass: string) => {
        if (!data.assumptions.includes(ass)) {
          data.assumptions.push(ass);
        }
      });
    }
  });

  // Top level kopi hitam checking to double safeguard protein 0g
  const matchesKopiHitamTopLevel = (
    mealNameLower.includes("kopi hitam") || 
    mealNameLower.includes("americano") || 
    mealNameLower.includes("long black") || 
    mealNameLower.includes("kopi gula aren") || 
    mealNameLower.includes("kopi hitam gula aren")
  ) && !(
    mealNameLower.includes("susu") || 
    mealNameLower.includes("milk") || 
    mealNameLower.includes("creamer") || 
    mealNameLower.includes("cream") || 
    mealNameLower.includes("whey") || 
    mealNameLower.includes("protein") || 
    mealNameLower.includes("gainer")
  );

  if (matchesKopiHitamTopLevel) {
    data.total_protein_g = 0;
    if (!data.assumptions.includes("Kopi hitam tanpa susu/creamer diasumsikan protein 0g.")) {
      data.assumptions.push("Kopi hitam tanpa susu/creamer diasumsikan protein 0g.");
    }
  }

  if (data.needs_clarification === undefined) {
    data.needs_clarification = data.detected_foods.some((f: any) => f.needs_clarification);
  }

  return data;
}

// --- API Endpoints ---
// 1. Food Photo Scanner Endpoint
app.post('/api/gemini/analyze-food', async (req, res) => {
  try {
    const { image, note } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Data gambar makanan tidak ditemukan' });
    }

    // Process base64 image
    let mimeType = 'image/jpeg';
    let base64Data = image;

    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const promptText = `Kamu adalah ahli gizi olahraga khusus untuk program Lean Bulk / Recomposing otot pemula di Indonesia.
Analisis gambar hidangan makanan ini secara cermat.
Catatan dari pengguna untuk hidangan ini: "${note || 'Tidak ada catatan tambahan'}".

Tugas utama:
1. Identifikasi nama makanan/hidangan.
2. Identifikasi setiap bahan makanan yang terlihat beserta perkiraan ukurannya.
3. Estimasikan kandungan nutrisi (protein, kalori, karbohidrat, lemak) untuk tiap bahan.
4. Hitung total nutrisi untuk hidangan tersebut secara keseluruhan.
5. Berikan feedback singkat yang memotivasi dan ramah dalam Bahasa Indonesia.
6. Berikan saran porsi atau tambahan lauk cerdas untuk mendukung program Lean Bulk agar porsi protein optimal.

Gunakan standar kandungan protein umum Indonesia:
- 1 butir telur = 6 g protein
- 100g tempe = 18 g protein
- 100g tahu = 8 g protein
- 100g dada ayam = 30 g protein
- 1 scoop Whey Protein / WPI / L-Men Platinum = 25 g protein
- 1 serving Gainer / L-Men Gain Mass = 22 g protein
- 1 gelas susu sapi = 8 g protein
- Nasi putih/merah dominan karbohidrat (estimasi karbohidrat tinggi, rata-rata proteinnya kecil 2-3g per porsi).

ATURAN GIZI & PENGAMANAN PENTING (DIKECUALIKAN & KHUSUS):
1. Minuman Tanpa Protein: Jika makanan yang dianalisis atau ditulis berupa minuman non-protein (seperti kopi hitam, teh manis, air mineral, teh tawar, soda, teh boba manis tanpa susu/protein):
   - Set total_protein_g secara mutlak ke 0.
   - Di short_feedback & lean_bulk_advice, berikan feedback yang ramah dalam Bahasa Indonesia bahwa minuman ini tidak menyumbang protein untuk sintesis otot, namun ingatkan asupan kalori cairnya (jika berupa kopi/teh manis/minuman manis karena mengandung gula tinggi/kalori cair yang perlu diperhatikan saat lean bulk).
2. Minuman Protein/Whey/Gainer: Jika masukan/gambar berupa "protein shake", "WPI", "whey protein", atau brand gainer/suplemen komersil lainnya, petakan kandungan proteinnya secara optimis (misalnya 22-25g protein per scoop/serving).
3. Gambar Tidak Relevan: Jika gambar yang dikirim kosong, blur parah, atau tidak relevan dengan makanan/minuman sama sekali (misalnya foto kucing, anjing, sepatu, mobil, atau dinding polos):
   - Set confidence ke "low".
   - Set meal_name ke "Gambar Tidak Terdeteksi".
   - Set total_protein_g secara mutlak ke 0.
   - Set total_calories secara mutlak ke 0.
   - Set total_carbs_g secara mutlak ke 0.
   - Set total_fat_g secara mutlak ke 0.
   - Set short_feedback ke "Mohon kirimkan foto makanan yang jelas agar pelatih bisa mengestimasikan kalorinya dengan akurat!"
   - Set lean_bulk_advice ke "Pelatih tidak mendeteksi makanan atau minuman yang valid pada foto. Kamu bisa mencoba berfoto ulang atau menggunakan fitur input teks (Ketik Manual Saja) untuk mencatat nutrisi hari ini."

Aturan Tambahan:
- Beritahu pengguna jika tingkat keyakinan porsi atau bahan di gambar rendah, nyatakan lewat tingkat konformasi "low", dan minta pengguna untuk menyesuaikannya porsi tersebut.
- Jangan mengklaim tingkat akurasi 100% karena ini murni berbasis analisis gambar cerdas (tampilkan "estimasi" bukan kepastian).
- Isi metadata "source_type", "assumptions", dan "needs_clarification" pada level item (detected_foods) dan root sesuai kondisi analisis:
  - source_type: "user_input" (jika detail didikte langsung oleh user), "estimated_common_food" (makanan umum Indonesia, porsi diestimasi dari gambar), "ai_search" (produk branded/franchise/minuman kemasan berdasarkan prior knowledge/search AI), atau "fallback_estimate" (data sangat buram/tidak jelas).
  - assumptions: daftar asumsi eksplisit (array string), contoh "Nasi diasumsikan 150g.", "Gula aren kopi diasumsikan 12g."
  - needs_clarification: boolean, set ke true jika data kurang meyakinkan dan butuh klarifikasi user.
- Kembalikan response dalam bentuk structured JSON sesuai schema yang telah ditentukan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meal_name: { 
              type: Type.STRING, 
              description: 'Nama hidangan yang terdeteksi, misalnya "Nasi Ayam Bakar & Tempe"' 
            },
            detected_foods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Nama bahan makanan, misal: "Dada Ayam Bakar"' },
                  estimated_portion: { type: Type.STRING, description: 'Perkiraan ukuran porsi, misal: "1 potong sedang (sekitar 100g)"' },
                  protein_g: { type: Type.NUMBER, description: 'Estimasi protein dalam gram' },
                  calories: { type: Type.NUMBER, description: 'Estimasi kalori' },
                  carbs_g: { type: Type.NUMBER, description: 'Estimasi karbohidrat dalam gram' },
                  fat_g: { type: Type.NUMBER, description: 'Estimasi lemak dalam gram' },
                  confidence: { type: Type.STRING, description: 'Harus "low", "medium", atau "high"' },
                  source_type: { type: Type.STRING, description: '"user_input" | "estimated_common_food" | "ai_search" | "fallback_estimate"' },
                  assumptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Asumsi porsi atau bahan' },
                  needs_clarification: { type: Type.BOOLEAN, description: 'Klarifikasi porsi/bahan' }
                },
                required: ['name', 'estimated_portion', 'protein_g', 'calories', 'carbs_g', 'fat_g', 'confidence']
              }
            },
            total_protein_g: { type: Type.NUMBER, description: 'Total protein dari seluruh bahan makanan' },
            total_calories: { type: Type.NUMBER, description: 'Total kalori dari seluruh bahan makanan' },
            total_carbs_g: { type: Type.NUMBER, description: 'Total karbohidrat dalam gram' },
            total_fat_g: { type: Type.NUMBER, description: 'Total lemak dalam gram' },
            confidence: { type: Type.STRING, description: 'Tingkat keyakinan deteksi keseluruhan: "low", "medium", atau "high"' },
            short_feedback: { type: Type.STRING, description: 'Masukan singkat, santai dan ramah tentang makanan ini dalam Bahasa Indonesia.' },
            lean_bulk_advice: { type: Type.STRING, description: 'Saran porsi tambahan atau suplemen pendukung spesifik untuk program lean bulk (misalnya tambah telur setengah matang atau kurangi karbo berlebih) dalam Bahasa Indonesia.' },
            source_type: { type: Type.STRING, description: '"user_input" | "estimated_common_food" | "ai_search" | "fallback_estimate"' },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Asumsi utama analisis hidangan' },
            needs_clarification: { type: Type.BOOLEAN, description: 'Butuh klarifikasi keseluruhan' }
          },
          required: ['meal_name', 'detected_foods', 'total_protein_g', 'total_calories', 'total_carbs_g', 'total_fat_g', 'confidence', 'short_feedback', 'lean_bulk_advice']
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(applyNutritionGuardrails(parsedData));

  } catch (error: any) {
    console.error('Error analyzing food image:', error);
    return res.status(500).json({ error: 'Gagal menganalisis gambar makanan: ' + (error.message || error) });
  }
});

// 1b. Food Text-Only Analyzer Endpoint
app.post('/api/gemini/analyze-food-text', async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Catatan makanan tidak boleh kosong' });
    }

    const promptText = `Kamu adalah ahli gizi olahraga khusus untuk program Lean Bulk / Recomposing otot pemula di Indonesia.
Kamu diminta menganalisis catatan deskripsi hidangan makanan yang diinput langsung oleh pengguna.
Catatan hidangan makanan: "${note}".

Tugas utama:
1. Identifikasi nama makanan/hidangan dari teks tersebut.
2. Identifikasi setiap bahan makanan yang ditulis beserta perkiraan ukurannya.
3. Estimasikan kandungan nutrisi (protein, kalori, karbohidrat, lemak) untuk tiap bahan.
4. Hitung total nutrisi untuk hidangan tersebut secara keseluruhan.
5. Berikan feedback singkat yang memotivasi dan ramah dalam Bahasa Indonesia.
6. Berikan saran porsi atau tambahan lauk cerdas untuk mendukung program Lean Bulk agar porsi protein optimal.

Gunakan standar kandungan protein umum Indonesia:
- 1 butir telur = 6 g protein
- 100g tempe = 18 g protein
- 100g tahu = 8 g protein
- 100g dada ayam = 30 g protein
- 1 scoop Whey Protein / WPI / L-Men Platinum = 25 g protein
- 1 serving Gainer / L-Men Gain Mass = 22 g protein
- 1 gelas susu sapi = 8 g protein
- Nasi putih/merah dominan karbohidrat (estimasi karbohidrat tinggi, rata-rata proteinnya kecil 2-3g per porsi).

ATURAN GIZI & PENGAMANAN PENTING (DIKECUALIKAN & KHUSUS):
1. Minuman Tanpa Protein: Jika makanan yang dianalisis atau ditulis berupa minuman non-protein (seperti kopi hitam, teh manis, air mineral, teh tawar, soda, teh boba manis tanpa susu/protein):
   - Set total_protein_g secara mutlak ke 0.
   - Di short_feedback & lean_bulk_advice, berikan feedback yang ramah dalam Bahasa Indonesia bahwa minuman ini tidak menyumbang protein untuk sintesis otot, namun ingatkan asupan kalori cairnya (jika berupa kopi/teh manis/minuman manis karena mengandung gula tinggi/kalori cair yang perlu diperhatikan saat lean bulk).
2. Minuman Protein/Whey/Gainer: Jika masukan/gambar berupa "protein shake", "WPI", "whey protein", atau brand gainer/suplemen komersil lainnya, petakan kandungan proteinnya secara optimis (misalnya 22-25g protein per scoop/serving).

Aturan Tambahan:
- Berikan penanda "high" pada confidence karena input teks merupakan konfirmasi langsung dari pengguna tentang apa yang dimakannya.
- Jangan mengklaim tingkat akurasi 100% karena ini murni berbasis analisis deskripsi teks pintar.
- Isi metadata "source_type", "assumptions", dan "needs_clarification" pada level item (detected_foods) dan root sesuai kondisi analisis:
  - source_type: "user_input" (jika detail didikte langsung oleh user), "estimated_common_food" (makanan umum Indonesia, porsi diestimasi dari teks), "ai_search" (produk branded/franchise/minuman kemasan berdasarkan prior knowledge/search AI), atau "fallback_estimate" (data sangat tidak jelas).
  - assumptions: daftar asumsi eksplisit (array string), contoh "Nasi diasumsikan 150g.", "Gula aren kopi diasumsikan 12g."
  - needs_clarification: boolean, set ke true jika data kurang meyakinkan dan butuh klarifikasi user.
- Kembalikan response dalam bentuk structured JSON sesuai schema yang telah ditentukan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: promptText }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meal_name: { 
              type: Type.STRING, 
              description: 'Nama hidangan yang terdeteksi, misalnya "Nasi Ayam Bakar & Tempe"' 
            },
            detected_foods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Nama bahan makanan, misal: "Dada Ayam Bakar"' },
                  estimated_portion: { type: Type.STRING, description: 'Perkiraan ukuran porsi, misal: "1 potong sedang (sekitar 100g)"' },
                  protein_g: { type: Type.NUMBER, description: 'Estimasi protein dalam gram' },
                  calories: { type: Type.NUMBER, description: 'Estimasi kalori' },
                  carbs_g: { type: Type.NUMBER, description: 'Estimasi karbohidrat dalam gram' },
                  fat_g: { type: Type.NUMBER, description: 'Estimasi lemak dalam gram' },
                  confidence: { type: Type.STRING, description: 'Harus "low", "medium", atau "high"' },
                  source_type: { type: Type.STRING, description: '"user_input" | "estimated_common_food" | "ai_search" | "fallback_estimate"' },
                  assumptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Asumsi porsi atau bahan' },
                  needs_clarification: { type: Type.BOOLEAN, description: 'Klarifikasi porsi/bahan' }
                },
                required: ['name', 'estimated_portion', 'protein_g', 'calories', 'carbs_g', 'fat_g', 'confidence']
              }
            },
            total_protein_g: { type: Type.NUMBER, description: 'Total protein dari seluruh bahan makanan' },
            total_calories: { type: Type.NUMBER, description: 'Total kalori dari seluruh bahan makanan' },
            total_carbs_g: { type: Type.NUMBER, description: 'Total karbohidrat dalam gram' },
            total_fat_g: { type: Type.NUMBER, description: 'Total lemak dalam gram' },
            confidence: { type: Type.STRING, description: 'Tingkat keyakinan deteksi keseluruhan: "low", "medium", atau "high"' },
            short_feedback: { type: Type.STRING, description: 'Masukan singkat, santai dan ramah tentang makanan ini dalam Bahasa Indonesia.' },
            lean_bulk_advice: { type: Type.STRING, description: 'Saran porsi tambahan atau suplemen pendukung spesifik untuk program lean bulk (misalnya tambah telur setengah matang atau kurangi karbo berlebih) dalam Bahasa Indonesia.' },
            source_type: { type: Type.STRING, description: '"user_input" | "estimated_common_food" | "ai_search" | "fallback_estimate"' },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Asumsi utama analisis hidangan' },
            needs_clarification: { type: Type.BOOLEAN, description: 'Butuh klarifikasi keseluruhan' }
          },
          required: ['meal_name', 'detected_foods', 'total_protein_g', 'total_calories', 'total_carbs_g', 'total_fat_g', 'confidence', 'short_feedback', 'lean_bulk_advice']
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(applyNutritionGuardrails(parsedData));

  } catch (error: any) {
    console.error('Error analyzing food text:', error);
    return res.status(500).json({ error: 'Gagal menganalisis catatan makanan: ' + (error.message || error) });
  }
});

// 2. AI Coach Query Endpoint
app.post('/api/gemini/coach-query', async (req, res) => {
  try {
    const { messages, settings, todayLog } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Format riwayat chat tidak valid' });
    }

    let systemInstruction = `Kamu adalah 'Lean Bulk AI Coach', seorang pelatih personal fitness dan nutrisi untuk program lean bulking.`;
    
    if (settings) {
      const minProtein = Math.round((settings.profile.current_weight_kg * settings.goal.protein_multiplier_min) / 5) * 5;
      const maxProtein = Math.round((settings.profile.current_weight_kg * settings.goal.protein_multiplier_max) / 5) * 5;
      
      systemInstruction = `Kamu adalah 'Lean Bulk AI Coach', seorang pelatih personal fitness dan nutrisi untuk program ${settings.goal.goal_type.replace('_', ' ')} di Indonesia. Kamu menganut konsep body recomposition yang praktis. 

Profil Lengkap Pengguna:
- Nama/Panggilan: ${settings.profile.nickname || 'Pengguna'}
- Jenis Kelamin: ${settings.profile.gender === 'male' ? 'Pria' : 'Wanita'}
- Tinggi Badan: ${settings.profile.height_cm} cm
- Berat Badan Sekarang: ${settings.profile.current_weight_kg} kg
- Target Berat Badan: ${settings.goal.target_weight_kg} kg
- Lingkar Pinggang Sekarang: ${settings.profile.current_waist_cm} cm
- Batas Pinggang: ${settings.goal.waist_limit_cm} cm
- Golongan Latihan: ${settings.profile.training_level === 'beginner' ? 'Pemula' : 'Menengah'}
- Goal Utama: ${settings.goal.goal_type.replace('_', ' ')}
- Target Protein Harian: ${minProtein} - ${maxProtein} gram per hari.
- Target Kenaikan/Penurunan Berat: ${settings.goal.target_gain_min_kg_per_month} - ${settings.goal.target_gain_max_kg_per_month} kg per bulan.
- Alat Latihan di Rumah: ${settings.equipment.join(', ') || 'Moda bodyweight'}.
- Suplemen Saat Ini: ${settings.supplements.join(', ') || 'Tidak ada'}.

Status Latihan Terakhir (Hari Ini):
${todayLog?.workout ? `
- Template: ${todayLog.workout.templateType}
- Status Selesai?: ${todayLog.workout.isDone ? 'Ya (Target tercapai)' : 'Belum (Target belum tercapai)'}
- Notes Latihan: ${todayLog.workout.notes || 'Tidak ada'}
- Overall Difficulty: ${todayLog.workout.difficulty}
- Detail Gerakan:\n${todayLog.workout.exercises?.map((ex: any) => `  * ${ex.name} (${ex.category}): ${ex.isCompleted ? 'SELESAI' : (ex.isSkipped ? 'SKIP' : 'Belum')} - Alat: ${ex.weight}, Sets: ${ex.sets}, Feel: ${ex.difficulty || '-'}`).join('\n') || 'Tidak ada detail.'}
` : 'Belum ada data latihan dicatat hari ini.'}

Aturan Mutlak Menjawab:
1. Bahasa Indonesia: Gunakan bahasa yang santai, bersahabat, penuh energi, memotivasi, dan tidak kaku (seperti mengobrol dengan personal trainer favorit).
2. Singkat & Praktis: Batasi jawaban maksimal 2-3 paragraf pendek atau berpoin. Anak muda pemula tidak suka membaca teks medis/ilmiah teorotis yang panjang lebar.
3. Prioritas Protein: Selalu tekankan pentingnya mencukupi target protein harian melalui real food dulu (telur, tempe, tahu, ayam).
4. Penggunaan Kalori Extra (Gain Mass / Karbo): Jelaskan bahwa kalori ekstra bukanlah kewajiban harian tanpa kontrol. Jika berat stuck tapi perut aman, boleh ditingkatkan sedikit.
5. Perut Buncit / Lemak Naik Cepat: Jika pengguna khawatir perutnya buncit bertambah, sarankan untuk kurangi asupan karbo/gainer dan fokus ke makanan utuh tinggi protein serta progres latihan beban.
6. Ingatkan Estimasi: Pemindaian foto makanan hanya memberi estimasi, bukan angka mutlak.
7. Latihan beban: Maksimalkan penggunaan alat yang dimiliki pengguna. Jika bahas hasil workout:
   - Jika selesai 3 gerakan: bilang "Minimum efektif sudah kena."
   - Jika selesai 4-5 gerakan: bilang "Latihan solid."
   - Jika Plank/Core sering skip: ingatkan "Core finisher jangan sering diskip, ini bantu jaga perut dan postur."
   - Jika repetisi dengan alat sama terasa 'easy', sarankan "tambah reps dulu atau naik perlahan ke 6kg/beban berat."
   - Jika latihan 'failed' atau gemetar (shaky), sarankan "stay di beban sekarang dan banyakin istirahat antar set."`;
    }

    // Process chat history into format required by SDK or generateContent
    // We can use generateContent with conversational contents array
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.parts[0]?.text || '' }]
      })),
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ text: response.text });

  } catch (error: any) {
    console.error('Error in coach query:', error);
    return res.status(500).json({ error: 'Gagal menghubungi AI Coach: ' + (error.message || error) });
  }
});

// 2b. AI Body Progress Check Endpoint
app.post('/api/gemini/analyze-body-progress', async (req, res) => {
  try {
    const { frontPhoto, sidePhoto, backPhoto, weight, waist, note, previousEntry } = req.body;

    const parts: any[] = [];

    // Helper to extract clean base64 data and mimeType
    const addPhotoPart = (photoBase64: string, name: string) => {
      let mimeType = 'image/jpeg';
      let cleanData = photoBase64;
      const match = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanData = match[2];
      }
      parts.push({
        inlineData: {
          mimeType,
          data: cleanData
        }
      });
    };

    if (frontPhoto) addPhotoPart(frontPhoto, 'Front');
    if (sidePhoto) addPhotoPart(sidePhoto, 'Side');
    if (backPhoto) addPhotoPart(backPhoto, 'Back');

    const promptText = `Kamu adalah 'Lean Bulk AI Coach', ahli analisis postur & visual perkembangan otot tubuh khusus program Lean Bulk / Body Recomposition pemula di Indonesia. Jawab secara ringkas, santai, memotivasi, dan ramah gaya personal trainer/sahabat fitness (tidak formal medis).

Analisis foto-foto perkembangan fisik pengguna berikut secara cermat.

Data Pengguna Saat Ini:
- Berat Badan Sekarang: ${weight} kg
- Lingkar Pinggang Sekarang: ${waist} cm
- Catatan Tambahan Pengguna: "${note || 'Tidak ada catatan tambahan'}"

${previousEntry ? `Perbandingan dengan data sebelumnya (${previousEntry.date}):
- Berat Badan Sebelumnya: ${previousEntry.weight} kg
- Lingkar Pinggang Sebelumnya: ${previousEntry.waist} cm
- Analisis/Visual Summary Sebelumnya: "${previousEntry.analysis?.visual_summary || 'Tidak ada'}"` : 'Ini adalah analisis perkembangan pertama kali pengguna.'}

Tugas Utama Anda:
1. Analisis perkembangan otot secara visual (Pundak/Shoulders, Dada/Chest, Punggung/Back, Lengan/Arms), perubahan lingkar pinggang/perut (Waist/Belly), serta postur pundak/tubuh (Posture) dari foto yang dikirimkan.
2. Tentukan tingkat perkembangan secara kualitatif dibanding kondisi sebelumnya (pilihan: shoulders, chest, back, arms: 'less' | 'same' | 'better' | 'much_better'; posture: 'worse' | 'same' | 'better' | 'much_better'; waist_belly: 'smaller' | 'stable' | 'slightly_bigger' | 'too_much_bigger').
3. Berikan 'visual_summary' dalam bahasa Indonesia yang pendek, memotivasi, santai, dan penuh energi kebugaran. Jangan memberikan persentase lemak atau massa otot secara pasti (misal: "body fat kamu 12.3%"), hanya gunakan deskripsi visual perkembangan.
4. Terapkan ALGORITMA RULING KETAT ini untuk merumuskan 'simple_message' dan 'progress_status':
   - "Lean bulk kamu aman." -> Jika kenaikan berat badan berjalan lambat/seimbang dan lingkar pinggang stabil.
   - "Protein dulu yang dibenerin. Tambah Platinum atau protein makanan." -> Jika berat badan stuck dalam 14 hari terakhir, asupan protein kurang dari 90g, dan foto visual tubuh terlihat sama saja.
   - "Tambah kalori sedikit. Bisa tambah nasi/telur/tempe atau Gain Mass 1/2 serving." -> Jika berat badan stuck 14 hari, protein sudah 90–100g, dan latihan rutin dilakukan secara konsisten.
   - "Kurangi Gain Mass dulu. Jangan full serving harian." -> Jika lingkar pinggang naik > 1 cm dalam 2 minggu atau perut secara visual terlihat bertambah buncit/maju kedepan.
   - "Progress bagus. Lanjutkan." -> Jika tubuh terlihat lebih padat/full tapi lingkar pinggang stabil terkendali.
   - "Latihan perlu progresif. Tambah reps dulu atau naik ke 6 kg untuk gerakan yang aman." -> Jika bahu/dada tidak mengalami perubahan visual tapi tingkat kesulitan latihan selalu diisi "easy".
   - "Ingat perbaiki postur." -> Jika postur masih terlihat rounded / pundak maju ke depan (forward shoulder), ingatkan pengguna untuk rajin melakukan wall slide, chin tuck, scapular pull-up, dead hang, dan rows.

Sertakan analisis postur pengguna jika bahu terlihat bungkuk/pundak maju (kyphosis/forward shoulders).

Harap kembalikan response dalam bentuk structured JSON dengan format schema berikut:`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visual_summary: { type: Type.STRING, description: 'Ringkasan singkat visual tubuh dalam 2-3 kalimat santai' },
            body_progress_score: { type: Type.INTEGER, description: 'Skor nilai perkembangan keseluruhan 1 sampai 10' },
            muscle_visual_change: {
              type: Type.OBJECT,
              properties: {
                shoulders: { type: Type.STRING, description: 'Harus berupa "less", "same", "better", atau "much_better"' },
                chest: { type: Type.STRING, description: 'Harus berupa "less", "same", "better", atau "much_better"' },
                back: { type: Type.STRING, description: 'Harus berupa "less", "same", "better", atau "much_better"' },
                arms: { type: Type.STRING, description: 'Harus berupa "less", "same", "better", atau "much_better"' },
                waist_belly: { type: Type.STRING, description: 'Harus berupa "smaller", "stable", "slightly_bigger", atau "too_much_bigger"' },
                posture: { type: Type.STRING, description: 'Harus berupa "worse", "same", "better", atau "much_better"' }
              },
              required: ['shoulders', 'chest', 'back', 'arms', 'waist_belly', 'posture']
            },
            confidence: { type: Type.STRING, description: 'Tingkat keyakinan: "low", "medium", atau "high"' },
            progress_status: { type: Type.STRING, description: 'Harus salah satu: "on_track", "need_more_protein", "need_more_calories", "reduce_gain_mass", "improve_training", "maintain_plan"' },
            main_issue: { type: Type.STRING, description: 'Masalah utama saat ini yang didiagnosa secara kasat mata' },
            next_action: { type: Type.STRING, description: 'Aksi spesifik pelatih untuk langkah latihan atau suplemen berikutnya' },
            simple_message: { type: Type.STRING, description: 'Satu kalimat kesimpulan singkat mutlak sesuai ruling guide (misal "Lean bulk kamu aman." / "Protein dulu yang dibenerin. Tambah Platinum.", dsb.)' }
          },
          required: [
            'visual_summary',
            'body_progress_score',
            'muscle_visual_change',
            'confidence',
            'progress_status',
            'main_issue',
            'next_action',
            'simple_message'
          ]
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(parsedData);

  } catch (error: any) {
    console.error('Error in analyze-body-progress:', error);
    return res.status(500).json({ error: 'Gagal menganalisis foto progres tubuh: ' + (error.message || error) });
  }
});

// 3. Daily Summary Endpoint
app.post('/api/gemini/daily-summary', async (req, res) => {
  try {
    const { totalProtein, totalCalories, supplements, workouts, weightTrend } = req.body;

    const promptText = `Pahami data statistik harian program Lean Bulk pengguna hari ini:
- Total Protein Terkonsumsi: ${totalProtein} gram (Target harian: 90-100 g)
- Total Estimasi Kalori: ${totalCalories} kkal
- Suplemen yang dikonsumsi hari ini: ${JSON.stringify(supplements)}
- Status Workout hari ini: ${JSON.stringify(workouts)}
- Info tren berat/pinggang: ${weightTrend || 'Stabil'}

Berdasarkan data di atas, buat ringkasan evaluasi harian dalam Bahasa Indonesia.
Format response harus terdiri dari TEPAT DUA BARIS PENDEK (Aturan Ketat!):
Baris 1: Status Evaluasi hari ini (Contoh: "Hari ini kurang protein" atau "Aman, kebutuhan protein optimal!", "Porsi Gain Mass terlalu banyak", atau "Kurang kalori tapi protein aman").
Baris 2: Rencana aksi spesifik untuk besok pagi/siang (Contoh: "Besok cukup lakukan ini: tambahkan 1 scoop Platinum atau rebut 2 butir telur dadar sebelum latihan.").

Harap buat super pendek dan langsung pada intinya!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        temperature: 0.5,
      }
    });

    return res.json({ text: response.text });

  } catch (error: any) {
    console.error('Error generating daily summary:', error);
    return res.status(500).json({ error: 'Gagal menghasilkan rangkuman harian: ' + (error.message || error) });
  }
});


// 4. AI Goal Advisor Endpoint
app.post('/api/gemini/analyze-goal', async (req, res) => {
  try {
    const { settings, avgWeight, waistTrendStr, avgProtein7, workoutDoneCount, latestBodyProgress } = req.body;

    const promptText = `
        You are a smart Personal Trainer AI for Lean Bulk and Body Recomposition in Indonesia.
        Analyze the user's goal:
        - Goal Type: ${settings.goal.goal_type}
        - Current Weight: ${settings.profile.current_weight_kg} kg
        - Target Weight: ${settings.goal.target_weight_kg} kg
        - 14-day Avg Weight: ${avgWeight ? avgWeight.toFixed(1) : 'Unknown'} kg
        - Current Waist: ${settings.profile.current_waist_cm} cm
        - Limit Waist: ${settings.goal.waist_limit_cm} cm
        - Waist Trend (14 days): ${waistTrendStr}
        - Avg Protein (7 days): ${avgProtein7 ? avgProtein7.toFixed(0) : 0} g
        - Workout Frequency (last 7 days): ${workoutDoneCount} times
        - Latest Visual Body Progress Status: ${latestBodyProgress?.analysis?.progress_status || 'Unknown'}

        Return JSON strictly matching this schema:
        {
          "goal_status": "good_target" | "target_too_low" | "target_too_high" | "maintain_first" | "increase_target_later",
          "suggested_target_weight": number,
          "reason": "short Indonesian explanation",
          "timeline": "suggested timeline text",
          "next_action": "what user should do this week in Indonesian"
        }

        Rules (Strictly follow):
        - If current weight < target and waist is stable/safe, goal_status = "good_target".
        - If target reached (or surpassed) and waist is stable/safe, suggest optional next target +1 to +2 kg (goal_status = "increase_target_later").
        - If target reached but waist is near/above limit, goal_status = "maintain_first".
        - If weight stuck but protein is low (< 90g), advise to fix protein first, keep target unchanged.
        - If weight stuck and protein is good (> 90g), advise simple additions like "tambah sedikit kalori atau Gain Mass 1/2 serving". Never suggest full Gain Mass by default.
        - Keep advice short, practical, and casual Indonesian.
      `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(parsedData);

  } catch (error: any) {
    console.error('Error in analyze-goal:', error);
    return res.status(500).json({ error: 'Gagal menganalisis target: ' + (error.message || error) });
  }
});

// Serve Vite or Static files depending on environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lean Bulk Server running on port ${PORT}`);
  });
}

startServer();

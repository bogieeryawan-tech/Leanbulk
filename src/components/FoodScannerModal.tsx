/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { FoodScanResult, MealFoodItem } from '../types';
import { X, Camera, Upload, Sparkles, Check, RefreshCw, AlertCircle, Edit3, Plus, Minus } from 'lucide-react';

interface FoodScannerModalProps {
  onClose: () => void;
  onSaveMeal: (meal: FoodScanResult) => void;
}

export default function FoodScannerModal({ onClose, onSaveMeal }: FoodScannerModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  
  // Manual / Edit values
  const [editMode, setEditMode] = useState(false);
  const [editedMealName, setEditedMealName] = useState('');
  const [editedProtein, setEditedProtein] = useState(0);
  const [editedCalories, setEditedCalories] = useState(0);
  const [editedCarbs, setEditedCarbs] = useState(0);
  const [editedFat, setEditedFat] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic reassurance loading steps
  const loadingSteps = [
    'Mengonversi file foto makanan...',
    'Mengirim data ke Gemini Vision AI...',
    'Mendeteksi jenis bahan masakan...',
    'Mengecek kandungan gizi standar Indonesia...',
    'Mencocokkan kebutuhan protein Lean Bulk...',
    'Menyusun estimasi terbaik untukmu...'
  ];

  useEffect(() => {
    let interval: any;
    if (scanning) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [scanning]);

  const [errorMsg, setErrorMsg] = useState<string>('');

  // Image compression utility
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          resolve(base64Str);
        }
      };
      img.src = base64Str;
    });
  };

  // Read upload and set target base64 image
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Ukuran gambar terlalu besar (maksimal 10MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        try {
          const compressed = await compressImage(result);
          setImage(compressed);
          setErrorMsg('');
        } catch (e) {
          setErrorMsg('Gagal memproses gambar.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanMeal = async () => {
    setErrorMsg('');
    if (!image && !note) {
      setErrorMsg('Pilih foto makanan atau isi catatan terlebih dahulu!');
      return;
    }

    setScanning(true);
    try {
      // If we don't have an image but have a note, we can generate a mock solid color placeholder or prompt without image
      // But Gemini analyze-food expects an image. Let's send a standard solid-color base64 image if they just entered text
      let imageToSend = image;
      if (!imageToSend) {
        // Simple base64 for 1x1 black pixel to support text-only scan mode gracefully!
        imageToSend = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      }

      const response = await fetch('/api/gemini/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageToSend,
          note: note,
        }),
      });

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Gemini terlalu lama merespons (Timeout). Silakan coba lagi nanti.');
        }
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error && errJson.error.includes("API key")) {
           throw new Error('API Key tidak ditemukan atau tidak valid.');
        }
        throw new Error(errJson.error || 'Server mengalami kendala.');
      }

      const data = await response.json();
      
      // Safe schema normalization
      if (!data) throw new Error('Data balasan kosong.');
      
      const normalizedData: FoodScanResult = {
        meal_name: typeof data.meal_name === 'string' ? data.meal_name : 'Makanan Tidak Diketahui',
        total_protein_g: typeof data.total_protein_g === 'number' ? data.total_protein_g : 0,
        total_calories: typeof data.total_calories === 'number' ? data.total_calories : 0,
        total_carbs_g: typeof data.total_carbs_g === 'number' ? data.total_carbs_g : 0,
        total_fat_g: typeof data.total_fat_g === 'number' ? data.total_fat_g : 0,
        confidence: ['high', 'medium', 'low'].includes(data.confidence) ? data.confidence : 'medium',
        detected_foods: Array.isArray(data.detected_foods) ? data.detected_foods : [],
        short_feedback: typeof data.short_feedback === 'string' ? data.short_feedback : 'Tidak ada analisis pelatih.',
        lean_bulk_advice: typeof data.lean_bulk_advice === 'string' ? data.lean_bulk_advice : 'Tetap ikuti panduan.',
      };

      setResult(normalizedData);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || e;
      if (errMsg.includes('JSON')) errMsg = 'Wah, balasan dari Gemini kurang rapi (malformed). Yuk coba scan ulang fotonya!';
      setErrorMsg('Gagal mendeteksi hidangan: ' + errMsg);
    } finally {
      setScanning(false);
    }
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Adjustment Actions
  const handleSaveResult = () => {
    if (result) {
      onSaveMeal(result);
      onClose();
    }
  };

  const handleAddEgg = (count: number) => {
    if (!result) return;
    const eggProtein = 6 * count;
    const eggCalories = 70 * count;
    const eggFat = 5 * count;
    const eggCarbs = 0.5 * count;

    const newFoods = [...result.detected_foods, {
      name: `${count} butir Telur Tambahan`,
      estimated_portion: `${count} butir matang`,
      protein_g: eggProtein,
      calories: eggCalories,
      carbs_g: eggCarbs,
      fat_g: eggFat,
      confidence: 'high' as const
    }];

    setResult({
      ...result,
      detected_foods: newFoods,
      total_protein_g: result.total_protein_g + eggProtein,
      total_calories: result.total_calories + eggCalories,
      total_carbs_g: result.total_carbs_g + eggCarbs,
      total_fat_g: result.total_fat_g + eggFat
    });
  };

  const handleAddTempe = () => {
    if (!result) return;
    const protein = 18;
    const calories = 190;
    const carbs = 10;
    const fat = 9;

    const newFoods = [...result.detected_foods, {
      name: 'Tempe Goreng/Tempe Bacem',
      estimated_portion: '100g (sekitar 2 potong)',
      protein_g: protein,
      calories,
      carbs_g: carbs,
      fat_g: fat,
      confidence: 'high' as const
    }];

    setResult({
      ...result,
      detected_foods: newFoods,
      total_protein_g: result.total_protein_g + protein,
      total_calories: result.total_calories + calories,
      total_carbs_g: result.total_carbs_g + carbs,
      total_fat_g: result.total_fat_g + fat
    });
  };

  const handleAddChicken = () => {
    if (!result) return;
    const protein = 30;
    const calories = 165;
    const carbs = 0;
    const fat = 3.6;

    const newFoods = [...result.detected_foods, {
      name: 'Dada Ayam Tambahan',
      estimated_portion: '100g (1 porsi dada fillet)',
      protein_g: protein,
      calories,
      carbs_g: carbs,
      fat_g: fat,
      confidence: 'high' as const
    }];

    setResult({
      ...result,
      detected_foods: newFoods,
      total_protein_g: result.total_protein_g + protein,
      total_calories: result.total_calories + calories,
      total_carbs_g: result.total_carbs_g + carbs,
      total_fat_g: result.total_fat_g + fat
    });
  };

  const handleReducePortion = () => {
    if (!result) return;
    // Reduce total nutrition by 25% (user ate less)
    const factor = 0.75;
    const newFoods = result.detected_foods.map(item => ({
      ...item,
      protein_g: Math.round(item.protein_g * factor * 10) / 10,
      calories: Math.round(item.calories * factor),
      carbs_g: Math.round(item.carbs_g * factor * 10) / 10,
      fat_g: Math.round(item.fat_g * factor * 10) / 10,
    }));

    setResult({
      ...result,
      detected_foods: newFoods,
      total_protein_g: Math.round(result.total_protein_g * factor * 10) / 10,
      total_calories: Math.round(result.total_calories * factor),
      total_carbs_g: Math.round(result.total_carbs_g * factor * 10) / 10,
      total_fat_g: Math.round(result.total_fat_g * factor * 10) / 10,
    });
  };

  // Switch to custom manual adjustments
  const handleOpenEdit = () => {
    if (!result) return;
    setEditedMealName(result.meal_name);
    setEditedProtein(result.total_protein_g);
    setEditedCalories(result.total_calories);
    setEditedCarbs(result.total_carbs_g);
    setEditedFat(result.total_fat_g);
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!result) return;
    setResult({
      ...result,
      meal_name: editedMealName,
      total_protein_g: editedProtein,
      total_calories: editedCalories,
      total_carbs_g: editedCarbs,
      total_fat_g: editedFat,
      detected_foods: [
        {
          name: 'Penyesuaian Manual',
          estimated_portion: 'Custom',
          protein_g: editedProtein,
          calories: editedCalories,
          carbs_g: editedCarbs,
          fat_g: editedFat,
          confidence: 'high' as const
        }
      ]
    });
    setEditMode(false);
  };

  // Direct manual log entry generator
  const handleSimpanManualDirect = () => {
    setErrorMsg('');
    if (!editedMealName || editedProtein <= 0) {
      setErrorMsg('Nama hidangan dan protein harus diisi!');
      return;
    }
    const manualMeal: FoodScanResult = {
      meal_name: editedMealName,
      total_protein_g: editedProtein,
      total_calories: editedCalories || Math.round(editedProtein * 4), // simple multiplier if left blank
      total_carbs_g: editedCarbs || 0,
      total_fat_g: editedFat || 0,
      confidence: 'high',
      detected_foods: [
        {
          name: editedMealName,
          estimated_portion: 'Input Manual',
          protein_g: editedProtein,
          calories: editedCalories,
          carbs_g: editedCarbs,
          fat_g: editedFat,
          confidence: 'high'
        }
      ],
      short_feedback: 'Makan dicatat manual secara cepat.',
      lean_bulk_advice: 'Pastikan rasio protein sesuai demi memicu sintesis otot maksimal.'
    };
    onSaveMeal(manualMeal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#121215]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wide font-display">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            Scan Makanan dengan AI
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
          
          {!result && !manualMode && !scanning && (
            <div className="space-y-4">
              {/* Photo uploader */}
              <div 
                onClick={triggerSelectFile}
                className="border-2 border-dashed border-white/10 hover:border-amber-500/40 rounded-[24px] p-8 flex flex-col items-center justify-center gap-3 bg-white/5 hover:bg-white/8 transition cursor-pointer"
              >
                {image ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5">
                    <img src={image} alt="Makanan" className="w-full h-full object-contain" />
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2.5 py-1 text-[10px] text-zinc-300 rounded-md flex items-center gap-1.5 border border-white/5">
                      <Camera className="w-3.5 h-3.5 text-amber-500" /> Ganti Foto
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-amber-500/5 text-amber-500 rounded-full border border-amber-500/15 animate-pulse">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-bold text-slate-300">Ambil Foto / Pilih dari Album</span>
                      <span className="text-[10px] text-slate-500 mt-1 block">Mendukung Kamera, Galeri HP, & drag-and-drop</span>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </div>

              {/* Catatan optional */}
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-wider font-bold text-slate-400">CATATAN TAMBAHAN (OPSIONAL)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: ayam bakar dada fillet, tahu goreng 1, tempe goreng 2 potong, nasi putih porsi sedang"
                  className="w-full bg-white/5 border border-white/10 focus:border-amber-500/40 focus:bg-white/10 focus:outline-none rounded-xl p-3 text-xs text-zinc-100 placeholder:text-zinc-650 h-20 resize-none font-sans"
                />
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button
                  onClick={() => setManualMode(true)}
                  className="flex-1 py-3 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 rounded-xl transition cursor-pointer"
                >
                  Ketik Manual Saja
                </button>
                <button
                  onClick={handleScanMeal}
                  disabled={!image && !note}
                  className="flex-1 py-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-900 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" /> Mulai Analisis AI
                </button>
              </div>

              {errorMsg && (
                <p className="text-red-400 text-[10px] font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{errorMsg}</p>
              )}
            </div>
          )}

          {/* Direct Manual Input Screen */}
          {manualMode && (
            <div className="space-y-4">
              <div className="bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl text-center space-y-1">
                <span className="text-xs font-bold text-amber-400">PENCATATAN MANUAL CEPAT</span>
                <p className="text-[10.5px] text-zinc-500">Tak perlu repot, tulis porsimu secara sederhana</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Nama Makanan</label>
                  <input
                    type="text"
                    value={editedMealName}
                    onChange={(e) => setEditedMealName(e.target.value)}
                    placeholder="Contoh: Nasi Goreng Telur Suwir"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Protein (g)</label>
                    <input
                      type="number"
                      value={editedProtein || ''}
                      onChange={(e) => setEditedProtein(parseFloat(e.target.value) || 0)}
                      placeholder="Contoh: 28"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Kalori (kkal)</label>
                    <input
                      type="number"
                      value={editedCalories || ''}
                      onChange={(e) => setEditedCalories(parseFloat(e.target.value) || 0)}
                      placeholder="Contoh: 450"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Karbohidrat (g) - Opsional</label>
                    <input
                      type="number"
                      value={editedCarbs || ''}
                      onChange={(e) => setEditedCarbs(parseFloat(e.target.value) || 0)}
                      placeholder="Contoh: 40"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Lemak (g) - Opsional</label>
                    <input
                      type="number"
                      value={editedFat || ''}
                      onChange={(e) => setEditedFat(parseFloat(e.target.value) || 0)}
                      placeholder="Contoh: 12"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <p className="text-red-400 text-[10px] font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{errorMsg}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setManualMode(false)}
                  className="flex-1 py-3 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSimpanManualDirect}
                  className="flex-1 py-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-900 rounded-xl transition cursor-pointer"
                >
                  Simpan Langsung
                </button>
              </div>
            </div>
          )}

          {/* Loader Screen */}
          {scanning && (
            <div className="py-12 flex flex-col items-center justify-center gap-5 text-center">
              <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
              <div className="space-y-2">
                <span className="block text-sm font-bold text-zinc-200">Menghubungi Gemini Vision...</span>
                <p className="text-xs text-amber-500 font-medium animate-pulse">
                  "{loadingSteps[loadingStep]}"
                </p>
                <p className="text-[10px] text-zinc-500 italic max-w-xs mx-auto">
                  Gemini sedang mencocokkan porsi lauk Indonesia seperti ayam, tempe, tahu, dan telur secara cerdas.
                </p>
              </div>
            </div>
          )}

          {/* Gemini Results Display and Tweak Screen */}
          {result && !editMode && (
            <div className="space-y-5">
              
              {/* Image feedback indicator */}
              <div className="space-y-1">
                <span className="block text-xs font-bold text-zinc-400">ESTIMASI HIDANGAN</span>
                <h4 className="text-2xl font-black text-white">{result.meal_name}</h4>
              </div>

              {/* Macros Breakdown Card */}
              <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 grid grid-cols-4 gap-2 text-center">
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">PROT (G)</span>
                  <span className="text-xl font-black text-amber-500 font-mono">{result.total_protein_g}g</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">KALORI</span>
                  <span className="text-xl font-black text-white font-mono">{result.total_calories}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">KARB (G)</span>
                  <span className="text-xl font-bold text-slate-300 font-mono">{result.total_carbs_g}g</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">LEMAK (G)</span>
                  <span className="text-xl font-bold text-slate-300 font-mono">{result.total_fat_g}g</span>
                </div>
              </div>

              {/* Confidence Alert to conform with Rules */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 ${result.confidence === 'low' ? 'text-amber-500' : 'text-emerald-500'}`} />
                  <span className="text-xs text-slate-300 font-bold">Tingkat Keyakinan AI:</span>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${result.confidence === 'low' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {result.confidence.toUpperCase()}
                </span>
              </div>

              {result.confidence === 'low' && (
                <p className="text-[10.5px] text-amber-300 bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-2xl leading-relaxed">
                  ⚠️ Porsi terdeteksi masih diragukan. Kamu direkomendasikan memakai tombol penyesuaian porsi lauk di bawah untuk menyempurnakan keakuratan.
                </p>
              )}

              {/* Detected items table */}
              <div className="space-y-1.5">
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">KOMPONEN TERDETEKSI (ESTIMASI):</span>
                <div className="bg-[#121215]/50 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {result.detected_foods.map((food, i) => (
                    <div key={i} className="p-3.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="block font-bold text-slate-200">{food.name}</span>
                        <span className="text-[10px] text-slate-450 mt-0.5">{food.estimated_portion}</span>
                      </div>
                      <div className="text-right font-mono space-y-0.5">
                        <span className="block font-black text-amber-400">+{food.protein_g}g Pro</span>
                        <span className="block text-[9px] text-slate-500">{food.calories} kkal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback and Lean Bulk Coach advice */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-purple-400">ANALISIS SPORT COACh</span>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">“{result.short_feedback}”</p>
                <div className="pt-2 border-t border-white/5 mt-2 text-[10.5px] text-slate-400 leading-relaxed italic">
                  💪 {result.lean_bulk_advice}
                </div>
              </div>

              {/* QUICK CORRECTION TRIGGER BUTTONS (RULING) */}
              <div className="space-y-2">
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">SESUAIKAN ESTIMASI PORSI (CEPAT):</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddEgg(1)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>🥚 Tambah 1 Telur</span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">+6g Pro</span>
                  </button>
                  <button
                    onClick={() => handleAddEgg(2)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>🥚🥚 Tambah 2 Telur</span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">+12g Pro</span>
                  </button>
                  <button
                    onClick={handleAddTempe}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>🍢 Tambah Tempe</span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">+18g Pro</span>
                  </button>
                  <button
                    onClick={handleAddChicken}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>🍗 Tambah Ayam</span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">+30g Pro</span>
                  </button>
                  <button
                    onClick={handleReducePortion}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer col-span-2"
                  >
                    <span>Kurangi Kelebihan Porsi</span>
                    <span className="text-[10px] text-red-400 font-bold">-25% Semua</span>
                  </button>
                </div>
              </div>

              {/* Final Save or Re-Scan Controls */}
              <div className="flex gap-2.5 pt-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setImage(null);
                    setNote('');
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Scan Ulang
                </button>
                
                <button
                  onClick={handleOpenEdit}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 cursor-pointer"
                  title="Edit Manual Nilai Angka"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSaveResult}
                  className="flex-2 py-3 bg-amber-500 hover:bg-amber-400 font-bold text-neutral-950 text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Check className="w-4 h-4" /> Simpan Estimasi Ini
                </button>
              </div>
            </div>
          )}

          {/* Inline Edit form */}
          {result && editMode && (
            <div className="space-y-4">
              <span className="block text-xs font-bold text-zinc-400">EDIT ESTIMASI NUTRISI MANUAL</span>
              
              <div className="space-y-3 bg-zinc-950/45 p-4 border border-zinc-800 rounded-xl">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Nama Makanan</label>
                  <input
                    type="text"
                    value={editedMealName}
                    onChange={(e) => setEditedMealName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none rounded p-2 text-xs text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Protein (g)</label>
                    <input
                      type="number"
                      value={editedProtein}
                      onChange={(e) => setEditedProtein(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none rounded p-2 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Kalori (kkal)</label>
                    <input
                      type="number"
                      value={editedCalories}
                      onChange={(e) => setEditedCalories(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none rounded p-2 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Karbohidrat (g)</label>
                    <input
                      type="number"
                      value={editedCarbs}
                      onChange={(e) => setEditedCarbs(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none rounded p-2 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Lemak (g)</label>
                    <input
                      type="number"
                      value={editedFat}
                      onChange={(e) => setEditedFat(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none rounded p-2 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2 bg-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-400 rounded-lg transition border border-zinc-800"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-neutral-900 rounded-lg transition"
                >
                  Terapkan Edit
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

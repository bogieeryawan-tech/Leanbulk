/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { BodyProgressEntry, BodyProgressAnalysis } from '../types';
import { Camera, Upload, AlertCircle, Sparkles, X, Shield, Activity, RefreshCw, ChevronRight, CheckCircle, Info, Scale, Trash2 } from 'lucide-react';

interface BodyProgressModalProps {
  onClose: () => void;
  onSaveEntry: (entry: BodyProgressEntry) => void;
  history: BodyProgressEntry[];
  todayWeight?: number;
  todayWaist?: number;
  onClearPhotos: () => void;
}

export default function BodyProgressModal({
  onClose,
  onSaveEntry,
  history,
  todayWeight,
  todayWaist,
  onClearPhotos
}: BodyProgressModalProps) {
  const [frontPhoto, setFrontPhoto] = useState<string>('');
  const [sidePhoto, setSidePhoto] = useState<string>('');
  const [backPhoto, setBackPhoto] = useState<string>('');
  
  const [weight, setWeight] = useState<string>(todayWeight ? todayWeight.toString() : '58');
  const [waist, setWaist] = useState<string>(todayWaist ? todayWaist.toString() : '76');
  const [note, setNote] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<BodyProgressAnalysis | null>(null);
  const [selectedResultEntry, setSelectedResultEntry] = useState<BodyProgressEntry | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

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

  // Helper for reading uploaded file to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'side' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Ukuran gambar terlalu besar (maksimal 10MB).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const compressed = await compressImage(base64String);
        if (side === 'front') setFrontPhoto(compressed);
        if (side === 'side') setSidePhoto(compressed);
        if (side === 'back') setBackPhoto(compressed);
        setErrorMessage('');
      } catch (err) {
        setErrorMessage('Gagal memproses gambar.');
      }
    };
    reader.readAsDataURL(file);
  };

  const executeAnalysis = async () => {
    if (!frontPhoto && !sidePhoto && !backPhoto) {
      setErrorMessage('Unggah minimal satu foto progres (disarankan tiga) untuk dianalisis.');
      return;
    }
    
    const parsedWeight = parseFloat(weight);
    const parsedWaist = parseFloat(waist);

    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMessage('Input berat badan sekarang dengan benar.');
      return;
    }
    if (isNaN(parsedWaist) || parsedWaist <= 0) {
      setErrorMessage('Input lingkar pinggang sekarang dengan benar.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setLoadingStep('Mengunggah gambar ke server...');

    try {
      // Find previous entry for comparison if any exists in history
      const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
      const previousEntry = sortedHistory.length > 0 ? sortedHistory[0] : null;

      setLoadingStep('Gemini sedang menganalisis postur, bahu, dada, dan pinggangmu...');
      
      const response = await fetch('/api/gemini/analyze-body-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontPhoto: frontPhoto || undefined,
          sidePhoto: sidePhoto || undefined,
          backPhoto: backPhoto || undefined,
          weight: parsedWeight,
          waist: parsedWaist,
          note,
          previousEntry
        })
      });

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Gemini terlalu lama merespons (Timeout). Silakan coba lagi nanti.');
        }
        const errData = await response.json().catch(() => ({}));
        if (errData.error && errData.error.includes("API key")) {
           throw new Error('API Key tidak ditemukan atau tidak valid.');
        }
        throw new Error(errData.error || 'Terjadi kegagalan server.');
      }

      const data = await response.json();
      
      const normalizedData: BodyProgressAnalysis = {
        visual_summary: typeof data.visual_summary === 'string' ? data.visual_summary : 'Tidak ada catatan.',
        body_progress_score: typeof data.body_progress_score === 'number' ? data.body_progress_score : 5,
        muscle_visual_change: data.muscle_visual_change || {
          shoulders: 'same',
          chest: 'same',
          back: 'same',
          arms: 'same',
          waist_belly: 'stable',
          posture: 'same'
        },
        confidence: ['high', 'medium', 'low'].includes(data.confidence) ? data.confidence : 'medium',
        progress_status: ['on_track', 'need_more_protein', 'need_more_calories', 'reduce_gain_mass', 'maintain_plan', 'improve_training'].includes(data.progress_status) ? data.progress_status : 'maintain_plan',
        main_issue: typeof data.main_issue === 'string' ? data.main_issue : '',
        next_action: typeof data.next_action === 'string' ? data.next_action : 'Istirahat dan latihan konsisten.',
        simple_message: typeof data.simple_message === 'string' ? data.simple_message : 'Semangat latihan!',
      };

      setResult(normalizedData);

      // Instantly save to local state / history (DO NOT STORE FULL PHOTOS to save quota)
      const newEntry: BodyProgressEntry = {
        id: 'bp-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        frontPhoto: undefined, 
        sidePhoto: undefined,
        backPhoto: undefined,
        weight: parsedWeight,
        waist: parsedWaist,
        note: note || undefined,
        analysis: normalizedData
      };

      onSaveEntry(newEntry);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || err;
      if (errMsg.includes('JSON')) errMsg = 'Wah, balasan dari Gemini AI kurang rapi (malformed). Cari foto lebih jelas dan coba lagi ya!';
      if (err.status === 504) errMsg = 'Gemini terlalu lama merespons (Timeout). Jangan panik, cukup coba lagi.';
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Label mapping helpers for visually appealing display
  const getBadgeStyle = (val: string, type: 'muscle' | 'waist' | 'posture') => {
    if (type === 'muscle') {
      switch (val) {
        case 'much_better': return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25';
        case 'better': return 'bg-emerald-950/20 text-emerald-300 border-emerald-600/10';
        case 'same': return 'bg-slate-900/40 text-slate-350 border-white/5';
        default: return 'bg-red-950/40 text-red-450 border-red-500/10';
      }
    } else if (type === 'waist') {
      switch (val) {
        case 'smaller': return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25';
        case 'stable': return 'bg-slate-900/40 text-slate-350 border-white/5';
        case 'slightly_bigger': return 'bg-amber-950/20 text-amber-300 border-amber-600/10';
        default: return 'bg-red-950/40 text-red-400 border-red-500/25'; // too_much_bigger
      }
    } else { // posture
      switch (val) {
        case 'much_better': return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25';
        case 'better': return 'bg-emerald-950/20 text-emerald-350 border-emerald-600/10';
        case 'same': return 'bg-slate-900/40 text-slate-300 border-white/5';
        default: return 'bg-red-950/40 text-red-400 border-red-500/25';
      }
    }
  };

  const getLabelIndo = (val: string) => {
    const map: Record<string, string> = {
      less: 'Kurang berkembang',
      same: 'Sama / Stabil',
      better: 'Lebih Tebal / Bagus',
      much_better: 'Sangat Bagus / Padat',
      smaller: 'Lebih Ramping',
      stable: 'Stabil Oke',
      slightly_bigger: 'Sedikit Maju',
      too_much_bigger: 'Terlalu Buncit!',
      worse: 'Lebih Bungkuk',
    };
    return map[val] || val;
  };

  // Reset check state
  const startNewCheck = () => {
    setResult(null);
    setFrontPhoto('');
    setSidePhoto('');
    setBackPhoto('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 bg-[#060608]/90 backdrop-blur-md z-50 flex flex-col justify-end md:justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-[#0f0f13] border border-white/10 w-full max-w-md mx-auto rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] md:max-h-[85vh] flex flex-col animate-fade-in relative z-50">
        
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0f0f13]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-neutral-950 rounded-lg">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white font-display uppercase tracking-wide">AI Progress Check</h2>
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Visual Physique Tracker</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body layout */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* PRIVACY SHIELD CLEAR WARNING */}
          <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-2xl flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed text-slate-350">
              <span className="text-amber-400 font-bold block mb-0.5">Jaminan Privasi Foto Fisik</span>
              Foto tubuhmu disimpan <span className="text-white font-semibold underline">Lokal (hanya di memori HP-mu)</span> dan tidak pernah disimpan permanen di cloud/server kami. Foto hanya diproses sementara oleh Gemini API untuk membandingkan siluet otot dan postur. Kamu bebas menghapus riwayat foto kapan saja menggunakan tombol reset di bawah.
            </div>
          </div>

          {!result ? (
            <div className="space-y-5">
              
              {/* PHOTO GUIDANCE Accordion Banner */}
              <div className="bg-[#14141a] p-4 rounded-2xl border border-white/5 space-y-2.5">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  Aturan Foto Agar Analisis Akurat
                </h3>
                <ul className="text-[10px] text-slate-400 space-y-1.5 pl-4 list-disc leading-relaxed">
                  <li>Gunakan <strong className="text-slate-200">pencahayaan yang sama</strong> (misal di kamar mandi/kamar tidur).</li>
                  <li>Ambil foto dari <strong className="text-slate-200">jarak & tinggi yang konsisten</strong> (sejajar dada).</li>
                  <li>Pose tegak lurus natural, <strong className="text-slate-200">usahakan jangan flex bungkuk terlalu ekstrem</strong> untuk hasil posture check jujur.</li>
                  <li>Idealnya diambil pagi hari dalam kondisi perut kosong sebelum makan.</li>
                </ul>
              </div>

              {/* THREE PHOTO UPLOADER CHANNELS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">1. Unggah Foto Tubuh</span>
                <div className="grid grid-cols-3 gap-3">
                  {/* Front Photo Card */}
                  <div 
                    onClick={() => frontInputRef.current?.click()} 
                    className="aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-2 text-center hover:bg-white/10 cursor-pointer transition relative overflow-hidden group"
                  >
                    {frontPhoto ? (
                      <img 
                        src={frontPhoto} 
                        alt="Depan" 
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full rounded-xl"
                      />
                    ) : (
                      <div className="space-y-1 text-slate-450 p-1">
                        <Upload className="w-5 h-5 mx-auto text-amber-500/70" />
                        <span className="text-[9px] font-extrabold block text-slate-300">DEPAN</span>
                        <span className="text-[8px] block leading-none">Tap Unggah</span>
                      </div>
                    )}
                    <input 
                      ref={frontInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'front')} 
                    />
                  </div>

                  {/* Side Photo Card */}
                  <div 
                    onClick={() => sideInputRef.current?.click()} 
                    className="aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-2 text-center hover:bg-white/10 cursor-pointer transition relative overflow-hidden group"
                  >
                    {sidePhoto ? (
                      <img 
                        src={sidePhoto} 
                        alt="Samping" 
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full rounded-xl"
                      />
                    ) : (
                      <div className="space-y-1 text-slate-450 p-1">
                        <Upload className="w-5 h-5 mx-auto text-amber-500/70" />
                        <span className="text-[9px] font-extrabold block text-slate-300">SAMPING</span>
                        <span className="text-[8px] block leading-none">Tap Unggah</span>
                      </div>
                    )}
                    <input 
                      ref={sideInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'side')} 
                    />
                  </div>

                  {/* Back Photo Card */}
                  <div 
                    onClick={() => backInputRef.current?.click()} 
                    className="aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-2 text-center hover:bg-white/10 cursor-pointer transition relative overflow-hidden group"
                  >
                    {backPhoto ? (
                      <img 
                        src={backPhoto} 
                        alt="Belakang" 
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full rounded-xl"
                      />
                    ) : (
                      <div className="space-y-1 text-slate-450 p-1">
                        <Upload className="w-5 h-5 mx-auto text-amber-500/70" />
                        <span className="text-[9px] font-extrabold block text-slate-300">BELAKANG</span>
                        <span className="text-[8px] block leading-none">Tap Unggah</span>
                      </div>
                    )}
                    <input 
                      ref={backInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'back')} 
                    />
                  </div>
                </div>
              </div>

              {/* INPUT WEIGHT & MEASUREMENT */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Berat Badan (kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="58"
                      className="w-full bg-[#131317] border border-white/10 px-3.5 py-2.5 text-xs text-white rounded-xl focus:border-amber-500 focus:outline-none font-mono font-bold"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] text-slate-500 font-bold uppercase font-mono">KG</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Lingkar Pinggang (cm)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      placeholder="76"
                      className="w-full bg-[#131317] border border-white/10 px-3.5 py-2.5 text-xs text-white rounded-xl focus:border-amber-500 focus:outline-none font-mono font-bold"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] text-slate-500 font-bold uppercase font-mono">CM</span>
                  </div>
                </div>
              </div>

              {/* OPTIONAL QUICK NOTES */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Catatan Tambahan (Opsional)</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: 'Habis makan besar', 'baru bangun tidur'"
                  className="w-full bg-[#131317] border border-white/10 px-3.5 py-2.5 text-xs text-white rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SUBMIT TRIGGERS */}
              <div className="pt-2">
                <button
                  onClick={executeAnalysis}
                  disabled={loading}
                  className="w-full py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-black tracking-wide text-xs uppercase rounded-xl hover:shadow-xl hover:shadow-amber-500/10 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {loading ? 'AI Coach Sedang Menganalisis' : 'Mulai Analisis Progres AI'}
                </button>
              </div>

              {loading && (
                <div className="text-center py-2 space-y-2">
                  <div className="w-4 h-4 mx-auto rounded-full bg-amber-500 animate-ping"></div>
                  <p className="text-[10px] text-slate-400 font-bold animate-pulse">{loadingStep}</p>
                </div>
              )}

              {/* PHOTO HISTORY SECTION */}
              {history.length > 0 && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Riwayat Foto ({history.length})</span>
                    <button 
                      onClick={onClearPhotos}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition py-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Hapus Foto
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                    {history.map((entry) => (
                      <div 
                        key={entry.id}
                        onClick={() => {
                          if (entry.analysis) {
                            setResult(entry.analysis);
                            setSelectedResultEntry(entry);
                          }
                        }}
                        className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1 cursor-pointer hover:bg-white/10 hover:border-amber-500/20 transition flex justify-between items-center"
                      >
                        <div>
                          <span className="text-[10px] text-slate-305 font-bold block">{entry.date}</span>
                          <span className="text-[9px] text-slate-500 font-mono italic block">{entry.weight} kg | {entry.waist} cm</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-550" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            
            // --- DETAILED AI ANALYSIS RESULT INSIDE BENTO DASHBOARD ---
            <div className="space-y-5 animate-slide-up">
              
              {/* Verdict Score Ring Row */}
              <div className="bg-[#14141d] p-4 rounded-3xl border border-white/10 flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">SKOR PROGRES AI</span>
                  <p className="text-sm font-black text-amber-500 font-display uppercase tracking-wide mt-0.5 leading-none">
                    {result.simple_message}
                  </p>
                  <span className="text-[10px] text-slate-450 block mt-1">Status: <strong className="text-slate-300 font-bold uppercase">{result.progress_status.replace(/_/g, ' ')}</strong></span>
                </div>
                <div className="w-14 h-14 rounded-full bg-amber-500 flex flex-col items-center justify-center border-4 border-amber-950/40 shrink-0 shadow-lg">
                  <span className="text-lg font-black text-neutral-950 font-mono leading-none">{result.body_progress_score}</span>
                  <span className="text-[8px] font-bold text-neutral-850 uppercase leading-none mt-0.5">/10</span>
                </div>
              </div>

              {/* COACH CHAT STATEMENT BOX */}
              <div className="bg-gradient-to-br from-amber-500/5 to-white/5 p-4 rounded-2xl border border-white/5 space-y-1.5 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Catatan Visual AI Pelatih
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  "{result.visual_summary}"
                </p>
              </div>

              {/* BENTO GRID: BODY PART MEASUREMENTS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Metrik Detail Evolusi Otot</span>
                <div className="grid grid-cols-2 gap-3.5">
                  
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Bahu (Shoulders)</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(result.muscle_visual_change.shoulders, 'muscle')}`}>
                      {getLabelIndo(result.muscle_visual_change.shoulders)}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Dada (Chest)</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(result.muscle_visual_change.chest, 'muscle')}`}>
                      {getLabelIndo(result.muscle_visual_change.chest)}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Punggung (Back)</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(result.muscle_visual_change.back, 'muscle')}`}>
                      {getLabelIndo(result.muscle_visual_change.back)}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Lengan (Arms)</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(result.muscle_visual_change.arms, 'muscle')}`}>
                      {getLabelIndo(result.muscle_visual_change.arms)}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Pinggang & Perut</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(result.muscle_visual_change.waist_belly, 'waist')}`}>
                      {getLabelIndo(result.muscle_visual_change.waist_belly)}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Postur Bahu</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(result.muscle_visual_change.posture, 'posture')}`}>
                      {getLabelIndo(result.muscle_visual_change.posture)}
                    </span>
                  </div>

                </div>
              </div>

              {/* CLINICAL COACH DIAGNOSIS WRITER */}
              <div className="space-y-4 pt-2">
                <div className="bg-slate-930/50 p-4 border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">MASALAH UTAMA TERDETEKSI:</span>
                  <p className="text-xs text-slate-350 italic">"{result.main_issue || 'Luar biasa, tidak ada kendala buncit atau otot tertutup!'}"</p>
                </div>

                <div className="bg-emerald-950/20 p-4 border border-emerald-500/10 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-450 tracking-wider">AKSI REKOMENDASI PELATIH:</span>
                  <p className="text-xs text-slate-350">"{result.next_action}"</p>
                </div>
              </div>

              {/* NAVIGATING BACK HANDLER */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={startNewCheck}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                >
                  Analisis Ulang / Foto Baru
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-amber-500 text-neutral-950 font-black text-xs uppercase rounded-xl hover:bg-amber-400 active:scale-95 transition cursor-pointer"
                >
                  Selesai
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

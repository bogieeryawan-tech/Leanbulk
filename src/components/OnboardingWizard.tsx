import { useState } from 'react';
import { UserSettings } from '../types';
import { Dumbbell, Scale, Ruler, Zap, Brain, ArrowRight, User } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (settings: UserSettings) => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nickname: '',
    gender: 'male',
    height: 168,
    weight: 58,
    waist: 76,
    goalType: 'lean_bulk',
    targetWeight: 60,
    targetWaist: 77,
    timeline: 'normal',
    trainingLevel: 'beginner',
    equipment: [] as string[],
    supplements: [] as string[]
  });

  const generateSettings = (): UserSettings => {
    let protMin = 1.6;
    let protMax = 1.8;
    let gainMin = 0.5;
    let gainMax = 1;

    switch (formData.goalType) {
      case 'lean_bulk':
        protMin = 1.6; protMax = 2.0; gainMin = 0.5; gainMax = 1; break;
      case 'body_recomposition':
        protMin = 1.8; protMax = 2.2; gainMin = 0; gainMax = 0.5; break;
      case 'maintain':
        protMin = 1.4; protMax = 1.8; gainMin = 0; gainMax = 0; break;
      case 'mini_cut':
        protMin = 1.8; protMax = 2.4; gainMin = -0.5; gainMax = -1; break;
    }

    return {
      profile: {
        nickname: formData.nickname,
        gender: formData.gender as 'male' | 'female',
        height_cm: formData.height,
        starting_weight_kg: formData.weight,
        current_weight_kg: formData.weight,
        starting_waist_cm: formData.waist,
        current_waist_cm: formData.waist,
        training_level: formData.trainingLevel as 'beginner' | 'intermediate'
      },
      goal: {
        goal_type: formData.goalType as 'lean_bulk' | 'body_recomposition' | 'maintain' | 'mini_cut',
        target_weight_kg: formData.targetWeight,
        waist_limit_cm: formData.targetWaist,
        target_gain_min_kg_per_month: gainMin,
        target_gain_max_kg_per_month: gainMax,
        protein_multiplier_min: protMin,
        protein_multiplier_max: protMax,
        timeline_preference: formData.timeline as 'relaxed' | 'normal' | 'aggressive'
      },
      equipment: formData.equipment,
      supplements: formData.supplements
    };
  };

  const handleNext = () => setStep(s => s + 1);
  const handleComplete = () => onComplete(generateSettings());

  const eqOptions = [
    { id: 'dumbbell_3kg', label: 'Dumbbell 3 kg' },
    { id: 'dumbbell_6kg', label: 'Dumbbell 6 kg' },
    { id: 'pullup_bar', label: 'Pull-up Bar' },
    { id: 'yoga_mat', label: 'Matras Yoga' },
    { id: 'abs_roller', label: 'Abs Roller' },
  ];

  const suppOptions = [
    { id: 'lmen_platinum', label: 'L-men Platinum (Whey)' },
    { id: 'lmen_gain_mass', label: 'L-men Gain Mass' },
  ];

  const toggleArray = (arr: string[], val: string) => 
    arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val];

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 overflow-y-auto flex flex-col items-center p-4">
      <div className="w-full max-w-md my-auto space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-black font-display text-white tracking-widest uppercase flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-500" /> Pengaturan Awal
          </h1>
          <span className="text-xs font-bold text-slate-500">Langkah {step} / 3</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white leading-tight">Mulai dari data diri kamu.</h2>
            <p className="text-xs text-slate-400">Pastikan jujur supaya Coach AI bisa ngasih saran akurat.</p>
            
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nama Panggilan (Opsional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={formData.nickname} onChange={e => setFormData({ ...formData, nickname: e.target.value })} className="w-full bg-[#111115] border border-white/10 rounded-xl py-3 pl-10 pr-3 text-white text-sm focus:border-amber-500/50 outline-none" placeholder="Panggil kamu apa?" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tinggi (cm)</label>
                  <input type="number" value={formData.height || ''} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} className="w-full bg-[#111115] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Berat Saat Ini (kg)</label>
                  <input type="number" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })} className="w-full bg-[#111115] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lingkar Pinggang Saat Ini (cm)</label>
                <input type="number" value={formData.waist || ''} onChange={e => setFormData({ ...formData, waist: Number(e.target.value) })} className="w-full bg-[#111115] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
              </div>
            </div>

            <button onClick={handleNext} className="w-full py-4 mt-8 bg-white hover:bg-slate-200 text-neutral-900 font-black rounded-2xl flex justify-center items-center gap-2 cursor-pointer transition">
              Lanjut <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white leading-tight">Apa target utamamu?</h2>
            
            <div className="space-y-3 mt-4">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tujuan Utama</label>
              {[
                { id: 'lean_bulk', label: 'Naik Otot Tanpa Buncit (Lean Bulk)' },
                { id: 'body_recomposition', label: 'Body Recomposition (Bakar Lemak, Bangun Otot)' },
                { id: 'maintain', label: 'Maintain Bentuk Saja' },
                { id: 'mini_cut', label: 'Mini Cut / Keringin Perut (Defisit)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFormData({ ...formData, goalType: opt.id })}
                  className={`w-full text-left p-4 border rounded-2xl cursor-pointer transition ${formData.goalType === opt.id ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' : 'bg-[#111115] border-white/10 text-slate-300'}`}
                >
                  {opt.label}
                </button>
              ))}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Berat (kg)</label>
                  <input type="number" value={formData.targetWeight || ''} onChange={e => setFormData({ ...formData, targetWeight: Number(e.target.value) })} className="w-full bg-[#111115] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Batas Pinggang (cm)</label>
                  <input type="number" value={formData.targetWaist || ''} onChange={e => setFormData({ ...formData, targetWaist: Number(e.target.value) })} className="w-full bg-[#111115] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
              </div>
            </div>

            <button onClick={handleNext} className="w-full py-4 mt-8 bg-white hover:bg-slate-200 text-neutral-900 font-black rounded-2xl flex justify-center items-center gap-2 cursor-pointer transition">
              Lanjut <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white leading-tight">Perlengkapan & Pola Latihan</h2>
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Level Latihan</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormData({ ...formData, trainingLevel: 'beginner' })} className={`flex-1 py-3 border rounded-xl cursor-pointer text-sm font-bold transition ${formData.trainingLevel === 'beginner' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-[#111115] border-white/10 text-slate-400'}`}>Pemula</button>
                  <button onClick={() => setFormData({ ...formData, trainingLevel: 'intermediate' })} className={`flex-1 py-3 border rounded-xl cursor-pointer text-sm font-bold transition ${formData.trainingLevel === 'intermediate' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-[#111115] border-white/10 text-slate-400'}`}>Menengah</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Suka Progress Seberapa Cepat?</label>
                <div className="flex gap-2">
                  {['santai', 'normal', 'agresif'].map(t => (
                    <button key={t} onClick={() => setFormData({ ...formData, timeline: t })} className={`flex-1 py-2 border rounded-lg cursor-pointer text-xs font-bold uppercase transition ${formData.timeline === t ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-[#111115] border-white/10 text-slate-400'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div>
                 <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Alat Latihan yang Dimiliki</label>
                 <div className="grid grid-cols-2 gap-2">
                    {eqOptions.map(eq => (
                      <button key={eq.id} onClick={() => setFormData({ ...formData, equipment: toggleArray(formData.equipment, eq.id) })} className={`text-left px-3 py-2 border rounded-lg text-xs cursor-pointer transition ${formData.equipment.includes(eq.id) ? 'bg-purple-500/10 border-purple-500 text-purple-400 font-bold' : 'bg-[#111115] border-white/10 text-slate-400'}`}>
                        {eq.label}
                      </button>
                    ))}
                 </div>
              </div>

               <div>
                 <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Suplemen yang Dimiliki</label>
                 <div className="grid grid-cols-1 gap-2">
                    {suppOptions.map(eq => (
                      <button key={eq.id} onClick={() => setFormData({ ...formData, supplements: toggleArray(formData.supplements, eq.id) })} className={`text-left px-3 py-2 border rounded-lg text-xs cursor-pointer transition ${formData.supplements.includes(eq.id) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' : 'bg-[#111115] border-white/10 text-slate-400'}`}>
                        {eq.label}
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <button onClick={handleComplete} className="w-full py-4 mt-8 bg-amber-500 hover:bg-amber-400 text-neutral-900 font-black rounded-2xl flex justify-center items-center gap-2 cursor-pointer transition">
              Selesai, Mari Mulai! <CheckCircle className="w-4 h-4 ml-1 inline" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline fallback since icon wasn't imported
function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}

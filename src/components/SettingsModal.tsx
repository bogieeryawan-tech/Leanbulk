import { useState } from 'react';
import { UserSettings } from '../types';
import { Settings, Save, X } from 'lucide-react';

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export default function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState<UserSettings>(JSON.parse(JSON.stringify(settings))); // Deep clone

  const handleSave = () => {
    // Recalculate protein logic silently based on goal changes
    let protMin = 1.6;
    let protMax = 1.8;
    let gainMin = 0.5;
    let gainMax = 1;

    switch (formData.goal.goal_type) {
      case 'lean_bulk':
        protMin = 1.6; protMax = 2.0; gainMin = 0.5; gainMax = 1; break;
      case 'body_recomposition':
        protMin = 1.8; protMax = 2.2; gainMin = 0; gainMax = 0.5; break;
      case 'maintain':
        protMin = 1.4; protMax = 1.8; gainMin = 0; gainMax = 0; break;
      case 'mini_cut':
        protMin = 1.8; protMax = 2.4; gainMin = -0.5; gainMax = -1; break;
    }

    const newSettings: UserSettings = {
      ...formData,
      goal: {
        ...formData.goal,
        protein_multiplier_min: protMin,
        protein_multiplier_max: protMax,
        target_gain_min_kg_per_month: gainMin,
        target_gain_max_kg_per_month: gainMax,
      }
    };
    onSave(newSettings);
  };

  const setNestedGoal = (key: keyof UserSettings['goal'], value: any) => {
    setFormData({ ...formData, goal: { ...formData.goal, [key]: value } });
  };

  const setNestedProfile = (key: keyof UserSettings['profile'], value: any) => {
    setFormData({ ...formData, profile: { ...formData.profile, [key]: value } });
  };

  const eqOptions = [
    { id: 'dumbbell_3kg', label: 'Dumbbell 3 kg' },
    { id: 'dumbbell_6kg', label: 'Dumbbell 6 kg' },
    { id: 'pullup_bar', label: 'Pull-up Bar' },
    { id: 'yoga_mat', label: 'Matras Yoga' },
    { id: 'abs_roller', label: 'Abs Roller' },
  ];

  const suppOptions = [
    { id: 'lmen_platinum', label: 'L-men Platinum' },
    { id: 'lmen_gain_mass', label: 'L-men Gain Mass' },
  ];

  const toggleArray = (arr: string[], val: string, field: 'equipment' | 'supplements') => {
    const newArr = arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val];
    setFormData({ ...formData, [field]: newArr });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col pt-12 p-4 overflow-y-auto">
      <div className="bg-[#111115] border border-white/10 rounded-3xl w-full max-w-md mx-auto shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-3xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="text-sm font-black text-white font-display uppercase tracking-widest leading-none">Pengaturan Target</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition cursor-pointer bg-white/5 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Profile Basic */}
          <div className="space-y-3">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Data Fisik Saat Ini</h3>
             <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tinggi (cm)</label>
                  <input type="number" value={formData.profile.height_cm || ''} onChange={e => setNestedProfile('height_cm', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Berat (kg)</label>
                  <input type="number" value={formData.profile.current_weight_kg || ''} onChange={e => setNestedProfile('current_weight_kg', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
                 <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lingkar Pinggang (cm)</label>
                  <input type="number" value={formData.profile.current_waist_cm || ''} onChange={e => setNestedProfile('current_waist_cm', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Target & Goal</h3>
             <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tujuan Utama</label>
                <select value={formData.goal.goal_type} onChange={e => setNestedGoal('goal_type', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none">
                  <option value="lean_bulk">Naik Otot Tanpa Buncit (Lean Bulk)</option>
                  <option value="body_recomposition">Body Recomposition (Bakar Lemak, Bangun Otot)</option>
                  <option value="maintain">Maintain Bentuk Saja</option>
                  <option value="mini_cut">Mini Cut (Defisit Karbo/Kalori)</option>
                </select>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Berat (kg)</label>
                  <input type="number" value={formData.goal.target_weight_kg || ''} onChange={e => setNestedGoal('target_weight_kg', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Batas Pinggang (cm)</label>
                  <input type="number" value={formData.goal.waist_limit_cm || ''} onChange={e => setNestedGoal('waist_limit_cm', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500/50 outline-none text-center" />
                </div>
             </div>

             <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Preferensi Timeline</label>
                <select value={formData.goal.timeline_preference} onChange={e => setNestedGoal('timeline_preference', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none text-center">
                  <option value="santai">Santai</option>
                  <option value="normal">Normal</option>
                  <option value="agresif">Cepat / Agresif</option>
                </select>
             </div>
          </div>

           <div className="space-y-3">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Alat & Suplemen</h3>
             <div>
                 <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Alat Latihan yang Dimiliki</label>
                 <div className="flex flex-wrap gap-2">
                    {eqOptions.map(eq => (
                      <button key={eq.id} onClick={() => toggleArray(formData.equipment, eq.id, 'equipment')} className={`text-left px-3 py-1.5 border rounded-lg text-[10px] cursor-pointer transition ${formData.equipment.includes(eq.id) ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' : 'bg-black/50 border-white/10 text-slate-400'}`}>
                        {eq.label}
                      </button>
                    ))}
                 </div>
              </div>

               <div>
                 <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Suplemen yang Dimiliki</label>
                 <div className="flex flex-wrap gap-2">
                    {suppOptions.map(eq => (
                      <button key={eq.id} onClick={() => toggleArray(formData.supplements, eq.id, 'supplements')} className={`text-left px-3 py-1.5 border rounded-lg text-[10px] cursor-pointer transition ${formData.supplements.includes(eq.id) ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' : 'bg-black/50 border-white/10 text-slate-400'}`}>
                        {eq.label}
                      </button>
                    ))}
                 </div>
              </div>
          </div>

        </div>

        <div className="p-4 border-t border-white/5 bg-white/5 backdrop-blur-md rounded-b-3xl">
          <button onClick={handleSave} className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-900 font-black rounded-xl flex justify-center items-center gap-2 cursor-pointer transition uppercase tracking-wider text-xs">
            <Save className="w-4 h-4" /> Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

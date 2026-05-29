import React, { useState } from 'react';
import { DailyLog } from '../types';
import { X, Search, Activity, Zap, Info } from 'lucide-react';
import { calculatePadelCalories } from '../nutritionLogic';

interface ActivityLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLog: DailyLog;
  onUpdateDay: (log: DailyLog) => void;
  userWeightKg: number;
}

const commonActivities = [
  { id: 'jalan_kaki', name: 'Jalan Kaki Santai', default_minutes: 30, default_cals_per_min: 4 }, // ~120 kcal for 30min
  { id: 'lari_jogging', name: 'Lari / Jogging', default_minutes: 30, default_cals_per_min: 9 }, // ~270 kcal for 30min
  { id: 'sepeda', name: 'Bersepeda Santai', default_minutes: 60, default_cals_per_min: 5 }, // ~300 kcal for 60min
  { id: 'futsal', name: 'Futsal / Mini Soccer', default_minutes: 60, default_cals_per_min: 7 }, // ~420 kcal for 60min
  { id: 'berenang', name: 'Berenang', default_minutes: 45, default_cals_per_min: 6 }, // ~270 kcal for 45min
];

export function ActivityLoggerModal({ isOpen, onClose, dayLog, onUpdateDay, userWeightKg }: ActivityLoggerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customName, setCustomName] = useState('');
  const [customMinutes, setCustomMinutes] = useState(30);
  const [customCalories, setCustomCalories] = useState(150);
  const [activeTab, setActiveTab] = useState<'preset' | 'padel' | 'custom'>('preset');

  // Padel specific states
  const [padelHours, setPadelHours] = useState(2);
  const [padelPlayers, setPadelPlayers] = useState(6);

  const padelDetails = calculatePadelCalories(userWeightKg, padelHours * 60, padelPlayers);
  const activeMins = Math.round((padelHours * 60) * padelDetails.activeFactor);
  const estimatedCalories = padelDetails.calories;

  if (!isOpen) return null;

  const handleAddActivity = (name: string, duration_minutes: number, calories_burned: number) => {
    const updatedLog: DailyLog = {
      ...dayLog,
      activities: [
        ...(dayLog.activities || []),
        {
          id: 'activity-' + Date.now(),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          name,
          duration_minutes,
          calories_burned
        }
      ]
    };
    onUpdateDay(updatedLog);
    onClose();
  };

  const filteredPresets = commonActivities.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-[#151518] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Catat Olahraga
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 flex border-b border-white/5">
          <button 
            className={`flex-1 p-2 text-xs font-bold rounded-xl transition ${activeTab === 'preset' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
            onClick={() => setActiveTab('preset')}
          >
            Pilih Instan
          </button>
          <button 
            className={`flex-1 p-2 text-xs font-bold rounded-xl transition ${activeTab === 'padel' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}
            onClick={() => setActiveTab('padel')}
          >
            Kalkulator Padel
          </button>
          <button 
            className={`flex-1 p-2 text-xs font-bold rounded-xl transition ${activeTab === 'custom' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
            onClick={() => setActiveTab('custom')}
          >
            Input Manual
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {activeTab === 'preset' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari olahraga (Padel, lari, dll)..." 
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 mt-4">
                {filteredPresets.map(preset => {
                  const calories = Math.round(preset.default_minutes * preset.default_cals_per_min);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleAddActivity(preset.name, preset.default_minutes, calories)}
                      className="bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 p-4 rounded-2xl flex flex-col items-start transition w-full text-left active:scale-[0.98]"
                    >
                      <span className="text-sm font-bold text-white block">{preset.name}</span>
                      <div className="flex items-center gap-3 mt-1.5 opacity-70">
                        <span className="text-xs text-slate-400 flex items-center gap-1">⌚ {preset.default_minutes} mnt</span>
                        <span className="text-xs text-blue-400 flex items-center gap-1 font-mono font-bold"><Zap className="w-3 h-3" /> {calories} kkal</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-2 mt-4">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-blue-200/80 leading-relaxed font-medium">Untuk padel, gunakan tab Kalkulator Padel agar estimasi kalori mengikuti berat badan, durasi, dan jumlah pemain.</p>
              </div>
            </div>
          ) : activeTab === 'padel' ? (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl mb-4">
                <p className="text-sm font-bold text-blue-200 mb-1">Kalkulator Cerdas Padel</p>
                <p className="text-[10px] text-blue-400/80 leading-relaxed font-medium">Bermain Padel 2 jam dengan 6 orang tentu lebih banyak istirahat dibanding main ber-4. Kalkulator ini menghitung kalori spesifik berdasarkan lama bermain dan jumlah pemain di lapangan.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Sewa Lapangan</label>
                  <select 
                    value={padelHours}
                    onChange={(e) => setPadelHours(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-4 text-white font-mono flex items-center text-center font-bold focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value={1}>1 Jam</option>
                    <option value={1.5}>1.5 Jam</option>
                    <option value={2}>2 Jam</option>
                    <option value={2.5}>2.5 Jam</option>
                    <option value={3}>3 Jam</option>
                    <option value={4}>4 Jam</option>
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jumlah Pemain</label>
                   <select 
                    value={padelPlayers}
                    onChange={(e) => setPadelPlayers(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-4 text-white font-mono flex items-center text-center font-bold focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value={4}>4 Orang (Penuh)</option>
                    <option value={5}>5 Orang (Rotasi)</option>
                    <option value={6}>6 Orang (Rotasi)</option>
                    <option value={7}>7 Orang (Rotasi)</option>
                    <option value={8}>8 Orang (Rotasi Panjang)</option>
                    <option value={9}>9 Orang (Banyak Duduk)</option>
                    <option value={10}>10 Orang (1 Court + Nongkrong)</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0A0A0B] border border-white/10 p-4 rounded-xl flex items-center justify-between mt-4">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estimasi Bermain Aktif</span>
                  <span className="block text-lg font-mono font-black text-white mt-1">
                    {activeMins} <span className="text-xs text-slate-500">mnt</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kalori Terbakar</span>
                  <span className="block text-lg font-mono font-black text-blue-400 mt-1 flex items-center gap-1 justify-end">
                    <Zap className="w-4 h-4" /> {estimatedCalories} <span className="text-xs text-slate-500">kkal</span>
                  </span>
                </div>
              </div>

              <div className="text-center mt-3 px-1">
                <p className="text-[10px] text-slate-300 font-semibold">
                  Padel {padelHours} jam, {padelPlayers} orang: ±{estimatedCalories} kkal
                </p>
                <p className="text-[9px] text-slate-500 leading-relaxed font-normal mt-1 italic">
                  Dihitung dari berat badan, durasi, dan jumlah pemain. Karena ada rotasi, estimasi lebih rendah dibanding main full nonstop.
                </p>
              </div>

              <button
                onClick={() => {
                  handleAddActivity(`Padel (${padelHours}j, ${padelPlayers} Org)`, padelHours * 60, estimatedCalories);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition mt-4"
              >
                Catat Padel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Olahraga</label>
                <input 
                  type="text" 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Misal: Padel Doubles"
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-4 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Durasi (Menit)</label>
                  <input 
                    type="number" 
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-4 text-white font-mono flex items-center text-center font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kalori Dibakar</label>
                  <input 
                    type="number" 
                    value={customCalories}
                    onChange={(e) => setCustomCalories(Number(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-4 text-blue-400 font-mono flex items-center text-center font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                disabled={!customName}
                onClick={() => handleAddActivity(customName || 'Aktivitas Ekstra', customMinutes, customCalories)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition mt-4"
              >
                Catat Olahraga
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

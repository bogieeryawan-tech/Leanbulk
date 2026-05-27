/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { SupplementLog } from '../types';
import { X, CheckCircle, Zap, Flame, Plus, Trash2 } from 'lucide-react';

interface SupplementLoggerModalProps {
  onClose: () => void;
  onSaveSupplement: (supp: SupplementLog) => void;
  onDeleteSupplement: (id: string) => void;
  todaySupplements: SupplementLog[];
}

export default function SupplementLoggerModal({
  onClose,
  onSaveSupplement,
  onDeleteSupplement,
  todaySupplements
}: SupplementLoggerModalProps) {
  
  const handleLogSupplement = (type: "platinum_whey" | "gain_mass_half" | "gain_mass_full") => {
    let name = '';
    let protein_g = 0;
    let calories = 0;

    switch (type) {
      case 'platinum_whey':
        name = 'L-Men Platinum (1 Scoop)';
        protein_g = 25;
        calories = 120;
        break;
      case 'gain_mass_half':
        name = 'L-Men Gain Mass (1/2 Serving)';
        protein_g = 11;
        calories = 150;
        break;
      case 'gain_mass_full':
        name = 'L-Men Gain Mass (Full Serving)';
        protein_g = 22;
        calories = 300;
        break;
    }

    const newLog: SupplementLog = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      type,
      name,
      protein_g,
      calories
    };

    onSaveSupplement(newLog);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800/80">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            Pencatatan Suplemen
          </h3>
          <button onClick={onClose} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          
          {/* Quick buttons */}
          <div className="space-y-3">
            <span className="block text-xs font-bold text-zinc-400">PILIHAN REKOMENDASI L-MEN CEPAT</span>
            
            <button
              onClick={() => handleLogSupplement('platinum_whey')}
              className="w-full p-4 bg-zinc-950 hover:bg-zinc-900 border border-emerald-550/20 rounded-2xl text-left flex justify-between items-center transition cursor-pointer group"
            >
              <div>
                <span className="block text-sm font-bold text-white">L-Men Platinum Whey</span>
                <span className="text-xs text-zinc-500">1 Scoop (Penyuplai protein murni / protein gap)</span>
              </div>
              <div className="text-right font-mono">
                <span className="block text-emerald-400 font-extrabold text-sm">+25g Pro</span>
                <span className="block text-zinc-500 text-[10px]">120 kkal</span>
              </div>
            </button>

            <button
              onClick={() => handleLogSupplement('gain_mass_half')}
              className="w-full p-4 bg-zinc-950 hover:bg-zinc-900 border border-amber-550/20 rounded-2xl text-left flex justify-between items-center transition cursor-pointer group"
            >
              <div>
                <span className="block text-sm font-bold text-white">L-Men Gain Mass (Setengah)</span>
                <span className="text-xs text-zinc-500">1/2 serving harian (menjaga lemak buncit)</span>
              </div>
              <div className="text-right font-mono">
                <span className="block text-amber-500 font-extrabold text-sm">+11g Pro</span>
                <span className="block text-zinc-500 text-[10px]">150 kkal</span>
              </div>
            </button>

            <button
              onClick={() => handleLogSupplement('gain_mass_full')}
              className="w-full p-4 bg-zinc-950 hover:bg-zinc-900 border border-amber-550/30 rounded-2xl text-left flex justify-between items-center transition cursor-pointer group"
            >
              <div>
                <span className="block text-sm font-bold text-white">L-Men Gain Mass (Penuh)</span>
                <span className="text-xs text-zinc-500">Full serving harian (untuk booster kalori stuck)</span>
              </div>
              <div className="text-right font-mono">
                <span className="block text-amber-500 font-extrabold text-sm">+22g Pro</span>
                <span className="block text-zinc-500 text-[10px]">300 kkal</span>
              </div>
            </button>
          </div>

          {/* Today logged supplements list */}
          <div className="space-y-2.5">
            <span className="block text-xs font-bold text-zinc-400">RIWAYAT LOG SUPLEMEN HARI INI</span>
            
            {todaySupplements.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4 text-center border border-zinc-800 border-dashed rounded-xl">
                Belum ada suplemen yang dicatat hari ini.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {todaySupplements.map((supp) => (
                  <div key={supp.id} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-zinc-200">{supp.name}</span>
                      <span className="block text-[10px] text-zinc-500">Dicatat Jam {supp.time}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="block font-bold text-emerald-400">+{supp.protein_g}g Pro</span>
                        <span className="block text-[10px] text-zinc-500">{supp.calories} kkal</span>
                      </div>
                      <button
                        onClick={() => onDeleteSupplement(supp.id)}
                        className="p-1 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                        title="Hapus pencatatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-350 rounded-xl transition cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
}

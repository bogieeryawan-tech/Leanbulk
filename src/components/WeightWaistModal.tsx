/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { DailyLog } from '../types';
import { getLocalDateString, getLeanBulkStatus, getWeightChange, getWaistChange } from '../utils';
import { X, Scale, Ruler, LineChart, TrendingUp, TrendingDown, HelpCircle, Save } from 'lucide-react';

interface WeightWaistModalProps {
  onClose: () => void;
  onSaveWeightWaist: (weight: number, waist: number) => void;
  todayLog: DailyLog;
  logs: DailyLog[];
}

export default function WeightWaistModal({
  onClose,
  onSaveWeightWaist,
  todayLog,
  logs
}: WeightWaistModalProps) {
  const [weight, setWeight] = useState<string>(todayLog.weightWaist?.weight?.toString() || '');
  const [waist, setWaist] = useState<string>(todayLog.weightWaist?.waist?.toString() || '');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSave = () => {
    setErrorMsg('');
    const numWeight = parseFloat(weight);
    const numWaist = parseFloat(waist);

    if (isNaN(numWeight) || numWeight <= 0) {
      setErrorMsg('Masukkan angka berat badan yang valid!');
      return;
    }

    if (isNaN(numWaist) || numWaist <= 0) {
      setErrorMsg('Masukkan angka lingkar pinggang yang valid!');
      return;
    }

    onSaveWeightWaist(numWeight, numWaist);
    onClose();
  };

  const statusInfo = getLeanBulkStatus(logs);
  const weightChange = getWeightChange(logs);
  const waistChange = getWaistChange(logs);

  // Prepare data for standard chart drawing (last 7 logged weights/waist)
  const chartedLogs = [...logs]
    .filter(l => l.weightWaist?.weight !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800/80">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-500" />
            Berat & Lingkar Pinggang
          </h3>
          <button onClick={onClose} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Status badge and report */}
          <div className={`p-4 rounded-2xl border ${statusInfo.color} space-y-1.5`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider">Status Evaluasi Bulking</span>
              <span className="text-xs font-mono font-bold bg-white/5 px-2 py-0.5 rounded">
                7-Hari Avg
              </span>
            </div>
            <h4 className="text-lg font-extrabold">{statusInfo.status}</h4>
            <p className="text-xs leading-relaxed opacity-90">{statusInfo.desc}</p>
          </div>

          {/* Core inputs form */}
          <div className="bg-zinc-950 border border-zinc-805 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-400" /> Berat Badan (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Mulai 58"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pr-10 text-sm font-semibold text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs text-zinc-500 font-bold">kg</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-blue-400" /> Lingkar Pinggang (cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="Misal: 76"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pr-10 text-sm font-semibold text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs text-zinc-500 font-bold">cm</span>
                </div>
              </div>

            </div>

            {errorMsg && (
              <p className="text-red-400 text-xs font-bold text-center mt-2 bg-red-500/10 py-2 rounded-lg border border-red-500/20">{errorMsg}</p>
            )}

            <button
              onClick={handleSave}
              className="w-full py-3 bg-blue-550 hover:bg-blue-600 font-bold text-white text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg bg-blue-600"
            >
              <Save className="w-4 h-4" /> Simpan Data Hari Ini
            </button>
          </div>

          {/* Double trend card layout */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900/60 space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Tren Berat Total</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-white font-mono">
                  {weightChange.text}
                </span>
                {weightChange.change > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : weightChange.change < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                ) : null}
              </div>
              <p className="text-[9.5px] text-zinc-650 font-normal leading-normal">
                Kenaikan ideal otot kering: 0.5 - 1 kg/bulan. Jaga dari kenaikan kilat.
              </p>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900/60 space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Perubahan Pinggang</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-white font-mono">
                  {waistChange.text}
                </span>
                {waistChange.change > 1 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold">Stable</span>
                )}
              </div>
              <p className="text-[9.5px] text-zinc-650 font-normal leading-normal">
                Jika naik {`>`} 1cm dalam 2 minggu, segera pangkas porsi makan/Gain Mass.
              </p>
            </div>
          </div>

          {/* Simple Highly Responsive Vector Chart representation of last 7 entries (Robust SVG) */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <LineChart className="w-4 h-4 text-blue-400" /> Grafik Tren Progresif (7 Log Terakhir)
            </span>

            {chartedLogs.length < 2 ? (
              <p className="text-xs text-zinc-550 italic text-center py-6">
                Masukkan minimal 2 log data berat badan untuk menggambar kurva progresif otomatis.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Visual SVG weight curve */}
                <div className="h-28 w-full bg-zinc-900/40 rounded-xl p-2 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    {/* Render helper gridlines */}
                    <line x1="0" y1="15" x2="100" y2="15" stroke="#333" strokeDasharray="2,2" strokeWidth="0.5" />
                    
                    {/* Render trend path */}
                    {(() => {
                      const minW = Math.min(...chartedLogs.map(l => l.weightWaist?.weight || 0)) - 0.5;
                      const maxW = Math.max(...chartedLogs.map(l => l.weightWaist?.weight || 0)) + 0.5;
                      const range = maxW - minW || 1;
                      
                      const points = chartedLogs.map((log, index) => {
                        const x = (index / (chartedLogs.length - 1)) * 100;
                        const w = log.weightWaist?.weight || 0;
                        const y = 30 - ((w - minW) / range) * 26 - 2; // Keep padding
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            points={points}
                          />
                          {/* Dot markers */}
                          {chartedLogs.map((log, index) => {
                            const x = (index / (chartedLogs.length - 1)) * 100;
                            const w = log.weightWaist?.weight || 0;
                            const y = 30 - ((w - minW) / range) * 26 - 2;
                            return (
                              <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="1.5"
                                fill="#fff"
                                stroke="#3b82f6"
                                strokeWidth="0.8"
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-x-0 bottom-1 flex justify-between px-2 text-[9px] text-zinc-500 font-mono">
                    <span>{chartedLogs[0].date.split('-').slice(1).join('/')}</span>
                    <span>TREN BERAT (kg)</span>
                    <span>{chartedLogs[chartedLogs.length - 1].date.split('-').slice(1).join('/')}</span>
                  </div>
                </div>

                {/* Legend list of logged data */}
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono font-medium text-zinc-400">
                  {chartedLogs.slice(-4).map((log, i) => (
                    <div key={i} className="bg-zinc-900/60 p-1.5 rounded-lg">
                      <span className="block text-[8px] text-zinc-500">{log.date.split('-').slice(1).join('/')}</span>
                      <span className="block text-zinc-200 mt-0.5">{log.weightWaist?.weight} kg</span>
                    </div>
                  ))}
                </div>
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
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

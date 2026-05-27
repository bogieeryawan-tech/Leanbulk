/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { DailyLog, BodyProgressEntry } from '../types';
import { Download, Upload, Trash2, Settings, HelpCircle, FileText, Check } from 'lucide-react';

interface DataManagementProps {
  logs: DailyLog[];
  onImportData: (newLogs: DailyLog[], newProgress: BodyProgressEntry[]) => void;
  onResetData: () => void;
}

export default function DataManagement({ logs, onImportData, onResetData }: DataManagementProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{text: string; isError: boolean} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayStatus = (text: string, isError: boolean = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Export JSON
  const handleExport = () => {
    try {
      const bodyProgress = JSON.parse(localStorage.getItem('lean_bulk_body_progress') || '[]');
      const backupData = {
        logs,
        bodyProgress
      };
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lean-bulk-ai-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      displayStatus('Data berhasil diekspor.');
    } catch (e) {
      displayStatus('Gagal mengekspor data: ' + e, true);
    }
  };

  // Import JSON
  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        if (parsed && typeof parsed === 'object') {
          // 1. Unified structure import
          if ('logs' in parsed && 'bodyProgress' in parsed && Array.isArray(parsed.logs)) {
            onImportData(parsed.logs, parsed.bodyProgress);
            displayStatus('Sukses! Seluruh data harian & foto progres fisik berhasil diimpor.');
            setShowPanel(false);
            return;
          }
          // 2. Fallback legacy import
          if (Array.isArray(parsed)) {
            onImportData(parsed, []);
            displayStatus('Sukses! Data rincian harian berhasil diimpor.');
            setShowPanel(false);
            return;
          }
        }
        displayStatus('Format file JSON tidak sesuai standar Lean Bulk AI Tracker.', true);
      } catch (err) {
        displayStatus('Gagal membaca file JSON: format tidak valid.', true);
      }
    };
    reader.readAsText(file);
  };

  const triggerImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleExecuteReset = () => {
    onResetData();
    displayStatus('Seluruh data berhasil dibersihkan.');
    setShowConfirmReset(false);
    setShowPanel(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl mb-12">
      <div 
        onClick={() => setShowPanel(!showPanel)}
        className="flex justify-between items-center cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-zinc-350">Utilitas Cadangan Data</span>
        </div>
        <span className="text-xs text-amber-500 font-bold hover:underline">
          {showPanel ? 'Sembunyikan' : 'Kelola Data'}
        </span>
      </div>

      {statusMsg && (
        <div className={`mt-3 p-2 rounded-lg text-center text-xs font-bold ${statusMsg.isError ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      {showPanel && !showConfirmReset && (
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4 animate-fade-in">
          <p className="text-[10.5px] text-zinc-400 leading-relaxed leading-normal">
            Di Lean Bulk AI Tracker, data disimpan murni secara lokal di dalam memori penjelajah browser milikmu (localStorage). Gunakan menu di bawah jika ingin memindahkan data ke perangkat lain atau melakukan reset.
          </p>

          <div className="grid grid-cols-2 gap-2">
            
            <button
              onClick={handleExport}
              className="py-2.5 px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" /> Ekspor ke JSON
            </button>

            <button
              onClick={triggerImportFile}
              className="py-2.5 px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" /> Impor dari JSON
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />

          </div>

          <button
            onClick={() => setShowConfirmReset(true)}
            className="w-full py-2.5 bg-red-950/20 hover:bg-red-900/10 border border-red-500/20 text-xs font-bold text-red-400 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus Seluruh Riwayat Data
          </button>
        </div>
      )}

      {showConfirmReset && (
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 animate-fade-in text-center pb-2">
           <span className="inline-block p-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
            <Trash2 className="w-6 h-6" />
           </span>
           <h3 className="text-sm font-black text-white font-display uppercase tracking-tight">Peringatan Mutlak</h3>
           <p className="text-[11px] text-zinc-400 leading-relaxed max-w-sm mx-auto mb-4">
             Tindakan ini akan <b>MENGHAPUS PERMANEN</b> seluruh riwayat makanan, suplemen, berat/pinggang, latihan, dan RIWAYAT FOTO PROGRES AI. Tidak bisa dibatalkan tanpa backup JSON.
           </p>
           
           <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-zinc-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteReset}
                className="py-2.5 px-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md shadow-red-500/20 rounded-xl text-xs font-bold text-white transition cursor-pointer"
              >
                <span className="flex items-center justify-center gap-1">Ya, Hapus <Trash2 className="w-3.5 h-3.5"/></span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

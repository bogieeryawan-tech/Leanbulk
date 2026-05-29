/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { X, Smartphone, ArrowDownToLine, Share, PlusSquare, CheckCircle, Eclipse } from 'lucide-react';

interface InstallPwaModalProps {
  onClose: () => void;
}

export default function InstallPwaModal({ onClose }: InstallPwaModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Capture Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const getShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-[#111115] border border-purple-500/20 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-white/5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Smartphone className="w-4 h-4 text-purple-500" />
            Install Aplikasi HP
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <div className="w-full h-full rounded-2xl bg-[#0a0614] flex items-center justify-center font-black text-white text-base tracking-tighter">
                LB
              </div>
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wide">Lean Bulk AI di HP Kamu</h2>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">Instal aplikasi ke menu utama atau home-screen HP kamu tanpa masuk App Store, untuk akses instan dan hemat baterai!</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Native Installer Card if prompting is active */}
            {deferredPrompt && (
              <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl flex flex-col items-center gap-3 text-center">
                <span className="text-[10px] bg-purple-500/10 text-purple-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider block">Dukungan Sekali Klik</span>
                <p className="text-xs text-white leading-normal">Browser kamu siap menginstal aplikasi ini secara langsung sekarang!</p>
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4" /> Pasang di HP Sekarang
                </button>
              </div>
            )}

            {/* Platform Guides */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Panduan Instalasi</span>

              {platform === 'ios' ? (
                /* iOS Safari instructions */
                <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-2xl">
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold font-mono">1</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Buka peramban <strong className="text-white font-bold">Safari</strong> di iPhone/iPad kamu lalu pastikan kamu membuka halaman ini.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start border-t border-white/5 pt-3">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold font-mono">2</span>
                    <p className="text-xs text-slate-300 leading-relaxed flex items-center flex-wrap gap-1">
                      Ketuk ikon <strong className="text-white font-bold flex items-center gap-0.5"><Share className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Share</strong> (tombol kotak dengan anak panah ke atas) di bilah navigasi bawah Safari.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start border-t border-white/5 pt-3">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold font-mono">3</span>
                    <p className="text-xs text-slate-300 leading-relaxed flex items-center flex-wrap gap-1">
                      Gulir ke bawah dan ketuk opsi <strong className="text-white font-bold flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Add to Home Screen</strong> (Tambahkan ke Layar Utama).
                    </p>
                  </div>
                </div>
              ) : (
                /* General Universal Android/Chrome instructions */
                <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-2xl">
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold font-mono">1</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ketuk ikon <strong className="text-white font-bold">titik tiga (⋮)</strong> di kanan atas browser Google Chrome kamu.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start border-t border-white/5 pt-3">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold font-mono">2</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pilih dan ketuk opsi <strong className="text-white font-bold">"Instal aplikasi" (Install "Lean Bulk AI")</strong> atau <strong className="text-white font-bold">"Tambahkan ke layar utama" (Add to Home screen)</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-white/5 pt-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Bagikan Link ke HP Anda</span>
            <button
              onClick={getShareLink}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Link Tersalin ke Clipboard!
                </>
              ) : (
                <>
                  <Share className="w-4 h-4 text-slate-400" /> Salin Tautan Aplikasi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

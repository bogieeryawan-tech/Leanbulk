/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { X, MessageSquare, Send, Sparkles, User, Brain, AlertCircle } from 'lucide-react';

interface AICoachModalProps {
  onClose: () => void;
}

export default function AICoachModal({ onClose }: AICoachModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      parts: [
        {
          text: 'Halo Bro! Saya adalah Lean Bulk AI Coach pribadimu. 💪\n\nDengan tinggi badanmu 168cm dan berat 58kg hari ini, fokus kita adalah menaikkan massa otot secara optimal tanpa menumpuk lemak di perut (bulking bersih!). Saya tahu persediaan suplemenmu (Platinum Whey & Gain Mass) serta alat yang kamu miliki (Dumbbell 3, 6kg, dan pull-up bar).\n\nAda keluhan latihan atau nutrisi yang mau didiskusikan hari ini?'
        }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterPrompts = [
    'Hari ini kurang makan harian, minum apa ya?',
    'Berat stuck, apakah mutlak harus minum Gain Mass?',
    'Latihan mentok dengan DB 3kg/6kg, cara naik bebannya bagaimana?',
    'Khawatir perut buncit saat bulking, gimana cara jaganya?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text }]
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Send chat history to backend
      const response = await fetch('/api/gemini/coach-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: data.text || 'Maaf, saya sedang mengalami gangguan koneksi gizi. Silakan coba sesaat lagi.' }]
        }
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: '❌ Terjadi kendala saat menghubungi AI Coach. Pastikan koneksi internet aman dan coba lagi.' }]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md h-[85vh] bg-zinc-900 border border-zinc-805 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border-zinc-800">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800/80 bg-zinc-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl relative">
              <Brain className="w-5 h-5" />
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-zinc-900"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                Lean Bulk AI Coach
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold block leading-none select-none">ONLINE • PERSONAL TRAINER</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messaging Logs chat box */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-950/10">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="p-1.5 bg-zinc-800 text-amber-550 h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-amber-500 select-none">
                    AI
                  </div>
                )}
                
                <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed space-y-1 ${
                  isUser 
                    ? 'bg-amber-500 text-neutral-900 font-medium rounded-tr-none' 
                    : 'bg-zinc-800/80 text-zinc-300 rounded-tl-none border border-zinc-850'
                }`}>
                  <p className="whitespace-pre-line font-sans">{msg.parts[0]?.text}</p>
                </div>

                {isUser && (
                  <div className="p-1.5 bg-amber-500/10 text-amber-400 h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold select-none">
                    ME
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="p-1.5 bg-zinc-800 text-amber-550 h-7 w-7 rounded-sm flex items-center justify-center text-[10px] font-bold text-amber-500 select-none">
                AI
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-800/80 border border-zinc-850 text-xs text-zinc-500 flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
                <span>Coach sedang merinci arahan...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter prompts list overlay */}
        {messages.length === 1 && (
          <div className="px-5 py-3 bg-zinc-950/25 border-t border-zinc-850 space-y-2">
            <span className="block text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider">Tanya Cepat AI Coach:</span>
            <div className="flex flex-wrap gap-1.5 pr-1 max-h-32 overflow-y-auto">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-2 text-[10.5px] font-medium text-amber-400 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition cursor-pointer text-left w-full"
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom input area */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            placeholder="Tanyakan resep / cara pakai Gain Mass..."
            disabled={loading}
            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-600 disabled:opacity-60"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={loading || !inputValue.trim()}
            className="p-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-900 rounded-xl transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

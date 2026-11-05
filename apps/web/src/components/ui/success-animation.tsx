'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, PartyPopper } from 'lucide-react';

interface SuccessAnimationProps {
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export function SuccessAnimation({ 
  message = 'Success!', 
  onComplete,
  duration = 3000 
}: SuccessAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-8 animate-bounce">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <CheckCircle2 className="w-20 h-20 text-green-600 animate-pulse" />
            <Sparkles className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 animate-spin" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{message}</div>
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <PartyPopper className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = [
  'bg-terra',
  'bg-forest',
  'bg-amber-400',
  'bg-blue-500',
  'bg-pink-500',
  'bg-purple-500',
]

export function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className={`absolute animate-fall w-2.5 h-3.5 rounded-sm ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            transform: `rotate(${Math.random() * 360}deg)`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

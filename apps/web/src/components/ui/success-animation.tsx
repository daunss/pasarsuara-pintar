'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

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
          <div className="text-4xl">🎉</div>
        </div>
      </div>
    </div>
  );
}

export function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        >
          {['🎉', '🎊', '✨', '⭐', '💫'][Math.floor(Math.random() * 5)]}
        </div>
      ))}
    </div>
  );
}

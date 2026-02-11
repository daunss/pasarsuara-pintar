'use client';

import { useState } from 'react';
import VoiceProcessingDemo from '@/components/dashboard/VoiceProcessingDemo';
import NegotiationChatDemo from '@/components/dashboard/NegotiationChatDemo';
import { MetricsShowcase } from '@/components/demo/MetricsShowcase';
import { DemoScriptCard } from '@/components/demo/DemoScriptCard';
import { Sparkles, MessageCircle, Mic, TrendingUp, BookOpen } from 'lucide-react';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'negotiation' | 'script'>('voice');

  return (
    <div className="page-bg">
      {/* Hero Section */}
      <div className="bg-forest text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold font-display mb-4 flex items-center justify-center gap-2 sm:gap-3">
              <Sparkles className="w-8 h-8 sm:w-12 sm:h-12" />
              Suara Niaga Pintar Demo
              <Sparkles className="w-8 h-8 sm:w-12 sm:h-12" />
            </h1>
            <p className="text-base sm:text-xl text-cream-light mb-6">
              Voice-First AI Business Assistant for Indonesian UMKM
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-center">
              <div>
                <div className="text-xl sm:text-3xl font-bold">⚡ 3s</div>
                <div className="text-cream-light text-sm sm:text-base">Voice Processing</div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-bold">🤖 95%</div>
                <div className="text-cream-light text-sm sm:text-base">Intent Accuracy</div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-bold">💰 30%</div>
                <div className="text-cream-light text-sm sm:text-base">Cost Reduction</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Showcase */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <MetricsShowcase />
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg transition-all flex items-center gap-2 sm:gap-3 ${
              activeTab === 'voice'
                ? 'bg-forest text-white shadow-warm scale-105'
                : 'bg-white text-charcoal hover:bg-cream shadow-soft'
            }`}
          >
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            Voice Processing
          </button>
          <button
            onClick={() => setActiveTab('negotiation')}
            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg transition-all flex items-center gap-2 sm:gap-3 ${
              activeTab === 'negotiation'
                ? 'bg-forest text-white shadow-warm scale-105'
                : 'bg-white text-charcoal hover:bg-cream shadow-soft'
            }`}
          >
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            AI Negotiation
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg transition-all flex items-center gap-2 sm:gap-3 ${
              activeTab === 'script'
                ? 'bg-forest text-white shadow-warm scale-105'
                : 'bg-white text-charcoal hover:bg-cream shadow-soft'
            }`}
          >
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            Demo Script
          </button>
        </div>

        {/* Demo Content */}
        <div className="animate-fade-in flex justify-center">
          {activeTab === 'voice' && <VoiceProcessingDemo />}
          {activeTab === 'negotiation' && <NegotiationChatDemo />}
          {activeTab === 'script' && <DemoScriptCard />}
        </div>

        {/* Features Highlight */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="card-warm p-6 text-center hover:shadow-warm transition-shadow">
            <div className="text-4xl mb-3">🎤</div>
            <h3 className="font-bold text-lg mb-2">Voice-First</h3>
            <p className="text-muted">
              No typing needed. Just speak in Bahasa Indonesia or local dialect.
            </p>
          </div>
          <div className="card-warm p-6 text-center hover:shadow-warm transition-shadow">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-lg mb-2">AI Negotiation</h3>
            <p className="text-muted">
              Multi-agent system negotiates best prices automatically.
            </p>
          </div>
          <div className="card-warm p-6 text-center hover:shadow-warm transition-shadow">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-lg mb-2">Real-time Analytics</h3>
            <p className="text-muted">
              Instant insights on sales, expenses, and inventory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

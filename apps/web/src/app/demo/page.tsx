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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-12 h-12" />
              PasarSuara Demo
              <Sparkles className="w-12 h-12" />
            </h1>
            <p className="text-xl text-green-100 mb-6">
              Voice-First AI Business Assistant for Indonesian UMKM
            </p>
            <div className="flex justify-center gap-8 text-center">
              <div>
                <div className="text-3xl font-bold">⚡ 3s</div>
                <div className="text-green-100">Voice Processing</div>
              </div>
              <div>
                <div className="text-3xl font-bold">🤖 95%</div>
                <div className="text-green-100">Intent Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold">💰 30%</div>
                <div className="text-green-100">Cost Reduction</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Showcase */}
      <div className="container mx-auto px-4 py-8">
        <MetricsShowcase />
      </div>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3 ${
              activeTab === 'voice'
                ? 'bg-green-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
            }`}
          >
            <Mic className="w-6 h-6" />
            Voice Processing
          </button>
          <button
            onClick={() => setActiveTab('negotiation')}
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3 ${
              activeTab === 'negotiation'
                ? 'bg-green-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            AI Negotiation
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3 ${
              activeTab === 'script'
                ? 'bg-green-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
            }`}
          >
            <BookOpen className="w-6 h-6" />
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
          <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-3">🎤</div>
            <h3 className="font-bold text-lg mb-2">Voice-First</h3>
            <p className="text-gray-600">
              No typing needed. Just speak in Bahasa Indonesia or local dialect.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-lg mb-2">AI Negotiation</h3>
            <p className="text-gray-600">
              Multi-agent system negotiates best prices automatically.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-lg mb-2">Real-time Analytics</h3>
            <p className="text-gray-600">
              Instant insights on sales, expenses, and inventory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

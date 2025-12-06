'use client';

import { useState } from 'react';
import { Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const demoScript = [
  {
    section: 'Opening',
    duration: '30s',
    steps: [
      'Introduce problem: Bu Siti warung owner challenges',
      'Show pain points: No time to record, can\'t negotiate',
      'Present solution: PasarSuara voice-first AI',
    ]
  },
  {
    section: 'Dashboard Demo',
    duration: '1m',
    steps: [
      'Open: http://localhost:3000/dashboard',
      'Show: 40+ transactions in last 30 days',
      'Highlight: Revenue/expense charts',
      'Point out: Real-time analytics',
    ]
  },
  {
    section: 'Voice Processing',
    duration: '2m',
    steps: [
      'Navigate to: http://localhost:3000/demo',
      'Click: "Start Demo" button',
      'Watch: Recording → Transcribing → Understanding',
      'Show: Extracted data and success animation',
    ]
  },
  {
    section: 'AI Negotiation',
    duration: '1.5m',
    steps: [
      'Switch to: "AI Negotiation" tab',
      'Click: "Start Negotiation"',
      'Watch: Buyer/Seller agents chat',
      'Highlight: Savings calculation (14%)',
    ]
  },
  {
    section: 'Closing',
    duration: '30s',
    steps: [
      'Emphasize: 64 million UMKM in Indonesia',
      'Recap: Voice-first, AI-powered, Made for Indonesia',
      'Call to action: Transform UMKM businesses',
    ]
  }
];

export function DemoScriptCard() {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const totalDuration = demoScript.reduce((acc, section) => {
    const mins = parseFloat(section.duration);
    return acc + (section.duration.includes('m') ? mins : mins / 60);
  }, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">📋 Demo Script</h3>
        <div className="flex items-center gap-2 text-green-600">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">{totalDuration.toFixed(1)} min total</span>
        </div>
      </div>

      <div className="space-y-3">
        {demoScript.map((section, index) => {
          const isExpanded = expandedSection === index;
          
          return (
            <div
              key={index}
              className="border-2 border-gray-200 rounded-lg overflow-hidden transition-all hover:border-green-500"
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? null : index)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{section.section}</div>
                    <div className="text-sm text-gray-500">{section.duration}</div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 bg-white animate-fade-in">
                  <ul className="space-y-2">
                    {section.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-500">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-semibold text-green-900 mb-1">Pro Tips:</div>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Practice timing - aim for exactly 5 minutes</li>
              <li>• Speak clearly and confidently</li>
              <li>• Show passion for solving UMKM problems</li>
              <li>• Prepare for Q&A about scalability and privacy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

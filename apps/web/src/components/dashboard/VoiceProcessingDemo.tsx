'use client';

import { useState } from 'react';
import { Mic, Loader2, CheckCircle2, Brain, Database, Sparkles } from 'lucide-react';

type ProcessingStep = {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'complete';
  icon: any;
  detail?: string;
};

export default function VoiceProcessingDemo() {
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'record', label: 'Recording Voice', status: 'pending', icon: Mic },
    { id: 'transcribe', label: 'Transcribing Audio', status: 'pending', icon: Loader2 },
    { id: 'understand', label: 'Understanding Intent', status: 'pending', icon: Brain },
    { id: 'save', label: 'Saving Transaction', status: 'pending', icon: Database },
    { id: 'done', label: 'Complete!', status: 'pending', icon: CheckCircle2 },
  ]);
  const [transcription, setTranscription] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const simulateVoiceProcessing = async () => {
    setIsRecording(true);
    setTranscription('');
    setExtractedData(null);

    // Reset steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    // Step 1: Recording (2s)
    updateStep('record', 'processing', 'Listening...');
    await sleep(2000);
    updateStep('record', 'complete', '✓ Voice captured');

    // Step 2: Transcribing (2s)
    updateStep('transcribe', 'processing', 'Converting speech to text...');
    await sleep(1000);
    const demoText = 'Laku nasi goreng 15 porsi harga 15 ribu';
    setTranscription(demoText);
    await sleep(1000);
    updateStep('transcribe', 'complete', `✓ "${demoText}"`);

    // Step 3: Understanding Intent (2s)
    updateStep('understand', 'processing', 'Extracting transaction details...');
    await sleep(1000);
    const extracted = {
      type: 'SALE',
      product: 'Nasi Goreng',
      quantity: 15,
      price: 15000,
      total: 225000
    };
    setExtractedData(extracted);
    await sleep(1000);
    updateStep('understand', 'complete', '✓ Intent: SALE transaction');

    // Step 4: Saving (1s)
    updateStep('save', 'processing', 'Recording to database...');
    await sleep(1000);
    updateStep('save', 'complete', '✓ Transaction saved');

    // Step 5: Done!
    updateStep('done', 'complete', '🎉 Success!');
    setIsRecording(false);
  };

  const updateStep = (id: string, status: ProcessingStep['status'], detail?: string) => {
    setSteps(prev => prev.map(s => 
      s.id === id ? { ...s, status, detail } : s
    ));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🎤 Voice Processing Demo</h2>
        <button
          onClick={simulateVoiceProcessing}
          disabled={isRecording}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            isRecording
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isRecording ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Start Demo
            </span>
          )}
        </button>
      </div>

      {/* Processing Steps */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                step.status === 'processing'
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : step.status === 'complete'
                  ? 'bg-green-50 border-2 border-green-500'
                  : 'bg-gray-50 border-2 border-gray-200'
              }`}
            >
              <div className={`mt-1 ${
                step.status === 'processing' ? 'animate-pulse' : ''
              }`}>
                <Icon className={`w-6 h-6 ${
                  step.status === 'processing'
                    ? 'text-blue-600 animate-spin'
                    : step.status === 'complete'
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{step.label}</div>
                {step.detail && (
                  <div className="text-sm text-gray-600 mt-1">{step.detail}</div>
                )}
              </div>
              {step.status === 'complete' && (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Transcription Display */}
      {transcription && (
        <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-500 rounded-lg animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-900">Transcription</span>
          </div>
          <div className="text-lg text-purple-800 font-medium">
            "{transcription}"
          </div>
        </div>
      )}

      {/* Extracted Data Display */}
      {extractedData && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-900">Extracted Data</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-500">Type</div>
              <div className="font-bold text-green-600">{extractedData.type}</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-500">Product</div>
              <div className="font-bold">{extractedData.product}</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-500">Quantity</div>
              <div className="font-bold">{extractedData.quantity} porsi</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-500">Price</div>
              <div className="font-bold">Rp {extractedData.price.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-green-100 rounded text-center">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-2xl font-bold text-green-700">
              Rp {extractedData.total.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Success Confetti */}
      {steps[4].status === 'complete' && (
        <div className="mt-6 text-center animate-bounce">
          <div className="text-4xl">🎉</div>
          <div className="text-lg font-bold text-green-600 mt-2">
            Transaction Recorded Successfully!
          </div>
        </div>
      )}
    </div>
  );
}

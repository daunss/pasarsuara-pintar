'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, User, Bot, CheckCircle, TrendingDown, Sparkles } from 'lucide-react';

type Message = {
  role: 'buyer_agent' | 'seller_agent' | 'system';
  content: string;
  timestamp?: Date;
};

type NegotiationDemo = {
  product: string;
  initialPrice: number;
  targetPrice: number;
  finalPrice: number;
  messages: Message[];
};

const demoNegotiations: NegotiationDemo[] = [
  {
    product: 'Beras Premium 25kg',
    initialPrice: 12500,
    targetPrice: 12000,
    finalPrice: 11800,
    messages: [
      { role: 'buyer_agent', content: 'Saya butuh beras 25 kg, budget maksimal 12.000/kg' },
      { role: 'seller_agent', content: '[Pak Joyo] Stok ada 500 kg. Harga normal 12.500/kg, tapi untuk 25 kg bisa 12.200/kg' },
      { role: 'buyer_agent', content: 'Bisa 11.800/kg? Saya langganan tetap' },
      { role: 'seller_agent', content: '[Pak Joyo] Deal 11.800/kg untuk langganan. Total 295.000 untuk 25 kg' },
      { role: 'system', content: '✅ Negosiasi berhasil! Deal: Rp 11.800/kg' }
    ]
  },
  {
    product: 'Minyak Goreng 15L',
    initialPrice: 17500,
    targetPrice: 17000,
    finalPrice: 16000,
    messages: [
      { role: 'buyer_agent', content: 'Butuh minyak goreng 15 liter, harga berapa?' },
      { role: 'seller_agent', content: '[Bu Sari] Harga 17.500/liter untuk eceran' },
      { role: 'buyer_agent', content: 'Kalau ambil 15 liter bisa 16.000/liter?' },
      { role: 'seller_agent', content: '[Bu Sari] OK deal! 16.000/liter untuk 15 liter. Total 240.000' },
      { role: 'system', content: '✅ Deal closed! Hemat Rp 22.500' }
    ]
  },
  {
    product: 'Ayam Potong 20 ekor',
    initialPrice: 38000,
    targetPrice: 38000,
    finalPrice: 35000,
    messages: [
      { role: 'buyer_agent', content: 'Mau beli ayam 20 ekor, harga terbaik berapa?' },
      { role: 'seller_agent', content: '[Pak Budi] Ayam segar hari ini 38.000/ekor' },
      { role: 'buyer_agent', content: 'Bisa 35.000/ekor untuk 20 ekor?' },
      { role: 'seller_agent', content: '[Pak Budi] Oke deh, 35.000/ekor. Total 700.000 untuk 20 ekor' },
      { role: 'system', content: '✅ Negosiasi sukses! Hemat Rp 60.000' }
    ]
  }
];

export default function NegotiationChatDemo() {
  const [selectedDemo, setSelectedDemo] = useState(0);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentNego = demoNegotiations[selectedDemo];
  const savings = currentNego.initialPrice - currentNego.finalPrice;
  const savingsPercent = ((savings / currentNego.initialPrice) * 100).toFixed(1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  const startDemo = async () => {
    setIsPlaying(true);
    setDisplayedMessages([]);
    setCurrentMessageIndex(0);

    for (let i = 0; i < currentNego.messages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDisplayedMessages(prev => [...prev, {
        ...currentNego.messages[i],
        timestamp: new Date()
      }]);
      setCurrentMessageIndex(i + 1);
    }

    setIsPlaying(false);
  };

  const resetDemo = () => {
    setDisplayedMessages([]);
    setCurrentMessageIndex(0);
    setIsPlaying(false);
  };

  const selectDemo = (index: number) => {
    setSelectedDemo(index);
    resetDemo();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="w-7 h-7" />
              AI Negotiation Demo
            </h2>
            <p className="text-green-100 mt-1">Watch AI agents negotiate in real-time</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">Rp {savings.toLocaleString()}</div>
            <div className="text-green-100">Saved ({savingsPercent}%)</div>
          </div>
        </div>
      </div>

      {/* Demo Selector */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex gap-2 overflow-x-auto">
          {demoNegotiations.map((nego, index) => (
            <button
              key={index}
              onClick={() => selectDemo(index)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedDemo === index
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {nego.product}
            </button>
          ))}
        </div>
      </div>

      {/* Negotiation Info */}
      <div className="bg-blue-50 p-4 border-b">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Initial Price</div>
            <div className="text-lg font-bold text-red-600">
              Rp {currentNego.initialPrice.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Target Price</div>
            <div className="text-lg font-bold text-blue-600">
              Rp {currentNego.targetPrice.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Final Price</div>
            <div className="text-lg font-bold text-green-600">
              Rp {currentNego.finalPrice.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto p-6 bg-gray-50">
        {displayedMessages.length === 0 && !isPlaying && (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Click "Start Negotiation" to see AI agents in action</p>
            </div>
          </div>
        )}

        {displayedMessages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 animate-fade-in ${
              message.role === 'system' ? 'text-center' : ''
            }`}
          >
            {message.role === 'buyer_agent' && (
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 rounded-full p-2">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-blue-100 rounded-lg p-3 inline-block max-w-md">
                    <div className="text-xs text-blue-600 font-semibold mb-1">Buyer Agent 🤖</div>
                    <div className="text-gray-800">{message.content}</div>
                  </div>
                </div>
              </div>
            )}

            {message.role === 'seller_agent' && (
              <div className="flex items-start gap-3 justify-end">
                <div className="flex-1 text-right">
                  <div className="bg-green-100 rounded-lg p-3 inline-block max-w-md">
                    <div className="text-xs text-green-600 font-semibold mb-1">Seller Agent 👨‍🌾</div>
                    <div className="text-gray-800">{message.content}</div>
                  </div>
                </div>
                <div className="bg-green-600 rounded-full p-2">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            )}

            {message.role === 'system' && (
              <div className="flex justify-center">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full px-6 py-3 inline-flex items-center gap-2 shadow-lg animate-bounce">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">{message.content}</span>
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            )}
          </div>
        ))}

        {isPlaying && currentMessageIndex < currentNego.messages.length && (
          <div className="flex items-center gap-2 text-gray-500 animate-pulse">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="text-sm ml-2">AI thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 border-t flex gap-3">
        <button
          onClick={startDemo}
          disabled={isPlaying}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            isPlaying
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isPlaying ? 'Negotiating...' : 'Start Negotiation'}
        </button>
        <button
          onClick={resetDemo}
          disabled={isPlaying}
          className="px-6 py-3 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all"
        >
          Reset
        </button>
      </div>

      {/* Savings Summary */}
      {displayedMessages.length === currentNego.messages.length && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-t animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">Total Savings</div>
                <div className="text-2xl font-bold text-green-600">
                  Rp {savings.toLocaleString()} ({savingsPercent}%)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Negotiation Time</div>
              <div className="text-lg font-bold text-blue-600">~8 seconds</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

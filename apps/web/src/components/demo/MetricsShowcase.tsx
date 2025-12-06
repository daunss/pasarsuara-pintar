'use client';

import { TrendingUp, Zap, Target, DollarSign } from 'lucide-react';

const metrics = [
  {
    icon: Zap,
    label: 'Voice Processing',
    value: '<3s',
    description: 'Lightning fast transcription',
    color: 'blue'
  },
  {
    icon: Target,
    label: 'Intent Accuracy',
    value: '95%',
    description: 'Precise understanding',
    color: 'green'
  },
  {
    icon: DollarSign,
    label: 'Cost Reduction',
    value: '30%',
    description: 'Average savings',
    color: 'yellow'
  },
  {
    icon: TrendingUp,
    label: 'Revenue Increase',
    value: '20%',
    description: 'Better business insights',
    color: 'purple'
  }
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600 border-blue-500',
  green: 'bg-green-100 text-green-600 border-green-500',
  yellow: 'bg-yellow-100 text-yellow-600 border-yellow-500',
  purple: 'bg-purple-100 text-purple-600 border-purple-500',
};

export function MetricsShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const colorClass = colorClasses[metric.color as keyof typeof colorClasses];
        
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center mb-4`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metric.value}
            </div>
            <div className="font-semibold text-gray-700 mb-1">
              {metric.label}
            </div>
            <div className="text-sm text-gray-500">
              {metric.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}

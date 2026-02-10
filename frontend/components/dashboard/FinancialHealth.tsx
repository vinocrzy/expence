import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface FinancialHealthProps {
  savingsRate: number;
  netWorth: number;
}

export default function FinancialHealth({ savingsRate, netWorth }: FinancialHealthProps) {
  // Score Calculation
  const score = useMemo(() => {
    let s = Math.round(savingsRate * 2); 
    if (s < 0) s = 0;
    if (s > 100) s = 100;
    return s;
  }, [savingsRate]);

  // Determine health level
  let level = 'Needs Attention';
  let colorClass = 'text-red-400';
  let strokeColor = '#F87171'; // red-400
  let gradientId = 'gradientRed';
  let Icon = AlertTriangle;

  if (score >= 80) {
      level = 'Excellent';
      colorClass = 'text-green-400';
      strokeColor = '#34D399'; // green-400
      gradientId = 'gradientGreen';
      Icon = Shield;
  } else if (score >= 50) {
      level = 'Healthy';
      colorClass = 'text-blue-400';
      strokeColor = '#60A5FA'; // blue-400
      gradientId = 'gradientBlue';
      Icon = CheckCircle;
  } else if (score >= 30) {
      level = 'Fair';
      colorClass = 'text-yellow-400';
      strokeColor = '#FACC15'; // yellow-400
      gradientId = 'gradientYellow';
      Icon = TrendingUp;
  }

  // SVG Gauge Config
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center">
      {/* Background Glow */}
      <div className={clsx("absolute top-0 w-full h-1/2 opacity-10 blur-3xl pointer-events-none", {
          'bg-green-500': score >= 80,
          'bg-blue-500': score >= 50 && score < 80,
          'bg-yellow-500': score >= 30 && score < 50,
          'bg-red-500': score < 30
      })} />

      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 w-full text-center relative z-10">Financial Health</h3>
      
      <div className="relative w-40 h-40 flex items-center justify-center mb-4 z-10">
        <svg className="transform -rotate-90 w-40 h-40 drop-shadow-2xl">
          <defs>
            <linearGradient id="gradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="gradientBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="gradientYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <linearGradient id="gradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            className="text-black/40"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="80"
            cy="80"
          />
          
          {/* Progress */}
          <circle
            className="transition-all duration-1000 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke={`url(#${gradientId})`}
            fill="transparent"
            r={radius}
            cx="80"
            cy="80"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon className={clsx("w-6 h-6 mb-1", colorClass)} />
            <span className="text-4xl font-bold text-white tracking-tighter">{score}</span>
        </div>
      </div>

      <div className="text-center relative z-10">
          <h4 className={clsx("text-lg font-bold mb-1", colorClass)}>{level}</h4>
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
               <span>Savings Rate:</span>
               <span className="text-white font-bold">{Math.round(savingsRate)}%</span>
          </div>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import clsx from 'clsx';
// Note: Using a simple CSS/SVG circle for now to avoid bulky chartjs setup just for a gauge
// Or maybe stick to current pattern. Let's use SVG.

interface FinancialHealthProps {
  savingsRate: number;
  netWorth: number;
}

export default function FinancialHealth({ savingsRate, netWorth }: FinancialHealthProps) {
  // Simple score calculation (heuristic)
  // Max score 100.
  // Savings Rate contribution: up to 50pts (target 20% = 50pts?)
  // Net Worth contribution: simple logarithmic scale or just positive cash flow indicator?
  // Let's simplify: 
  // Score = (Savings Rate * 2). Cap at 100. Min 0.
  // If savings rate is negative, score drops.
  
  const score = useMemo(() => {
    let s = Math.round(savingsRate * 2); 
    // Bonus for high net worth? Maybe keep it simple to "Monthly Health"
    if (s < 0) s = 0;
    if (s > 100) s = 100;
    
    // Adjust logic: 
    // 50% savings = 100 score
    // 25% savings = 50 score
    // 0% savings = 0 score
    // <0 = 0
    return s;
  }, [savingsRate]);

  // Determine health level
  let level = 'Needs Attention';
  let color = 'text-red-500';
  let strokeColor = '#EF4444'; // red-500

  if (score >= 80) {
      level = 'Excellent';
      color = 'text-green-500';
      strokeColor = '#10B981'; // green-500
  } else if (score >= 50) {
      level = 'Healthy';
      color = 'text-blue-500';
      strokeColor = '#3B82F6'; // blue-500
  } else if (score >= 30) {
      level = 'Fair';
      color = 'text-yellow-500';
      strokeColor = '#EAB308'; // yellow-500
  }

  // Generic SVG Gauge
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg flex flex-col items-center">
      <h3 className="text-lg font-bold text-white mb-2 w-full text-left">Financial Health</h3>
      
      <div className="flex-1 flex flex-col items-center justify-center py-2">
          <div className="relative w-36 h-36 flex items-center justify-center mb-2">
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-36 h-36">
              <circle
                className="text-gray-700/30"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="72"
                cy="72"
              />
              <circle
                className={clsx("transition-all duration-1000 ease-out", color)}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="72"
                cy="72"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white tracking-tighter">{score}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium mt-1">Score</span>
            </div>
          </div>

          <div className="text-center">
              <h4 className={clsx("text-lg font-bold mb-1", color)}>{level}</h4>
              <p className="text-xs text-gray-400 max-w-[180px] mx-auto leading-relaxed">
                Based on your <span className="text-white font-medium">{Math.round(savingsRate)}%</span> savings rate.
              </p>
          </div>
      </div>
    </div>
  );
}

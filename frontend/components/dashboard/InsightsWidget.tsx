'use client';

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info, RefreshCw, Zap } from 'lucide-react';
import { transactionService, categoryService, getHouseholdId } from '@/lib/localdb-services';

// v2 Types
type InsightPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Insight {
  id: string;
  type: 'WARNING' | 'TIP' | 'ACHIEVEMENT' | 'OBSERVATION';
  title: string;
  message: string;
  score: number;
  priority: InsightPriority;
}

interface InsightSummary {
  burnRateStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
  monthProjection: number;
}

interface InsightResponse {
  insights: Insight[];
  summary: InsightSummary;
}

export function InsightsWidget() {
  const [data, setData] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);

      const householdId = await getHouseholdId();
      if (!householdId) {
          setLoading(false);
          return;
      }

      const [transactions, categories] = await Promise.all([
        transactionService.getByDateRange(householdId, start, end),
        categoryService.getAll(householdId)
      ]);

      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, categories }),
      });

      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (error) {
      console.error("Failed to fetch insights", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'ACHIEVEMENT': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'TIP': return <Sparkles className="h-4 w-4 text-purple-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getColor = (type: string) => {
      switch (type) {
        case 'WARNING': return 'bg-amber-500/5 border-amber-500/20 text-amber-200';
        case 'ACHIEVEMENT': return 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200';
        case 'TIP': return 'bg-purple-500/5 border-purple-500/20 text-purple-200';
        default: return 'bg-blue-500/5 border-blue-500/20 text-blue-200';
      }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="glass-panel border-0 relative overflow-hidden p-0 flex flex-col bg-gradient-to-b from-white/5 to-transparent">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-32 h-32 text-primary" />
      </div>
      
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Insights
            </h3>
            <button 
                onClick={fetchInsights} 
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-white hover:bg-white/10 p-2 rounded-md transition-colors flex items-center gap-1"
            >
                {loading ? <RefreshCw className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
            </button>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        {loading && !data ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
                 <RefreshCw className="w-6 h-6 animate-spin text-primary/50" />
                <p className="text-sm text-muted-foreground animate-pulse">Analyzing finances...</p>
            </div>
        ) : data ? (
            <>
                {/* Monthly Snapshot Section */}
                {data.summary && (
                    <div className="grid grid-cols-2 gap-3">
                         <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Savings Rate</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-white">
                                    {(data.summary.monthProjection > 0 ? (data.summary.monthProjection / (data.summary.monthProjection + 50000)) * 100 : 0).toFixed(0)}%
                                </span>
                                {/* Placeholder logic for rate */}
                                <span className="text-xs text-emerald-400 flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-0.5" /> +2%
                                </span>
                            </div>
                         </div>
                         <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Burn Rate</p>
                            <div className={`flex items-center gap-2 font-bold ${data.summary.burnRateStatus === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'}`}>
                                {data.summary.burnRateStatus === 'CRITICAL' ? 'High' : 'Safe'}
                                {data.summary.burnRateStatus === 'CRITICAL' && <Zap className="w-4 h-4 fill-current"/>}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Proj. {formatCurrency(data.summary.monthProjection)}
                            </p>
                         </div>
                    </div>
                )}

                {/* Insight List */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {data.insights.length} Observations
                    </h4>
                    
                    {data.insights.length > 0 ? (
                        data.insights.slice(0, 10).map((insight) => (
                            <div 
                                key={insight.id} 
                                className={`p-4 rounded-xl border backdrop-blur-sm transition-all hover:bg-white/5 ${getColor(insight.type)}`}
                            >
                                <div className="flex gap-3">
                                    <div className="mt-1 shrink-0 p-1.5 rounded-full bg-black/20 backdrop-blur-md">
                                        {getIcon(insight.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-medium text-sm text-white/90 leading-tight">
                                                {insight.title}
                                            </h4>
                                            {insight.priority === 'CRITICAL' && (
                                                <span className="text-[9px] bg-red-500/20 text-red-200 border border-red-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">
                                                    Critical
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs opacity-80 leading-relaxed mt-1.5">
                                            {insight.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Sparkles className="w-8 h-8 opacity-20 mx-auto mb-2" />
                            <p className="text-xs">No anomalies detected. Smooth sailing!</p>
                        </div>
                    )}
                </div>
            </>
        ) : null}
      </div>
    </div>
  );
}

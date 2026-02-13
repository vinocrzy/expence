import { Transaction, Category } from '../db-types';

export type InsightType = 'WARNING' | 'TIP' | 'ACHIEVEMENT' | 'OBSERVATION';
export type InsightPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  score: number;       // 0-100 impact score
  priority: InsightPriority;
  confidence: number;  // 0-1 (1 = certain)
  visualParams?: {
    icon?: string;
    color?: string; // Hex or tailwind class
  };
  actions?: {
    label: string;
    action: string; // url or internal route
  }[];
  relatedCategories?: string[]; // IDs
}

export interface InsightSummary {
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  burnRateStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
  monthProjection: number; // Projected month-end balance markup/down
}

export interface InsightResponse {
  insights: Insight[];
  summary: InsightSummary;
  generatedAt: string;
  version: string;
}

export interface AnalysisContext {
  transactions: Transaction[];
  categories: Category[];
  currentDate: Date;
  historyStart: Date;
}

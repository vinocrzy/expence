'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { parseTransactionWithGemini } from '../app/actions/gemini-transaction';

interface SmartTransactionInputProps {
  onParsed: (data: any) => void;
  categories: string[];
  accounts: string[];
}

export default function SmartTransactionInput({ onParsed, categories, accounts }: SmartTransactionInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await parseTransactionWithGemini(input, { categories, accounts });
      if (result) {
        onParsed(result);
        setInput(''); // Clear input on success
      } else {
        setError('Could not understand transaction. Try again.');
      }
    } catch (err) {
      setError('Failed to connect to AI service.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-4 border border-white/10 mb-6">
      <div className="flex items-center gap-2 mb-2 text-purple-300">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Smart Add (AI)</span>
      </div>
      
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Spent 450 at Zepto on milk, eggs, and bread..."
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20"
        />
        
        <button
          onClick={handleParse}
          disabled={loading || !input.trim()}
          className="absolute bottom-2 right-2 p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
      
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
      
      <p className="text-gray-500 text-[10px] mt-2 text-right">
        Powered by Gemini Flash ⚡️
      </p>
    </div>
  );
}

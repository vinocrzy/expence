'use client';

import { useState, useEffect, use } from 'react';
import Navbar from '../../../components/Navbar';
import PrepaymentModal from '../../../components/PrepaymentModal';
import api from '../../../lib/api';
import { 
    Calendar, Percent, Landmark, TrendingDown, ArrowRight, CheckCircle, Clock, AlertCircle, RefreshCw 
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

export default function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrepaymentOpen, setIsPrepaymentOpen] = useState(false);
  const [processingEmi, setProcessingEmi] = useState<number | null>(null);

  useEffect(() => {
    fetchLoan();
  }, [id]);

  const fetchLoan = async () => {
    try {
      const res = await api.get(`/loans/${id}`);
      setLoan(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayEmi = async (emiNumber: number) => {
    if (!confirm('Are you sure you want to pay this EMI? Amount will be deducted from linked account.')) return;
    setProcessingEmi(emiNumber);
    try {
        await api.post(`/loans/${id}/pay/${emiNumber}`, {});
        fetchLoan();
    } catch (e) {
        console.error(e);
        alert('Failed to pay EMI');
    } finally {
        setProcessingEmi(null);
    }
  };

  const handlePrepayment = async (data: any) => {
      await api.post(`/loans/${id}/prepay`, data);
      fetchLoan();
  };

  if (loading || !loan) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">
            Loading loan details...
        </div>
      );
  }

  // Analytics logic
  const totalPrincipalPaid = loan.emis.filter((e: any) => e.status === 'PAID')
    .reduce((op: number, e: any) => op + Number(e.principalComponent), 0);
  
  const totalInterestPaid = loan.emis.filter((e: any) => e.status === 'PAID')
    .reduce((op: number, e: any) => op + Number(e.interestComponent), 0);
    
  // Projected Future Interest
  const projectedInterest = loan.emis.filter((e: any) => e.status === 'PENDING')
    .reduce((op: number, e: any) => op + Number(e.interestComponent), 0);

  const pieData = [
      { name: 'Principal Paid', value: totalPrincipalPaid, color: '#10B981' }, // Green
      { name: 'Interest Paid', value: totalInterestPaid, color: '#EF4444' },   // Red
      { name: 'Remaining Principal', value: Number(loan.outstandingPrincipal), color: '#3B82F6' }, // Blue
      { name: 'Projected Interest', value: projectedInterest, color: '#F59E0B' } // Orange
  ];

  const nextEmi = loan.emis.find((e: any) => e.status === 'PENDING');
  
  return (
    <div className="min-h-screen theme-wine text-white font-sans selection:bg-[var(--color-gold-500)] selection:text-black pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    {loan.name}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        loan.status === 'ACTIVE' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-[var(--color-wine-deep)] border-[var(--color-border-gold)] text-[var(--color-text-muted)]'
                    }`}>
                        {loan.status}
                    </span>
                </h1>
                <p className="text-[var(--color-text-muted)] mt-1">{loan.lender} • {loan.type}</p>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPrepaymentOpen(true)}
                  className="px-4 py-2 bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] text-white rounded-xl hover:bg-white/10 transition-colors font-medium flex items-center gap-2 shadow-lg"
                >
                    <TrendingDown className="h-4 w-4 text-[var(--color-gold-500)]" />
                    Prepay
                </button>
            </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-[var(--color-text-muted)] text-sm font-medium mb-1">Outstanding Balance</div>
                <div className="text-2xl font-bold text-[var(--color-gold-500)] font-mono">₹ {Number(loan.outstandingPrincipal).toLocaleString()}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-2">
                    of ₹ {Number(loan.principal).toLocaleString()} Principal
                </div>
            </div>
             <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-[var(--color-text-muted)] text-sm font-medium mb-1">Interest Rate</div>
                <div className="text-2xl font-bold text-white mb-2">{loan.interestRate}%</div>
                <div className="inline-block bg-[var(--color-gold-500)]/10 text-[var(--color-gold-500)] text-xs px-2 py-1 rounded-md font-medium border border-[var(--color-gold-500)]/20">
                    {loan.interestType}
                </div>
            </div>
             <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-[var(--color-text-muted)] text-sm font-medium mb-1">Next EMI</div>
                {nextEmi ? (
                     <>
                        <div className="text-2xl font-bold text-white font-mono">₹ {Number(nextEmi.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-2 flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3 text-[var(--color-gold-500)]" /> Due {new Date(nextEmi.dueDate).toLocaleDateString()}
                        </div>
                     </>
                ) : (
                    <div className="text-green-400 font-bold mt-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Completed
                    </div>
                )}
            </div>
             <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-[var(--color-text-muted)] text-sm font-medium mb-1">Progress</div>
                <div className="text-2xl font-bold text-[var(--color-gold-500)]">
                    {Math.round(((Number(loan.principal) - Number(loan.outstandingPrincipal)) / Number(loan.principal)) * 100)}%
                </div>
                <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)]" 
                        style={{ width: `${((Number(loan.principal) - Number(loan.outstandingPrincipal)) / Number(loan.principal)) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Chart */}
            <div className="lg:col-span-1 bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white mb-4">Breakdown</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#4A0E1C', borderColor: 'rgba(230, 179, 75, 0.2)', color: '#fff' }} itemStyle={{ color: '#E6E6E6' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Recent Prepayments */}
            <div className="lg:col-span-2 bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white mb-4">Loan Timeline & Schedule</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border-gold)]">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Principal</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Interest</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-gold)]/20">
                            {loan.emis.map((emi: any) => (
                                <tr key={emi.id} className={`hover:bg-white/5 transition-colors ${
                                    emi.id === nextEmi?.id ? 'bg-[var(--color-gold-500)]/10' : ''
                                }`}>
                                    <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-muted)]">{emi.emiNumber}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{new Date(emi.dueDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-white">₹{Number(emi.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)] hidden sm:table-cell">₹{Number(emi.principalComponent).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-3 text-sm text-red-400 hidden sm:table-cell">₹{Number(emi.interestComponent).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-3">
                                        {emi.status === 'PAID' ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded">
                                                <CheckCircle className="h-3 w-3" /> Paid
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-gold-muted)] bg-[var(--color-gold-500)]/10 px-2 py-1 rounded">
                                                <AlertCircle className="h-3 w-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {emi.status === 'PENDING' && (
                                            <button
                                                onClick={() => handlePayEmi(emi.emiNumber)}
                                                disabled={processingEmi === emi.emiNumber || (nextEmi && emi.emiNumber !== nextEmi.emiNumber)}
                                                className="text-xs px-3 py-1 bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 text-black rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[var(--color-gold-500)]/20"
                                            >
                                                {processingEmi === emi.emiNumber ? 'Paying...' : 'Pay'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <PrepaymentModal
            isOpen={isPrepaymentOpen}
            onClose={() => setIsPrepaymentOpen(false)}
            onSubmit={handlePrepayment}
            maxAmount={Number(loan.outstandingPrincipal)}
        />
      </main>
    </div>
  );
}

'use client';

import { useRef, useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import NativeHeader from '../../../components/dashboard/NativeHeader';
import PrepaymentModal from '../../../components/PrepaymentModal';
import { loanService } from '../../../lib/localdb-services';
import { 
    Calendar, Percent, Landmark, TrendingDown, ArrowRight, CheckCircle, Clock, AlertCircle, RefreshCw, Trash2 
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import PieChartDetailsList from '../../../components/dashboard/PieChartDetailsList';

// Imports for payment
import LoanPaymentModal from '../../../components/LoanPaymentModal';
import TransactionModal from '../../../components/TransactionModal';
import { useAccounts } from '../../../hooks/useLocalData';

// Wrapper
function TransactionModalWrapper(props: any) {
    return <TransactionModal {...props} />;
}

export default function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  
  const { accounts } = useAccounts(); // For TransactionModal

  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrepaymentOpen, setIsPrepaymentOpen] = useState(false);
  const [processingEmi, setProcessingEmi] = useState<number | null>(null);

  // Payment Logic
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Transaction Modal State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionInitialData, setTransactionInitialData] = useState<any>(null);
  const [pendingPaymentUpdate, setPendingPaymentUpdate] = useState<{amount: number} | null>(null);

  useEffect(() => {
    fetchLoan();
  }, [id]);

  const fetchLoan = async () => {
    try {
      const data = await loanService.getById(id);
      if (data) {
          // Generate EMI schedule if missing
          const fullLoan: any = { ...data };
          if (!fullLoan.emis || fullLoan.emis.length === 0) {
              fullLoan.emis = generateEmiSchedule(data);
          }
          setLoan(fullLoan);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateEmiSchedule = (loan: any) => {
      const emis = [];
      const p = loan.principal;
      const r = loan.interestRate / 12 / 100;
      const n = loan.tenureMonths;
      const emiAmount = loan.emiAmount || (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      
      let outstanding = p;
      const startDate = new Date(loan.startDate);

      for (let i = 1; i <= n; i++) {
        const interest = outstanding * r;
        const principalComponent = emiAmount - interest;
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        
        emis.push({
            id: `emi_${i}`,
            emiNumber: i,
            dueDate: dueDate.toISOString(),
            totalAmount: emiAmount,
            principalComponent,
            interestComponent: interest,
            status: i <= ((loan.initialPaidEmis || 0) + (loan.paidEmis || 0)) ? 'PAID' : 'PENDING'
        });
        outstanding -= principalComponent;
      }
      return emis;
  };

  const handlePayEmi = (emiNumber?: number) => {
      // If payment for specific EMI, we can use that data, but LoanPaymentModal is generic for now.
      // We can improve LoanPaymentModal to accept pre-filled amount later if needed.
      // For now, it defaults to loan.emiAmount which is what we want.
      setPaymentModalOpen(true);
  };
  
  const handlePayment = async (amount: number, recordTransaction: boolean, date: string) => {
      setPaymentModalOpen(false);
      
      if (recordTransaction) {
          // Open Transaction Modal
          setTransactionInitialData({
              amount: amount,
              description: `EMI Payment for ${loan.name}`,
              categoryId: '', 
              accountId: loan.linkedAccountId || '',
              date: date,
              type: 'EXPENSE'
          });
          setPendingPaymentUpdate({ amount });
          setIsTransactionModalOpen(true);
      } else {
          // Just update loan
          await loanService.recordPayment(loan.id, amount);
          await fetchLoan();
      }
  };
  
  const handleTransactionSuccess = async () => {
      if (pendingPaymentUpdate) {
          await loanService.recordPayment(loan.id, pendingPaymentUpdate.amount);
          await fetchLoan();
          setPendingPaymentUpdate(null);
      }
  };

  const handlePrepayment = async (data: any) => {
      // await api.post(`/loans/${id}/prepay`, data);
      await fetchLoan();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
        try {
            await loanService.delete(id);
            router.push('/loans');
        } catch (error) {
            console.error('Failed to delete loan:', error);
            alert('Failed to delete loan');
        }
    }
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white pb-32 md:pb-8">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-8 pb-8">
        <NativeHeader title={loan.name} backUrl="/loans" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 hidden md:flex">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    {loan.name}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        loan.status === 'ACTIVE' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-400'
                    }`}>
                        {loan.status}
                    </span>
                </h1>
                <p className="text-gray-400 mt-1">{loan.lender} • {loan.type}</p>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-900/40 transition-colors font-medium flex items-center gap-2"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete
                </button>
                <button 
                  onClick={() => setIsPrepaymentOpen(true)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
                >
                    <TrendingDown className="h-4 w-4 text-purple-400" />
                    Prepay
                </button>
                <button 
                  onClick={() => handlePayEmi()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-500/25 transition-all font-bold flex items-center gap-2"
                >
                    <CheckCircle className="h-4 w-4" />
                    Pay EMI
                </button>
            </div>
        </div>

        {/* Mobile Actions (Visible only on mobile) */}
        <div className="grid grid-cols-3 gap-3 mb-6 md:hidden">
             <button 
                  onClick={() => handlePayEmi()}
                  className="col-span-3 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
            >
                <CheckCircle className="h-5 w-5" /> Pay EMI
            </button>
            <button 
                  onClick={() => setIsPrepaymentOpen(true)}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs"
            >
                <TrendingDown className="h-5 w-5 text-purple-400" /> Prepay
            </button>
             <button 
                  onClick={handleDelete}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-red-400 rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs"
            >
                <Trash2 className="h-5 w-5" /> Delete
            </button>
             <button 
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-gray-400 rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs"
            >
                <RefreshCw className="h-5 w-5" /> Refresh
            </button>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Outstanding Balance</div>
                <div className="text-2xl font-bold text-white">₹ {Number(loan.outstandingPrincipal).toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-2">
                    of ₹ {Number(loan.principal).toLocaleString()} Principal
                </div>
            </div>
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Interest Rate</div>
                <div className="text-2xl font-bold text-white mb-2">{loan.interestRate}%</div>
                <div className="inline-block bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-md font-medium border border-purple-500/20">
                    {loan.interestType}
                </div>
            </div>
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Next EMI</div>
                {nextEmi ? (
                     <>
                        <div className="text-2xl font-bold text-white">₹ {Number(nextEmi.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-xs text-orange-400 mt-2 flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" /> Due {new Date(nextEmi.dueDate).toLocaleDateString()}
                        </div>
                     </>
                ) : (
                    <div className="text-green-400 font-bold mt-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Completed
                    </div>
                )}
            </div>
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Progress</div>
                <div className="text-2xl font-bold text-white">
                    {Math.round(((Number(loan.principal) - Number(loan.outstandingPrincipal)) / Number(loan.principal)) * 100)}%
                </div>
                <div className="h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500" 
                        style={{ width: `${((Number(loan.principal) - Number(loan.outstandingPrincipal)) / Number(loan.principal)) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Chart */}
            <div className="lg:col-span-1 bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
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
                                paddingAngle={4}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any, name: any) => [`₹ ${Math.round(Number(value || 0)).toLocaleString()}`, name]}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <PieChartDetailsList data={pieData} />
            </div>
            
            {/* Recent Prepayments */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Loan Timeline & Schedule</h3>
                <div className="space-y-3">
                    {loan.emis.map((emi: any) => {
                        const isNext = emi.id === nextEmi?.id;
                        const isPaid = emi.status === 'PAID';
                        
                        return (
                            <div 
                                key={emi.id} 
                                className={`p-4 rounded-2xl border transition-all ${
                                    isNext 
                                        ? 'bg-purple-900/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                                        : 'bg-black/20 border-white/5 hover:bg-white/5'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    {/* Left: Info */}
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                                            isPaid 
                                                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                                : isNext
                                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                                    : 'bg-gray-800 border-gray-700 text-gray-400'
                                        }`}>
                                            {emi.emiNumber}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-white text-sm">
                                                    {new Date(emi.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                {isPaid ? (
                                                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">PAID</span>
                                                ) : isNext ? (
                                                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">NEXT DUE</span>
                                                ) : (
                                                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">PENDING</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    Prin: ₹{Number(emi.principalComponent).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                     <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                    Int: ₹{Number(emi.interestComponent).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Amount & Action */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-[3.5rem] sm:pl-0">
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-white text-lg">
                                                ₹{Number(emi.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                        
                                        {emi.status === 'PENDING' && (
                                            <button
                                                onClick={() => handlePayEmi(emi.emiNumber)}
                                                disabled={processingEmi === emi.emiNumber || (nextEmi && emi.emiNumber !== nextEmi.emiNumber)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                    processingEmi === emi.emiNumber 
                                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                        : isNext
                                                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                {processingEmi === emi.emiNumber ? '...' : 'Pay'}
                                            </button>
                                        )}
                                        {emi.status === 'PAID' && (
                                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/10 text-green-400">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        <PrepaymentModal
            isOpen={isPrepaymentOpen}
            onClose={() => setIsPrepaymentOpen(false)}
            onSubmit={handlePrepayment}
            maxAmount={Number(loan.outstandingPrincipal)}
        />
        
        <LoanPaymentModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            loan={loan}
            onPayment={handlePayment}
        />
        
        {isTransactionModalOpen && (
             <TransactionModalWrapper 
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                initialData={transactionInitialData}
                onSuccess={handleTransactionSuccess}
                accounts={accounts}
             />
        )}
      </main>
    </div>
  );
}

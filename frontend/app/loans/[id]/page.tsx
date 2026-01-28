'use client';

import { useState, useEffect, use } from 'react';
import Navbar from '../../../components/Navbar';
import PrepaymentModal from '../../../components/PrepaymentModal';
import { loanService } from '../../../lib/localdb-services';
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
      const data = await loanService.getById(id);
      // Mock emis if not in data (schema didn't have emis array, so likely missing)
      if (data && !(data as any).emis) {
          (data as any).emis = []; // Populate with dummy schedule?
      }
      setLoan(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayEmi = async (emiNumber: number) => {
    if (!confirm('Are you sure you want to pay this EMI? (Mock)')) return;
    setProcessingEmi(emiNumber);
    try {
        // await api.post(`/loans/${id}/pay/${emiNumber}`, {});
        // Update loan locally
        await fetchLoan();
    } catch (e) {
        console.error(e);
        alert('Failed to pay EMI');
    } finally {
        setProcessingEmi(null);
    }
  };

  const handlePrepayment = async (data: any) => {
      // await api.post(`/loans/${id}/prepay`, data);
      await fetchLoan();
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
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
                  onClick={() => setIsPrepaymentOpen(true)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
                >
                    <TrendingDown className="h-4 w-4 text-purple-400" />
                    Prepay
                </button>
            </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Outstanding Balance</div>
                <div className="text-2xl font-bold text-white">₹ {Number(loan.outstandingPrincipal).toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-2">
                    of ₹ {Number(loan.principal).toLocaleString()} Principal
                </div>
            </div>
             <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Interest Rate</div>
                <div className="text-2xl font-bold text-white mb-2">{loan.interestRate}%</div>
                <div className="inline-block bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-md font-medium border border-purple-500/20">
                    {loan.interestType}
                </div>
            </div>
             <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
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
             <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
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
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Recent Prepayments */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Loan Timeline & Schedule</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Principal</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Interest</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {loan.emis.map((emi: any) => (
                                <tr key={emi.id} className={`hover:bg-gray-700/20 transition-colors ${
                                    emi.id === nextEmi?.id ? 'bg-purple-900/10' : ''
                                }`}>
                                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{emi.emiNumber}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{new Date(emi.dueDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-white">₹{Number(emi.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">₹{Number(emi.principalComponent).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-3 text-sm text-red-400 hidden sm:table-cell">₹{Number(emi.interestComponent).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-3">
                                        {emi.status === 'PAID' ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded">
                                                <CheckCircle className="h-3 w-3" /> Paid
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-900/20 px-2 py-1 rounded">
                                                <AlertCircle className="h-3 w-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {emi.status === 'PENDING' && (
                                            <button
                                                onClick={() => handlePayEmi(emi.emiNumber)}
                                                disabled={processingEmi === emi.emiNumber || (nextEmi && emi.emiNumber !== nextEmi.emiNumber)}
                                                className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

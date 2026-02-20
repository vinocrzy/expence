'use client';

import { useState, useEffect, use } from 'react';
import Navbar from '../../../components/Navbar';
import NativeHeader from '../../../components/dashboard/NativeHeader';
import CreditCardPaymentModal from '../../../components/CreditCardPaymentModal';
import TransactionModal from '../../../components/TransactionModal';
import { creditCardService, transactionService, accountService, categoryService } from '../../../lib/localdb-services';
import { useAccounts } from '../../../hooks/useLocalData';
import { 
    CreditCard as CreditCardIcon, Calendar, Upload, AlertCircle, TrendingUp, DollarSign, List,
    ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

// Wrapper
function TransactionModalWrapper(props: any) {
    return <TransactionModal {...props} />;
}

export default function CreditCardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [card, setCard] = useState<any>(null);
  const { accounts } = useAccounts();
  const [loading, setLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Transaction Modal State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionInitialData, setTransactionInitialData] = useState<any>(null);
  const [pendingPaymentUpdate, setPendingPaymentUpdate] = useState<{amount: number} | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const cardData = await creditCardService.getById(id);
      
      if (!cardData) {
        throw new Error("Credit card not found");
      }

      // Use getByAccount for better performance and to ensure we get transactions even if limit was an issue before
      const myTx = await transactionService.getByAccount(id);
      const cats = await categoryService.getAll(cardData.householdId);

      setCard(cardData);
      setCategories(cats);
      
      setTransactions(myTx.slice(0, 50)); // Show more
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (data: { amount: number, sourceAccountId: string, date: string, type: string, recordTransaction?: boolean }) => {
      const { amount, sourceAccountId, date, recordTransaction } = data;
      
      if (recordTransaction) {
          // Close Payment Modal first? Or keep open? Usually close.
          setIsPaymentOpen(false);

           setTransactionInitialData({
              amount: amount,
              description: `Bill Payment for ${card.bankName} ${card.name}`,
              categoryId: '', 
              accountId: sourceAccountId, 
              date: date,
                type: 'DEBT'
          });
          setPendingPaymentUpdate({ amount });
          setIsTransactionModalOpen(true);
      } else {
          await creditCardService.recordPayment(card.id, amount);
          setIsPaymentOpen(false);
          await fetchData();
      }
  };
  
  const handleTransactionSuccess = async () => {
      if (pendingPaymentUpdate) {
          await creditCardService.recordPayment(card.id, pendingPaymentUpdate.amount);
          await fetchData();
          setPendingPaymentUpdate(null);
      }
  };
  
  const handleGenerateStatement = async () => {
      if(confirm('Generate statement for the last cycle?')) {
          try {
              await creditCardService.generateStatement(id);
              await fetchData();
              alert('Statement generated successfully');
          } catch (e: any) {
              console.error(e);
              alert('Failed to generate statement: ' + e.message);
          }
      }
  };

  const handleSimulateCharge = async () => {
      const amount = prompt('Enter charge amount:');
      if (amount) {
          await transactionService.create({
              amount: parseFloat(amount),
              description: 'Simulated Charge',
              type: 'EXPENSE',
              date: new Date().toISOString(),
              accountId: id,
              categoryId: 'uncategorized', // ensure id exists or handle
          });
          fetchData();
      }
  };

  // if (loading || !card) return ... (Removed blocking loader)

  const limit = card ? Number(card.creditLimit) : 0;
  const outstanding = card ? Number(card.currentOutstanding || 0) : 0;
  const utilization = limit > 0 ? (outstanding / limit) * 100 : 0;
  const available = limit - outstanding;
  
  const lastStatement = (card && card.statements && card.statements.length > 0) ? card.statements[0] : null;
  const minDue = lastStatement ? Number(lastStatement.minimumDue) : 0;
  const totalDue = lastStatement ? Number(lastStatement.closingBalance) : outstanding;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white pb-32 md:pb-8">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-8 pb-8">
        <NativeHeader title={card?.bankName || 'Credit Card'} backUrl="/credit-cards" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 hidden md:flex">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                    <CreditCardIcon className="h-6 w-6" />
                </div>
                <div>
                   {loading || !card ? (
                        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-1" />
                   ) : (
                        <h1 className="text-3xl font-bold text-white">{card.bankName}</h1>
                   )}
                   {loading || !card ? (
                        <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
                   ) : (
                        <div className="text-gray-400">{card.name}</div>
                   )}
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                  onClick={handleSimulateCharge}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                    + Charge
                </button>
                <button 
                  onClick={handleGenerateStatement}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-50"
                >
                    <List className="h-4 w-4" />
                    Gen Statement
                </button>
                 <button 
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                    <DollarSign className="h-4 w-4" />
                    Pay Bill
                </button>
            </div>
        </div>

        {/* Mobile Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6 md:hidden">
             <button 
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={loading}
                  className="col-span-3 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                <DollarSign className="h-5 w-5" /> Pay Bill
            </button>
            <button 
                  onClick={handleGenerateStatement}
                  disabled={loading}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs disabled:opacity-50"
            >
                <List className="h-5 w-5 text-gray-400" /> Statement
            </button>
             <button 
                  onClick={handleSimulateCharge}
                  disabled={loading}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs disabled:opacity-50"
            >
                <Upload className="h-5 w-5 text-gray-400" /> Charge
            </button>
             <button 
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-gray-400 rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs disabled:opacity-50"
            >
                <TrendingUp className="h-5 w-5" /> Analytics
            </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="text-gray-400 text-sm font-medium mb-1">Outstanding Balance</div>
                    {loading ? (
                        <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
                    ) : (
                        <div className="text-2xl font-bold text-white">₹ {outstanding.toLocaleString()}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                        {utilization.toFixed(1)}% Utilization
                    </div>
                </div>
                {/* Progress Bar Background */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                </div>
             </div>
             
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Available Credit</div>
                {loading ? (
                    <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
                ) : (
                    <div className="text-2xl font-bold text-green-400">₹ {available.toLocaleString()}</div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                    of ₹ {limit.toLocaleString()} Limit
                </div>
            </div>
            
            <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Next Payment Due</div>
                {loading ? (
                    <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
                ) : (
                    <div className="text-2xl font-bold text-white">
                        {lastStatement ? `₹ ${Number(lastStatement.minimumDue).toLocaleString()}` : '-'}
                    </div>
                )}
                 <div className="text-xs text-orange-400 mt-2 flex items-center gap-1 font-medium">
                    <Calendar className="h-3 w-3" /> 
                    {lastStatement ? new Date(lastStatement.dueDate).toLocaleDateString() : 'No Due'}
                </div>
            </div>
            
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Last Statement</div>
                {loading ? (
                    <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
                ) : (
                    <div className="text-2xl font-bold text-white">
                        {lastStatement ? `₹ ${Number(lastStatement.closingBalance).toLocaleString()}` : '-'}
                    </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                    {lastStatement ? new Date(lastStatement.statementDate).toLocaleDateString() : 'Not Generated'}
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Statements List */}
            <div className="lg:col-span-2 bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <List className="h-4 w-4" /> Recent Statements
                </h3>
                {loading ? (
                    <div className="space-y-3">
                         {[1].map(i => (
                            <div key={i} className="bg-white/5 p-4 rounded-2xl h-24 animate-pulse" />
                        ))}
                    </div>
                ) : card?.statements && card.statements.length > 0 ? (
                    <div className="space-y-3">
                        {card.statements?.map((stmt: any) => (
                            <div key={stmt.id} className="group bg-black/40 hover:bg-white/5 transition-colors p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="text-white font-bold">
                                            {new Date(stmt.statementDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                            stmt.status === 'PAID' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                                            stmt.status === 'OVERDUE' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                        }`}>
                                            {stmt.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Cycle: {new Date(stmt.cycleStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(stmt.cycleEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Total Bill</div>
                                        <div className="font-mono font-bold text-white">₹{Number(stmt.closingBalance).toLocaleString()}</div>
                                    </div>
                                    {(Number(stmt.totalPayments) || 0) > 0 && (
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Paid</div>
                                            <div className="font-mono font-bold text-green-400">₹{Number(stmt.totalPayments).toLocaleString()}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2 border border-dashed border-gray-800 rounded-2xl">
                        <List className="h-6 w-6 opacity-50" />
                        <span className="text-xs">No statements generated</span>
                    </div>
                )}
            </div>
            
            {/* Recent Transactions */}
            <div className="lg:col-span-1 bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Recent Activity
                </h3>
                 <div className="space-y-3">
                    {loading ? (
                         <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl animate-pulse">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-xl bg-gray-800"/>
                                         <div>
                                             <div className="h-3 w-32 bg-gray-800 rounded mb-1"/>
                                             <div className="h-2 w-20 bg-gray-800 rounded"/>
                                         </div>
                                     </div>
                                </div>
                            ))}
                        </div>
                    ) : transactions.length > 0 ? (
                        transactions.map(tx => {
                            const cat = categories.find(c => c.id === tx.categoryId);
                            return (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
                                            style={{ backgroundColor: `${cat?.color || '#333'}20`, color: cat?.color || '#888' }}
                                        >
                                            {cat?.icon || <CreditCardIcon className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">{tx.description}</div>
                                            <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className={`font-mono text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-white'}`}>
                                        {tx.type === 'INCOME' ? '+' : '-'} ₹{Number(tx.amount).toLocaleString()}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-gray-500 text-xs">No recent activity.</div>
                    )}
                 </div>
            </div>
        </div>

        <CreditCardPaymentModal
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            onSubmit={handlePayment}
            accounts={accounts}
            minDue={minDue}
            totalDue={totalDue}
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

'use client';

import { useState, useEffect, use } from 'react';
import Navbar from '../../../components/Navbar';
import NativeHeader from '../../../components/dashboard/NativeHeader';
import CreditCardPaymentModal from '../../../components/CreditCardPaymentModal';
import TransactionModal from '../../../components/TransactionModal';
import { creditCardService, transactionService, accountService } from '../../../lib/localdb-services';
import { useAccounts } from '../../../hooks/useLocalData';
import { 
    CreditCard as CreditCardIcon, Calendar, Upload, AlertCircle, TrendingUp, DollarSign, List 
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
      // Use getByAccount for better performance and to ensure we get transactions even if limit was an issue before
      const myTx = await transactionService.getByAccount(id);

      setCard(cardData);
      
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
              type: 'EXPENSE'
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

  if (loading || !card) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">
            Loading...
        </div>
      );
  }

  const limit = Number(card.creditLimit);
  const outstanding = Number(card.currentOutstanding || 0);
  const utilization = limit > 0 ? (outstanding / limit) * 100 : 0;
  const available = limit - outstanding;
  
  const lastStatement = (card.statements && card.statements.length > 0) ? card.statements[0] : null;
  const minDue = lastStatement ? Number(lastStatement.minimumDue) : 0;
  const totalDue = lastStatement ? Number(lastStatement.closingBalance) : outstanding;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white pb-24">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-8 pb-8">
        <NativeHeader title={card.bankName} backUrl="/credit-cards" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 hidden md:flex">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                    <CreditCardIcon className="h-6 w-6" />
                </div>
                <div>
                   <h1 className="text-3xl font-bold text-white">{card.bankName}</h1>
                   <div className="text-gray-400">{card.name}</div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                  onClick={handleSimulateCharge}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                    + Charge
                </button>
                <button 
                  onClick={handleGenerateStatement}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 text-sm"
                >
                    <List className="h-4 w-4" />
                    Gen Statement
                </button>
                 <button 
                  onClick={() => setIsPaymentOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2"
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
                  className="col-span-3 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
            >
                <DollarSign className="h-5 w-5" /> Pay Bill
            </button>
            <button 
                  onClick={handleGenerateStatement}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs"
            >
                <List className="h-5 w-5 text-gray-400" /> Statement
            </button>
             <button 
                  onClick={handleSimulateCharge}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs"
            >
                <Upload className="h-5 w-5 text-gray-400" /> Charge
            </button>
             <button 
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-gray-400 rounded-2xl font-medium flex flex-col items-center justify-center gap-1 text-xs"
            >
                <TrendingUp className="h-5 w-5" /> Analytics
            </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="text-gray-400 text-sm font-medium mb-1">Outstanding Balance</div>
                    <div className="text-2xl font-bold text-white">₹ {outstanding.toLocaleString()}</div>
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
                <div className="text-2xl font-bold text-green-400">₹ {available.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-2">
                    of ₹ {limit.toLocaleString()} Limit
                </div>
            </div>
            
            <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Next Payment Due</div>
                <div className="text-2xl font-bold text-white">
                    {lastStatement ? `₹ ${Number(lastStatement.minimumDue).toLocaleString()}` : '-'}
                </div>
                 <div className="text-xs text-orange-400 mt-2 flex items-center gap-1 font-medium">
                    <Calendar className="h-3 w-3" /> 
                    {lastStatement ? new Date(lastStatement.dueDate).toLocaleDateString() : 'No Due'}
                </div>
            </div>
            
             <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Last Statement</div>
                <div className="text-2xl font-bold text-white">
                    {lastStatement ? `₹ ${Number(lastStatement.closingBalance).toLocaleString()}` : '-'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                    {lastStatement ? new Date(lastStatement.statementDate).toLocaleDateString() : 'Not Generated'}
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Statements List */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Recent Statements</h3>
                {card.statements && card.statements.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Cycle</th>
                                    <th className="px-4 py-3">Bill Amount</th>
                                    <th className="px-4 py-3">Paid</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {card.statements?.map((stmt: any) => (
                                    <tr key={stmt.id} className="hover:bg-gray-700/20 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-300">{new Date(stmt.statementDate).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {new Date(stmt.cycleStart).toLocaleDateString()} - {new Date(stmt.cycleEnd).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-white">₹{Number(stmt.closingBalance).toLocaleString()}</td>
                                         <td className="px-4 py-3 text-sm text-green-400">
                                            ₹{(Number(stmt.totalPayments) || 0).toLocaleString()}
                                         </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${
                                                stmt.status === 'PAID' ? 'bg-green-900/20 text-green-400' : 
                                                stmt.status === 'OVERDUE' ? 'bg-red-900/20 text-red-400' : 'bg-blue-900/20 text-blue-400'
                                            }`}>
                                                {stmt.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No statements generated yet.</div>
                )}
            </div>
            
            {/* Recent Transactions */}
            <div className="lg:col-span-1 bg-gray-800 border border-gray-700/50 p-6 rounded-2xl shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
                 <div className="space-y-4">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center border-b border-gray-700/50 pb-3 last:border-0 last:pb-0">
                            <div>
                                <div className="text-sm font-medium text-white">{tx.description}</div>
                                <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</div>
                            </div>
                            <div className={`font-mono font-bold ${tx.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
                                {tx.type === 'INCOME' ? '+' : '-'} ₹{Number(tx.amount).toLocaleString()}
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && <div className="text-center text-gray-500 text-sm">No transactions found.</div>}
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

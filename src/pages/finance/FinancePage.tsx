/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { TrendingUp, TrendingDown, Edit2, Trash2, Clock } from 'lucide-react'
import AddTransactionModal from '../../components/AddTransactionModal'
import EditTransactionModal from '../../components/EditTransactionModal'

// Updated interface to match the new financial_transactions table
interface FinancialTransaction {
  id: string
  transaction_type: 'revenue' | 'expense'
  category: string
  amount: number
  description: string
  reference_id: string | null
  reference_table: string | null
  transaction_date: string
  created_at: string
}

const FinancePage = () => {
  const { userRole } = useAuth()
  const canModifyFinance = userRole === 'finance'

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [pendingRevenue, setPendingRevenue] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Financial Transactions
      const { data: transData, error: transError } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (transError) throw transError
      setTransactions(transData || [])

      // 2. Fetch Pending Revenue from Sales Orders (to keep dashboard insightful)
      const { data: pendingData, error: pendingError } = await supabase
        .from('sales_orders')
        .select('total_amount')
        .eq('status', 'pending')

      if (pendingError) throw pendingError
      const pendingTotal = pendingData?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0
      setPendingRevenue(pendingTotal)

    } catch (error) {
      console.error('Error fetching finance data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id)
    if (error) {
      alert('Error deleting transaction: ' + error.message)
    } else {
      setDeleteConfirmId(null)
      fetchData()
    }
  }

  // Calculations based on the new transaction_type ('revenue' or 'expense')
  const totalRevenue = transactions
    .filter(t => t.transaction_type === 'revenue')
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const totalExpenses = transactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const netProfit = totalRevenue - totalExpenses

  const expenseBreakdown = (() => {
    const expenses = transactions.filter(t => t.transaction_type === 'expense')
    const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
    
    const byCategory = expenses.reduce((acc, t) => {
      const cat = t.category || 'Others'
      acc[cat] = (acc[cat] || 0) + Number(t.amount)
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(byCategory)
      .map(([name, amount]) => ({
        name, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  })()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { 
      style: 'currency', 
      currency: 'ETB', 
      minimumFractionDigits: 2 
    }).format(amount)
  }

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransactionId(transaction.id)
    setIsEditModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="mt-1 text-sm text-gray-500">Financial overview and automated transaction management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-1">Auto-synced from Sales</p>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Net Profit</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Pending Revenue</p>
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingRevenue)}</p>
          <p className="text-xs text-yellow-600 mt-1">Unfulfilled Sales Orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Financial Transactions</h2>
            {canModifyFinance && (
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                New Transaction
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions yet</td></tr>
                ) : (
                  transactions.slice(0, 8).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          t.transaction_type === 'revenue' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.transaction_type === 'revenue' ? 'Revenue' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 capitalize">{t.category}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className={`px-4 py-4 text-sm font-medium ${
                        t.transaction_type === 'revenue' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.transaction_type === 'revenue' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(t.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-1">
                          {canModifyFinance ? (
                            <>
                              <button 
                                onClick={() => handleEdit(t)} 
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {deleteConfirmId === t.id ? (
                                <div className="flex items-center space-x-1">
                                  <button 
                                    onClick={() => handleDelete(t.id)} 
                                    className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                                  >
                                    Yes
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmId(null)} 
                                    className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setDeleteConfirmId(t.id)} 
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">View Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Expense Breakdown</h2>
          </div>
          <div className="p-4 space-y-4">
            {expenseBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No expenses recorded yet</p>
            ) : (
              expenseBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.percentage}% of total expenses</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionAdded={fetchData}
      />
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onTransactionUpdated={fetchData}
        transactionId={editingTransactionId}
      />
    </div>
  )
}

export default FinancePage

/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { TrendingUp, TrendingDown, Edit2, Trash2 } from 'lucide-react'
import AddTransactionModal from '../../components/AddTransactionModal'
import EditTransactionModal from '../../components/EditTransactionModal'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  date: string
  status: 'completed' | 'pending'
  category: string | null
}

const FinancePage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Delete Transaction
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      alert('Error deleting transaction: ' + error.message)
    } else {
      setDeleteConfirmId(null)
      fetchData()
    }
  }

  // Calculate Stats
  const totalRevenue = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const netProfit = totalRevenue - totalExpenses
  
  const pendingInvoices = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenseBreakdown = (() => {
    const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'completed')
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
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(amount)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id)
    setIsEditModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="mt-1 text-sm text-gray-500">Financial overview and transaction management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
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
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Pending</p>
            <TrendingDown className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingInvoices)}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
              New Transaction
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions yet</td></tr>
                ) : (
                  transactions.slice(0, 6).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">{t.description}</td>
                      <td className={`px-4 py-4 text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">{t.date}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-1">
                          {/* Edit */}
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          {deleteConfirmId === t.id ? (
                            <div className="flex items-center space-x-1">
                              <button onClick={() => handleDelete(t.id)} className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700">
                                Yes
                              </button>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(t.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* Expense Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Expense Breakdown</h2>
          </div>
          <div className="p-4 space-y-4">
            {expenseBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No expenses yet</p>
            ) : (
              expenseBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.percentage}% of total</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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

/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { TrendingUp, TrendingDown, DollarSign, FileText, CreditCard } from 'lucide-react'
import AddTransactionModal from '../../components/AddTransactionModal'

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
  const [isModalOpen, setIsModalOpen] = useState(false) // ← NEW: Modal state

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

  // Mock data for Expense Breakdown
  const expenseBreakdown = [
    { name: 'Raw Materials', amount: 32500, percentage: 41.6, color: 'bg-blue-600' },
    { name: 'Salaries', amount: 25000, percentage: 32.0, color: 'bg-blue-600' },
    { name: 'Utilities', amount: 8700, percentage: 11.1, color: 'bg-blue-600' },
    { name: 'Marketing', amount: 6500, percentage: 8.3, color: 'bg-blue-600' },
    { name: 'Others', amount: 5500, percentage: 7.0, color: 'bg-blue-600' },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
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
          <p className="text-xs text-green-600 mt-1">↗ +12.5%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-green-600 mt-1">↗ +5.3%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Net Profit</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(netProfit)}</p>
          <p className="text-xs text-green-600 mt-1">↗ +24.8%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Pending Invoices</p>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingInvoices)}</p>
          <p className="text-xs text-red-600 mt-1">↘ -8.2%</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button 
              onClick={() => setIsModalOpen(true)} // ← NEW: Opens modal
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              New Transaction
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No transactions yet</td></tr>
                ) : (
                  transactions.slice(0, 6).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type === 'income' ? '↗ Income' : '↘ Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{t.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Breakdown (Takes 1 column) */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Expense Breakdown</h2>
          </div>
          <div className="p-4 space-y-4">
            {expenseBreakdown.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.percentage}% of total</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
          <DollarSign className="w-10 h-10 text-green-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">Generate Invoice</h3>
          <p className="mt-1 text-xs text-gray-500">Create and send invoices to clients</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
          <FileText className="w-10 h-10 text-blue-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">Expense Report</h3>
          <p className="mt-1 text-xs text-gray-500">View detailed expense reports</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
          <CreditCard className="w-10 h-10 text-purple-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">Payment Processing</h3>
          <p className="mt-1 text-xs text-gray-500">Process payments and refunds</p>
        </div>
      </div>

      {/* ← NEW: Add Transaction Modal at the very end */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionAdded={fetchData}
      />
    </div>
  )
}

export default FinancePage
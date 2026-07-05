import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Download, Filter, TrendingUp, TrendingDown } from 'lucide-react'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  date: string
  category: string | null
  status: string
}

const ExpenseReportPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    let isMounted = true
    
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
      
      if (isMounted && data) {
        setTransactions(data)
        setLoading(false)
      }
    }

    fetchTransactions()
    
    return () => {
      isMounted = false
    }
  }, [])

  const totalIncome = transactions
    .filter((t: Transaction) => t.type === 'income' && t.status === 'completed')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter((t: Transaction) => t.type === 'expense' && t.status === 'completed')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

  const netProfit = totalIncome - totalExpenses

  const filteredTransactions = transactions.filter((t: Transaction) => {
    const typeMatch = filterType === 'all' || t.type === filterType
    const categoryMatch = filterCategory === 'all' || t.category === filterCategory
    return typeMatch && categoryMatch
  })

  const categories = Array.from(new Set(transactions.map((t: Transaction) => t.category).filter((cat): cat is string => cat !== null)))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  const downloadTransaction = (transaction: Transaction) => {
    const csvContent = `data:text/csv;charset=utf-8,Date,Type,Description,Category,Amount,Status\n${transaction.date},${transaction.type},${transaction.description},${transaction.category || 'N/A'},${transaction.amount},${transaction.status}`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `transaction_${transaction.date}_${transaction.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-sm text-gray-500">Comprehensive income and expense analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Income</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Net Profit</p>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Transactions</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </select>

        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredTransactions.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No transactions found</td></tr>
            ) : (
              filteredTransactions.map((t: Transaction) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{t.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                      t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.category || 'Uncategorized'}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => downloadTransaction(t)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download this transaction"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ExpenseReportPage

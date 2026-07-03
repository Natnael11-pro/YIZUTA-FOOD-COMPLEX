import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { FileText, Download, Filter } from 'lucide-react'

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  category: string | null
  status: string
}

const ExpenseReportPage = () => {
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'expense')
      .order('date', { ascending: false })
    
    if (data) setExpenses(data)
    setLoading(false)
  }

  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
  
  const filteredExpenses = filterCategory === 'all' 
    ? expenses 
    : expenses.filter(t => t.category === filterCategory)

  const categories = Array.from(new Set(expenses.map(t => t.category).filter(Boolean)))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  const handleExport = () => {
    // Simple CSV export simulation
    let csvContent = "data:text/csv;charset=utf-8,Date,Description,Category,Amount,Status\n"
    filteredExpenses.forEach(row => {
      csvContent += `${row.date},${row.description},${row.category || 'N/A'},${row.amount},${row.status}\n`
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "expense_report.csv")
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Reports</h1>
          <p className="text-sm text-gray-500">Detailed analytics and downloadable reports</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </button>
      </div>

      {/* Summary Card */}
      <div className="p-6 bg-white border border-gray-200 rounded-xl">
        <p className="text-sm text-gray-500">Total Expenses (Filtered)</p>
        <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(filteredExpenses.reduce((sum, t) => sum + Number(t.amount), 0))}</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredExpenses.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No expenses found</td></tr>
            ) : (
              filteredExpenses.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{t.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.category || 'Uncategorized'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-red-600">{formatCurrency(Number(t.amount))}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{t.status}</span>
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

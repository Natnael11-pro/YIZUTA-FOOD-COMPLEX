import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Download, Filter, TrendingUp, TrendingDown } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  date: string
  category: string | null
  status: string
  created_at: string
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
        .order('created_at', { ascending: false })
      
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

  // ✅ PROFESSIONAL "DAILY SNAPSHOT" DOWNLOAD FUNCTION
  const downloadAllReports = async () => {
    try {
      // 1. Fetch ALL historical data from the database (No date filtering)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: salesOrdersData } = await supabase
        .from('sales_orders')
        .select('*, customers:customer_id(name, company)')
        .order('order_date', { ascending: false })

      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Create a new Excel Workbook
      const wb = XLSX.utils.book_new()

      // 3. Add Transactions Sheet
      if (transactionsData && transactionsData.length > 0) {
        const transactionsWS = XLSX.utils.json_to_sheet(transactionsData)
        XLSX.utils.book_append_sheet(wb, transactionsWS, 'Financial Transactions')
      }

      // 4. Add Sales Orders Sheet
      if (salesOrdersData && salesOrdersData.length > 0) {
        const salesWS = XLSX.utils.json_to_sheet(salesOrdersData)
        XLSX.utils.book_append_sheet(wb, salesWS, 'Sales Orders')
      }

      // 5. Add Inventory Sheet
      if (inventoryData && inventoryData.length > 0) {
        const inventoryWS = XLSX.utils.json_to_sheet(inventoryData)
        XLSX.utils.book_append_sheet(wb, inventoryWS, 'Inventory Stock')
      }

      // 6. Generate filename with current Date and Time (Replaces colons with dashes for Windows compatibility)
      const today = new Date().toISOString().split('T')[0]
      const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-')
      const fileName = `YIZUTA_Full_Snapshot_${today}_${time}.xlsx`

      // 7. Trigger the download
      XLSX.writeFile(wb, fileName)
      
    } catch (error) {
      console.error('Error downloading reports:', error)
      alert('Failed to download reports. Please check your internet connection.')
    }
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
            <TrendingUp className="w-5 h-5 text-green-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <TrendingDown className="w-5 h-5 text-red-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Net Profit</p>
            <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
        </div>
      </div>

      {/* Daily Snapshot Download Button */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-blue-900">System Data Snapshot</h3>
          <p className="text-xs text-blue-700 mt-1">
            Downloads a complete backup of all Transactions, Sales Orders, and Inventory into one Excel file. 
            The file is named with today's date and time for easy record-keeping.
          </p>
        </div>
        <button
          onClick={downloadAllReports}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
          aria-label="Download complete system snapshot in Excel format"
        >
          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
          Download Full Snapshot (Excel)
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4">
        <Filter className="w-5 h-5 text-gray-500" aria-hidden="true" />
        <span className="text-sm font-medium text-gray-700">Filter View:</span>
        
        <label htmlFor="filter-type" className="sr-only">Filter by transaction type</label>
        <select 
          id="filter-type"
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Transactions</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </select>

        <label htmlFor="filter-category" className="sr-only">Filter by category</label>
        <select 
          id="filter-category"
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredTransactions.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found</td></tr>
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

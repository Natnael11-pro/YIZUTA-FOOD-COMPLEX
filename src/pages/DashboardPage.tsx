/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { 
  Package, Factory, ShoppingCart, 
  TrendingUp, AlertTriangle
} from 'lucide-react'
import PendingApprovalsTab from '../components/PendingApprovalsTab'

interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  activeProductionLines: number
  totalProductionLines: number
  totalInventoryItems: number
  lowStockItems: number
  totalCustomers: number
  pendingSalesOrders: number
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals'>('approvals')
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    activeProductionLines: 0,
    totalProductionLines: 0,
    totalInventoryItems: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    pendingSalesOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllStats = async () => {
    console.log('📊 Dashboard: Fetching stats...')
    setError(null)
    try {
      // ✅ DEBUG: Fetch ALL data from financial_transactions to see what we get
      console.log('Fetching financial_transactions...')
      const { data: allTrans, error: allTransError } = await supabase
        .from('financial_transactions')
        .select('*')
      
      if (allTransError) {
        console.error('❌ Error fetching transactions:', allTransError)
      } else {
        console.log('✅ Raw transactions data:', allTrans)
        console.log('✅ Total transactions found:', allTrans?.length)
        
        // Calculate revenue and expenses
        const revenue = allTrans
          ?.filter(t => t.transaction_type === 'revenue')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0
        
        const expenses = allTrans
          ?.filter(t => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0
        
        console.log('✅ Calculated Revenue:', revenue)
        console.log('✅ Calculated Expenses:', expenses)
        console.log('✅ Net Profit:', revenue - expenses)

        // 2. Production Stats
        const { data: lines } = await supabase.from('production_lines').select('status')
        const activeLines = lines?.filter(l => l.status === 'running').length || 0
        const totalLines = lines?.length || 0

        // 3. Warehouse Stats
        const { data: inventory } = await supabase.from('inventory').select('quantity, reorder_level')
        const totalItems = inventory?.length || 0
        const lowStock = inventory?.filter(i => i.quantity <= i.reorder_level).length || 0

        // 4. Sales Stats
        const { data: customers } = await supabase.from('customers').select('id')
        const totalCustomers = customers?.length || 0
        
        const { data: orders } = await supabase.from('sales_orders').select('status')
        const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'processing').length || 0

        setStats({
          totalRevenue: revenue,
          totalExpenses: expenses,
          activeProductionLines: activeLines,
          totalProductionLines: totalLines,
          totalInventoryItems: totalItems,
          lowStockItems: lowStock,
          totalCustomers: totalCustomers,
          pendingSalesOrders: pendingOrders
        })
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error)
      setError('Failed to load dashboard data: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { 
      style: 'currency', 
      currency: 'ETB',
      minimumFractionDigits: 2 
    }).format(amount)
  }

  if (error) {
    return (
      <div className="p-12 text-center" role="alert">
        <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          aria-label="Retry loading dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">High-level overview of YIZUTA Food Complex operations</p>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-blue-600 font-bold' : ''}`}
        >
          Dashboard Overview
        </button>
        <button 
          onClick={() => setActiveTab('approvals')}
          className={`pb-2 px-4 ${activeTab === 'approvals' ? 'border-b-2 border-blue-600 font-bold' : ''}`}
        >
          Pending Approvals
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-gray-500" role="status" aria-label="Loading dashboard data">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" aria-hidden="true"></div>
              Loading company data...
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <TrendingUp className="w-5 h-5 text-green-600" aria-hidden="true" />
                  </div>
                  <p className={`text-2xl font-bold ${stats.totalRevenue - stats.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.totalRevenue - stats.totalExpenses)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Real-time from Finance</p>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Production Status</p>
                    <Factory className="w-5 h-5 text-purple-600" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeProductionLines}/{stats.totalProductionLines}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Lines currently running</p>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Inventory Health</p>
                    <Package className="w-5 h-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalInventoryItems}</p>
                  <p className={`text-xs mt-1 ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.lowStockItems > 0 ? `⚠ ${stats.lowStockItems} low stock items` : '✓ All items in stock'}
                  </p>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Sales Pipeline</p>
                    <ShoppingCart className="w-5 h-5 text-orange-600" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingSalesOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">Pending/Processing orders</p>
                </div>
              </div>

              {/* Low Stock Alert Banner */}
              {stats.lowStockItems > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center" role="alert">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-red-800">
                    Attention Warehouse Team: {stats.lowStockItems} inventory item(s) have fallen below the reorder level.
                  </p>
                  <button 
                    onClick={() => navigate('/warehouse')}
                    aria-label="View inventory details"
                    className="ml-auto text-sm font-medium text-red-700 hover:text-red-900 underline"
                  >
                    View Inventory
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'approvals' && (
        <PendingApprovalsTab />
      )}
    </div>
  )
}

export default DashboardPage
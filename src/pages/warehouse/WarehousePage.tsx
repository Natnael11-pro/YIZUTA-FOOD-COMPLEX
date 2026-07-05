/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { 
  Package, Factory, DollarSign, ShoppingCart, 
  TrendingUp, AlertTriangle, ArrowRight 
} from 'lucide-react'

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
      // 1. Finance Stats
      console.log('Fetching transactions...')
      const { data: transactions, error: transError } = await supabase.from('transactions').select('type, amount, status')
      if (transError) console.error('Transactions error:', transError)
      const revenue = transactions?.filter(t => t.type === 'income' && t.status === 'completed').reduce((sum, t) => sum + Number(t.amount), 0) || 0
      const expenses = transactions?.filter(t => t.type === 'expense' && t.status === 'completed').reduce((sum, t) => sum + Number(t.amount), 0) || 0
      console.log('Revenue:', revenue, 'Expenses:', expenses)

      // 2. Production Stats
      console.log('Fetching production lines...')
      const { data: lines, error: linesError } = await supabase.from('production_lines').select('status')
      if (linesError) console.error('Production lines error:', linesError)
      const activeLines = lines?.filter(l => l.status === 'running').length || 0
      const totalLines = lines?.length || 0
      console.log('Active lines:', activeLines, 'Total:', totalLines)

      // 3. Warehouse Stats
      console.log('Fetching inventory...')
      const { data: inventory, error: invError } = await supabase.from('inventory').select('quantity, reorder_level')
      if (invError) console.error('Inventory error:', invError)
      const totalItems = inventory?.length || 0
      const lowStock = inventory?.filter(i => i.quantity <= i.reorder_level).length || 0
      console.log('Total items:', totalItems, 'Low stock:', lowStock)

      // 4. Sales Stats
      console.log('Fetching customers...')
      const { data: customers, error: custError } = await supabase.from('customers').select('id')
      if (custError) console.error('Customers error:', custError)
      const totalCustomers = customers?.length || 0
      
      console.log('Fetching orders...')
      const { data: orders, error: ordersError } = await supabase.from('sales_orders').select('status')
      if (ordersError) console.error('Orders error:', ordersError)
      const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'processing').length || 0
      console.log('Pending orders:', pendingOrders)

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
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error)
      setError('Failed to load dashboard data')
    } finally {
      console.log('Dashboard: Loading complete')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const departments = [
    { name: 'Production', icon: Factory, path: '/production', desc: 'Monitor manufacturing lines and quality control', color: 'text-purple-600 bg-purple-50' },
    { name: 'Warehouse', icon: Package, path: '/warehouse', desc: 'Manage inventory levels and shipments', color: 'text-blue-600 bg-blue-50' },
    { name: 'Finance', icon: DollarSign, path: '/finance', desc: 'Track revenue, expenses, and invoices', color: 'text-green-600 bg-green-50' },
    { name: 'Sales', icon: ShoppingCart, path: '/sales', desc: 'Manage customers and sales orders', color: 'text-orange-600 bg-orange-50' },
  ]

  if (error) {
    return (
      <div className="p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
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

      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          Loading company data...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Net Profit</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue - stats.totalExpenses)}
              </p>
              <p className="text-xs text-green-600 mt-1">↗ +18.2% from last month</p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Production Status</p>
                <Factory className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeProductionLines}/{stats.totalProductionLines}
              </p>
              <p className="text-xs text-gray-500 mt-1">Lines currently running</p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Inventory Health</p>
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInventoryItems}</p>
              <p className={`text-xs mt-1 ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.lowStockItems > 0 ? `⚠ ${stats.lowStockItems} low stock items` : '✓ All items in stock'}
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Sales Pipeline</p>
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingSalesOrders}</p>
              <p className="text-xs text-gray-500 mt-1">Pending/Processing orders</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((dept) => {
                const Icon = dept.icon
                return (
                  <button
                    key={dept.name}
                    onClick={() => navigate(dept.path)}
                    className="flex items-center justify-between p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all text-left group"
                  >
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${dept.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{dept.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{dept.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </button>
                )
              })}
            </div>
          </div>

          {stats.lowStockItems > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">
                Attention Warehouse Team: {stats.lowStockItems} inventory item(s) have fallen below the reorder level.
              </p>
              <button 
                onClick={() => navigate('/warehouse')}
                className="ml-auto text-sm font-medium text-red-700 hover:text-red-900 underline"
              >
                View Inventory
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DashboardPage

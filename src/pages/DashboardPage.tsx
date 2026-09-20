/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { 
  Package, Factory, ShoppingCart, 
  TrendingUp, AlertTriangle, DollarSign,
  TrendingDown
} from 'lucide-react'
import PendingApprovalsTab from '../components/PendingApprovalsTab'
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area 
} from 'recharts'

// ✅ CustomTooltip for Financial and Bar Charts (shows currency)
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
  }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">
          {new Intl.NumberFormat('en-ET', { 
            style: 'currency', 
            currency: 'ETB',
            minimumFractionDigits: 2 
          }).format(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

// ✅ NEW: PieChartTooltip for Inventory Categories (shows category name and count)
interface PieTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      name: string
      value: number
    }
  }>
}

const PieChartTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          Count: {data.value}
        </p>
      </div>
    )
  }
  return null
}

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

interface FinancialData {
  name: string
  amount: number
  fill: string
}

interface ProductionData {
  name: string
  capacity: number
}

interface InventoryData {
  name: string
  value: number
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals'>('overview')
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
  
  const [financialTrendData, setFinancialTrendData] = useState<FinancialData[]>([])
  const [productionData, setProductionData] = useState<ProductionData[]>([])
  const [inventoryCategoryData, setInventoryCategoryData] = useState<InventoryData[]>([])

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

  const fetchAllStats = async () => {
    console.log('📊 Dashboard: Fetching stats...')
    setError(null)
    try {
      const { data: allTrans, error: allTransError } = await supabase
        .from('financial_transactions')
        .select('*')
      
      if (allTransError) {
        console.error('❌ Error fetching transactions:', allTransError)
      } else {
        const revenue = allTrans
          ?.filter(t => t.transaction_type === 'revenue')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0
        
        const expenses = allTrans
          ?.filter(t => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0

        setFinancialTrendData([
          { name: 'Revenue', amount: revenue, fill: '#10b981' },
          { name: 'Expenses', amount: expenses, fill: '#ef4444' }
        ])

        const { data: lines } = await supabase.from('production_lines').select('status, name, daily_capacity')
        const activeLines = lines?.filter(l => l.status === 'running').length || 0
        const totalLines = lines?.length || 0
        
        setProductionData(lines?.map(line => ({
          name: line.name?.substring(0, 15) || 'Line',
          capacity: line.daily_capacity || 0
        })) || [])

        const { data: inventory } = await supabase.from('inventory').select('quantity, reorder_level, category')
        const totalItems = inventory?.length || 0
        const lowStock = inventory?.filter(i => i.quantity <= i.reorder_level).length || 0
        
        const categoryCount = inventory?.reduce((acc: Record<string, number>, item) => {
          const cat = item.category || 'Uncategorized'
          acc[cat] = (acc[cat] || 0) + 1
          return acc
        }, {}) || {}
        
        setInventoryCategoryData(Object.entries(categoryCount).map(([name, value]) => ({
          name,
          value
        })))

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
      console.error(' Error fetching dashboard stats:', error)
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
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              Loading company data...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Net Profit</p>
                    {stats.totalRevenue - stats.totalExpenses >= 0 ? 
                      <TrendingUp className="w-5 h-5 text-green-600" /> :
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    }
                  </div>
                  <p className={`text-2xl font-bold ${stats.totalRevenue - stats.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.totalRevenue - stats.totalExpenses)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Real-time from Finance</p>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Production Status</p>
                    <Factory className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeProductionLines}/{stats.totalProductionLines}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Lines currently running</p>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Inventory Health</p>
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalInventoryItems}</p>
                  <p className={`text-xs mt-1 ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.lowStockItems > 0 ? ` ${stats.lowStockItems} low stock` : '✓ All items in stock'}
                  </p>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">Sales Pipeline</p>
                    <ShoppingCart className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingSalesOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">Pending/Processing orders</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Financial Overview
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financialTrendData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {financialTrendData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Factory className="w-5 h-5 text-purple-600" />
                    Production Capacity by Line
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="capacity" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Inventory by Category
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Key Metrics Overview
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={[
                      { name: 'Customers', value: stats.totalCustomers },
                      { name: 'Products', value: stats.totalInventoryItems },
                      { name: 'Active Lines', value: stats.activeProductionLines },
                      { name: 'Pending Orders', value: stats.pendingSalesOrders }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {stats.lowStockItems > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center" role="alert">
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
        </>
      )}

      {activeTab === 'approvals' && (
        <PendingApprovalsTab />
      )}
    </div>
  )
}

export default DashboardPage
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, ShoppingCart, TrendingUp, DollarSign, UserPlus, Package } from 'lucide-react'
import AddCustomerModal from '../../components/AddCustomerModal'
import AddSalesOrderModal from '../../components/AddSalesOrderModal'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  total_orders: number
  total_spent: number
  status: 'active' | 'inactive'
}

interface SalesOrder {
  id: string
  order_number: string
  customer_id: string | null
  product: string
  quantity: number
  unit_price: number
  total_amount: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  order_date: string
  delivery_date: string | null
  customers?: {
    name: string
    company: string | null
  }
}

const SalesPage = () => {
  const { userRole } = useAuth()
  const canModifySales = userRole === 'sales'

  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (customersError) throw customersError
      setCustomers(customersData || [])

      const { data: ordersData, error: ordersError } = await supabase
        .from('sales_orders')
        .select('*, customers:customer_id(name, company)')
        .order('order_date', { ascending: false })
        .limit(10)

      if (ordersError) throw ordersError
      setOrders(ordersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'active').length
  const totalOrders = orders.length
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
        <p className="mt-1 text-sm text-gray-500">Customer management and sales orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
          <p className="text-xs text-green-600 mt-1">{activeCustomers} active</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-green-600 mt-1">↗ +15.3%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-1">↗ +12.5%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalOrders > 0 ? formatCurrency(totalRevenue / orders.filter(o => o.status === 'completed').length) : '$0.00'}
          </p>
          <p className="text-xs text-green-600 mt-1">↗ +8.2%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            {canModifySales && (
              <button 
                onClick={() => setIsOrderModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <Package className="w-4 h-4 mr-1" />
                New Order
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No orders yet</td></tr>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.order_number}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{order.customers?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{order.customers?.company || ''}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.product}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(Number(order.total_amount))}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
            {canModifySales && (
              <button 
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add Customer
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No customers yet</div>
            ) : (
              customers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm mr-3">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.company || customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(Number(customer.total_spent))}</p>
                      <p className="text-xs text-gray-500">{customer.total_orders} orders</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerAdded={fetchData}
      />
      <AddSalesOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderAdded={fetchData}
      />
    </div>
  )
}

export default SalesPage

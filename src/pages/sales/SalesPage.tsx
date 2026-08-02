/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, ShoppingCart, TrendingUp, DollarSign, UserPlus, Package, Play, CheckCircle, Printer } from 'lucide-react'
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
  driver_name?: string
  vehicle_plate_no?: string
  quantity_unit?: string
  customers?: {
    name: string
    company: string | null
  }
}

const SalesPage = () => {
  const { userRole } = useAuth()
  // Allow Sales Personnel and Admin to edit. Executive Manager is View-Only.
  const canModifySales = userRole === 'sales_personnel' || userRole === 'sales' || userRole === 'admin'

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

  // --- ORDER STATUS WORKFLOW ---
  const updateOrderStatus = async (orderId: string, newStatus: 'processing' | 'completed') => {
    const actionText = newStatus === 'processing' ? 'start processing' : 'mark as completed'
    if (!confirm(`Are you sure you want to ${actionText} this order?`)) {
      return
    }

    try {
      const { error: updateOrderError } = await supabase
        .from('sales_orders')
        .update({ status: newStatus })
        .eq('id', orderId)
      
      if (updateOrderError) throw updateOrderError

      // If completed, update customer stats
      if (newStatus === 'completed') {
        const { data: orderData } = await supabase
          .from('sales_orders')
          .select('customer_id, total_amount')
          .eq('id', orderId)
          .single()

        if (orderData?.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('total_orders, total_spent')
            .eq('id', orderData.customer_id)
            .single()
            
          const newTotalOrders = (customerData?.total_orders || 0) + 1
          const newTotalSpent = (customerData?.total_spent || 0) + Number(orderData.total_amount)

          await supabase
            .from('customers')
            .update({ total_orders: newTotalOrders, total_spent: newTotalSpent })
            .eq('id', orderData.customer_id)
        }
      }
      
      await fetchData()
      alert(`Order status updated to ${newStatus.toUpperCase()}!`)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update order status')
    }
  }

  // --- GATE PASS GENERATION ---
  const handleGenerateGatePass = (order: SalesOrder) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print the gate pass')
      return
    }

    const customer = customers.find(c => c.id === order.customer_id)
    const currentDate = new Date().toLocaleDateString()

    const gatePassHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gate Pass - ${order.order_number}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; }
            .gate-pass-container { max-width: 800px; margin: 0 auto; padding: 40px; background: white; }
            .header { display: flex; justify-content: space-between; border: 2px solid #000; padding: 15px; margin-bottom: 20px; }
            .logo-section h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .logo-section p { margin: 5px 0 0 0; font-size: 14px; }
            .info-table { width: 50%; border-collapse: collapse; }
            .info-table td { padding: 3px; font-size: 12px; }
            .transport-info { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; border: 1px solid #000; }
            .transport-info .col { width: 48%; }
            .transport-info p { margin: 5px 0; font-size: 14px; }
            .goods-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .goods-table th, .goods-table td { border: 1px solid black; padding: 8px; text-align: left; font-size: 14px; }
            .goods-table th { background-color: #f0f0f0; font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; margin-bottom: 30px; }
            .sig-box { width: 30%; border: 1px solid #000; padding: 10px; text-align: center; }
            .sig-box p { margin: 5px 0; font-size: 12px; }
            .gate-section { border: 2px dashed black; padding: 15px; margin-top: 30px; }
            .gate-section h3 { margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; }
            .gate-grid { display: flex; justify-content: space-between; }
            .gate-grid div { width: 48%; }
            .gate-grid p { margin: 8px 0; font-size: 12px; }
            .no-print { margin-top: 20px; text-align: center; }
            .no-print button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 0 10px; }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="gate-pass-container">
            <div class="header">
              <div class="logo-section">
                <h1>YIZUTA Food Complex</h1>
                <p>Management System</p>
              </div>
              <div class="doc-info">
                <table class="info-table">
                  <tbody>
                    <tr><td><strong>Document Title:</strong></td><td>DELIVERY NOTE & GATE PASS</td></tr>
                    <tr><td><strong>Document No:</strong></td><td>GP-${order.order_number}</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${currentDate}</td></tr>
                    <tr><td><strong>Page No:</strong></td><td>1 of 1</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="transport-info">
              <div class="col">
                <p><strong>Customer:</strong> ${customer?.name || order.customers?.name || 'N/A'}</p>
                <p><strong>Address:</strong> ${customer?.company || 'N/A'}</p>
                <p><strong>Sales Order No:</strong> ${order.order_number}</p>
              </div>
              <div class="col">
                <p><strong>Driver Name:</strong> ${order.driver_name || '________________'}</p>
                <p><strong>Vehicle Plate No:</strong> ${order.vehicle_plate_no || '________________'}</p>
                <p><strong>Mode of Transport:</strong> Road / Truck</p>
              </div>
            </div>

            <h3>Please release the following goods:</h3>
            <table class="goods-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Product Type</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Finished Good</td>
                  <td>${order.product}</td>
                  <td>${order.quantity}</td>
                  <td>${order.quantity_unit || 'Boxes'}</td>
                </tr>
              </tbody>
            </table>

            <div class="signatures">
              <div class="sig-box">
                <p><strong>Prepared By (Sales):</strong></p>
                <br />
                <p>Sign: __________________</p>
                <p>Date: ${currentDate}</p>
              </div>
              <div class="sig-box">
                <p><strong>Issued By (Warehouse):</strong></p>
                <br />
                <p>Sign: __________________</p>
                <p>Date: ${currentDate}</p>
              </div>
              <div class="sig-box">
                <p><strong>Received By (Driver):</strong></p>
                <br />
                <p>Sign: __________________</p>
                <p>Date: ${currentDate}</p>
              </div>
            </div>

            <div class="gate-section">
              <h3>FOR GATE KEEPER USE ONLY</h3>
              <div class="gate-grid">
                <div>
                  <p><strong>Check In Time:</strong> ________________</p>
                  <p><strong>Check Out Time:</strong> ________________</p>
                </div>
                <div>
                  <p><strong>Gate Keeper Sign:</strong> __________________</p>
                  <p><strong>Security Stamp:</strong></p>
                </div>
              </div>
            </div>
          </div>

          <div class="no-print">
            <button onclick="window.print()">Print Gate Pass</button>
            <button onclick="window.close()">Close</button>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(gatePassHTML)
    printWindow.document.close()
  }

  // --- CALCULATIONS ---
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'active').length
  const totalOrders = orders.length
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { 
      style: 'currency', 
      currency: 'ETB',
      minimumFractionDigits: 2 
    }).format(amount)
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
            {totalOrders > 0 && orders.filter(o => o.status === 'completed').length > 0 
              ? formatCurrency(totalRevenue / orders.filter(o => o.status === 'completed').length) 
              : 'ETB 0.00'}
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
                  {canModifySales && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={canModifySales ? 6 : 5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={canModifySales ? 6 : 5} className="px-6 py-8 text-center text-gray-500">No orders yet</td></tr>
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
                      {canModifySales && (
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'processing')}
                                className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Process
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                className="flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete
                              </button>
                            )}
                            {order.status === 'completed' && (
                              <button
                                onClick={() => handleGenerateGatePass(order)}
                                className="flex items-center px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition"
                              >
                                <Printer className="w-3 h-3 mr-1" />
                                Gate Pass
                              </button>
                            )}
                          </div>
                        </td>
                      )}
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
              customers.slice(0, 5).map((customer) => {
                const customerCompletedOrders = orders.filter(o => o.customer_id === customer.id && o.status === 'completed')
                const dynamicTotalSpent = customerCompletedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
                const dynamicOrderCount = customerCompletedOrders.length

                return (
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
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(dynamicTotalSpent)}</p>
                        <p className="text-xs text-gray-500">{dynamicOrderCount} orders</p>
                      </div>
                    </div>
                  </div>
                )
              })
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

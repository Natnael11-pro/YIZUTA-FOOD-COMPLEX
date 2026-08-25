import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Edit2, Trash2, FileText, UserPlus, Printer } from 'lucide-react'
import AddCustomerModal from '../../components/AddCustomerModal'

interface Customer {
  id: string
  name: string
  company: string | null
  email: string | null
}

interface SalesOrder {
  id: string
  order_number: string
  customer_id: string
  product: string
  quantity: number
  unit_price: number
  total_amount: number
  status: string
  order_date: string
  driver_name: string | null
  vehicle_plate_no: string | null
  quantity_unit: string | null
  customers?: {
    name: string
    company: string | null
    email: string | null
  }
}

interface InventoryItem {
  item_name: string
  quantity: number
  unit: string
  category: string
}

const SalesPage = () => {
  const { userRole } = useAuth()
  
  // ✅ UPDATED: Admin is now View-Only. Only 'sales' role can modify orders.
  const canModifyOrders = userRole === 'sales'

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('pending')
  const [driverName, setDriverName] = useState('')
  const [vehiclePlateNo, setVehiclePlateNo] = useState('')
  const [quantityUnit, setQuantityUnit] = useState('Boxes')
  const [stockError, setStockError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: ordersData } = await supabase
        .from('sales_orders')
        .select('*, customers:customer_id(name, company, email)')
        .order('order_date', { ascending: false })
      
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      // Fetch all inventory items with stock > 0
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('item_name, quantity, unit, category')
        .gt('quantity', 0) 
        .order('item_name', { ascending: true })

      if (ordersData) setOrders(ordersData)
      if (customersData) setCustomers(customersData)
      if (inventoryData) setInventory(inventoryData)
      setLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => {
    const checkStock = async () => {
      if (!product) {
        setStockError('')
        return
      }

      const item = inventory.find(i => 
        i.item_name.toLowerCase() === product.toLowerCase()
      )
      
      if (!item) {
        setStockError('Product not found in inventory. Please check spelling.')
      } else {
        const qty = parseFloat(quantity)
        if (!isNaN(qty) && qty > item.quantity) {
          setStockError(`Insufficient stock! Only ${item.quantity} ${item.unit} available.`)
        } else {
          setStockError('')
          if (item.unit) setQuantityUnit(item.unit)
        }
      }
    }

    const timer = setTimeout(() => {
      checkStock()
    }, 500)

    return () => clearTimeout(timer)
  }, [product, quantity, inventory])

  const resetForm = () => {
    setCustomerId('')
    setProduct('')
    setQuantity('')
    setUnitPrice('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setStatus('pending')
    setDriverName('')
    setVehiclePlateNo('')
    setQuantityUnit('Boxes')
    setEditingOrder(null)
    setIsCreating(false)
    setStockError('')
  }

  const handleCreateOrder = async () => {
    if (!customerId || !product || !quantity || !unitPrice) {
      alert('Please fill in all required fields')
      return
    }

    if (stockError) {
      alert('Cannot create order: ' + stockError)
      return
    }

    const totalAmount = parseFloat(quantity) * parseFloat(unitPrice)

    const { error } = await supabase.from('sales_orders').insert({
      customer_id: customerId,
      product,
      quantity: parseFloat(quantity),
      unit_price: parseFloat(unitPrice),
      total_amount: totalAmount,
      order_date: orderDate,
      status,
      driver_name: driverName || null,
      vehicle_plate_no: vehiclePlateNo || null,
      quantity_unit: quantityUnit
    })

    if (error) {
      alert('Error creating order: ' + error.message)
    } else {
      alert('Order created successfully!')
      resetForm()
      const { data: ordersData } = await supabase
        .from('sales_orders')
        .select('*, customers:customer_id(name, company, email)')
        .order('order_date', { ascending: false })
      if (ordersData) setOrders(ordersData)
    }
  }

  const handleUpdateOrder = async () => {
    if (!editingOrder) return

    const totalAmount = parseFloat(quantity) * parseFloat(unitPrice)

    const { error } = await supabase
      .from('sales_orders')
      .update({
        customer_id: customerId,
        product,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        total_amount: totalAmount,
        order_date: orderDate,
        status,
        driver_name: driverName || null,
        vehicle_plate_no: vehiclePlateNo || null,
        quantity_unit: quantityUnit
      })
      .eq('id', editingOrder.id)

    if (error) {
      alert('Error updating order: ' + error.message)
    } else {
      alert('Order updated successfully!')
      resetForm()
      const { data: ordersData } = await supabase
        .from('sales_orders')
        .select('*, customers:customer_id(name, company, email)')
        .order('order_date', { ascending: false })
      if (ordersData) setOrders(ordersData)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from('sales_orders').delete().eq('id', id)
    if (error) {
      alert('Error deleting order: ' + error.message)
    } else {
      setDeleteConfirmId(null)
      const { data: ordersData } = await supabase
        .from('sales_orders')
        .select('*, customers:customer_id(name, company, email)')
        .order('order_date', { ascending: false })
      if (ordersData) setOrders(ordersData)
    }
  }

  const handleEditOrder = (order: SalesOrder) => {
    setEditingOrder(order)
    setCustomerId(order.customer_id)
    setProduct(order.product)
    setQuantity(order.quantity.toString())
    setUnitPrice(order.unit_price.toString())
    setOrderDate(order.order_date)
    setStatus(order.status)
    setDriverName(order.driver_name || '')
    setVehiclePlateNo(order.vehicle_plate_no || '')
    setQuantityUnit(order.quantity_unit || 'Boxes')
    setIsCreating(true)
  }

  const downloadInvoice = (order: SalesOrder) => {
    const taxRate = 0.15
    const subtotal = order.total_amount
    const taxAmount = subtotal * taxRate
    const totalWithTax = subtotal + taxAmount

    const csvContent = [
      ['INVOICE'],
      [''],
      ['YIZUTA Food Complex'],
      ['Dire Dawa, Ethiopia'],
      [''],
      ['Invoice Number:', `INV-${order.order_number}`],
      ['Order Number:', order.order_number],
      ['Issue Date:', new Date().toLocaleDateString()],
      ['Order Date:', order.order_date],
      [''],
      ['BILL TO:'],
      ['Customer:', order.customers?.name || 'N/A'],
      ['Company:', order.customers?.company || 'N/A'],
      ['Email:', order.customers?.email || 'N/A'],
      [''],
      ['DELIVERY DETAILS:'],
      ['Driver Name:', order.driver_name || 'N/A'],
      ['Vehicle Plate:', order.vehicle_plate_no || 'N/A'],
      [''],
      ['ITEMS:'],
      ['Description', 'Quantity', 'Unit', 'Unit Price (ETB)', 'Total (ETB)'],
      [order.product, order.quantity.toString(), order.quantity_unit || 'Boxes', order.unit_price.toFixed(2), order.total_amount.toFixed(2)],
      [''],
      ['SUMMARY:'],
      ['Subtotal:', '', '', '', subtotal.toFixed(2)],
      ['VAT (15%):', '', '', '', taxAmount.toFixed(2)],
      ['TOTAL AMOUNT:', '', '', '', totalWithTax.toFixed(2)],
      [''],
      ['Status:', order.status.toUpperCase()],
      [''],
      ['Thank you for your business!'],
      ['This is a computer-generated invoice.']
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Invoice_${order.order_number}_${order.order_date}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleGenerateGatePass = (order: SalesOrder) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print the gate pass')
      return
    }

    const currentDate = new Date().toLocaleDateString()

    const gatePassHTML = `
      <!DOCTYPE html>
      <html lang="en">
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
                <p><strong>Customer:</strong> ${order.customers?.name || 'N/A'}</p>
                <p><strong>Address:</strong> ${order.customers?.company || 'N/A'}</p>
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
                  <th scope="col">S.No</th>
                  <th scope="col">Category</th>
                  <th scope="col">Product Name</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit</th>
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
            <button onclick="window.print()" aria-label="Print Gate Pass">Print Gate Pass</button>
            <button onclick="window.close()" aria-label="Close window">Close</button>
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {editingOrder ? 'Edit Sales Order' : 'Create Sales Order'}
          </h1>
          <button 
            onClick={resetForm} 
            className="text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="customer" className="block mb-1.5 text-sm font-medium text-gray-700">Customer</label>
            <select 
              id="customer"
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              aria-required="true"
            >
              <option value="">Select a customer...</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.company ? `(${customer.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="product" className="block mb-1.5 text-sm font-medium text-gray-700">Product Name (Finished Goods)</label>
            <input 
              id="product"
              type="text" 
              value={product} 
              onChange={(e) => setProduct(e.target.value)} 
              placeholder="Type product name (e.g., Short-cut Pasta)..." 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" 
              required 
              aria-required="true"
            />
            {product && inventory.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-medium text-blue-900">Available in Warehouse:</p>
                <ul className="mt-1 space-y-1">
                  {inventory.map((item, idx) => (
                    <li key={idx} className="text-blue-700">
                      {item.item_name} - {item.quantity} {item.unit} available
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stockError && (
              <p className="text-xs mt-1 font-medium text-red-600">
                {stockError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block mb-1.5 text-sm font-medium text-gray-700">Quantity</label>
              <input 
                id="quantity"
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                className={`w-full px-4 py-2.5 border rounded-lg ${
                  stockError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`} 
                required 
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="unit" className="block mb-1.5 text-sm font-medium text-gray-700">Unit</label>
              <select 
                id="unit"
                value={quantityUnit} 
                onChange={(e) => setQuantityUnit(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Boxes">Boxes</option>
                <option value="Packs">Packs</option>
                <option value="Bags">Bags</option>
                <option value="Cartons">Cartons</option>
                <option value="Sacks">Sacks</option>
                <option value="Pieces">Pieces</option>
                <option value="Kilograms">Kilograms (kg)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="unit-price" className="block mb-1.5 text-sm font-medium text-gray-700">Unit Price (ETB)</label>
              <input 
                id="unit-price"
                type="number" 
                step="0.01" 
                value={unitPrice} 
                onChange={(e) => setUnitPrice(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" 
                required 
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="order-date" className="block mb-1.5 text-sm font-medium text-gray-700">Order Date</label>
              <input 
                id="order-date"
                type="date" 
                value={orderDate} 
                onChange={(e) => setOrderDate(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" 
                required 
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
            <select 
              id="status"
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Delivery Details (For Gate Pass)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="driver-name" className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                <input 
                  id="driver-name"
                  type="text" 
                  value={driverName} 
                  onChange={(e) => setDriverName(e.target.value)} 
                  placeholder="Optional" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" 
                />
              </div>
              <div>
                <label htmlFor="vehicle-plate" className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Plate No.</label>
                <input 
                  id="vehicle-plate"
                  type="text" 
                  value={vehiclePlateNo} 
                  onChange={(e) => setVehiclePlateNo(e.target.value)} 
                  placeholder="Optional" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button 
              onClick={resetForm} 
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={editingOrder ? handleUpdateOrder : handleCreateOrder} 
              disabled={!!stockError}
              className={`px-4 py-2 text-white rounded-lg ${
                stockError ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editingOrder ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-sm text-gray-500">Customer management and sales orders</p>
        </div>
        {/* ✅ Admin will NOT see this button anymore */}
        {canModifyOrders && (
          <button 
            onClick={() => setIsCreating(true)} 
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> New Order
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
          <p className="text-xs text-green-600">{customers.length} active</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          <p className="text-xs text-green-600"> +15.3%</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(orders.reduce((sum, order) => sum + order.total_amount, 0))}
          </p>
          <p className="text-xs text-green-600">↗ +12.5%</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(orders.length > 0 ? orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length : 0)}
          </p>
          <p className="text-xs text-green-600">↗ +8.2%</p>
        </div>
      </div>

      {/* Recent Orders and Top Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">No orders yet</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.customers?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{order.customers?.company || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.product}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {/* ✅ Admin will NOT see Edit/Delete buttons anymore */}
                        {canModifyOrders && (
                          <>
                            <button 
                              onClick={() => handleEditOrder(order)} 
                              aria-label={`Edit order ${order.order_number}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                              title="Edit order"
                            >
                              <Edit2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                            {deleteConfirmId === order.id ? (
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => handleDeleteOrder(order.id)} 
                                  className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                                >
                                  Confirm
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(null)} 
                                  className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeleteConfirmId(order.id)} 
                                aria-label={`Delete order ${order.order_number}`}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                                title="Delete order"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}
                          </>
                        )}
                        {order.status === 'completed' && (
                          <button 
                            onClick={() => downloadInvoice(order)} 
                            aria-label={`Download invoice for order ${order.order_number}`}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" 
                            title="Download Invoice"
                          >
                            <FileText className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <button 
                            onClick={() => handleGenerateGatePass(order)} 
                            aria-label={`Print gate pass for order ${order.order_number}`}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" 
                            title="Print Gate Pass"
                          >
                            <Printer className="w-4 h-4" aria-hidden="true" />
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

        {/* Top Customers Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
            {/* ✅ Admin will NOT see Add Customer button anymore */}
            {canModifyOrders && (
              <button 
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                aria-label="Add new customer"
              >
                <UserPlus className="w-4 h-4 mr-1" aria-hidden="true" />
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
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm mr-3" aria-hidden="true">
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

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerAdded={() => {
          setIsCustomerModalOpen(false)
          const fetchData = async () => {
            const { data: customersData } = await supabase
              .from('customers')
              .select('*')
              .order('name')
            if (customersData) setCustomers(customersData)
          }
          fetchData()
        }}
      />
    </div>
  )
}

export default SalesPage
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddSalesOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onOrderAdded: () => void
}

interface Customer {
  id: string
  name: string
  company: string | null
}

interface InventoryItem {
  item_name: string
  quantity: number
  unit: string
}

const AddSalesOrderModal = ({ isOpen, onClose, onOrderAdded }: AddSalesOrderModalProps) => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [availableStock, setAvailableStock] = useState<number>(0)
  const [stockError, setStockError] = useState<string>('')
  const [quantityUnit, setQuantityUnit] = useState('Boxes')
  const [driverName, setDriverName] = useState('')
  const [vehiclePlateNo, setVehiclePlateNo] = useState('')

  // ✅ FIX: Use useMemo for derived state to prevent useEffect setState warnings
  const filteredProducts = useMemo(() => {
    if (product.length > 0) {
      return inventoryItems.filter(item => 
        item.item_name.toLowerCase().includes(product.toLowerCase()) &&
        item.quantity > 0 // Only show items with stock
      )
    }
    return []
  }, [product, inventoryItems])

  const showProductSuggestions = filteredProducts.length > 0

  useEffect(() => {
    if (isOpen) {
      // Fetch customers
      supabase.from('customers').select('id, name, company').then(({ data }) => {
        if (data) setCustomers(data as Customer[])
      })
      
      // Fetch available inventory items
      supabase.from('inventory').select('item_name, quantity, unit').then(({ data }) => {
        if (data) setInventoryItems(data as InventoryItem[])
      })
    }
  }, [isOpen])

  // Check stock when product is selected
  useEffect(() => {
    const checkStock = async () => {
      if (!product) {
        setAvailableStock(0)
        setStockError('')
        return
      }

      const { data, error } = await supabase
        .from('inventory')
        .select('quantity, unit')
        .ilike('item_name', product)
        .single()

      if (error || !data) {
        setAvailableStock(0)
        setStockError('Product not found in inventory. Please check the product name.')
      } else {
        setAvailableStock(data.quantity)
        setQuantityUnit(data.unit || 'Boxes')
        const qty = parseFloat(quantity)
        if (!isNaN(qty) && qty > data.quantity) {
          setStockError(`Insufficient stock! Only ${data.quantity} ${data.unit || 'Boxes'} available.`)
        } else {
          setStockError('')
        }
      }
    }

    // Debounce the check to avoid excessive database queries while typing
    const timer = setTimeout(() => {
      checkStock()
    }, 500)

    return () => clearTimeout(timer)
  }, [product, quantity])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (stockError) {
      setError('Cannot create order: ' + stockError)
      return
    }

    setError('')
    setLoading(true)

    try {
      const qty = parseFloat(quantity)
      const price = parseFloat(unitPrice)
      const totalAmount = (qty * price).toFixed(2)

      const { error } = await supabase
        .from('sales_orders')
        .insert({
          order_number: `ORD-${Math.floor(Math.random() * 10000)}`,
          customer_id: customerId,
          product,
          quantity: qty,
          unit_price: price,
          total_amount: totalAmount,
          order_date: orderDate,
          status,
          quantity_unit: quantityUnit,
          driver_name: driverName || null,
          vehicle_plate_no: vehiclePlateNo || null
        })

      if (error) throw error

      alert('Sales Order created successfully!')
      onOrderAdded()
      onClose()
      
      // Reset form fields
      setCustomerId('')
      setProduct('')
      setQuantity('')
      setUnitPrice('')
      setDriverName('')
      setVehiclePlateNo('')
      setQuantityUnit('Boxes')
    } catch (err: unknown) {
      console.error('Error creating order:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (itemName: string) => {
    setProduct(itemName)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">Create Sales Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Customer</label>
            <select 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Product Name</label>
            <input 
              type="text" 
              value={product} 
              onChange={(e) => setProduct(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Type to search products..."
              required 
            />
            
            {/* Product Suggestions Dropdown */}
            {showProductSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleProductSelect(item.item_name)}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{item.item_name}</span>
                      <span className="text-sm text-green-600">{item.quantity} {item.unit} available</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Real-time stock feedback */}
            {product && !showProductSuggestions && (
              <p className={`text-xs mt-1 font-medium ${stockError ? 'text-red-600' : 'text-green-600'}`}>
                {stockError ? stockError : `✓ Available in stock: ${availableStock} ${quantityUnit}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity</label>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                  stockError ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                }`} 
                required 
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Unit</label>
              <input 
                type="text" 
                value={quantityUnit} 
                onChange={(e) => setQuantityUnit(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Unit Price (ETB)</label>
              <input 
                type="number" 
                step="0.01" 
                value={unitPrice} 
                onChange={(e) => setUnitPrice(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Order Date</label>
              <input 
                type="date" 
                value={orderDate} 
                onChange={(e) => setOrderDate(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Delivery Details (For Gate Pass)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                <input 
                  type="text" 
                  value={driverName} 
                  onChange={(e) => setDriverName(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Plate No.</label>
                <input 
                  type="text" 
                  value={vehiclePlateNo} 
                  onChange={(e) => setVehiclePlateNo(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !!stockError} 
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                stockError 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
              }`}
            >
              {loading ? 'Saving...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddSalesOrderModal

import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddSalesOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onOrderAdded: () => void
}

// ✅ FIX: Added proper interface instead of 'any'
interface Customer {
  id: string
  name: string
  company: string | null
}

const AddSalesOrderModal = ({ isOpen, onClose, onOrderAdded }: AddSalesOrderModalProps) => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      supabase.from('customers').select('id, name, company').then(({ data }) => {
        if (data) setCustomers(data as Customer[])
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          status
        })

      if (error) throw error

      alert('Sales Order created successfully!')
      onOrderAdded()
      onClose()
      
      setCustomerId('')
      setProduct('')
      setQuantity('')
      setUnitPrice('')
    } catch (err: unknown) {
      console.error('Error creating order:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
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
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Product Name</label>
            <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Unit Price ($)</label>
              <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Order Date</label>
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddSalesOrderModal

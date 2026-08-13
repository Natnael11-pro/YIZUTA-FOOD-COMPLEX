import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddShipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onShipmentAdded: () => void
}

interface InventoryItem {
  id: string
  item_name: string
  sku: string
  quantity: number
}

const AddShipmentModal = ({ isOpen, onClose, onShipmentAdded }: AddShipmentModalProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [itemId, setItemId] = useState('')
  const [type, setType] = useState<'inbound' | 'outbound'>('inbound')
  const [quantity, setQuantity] = useState('')
  const [supplier, setSupplier] = useState('')
  const [client, setClient] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      supabase.from('inventory').select('id, item_name, sku, quantity').then(({ data }) => {
        if (data) setInventory(data as InventoryItem[])
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('shipments')
        .insert({
          item_id: itemId,
          type,
          quantity: parseInt(quantity),
          supplier: type === 'inbound' ? supplier : null,
          client: type === 'outbound' ? client : null,
          notes: notes || null
        })

      if (error) throw error

      // Update inventory quantity
      const item = inventory.find(i => i.id === itemId)
      if (item) {
        const newQuantity = type === 'inbound' 
          ? item.quantity + parseInt(quantity)
          : item.quantity - parseInt(quantity)

        await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', itemId)
      }

      alert('Shipment recorded successfully!')
      onShipmentAdded()
      onClose()
      
      setItemId('')
      setQuantity('')
      setSupplier('')
      setClient('')
      setNotes('')
    } catch (err: unknown) {
      console.error('Error creating shipment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create shipment'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    // ✅ ACCESSIBILITY: Added role, aria-modal, and aria-labelledby for modal semantics
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-shipment-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="add-shipment-modal-title" className="text-xl font-semibold text-gray-900">Create Shipment</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="shipment-type" className="block mb-1.5 text-sm font-medium text-gray-700">Shipment Type</label>
            <select 
              id="shipment-type"
              value={type} 
              onChange={(e) => setType(e.target.value as 'inbound' | 'outbound')} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            >
              <option value="inbound">📥 Inbound (Receiving)</option>
              <option value="outbound">📤 Outbound (Shipping)</option>
            </select>
          </div>

          <div>
            <label htmlFor="item-select" className="block mb-1.5 text-sm font-medium text-gray-700">Item</label>
            <select 
              id="item-select"
              value={itemId} 
              onChange={(e) => setItemId(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
              aria-required="true"
            >
              <option value="">Select an item...</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>{item.item_name} ({item.sku})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="shipment-quantity" className="block mb-1.5 text-sm font-medium text-gray-700">Quantity</label>
            <input 
              id="shipment-quantity"
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
              aria-required="true"
            />
          </div>

          {type === 'inbound' ? (
            <div>
              <label htmlFor="supplier" className="block mb-1.5 text-sm font-medium text-gray-700">Supplier</label>
              <input 
                id="supplier"
                type="text" 
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)} 
                placeholder="Supplier name" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          ) : (
            <div>
              <label htmlFor="client" className="block mb-1.5 text-sm font-medium text-gray-700">Client</label>
              <input 
                id="client"
                type="text" 
                value={client} 
                onChange={(e) => setClient(e.target.value)} 
                placeholder="Client name" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block mb-1.5 text-sm font-medium text-gray-700">Notes</label>
            <textarea 
              id="notes"
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
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
              disabled={loading} 
              aria-label={loading ? 'Recording shipment' : 'Record new shipment'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Record Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddShipmentModal

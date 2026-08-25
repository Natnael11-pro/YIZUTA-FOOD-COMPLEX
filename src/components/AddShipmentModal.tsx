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
  category: string
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
  
  // ✅ NEW: State for creating new items during inbound
  const [isNewItem, setIsNewItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemSku, setNewItemSku] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('raw_material')
  const [newItemUnit, setNewItemUnit] = useState('units')
  const [newItemReorderLevel, setNewItemReorderLevel] = useState('10')

  useEffect(() => {
    if (isOpen) {
      supabase.from('inventory').select('id, item_name, sku, quantity, category').then(({ data }) => {
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
      let finalItemId = itemId

      // ✅ If creating new item during inbound
      if (type === 'inbound' && isNewItem) {
        if (!newItemName || !newItemSku || !quantity) {
          throw new Error('Please fill in all required fields for new item')
        }

        // First, create the new inventory item
        const { data: newItemData, error: newItemError } = await supabase
          .from('inventory')
          .insert({
            item_name: newItemName,
            sku: newItemSku,
            category: newItemCategory,
            unit: newItemUnit,
            quantity: parseInt(quantity),
            reorder_level: parseInt(newItemReorderLevel),
            status: 'in_stock'
          })
          .select()
          .single()

        if (newItemError) throw newItemError
        finalItemId = newItemData.id
      } else {
        // Using existing item
        if (!itemId) {
          throw new Error('Please select an item')
        }
      }

      // Create shipment record
      const { error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          item_id: finalItemId,
          type,
          quantity: parseInt(quantity),
          supplier: type === 'inbound' ? supplier : null,
          client: type === 'outbound' ? client : null,
          notes: notes || null
        })

      if (shipmentError) throw shipmentError

      // Update inventory quantity (only for existing items or after creating new item)
      if (!isNewItem || type === 'inbound') {
        const item = inventory.find(i => i.id === finalItemId)
        if (item || type === 'inbound') {
          const currentQty = item ? item.quantity : 0
          const newQuantity = type === 'inbound' 
            ? currentQty + parseInt(quantity)
            : currentQty - parseInt(quantity)

          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', finalItemId)
        }
      }

      alert('Shipment recorded successfully!')
      onShipmentAdded()
      onClose()
      
      // Reset all form fields
      setItemId('')
      setQuantity('')
      setSupplier('')
      setClient('')
      setNotes('')
      setIsNewItem(false)
      setNewItemName('')
      setNewItemSku('')
      setNewItemCategory('raw_material')
      setNewItemUnit('units')
      setNewItemReorderLevel('10')
    } catch (err: unknown) {
      console.error('Error creating shipment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create shipment'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
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

          {/* ✅ NEW: Toggle for creating new item during inbound */}
          {type === 'inbound' && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="is-new-item"
                checked={isNewItem}
                onChange={(e) => setIsNewItem(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is-new-item" className="text-sm font-medium text-blue-900">
                This is a NEW item not in inventory
              </label>
            </div>
          )}

          {/* ✅ NEW: Form fields for new item */}
          {type === 'inbound' && isNewItem ? (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">New Item Details</h3>
              
              <div>
                <label htmlFor="new-item-name" className="block mb-1 text-sm text-gray-700">Item Name *</label>
                <input
                  id="new-item-name"
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Sweet Flour"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-item-sku" className="block mb-1 text-sm text-gray-700">SKU *</label>
                <input
                  id="new-item-sku"
                  type="text"
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                  placeholder="e.g., OB-1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-item-category" className="block mb-1 text-sm text-gray-700">Category</label>
                <select
                  id="new-item-category"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="raw_material">Raw Material</option>
                  <option value="finished_good">Finished Good</option>
                  <option value="packaging">Packaging</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-item-unit" className="block mb-1 text-sm text-gray-700">Unit</label>
                  <select
                    id="new-item-unit"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="units">Units</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="boxes">Boxes</option>
                    <option value="liters">Liters (L)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-item-reorder" className="block mb-1 text-sm text-gray-700">Reorder Level</label>
                  <input
                    id="new-item-reorder"
                    type="number"
                    value={newItemReorderLevel}
                    onChange={(e) => setNewItemReorderLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="item-select" className="block mb-1.5 text-sm font-medium text-gray-700">Item</label>
              <select 
                id="item-select"
                value={itemId} 
                onChange={(e) => setItemId(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required={!isNewItem || type === 'outbound'}
                aria-required="true"
              >
                <option value="">Select an item...</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.item_name} ({item.sku}) - {item.category}
                  </option>
                ))}
              </select>
            </div>
          )}

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
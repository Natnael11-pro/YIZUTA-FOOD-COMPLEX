import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface EditInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onItemUpdated: () => void
  itemId: string | null
}

const EditInventoryModal = ({ isOpen, onClose, onItemUpdated, itemId }: EditInventoryModalProps) => {
  const [itemName, setItemName] = useState('')
  const [sku, setSku] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reorderLevel, setReorderLevel] = useState('')
  const [unit, setUnit] = useState('units')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('in_stock')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load existing item data
  useEffect(() => {
    if (itemId && isOpen) {
      const loadItem = async () => {
        const { data } = await supabase
          .from('inventory')
          .select('*')
          .eq('id', itemId)
          .single()
        
        if (data) {
          setItemName(data.item_name)
          setSku(data.sku)
          setQuantity(data.quantity.toString())
          setReorderLevel(data.reorder_level.toString())
          setUnit(data.unit)
          setCategory(data.category || '')
          setStatus(data.status)
        }
      }
      loadItem()
    }
  }, [itemId, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          item_name: itemName,
          sku: sku,
          quantity: parseInt(quantity),
          reorder_level: parseInt(reorderLevel),
          unit: unit,
          category: category || null,
          status: status
        })
        .eq('id', itemId)

      if (error) throw error

      alert('Item updated successfully!')
      onItemUpdated()
      onClose()
    } catch (err: any) {
      console.error('Error updating item:', err)
      setError(err.message || 'Failed to update item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Inventory Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Item Name</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">SKU</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Reorder Level</label>
              <input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="units">Units</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="liters">Liters (L)</option>
                <option value="boxes">Boxes</option>
                <option value="packs">Packs</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditInventoryModal

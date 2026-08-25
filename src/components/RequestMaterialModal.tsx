import { useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../context/AuthContext'
import { X } from 'lucide-react'

interface RequestMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onRequestAdded: () => void
}

const RequestMaterialModal = ({ isOpen, onClose, onRequestAdded }: RequestMaterialModalProps) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    materialName: '',
    quantity: '',
    unit: 'kg',
    urgency: 'medium'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('material_requests').insert([
        {
          requested_by_name: user?.email || 'Unknown User',
          material_name: formData.materialName,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          urgency: formData.urgency
        }
      ])

      if (error) throw error
      
      alert('Material request submitted successfully!')
      onRequestAdded()
      onClose()
      setFormData({ materialName: '', quantity: '', unit: 'kg', urgency: 'medium' })
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Failed to submit request.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    // ✅ ACCESSIBILITY: Added modal semantics
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-material-modal-title"
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 id="request-material-modal-title" className="text-xl font-bold text-gray-900">Request Raw Materials</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="material-name" className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
            <input
              id="material-name"
              type="text"
              required
              aria-required="true"
              value={formData.materialName}
              onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Raw Wheat, Packaging Boxes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="material-quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                id="material-quantity"
                type="number"
                required
                aria-required="true"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="material-unit" className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                id="material-unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="liters">Liters (L)</option>
                <option value="pieces">Pieces</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="material-urgency" className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
            <select
              id="material-urgency"
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low (Routine Restock)</option>
              <option value="medium">Medium (Standard Request)</option>
              <option value="high">High (Urgent/Line Stopped)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              aria-label={loading ? 'Submitting request' : 'Submit material request'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RequestMaterialModal
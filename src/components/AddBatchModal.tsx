import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onBatchAdded: () => void
}

// ✅ FIX: Added proper interface instead of 'any'
interface ProductionLine {
  id: string
  name: string
  product_type: string
}

const AddBatchModal = ({ isOpen, onClose, onBatchAdded }: AddBatchModalProps) => {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [product, setProduct] = useState('')
  const [lineId, setLineId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [qualityStatus, setQualityStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      supabase.from('production_lines').select('id, name, product_type').then(({ data }) => {
        if (data) setLines(data as ProductionLine[])
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const batchId = `BATCH-${Date.now().toString().slice(-6)}`

      const { error } = await supabase
        .from('batches')
        .insert({
          batch_id: batchId,
          product,
          line_id: lineId || null,
          quantity: parseInt(quantity),
          status,
          quality_status: qualityStatus
        })

      if (error) throw error

      alert('Production Batch created successfully!')
      onBatchAdded()
      onClose()
      
      setProduct('')
      setLineId('')
      setQuantity('')
      
    } catch (err: unknown) {
      console.error('Error creating batch:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create batch. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Batch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g., Orange Juice 1L"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Production Line</label>
            <select
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a line (Optional)...</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name} ({line.product_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="in_progress">In Progress</option>
                <option value="quality_check">Quality Check</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Quality</label>
              <select
                value={qualityStatus}
                onChange={(e) => setQualityStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddBatchModal

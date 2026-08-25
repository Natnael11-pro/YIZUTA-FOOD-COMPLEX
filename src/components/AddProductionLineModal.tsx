import { useState } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddProductionLineModalProps {
  isOpen: boolean
  onClose: () => void
  onLineAdded: () => void
}

const AddProductionLineModal = ({ isOpen, onClose, onLineAdded }: AddProductionLineModalProps) => {
  const [name, setName] = useState('')
  const [productType, setProductType] = useState('')
  const [status, setStatus] = useState<'running' | 'maintenance' | 'stopped'>('maintenance')
  const [efficiency, setEfficiency] = useState('0')
  const [targetOutput, setTargetOutput] = useState('')
  const [currentOutput, setCurrentOutput] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('production_lines')
        .insert({
          name,
          product_type: productType,
          status,
          efficiency: parseInt(efficiency),
          target_output: parseInt(targetOutput),
          current_output: parseInt(currentOutput)
        })

      if (error) throw error

      alert('Production Line added successfully!')
      onLineAdded()
      onClose()
      
      setName('')
      setProductType('')
      setStatus('maintenance')
      setEfficiency('0')
      setTargetOutput('')
      setCurrentOutput('0')
    } catch (err: unknown) {
      console.error('Error adding production line:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to add production line'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    // ✅ ACCESSIBILITY: Added modal semantics
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-line-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="add-line-modal-title" className="text-xl font-semibold text-gray-900">Add Production Line</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg" role="alert">{error}</div>
          )}

          <div>
            <label htmlFor="line-name" className="block mb-1.5 text-sm font-medium text-gray-700">Line Name</label>
            <input 
              id="line-name"
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Flour Milling Line A" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="line-product" className="block mb-1.5 text-sm font-medium text-gray-700">Product Type</label>
            <input 
              id="line-product"
              type="text" 
              value={productType} 
              onChange={(e) => setProductType(e.target.value)} 
              placeholder="e.g., Wheat Flour, Sweet Biscuits" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="line-status" className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
            <select 
              id="line-status"
              value={status} 
              onChange={(e) => setStatus(e.target.value as 'running' | 'maintenance' | 'stopped')} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="running">🟢 Running</option>
              <option value="maintenance">🟡 Maintenance</option>
              <option value="stopped">🔴 Stopped</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="line-efficiency" className="block mb-1.5 text-sm font-medium text-gray-700">Efficiency (%)</label>
              <input 
                id="line-efficiency"
                type="number" 
                min="0" 
                max="100" 
                value={efficiency} 
                onChange={(e) => setEfficiency(e.target.value)} 
                placeholder="0" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label htmlFor="line-target" className="block mb-1.5 text-sm font-medium text-gray-700">Target Output</label>
              <input 
                id="line-target"
                type="number" 
                value={targetOutput} 
                onChange={(e) => setTargetOutput(e.target.value)} 
                placeholder="e.g., 1000" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="line-current" className="block mb-1.5 text-sm font-medium text-gray-700">Current Output</label>
            <input 
              id="line-current"
              type="number" 
              value={currentOutput} 
              onChange={(e) => setCurrentOutput(e.target.value)} 
              placeholder="0" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button 
              type="submit" 
              disabled={loading} 
              aria-label={loading ? 'Adding production line' : 'Add new production line'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Line'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddProductionLineModal
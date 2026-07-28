import { useState } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddProductionLineModalProps {
  isOpen: boolean
  onClose: () => void
  onLineAdded: () => void
}

const AddProductionLineModal = ({ isOpen, onClose, onLineAdded }: AddProductionLineModalProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    product_type: '',
    target_output: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('production_lines').insert([
        {
          name: formData.name,
          product_type: formData.product_type,
          target_output: formData.target_output,
          status: 'stopped',
          efficiency: 0,
          current_output: 0
        }
      ])
      if (error) throw error
      onLineAdded()
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Production Line</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Line Name" 
            required 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <input 
            type="text" 
            placeholder="Product Type" 
            required 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, product_type: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Target Output" 
            required 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, target_output: Number(e.target.value)})}
          />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
            {loading ? 'Adding...' : 'Add Line'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddProductionLineModal

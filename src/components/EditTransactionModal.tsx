import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface EditTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onTransactionUpdated: () => void
  transactionId: string | null
}

const EditTransactionModal = ({ isOpen, onClose, onTransactionUpdated, transactionId }: EditTransactionModalProps) => {
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<'completed' | 'pending'>('completed')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load existing transaction data
  useEffect(() => {
    if (transactionId && isOpen) {
      const loadTransaction = async () => {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single()
        
        if (data) {
          setType(data.type)
          setDescription(data.description)
          setAmount(data.amount.toString())
          setDate(data.date)
          setStatus(data.status)
          setCategory(data.category || '')
        }
      }
      loadTransaction()
    }
  }, [transactionId, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          type,
          description,
          amount: parseFloat(amount),
          date,
          status,
          category: category || null
        })
        .eq('id', transactionId)

      if (error) throw error

      alert('Transaction updated successfully!')
      onTransactionUpdated()
      onClose()
    } catch (err: any) {
      console.error('Error updating transaction:', err)
      setError(err.message || 'Failed to update transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Amount (ETB)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Raw Materials, Utilities" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'completed' | 'pending')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTransactionModal

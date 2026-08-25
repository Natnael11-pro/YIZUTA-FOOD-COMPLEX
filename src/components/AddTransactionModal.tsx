import { useState } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: () => void
}

// Transaction categories for dropdown
const transactionCategories = [
  'Sales Revenue',
  'Payroll',
  'Salaries',
  'Raw Materials',
  'Utilities',
  'Maintenance',
  'Equipment',
  'Transportation',
  'Office Supplies',
  'Marketing',
  'Insurance',
  'Taxes',
  'Other Expenses'
]

const AddTransactionModal = ({ isOpen, onClose, onTransactionAdded }: AddTransactionModalProps) => {
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'completed' | 'pending'>('completed')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          type,
          description,
          amount: parseFloat(amount),
          date,
          status,
          category: category || null
        })

      if (error) throw error

      alert('Transaction added successfully!')
      onTransactionAdded()
      onClose()
      
      setDescription('')
      setAmount('')
      setCategory('')
      
    } catch (err: unknown) {
      console.error('Error adding transaction:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction'
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
      aria-labelledby="add-transaction-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="add-transaction-modal-title" className="text-xl font-semibold text-gray-900">Add New Transaction</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg" role="alert">{error}</div>
          )}

          <div>
            <label htmlFor="add-trans-type" className="block mb-1.5 text-sm font-medium text-gray-700">Type</label>
            <select 
              id="add-trans-type"
              value={type} 
              onChange={(e) => setType(e.target.value as 'income' | 'expense')} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label htmlFor="add-trans-description" className="block mb-1.5 text-sm font-medium text-gray-700">Description</label>
            <input 
              id="add-trans-description"
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="e.g., Office Supplies" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="add-trans-amount" className="block mb-1.5 text-sm font-medium text-gray-700">Amount (ETB)</label>
              <input 
                id="add-trans-amount"
                type="number" 
                step="0.01" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0.00" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="add-trans-date" className="block mb-1.5 text-sm font-medium text-gray-700">Date</label>
              <input 
                id="add-trans-date"
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="add-trans-category" className="block mb-1.5 text-sm font-medium text-gray-700">Category</label>
            <select
              id="add-trans-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category...</option>
              {transactionCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="add-trans-status" className="block mb-1.5 text-sm font-medium text-gray-700">Status</label>
            <select 
              id="add-trans-status"
              value={status} 
              onChange={(e) => setStatus(e.target.value as 'completed' | 'pending')} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button 
              type="submit" 
              disabled={loading} 
              aria-label={loading ? 'Saving transaction' : 'Save new transaction'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTransactionModal
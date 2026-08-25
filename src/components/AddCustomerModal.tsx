import { useState } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerAdded: () => void
}

const AddCustomerModal = ({ isOpen, onClose, onCustomerAdded }: AddCustomerModalProps) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('customers')
        .insert({
          name,
          email,
          phone: phone || null,
          company: company || null,
          status: 'active'
        })

      if (error) throw error

      alert('Customer added successfully!')
      onCustomerAdded()
      onClose()
      
      setName('')
      setEmail('')
      setPhone('')
      setCompany('')
    } catch (error) {
      console.error('Error adding customer:', error)
      setError('Failed to add customer. Please try again.')
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
      aria-labelledby="add-customer-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="add-customer-modal-title" className="text-xl font-semibold text-gray-900">Add New Customer</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg" role="alert">{error}</div>
          )}

          <div>
            <label htmlFor="cust-name" className="block mb-1.5 text-sm font-medium text-gray-700">Full Name</label>
            <input 
              id="cust-name"
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="cust-email" className="block mb-1.5 text-sm font-medium text-gray-700">Email</label>
            <input 
              id="cust-email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
              aria-required="true"
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cust-phone" className="block mb-1.5 text-sm font-medium text-gray-700">Phone</label>
              <input 
                id="cust-phone"
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label htmlFor="cust-company" className="block mb-1.5 text-sm font-medium text-gray-700">Company</label>
              <input 
                id="cust-company"
                type="text" 
                value={company} 
                onChange={(e) => setCompany(e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button 
              type="submit" 
              disabled={loading} 
              aria-label={loading ? 'Saving customer' : 'Save new customer'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCustomerModal
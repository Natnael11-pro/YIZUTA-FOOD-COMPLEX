import { useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../context/AuthContext' // Adjust path if needed
import { X } from 'lucide-react'

interface RequestApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const RequestApprovalModal = ({ isOpen, onClose, onSuccess }: RequestApprovalModalProps) => {
  const { user } = useAuth() // Ensure your AuthContext provides the user object
  const [requestType, setRequestType] = useState('Financial Request')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('executive_requests').insert({
        requester_id: user?.id,
        request_type: requestType,
        details: details,
        status: 'pending'
      })

      if (error) throw error

      alert('Request sent to Executive Manager successfully!')
      onSuccess()
      onClose()
      setDetails('') // Reset form
    } catch (err) {
      alert('Error sending request: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Request Executive Approval</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Request Type</label>
            <select 
              value={requestType} 
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option>Financial Request</option>
              <option>Large Material Purchase</option>
              <option>Equipment Maintenance</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Details / Justification</label>
            <textarea 
              value={details} 
              onChange={(e) => setDetails(e.target.value)}
              required
              className="w-full border rounded-lg p-2 h-32"
              placeholder="Explain why this request is necessary..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RequestApprovalModal
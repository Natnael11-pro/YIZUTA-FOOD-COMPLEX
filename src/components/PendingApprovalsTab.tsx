import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { CheckCircle, XCircle, Eye, FileText } from 'lucide-react'

interface Request {
  id: string
  request_type: string
  details: string
  status: string
  created_at: string
  updated_at?: string
  rejection_reason?: string
  profiles: { full_name: string }
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  request: Request | null
}

const RequestDetailModal = ({ isOpen, onClose, request }: ModalProps) => {
  if (!isOpen || !request) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 m-4">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-900">Request Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Request Type</label>
            <p className="text-lg font-semibold text-gray-900">{request.request_type}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Requested By</label>
            <p className="text-gray-900">{request.profiles?.full_name || 'Unknown'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <span className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${
              request.status === 'approved' ? 'bg-green-100 text-green-700' :
              request.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Submitted Date</label>
            <p className="text-gray-900">{new Date(request.created_at).toLocaleString()}</p>
          </div>

          {request.updated_at && request.status !== 'pending' && (
            <div>
              <label className="text-sm font-medium text-gray-500">Processed Date</label>
              <p className="text-gray-900">{new Date(request.updated_at).toLocaleString()}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-500">Description / Justification</label>
            <div className="mt-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">{request.details}</p>
            </div>
          </div>

          {request.status === 'rejected' && request.rejection_reason && (
            <div>
              <label className="text-sm font-medium text-gray-500">Rejection Reason</label>
              <div className="mt-1 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-800 whitespace-pre-wrap">{request.rejection_reason}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const PendingApprovalsTab = () => {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ✅ FIX: All fetch logic is now completely INSIDE the useEffect
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      // Move setLoading inside the async function
      setLoading(true)
      
      let query = supabase
        .from('executive_requests')
        .select('*, profiles:requester_id(full_name)')
        .order('created_at', { ascending: false })

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      const { data, error } = await query

      if (isMounted) {
        if (!error && data) {
          setRequests(data)
        }
        setLoading(false)
      }
    }

    fetchData()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [activeTab])

  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to approve this request?')) return
    
    const { error } = await supabase
      .from('executive_requests')
      .update({ status: 'approved' })
      .eq('id', id)

    if (!error) {
      // ✅ Inline refetch - changed 'refetchError' to 'error'
      setLoading(true)
      let query = supabase
        .from('executive_requests')
        .select('*, profiles:requester_id(full_name)')
        .order('created_at', { ascending: false })

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      const { data, error: fetchError } = await query
      if (!fetchError && data) setRequests(data)
      setLoading(false)
    } else {
      alert('Error approving request')
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectionReason) {
      alert('Please provide a reason for rejection.')
      return
    }

    const { error } = await supabase
      .from('executive_requests')
      .update({ status: 'rejected', rejection_reason: rejectionReason })
      .eq('id', id)

    if (!error) {
      setRejectingId(null)
      setRejectionReason('')
      
      // ✅ Inline refetch - changed 'refetchError' to 'error'
      setLoading(true)
      let query = supabase
        .from('executive_requests')
        .select('*, profiles:requester_id(full_name)')
        .order('created_at', { ascending: false })

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      const { data, error: fetchError } = await query
      if (!fetchError && data) setRequests(data)
      setLoading(false)
    } else {
      alert('Error rejecting request')
    }
  }

  const viewRequestDetails = (request: Request) => {
    setSelectedRequest(request)
    setIsModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold mb-4">Executive Request Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'pending'
              ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'approved'
              ? 'bg-green-100 text-green-700 border-b-2 border-green-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'rejected'
              ? 'bg-red-100 text-red-700 border-b-2 border-red-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'all'
              ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All History
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-center text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No {activeTab === 'all' ? '' : activeTab} requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-gray-900">{req.request_type}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(req.status)}`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Requested by: <span className="font-medium text-gray-700">{req.profiles?.full_name || 'Unknown'}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => viewRequestDetails(req)}
                  className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="View Details"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              {/* Preview of details (truncated) */}
              <div className="mb-3">
                <p className="text-sm text-gray-700 line-clamp-2 bg-gray-50 p-2 rounded">
                  {req.details}
                </p>
                {req.details.length > 150 && (
                  <button
                    onClick={() => viewRequestDetails(req)}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Read more...
                  </button>
                )}
              </div>

              {/* Action Buttons - Only for Pending */}
              {req.status === 'pending' && (
                rejectingId === req.id ? (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <input 
                      type="text" 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex-1 border rounded p-2 text-sm"
                    />
                    <button 
                      onClick={() => handleReject(req.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                    >
                      Confirm Reject
                    </button>
                    <button 
                      onClick={() => { setRejectingId(null); setRejectionReason('') }}
                      className="bg-gray-300 px-4 py-2 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-3 pt-3 border-t">
                    <button 
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button 
                      onClick={() => setRejectingId(req.id)}
                      className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 text-sm"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )
              )}

              {/* Show rejection reason for rejected requests */}
              {req.status === 'rejected' && req.rejection_reason && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-red-600 font-medium">Rejection Reason:</p>
                  <p className="text-sm text-red-800 bg-red-50 p-2 rounded mt-1">{req.rejection_reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <RequestDetailModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedRequest(null); }}
        request={selectedRequest}
      />
    </div>
  )
}

export default PendingApprovalsTab
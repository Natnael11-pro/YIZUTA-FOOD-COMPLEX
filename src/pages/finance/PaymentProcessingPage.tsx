import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Plus, CreditCard, Smartphone } from 'lucide-react'

interface PaymentMethod {
  id: string
  name: string
  type: 'bank' | 'mobile_wallet'
  logo_url: string
}

interface Customer {
  id: string
  name: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  reference_number: string | null
  status: string
  customers?: { name: string }
  payment_methods?: { name: string; type: string; logo_url: string }
}

const PaymentProcessingPage = () => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [customerId, setCustomerId] = useState('')
  const [methodId, setMethodId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*, customers(name), payment_methods(name, type, logo_url)')
      .order('payment_date', { ascending: false })
    
    const { data: methodsData } = await supabase.from('payment_methods').select('*').eq('is_active', true)
    const { data: customersData } = await supabase.from('customers').select('id, name').eq('status', 'active')

    if (paymentsData) setPayments(paymentsData)
    if (methodsData) setMethods(methodsData)
    if (customersData) setCustomers(customersData)
    setLoading(false)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('payments').insert({
      customer_id: customerId,
      payment_method_id: methodId,
      amount: parseFloat(amount),
      payment_date: date,
      reference_number: reference || null,
      status: 'completed'
    })

    if (error) {
      alert('Error recording payment: ' + error.message)
    } else {
      alert('Payment recorded successfully!')
      setIsModalOpen(false)
      setAmount('')
      setReference('')
      fetchData()
    }
  }

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amt)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Processing</h1>
          <p className="text-sm text-gray-500">Record payments via Ethiopian Banks & Mobile Wallets</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </button>
      </div>

      {/* Recent Payments List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No payments recorded yet</div>
          ) : (
            payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Bank/Wallet Logo */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                    {payment.payment_methods?.logo_url ? (
                      <img src={payment.payment_methods.logo_url} alt={payment.payment_methods.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      payment.payment_methods?.type === 'mobile_wallet' ? <Smartphone className="w-6 h-6 text-gray-500" /> : <CreditCard className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{payment.customers?.name || 'Unknown Customer'}</p>
                    <p className="text-xs text-gray-500">
                      {payment.payment_methods?.name} • {payment.payment_date}
                      {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{formatCurrency(Number(payment.amount))}</p>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">{payment.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4">Record New Payment</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Customer</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Payment Method (Bank/Wallet)</label>
                <select value={methodId} onChange={(e) => setMethodId(e.target.value)} required className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select method...</option>
                  {methods.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.type === 'mobile_wallet' ? '📱' : '🏦'} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Amount (ETB)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Transaction Reference (Optional)</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., TXN123456" className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentProcessingPage

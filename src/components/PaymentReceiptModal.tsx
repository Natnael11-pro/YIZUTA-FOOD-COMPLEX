import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface Customer {
  name: string
  company: string | null
  email: string | null
  phone: string | null
}

interface OrderData {
  id: string
  order_number: string
  customer_id: string
  total_amount: number
  customers: Customer | null
}

interface PaymentReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onPaymentRecorded: () => void
}

const PaymentReceiptModal = ({ isOpen, onClose, orderId, onPaymentRecorded }: PaymentReceiptModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [orderData, setOrderData] = useState<OrderData | null>(null)

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return
    
    const { data } = await supabase
      .from('sales_orders')
      .select(`*, customers (name, company, email, phone)`)
      .eq('id', orderId)
      .single()
    
    if (data) {
      setOrderData(data)
      setAmountPaid(data.total_amount.toString())
    }
  }, [orderId])

  // ✅ FIX: Added eslint-disable comment to ignore the specific warning for this line
  useEffect(() => {
    if (isOpen && orderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOrderDetails()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId])

  const printReceipt = (receiptNumber: string) => {
    if (!orderData) return

    const currentDate = new Date().toLocaleDateString()
    const currentTime = new Date().toLocaleTimeString()

    // ✅ FIX: Updated CSS to be more compact so it fits on 1 page
    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Payment Receipt - ${receiptNumber}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm; /* Reduced margin */
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt; /* Reduced base font size */
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .receipt-container {
              max-width: 100%;
              margin: 0 auto;
              padding: 10mm; /* Reduced padding */
              border: 2px solid #000;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header h1 {
              font-size: 20pt; /* Reduced from 24pt */
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .header p { font-size: 10pt; margin: 2px 0; }
            
            .receipt-title {
              text-align: center;
              font-size: 16pt; /* Reduced from 18pt */
              font-weight: bold;
              margin: 10px 0;
              text-decoration: underline;
            }
            
            .info-section { margin: 10px 0; }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0; /* Reduced spacing */
              padding: 2px 0;
              border-bottom: 1px dotted #ccc;
            }
            .info-label { font-weight: bold; width: 40%; font-size: 10pt; }
            .info-value { width: 60%; text-align: right; font-size: 10pt; }
            
            .customer-section {
              background: #f9f9f9;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #ddd;
            }
            .customer-section h3 { font-size: 12pt; margin-bottom: 5px; border-bottom: 1px solid #000; }
            
            .payment-details { margin: 15px 0; }
            .payment-details h3 { font-size: 12pt; margin-bottom: 10px; border-bottom: 1px solid #000; }
            
            .amount-box {
              border: 2px solid #000;
              padding: 10px;
              margin: 10px 0;
              text-align: center;
              background: #fff;
            }
            .amount-label { font-size: 10pt; margin-bottom: 2px; }
            .amount-value { font-size: 20pt; font-weight: bold; color: #000; } /* Reduced from 24pt */
            
            .footer {
              margin-top: 20px; /* Reduced from 40px */
              border-top: 2px solid #000;
              padding-top: 10px;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 20px; /* Reduced from 30px */
            }
            .signature-box {
              width: 45%;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 20px; /* Reduced from 40px */
            }
            .signature-box p { font-size: 9pt; margin: 2px 0; }
            
            .notes-section {
              margin: 10px 0;
              padding: 10px;
              border: 1px dashed #000;
            }
            .notes-section h4 { font-size: 11pt; margin-bottom: 5px; }
            .notes-section p { font-size: 10pt; font-style: italic; }
            
            .thank-you {
              text-align: center;
              margin-top: 15px;
              font-size: 12pt;
              font-weight: bold;
            }
            .disclaimer {
              text-align: center;
              margin-top: 10px;
              font-size: 8pt;
              font-style: italic;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1>YIZUTA Food Complex</h1>
              <p>Dire Dawa, Ethiopia</p>
            </div>

            <div class="receipt-title">PAYMENT RECEIPT</div>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Receipt Number:</span>
                <span class="info-value">${receiptNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${currentDate} ${currentTime}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Number:</span>
                <span class="info-value">${orderData.order_number || orderId}</span>
              </div>
            </div>

            <div class="customer-section">
              <h3>CUSTOMER DETAILS</h3>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${orderData.customers?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Company:</span>
                <span class="info-value">${orderData.customers?.company || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${orderData.customers?.phone || 'N/A'}</span>
              </div>
            </div>

            <div class="payment-details">
              <h3>PAYMENT INFORMATION</h3>
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">${paymentMethod}</span>
              </div>
              
              <div class="amount-box">
                <div class="amount-label">AMOUNT PAID</div>
                <div class="amount-value">ETB ${parseFloat(amountPaid).toFixed(2)}</div>
              </div>
            </div>

            ${notes ? `
            <div class="notes-section">
              <h4>NOTES:</h4>
              <p>${notes}</p>
            </div>
            ` : ''}

            <div class="footer">
              <div class="signature-section">
                <div class="signature-box">
                  <p><strong>Cashier Signature</strong></p>
                  <p>_________________________</p>
                  <p>Date: ${currentDate}</p>
                </div>
                <div class="signature-box">
                  <p><strong>Customer Signature</strong></p>
                  <p>_________________________</p>
                  <p>Date: ${currentDate}</p>
                </div>
              </div>

              <div class="thank-you">Thank you for your business!</div>
              <p class="disclaimer">This is a computer-generated receipt.</p>
            </div>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 5px; margin-right: 10px;">
              Print Receipt
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #6b7280; color: white; border: none; border-radius: 5px;">
              Close
            </button>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
    } else {
      alert('Please allow popups to print the receipt')
    }
  }

  const handleRecordPayment = async () => {
    if (!amountPaid || !orderData) {
      alert('Please enter payment amount')
      return
    }

    setLoading(true)
    try {
      const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderId,
        customer_id: orderData.customer_id,
        payment_method: paymentMethod,
        amount_paid: parseFloat(amountPaid),
        receipt_number: receiptNumber,
        notes: notes || null
      })
      if (paymentError) throw paymentError

      const { error: orderError } = await supabase
        .from('sales_orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId)
      if (orderError) throw orderError

      printReceipt(receiptNumber)

      alert('Payment recorded successfully! Receipt will print automatically.')
      onPaymentRecorded()
      onClose()
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {orderData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600"><span className="font-medium">Customer:</span> {orderData.customers?.name}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Order Total:</span> ETB {orderData.total_amount}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Check">Check</option>
              <option value="Mobile Payment">Mobile Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (ETB)</label>
            <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Payment reference, check number, etc." />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleRecordPayment} disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Recording...' : 'Record & Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentReceiptModal
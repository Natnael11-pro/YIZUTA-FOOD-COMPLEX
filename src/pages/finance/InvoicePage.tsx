import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Download, Send, Trash2, Edit2 } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  company: string | null
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string | null
  items: InvoiceItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  issue_date: string
  due_date: string
  status: string
  notes: string | null
}

const InvoicePage = () => {
  const { userRole } = useAuth()
  const canModifyInvoices = userRole === 'finance'

  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([{
    id: '1', description: '', quantity: 1, unit_price: 0, total: 0
  }])
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Define fetchData outside useEffect so it can be called from other functions
  const fetchData = async () => {
    const { data: customersData } = await supabase.from('customers').select('*').order('name')
    const { data: invoicesData } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    
    if (customersData) setCustomers(customersData)
    if (invoicesData) setInvoices(invoicesData)
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      if (isMounted) {
        await fetchData()
      }
    }

    loadData()
    
    return () => {
      isMounted = false
    }
  }, [])

  const calculateItemTotal = (quantity: number, unitPrice: number): number => quantity * unitPrice

  const calculateInvoiceTotal = () => {
    const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0)
    const taxAmount = (subtotal * taxRate) / 100
    return { subtotal, taxAmount, total: subtotal + taxAmount }
  }

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total = calculateItemTotal(
            field === 'quantity' ? Number(value) : item.quantity,
            field === 'unit_price' ? Number(value) : item.unit_price
          )
        }
        return updatedItem
      }
      return item
    }))
  }

  const resetForm = () => {
    setSelectedCustomer('')
    setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }])
    setTaxRate(0)
    setNotes('')
    setDueDate('')
    setEditingInvoiceId(null)
    setIsEditing(false)
  }

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || items.length === 0) {
      alert('Please select a customer and add items')
      return
    }

    const customer = customers.find(c => c.id === selectedCustomer)
    if (!customer) return

    const { subtotal, taxAmount, total } = calculateInvoiceTotal()
    const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}`

    const { error } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer,
      customer_name: customer.name,
      customer_email: customer.email,
      items: items.map(({ description, quantity, unit_price, total: itemTotal }) => ({
        description, quantity, unit_price, total: itemTotal
      })),
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, total_amount: total,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate, status: 'draft', notes: notes || null
    })

    if (error) alert('Error creating invoice: ' + error.message)
    else {
      alert('Invoice created successfully!')
      setIsCreating(false)
      resetForm()
      fetchData()
    }
  }

  const handleEditInvoice = (invoice: Invoice) => {
    const customer = customers.find(c => c.name === invoice.customer_name)
    if (customer) setSelectedCustomer(customer.id)
    
    setItems(invoice.items.map((item, index) => ({
      id: index.toString(), description: item.description, quantity: item.quantity, unit_price: item.unit_price, total: item.total
    })))
    setTaxRate(invoice.tax_rate)
    setNotes(invoice.notes || '')
    setDueDate(invoice.due_date)
    setEditingInvoiceId(invoice.id)
    setIsEditing(true)
    setIsCreating(true)
  }

  const handleSaveEdit = async () => {
    if (!editingInvoiceId) return
    const customer = customers.find(c => c.id === selectedCustomer)
    if (!customer) return

    const { subtotal, taxAmount, total } = calculateInvoiceTotal()
    const { error } = await supabase.from('invoices').update({
      customer_id: selectedCustomer, customer_name: customer.name, customer_email: customer.email,
      items: items.map(({ description, quantity, unit_price, total: itemTotal }) => ({ description, quantity, unit_price, total: itemTotal })),
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, total_amount: total, due_date: dueDate, notes: notes || null
    }).eq('id', editingInvoiceId)

    if (error) alert('Error updating invoice: ' + error.message)
    else {
      alert('Invoice updated successfully!')
      setIsCreating(false)
      resetForm()
      fetchData()
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) alert('Error deleting invoice: ' + error.message)
    else {
      setDeleteConfirmId(null)
      fetchData()
    }
  }

  const handleChangeStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', id)
    if (!error) fetchData()
  }

  // ✅ NEW: Download Invoice Function
  const downloadInvoice = (invoice: Invoice) => {
    // Create CSV content
    const csvContent = [
      ['INVOICE', invoice.invoice_number],
      ['Issue Date', invoice.issue_date],
      ['Customer', invoice.customer_name],
      ['Email', invoice.customer_email || 'N/A'],
      ['', ''],
      ['Items'],
      ['Description', 'Quantity', 'Unit Price', 'Total'],
      ...invoice.items.map(item => [
        item.description,
        item.quantity,
        item.unit_price,
        item.total
      ]),
      ['', '', '', ''],
      ['Subtotal', '', '', invoice.subtotal],
      ['Tax', '', '', invoice.tax_amount],
      ['TOTAL', '', '', invoice.total_amount]
    ].map(row => row.join(',')).join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Invoice_${invoice.invoice_number}_${invoice.issue_date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <button 
            onClick={() => { setIsCreating(false); resetForm() }} 
            aria-label="Cancel and return to invoice list"
            className="text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            {/* ✅ ACCESSIBILITY: Added htmlFor and id for proper label association */}
            <label htmlFor="customer-select" className="block mb-1.5 text-sm font-medium text-gray-700">Customer</label>
            <select 
              id="customer-select"
              value={selectedCustomer} 
              onChange={(e) => setSelectedCustomer(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              aria-required="true"
            >
              <option value="">Select a customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items</h3>
              <button 
                onClick={handleAddItem} 
                aria-label="Add new item to invoice"
                className="flex items-center px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Add Item
              </button>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <label htmlFor={`desc-${item.id}`} className="block mb-1 text-sm text-gray-700">Description</label>
                  <input 
                    type="text" 
                    id={`desc-${item.id}`}
                    value={item.description} 
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg" 
                    placeholder="Product or service" 
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor={`qty-${item.id}`} className="block mb-1 text-sm text-gray-700">Quantity</label>
                  <input 
                    type="number" 
                    id={`qty-${item.id}`}
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} 
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor={`price-${item.id}`} className="block mb-1 text-sm text-gray-700">Unit Price (ETB)</label>
                  <input 
                    type="number" 
                    id={`price-${item.id}`}
                    value={item.unit_price} 
                    onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value))} 
                    className="w-full px-3 py-2 border rounded-lg" 
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor={`total-${item.id}`} className="block mb-1 text-sm text-gray-700">Total</label>
                  <p id={`total-${item.id}`} className="px-3 py-2 font-medium">{formatCurrency(item.total)}</p>
                </div>
                <div className="col-span-1">
                  <button 
                    onClick={() => handleRemoveItem(item.id)} 
                    aria-label={`Remove item ${item.description || 'from list'}`}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tax-rate" className="block mb-1.5 text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <input 
                type="number" 
                id="tax-rate"
                value={taxRate} 
                onChange={(e) => setTaxRate(parseFloat(e.target.value))} 
                className="w-full px-4 py-2.5 border rounded-lg" 
              />
            </div>
            <div>
              <label htmlFor="due-date" className="block mb-1.5 text-sm font-medium text-gray-700">Due Date</label>
              <input 
                type="date" 
                id="due-date"
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="w-full px-4 py-2.5 border rounded-lg" 
              />
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="block mb-1.5 text-sm font-medium text-gray-700">Notes</label>
            <textarea 
              id="notes"
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
              className="w-full px-4 py-2.5 border rounded-lg" 
              placeholder="Additional notes..." 
            />
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="text-right space-y-2">
                <p className="text-sm">Subtotal: {formatCurrency(calculateInvoiceTotal().subtotal)}</p>
                <p className="text-sm">Tax ({taxRate}%): {formatCurrency(calculateInvoiceTotal().taxAmount)}</p>
                <p className="text-xl font-bold">Total: {formatCurrency(calculateInvoiceTotal().total)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => { setIsCreating(false); resetForm() }} 
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            {isEditing ? (
              <button 
                onClick={handleSaveEdit} 
                aria-label="Save invoice changes"
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
            ) : (
              <button 
                onClick={handleCreateInvoice} 
                aria-label="Create new invoice"
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Create Invoice
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">Generate and manage invoices</p>
        </div>
        {canModifyInvoices && (
          <button 
            onClick={() => setIsCreating(true)} 
            aria-label="Create new invoice"
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Create Invoice
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* ✅ ACCESSIBILITY: Added scope="col" to all table headers */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">No invoices yet</td></tr>
            ) : (
              invoices.map((inv: Invoice) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{inv.customer_name}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{inv.due_date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(inv.status)}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {canModifyInvoices ? (
                        <>
                          {inv.status === 'draft' && (
                            <button 
                              onClick={() => handleChangeStatus(inv.id, 'sent')} 
                              aria-label={`Send invoice ${inv.invoice_number} to customer`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                              title="Send to customer"
                            >
                              <Send className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                          {inv.status === 'sent' && (
                            <button 
                              onClick={() => handleChangeStatus(inv.id, 'paid')} 
                              aria-label={`Mark invoice ${inv.invoice_number} as paid`}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" 
                              title="Mark as paid"
                            >
                              <span className="text-xs font-bold">Paid</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditInvoice(inv)} 
                            aria-label={`Edit invoice ${inv.invoice_number}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                            title="Edit invoice"
                          >
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button 
                            onClick={() => downloadInvoice(inv)}
                            aria-label={`Download invoice ${inv.invoice_number}`}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" 
                            title="Download invoice"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {deleteConfirmId === inv.id ? (
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => handleDeleteInvoice(inv.id)} 
                                aria-label="Confirm deletion"
                                className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)} 
                                aria-label="Cancel deletion"
                                className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteConfirmId(inv.id)} 
                              aria-label={`Delete invoice ${inv.invoice_number}`}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                              title="Delete invoice"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">View Only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InvoicePage
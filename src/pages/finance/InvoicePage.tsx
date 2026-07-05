import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Download, Send, Trash2, Edit2, X } from 'lucide-react'

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

  const fetchData = async () => {
    const { data: customersData } = await supabase.from('customers').select('*').order('name')
    const { data: invoicesData } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    
    if (customersData) setCustomers(customersData)
    if (invoicesData) setInvoices(invoicesData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice

  const calculateInvoiceTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
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
          <button onClick={() => { setIsCreating(false); resetForm() }} className="text-gray-600 hover:text-gray-900">Cancel</button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Customer</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
              <option value="">Select a customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items</h3>
              <button onClick={handleAddItem} className="flex items-center px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </button>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <label className="block mb-1 text-sm text-gray-700">Description</label>
                  <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Product or service" />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-sm text-gray-700">Quantity</label>
                  <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-sm text-gray-700">Unit Price (ETB)</label>
                  <input type="number" value={item.unit_price} onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-sm text-gray-700">Total</label>
                  <p className="px-3 py-2 font-medium">{formatCurrency(item.total)}</p>
                </div>
                <div className="col-span-1">
                  <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))} className="w-full px-4 py-2.5 border rounded-lg" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2.5 border rounded-lg" placeholder="Additional notes..." />
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
            <button onClick={() => { setIsCreating(false); resetForm() }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
            {isEditing ? (
              <button onClick={handleSaveEdit} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Save Changes</button>
            ) : (
              <button onClick={handleCreateInvoice} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Invoice</button>
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
          <button onClick={() => setIsCreating(true)} className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">No invoices yet</td></tr>
            ) : (
              invoices.map((inv) => (
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
                            <button onClick={() => handleChangeStatus(inv.id, 'sent')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Send to customer">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {inv.status === 'sent' && (
                            <button onClick={() => handleChangeStatus(inv.id, 'paid')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" title="Mark as paid">
                              <span className="text-xs font-bold">Paid</span>
                            </button>
                          )}
                          <button onClick={() => handleEditInvoice(inv)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit invoice">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Download invoice">
                            <Download className="w-4 h-4" />
                          </button>
                          {deleteConfirmId === inv.id ? (
                            <div className="flex items-center space-x-1">
                              <button onClick={() => handleDeleteInvoice(inv.id)} className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700">Confirm</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(inv.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete invoice">
                              <Trash2 className="w-4 h-4" />
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

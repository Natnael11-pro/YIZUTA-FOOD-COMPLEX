import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Plus, Download, Send, Trash2 } from 'lucide-react'

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
  total_amount: number
  status: string
  created_at: string
}

const InvoicePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([]) // ✅ FIX: Removed 'any' type
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([{
    id: '1',
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0
  }])
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')

  // ✅ FIX 1: Declare fetchData BEFORE useEffect
  const fetchData = async () => {
    const { data: customersData } = await supabase.from('customers').select('*').order('name')
    const { data: invoicesData } = await supabase.from('invoices').select('*, customers(name)').order('created_at', { ascending: false })
    
    if (customersData) setCustomers(customersData)
    if (invoicesData) setInvoices(invoicesData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice
  }

  const calculateInvoiceTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = (subtotal * taxRate) / 100
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    }
  }

  const handleAddItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    }])
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const updated = items.map(item => {
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
    })
    setItems(updated)
  }

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || items.length === 0) {
      alert('Please select a customer and add items')
      return
    }

    const customer = customers.find(c => c.id === selectedCustomer)
    if (!customer) return

    const { subtotal, taxAmount, total } = calculateInvoiceTotal()

    // ✅ FIX 2: Generate invoice number BEFORE the insert (not during render)
    const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}`

    const { error } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer,
      customer_name: customer.name,
      customer_email: customer.email,
      items: items.map(({ description, quantity, unit_price, total }) => ({
        description,
        quantity,
        unit_price,
        total
      })),
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: total,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      status: 'draft',
      notes: notes || null
    })

    if (error) {
      alert('Error creating invoice: ' + error.message)
    } else {
      alert('Invoice created successfully!')
      setIsCreating(false)
      resetForm()
      fetchData()
    }
  }

  const resetForm = () => {
    setSelectedCustomer('')
    setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }])
    setTaxRate(0)
    setNotes('')
    setDueDate('')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
          <button onClick={() => setIsCreating(false)} className="text-gray-600 hover:text-gray-900">Cancel</button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Customer</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
              <option value="">Select a customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
              ))}
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
                  <label className="block mb-1 text-sm text-gray-700">Unit Price</label>
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
            <div className="flex justify-end space-x-4">
              <div className="text-right space-y-2">
                <p className="text-sm">Subtotal: {formatCurrency(calculateInvoiceTotal().subtotal)}</p>
                <p className="text-sm">Tax ({taxRate}%): {formatCurrency(calculateInvoiceTotal().taxAmount)}</p>
                <p className="text-xl font-bold">Total: {formatCurrency(calculateInvoiceTotal().total)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleCreateInvoice} className="px-4 py-2 text-white bg-blue-600 rounded-lg">Create Invoice</button>
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
        <button onClick={() => setIsCreating(true)} className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg">
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center">No invoices yet</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-6 py-4 font-medium">{inv.invoice_number}</td>
                  <td className="px-6 py-4">{inv.customer_name}</td>
                  <td className="px-6 py-4">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs rounded-full ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 mr-3"><Download className="w-4 h-4" /></button>
                    <button className="text-green-600 hover:text-green-800"><Send className="w-4 h-4" /></button>
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

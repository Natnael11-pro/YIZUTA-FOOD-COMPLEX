/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Package, Truck, ArrowUpRight, AlertTriangle, Plus, Edit2, CheckCircle, XCircle } from 'lucide-react'
import AddInventoryModal from '../../components/AddInventoryModal'
import EditInventoryModal from '../../components/EditInventoryModal'
import AddShipmentModal from '../../components/AddShipmentModal'

interface InventoryItem {
  id: string
  item_name: string
  sku: string
  quantity: number
  reorder_level: number
  unit: string
  category: string | null
  status: string
  created_at: string
}

interface Shipment {
  id: string
  item_id: string
  type: 'inbound' | 'outbound'
  quantity: number
  supplier: string | null
  client: string | null
  notes: string | null
  created_at: string
  inventory?: { item_name: string }
}

interface MaterialRequest {
  id: string
  requested_by_name: string
  material_name: string
  quantity: number
  unit: string
  urgency: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface TransferRequest {
  id: string
  batch_id: string
  product_name: string
  quantity: number
  unit: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  reviewed_at?: string
  rejection_reason?: string
}

const WarehousePage = () => {
  const { userRole } = useAuth()
  
  // Only Storekeeper can edit. Admin and Executive Manager are View-Only.
  const canModifyWarehouse = userRole === 'storekeeper'

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [pendingRequests, setPendingRequests] = useState<MaterialRequest[]>([])
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([])
  const [reqLoading, setReqLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers'>('inventory')
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('material_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }, [])

  const fetchTransferRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransferRequests(data || [])
    } catch (error) {
      console.error('Error fetching transfer requests:', error)
    }
  }, [])

  const handleRequestAction = async (id: string, action: 'approved' | 'rejected') => {
    setReqLoading(true)
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({ status: action })
        .eq('id', id)

      if (error) throw error
      
      await fetchPendingRequests()
      alert(`Request ${action} successfully!`)
    } catch (error) {
      console.error('Error updating request:', error)
    } finally {
      setReqLoading(false)
    }
  }

  // ✅ Accept transfer request - add to inventory
  const handleAcceptTransfer = async (requestId: string, request: TransferRequest) => {
    if (!confirm(`Accept ${request.quantity} ${request.unit} of ${request.product_name} into warehouse?`)) {
      return
    }

    try {
      // Check if item already exists in inventory
      const existingItem = inventory.find(
        item => item.item_name.toLowerCase() === request.product_name.toLowerCase()
      )

      if (existingItem) {
        // Update existing inventory
        const newQuantity = existingItem.quantity + request.quantity
        const { error } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id)

        if (error) throw error
      } else {
        // Create new inventory entry
        const { error } = await supabase
          .from('inventory')
          .insert({
            item_name: request.product_name,
            sku: `FG-${request.batch_id.slice(0, 8).toUpperCase()}`,
            category: 'finished_good',
            quantity: request.quantity,
            unit: request.unit,
            reorder_level: 10,
            status: 'in_stock'
          })

        if (error) throw error
      }

      // Update transfer request status
      const { error: updateError } = await supabase
        .from('transfer_requests')
        .update({
          status: 'accepted',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      alert('Transfer accepted! Inventory updated.')
      await fetchData()
      await fetchTransferRequests()
    } catch (error) {
      console.error('Error accepting transfer:', error)
      alert('Failed to accept transfer')
    }
  }

  // ✅ Reject transfer request
  const handleRejectTransfer = async (requestId: string) => {
    const reason = prompt('Enter rejection reason (e.g., Warehouse full, No space):')
    if (!reason) return

    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: reason
        })
        .eq('id', requestId)

      if (error) throw error

      alert('Transfer rejected.')
      await fetchTransferRequests()
    } catch (error) {
      console.error('Error rejecting transfer:', error)
      alert('Failed to reject transfer')
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false })

      if (inventoryError) throw inventoryError
      setInventory(inventoryData || [])

      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*, inventory:item_id(item_name)')
        .order('created_at', { ascending: false })
        .limit(10)

      if (shipmentsError) throw shipmentsError
      setShipments(shipmentsData || [])

      // Fetch requests for the notification center
      await fetchPendingRequests()
      await fetchTransferRequests()

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchPendingRequests, fetchTransferRequests])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalItems = inventory.length
  const itemsReceived = shipments.filter((s: Shipment) => s.type === 'inbound').length
  const itemsShipped = shipments.filter((s: Shipment) => s.type === 'outbound').length
  const lowStockItems = inventory.filter((item: InventoryItem) => item.quantity <= item.reorder_level).length

  const getStatusBadge = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Critical</span>
    } else if (item.quantity <= item.reorder_level) {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Low Stock</span>
    }
    return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">In Stock</span>
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItemId(item.id)
    setIsEditModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Warehouse</h1>
        <p className="mt-1 text-sm text-gray-500">Inventory management and shipment tracking</p>
      </div>

      {/* --- STOREKEEPER NOTIFICATION CENTER --- */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6" role="region" aria-label="Pending material requests">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
            🔔 Pending Material Requests
            <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
              {pendingRequests.length}
            </span>
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="text-sm text-yellow-700 italic">No pending requests from Production.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-lg border border-yellow-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{req.material_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.urgency === 'high' ? 'bg-red-100 text-red-700' : 
                      req.urgency === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {req.urgency.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Requested by: <span className="font-medium">{req.requested_by_name}</span> • 
                    Quantity: <span className="font-medium">{req.quantity} {req.unit}</span>
                  </p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  {canModifyWarehouse ? (
                    <>
                      <button 
                        onClick={() => handleRequestAction(req.id, 'rejected')}
                        disabled={reqLoading}
                        aria-label={`Reject material request for ${req.material_name}`}
                        className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleRequestAction(req.id, 'approved')}
                        disabled={reqLoading}
                        aria-label={`Approve and dispatch material request for ${req.material_name}`}
                        className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Approve & Dispatch
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg border border-gray-200">
                      View Only (Executive/Admin Access)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* --- END NOTIFICATION CENTER --- */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Package className="w-10 h-10 text-blue-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Truck className="w-10 h-10 text-green-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Items Received</p>
          <p className="text-2xl font-bold text-gray-900">{itemsReceived}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <ArrowUpRight className="w-10 h-10 text-orange-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Items Shipped</p>
          <p className="text-2xl font-bold text-gray-900">{itemsShipped}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-10 h-10 text-red-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
        </div>
      </div>

      {/* ✅ ACCESSIBILITY: Added role="alert" for screen readers to announce low stock immediately */}
      {lowStockItems > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" aria-hidden="true" />
            <p className="text-sm font-medium text-red-800">
              {lowStockItems} item(s) are below reorder level. Please restock soon.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'inventory'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Inventory Overview
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'transfers'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Transfers {transferRequests.length > 0 && `(${transferRequests.length})`}
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Inventory Overview</h2>
              {canModifyWarehouse && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsShipmentModalOpen(true)}
                    aria-label="Record new shipment"
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                  >
                    <Truck className="w-4 h-4 mr-1" aria-hidden="true" />
                    Shipment
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    aria-label="Add new inventory item"
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                    Add Item
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {/* ✅ ACCESSIBILITY: Added scope="col" to all table headers */}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canModifyWarehouse && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={canModifyWarehouse ? 5 : 4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : inventory.length === 0 ? (
                    <tr><td colSpan={canModifyWarehouse ? 5 : 4} className="px-6 py-8 text-center text-gray-500">No inventory items yet</td></tr>
                  ) : (
                    inventory.slice(0, 5).map((item: InventoryItem) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{item.quantity} {item.unit}</p>
                          <p className="text-xs text-gray-500">Reorder: {item.reorder_level} {item.unit}</p>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(item)}</td>
                        {canModifyWarehouse && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleEdit(item)} 
                              aria-label={`Edit inventory item ${item.item_name}`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <Edit2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Shipments</h2>
            </div>

            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : shipments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No shipments yet</div>
              ) : (
                shipments.slice(0, 5).map((shipment: Shipment) => (
                  <div key={shipment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        {shipment.type === 'inbound' ? (
                          <Truck className="w-5 h-5 text-green-600 mr-3 mt-0.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-blue-600 mr-3 mt-0.5" aria-hidden="true" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {shipment.type === 'inbound' ? 'Inbound' : 'Outbound'} - {shipment.inventory?.item_name || 'Unknown Item'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {shipment.type === 'inbound' ? `From: ${shipment.supplier || 'N/A'}` : `To: ${shipment.client || 'N/A'}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(shipment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        shipment.type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {shipment.quantity} units
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Requests Tab */}
      {activeTab === 'transfers' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Production Transfers</h2>
            <p className="text-sm text-gray-500 mt-1">Review and accept/reject finished goods from production</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : transferRequests.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No pending transfer requests</td></tr>
                ) : (
                  transferRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.quantity} {request.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {canModifyWarehouse && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptTransfer(request.id, request)}
                              className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectTransfer(request.id)}
                              className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                            >
                              <XCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddInventoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onItemAdded={fetchData}
      />
      <EditInventoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onItemUpdated={fetchData}
        itemId={editingItemId}
      />
      <AddShipmentModal
        isOpen={isShipmentModalOpen}
        onClose={() => setIsShipmentModalOpen(false)}
        onShipmentAdded={fetchData}
      />
    </div>
  )
}

export default WarehousePage

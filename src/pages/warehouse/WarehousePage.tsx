/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Package, Truck, ArrowUpRight, AlertTriangle, Plus, Edit2 } from 'lucide-react'
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
  inventory?: {
    item_name: string
  }
}

const WarehousePage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const fetchData = async () => {
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
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalItems = inventory.length
  const itemsReceived = shipments.filter(s => s.type === 'inbound').length
  const itemsShipped = shipments.filter(s => s.type === 'outbound').length
  const lowStockItems = inventory.filter(item => item.quantity <= item.reorder_level).length

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Package className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Truck className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-sm text-gray-500">Items Received</p>
          <p className="text-2xl font-bold text-gray-900">{itemsReceived}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <ArrowUpRight className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-sm text-gray-500">Items Shipped</p>
          <p className="text-2xl font-bold text-gray-900">{itemsShipped}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
        </div>
      </div>

      {lowStockItems > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <p className="text-sm font-medium text-red-800">
              {lowStockItems} item(s) are below reorder level. Please restock soon.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Overview</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsShipmentModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              >
                <Truck className="w-4 h-4 mr-1" />
                Shipment
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No inventory items yet</td>
                  </tr>
                ) : (
                  inventory.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{item.quantity} {item.unit}</p>
                        <p className="text-xs text-gray-500">Reorder: {item.reorder_level} {item.unit}</p>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item)}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
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
              shipments.slice(0, 5).map((shipment) => (
                <div key={shipment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      {shipment.type === 'inbound' ? (
                        <Truck className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
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

      {/* Modals */}
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

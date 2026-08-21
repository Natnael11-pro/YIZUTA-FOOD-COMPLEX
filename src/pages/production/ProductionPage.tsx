/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../context/AuthContext'
import { Activity, CheckCircle, TrendingUp, Zap, Package, Plus, Send, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import AddBatchModal from '../../components/AddBatchModal'
import AddProductionLineModal from '../../components/AddProductionLineModal'
import RequestMaterialModal from '../../components/RequestMaterialModal'

interface ProductionLine {
  id: string
  name: string
  product_type: string
  status: 'running' | 'maintenance' | 'stopped'
  efficiency: number
  target_output: number
  current_output: number
  created_at: string
}

interface Batch {
  id: string
  batch_id: string
  product: string
  line_id: string | null
  quantity: number
  status: 'in_progress' | 'quality_check' | 'completed'
  quality_status: 'pass' | 'fail' | 'pending'
  disposition?: 'rework' | 'scrap' | 'downgrade' | null
  created_at: string
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

const ProductionPage = () => {
  const { userRole } = useAuth()
  const canModifyProduction = userRole === 'production_manager'

  const [lines, setLines] = useState<ProductionLine[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isLineModalOpen, setIsLineModalOpen] = useState(false)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Production Lines
      const { data: linesData, error: linesError } = await supabase
        .from('production_lines')
        .select('*')
        .order('created_at', { ascending: false })

      if (linesError) throw linesError
      setLines(linesData || [])

      // 2. Fetch Batches
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (batchesError) throw batchesError
      setBatches(batchesData || [])

      // 3. Fetch Material Requests
      const { data: requestData, error: requestError } = await supabase
        .from('material_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (requestError) console.error('Requests error:', requestError)
      setRequests(requestData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ✅ UPDATED: Create transfer request instead of auto-adding to warehouse
  const handleQualityCheck = async (batchId: string, qualityStatus: 'pass' | 'fail') => {
    if (!confirm(`Mark this batch as ${qualityStatus.toUpperCase()}?`)) {
      return
    }

    try {
      // Get batch details first
      const { data: batchData } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (!batchData) throw new Error('Batch not found')

      // Update batch status
      const { error: batchError } = await supabase
        .from('batches')
        .update({ 
          status: 'completed',
          quality_status: qualityStatus
        })
        .eq('id', batchId)

      if (batchError) throw batchError

      // ✅ If quality passed, create transfer request to warehouse
      if (qualityStatus === 'pass' && batchData.quantity > 0) {
        const { error: transferError } = await supabase
          .from('transfer_requests')
          .insert({
            batch_id: batchId,
            product_name: batchData.product,
            quantity: batchData.quantity,
            unit: 'boxes',
            status: 'pending'
          })

        if (transferError) throw transferError

        alert(`Batch marked as ${qualityStatus.toUpperCase()}! Transfer request created for warehouse.`)
      } else {
        alert(`Batch marked as ${qualityStatus.toUpperCase()}!`)
      }

      await fetchData()
    } catch (error) {
      console.error('Error updating quality:', error)
      alert('Failed to update quality status')
    }
  }

  // Handle sending reworked batch to quality check
  const handleSendToQualityCheck = async (batchId: string) => {
    if (!confirm('Send this batch for quality check?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('batches')
        .update({ 
          status: 'quality_check',
          quality_status: 'pending'
        })
        .eq('id', batchId)

      if (error) throw error

      await fetchData()
      alert('Batch sent to quality check!')
    } catch (error) {
      console.error('Error sending to quality check:', error)
      alert('Failed to send to quality check')
    }
  }

  // Handle Batch Disposition
  const handleBatchDisposition = async (batchId: string, disposition: 'rework' | 'scrap' | 'downgrade') => {
    if (!confirm(`Are you sure you want to mark this batch as ${disposition.toUpperCase()}?`)) {
      return
    }

    try {
      const dispositionValue: string = disposition
      let statusValue: string = ''
      let qualityStatusValue: string = ''

      if (disposition === 'rework') {
        statusValue = 'in_progress'
        qualityStatusValue = 'pending'
      } else if (disposition === 'scrap') {
        statusValue = 'completed'
        qualityStatusValue = 'fail'
      } else if (disposition === 'downgrade') {
        statusValue = 'completed'
        qualityStatusValue = 'pass'
      }

      const { error } = await supabase
        .from('batches')
        .update({ 
          disposition: dispositionValue,
          status: statusValue,
          quality_status: qualityStatusValue
        })
        .eq('id', batchId)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      await fetchData()
      alert(`Batch marked as ${disposition.toUpperCase()} successfully!`)
    } catch (error) {
      console.error('Error updating batch disposition:', error)
      alert('Failed to update batch disposition')
    }
  }

  const unitsToday = batches.reduce((sum, b) => sum + b.quantity, 0)
  const completedBatches = batches.filter(b => b.status === 'completed' && b.quality_status === 'pass').length
  const failedBatches = batches.filter(b => b.status === 'completed' && b.quality_status === 'fail').length
  const totalBatches = batches.length
  const qualityPassRate = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0
  const defectRate = totalBatches > 0 ? Math.round((failedBatches / totalBatches) * 100) : 0
  const avgEfficiency = lines.length > 0 && lines.filter(l => l.status === 'running').length > 0
    ? Math.round(lines.filter(l => l.status === 'running').reduce((sum, l) => sum + l.efficiency, 0) / lines.filter(l => l.status === 'running').length)
    : 0
  const linesActive = lines.filter(l => l.status === 'running').length

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-green-100 text-green-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      stopped: 'bg-red-100 text-red-700',
      in_progress: 'bg-blue-100 text-blue-700',
      quality_check: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getQualityBadge = (status: string) => {
    const colors: Record<string, string> = {
      pass: 'bg-green-100 text-green-700',
      fail: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getDispositionBadge = (disposition: string | null | undefined) => {
    if (!disposition) return null
    const colors: Record<string, string> = {
      rework: 'bg-orange-100 text-orange-700',
      scrap: 'bg-red-100 text-red-700',
      downgrade: 'bg-yellow-100 text-yellow-700',
    }
    return colors[disposition] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Production</h1>
        <p className="mt-1 text-sm text-gray-500">Manufacturing operations and quality control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-10 h-10 text-blue-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Units Today</p>
          <p className="text-2xl font-bold text-gray-900">{unitsToday.toLocaleString()}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-10 h-10 text-green-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Quality Pass Rate</p>
          <p className="text-2xl font-bold text-gray-900">{qualityPassRate}%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-10 h-10 text-purple-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Avg Efficiency</p>
          <p className="text-2xl font-bold text-gray-900">{avgEfficiency}%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-10 h-10 text-orange-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">Lines Active</p>
          <p className="text-2xl font-bold text-gray-900">{linesActive}/{lines.length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Production Lines Status</h2>
          {canModifyProduction && (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsRequestModalOpen(true)}
                aria-label="Request materials for production"
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              >
                <Send className="w-4 h-4 mr-1" aria-hidden="true" />
                Request Materials
              </button>
              <button 
                onClick={() => setIsLineModalOpen(true)}
                aria-label="Add new production line"
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                Add Line
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {loading ? (
            <div className="col-span-2 p-8 text-center text-gray-500">Loading...</div>
          ) : lines.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-gray-500">No production lines yet</div>
          ) : (
            lines.map((line) => (
              <div key={line.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{line.name}</h3>
                    <p className="text-sm text-gray-500">{line.product_type}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(line.status)}`}>
                    {line.status.charAt(0).toUpperCase() + line.status.slice(1)}
                  </span>
                </div>

                {line.status === 'running' ? (
                  <>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Efficiency</span>
                        <span className="font-medium text-gray-900">{line.efficiency}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${line.efficiency}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Output vs Target</span>
                        <span className="font-medium text-gray-900">{line.current_output}/{line.target_output}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${(line.current_output / line.target_output) * 100}%` }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Line is currently {line.status}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Batches</h2>
            {canModifyProduction && (
              <button 
                onClick={() => setIsBatchModalOpen(true)}
                aria-label="Create new production batch"
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <Package className="w-4 h-4 mr-1" aria-hidden="true" />
                New Batch
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disposition</th>
                  {canModifyProduction && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={canModifyProduction ? 7 : 6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={canModifyProduction ? 7 : 6} className="px-6 py-8 text-center text-gray-500">No batches yet</td></tr>
                ) : (
                  batches.slice(0, 5).map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{batch.batch_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{batch.product}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{batch.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(batch.status)}`}>
                          {batch.status.replace('_', ' ').charAt(0).toUpperCase() + batch.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getQualityBadge(batch.quality_status)}`}>
                          {batch.quality_status.charAt(0).toUpperCase() + batch.quality_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {batch.disposition ? (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getDispositionBadge(batch.disposition)}`}>
                            {batch.disposition.charAt(0).toUpperCase() + batch.disposition.slice(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      {canModifyProduction && (
                        <td className="px-6 py-4">
                          {/* 1. Initial Quality Check (Completed but Pending Quality) */}
                          {batch.status === 'completed' && batch.quality_status === 'pending' && !batch.disposition && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleQualityCheck(batch.id, 'pass')}
                                aria-label={`Mark batch ${batch.batch_id} as passed`}
                                className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded"
                              >
                                Pass
                              </button>
                              <button
                                onClick={() => handleQualityCheck(batch.id, 'fail')}
                                aria-label={`Mark batch ${batch.batch_id} as failed`}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded"
                              >
                                Fail
                              </button>
                            </div>
                          )}

                          {/* 2. Failed Batch - Needs Disposition (Rework/Scrap/Downgrade) */}
                          {batch.status === 'completed' && batch.quality_status === 'fail' && !batch.disposition && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleBatchDisposition(batch.id, 'rework')}
                                aria-label={`Mark batch ${batch.batch_id} for rework`}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                title="Rework"
                              >
                                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handleBatchDisposition(batch.id, 'scrap')}
                                aria-label={`Mark batch ${batch.batch_id} as scrap`}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Scrap"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handleBatchDisposition(batch.id, 'downgrade')}
                                aria-label={`Mark batch ${batch.batch_id} as downgrade`}
                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Downgrade"
                              >
                                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          )}

                          {/* 3. Rework in Progress - Send to QC */}
                          {batch.disposition === 'rework' && batch.status === 'in_progress' && (
                            <button
                              onClick={() => handleSendToQualityCheck(batch.id)}
                              aria-label={`Send reworked batch ${batch.batch_id} to quality check`}
                              className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                            >
                              Send to QC
                            </button>
                          )}

                          {/* 4. Reworked Batch in Quality Check - Pass/Fail again */}
                          {batch.disposition === 'rework' && batch.status === 'quality_check' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleQualityCheck(batch.id, 'pass')}
                                aria-label={`Mark reworked batch ${batch.batch_id} as passed`}
                                className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded"
                              >
                                Pass
                              </button>
                              <button
                                onClick={() => handleQualityCheck(batch.id, 'fail')}
                                aria-label={`Mark reworked batch ${batch.batch_id} as failed`}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded"
                              >
                                Fail
                              </button>
                            </div>
                          )}

                          {/* 5. Finalized Dispositions (Scrap or Downgrade) */}
                          {(batch.disposition === 'scrap' || batch.disposition === 'downgrade') && (
                            <span className="text-xs text-gray-400">Processed</span>
                          )}
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
            <h2 className="text-lg font-semibold text-gray-900">Quality Metrics</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Pass Rate</span>
                <span className="text-lg font-bold text-green-600">{qualityPassRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-600 h-3 rounded-full" style={{ width: `${qualityPassRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Defect Rate</span>
                <span className="text-lg font-bold text-red-600">{defectRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-red-600 h-3 rounded-full" style={{ width: `${defectRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Efficiency</span>
                <span className="text-lg font-bold text-blue-600">{avgEfficiency}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${avgEfficiency}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Material Requests Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">My Material Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No recent requests</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.material_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{req.quantity} {req.unit}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        req.urgency === 'high' ? 'bg-red-100 text-red-700' : 
                        req.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onBatchAdded={fetchData}
      />
      <AddProductionLineModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
        onLineAdded={fetchData}
      />
      <RequestMaterialModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onRequestAdded={fetchData}
      />
    </div>
  )
}

export default ProductionPage

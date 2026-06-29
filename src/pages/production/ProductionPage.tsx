/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Activity, CheckCircle, TrendingUp, Zap, Package } from 'lucide-react'
import AddBatchModal from '../../components/AddBatchModal'

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
  created_at: string
}

const ProductionPage = () => {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false) // ← NEW: Modal state

  const fetchData = async () => {
    try {
      const { data: linesData, error: linesError } = await supabase
        .from('production_lines')
        .select('*')
        .order('created_at', { ascending: false })

      if (linesError) throw linesError
      setLines(linesData || [])

      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (batchesError) throw batchesError
      setBatches(batchesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const unitsToday = batches.reduce((sum, b) => sum + b.quantity, 0)
  const completedBatches = batches.filter(b => b.status === 'completed' && b.quality_status === 'pass').length
  const totalBatches = batches.length
  const qualityPassRate = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0
  const avgEfficiency = lines.length > 0 
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Production</h1>
        <p className="mt-1 text-sm text-gray-500">Manufacturing operations and quality control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-sm text-gray-500">Units Today</p>
          <p className="text-2xl font-bold text-gray-900">{unitsToday.toLocaleString()}</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-sm text-gray-500">Quality Pass Rate</p>
          <p className="text-2xl font-bold text-gray-900">{qualityPassRate}%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-sm text-gray-500">Avg Efficiency</p>
          <p className="text-2xl font-bold text-gray-900">{avgEfficiency}%</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-sm text-gray-500">Lines Active</p>
          <p className="text-2xl font-bold text-gray-900">{linesActive}/{lines.length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Production Lines Status</h2>
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
            {/* ← NEW: Opens Batch Modal */}
            <button 
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <Package className="w-4 h-4 mr-1" />
              New Batch
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No batches yet</td></tr>
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
                <span className="text-lg font-bold text-red-600">{100 - qualityPassRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-red-600 h-3 rounded-full" style={{ width: `${100 - qualityPassRate}%` }} />
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

      {/* ← NEW: Add Batch Modal at the very end */}
      <AddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onBatchAdded={fetchData}
      />
    </div>
  )
}

export default ProductionPage
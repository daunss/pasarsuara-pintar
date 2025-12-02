'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type AuditLog } from '@/lib/supabase'
import Link from 'next/link'

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<string>('ALL')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const demoUserId = '11111111-1111-1111-1111-111111111111'

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', demoUserId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return '➕'
    if (action.includes('UPDATE')) return '✏️'
    if (action.includes('DELETE')) return '🗑️'
    return '📝'
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600'
    if (action.includes('UPDATE')) return 'text-blue-600'
    if (action.includes('DELETE')) return 'text-red-600'
    return 'text-gray-600'
  }

  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map(log => log.action)))]

  const filteredLogs = filterAction === 'ALL' 
    ? logs 
    : logs.filter(log => log.action === filterAction)

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Audit Log</span>
            </div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">📜 Audit Log</h1>
          <button
            onClick={fetchLogs}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Audit Log</strong> mencatat semua aktivitas penting dalam sistem untuk keamanan dan compliance.
              Semua perubahan data tercatat dengan timestamp dan detail lengkap.
            </p>
          </CardContent>
        </Card>

        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {uniqueActions.map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filterAction === action
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {action === 'ALL' ? 'Semua' : action}
            </button>
          ))}
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat audit log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg mb-4">📜 Belum ada audit log</p>
              <p className="text-gray-400">Log aktivitas akan muncul di sini</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getActionIcon(log.action)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            {log.entity_type && (
                              <span className="text-sm text-gray-500">
                                on {log.entity_type}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(log.created_at)}
                          </div>
                        </div>
                      </div>

                      {log.entity_id && (
                        <div className="text-xs text-gray-400 mb-2">
                          Entity ID: {log.entity_id}
                        </div>
                      )}

                      {/* Expandable Details */}
                      {(log.old_data || log.new_data) && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {expandedLog === log.id ? '▼ Hide Details' : '▶ Show Details'}
                        </button>
                      )}

                      {expandedLog === log.id && (
                        <div className="mt-3 space-y-2">
                          {log.old_data && (
                            <div className="bg-red-50 p-3 rounded text-xs">
                              <div className="font-semibold text-red-700 mb-1">Old Data:</div>
                              <pre className="overflow-x-auto text-red-600">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div className="bg-green-50 p-3 rounded text-xs">
                              <div className="font-semibold text-green-700 mb-1">New Data:</div>
                              <pre className="overflow-x-auto text-green-600">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {log.ip_address && (
                      <div className="text-xs text-gray-400 ml-4">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && logs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Statistik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Log</div>
                  <div className="text-2xl font-bold">{logs.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Create Actions</div>
                  <div className="text-2xl font-bold text-green-600">
                    {logs.filter(l => l.action.includes('CREATE')).length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Update Actions</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {logs.filter(l => l.action.includes('UPDATE')).length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Delete Actions</div>
                  <div className="text-2xl font-bold text-red-600">
                    {logs.filter(l => l.action.includes('DELETE')).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

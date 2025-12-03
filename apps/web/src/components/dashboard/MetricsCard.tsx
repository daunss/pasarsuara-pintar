interface MetricsCardProps {
  title: string
  value: number
  change?: number
  icon: string
  format: 'currency' | 'number' | 'percentage'
}

export function MetricsCard({ title, value, change, icon, format }: MetricsCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString('id-ID')
    }
  }

  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-600 text-sm font-medium">{title}</span>
        <span className="text-3xl">{icon}</span>
      </div>
      
      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">
          {formatValue(value)}
        </div>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive && (
            <>
              <span className="text-green-600">↑</span>
              <span className="text-sm text-green-600 font-medium">
                +{change.toFixed(1)}%
              </span>
            </>
          )}
          {isNegative && (
            <>
              <span className="text-red-600">↓</span>
              <span className="text-sm text-red-600 font-medium">
                {change.toFixed(1)}%
              </span>
            </>
          )}
          {!isPositive && !isNegative && (
            <span className="text-sm text-gray-500">
              0% vs kemarin
            </span>
          )}
          <span className="text-sm text-gray-500 ml-1">vs kemarin</span>
        </div>
      )}
    </div>
  )
}

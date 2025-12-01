'use client'

import { Inventory } from '@/lib/supabase'

interface InventoryTableProps {
  items: Inventory[]
}

export function InventoryTable({ items }: InventoryTableProps) {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStockStatus = (qty: number | null) => {
    if (!qty || qty <= 0) return { label: 'Habis', color: 'bg-red-100 text-red-800' }
    if (qty < 10) return { label: 'Rendah', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Tersedia', color: 'bg-green-100 text-green-800' }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Belum ada produk di inventory
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-gray-600">Produk</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Stok</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Harga Jual Min</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Harga Beli Max</th>
            <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStockStatus(item.stock_qty)
            return (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <p className="font-medium">{item.product_name}</p>
                  {item.description && (
                    <p className="text-sm text-gray-500 truncate max-w-xs">{item.description}</p>
                  )}
                </td>
                <td className="text-right py-3 px-4">
                  <span className="font-semibold">{item.stock_qty || 0}</span>
                  <span className="text-gray-500 ml-1">{item.unit}</span>
                </td>
                <td className="text-right py-3 px-4">{formatCurrency(item.min_sell_price)}</td>
                <td className="text-right py-3 px-4">{formatCurrency(item.max_buy_price)}</td>
                <td className="text-center py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

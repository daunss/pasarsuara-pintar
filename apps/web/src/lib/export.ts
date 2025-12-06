/**
 * Export utilities for data export to Excel and PDF
 */

import type { Transaction, Inventory } from './supabase'

/**
 * Export transactions to CSV (can be opened in Excel)
 */
export function exportTransactionsToCSV(transactions: Transaction[], filename = 'transactions.csv') {
  // CSV headers
  const headers = [
    'Date',
    'Type',
    'Product',
    'Quantity',
    'Price per Unit',
    'Total Amount',
    'Voice Text'
  ]

  // Convert transactions to CSV rows
  const rows = transactions.map(tx => [
    tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '',
    tx.type,
    tx.product_name || '',
    tx.qty || 0,
    tx.price_per_unit || 0,
    tx.total_amount || 0,
    tx.raw_voice_text || ''
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export inventory to CSV
 */
export function exportInventoryToCSV(inventory: Inventory[], filename = 'inventory.csv') {
  // CSV headers
  const headers = [
    'Product Name',
    'Stock Quantity',
    'Unit',
    'Min Sell Price',
    'Max Buy Price',
    'Description',
    'Last Updated'
  ]

  // Convert inventory to CSV rows
  const rows = inventory.map(item => [
    item.product_name,
    item.stock_qty || 0,
    item.unit || '',
    item.min_sell_price || 0,
    item.max_buy_price || 0,
    item.description || '',
    item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : ''
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export analytics data to CSV
 */
export function exportAnalyticsToCSV(
  data: {
    salesTrend: { date: string; amount: number }[]
    productPerformance: { product: string; revenue: number; quantity: number }[]
  },
  filename = 'analytics.csv'
) {
  // Sales Trend Section
  const salesTrendHeaders = ['Date', 'Sales Amount']
  const salesTrendRows = data.salesTrend.map(item => [item.date, item.amount])

  // Product Performance Section
  const productHeaders = ['Product', 'Quantity Sold', 'Revenue', 'Avg Price']
  const productRows = data.productPerformance.map(item => [
    item.product,
    item.quantity,
    item.revenue,
    item.revenue / item.quantity
  ])

  // Combine all sections
  const csvContent = [
    '=== SALES TREND ===',
    salesTrendHeaders.join(','),
    ...salesTrendRows.map(row => row.join(',')),
    '',
    '=== PRODUCT PERFORMANCE ===',
    productHeaders.join(','),
    ...productRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export financial report to CSV
 */
export function exportFinancialReportToCSV(
  summary: {
    totalSales: number
    totalPurchases: number
    totalExpenses: number
    grossProfit: number
    netProfit: number
  },
  transactions: Transaction[],
  filename = 'financial-report.csv'
) {
  // Summary Section
  const summaryContent = [
    '=== FINANCIAL SUMMARY ===',
    'Metric,Amount',
    `Total Sales,${summary.totalSales}`,
    `Total Purchases,${summary.totalPurchases}`,
    `Total Expenses,${summary.totalExpenses}`,
    `Gross Profit,${summary.grossProfit}`,
    `Net Profit,${summary.netProfit}`,
    ''
  ]

  // Transactions by Type
  const salesTx = transactions.filter(tx => tx.type === 'SALE')
  const purchaseTx = transactions.filter(tx => tx.type === 'PURCHASE')
  const expenseTx = transactions.filter(tx => tx.type === 'EXPENSE')

  const transactionHeaders = ['Date', 'Product', 'Quantity', 'Amount']

  const salesContent = [
    '=== SALES TRANSACTIONS ===',
    transactionHeaders.join(','),
    ...salesTx.map(tx => [
      tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '',
      tx.product_name || '',
      tx.qty || 0,
      tx.total_amount || 0
    ].map(cell => `"${cell}"`).join(','))
  ]

  const purchaseContent = [
    '',
    '=== PURCHASE TRANSACTIONS ===',
    transactionHeaders.join(','),
    ...purchaseTx.map(tx => [
      tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '',
      tx.product_name || '',
      tx.qty || 0,
      tx.total_amount || 0
    ].map(cell => `"${cell}"`).join(','))
  ]

  const expenseContent = [
    '',
    '=== EXPENSE TRANSACTIONS ===',
    transactionHeaders.join(','),
    ...expenseTx.map(tx => [
      tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '',
      tx.product_name || '',
      tx.qty || 0,
      tx.total_amount || 0
    ].map(cell => `"${cell}"`).join(','))
  ]

  // Combine all sections
  const csvContent = [
    ...summaryContent,
    ...salesContent,
    ...purchaseContent,
    ...expenseContent
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Print current page as PDF
 */
export function printPageAsPDF() {
  window.print()
}

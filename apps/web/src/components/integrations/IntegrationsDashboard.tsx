'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FileSpreadsheet, Send, Sparkles, Copy, CheckCircle } from 'lucide-react'

interface SocialContent {
  platform: string
  caption: string
  hashtags: string[]
  tips: string
}

export default function IntegrationsDashboard({ userID }: { userID: string }) {
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  
  // Social Media State
  const [productName, setProductName] = useState('Beras Premium')
  const [price, setPrice] = useState('12000')
  const [promotion, setPromotion] = useState('Diskon 10%')
  const [tone, setTone] = useState('casual')
  const [platform, setPlatform] = useState('instagram')
  const [socialContent, setSocialContent] = useState<Record<string, SocialContent> | null>(null)
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null)

  // Broadcast State
  const [recipients, setRecipients] = useState('')
  const [message, setMessage] = useState('')
  const [broadcastResult, setBroadcastResult] = useState<any>(null)

  const generateSocialContent = async (bulk: boolean = false) => {
    setLoading(true)
    try {
      const endpoint = bulk ? '/api/integrations/social-content/bulk' : '/api/integrations/social-content'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: bulk ? undefined : platform,
          product_name: productName,
          price: parseInt(price),
          promotion: promotion,
          tone: tone
        })
      })
      const data = await response.json()
      setSocialContent(bulk ? data : { [platform]: data })
    } catch (error) {
      console.error('Error generating content:', error)
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPlatform(platform)
    setTimeout(() => setCopiedPlatform(null), 2000)
  }

  const exportToExcel = async () => {
    setExportLoading(true)
    try {
      const response = await fetch('/api/integrations/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userID,
          type: 'transactions'
        })
      })
      const data = await response.json()
      alert(`✅ Export berhasil! File: ${data.file_name}\nTotal: ${data.record_count} records`)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('❌ Export gagal')
    }
    setExportLoading(false)
  }

  const sendBroadcast = async () => {
    setLoading(true)
    try {
      const recipientList = recipients.split('\n').filter(r => r.trim())
      const response = await fetch('/api/integrations/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userID,
          recipients: recipientList,
          message: message
        })
      })
      const data = await response.json()
      setBroadcastResult(data)
    } catch (error) {
      console.error('Error sending broadcast:', error)
    }
    setLoading(false)
  }

  const platformIcons: Record<string, string> = {
    instagram: '📸',
    facebook: '👥',
    twitter: '🐦',
    tiktok: '🎵'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">🔗 Multi-Channel Integration</h2>
          <p className="text-muted-foreground">Export data, broadcast messages, and generate social content</p>
        </div>
      </div>

      <Tabs defaultValue="social" className="space-y-4">
        <TabsList>
          <TabsTrigger value="social">✨ Social Media</TabsTrigger>
          <TabsTrigger value="broadcast">📢 WhatsApp Broadcast</TabsTrigger>
          <TabsTrigger value="export">📊 Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Social Media Content Generator
              </CardTitle>
              <CardDescription>
                Generate engaging social media posts for all platforms instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Produk</Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Beras Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Harga (Rp)</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="12000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Promo (Optional)</Label>
                  <Input
                    value={promotion}
                    onChange={(e) => setPromotion(e.target.value)}
                    placeholder="e.g., Diskon 10%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option value="casual">Casual</option>
                    <option value="professional">Professional</option>
                    <option value="funny">Funny</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-48">
                  <option value="instagram">📸 Instagram</option>
                  <option value="facebook">👥 Facebook</option>
                  <option value="twitter">🐦 Twitter</option>
                  <option value="tiktok">🎵 TikTok</option>
                </Select>
                <Button onClick={() => generateSocialContent(false)} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Single'}
                </Button>
                <Button onClick={() => generateSocialContent(true)} disabled={loading} variant="outline">
                  {loading ? 'Generating...' : 'Generate All Platforms'}
                </Button>
              </div>

              {socialContent && (
                <div className="space-y-4 mt-6">
                  {Object.entries(socialContent).map(([plat, content]) => (
                    <Card key={plat} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="text-2xl">{platformIcons[plat]}</span>
                            {plat.charAt(0).toUpperCase() + plat.slice(1)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(content.caption, plat)}
                          >
                            {copiedPlatform === plat ? (
                              <><CheckCircle className="h-4 w-4 mr-2" /> Copied!</>
                            ) : (
                              <><Copy className="h-4 w-4 mr-2" /> Copy</>
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Caption</Label>
                          <p className="text-sm whitespace-pre-wrap mt-1">{content.caption}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Hashtags</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {content.hashtags.map((tag, i) => (
                              <Badge key={i} variant="info" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs">{content.tips}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                WhatsApp Broadcast
              </CardTitle>
              <CardDescription>
                Send messages to multiple customers at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipients (one phone number per line)</Label>
                <Textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="628123456789&#10;628987654321&#10;628111222333"
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Halo! Kami punya promo spesial untuk Anda..."
                  rows={5}
                />
              </div>
              <Button onClick={sendBroadcast} disabled={loading || !recipients || !message}>
                {loading ? 'Sending...' : 'Send Broadcast'}
              </Button>

              {broadcastResult && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">✅ Broadcast Sent!</h4>
                  <p className="text-sm">Total Sent: {broadcastResult.total_sent}</p>
                  <p className="text-sm">Total Failed: {broadcastResult.total_failed}</p>
                  <p className="text-sm">Status: {broadcastResult.status}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Export to Excel
              </CardTitle>
              <CardDescription>
                Download your data in professional Excel format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:bg-gray-50" onClick={exportToExcel}>
                  <CardContent className="pt-6 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <h4 className="font-semibold">Transactions Report</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Complete transaction history with analytics
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-gray-50 opacity-50">
                  <CardContent className="pt-6 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 text-blue-600" />
                    <h4 className="font-semibold">Inventory Report</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Stock levels and product details
                    </p>
                    <Badge variant="warning" className="mt-2">Coming Soon</Badge>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-gray-50 opacity-50">
                  <CardContent className="pt-6 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 text-purple-600" />
                    <h4 className="font-semibold">Financial Report</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      P&L, cash flow, and profitability
                    </p>
                    <Badge variant="warning" className="mt-2">Coming Soon</Badge>
                  </CardContent>
                </Card>
              </div>

              {exportLoading && (
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm">⏳ Generating Excel file...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

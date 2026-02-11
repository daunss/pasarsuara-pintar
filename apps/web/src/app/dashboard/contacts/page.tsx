'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type Contact } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

export default function ContactsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'SUPPLIER' | 'CUSTOMER'>('SUPPLIER')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetchContacts()
    }
  }, [activeTab, user])

  const fetchContacts = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', activeTab)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      router.push('/login')
      return
    }
    
    try {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          user_id: user.id,
          type: activeTab,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          city: formData.city || null,
          notes: formData.notes || null,
          is_active: true
        }])

      if (error) throw error

      // Reset form and refresh
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        notes: ''
      })
      setShowAddForm(false)
      fetchContacts()
    } catch (error) {
      console.error('Error adding contact:', error)
      alert('Gagal menambahkan kontak')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kontak ini?')) return

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Gagal menghapus kontak')
    }
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted/70">Belum ada rating</span>
    const stars = '⭐'.repeat(Math.round(rating))
    return <span>{stars} {rating.toFixed(1)}</span>
  }

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl sm:text-2xl font-bold font-display text-forest">
                🗣️ Suara Niaga
              </Link>
              <span className="text-muted/70 hidden sm:inline">|</span>
              <span className="text-muted hidden sm:inline">Kontak</span>
            </div>
            <Link href="/dashboard" className="text-sm text-terra hover:text-terra-dark transition">
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-xl sm:text-3xl font-bold font-display text-charcoal">
            {activeTab === 'SUPPLIER' ? '🏭 Supplier' : '👥 Pelanggan'}
          </h1>
          {activeTab === 'CUSTOMER' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-forest text-white px-4 sm:px-6 py-2 rounded-2xl hover:bg-forest-dark transition w-full sm:w-auto"
            >
              {showAddForm ? '✕ Batal' : '+ Tambah Pelanggan'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('SUPPLIER')
              setShowAddForm(false)
            }}
            className={`px-4 sm:px-6 py-2 rounded-2xl font-medium transition whitespace-nowrap ${
              activeTab === 'SUPPLIER'
                ? 'bg-forest text-white'
                : 'bg-white text-muted hover:bg-cream'
            }`}
          >
            🏭 Supplier
          </button>
          <button
            onClick={() => {
              setActiveTab('CUSTOMER')
              setShowAddForm(false)
            }}
            className={`px-6 py-2 rounded-2xl font-medium transition ${
              activeTab === 'CUSTOMER'
                ? 'bg-forest text-white'
                : 'bg-white text-muted hover:bg-cream'
            }`}
          >
            👥 Pelanggan
          </button>
        </div>

        {/* Add Form - Only for Customer tab */}
        {showAddForm && activeTab === 'CUSTOMER' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tambah {activeTab === 'SUPPLIER' ? 'Supplier' : 'Pelanggan'} Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nama *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="input-warm"
                      placeholder="Toko Beras Jaya"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telepon</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="input-warm"
                      placeholder="081234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-warm"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Kota</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="input-warm"
                      placeholder="Jakarta"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Alamat</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="input-warm"
                      placeholder="Jl. Pasar Minggu No. 123"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Catatan</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="input-warm"
                      rows={3}
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-forest text-white px-6 py-2 rounded-2xl hover:bg-forest-dark"
                >
                  Simpan Kontak
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto"></div>
            <p className="mt-4 text-muted">Memuat kontak...</p>
          </div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted text-lg mb-4">
                {activeTab === 'SUPPLIER' ? '🏭 Belum ada supplier' : '👥 Belum ada pelanggan'}
              </p>
              <p className="text-muted/70">
                {activeTab === 'SUPPLIER'
                  ? 'Supplier ditambahkan oleh admin melalui database'
                  : 'Klik "Tambah Pelanggan" untuk mulai menambahkan kontak'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-warm transition">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg">{contact.name}</h3>
                    {activeTab === 'CUSTOMER' && (
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {contact.phone && (
                      <p className="flex items-center gap-2">
                        <span>📱</span>
                        <a href={`tel:${contact.phone}`} className="text-terra hover:text-terra-dark transition">
                          {contact.phone}
                        </a>
                      </p>
                    )}
                    {contact.email && (
                      <p className="flex items-center gap-2">
                        <span>📧</span>
                        <a href={`mailto:${contact.email}`} className="text-terra hover:text-terra-dark transition">
                          {contact.email}
                        </a>
                      </p>
                    )}
                    {contact.city && (
                      <p className="flex items-center gap-2">
                        <span>📍</span>
                        <span className="text-muted">{contact.city}</span>
                      </p>
                    )}
                    {contact.address && (
                      <p className="flex items-start gap-2">
                        <span>🏠</span>
                        <span className="text-muted text-xs">{contact.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        {renderStars(contact.rating)}
                      </div>
                      <div className="text-muted">
                        {contact.total_transactions || 0} transaksi
                      </div>
                    </div>
                  </div>

                  {contact.notes && (
                    <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-muted">
                      💡 {contact.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

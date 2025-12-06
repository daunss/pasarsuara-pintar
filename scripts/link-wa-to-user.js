// Link WhatsApp number to existing user or create new user
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function linkWhatsAppToUser() {
  const whatsappNumber = '6285119607506' // Your WhatsApp number
  const testEmail = 'test@pasarsuara.com'
  
  try {
    // Get test user
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching users:', authError)
      return
    }
    
    const testUser = authUser.users.find(u => u.email === testEmail)
    
    if (!testUser) {
      console.error('Test user not found. Please create test user first.')
      return
    }
    
    console.log('✅ Found test user:', testUser.id)
    
    // Update user phone number in public.users table
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: testUser.id,
        email: testEmail,
        name: 'Test User',
        phone_number: `+${whatsappNumber}`,
        role: 'user'
      }, {
        onConflict: 'id'
      })
      .select()
    
    if (error) {
      console.error('Error updating user:', error)
      return
    }
    
    console.log('✅ WhatsApp number linked to user!')
    console.log('User ID:', testUser.id)
    console.log('Phone:', `+${whatsappNumber}`)
    console.log('\n📱 Now you can:')
    console.log('1. Login to web dashboard with: test@pasarsuara.com / password123')
    console.log('2. Send WhatsApp messages from:', whatsappNumber)
    console.log('3. Transactions will appear in your dashboard!')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

linkWhatsAppToUser()

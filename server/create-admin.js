import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixAdmin() {
  // Update app_metadata to include admin role
  const { data, error } = await supabase.auth.admin.updateUserById(
    '5a8eb8ac-f536-4295-af0e-85c8b8ffaff3',
    {
      app_metadata: { role: 'admin' },
    }
  )

  if (error) {
    console.error('Ошибка:', error.message)
  } else {
    console.log('app_metadata обновлён:', JSON.stringify(data.user.app_metadata))
  }
}

fixAdmin()

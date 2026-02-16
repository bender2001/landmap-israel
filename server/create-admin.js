import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'meir.debiyev@gmail.com',
    password: 'meirdood99',
    email_confirm: true,
    user_metadata: { role: 'admin' },
  })

  if (error) {
    console.error('Ошибка:', error.message)
  } else {
    console.log('Админ создан:', data.user.id, data.user.email)
  }
}

createAdmin()

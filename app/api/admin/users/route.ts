import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['s.hayato1418@gmail.com', 'laxmatch14@gmail.com']

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '').trim()
  if (!accessToken) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return Response.json({ error: 'Service role key not configured' }, { status: 503 })

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user: caller } } = await supabaseAnon.auth.getUser(accessToken)
  if (!caller?.email || !ADMIN_EMAILS.includes(caller.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      metadata: u.user_metadata ?? {},
    })),
  })
}

import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['s.hayato1418@gmail.com', 'laxmatch14@gmail.com']

export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '').trim()
  if (!accessToken) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user: caller } } = await supabaseAnon.auth.getUser(accessToken)
  if (!caller?.email || !ADMIN_EMAILS.includes(caller.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return Response.json({ error: 'Service role key not configured' }, { status: 503 })

  const body = await request.json() as { target?: 'all' | 'user_id'; user_id?: string; message?: string }
  if (!body.message?.trim()) return Response.json({ error: 'message required' }, { status: 400 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let rows: Array<{ user_id: string; message: string }> = []
  if (body.target === 'all') {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
    if (profileError) return Response.json({ error: profileError.message }, { status: 500 })
    rows = (profiles ?? []).map((profile) => ({ user_id: profile.user_id, message: body.message!.trim() }))
  } else if (body.user_id) {
    rows = [{ user_id: body.user_id, message: body.message!.trim() }]
  } else {
    return Response.json({ error: 'target or user_id required' }, { status: 400 })
  }

  if (rows.length === 0) return Response.json({ ok: true, count: 0 })

  const { error } = await supabaseAdmin.from('notifications').insert(rows)
  if (error) {
    if (error.message.includes('notifications') || error.message.includes('relation')) {
      return Response.json({ error: 'Notifications table is not available yet. Run the migration first.' }, { status: 501 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true, count: rows.length })
}

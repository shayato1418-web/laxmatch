import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['s.hayato1418@gmail.com', 'laxmatch14@gmail.com']

function getAccessToken(request: Request) {
  const authHeader = request.headers.get('Authorization')
  return authHeader?.replace('Bearer ', '').trim() ?? ''
}

async function ensureAdmin(request: Request) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }), caller: null as null }
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user: caller } } = await supabaseAnon.auth.getUser(accessToken)
  if (!caller?.email || !ADMIN_EMAILS.includes(caller.email)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }), caller: null as null }
  }

  return { error: null, caller }
}

export async function GET(request: Request): Promise<Response> {
  const { error, caller } = await ensureAdmin(request)
  if (error) return error
  if (!caller) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return Response.json({ error: 'Service role key not configured' }, { status: 503 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, university_name, region, level, gender, line_id, notes, is_public, created_at')
    .order('created_at', { ascending: false })

  if (profileError) return Response.json({ error: profileError.message }, { status: 500 })
  return Response.json({ profiles: data ?? [] })
}

export async function PATCH(request: Request): Promise<Response> {
  const { error, caller } = await ensureAdmin(request)
  if (error) return error
  if (!caller) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return Response.json({ error: 'Service role key not configured' }, { status: 503 })

  const body = await request.json() as { user_id?: string; is_suspended?: boolean }
  if (!body.user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ is_suspended: body.is_suspended })
    .eq('user_id', body.user_id)

  if (updateError) {
    if (updateError.message.includes('is_suspended') || updateError.message.includes('column')) {
      return Response.json({ error: 'Suspension column is not available yet. Run the migration first.' }, { status: 501 })
    }
    return Response.json({ error: updateError.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}

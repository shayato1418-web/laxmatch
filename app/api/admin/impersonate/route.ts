import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['s.hayato1418@gmail.com', 'laxmatch14@gmail.com']

export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '').trim()
  if (!accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  if (!serviceRoleKey) {
    return Response.json({ error: 'Service role key not configured' }, { status: 503 })
  }

  const body = await request.json() as { email?: string; user_id?: string }
  if (!body.email && !body.user_id) {
    return Response.json({ error: 'email or user_id required' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let email = body.email
  if (!email && body.user_id) {
    const { data: { user: target }, error: lookupErr } = await supabaseAdmin.auth.admin.getUserById(body.user_id)
    if (lookupErr || !target?.email) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }
    email = target.email
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: email!,
  })

  if (error || !data?.properties?.hashed_token) {
    return Response.json({ error: error?.message ?? 'Link generation failed' }, { status: 500 })
  }

  return Response.json({ token: data.properties.hashed_token })
}

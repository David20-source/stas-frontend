'use strict'
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL      = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isConfigured = !!(SUPABASE_URL && SUPABASE_SVC_KEY)

if (!isConfigured) {
  console.warn('[supabase] Not configured — running in mock/dev mode. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable the database.')
}

// Admin client — bypasses Row Level Security. NEVER expose to frontend.
const supabaseAdmin = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

// Anon client — safe for row-level-security-controlled operations
const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

module.exports = { supabaseAdmin, supabase, isConfigured }

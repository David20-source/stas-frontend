'use strict'
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { z } = require('zod')

const { supabaseAdmin, isConfigured } = require('../lib/supabase')
const { requireAuth } = require('../lib/middleware')

const JWT_SECRET = process.env.JWT_SECRET || 'stas-dev-secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h'

// ── Validation schemas ─────────────────────────────────────────────
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function _signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

// ── POST /api/auth/register ────────────────────────────────────────
async function register(req, res) {
  try {
    const body = RegisterSchema.parse(req.body)

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name, role: 'CITIZEN' },
      })
      if (error) {
        const status = error.message?.includes('already registered') ? 409 : 400
        return res.status(status).json({ error: error.message })
      }

      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: body.email,
        full_name: body.full_name,
        role: 'CITIZEN',
        phone: body.phone || null,
      })

      const token = _signToken({
        id: data.user.id,
        email: body.email,
        role: 'CITIZEN',
        full_name: body.full_name
      })

      return res.status(201).json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: data.user.id,
          email: body.email,
          role: 'CITIZEN',
          full_name: body.full_name
        },
      })
    }

    return res.status(501).json({ error: 'Supabase not configured' })
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message })
    }
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/login ───────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = LoginSchema.parse(req.body)

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
      if (error) return res.status(401).json({ error: 'Invalid email or password' })

      const meta = data.user.user_metadata || {}
      const token = _signToken({
        id: data.user.id,
        email: data.user.email,
        role: meta.role || 'CITIZEN',
        full_name: meta.full_name || ''
      })

      await supabaseAdmin.from('users').update({
        last_login: new Date().toISOString()
      }).eq('id', data.user.id)

      return res.json({
        access_token: token,
        token_type: 'bearer',
        expires_in: JWT_EXPIRES,
        refresh_token: data.session?.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: meta.role || 'CITIZEN',
          full_name: meta.full_name || ''
        },
      })
    }

    return res.status(501).json({ error: 'Supabase not configured' })
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message })
    }
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/refresh ─────────────────────────────────────────
async function refresh(req, res) {
  try {
    const { refresh_token } = z.object({ refresh_token: z.string().min(1) }).parse(req.body)

    if (!isConfigured) {
      return res.status(501).json({ error: 'Token refresh requires Supabase' })
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token })
    if (error) return res.status(401).json({ error: 'Invalid or expired refresh token' })

    const meta = data.user.user_metadata || {}
    const token = _signToken({
      id: data.user.id,
      email: data.user.email,
      role: meta.role || 'CITIZEN',
      full_name: meta.full_name || ''
    })

    res.json({
      access_token: token,
      token_type: 'bearer',
      refresh_token: data.session?.refresh_token
    })
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message })
    }
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/logout ──────────────────────────────────────────
async function logout(req, res) {
  try {
    // Verify token first
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    try {
      jwt.verify(token, JWT_SECRET)
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({ ok: true, message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/auth/me ───────────────────────────────────────────────
async function me(req, res) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }

    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, phone, is_verified, created_at, last_login')
        .eq('id', decoded.sub)
        .single()

      if (error) return res.status(404).json({ error: 'User not found' })
      return res.json(data)
    }

    res.json({
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.name
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── Route handler ──────────────────────────────────────────────────
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const path = req.url?.split('?')[0] || ''

  try {
    if (req.method === 'POST' && path === '/login') {
      return await login(req, res)
    }
    if (req.method === 'POST' && path === '/register') {
      return await register(req, res)
    }
    if (req.method === 'POST' && path === '/refresh') {
      return await refresh(req, res)
    }
    if (req.method === 'POST' && path === '/logout') {
      return await logout(req, res)
    }
    if (req.method === 'GET' && path === '/me') {
      return await me(req, res)
    }

    res.status(404).json({ error: 'Not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
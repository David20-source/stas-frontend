```js
'use strict'
const express = require('express')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const { z }   = require('zod')

const { supabaseAdmin, isConfigured } = require('../config/supabase')
const { requireAuth }                 = require('../middleware/auth.middleware')
const { devUsers, _hash }             = require('../store/devStore')

const authRouter  = express.Router()
const JWT_SECRET  = process.env.JWT_SECRET || 'stas-dev-secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h'

// ── Validation schemas ─────────────────────────────────────────────
const RegisterSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name is required'),
  phone:     z.string().optional(),
})

const LoginSchema = z.object({
  email:    z.string().email(),
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
authRouter.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body)

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email:         body.email,
        password:      body.password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name, role: 'CITIZEN' },
      })

      if (error) {
        const status = error.message?.includes('already registered') ? 409 : 400
        return res.status(status).json({ error: error.message })
      }

      // Mirror into public.users for app queries
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
        full_name: body.full_name,
      })

      return res.status(201).json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: data.user.id,
          email: body.email,
          role: 'CITIZEN',
          full_name: body.full_name,
        },
      })
    }

    // Dev-mode
    if (devUsers.find((u) => u.email === body.email))
      return res.status(409).json({ error: 'Email already registered' })

    const newUser = {
      id: crypto.randomUUID(),
      email: body.email,
      password_hash: _hash(body.password),
      full_name: body.full_name,
      role: 'CITIZEN',
    }

    devUsers.push(newUser)

    return res.status(201).json({
      access_token: _signToken(newUser),
      token_type: 'bearer',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.full_name,
      },
      _dev: 'Supabase not configured — stored in memory only',
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/login ───────────────────────────────────────────
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body)

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      })

      if (error)
        return res.status(401).json({ error: 'Invalid email or password' })

      // Fetch latest user data from public.users table
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', data.user.id)
        .single()

      const token = _signToken({
        id: data.user.id,
        email: data.user.email,
        role: dbUser?.role || 'CITIZEN',
        full_name: dbUser?.full_name || '',
      })

      // Update last_login
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id)

      return res.json({
        access_token: token,
        token_type: 'bearer',
        expires_in: JWT_EXPIRES,
        refresh_token: data.session?.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: dbUser?.role || 'CITIZEN',
          full_name: dbUser?.full_name || '',
        },
      })
    }

    // Dev-mode
    const user = devUsers.find(
      (u) => u.email === email && u.password_hash === _hash(password)
    )

    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' })

    return res.json({
      access_token: _signToken(user),
      token_type: 'bearer',
      expires_in: JWT_EXPIRES,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
      _dev:
        'Dev accounts: admin@stas.local/admin123 | officer@stas.local/officer123 | citizen@stas.local/citizen123',
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/refresh ─────────────────────────────────────────
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = z
      .object({ refresh_token: z.string().min(1) })
      .parse(req.body)

    if (!isConfigured)
      return res
        .status(501)
        .json({ error: 'Token refresh requires Supabase' })

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    })

    if (error)
      return res
        .status(401)
        .json({ error: 'Invalid or expired refresh token' })

    // Fetch latest user data from public.users table
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', data.user.id)
      .single()

    const token = _signToken({
      id: data.user.id,
      email: data.user.email,
      role: dbUser?.role || 'CITIZEN',
      full_name: dbUser?.full_name || '',
    })

    res.json({
      access_token: token,
      token_type: 'bearer',
      refresh_token: data.session?.refresh_token,
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/logout ──────────────────────────────────────────
authRouter.post('/logout', requireAuth, (_req, res) => {
  res.json({ ok: true, message: 'Logged out successfully' })
})

// ── GET /api/auth/me ───────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (isConfigured) {
      const { data } = await supabaseAdmin
        .from('users')
        .select(
          'id, email, full_name, role, phone, is_verified, created_at, last_login'
        )
        .eq('id', req.user.id)
        .single()

      if (data) return res.json(data)
    }

    res.json(req.user)
  } catch (err) {
    next(err)
  }
})

module.exports = { authRouter }
```

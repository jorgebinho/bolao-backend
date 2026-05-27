// server.js — Ponto de entrada do bolao-backend
import 'dotenv/config'

import express from 'express'
import cors from 'cors'

import { router as authRoutes } from './src/routes/auth.js'
import { router as matchesRoutes } from './src/routes/matches.js'
import { router as adminRoutes } from './src/routes/admin.js'
import { router as rankingRoutes } from './src/routes/ranking.js'

const app = express()
const PORT = process.env.PORT || 3333

app.set('trust proxy', true)

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL, // Vai ler o link da Vercel do painel do Railway
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      console.log(`⚠️ Origem bloqueada pelo CORS do servidor: ${origin}`)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
  })
)

app.options('*', cors())

// ─── MIDDLEWARES GLOBAIS ──────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'bolao-backend',
    timestamp: new Date().toISOString(),
  })
})

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/matches', matchesRoutes)
app.use('/admin', adminRoutes)
app.use('/ranking', rankingRoutes)

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` })
})

// ─── ERROR HANDLER GLOBAL ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n⚽ Bolão Backend rodando na porta ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`)
})

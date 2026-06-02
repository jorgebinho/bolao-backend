import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import { createRequire } from 'node:module'

import { router as authRoutes } from './src/routes/auth.js'
import { router as matchesRoutes } from './src/routes/matches.js'
import { router as adminRoutes } from './src/routes/admin.js'
import { router as rankingRoutes } from './src/routes/ranking.js'
import { router as groupsRoutes } from './src/routes/groups.js'
import { router as usersRoutes } from './src/routes/users.js'
import { router as championGuessRoutes } from './src/routes/championGuess.js'
import { router as roundsRoutes } from './src/routes/rounds.js'

const app = express()
const PORT = process.env.PORT || 3333
const require = createRequire(import.meta.url)
const { version } = require('./package.json')

app.set('trust proxy', true)

const allowedOrigins = [
	process.env.FRONTEND_URL,
	'http://localhost:5173',
	'http://localhost:3000',
].filter(Boolean)

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, true)
			}

			console.log(`Origem bloqueada pelo CORS do servidor: ${origin}`)
			return callback(new Error('Não permitido pelo CORS'))
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		optionsSuccessStatus: 200,
	})
)

app.options('*', cors())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		service: 'bolao-backend',
		version,
		timestamp: new Date().toISOString(),
	})
})

app.use('/auth', authRoutes)
app.use('/matches', matchesRoutes)
app.use('/admin', adminRoutes)
app.use('/ranking', rankingRoutes)
app.use('/groups', groupsRoutes)
app.use('/users', usersRoutes)
app.use('/champion-guess', championGuessRoutes)
app.use('/rounds', roundsRoutes)

app.use((req, res) => {
	res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` })
})

app.use((err, req, res, next) => {
	console.error('Erro não tratado:', err)
	res.status(500).json({ error: 'Erro interno do servidor.' })
})

app.listen(PORT, '0.0.0.0', () => {
	console.log(`\nBolão Backend rodando na porta ${PORT}`)
	console.log(`   Health: http://localhost:${PORT}/health`)
	console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`)
})

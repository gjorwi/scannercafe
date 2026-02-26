const express = require('express')
const cors = require('cors')

const workspacesRouter = require('./routes/workspaces')
const productsRouter = require('./routes/products')
const salesRouter = require('./routes/sales')
const reportsRouter = require('./routes/reports')
const settingsRouter = require('./routes/settings')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '5mb' }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/workspaces', workspacesRouter)
app.use('/api/products', productsRouter)
app.use('/api/sales', salesRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/settings', settingsRouter)

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// 404
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`ScannerCafe sync server running on http://localhost:${PORT}`)
})

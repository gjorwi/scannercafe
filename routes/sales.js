const express = require('express')
const { Sale } = require('../db')
const { requireWorkspace } = require('../middleware')

const router = express.Router()
router.use(requireWorkspace)

// GET /api/sales?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const workspace = req.workspace.syncKey
  try {
    const filter = { workspace }
    if (req.query.date) {
      filter.createdAt = { $gte: `${req.query.date}T00:00:00.000Z`, $lte: `${req.query.date}T23:59:59.999Z` }
    }
    const docs = await Sale.find(filter).sort({ createdAt: -1 }).lean()
    res.json(docs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Sale.findOne({ workspace: req.workspace.syncKey, id: req.params.id }).lean()
    if (!doc) return res.status(404).json({ error: 'Sale not found' })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/sales — skip if id already exists
router.post('/', async (req, res) => {
  const { id, items, totalUSD, totalVEF, exchangeRate, createdAt } = req.body
  if (!id || totalUSD == null) return res.status(400).json({ error: 'id and totalUSD required' })
  const workspace = req.workspace.syncKey
  try {
    const existing = await Sale.findOne({ workspace, id }).lean()
    if (existing) return res.json({ ok: true, skipped: true, reason: 'already_exists' })
    const now = new Date().toISOString()
    await Sale.create({
      id, workspace,
      items: (items || []).map((i) => ({
        productId: i.productId || null, name: i.name, qty: i.qty,
        priceUSD: parseFloat(i.priceUSD) || 0, subtotalUSD: parseFloat(i.subtotalUSD) || 0,
      })),
      totalUSD: parseFloat(totalUSD) || 0,
      totalVEF: parseFloat(totalVEF) || 0,
      exchangeRate: parseFloat(exchangeRate) || null,
      createdAt: createdAt || now,
    })
    res.status(201).json({ ok: true, skipped: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/sales/bulk — upsert many, skip if id already exists
router.post('/bulk', async (req, res) => {
  const { sales } = req.body
  if (!Array.isArray(sales)) return res.status(400).json({ error: 'sales array required' })
  const workspace = req.workspace.syncKey
  const now = new Date().toISOString()
  const results = { inserted: 0, skipped: 0, errors: [] }
  try {
    for (const s of sales) {
      if (!s.id) { results.errors.push({ id: s.id, error: 'missing id' }); continue }
      try {
        const res2 = await Sale.updateOne(
          { id: s.id, workspace },
          { $setOnInsert: {
            id: s.id, workspace,
            items: (s.items || []).map((i) => ({
              productId: i.productId || null, name: i.name, qty: i.qty,
              priceUSD: parseFloat(i.priceUSD) || 0, subtotalUSD: parseFloat(i.subtotalUSD) || 0,
            })),
            totalUSD: parseFloat(s.totalUSD) || 0,
            totalVEF: parseFloat(s.totalVEF) || 0,
            exchangeRate: parseFloat(s.exchangeRate) || null,
            createdAt: s.createdAt || now,
          }},
          { upsert: true }
        )
        if (res2.upsertedCount > 0) results.inserted++
        else results.skipped++
      } catch (e) {
        results.errors.push({ id: s.id, error: e.message })
      }
    }
    res.json({ ok: true, ...results })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/sales/all — elimina todas las ventas del workspace
router.delete('/all', async (req, res) => {
  try {
    const result = await Sale.deleteMany({ workspace: req.workspace.syncKey })
    res.json({ ok: true, deleted: result.deletedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
  try {
    await Sale.deleteOne({ workspace: req.workspace.syncKey, id: req.params.id })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router

const express = require('express')
const { Product } = require('../db')
const { requireWorkspace } = require('../middleware')

const router = express.Router()
router.use(requireWorkspace)

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const docs = await Product.find({ workspace: req.workspace.syncKey }).sort({ name: 1 }).lean()
    res.json(docs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const doc = await Product.findOne({ workspace: req.workspace.syncKey, barcode: req.params.barcode }).lean()
    if (!doc) return res.status(404).json({ error: 'Product not found' })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Product.findOne({ workspace: req.workspace.syncKey, id: req.params.id }).lean()
    if (!doc) return res.status(404).json({ error: 'Product not found' })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/products — skip if id already exists
router.post('/', async (req, res) => {
  const { id, barcode, name, category, priceUSD, stock, image, createdAt, updatedAt } = req.body
  if (!id || !name) return res.status(400).json({ error: 'id and name required' })
  const workspace = req.workspace.syncKey
  try {
    const existing = await Product.findOne({ workspace, id }).lean()
    if (existing) return res.json({ ok: true, skipped: true, reason: 'already_exists' })

    if (barcode) {
      const conflict = await Product.findOne({ workspace, barcode, id: { $ne: id } }).lean()
      if (conflict) return res.status(409).json({ error: 'barcode_conflict', conflictId: conflict.id })
    }
    const now = new Date().toISOString()
    await Product.create({ id, workspace, barcode: barcode || null, name, category: category || null,
      priceUSD: parseFloat(priceUSD) || 0, stock: parseInt(stock) || 0, image: image || null,
      createdAt: createdAt || now, updatedAt: updatedAt || now })
    res.status(201).json({ ok: true, skipped: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { barcode, name, category, priceUSD, stock, image } = req.body
  const workspace = req.workspace.syncKey
  try {
    const result = await Product.findOneAndUpdate(
      { workspace, id: req.params.id },
      { barcode: barcode || null, name, category: category || null,
        priceUSD: parseFloat(priceUSD) || 0, stock: parseInt(stock) || 0,
        image: image || null, updatedAt: new Date().toISOString() },
      { new: true }
    )
    if (!result) return res.status(404).json({ error: 'Product not found' })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    await Product.deleteOne({ workspace: req.workspace.syncKey, id: req.params.id })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/products/bulk — insert many, skip duplicates by id
router.post('/bulk', async (req, res) => {
  const { products } = req.body
  if (!Array.isArray(products)) return res.status(400).json({ error: 'products array required' })
  const workspace = req.workspace.syncKey
  const now = new Date().toISOString()
  const results = { inserted: 0, skipped: 0, errors: [] }
  try {
    for (const p of products) {
      if (!p.id || !p.name) { results.errors.push({ id: p.id, error: 'missing id or name' }); continue }
      try {
        await Product.create({ id: p.id, workspace, barcode: p.barcode || null, name: p.name,
          category: p.category || null, priceUSD: parseFloat(p.priceUSD) || 0,
          stock: parseInt(p.stock) || 0, image: p.image || null,
          createdAt: p.createdAt || now, updatedAt: p.updatedAt || now })
        results.inserted++
      } catch (e) {
        if (e.code === 11000) results.skipped++ // duplicate key
        else results.errors.push({ id: p.id, error: e.message })
      }
    }
    res.json({ ok: true, ...results })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router

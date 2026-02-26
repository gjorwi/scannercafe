const express = require('express')
const { Settings } = require('../db')
const { requireWorkspace } = require('../middleware')

const router = express.Router()
router.use(requireWorkspace)

// GET /api/settings
router.get('/', async (req, res) => {
  const workspace = req.workspace.syncKey
  try {
    const doc = await Settings.findOne({ workspace }).lean()
    if (!doc) return res.json({ businessName: req.workspace.business, taxPercent: 0, exchangeRate: '36.50' })
    res.json({ businessName: doc.businessName, taxPercent: doc.taxPercent, exchangeRate: doc.exchangeRate, updatedAt: doc.updatedAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/settings
router.put('/', async (req, res) => {
  const workspace = req.workspace.syncKey
  const { businessName, taxPercent, exchangeRate } = req.body
  try {
    await Settings.findOneAndUpdate(
      { workspace },
      { businessName: businessName || req.workspace.business,
        taxPercent: parseFloat(taxPercent) || 0,
        exchangeRate: exchangeRate || '36.50',
        updatedAt: new Date().toISOString() },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router

const express = require('express')
const { Workspace } = require('../db')
const { requireWorkspace } = require('../middleware')

const router = express.Router()

// POST /api/workspaces/register  — create or validate workspace by businessName + syncKey
router.post('/register', async (req, res) => {
  const { businessName, syncKey } = req.body
  if (!businessName || !syncKey) {
    return res.status(400).json({ error: 'businessName and syncKey are required' })
  }
  try {
    const existing = await Workspace.findOne({ syncKey })
    if (existing) {
      if (existing.business !== businessName) {
        return res.status(403).json({ error: 'syncKey already registered under a different business' })
      }
      return res.json({ ok: true, created: false, workspace: { business: existing.business, syncKey: existing.syncKey } })
    }
    const ws = await Workspace.create({ syncKey, business: businessName })
    res.status(201).json({ ok: true, created: true, workspace: { business: ws.business, syncKey: ws.syncKey } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/workspaces/info  — requires x-sync-key header
router.get('/info', requireWorkspace, (req, res) => {
  const ws = req.workspace
  res.json({ business: ws.business, syncKey: ws.syncKey, createdAt: ws.createdAt })
})

module.exports = router

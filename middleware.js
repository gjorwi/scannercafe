const { Workspace } = require('./db')

// Validate that the request carries a valid sync_key (workspace)
const requireWorkspace = async (req, res, next) => {
  const syncKey = req.headers['x-sync-key']
  if (!syncKey) return res.status(401).json({ error: 'x-sync-key header required' })
  try {
    const workspace = await Workspace.findOne({ syncKey }).lean()
    if (!workspace) return res.status(403).json({ error: 'Invalid sync key. Register workspace first.' })
    req.workspace = workspace
    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

module.exports = { requireWorkspace }

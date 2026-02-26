const express = require('express')
const { Sale } = require('../db')
const { requireWorkspace } = require('../middleware')

const router = express.Router()
router.use(requireWorkspace)

// GET /api/reports/summary?date=YYYY-MM-DD  (defaults to today)
router.get('/summary', async (req, res) => {
  const workspace = req.workspace.syncKey
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  try {
    const sales = await Sale.find({
      workspace,
      createdAt: { $gte: `${date}T00:00:00.000Z`, $lte: `${date}T23:59:59.999Z` },
    }).lean()

    const allItems = sales.flatMap((s) => s.items || [])
    const totalUSD = sales.reduce((sum, s) => sum + s.totalUSD, 0)
    const totalVEF = sales.reduce((sum, s) => sum + s.totalVEF, 0)
    const totalUnits = allItems.reduce((sum, i) => sum + i.qty, 0)
    const avgTicket = sales.length ? totalUSD / sales.length : 0

    const productMap = {}
    for (const item of allItems) {
      if (!productMap[item.name]) productMap[item.name] = { name: item.name, qty: 0, total: 0 }
      productMap[item.name].qty += item.qty
      productMap[item.name].total += item.subtotalUSD
    }
    const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10)

    res.json({
      date,
      totalSales: sales.length,
      totalUSD: parseFloat(totalUSD.toFixed(2)),
      totalVEF: parseFloat(totalVEF.toFixed(2)),
      totalUnits,
      avgTicket: parseFloat(avgTicket.toFixed(2)),
      topProducts,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/range', async (req, res) => {
  const workspace = req.workspace.syncKey
  const { from, to } = req.query
  if (!from || !to) return res.status(400).json({ error: 'from and to dates required' })
  try {
    const sales = await Sale.find({
      workspace,
      createdAt: { $gte: `${from}T00:00:00.000Z`, $lte: `${to}T23:59:59.999Z` },
    }).sort({ createdAt: -1 }).lean()

    const byDate = {}
    for (const s of sales) {
      const d = s.createdAt.slice(0, 10)
      if (!byDate[d]) byDate[d] = { date: d, count: 0, totalUSD: 0, totalVEF: 0 }
      byDate[d].count++
      byDate[d].totalUSD += s.totalUSD
      byDate[d].totalVEF += s.totalVEF
    }

    res.json({
      from,
      to,
      totalSales: sales.length,
      totalUSD: parseFloat(sales.reduce((sum, s) => sum + s.totalUSD, 0).toFixed(2)),
      byDate: Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router

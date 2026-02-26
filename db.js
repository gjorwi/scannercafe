const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is not set')
  process.exit(1)
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const WorkspaceSchema = new mongoose.Schema({
  syncKey:     { type: String, required: true, unique: true },
  business:    { type: String, required: true },
  createdAt:   { type: String, default: () => new Date().toISOString() },
})

const ProductSchema = new mongoose.Schema({
  id:          { type: String, required: true },
  workspace:   { type: String, required: true },
  barcode:     { type: String, default: null },
  name:        { type: String, required: true },
  category:    { type: String, default: null },
  priceUSD:    { type: Number, default: 0 },
  stock:       { type: Number, default: 0 },
  image:       { type: String, default: null },
  createdAt:   { type: String },
  updatedAt:   { type: String },
})
ProductSchema.index({ id: 1, workspace: 1 }, { unique: true })
ProductSchema.index({ barcode: 1, workspace: 1 })

const SaleItemSchema = new mongoose.Schema({
  productId:   { type: String, default: null },
  name:        { type: String, required: true },
  qty:         { type: Number, required: true },
  priceUSD:    { type: Number, required: true },
  subtotalUSD: { type: Number, required: true },
}, { _id: false })

const SaleSchema = new mongoose.Schema({
  id:           { type: String, required: true },
  workspace:    { type: String, required: true },
  items:        [SaleItemSchema],
  totalUSD:     { type: Number, required: true },
  totalVEF:     { type: Number, required: true },
  exchangeRate: { type: Number, default: null },
  createdAt:    { type: String },
})
SaleSchema.index({ id: 1, workspace: 1 }, { unique: true })
SaleSchema.index({ workspace: 1, createdAt: 1 })

const SettingsSchema = new mongoose.Schema({
  workspace:    { type: String, required: true, unique: true },
  businessName: { type: String },
  taxPercent:   { type: Number, default: 0 },
  exchangeRate: { type: String, default: '36.50' },
  updatedAt:    { type: String },
})

const Workspace = mongoose.model('Workspace', WorkspaceSchema)
const Product   = mongoose.model('Product', ProductSchema)
const Sale      = mongoose.model('Sale', SaleSchema)
const Settings  = mongoose.model('Settings', SettingsSchema)

mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(async () => {
    console.log('MongoDB connected')
    await Promise.all([
      Workspace.syncIndexes(),
      Product.syncIndexes(),
      Sale.syncIndexes(),
      Settings.syncIndexes(),
    ])
    console.log('Indexes synced')
  })
  .catch((err) => { console.error('MongoDB connection error:', err); process.exit(1) })

module.exports = { Workspace, Product, Sale, Settings }

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// Get current session
router.get('/', async (req, res) => {
  try {
    let session = await Session.findOne();
    if (!session) {
      session = new Session({ items: [] });
      await session.save();
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add or update item in session
router.post('/item', async (req, res) => {
  try {
    const { barcode, name, price, emoji } = req.body;
    let session = await Session.findOne();
    if (!session) session = new Session({ items: [] });

    const existing = session.items.find(i => i.barcode === barcode);
    if (existing) {
      existing.qty += 1;
    } else {
      session.items.unshift({ barcode, name, price, emoji, qty: 1 });
    }

    session.updatedAt = Date.now();
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update quantity of item
router.put('/item/:barcode', async (req, res) => {
  try {
    const { qty } = req.body;
    let session = await Session.findOne();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const item = session.items.find(i => i.barcode === req.params.barcode);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.qty = Math.max(1, qty);
    session.updatedAt = Date.now();
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove item from session
router.delete('/item/:barcode', async (req, res) => {
  try {
    let session = await Session.findOne();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.items = session.items.filter(i => i.barcode !== req.params.barcode);
    session.updatedAt = Date.now();
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear entire session
router.delete('/clear', async (req, res) => {
  try {
    let session = await Session.findOne();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.items = [];
    session.updatedAt = Date.now();
    await session.save();
    res.json({ message: 'Session cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
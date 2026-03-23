const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get product by barcode
router.get('/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new product
router.post('/', async (req, res) => {
  try {
    const { barcode, name, price, emoji } = req.body;
    const existing = await Product.findOne({ barcode });
    if (existing) return res.status(400).json({ error: 'Product already exists' });
    const product = new Product({ barcode, name, price, emoji });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:barcode', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { barcode: req.params.barcode },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/:barcode', async (req, res) => {
  try {
    await Product.findOneAndDelete({ barcode: req.params.barcode });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
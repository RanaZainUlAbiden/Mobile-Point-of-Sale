// ── DATABASE ──────────────────────────────────────────────────────────────
const DB = {

  // ── PRODUCTS ─────────────────────────────────────────────────────────────
  getProducts() {
    return JSON.parse(localStorage.getItem('hp_products') || '{}');
  },

  saveProducts(products) {
    localStorage.setItem('hp_products', JSON.stringify(products));
  },

  getProduct(barcode) {
    return this.getProducts()[barcode] || null;
  },

  addProduct(barcode, name, price, emoji, stock) {
    const products = this.getProducts();
    products[barcode] = {
      name,
      price: parseFloat(price),
      emoji: emoji || '📦',
      stock: parseInt(stock) || 0
    };
    this.saveProducts(products);
    return products[barcode];
  },

  updateProduct(barcode, name, price, emoji, stock) {
    const products = this.getProducts();
    if (!products[barcode]) return false;
    products[barcode] = {
      name,
      price: parseFloat(price),
      emoji: emoji || '📦',
      stock: parseInt(stock) || 0
    };
    this.saveProducts(products);
    return true;
  },

  restockProduct(barcode, qty) {
    const products = this.getProducts();
    if (!products[barcode]) return false;
    products[barcode].stock += parseInt(qty) || 0;
    this.saveProducts(products);
    return true;
  },

  decreaseStock(barcode, qty) {
    const products = this.getProducts();
    if (!products[barcode]) return false;
    products[barcode].stock = Math.max(0, products[barcode].stock - qty);
    this.saveProducts(products);
    return true;
  },

  deleteProduct(barcode) {
    const products = this.getProducts();
    delete products[barcode];
    this.saveProducts(products);
  },

  searchProducts(query) {
    const products = this.getProducts();
    if (!query) return products;
    const q = query.toLowerCase();
    const result = {};
    Object.entries(products).forEach(([bc, p]) => {
      if (p.name.toLowerCase().includes(q) || bc.toLowerCase().includes(q)) {
        result[bc] = p;
      }
    });
    return result;
  },

  // ── BILL ──────────────────────────────────────────────────────────────────
  getBill() {
    return JSON.parse(localStorage.getItem('hp_bill') || '[]');
  },

  saveBill(bill) {
    localStorage.setItem('hp_bill', JSON.stringify(bill));
  },

  addToBill(barcode, product) {
    const products = this.getProducts();
    const stock = products[barcode] ? products[barcode].stock : 0;
    const bill = this.getBill();
    const existing = bill.find(i => i.barcode === barcode);
    const currentQty = existing ? existing.qty : 0;

    if (currentQty >= stock) {
      return { ok: false, msg: stock === 0 ? '❌ Out of stock!' : `⚠️ Only ${stock} units available` };
    }

    if (existing) {
      existing.qty++;
    } else {
      bill.unshift({
        barcode,
        name: product.name,
        price: product.price,
        emoji: product.emoji || '📦',
        qty: 1,
        stock: stock
      });
    }
    this.saveBill(bill);
    return { ok: true, bill };
  },

  updateBillQty(barcode, qty) {
    const products = this.getProducts();
    const stock = products[barcode] ? products[barcode].stock : 999;
    const bill = this.getBill();
    const item = bill.find(i => i.barcode === barcode);
    if (!item) return { ok: false, msg: 'Item not found' };
    if (qty > stock) {
      return { ok: false, msg: `⚠️ Only ${stock} units available` };
    }
    item.qty = Math.max(1, qty);
    this.saveBill(bill);
    return { ok: true, bill };
  },

  removeFromBill(barcode) {
    const bill = this.getBill().filter(i => i.barcode !== barcode);
    this.saveBill(bill);
    return bill;
  },

  clearBill() {
    localStorage.setItem('hp_bill', '[]');
  },

  // ── SESSIONS ──────────────────────────────────────────────────────────────
  getSessions() {
    return JSON.parse(localStorage.getItem('hp_sessions') || '[]');
  },

  saveBillAsSession() {
    const bill = this.getBill();
    if (!bill || bill.length === 0) return false;

    // Decrease stock for each item
    bill.forEach(item => {
      this.decreaseStock(item.barcode, item.qty);
    });

    const sessions = this.getSessions();
    const total = bill.reduce((sum, i) => sum + i.price * i.qty, 0);
    const units = bill.reduce((sum, i) => sum + i.qty, 0);
    sessions.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      items: [...bill],
      total,
      units
    });
    localStorage.setItem('hp_sessions', JSON.stringify(sessions));
    this.clearBill();
    return true;
  },

  getTodaySessions() {
    const today = new Date().toDateString();
    return this.getSessions().filter(s => new Date(s.date).toDateString() === today);
  },

  getTodayTotal() {
    return this.getTodaySessions().reduce((sum, s) => sum + s.total, 0);
  },

  getTodayUnits() {
    return this.getTodaySessions().reduce((sum, s) => sum + s.units, 0);
  },

  clearAll() {
    localStorage.removeItem('hp_products');
    localStorage.removeItem('hp_bill');
    localStorage.removeItem('hp_sessions');
  }
};
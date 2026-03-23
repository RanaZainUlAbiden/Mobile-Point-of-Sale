// ── UI ────────────────────────────────────────────────────────────────────
const UI = {

  // ── BILL ─────────────────────────────────────────────────────────────────
  renderBill() {
    const bill = DB.getBill();
    const list = document.getElementById('bill-list');
    const countBadge = document.getElementById('bill-count');
    const totalBar = document.getElementById('total-bar');

    if (bill.length === 0) {
      list.innerHTML = `
        <div class="bill-empty">
          <div class="empty-icon">🛒</div>
          <p>Bill is empty.<br>Scan, search by name, or enter barcode.</p>
        </div>`;
      countBadge.textContent = '0 items';
      totalBar.style.display = 'none';
      document.getElementById('grand-total').textContent = 'Rs. 0';
      return;
    }

    let grandTotal = 0;
    let totalUnits = 0;

    list.innerHTML = bill.map(item => {
      const subtotal = item.price * item.qty;
      grandTotal += subtotal;
      totalUnits += item.qty;
      const stockWarning = item.stock && item.qty >= item.stock ?
        `<span style="color:#EF4444;font-size:10px;font-weight:600;margin-left:4px;">Max stock</span>` : '';
      return `
        <div class="bill-item" data-bc="${escAttr(item.barcode)}">
          <div class="bill-item-emoji">${item.emoji || '📦'}</div>
          <div class="bill-item-info">
            <div class="bill-item-name">${escHtml(item.name)}</div>
            <div class="bill-item-price">
              Rs. ${item.price.toLocaleString()} each${stockWarning}
            </div>
          </div>
          <div class="qty-control">
            <button class="qty-btn minus" onclick="changeBillQty('${escAttr(item.barcode)}', -1)">−</button>
            <div class="qty-val">${item.qty}</div>
            <button class="qty-btn plus" onclick="changeBillQty('${escAttr(item.barcode)}', 1)">+</button>
          </div>
          <div class="bill-item-subtotal">Rs. ${subtotal.toLocaleString()}</div>
          <button class="bill-item-del" onclick="removeFromBill('${escAttr(item.barcode)}')">✕</button>
        </div>`;
    }).join('');

    const itemCount = bill.length;
    countBadge.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    totalBar.style.display = 'flex';
    document.getElementById('grand-total').textContent = `Rs. ${grandTotal.toLocaleString()}`;
    document.getElementById('total-meta').textContent =
      `${itemCount} item${itemCount !== 1 ? 's' : ''} · ${totalUnits} unit${totalUnits !== 1 ? 's' : ''}`;
  },

  highlightBillItem(barcode) {
    setTimeout(() => {
      const el = document.querySelector(`.bill-item[data-bc="${CSS.escape(barcode)}"]`);
      if (el) {
        el.classList.add('highlight');
        setTimeout(() => el.classList.remove('highlight'), 800);
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  },

  // ── PRODUCTS ─────────────────────────────────────────────────────────────
  renderProducts() {
    const query = document.getElementById('product-search').value;
    const products = DB.searchProducts(query);
    const list = document.getElementById('products-list');
    const entries = Object.entries(products);

    if (entries.length === 0) {
      list.innerHTML = `
        <div class="bill-empty">
          <div class="empty-icon">📦</div>
          <p>${query ? 'No products found.' : 'No products yet.<br>Add your first product.'}</p>
        </div>`;
      return;
    }

    list.innerHTML = entries.map(([bc, p]) => {
      const stock = p.stock || 0;
      const stockColor = stock === 0 ? '#EF4444' : stock <= 5 ? '#D97706' : '#16A34A';
      const stockLabel = stock === 0 ? 'Out of stock' : `${stock} in stock`;
      return `
        <div class="product-card">
          <div class="product-emoji">${p.emoji || '📦'}</div>
          <div class="product-info">
            <div class="product-name">${escHtml(p.name)}</div>
            <div class="product-bc">${escHtml(bc)}</div>
            <div style="font-size:11px;font-weight:700;color:${stockColor};margin-top:3px;">
              ${stockLabel}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div class="product-price">Rs. ${p.price.toLocaleString()}</div>
          </div>
          <div class="product-actions">
            <button class="btn-edit" onclick="editProduct('${escAttr(bc)}')">✏️</button>
            <button class="btn-del" onclick="deleteProduct('${escAttr(bc)}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  },

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  renderDashboard() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const dateStr = now.toLocaleDateString('en-PK', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    const topbarSub = document.getElementById('topbar-sub');
    if (topbarSub) topbarSub.textContent = greeting;

    document.getElementById('dash-greeting').textContent = greeting;
    document.getElementById('dash-date').textContent = dateStr;

    const todayTotal = DB.getTodayTotal();
    const todayUnits = DB.getTodayUnits();
    document.getElementById('dash-total').textContent = `Rs. ${todayTotal.toLocaleString()}`;
    document.getElementById('dash-items').textContent = todayUnits;

    const sessions = DB.getSessions().slice(0, 5);
    const list = document.getElementById('recent-sessions-list');

    if (sessions.length === 0) {
      list.innerHTML = `
        <div class="bill-empty">
          <div class="empty-icon">📋</div>
          <p>No sessions yet.<br>Start a new sale to begin.</p>
        </div>`;
      return;
    }

    list.innerHTML = sessions.map(s => {
      const d = new Date(s.date);
      const dateLabel = d.toLocaleDateString('en-PK', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="recent-session-card">
          <div class="rsc-left">
            <div class="rsc-date">${dateLabel}</div>
            <div class="rsc-items">${s.items.length} products · ${s.units} units</div>
          </div>
          <div class="rsc-total">Rs. ${s.total.toLocaleString()}</div>
        </div>`;
    }).join('');
  },

  // ── REPORTS ───────────────────────────────────────────────────────────────
  renderReports() {
    const sessions = DB.getSessions();
    const totalRevenue = sessions.reduce((s, x) => s + x.total, 0);

    document.getElementById('report-total').textContent = `Rs. ${totalRevenue.toLocaleString()}`;
    document.getElementById('report-sessions').textContent = sessions.length;

    const list = document.getElementById('sessions-history-list');

    if (sessions.length === 0) {
      list.innerHTML = `
        <div class="bill-empty">
          <div class="empty-icon">📊</div>
          <p>No sessions yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = sessions.map(s => {
      const d = new Date(s.date);
      const dateLabel = d.toLocaleDateString('en-PK', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="session-history-card">
          <div class="shc-top">
            <div class="shc-date">${dateLabel}</div>
            <div class="shc-total">Rs. ${s.total.toLocaleString()}</div>
          </div>
          <div class="shc-meta">${s.items.length} products · ${s.units} units sold</div>
        </div>`;
    }).join('');
  }
};

// ── GLOBAL RENDER ─────────────────────────────────────────────────────────
function renderProducts() { UI.renderProducts(); }

// ── BILL ACTIONS ──────────────────────────────────────────────────────────
function changeBillQty(barcode, delta) {
  const bill = DB.getBill();
  const item = bill.find(i => i.barcode === barcode);
  if (!item) return;
  const result = DB.updateBillQty(barcode, item.qty + delta);
  if (!result.ok) { showToast(result.msg, 'error'); return; }
  UI.renderBill();
  if (typeof SCANNER !== 'undefined') SCANNER.renderScannerBill();
}

function removeFromBill(barcode) {
  DB.removeFromBill(barcode);
  UI.renderBill();
  if (typeof SCANNER !== 'undefined') SCANNER.renderScannerBill();
  showToast('Item removed', '');
}

function confirmClearBill() {
  document.getElementById('clear-bill-modal').style.display = 'flex';
}

function closeClearBillModal(e) {
  if (!e || e.target === document.getElementById('clear-bill-modal'))
    document.getElementById('clear-bill-modal').style.display = 'none';
}

function clearBill() {
  DB.clearBill();
  UI.renderBill();
  UI.renderDashboard();
  document.getElementById('clear-bill-modal').style.display = 'none';
  showToast('Bill cleared', '');
}

function saveBill() {
  const bill = DB.getBill();
  if (bill.length === 0) { showToast('Bill is empty', 'error'); return; }
  const result = DB.saveBillAsSession();
  if (result) {
    UI.renderBill();
    UI.renderDashboard();
    UI.renderReports();
    UI.renderProducts();
    showToast('✓ Bill saved!', 'success');
  }
}

// ── PRODUCT MODAL ─────────────────────────────────────────────────────────
let editingBarcode = null;

function openAddProductModal() {
  editingBarcode = null;
  document.getElementById('product-modal-title').textContent = 'Add Product';
  document.getElementById('product-modal-sub').textContent = 'Fill in the product details';
  document.getElementById('prod-barcode').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  const stockEl = document.getElementById('prod-stock');
  if (stockEl) stockEl.value = '';
  document.getElementById('prod-barcode').readOnly = false;
  document.getElementById('product-modal').style.display = 'flex';
}

function editProduct(barcode) {
  const product = DB.getProduct(barcode);
  if (!product) return;
  editingBarcode = barcode;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-modal-sub').textContent = `Editing: ${barcode}`;
  document.getElementById('prod-barcode').value = barcode;
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-price').value = product.price;
  const stockEl = document.getElementById('prod-stock');
  if (stockEl) stockEl.value = product.stock || 0;
  document.getElementById('prod-barcode').readOnly = true;
  document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal(e) {
  if (!e || e.target === document.getElementById('product-modal')) {
    document.getElementById('product-modal').style.display = 'none';
    editingBarcode = null;
  }
}

function saveProduct() {
  const barcode = document.getElementById('prod-barcode').value.trim();
  const name = document.getElementById('prod-name').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const stockEl = document.getElementById('prod-stock');
  const stock = stockEl ? (parseInt(stockEl.value) || 0) : 0;

  if (!name) { showToast('Enter a product name', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price', 'error'); return; }

  const finalBarcode = barcode ||
    'NAME-' + name.replace(/\s+/g, '-').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  if (editingBarcode) {
    DB.updateProduct(finalBarcode, name, price, '📦', stock);
    showToast('Product updated ✓', 'success');
  } else {
    if (barcode && DB.getProduct(barcode)) {
      showToast('Barcode already exists', 'error'); return;
    }
    DB.addProduct(finalBarcode, name, price, '📦', stock);
    showToast(`✓ "${name}" added`, 'success');
  }

  document.getElementById('product-modal').style.display = 'none';
  editingBarcode = null;
  UI.renderProducts();
}

function deleteProduct(barcode) {
  if (!confirm('Delete this product?')) return;
  DB.deleteProduct(barcode);
  UI.renderProducts();
  showToast('Product deleted', '');
}

// ── CLEAR ALL ─────────────────────────────────────────────────────────────
function confirmClearAll() {
  document.getElementById('clear-all-modal').style.display = 'flex';
}

function closeClearAllModal(e) {
  if (!e || e.target === document.getElementById('clear-all-modal'))
    document.getElementById('clear-all-modal').style.display = 'none';
}

function clearAllData() {
  DB.clearAll();
  UI.renderBill();
  UI.renderProducts();
  UI.renderDashboard();
  UI.renderReports();
  document.getElementById('clear-all-modal').style.display = 'none';
  showToast('All data cleared', '');
}

// ── SEARCH BY NAME IN SALE ────────────────────────────────────────────────
function searchSaleProducts() {
  const query = document.getElementById('sale-search').value.trim();
  const resultsDiv = document.getElementById('sale-search-results');

  if (!query || query.length < 1) {
    resultsDiv.style.display = 'none';
    return;
  }

  const products = DB.searchProducts(query);
  const entries = Object.entries(products);

  if (entries.length === 0) {
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <div style="padding:14px 16px;font-size:13px;color:#64748B;text-align:center;">
        No products found for "<strong>${escHtml(query)}</strong>"
      </div>`;
    return;
  }

  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = entries.slice(0, 6).map(([bc, p]) => {
    const stock = p.stock || 0;
    const stockColor = stock === 0 ? '#EF4444' : stock <= 5 ? '#D97706' : '#16A34A';
    return `
      <div onclick="addProductToSale('${escAttr(bc)}')"
        style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid #E2E8F0;"
        onmouseover="this.style.background='#F5F7FA'"
        onmouseout="this.style.background='#fff'">
        <div style="font-size:20px;">${p.emoji || '📦'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:#1E3A5F;">${escHtml(p.name)}</div>
          <div style="font-size:11px;font-weight:600;color:${stockColor};">
            ${stock === 0 ? 'Out of stock' : `${stock} in stock`}
          </div>
        </div>
        <div style="font-size:14px;font-weight:800;color:#1E3A5F;">Rs. ${p.price.toLocaleString()}</div>
      </div>`;
  }).join('');
}

function addProductToSale(barcode) {
  const product = DB.getProduct(barcode);
  if (!product) return;

  const result = DB.addToBill(barcode, product);
  if (!result.ok) { showToast(result.msg, 'error'); return; }

  UI.renderBill();
  UI.highlightBillItem(barcode);
  showToast(`✓ ${product.name}`, 'success');

  document.getElementById('sale-search').value = '';
  document.getElementById('sale-search-results').style.display = 'none';

  setTimeout(() => {
    document.getElementById('bill-list').scrollTo({ top: 0, behavior: 'smooth' });
  }, 100);
}

function manualAdd() {
  const input = document.getElementById('manual-bc-input');
  const barcode = input.value.trim();
  if (!barcode) return;
  input.value = '';

  const product = DB.getProduct(barcode);
  if (!product) { showToast('Product not found', 'error'); return; }

  const result = DB.addToBill(barcode, product);
  if (!result.ok) { showToast(result.msg, 'error'); return; }

  UI.renderBill();
  UI.highlightBillItem(barcode);
  showToast(`✓ ${product.name}`, 'success');
}

// ── TOAST ─────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 2500);
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s).replace(/'/g, "\\'");
}

document.addEventListener('click', (e) => {
  const search = document.getElementById('sale-search');
  const results = document.getElementById('sale-search-results');
  if (results && search && !search.contains(e.target) && !results.contains(e.target)) {
    results.style.display = 'none';
  }
});
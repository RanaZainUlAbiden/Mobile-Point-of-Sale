// ── SCANNER ───────────────────────────────────────────────────────────────
const SCANNER = {
  running: false,
  mode: 'sale',
  cooldown: false,
  torchOn: false,
  torchTrack: null,
  onDetected: null,

  open(mode, onDetected) {
    this.mode = mode || 'sale';
    this.onDetected = onDetected;
    this.torchOn = false;

    const overlay = document.getElementById('scanner-overlay');
    overlay.style.display = 'flex';

    const scannerBottom = document.getElementById('scanner-bottom');
    const scannerTop = document.getElementById('scanner-top');
    const billView = document.getElementById('scanner-bill-view');
    const productView = document.getElementById('scanner-product-view');

    if (mode === 'sale') {
      // Split screen — top 50% camera, bottom 50% bill
      scannerTop.style.flex = '0 0 50%';
      scannerBottom.style.display = 'flex';
      billView.style.display = 'flex';
      productView.style.display = 'none';
      this.renderScannerBill();
      document.getElementById('scanner-mode-title').textContent = 'Scan to Add';
    } else {
      // Full screen camera for product scan
      scannerTop.style.flex = '1';
      scannerBottom.style.display = 'flex';
      billView.style.display = 'none';
      productView.style.display = 'none';
      // Show white empty bottom area
      scannerBottom.style.background = '#fff';
      scannerBottom.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:12px;">
          <div style="font-size:40px;">📷</div>
          <div style="font-size:14px;font-weight:700;color:#1E3A5F;text-align:center;">Point camera at barcode</div>
          <div style="font-size:12px;color:#64748B;text-align:center;">Barcode will be captured automatically</div>
        </div>`;
      document.getElementById('scanner-mode-title').textContent = 'Scan Barcode';
    }

    document.getElementById('last-scan-bar') && (document.getElementById('last-scan-bar').style.display = 'none');
    document.getElementById('torch-btn').classList.remove('active-torch');
    this.startBarcodeScan();
  },

  close() {
    this.stopCamera();
    document.getElementById('scanner-overlay').style.display = 'none';
  },

  stopCamera() {
    if (this.running) {
      try { Quagga.stop(); } catch(e) {}
      this.running = false;
    }
    if (this.torchTrack) {
      try { this.torchTrack.stop(); } catch(e) {}
      this.torchTrack = null;
    }
    this.torchOn = false;
  },

  // ── BARCODE SCANNING ─────────────────────────────────────────────────────
  startBarcodeScan() {
    if (this.running) {
      try { Quagga.stop(); } catch(e) {}
      this.running = false;
    }

    const loadAndStart = () => {
      if (this.running) return;
      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: document.getElementById('scanner-top'),
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        decoder: {
          readers: [
            'ean_reader', 'ean_8_reader',
            'code_128_reader', 'code_39_reader',
            'upc_reader', 'upc_e_reader'
          ]
        },
        locate: true
      }, (err) => {
        if (err) {
          document.getElementById('camera-status-text').textContent = 'Scanner error';
          return;
        }
        Quagga.start();
        this.running = true;
        try {
          const video = document.querySelector('#scanner-top video');
          if (video && video.srcObject) {
            this.torchTrack = video.srcObject.getVideoTracks()[0];
          }
        } catch(e) {}
        document.getElementById('camera-status-text').textContent = '🟢 Hold barcode in frame';
      });

      Quagga.onDetected((result) => {
        const barcode = result.codeResult.code;
        if (!barcode || barcode.length < 3) return;
        if (this.cooldown) return;
        this.cooldown = true;
        setTimeout(() => { this.cooldown = false; }, 2000);

        // Flash
        const flash = document.getElementById('scan-flash');
        flash.style.opacity = '0.4';
        setTimeout(() => { flash.style.opacity = '0'; }, 150);
        if (navigator.vibrate) navigator.vibrate(100);

        if (this.onDetected) this.onDetected(barcode);
      });
    };

    if (typeof Quagga !== 'undefined') {
      loadAndStart();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
      s.onload = () => loadAndStart();
      s.onerror = () => {
        document.getElementById('camera-status-text').textContent = 'Scanner failed to load';
      };
      document.head.appendChild(s);
    }
  },

  async toggleTorch() {
    if (!this.torchTrack) { showToast('Torch not available', 'error'); return; }
    try {
      this.torchOn = !this.torchOn;
      await this.torchTrack.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      document.getElementById('torch-btn').classList.toggle('active-torch', this.torchOn);
    } catch(e) {
      showToast('Torch not supported on this device', 'error');
      this.torchOn = false;
    }
  },

  // ── RENDER BILL IN SCANNER ────────────────────────────────────────────────
  renderScannerBill() {
    const bill = DB.getBill();
    const list = document.getElementById('scanner-bill-list');
    const countEl = document.getElementById('scanner-bill-count');
    const totalEl = document.getElementById('scanner-total');
    if (!list) return;

    if (bill.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:24px;color:#64748B;font-size:13px;">Bill is empty.<br>Scan a product to add.</div>`;
      if (countEl) countEl.textContent = '0 items';
      if (totalEl) totalEl.textContent = 'Rs. 0';
      return;
    }

    let total = 0;
    list.innerHTML = bill.map(item => {
      const sub = item.price * item.qty;
      total += sub;
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#F5F7FA;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:6px;">
          <div style="font-size:18px;flex-shrink:0;">${item.emoji || '📦'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#1E3A5F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(item.name)}</div>
            <div style="font-size:11px;color:#64748B;">Rs. ${item.price.toLocaleString()} each</div>
          </div>
          <div style="display:flex;align-items:center;background:#fff;border:1.5px solid #E2E8F0;border-radius:8px;overflow:hidden;flex-shrink:0;">
            <button onclick="scannerChangQty('${escAttr(item.barcode)}', -1)"
              style="width:28px;height:28px;background:transparent;border:none;color:#EF4444;font-size:15px;font-weight:700;cursor:pointer;">−</button>
            <div style="min-width:24px;text-align:center;font-size:12px;font-weight:700;color:#1E3A5F;">${item.qty}</div>
            <button onclick="scannerChangQty('${escAttr(item.barcode)}', 1)"
              style="width:28px;height:28px;background:transparent;border:none;color:#16A34A;font-size:15px;font-weight:700;cursor:pointer;">+</button>
          </div>
          <div style="font-size:12px;font-weight:800;color:#1E3A5F;flex-shrink:0;min-width:56px;text-align:right;">Rs. ${sub.toLocaleString()}</div>
          <button onclick="scannerRemoveItem('${escAttr(item.barcode)}')"
            style="width:24px;height:24px;background:transparent;border:none;color:#94A3B8;font-size:13px;cursor:pointer;flex-shrink:0;">✕</button>
        </div>`;
    }).join('');

    if (countEl) countEl.textContent = `${bill.length} item${bill.length !== 1 ? 's' : ''}`;
    if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
  },

  showLastScan(name, price, found) {
    const bar = document.getElementById('last-scan-bar');
    if (!bar) return;
    document.getElementById('lsb-emoji').textContent = found ? '✅' : '❌';
    document.getElementById('lsb-name').textContent = name;
    document.getElementById('lsb-price').textContent = found ? `Rs. ${Number(price).toLocaleString()}` : '';
    const status = document.getElementById('lsb-status');
    status.textContent = found ? 'Added ✓' : 'Not Found';
    status.style.color = found ? '#16A34A' : '#EF4444';
    bar.style.display = 'flex';
  }
};

// ── GLOBAL FUNCTIONS ──────────────────────────────────────────────────────
function openScanner() {
  SCANNER.open('sale', (barcode) => {
    const product = DB.getProduct(barcode);
    if (product) {
      const result = DB.addToBill(barcode, product);
      if (!result.ok) {
        SCANNER.showLastScan(product.name, product.price, false);
        showToast(result.msg, 'error');
        return;
      }
      UI.renderBill();
      SCANNER.renderScannerBill();
      SCANNER.showLastScan(product.name, product.price, true);
      showToast(`✓ ${product.name}`, 'success');
    } else {
      SCANNER.showLastScan(barcode, 0, false);
      showToast('Product not found', 'error');
    }
  });
}

function openProductScanner() {
  // Hide modal
  document.getElementById('product-modal').style.display = 'none';

  SCANNER.open('product', (barcode) => {
    // Auto close and go back to modal
    SCANNER.close();
    document.getElementById('product-modal').style.display = 'flex';

    // Fill barcode
    document.getElementById('prod-barcode').value = barcode;

    // Check if product already exists and pre-fill
    const existing = DB.getProduct(barcode);
    if (existing) {
      document.getElementById('prod-name').value = existing.name;
      document.getElementById('prod-price').value = existing.price;
      const stockEl = document.getElementById('prod-stock');
      if (stockEl) stockEl.value = existing.stock || 0;
      showToast('Product found — edit if needed', 'success');
    } else {
      showToast('Barcode captured ✓', 'success');
    }
  });
}

function closeScanner() { SCANNER.close(); }
function toggleTorch() { SCANNER.toggleTorch(); }

function scannerChangQty(barcode, delta) {
  const bill = DB.getBill();
  const item = bill.find(i => i.barcode === barcode);
  if (!item) return;
  const result = DB.updateBillQty(barcode, item.qty + delta);
  if (!result.ok) { showToast(result.msg, 'error'); return; }
  UI.renderBill();
  SCANNER.renderScannerBill();
}

function scannerRemoveItem(barcode) {
  DB.removeFromBill(barcode);
  UI.renderBill();
  SCANNER.renderScannerBill();
  showToast('Item removed', '');
}

function saveSplitProduct() {
  const barcode = document.getElementById('split-barcode').value.trim();
  const name = document.getElementById('split-name').value.trim();
  const price = parseFloat(document.getElementById('split-price').value);
  const stock = parseInt(document.getElementById('split-stock').value) || 0;

  if (!name) { showToast('Enter a product name', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price', 'error'); return; }

  const finalBarcode = barcode ||
    'NAME-' + name.replace(/\s+/g, '-').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  if (barcode && DB.getProduct(barcode)) {
    showToast('Barcode already exists', 'error');
    return;
  }

  DB.addProduct(finalBarcode, name, price, '📦', stock);
  showToast(`✓ "${name}" saved`, 'success');
  SCANNER.close();
  UI.renderProducts();
  goToTab('products');
}
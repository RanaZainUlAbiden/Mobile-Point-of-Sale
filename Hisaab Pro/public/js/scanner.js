// ── SCANNER ───────────────────────────────────────────────────────────────
const SCANNER = {
  running: false,
  mode: 'sale',
  scanMode: 'barcode',
  cooldown: false,
  torchOn: false,
  torchTrack: null,
  ocrInterval: null,
  onDetected: null,

  open(mode, onDetected) {
    this.mode = mode || 'sale';
    this.onDetected = onDetected;
    this.torchOn = false;
    this.scanMode = 'barcode';

    const overlay = document.getElementById('scanner-overlay');
    overlay.style.display = 'flex';

    // Show correct bottom view
    const billView = document.getElementById('scanner-bill-view');
    const productView = document.getElementById('scanner-product-view');

    if (mode === 'sale') {
      billView.style.display = 'flex';
      productView.style.display = 'none';
      this.renderScannerBill();
    } else {
      billView.style.display = 'none';
      productView.style.display = 'flex';
      // Clear form
      document.getElementById('split-barcode').value = '';
      document.getElementById('split-name').value = '';
      document.getElementById('split-price').value = '';
      document.getElementById('split-emoji').value = '';
    }

    document.getElementById('last-scan-bar').style.display = 'none';
    document.getElementById('torch-btn').classList.remove('active-torch');
    this.updateScanModeUI('barcode');
    this.startCamera();
  },

  close() {
    this.stopCamera();
    this.stopOCR();
    document.getElementById('scanner-overlay').style.display = 'none';
    document.getElementById('last-scan-bar').style.display = 'none';
  },

  async startCamera() {
    document.getElementById('camera-status-text').textContent = 'Loading scanner…';
    this.startBarcodeScan();
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

  // ── BARCODE ───────────────────────────────────────────────────────────────
  startBarcodeScan() {
    this.stopOCR();
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
          readers: ['ean_reader','ean_8_reader','code_128_reader','code_39_reader','upc_reader','upc_e_reader']
        },
        locate: true
      }, (err) => {
        if (err) {
          document.getElementById('camera-status-text').textContent = 'Scanner error — use manual entry';
          return;
        }
        Quagga.start();
        this.running = true;
        // Grab torch track
        try {
          const video = document.querySelector('#scanner-top video');
          if (video && video.srcObject) {
            this.torchTrack = video.srcObject.getVideoTracks()[0];
          }
        } catch(e) {}
        document.getElementById('camera-status-text').textContent = '🟢 Barcode mode — hold barcode in frame';
      });

      Quagga.onDetected((result) => {
        const barcode = result.codeResult.code;
        if (!barcode || barcode.length < 3) return;
        if (this.cooldown) return;
        this.cooldown = true;
        setTimeout(() => { this.cooldown = false; }, 2000);

        const flash = document.getElementById('scan-flash');
        flash.style.opacity = '0.4';
        setTimeout(() => { flash.style.opacity = '0'; }, 150);
        if (navigator.vibrate) navigator.vibrate(100);

        if (this.onDetected) this.onDetected('barcode', barcode, null);
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

  // ── OCR ───────────────────────────────────────────────────────────────────
  startOCRScan() {
    if (this.running) {
      try { Quagga.stop(); } catch(e) {}
      this.running = false;
    }
    this.stopOCR();
    document.getElementById('camera-status-text').textContent = 'Loading OCR…';

    const startOCR = () => {
      document.getElementById('camera-status-text').textContent = '🔤 OCR mode — point at product name';

      let video = document.getElementById('ocr-video');
      if (!video) {
        video = document.createElement('video');
        video.id = 'ocr-video';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;';
        document.getElementById('scanner-top').appendChild(video);
      }

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      }).then(stream => {
        video.srcObject = stream;
        this.torchTrack = stream.getVideoTracks()[0];
        this.ocrInterval = setInterval(() => { this.runOCR(video); }, 2500);
      });
    };

    if (typeof Tesseract !== 'undefined') {
      startOCR();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = () => startOCR();
      s.onerror = () => {
        document.getElementById('camera-status-text').textContent = 'OCR not available';
        showToast('OCR not available', 'error');
      };
      document.head.appendChild(s);
    }
  },

  async runOCR(video) {
    if (this.cooldown) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      document.getElementById('camera-status-text').textContent = '🔍 Reading text…';

      const result = await Tesseract.recognize(canvas, 'eng', { logger: () => {} });
      const text = result.data.text.trim();

      if (!text || text.length < 2) {
        document.getElementById('camera-status-text').textContent = '🔤 OCR mode — point at product name';
        return;
      }

      document.getElementById('camera-status-text').textContent = `Detected: "${text.substring(0, 30)}"`;
      if (this.cooldown) return;

      // Search products by name match
      const products = DB.getProducts();
      const textLower = text.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;

      Object.entries(products).forEach(([bc, p]) => {
        const words = p.name.toLowerCase().split(' ');
        let score = 0;
        words.forEach(word => { if (word.length > 2 && textLower.includes(word)) score++; });
        if (score > bestScore) { bestScore = score; bestMatch = { barcode: bc, ...p }; }
      });

      this.cooldown = true;
      setTimeout(() => { this.cooldown = false; }, 3000);

      const flash = document.getElementById('scan-flash');
      flash.style.opacity = '0.4';
      setTimeout(() => { flash.style.opacity = '0'; }, 150);
      if (navigator.vibrate) navigator.vibrate(100);

      if (bestMatch && bestScore > 0) {
        // Found product
        if (this.onDetected) this.onDetected('ocr', bestMatch.barcode, bestMatch.name);
      } else {
        // No match — pass detected text for auto-fill
        if (this.onDetected) this.onDetected('ocr-text', null, text);
        document.getElementById('camera-status-text').textContent = '🔤 No match — text captured for form';
      }
    } catch(e) {
      document.getElementById('camera-status-text').textContent = '🔤 OCR mode — point at product name';
    }
  },

  stopOCR() {
    if (this.ocrInterval) { clearInterval(this.ocrInterval); this.ocrInterval = null; }
    const video = document.getElementById('ocr-video');
    if (video) {
      if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
      video.remove();
    }
  },

  setScanMode(mode) {
    this.scanMode = mode;
    this.updateScanModeUI(mode);
    if (mode === 'barcode') this.startBarcodeScan();
    else this.startOCRScan();
  },

  updateScanModeUI(mode) {
    const barcodeBtn = document.getElementById('btn-mode-barcode');
    const ocrBtn = document.getElementById('btn-mode-ocr');
    if (!barcodeBtn || !ocrBtn) return;
    if (mode === 'barcode') {
      barcodeBtn.style.background = '#1E3A5F';
      barcodeBtn.style.color = '#fff';
      ocrBtn.style.background = 'rgba(255,255,255,0.15)';
      ocrBtn.style.color = '#fff';
    } else {
      ocrBtn.style.background = '#2563EB';
      ocrBtn.style.color = '#fff';
      barcodeBtn.style.background = 'rgba(255,255,255,0.15)';
      barcodeBtn.style.color = '#fff';
    }
  },

  async toggleTorch() {
    if (!this.torchTrack) { showToast('Torch not available', 'error'); return; }
    try {
      this.torchOn = !this.torchOn;
      await this.torchTrack.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      document.getElementById('torch-btn').classList.toggle('active-torch', this.torchOn);
    } catch(e) {
      showToast('Torch not supported', 'error');
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
    let units = 0;

    list.innerHTML = bill.map(item => {
      const sub = item.price * item.qty;
      total += sub;
      units += item.qty;
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#F5F7FA;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:6px;">
          <div style="font-size:18px;flex-shrink:0;">${item.emoji || '📦'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#1E3A5F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(item.name)}</div>
            <div style="font-size:11px;color:#64748B;">Rs. ${item.price.toLocaleString()} each</div>
          </div>
          <div style="display:flex;align-items:center;background:#fff;border:1.5px solid #E2E8F0;border-radius:8px;overflow:hidden;flex-shrink:0;">
            <button onclick="scannerChangQty('${escAttr(item.barcode)}', -1)"
              style="width:28px;height:28px;background:transparent;border:none;color:#EF4444;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
            <div style="min-width:24px;text-align:center;font-size:12px;font-weight:700;color:#1E3A5F;">${item.qty}</div>
            <button onclick="scannerChangQty('${escAttr(item.barcode)}', 1)"
              style="width:28px;height:28px;background:transparent;border:none;color:#16A34A;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
          </div>
          <div style="font-size:12px;font-weight:800;color:#1E3A5F;flex-shrink:0;min-width:56px;text-align:right;">Rs. ${sub.toLocaleString()}</div>
          <button onclick="scannerRemoveItem('${escAttr(item.barcode)}')"
            style="width:24px;height:24px;background:transparent;border:none;color:#94A3B8;font-size:13px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>`;
    }).join('');

    if (countEl) countEl.textContent = `${bill.length} item${bill.length !== 1 ? 's' : ''}`;
    if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
  },

  showLastScan(name, price, found) {
    const bar = document.getElementById('last-scan-bar');
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
  SCANNER.open('sale', (type, barcode, detectedText) => {
    if (type === 'barcode') {
      const product = DB.getProduct(barcode);
      if (product) {
        DB.addToBill(barcode, product);
        UI.renderBill();
        SCANNER.renderScannerBill();
        SCANNER.showLastScan(product.name, product.price, true);
        showToast(`✓ ${product.name}`, 'success');
      } else {
        SCANNER.showLastScan(barcode, 0, false);
        showToast('Product not found', 'error');
      }
    } else if (type === 'ocr') {
      const product = DB.getProduct(barcode);
      if (product) {
        DB.addToBill(barcode, product);
        UI.renderBill();
        SCANNER.renderScannerBill();
        SCANNER.showLastScan(product.name, product.price, true);
        showToast(`✓ ${product.name}`, 'success');
      }
    }
  });
}

function openProductScanner() {
  SCANNER.open('product', (type, barcode, detectedText) => {
    if (type === 'barcode') {
      document.getElementById('split-barcode').value = barcode;
      showToast('Barcode captured ✓', 'success');
    } else if (type === 'ocr') {
      // Product found by OCR — auto fill all fields
      const product = DB.getProduct(barcode);
      if (product) {
        document.getElementById('split-barcode').value = barcode;
        document.getElementById('split-name').value = product.name;
        document.getElementById('split-price').value = product.price;
        showToast(`Found: ${product.name}`, 'success');
      }
    } else if (type === 'ocr-text') {
      // No product match — auto fill name field with detected text
      document.getElementById('split-name').value = detectedText || '';
      showToast('Name auto-filled from OCR', 'success');
    }
  });
}

function closeScanner() { SCANNER.close(); }
function toggleTorch() { SCANNER.toggleTorch(); }
function setScanMode(mode) { SCANNER.setScanMode(mode); }

function scannerChangQty(barcode, delta) {
  const bill = DB.getBill();
  const item = bill.find(i => i.barcode === barcode);
  if (!item) return;
  DB.updateBillQty(barcode, item.qty + delta);
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
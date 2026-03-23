// ── LICENSE SYSTEM ────────────────────────────────────────────────────────
const LICENSE = {
  SALT: 'HISAABPRO2024DI',
  DAYS: 30,
  WHATSAPP: '923324645962', // ← Change to your number
  deviceId: '',

  async init() {
    this.deviceId = await this.getDeviceId();
    document.getElementById('act-device-id').textContent = this.deviceId;
    document.getElementById('exp-device-id').textContent = this.deviceId;
    document.getElementById('settings-device-id').textContent = this.deviceId;
  },

  async getDeviceId() {
    let id = localStorage.getItem('hp_device_id');
    if (!id) {
      id = 'HP-' +
        Math.random().toString(36).substr(2, 6).toUpperCase() +
        '-' +
        Math.random().toString(36).substr(2, 6).toUpperCase();
      localStorage.setItem('hp_device_id', id);
    }
    return id;
  },

  generateCode(deviceId, dateStr) {
    const str = deviceId + this.SALT + dateStr;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    const abs = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
    return abs.substr(0, 4) + '-' + abs.substr(4, 4);
  },

  check() {
    const license = JSON.parse(localStorage.getItem('hp_license') || 'null');
    if (!license) return 'inactive';
    if (license.deviceId !== this.deviceId) return 'inactive';
    const diffDays = Math.floor((new Date() - new Date(license.startDate)) / 86400000);
    if (diffDays >= this.DAYS) return 'expired';
    return 'active';
  },

  getDaysLeft() {
    const license = JSON.parse(localStorage.getItem('hp_license') || 'null');
    if (!license) return 0;
    const diffDays = Math.floor((new Date() - new Date(license.startDate)) / 86400000);
    return Math.max(0, this.DAYS - diffDays);
  },

  activate(inputCode) {
    const code = inputCode.trim().toUpperCase();
    if (!code) return { ok: false, msg: 'Enter activation code' };

    const today = new Date();
    for (let i = 0; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (code === this.generateCode(this.deviceId, dateStr)) {
        localStorage.setItem('hp_license', JSON.stringify({
          deviceId: this.deviceId,
          startDate: dateStr
        }));
        return { ok: true };
      }
    }
    return { ok: false, msg: 'Invalid activation code' };
  },

  updateBadge() {
    const days = this.getDaysLeft();
    const badge = document.getElementById('days-badge');
    badge.textContent = `${days}d left`;
    if (days <= 5) {
      badge.classList.add('warning');
      if (days <= 5) showToast(`⚠️ Subscription expires in ${days} days`, 'warning');
    }
    const settingsDays = document.getElementById('settings-days');
    if (settingsDays) settingsDays.textContent = `${days} days`;
  }
};

function activateApp() {
  const code = document.getElementById('act-code-input').value;
  const result = LICENSE.activate(code);
  if (result.ok) {
    document.getElementById('activation-screen').style.display = 'none';
    LICENSE.updateBadge();
    APP.start();
    showToast('✓ App activated successfully!', 'success');
  } else {
    showToast(result.msg, 'error');
  }
}

function contactOnWhatsApp() {
  const msg = `Hi, I need to activate/renew my Hisaab Pro subscription.\nDevice ID: ${LICENSE.deviceId}`;
  window.open(`https://wa.me/${LICENSE.WHATSAPP}?text=${encodeURIComponent(msg)}`);
}
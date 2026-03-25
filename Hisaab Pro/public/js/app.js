// ── APP ───────────────────────────────────────────────────────────────────
const APP = {

  currentTab: 'dashboard',

  async init() {
    // Init license
    await LICENSE.init();

    const status = LICENSE.check();

    if (status === 'inactive') {
      document.getElementById('activation-screen').style.display = 'flex';
      document.getElementById('expired-screen').style.display = 'none';
document.getElementById('topbar').style.display = 'flex';
      document.getElementById('main-content').style.display = 'none';
      document.getElementById('bottom-nav').style.display = 'none';
      return;
    }

    if (status === 'expired') {
      document.getElementById('activation-screen').style.display = 'none';
      document.getElementById('expired-screen').style.display = 'flex';
document.getElementById('topbar').style.display = 'flex';
      document.getElementById('main-content').style.display = 'none';
      document.getElementById('bottom-nav').style.display = 'none';
      return;
    }

    this.start();
  },

  start() {
    document.getElementById('activation-screen').style.display = 'none';
    document.getElementById('expired-screen').style.display = 'none';
    document.getElementById('topbar').style.display = 'flex';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('bottom-nav').style.display = 'flex';
    document.getElementById('topbar').style.display = 'flex';
    LICENSE.updateBadge();
    UI.renderDashboard();
    UI.renderBill();
    UI.renderProducts();
    UI.renderReports();

    this.goToTab('dashboard');
  },

  goToTab(tab) {
    // Hide total bar if leaving sale
    if (tab !== 'sale') {
      document.getElementById('total-bar').style.display = 'none';
    }

    // Update screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${tab}`).classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${tab}`).classList.add('active');

    // Show topbar only on dashboard
// Show topbar on all tabs
document.getElementById('topbar').style.display = 'flex';
    // Refresh data per tab
    if (tab === 'dashboard') UI.renderDashboard();
    if (tab === 'sale') {
      UI.renderBill();
      const bill = DB.getBill();
      if (bill.length > 0) {
        document.getElementById('total-bar').style.display = 'flex';
      }
    }
    if (tab === 'products') UI.renderProducts();
    if (tab === 'reports') UI.renderReports();
    if (tab === 'settings') {
      document.getElementById('settings-days').textContent =
        `${LICENSE.getDaysLeft()} days`;
    }

    this.currentTab = tab;
  }
};

// ── GLOBAL TAB FUNCTION ───────────────────────────────────────────────────
function goToTab(tab) {
  APP.goToTab(tab);
}

// ── START ─────────────────────────────────────────────────────────────────
APP.init();
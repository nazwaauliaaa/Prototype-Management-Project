/**
 * BottomNav Component - Mobile Bottom Tab Bar (Dummy)
 * Renders a fixed bottom navigation bar for mobile devices only (hidden via CSS on desktop ≥768px).
 * Seluruh fungsi tombol bersifat dummy (visual active toggle saja).
 */
export class BottomNav {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.activeTab = 'dashboard';
    this.hostElement = null;

    // Sinkronkan tab aktif jika route sistem berubah ke dashboard atau calendar/jadwal
    this.eventBus.on('route:changed', ({ route }) => {
      if (route === 'dashboard') {
        this.activeTab = 'dashboard';
        this._updateActiveState();
      } else if (route === 'calendar' || route === 'jadwal-global' || route === 'kalender' || route === 'jadwal') {
        this.activeTab = 'calendar';
        this._updateActiveState();
      }
    });
  }

  /** Nav tab definitions */
  get tabs() {
    return [
      { id: 'dashboard',   icon: 'space_dashboard', label: 'Dashboard'   },
      { id: 'calendar',    icon: 'calendar_today',  label: 'Jadwal'      },
      { id: 'ruang-kerja', icon: 'workspaces',      label: 'Ruang Kerja' },
      { id: 'kanban',      icon: 'view_kanban',     label: 'Kanban'      },
      { id: 'dokumen',     icon: 'description',     label: 'Dokumen'     },
    ];
  }

  render() {
    const tabsHTML = this.tabs.map(tab => {
      const isActive = this.activeTab === tab.id;
      return `
        <button
          class="bottom-nav-btn ${isActive ? 'active' : ''}"
          data-route="${tab.id}"
          type="button"
          aria-label="${tab.label}"
          id="bottom-nav-${tab.id}"
        >
          <span class="material-symbols-outlined">${tab.icon}</span>
          <span>${tab.label}</span>
        </button>
      `;
    }).join('');

    return `
      <nav
        class="fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-border flex items-center justify-around px-2 py-1 safe-area-bottom"
        style="padding-bottom: max(8px, env(safe-area-inset-bottom));"
        id="bottom-nav-bar"
        role="navigation"
        aria-label="Navigasi utama"
      >
        ${tabsHTML}
      </nav>
    `;
  }

  renderToDOM() {
    if (!this.hostElement) return;
    this.hostElement.innerHTML = this.render();
    this._bindEvents();
  }

  mount(hostElement) {
    this.hostElement = hostElement;
    this.renderToDOM();
  }

  /** Update active class secara visual */
  _updateActiveState() {
    if (!this.hostElement) return;
    const buttons = this.hostElement.querySelectorAll('.bottom-nav-btn');
    buttons.forEach(btn => {
      const route = btn.getAttribute('data-route');
      if (route === this.activeTab || (this.activeTab === 'calendar' && (route === 'calendar' || route === 'kalender'))) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /** Event listener: Dashboard & Jadwal terhubung ke view aplikasi, tombol lainnya dummy */
  _bindEvents() {
    const buttons = this.hostElement.querySelectorAll('.bottom-nav-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        this.activeTab = route;
        this._updateActiveState();

        if (route === 'dashboard') {
          // Hubungkan tombol dashboard ke halaman dashboard aplikasi
          this.eventBus.emit('navigate', { view: 'dashboard' });
        } else if (route === 'calendar' || route === 'kalender') {
          // Hubungkan tombol jadwal ke halaman Jadwal Global
          this.eventBus.emit('navigate', { view: 'calendar' });
        } else {
          // Tombol lainnya tetap dummy
          console.log(`[BottomNav Dummy] Tombol "${route}" diklik.`);
        }
      });
    });
  }
}

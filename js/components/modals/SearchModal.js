import { BaseModal } from '../../core/BaseModal.js';

/**
 * SearchModal - Single Responsibility Principle (SRP)
 * Provides comprehensive real-time global & mobile search across:
 * - Tasks (Kanban)
 * - Legal Documents & Official SOPs
 * - Workspaces & Projects
 * - Calendar Events & Schedules
 */
export class SearchModal extends BaseModal {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    super(container, 'search');
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.documentService = container.resolve('DocumentService');
    this.calendarService = container.resolve('CalendarService');
    this.modalManager = container.resolve('ModalManager');

    this.searchQuery = '';
    this.activeCategory = 'all'; // 'all' | 'task' | 'doc' | 'workspace' | 'calendar'
    this.modalRoot = null;
  }

  /**
   * Render Search Dialog HTML
   * @param {Object} [data]
   * @returns {string}
   */
  render(data = null) {
    if (data && typeof data.query === 'string') {
      this.searchQuery = data.query;
    } else {
      this.searchQuery = '';
    }
    this.activeCategory = 'all';

    const results = this._performSearch(this.searchQuery, this.activeCategory);

    return `
      <div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col h-[88vh] md:h-auto md:max-h-[85vh] modal-content-box animate-scale-in">
        
        <!-- Top Search Input Header -->
        <div class="p-3 sm:p-4 bg-surface-container-low border-b border-surface-border flex items-center gap-2.5 shrink-0">
          <!-- Back / Close icon for mobile -->
          <button
            id="btn-back-search"
            class="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors shrink-0"
            title="Tutup Pencarian"
            type="button"
            aria-label="Kembali"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <!-- Main Input Field -->
          <div class="relative flex-1 flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-text-muted text-[20px] pointer-events-none">search</span>
            <input
              id="search-modal-input"
              type="text"
              class="w-full h-11 pl-10 pr-9 bg-surface-container-lowest rounded-xl font-body-default text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 border border-surface-border transition-all shadow-xs"
              placeholder="Cari tugas, SOP, izin Dishub, jadwal..."
              value="${this._escapeHtml(this.searchQuery)}"
              autocomplete="off"
              autofocus
            />
            <button
              id="btn-clear-search-input"
              class="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors ${this.searchQuery ? '' : 'hidden'}"
              title="Hapus pencarian"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <!-- Desktop Close Button -->
          <button
            id="btn-close-search-modal"
            class="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors shrink-0"
            title="Tutup (Esc)"
            type="button"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Filter Category Tabs (Scrollable on mobile) -->
        <div class="px-3 sm:px-4 py-2 border-b border-surface-border bg-surface-container-lowest/80 flex items-center gap-1.5 overflow-x-auto shrink-0" style="scrollbar-width:none;-ms-overflow-style:none;">
          <button
            class="search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${this.activeCategory === 'all' ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container-low text-text-secondary hover:text-text-primary hover:bg-surface-container'}"
            data-category="all"
            type="button"
          >
            Semua
          </button>
          <button
            class="search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${this.activeCategory === 'task' ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container-low text-text-secondary hover:text-text-primary hover:bg-surface-container'}"
            data-category="task"
            type="button"
          >
            Tugas
          </button>
          <button
            class="search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${this.activeCategory === 'doc' ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container-low text-text-secondary hover:text-text-primary hover:bg-surface-container'}"
            data-category="doc"
            type="button"
          >
            Dokumen & SOP
          </button>
          <button
            class="search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${this.activeCategory === 'workspace' ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container-low text-text-secondary hover:text-text-primary hover:bg-surface-container'}"
            data-category="workspace"
            type="button"
          >
            Ruang Kerja
          </button>
          <button
            class="search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${this.activeCategory === 'calendar' ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container-low text-text-secondary hover:text-text-primary hover:bg-surface-container'}"
            data-category="calendar"
            type="button"
          >
            Jadwal
          </button>
        </div>

        <!-- Search Content Area -->
        <div id="search-modal-results" class="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-surface-border/50">
          ${this._renderResultsContent(results)}
        </div>

        <!-- Mobile Search Footer Bar -->
        <div class="px-4 py-2 bg-surface-container-low border-t border-surface-border flex items-center justify-between text-[11px] text-text-muted shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[14px]">bolt</span>
            <span>Pencarian Cepat Mobile Creative Office</span>
          </div>
          <span class="hidden sm:inline">Tekan <kbd class="px-1 py-0.5 rounded bg-surface-container-lowest border border-surface-border text-[10px]">ESC</kbd> untuk menutup</span>
        </div>

      </div>
    `;
  }

  /**
   * Bind event listeners
   * @param {HTMLElement} modalRoot
   */
  bindEvents(modalRoot) {
    this.modalRoot = modalRoot;

    const input = modalRoot.querySelector('#search-modal-input');
    const clearBtn = modalRoot.querySelector('#btn-clear-search-input');
    const backBtn = modalRoot.querySelector('#btn-back-search');
    const closeBtn = modalRoot.querySelector('#btn-close-search-modal');

    // Auto focus input
    if (input) {
      setTimeout(() => {
        input.focus();
        if (this.searchQuery) {
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 50);

      // Realtime search on typing
      input.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        if (clearBtn) {
          if (this.searchQuery) {
            clearBtn.classList.remove('hidden');
          } else {
            clearBtn.classList.add('hidden');
          }
        }
        this._updateResultsList();
      });
    }

    // Clear input
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
        }
        this.searchQuery = '';
        clearBtn.classList.add('hidden');
        this._updateResultsList();
      });
    }

    // Close buttons
    const handleClose = () => this.modalManager.close(this.modalId);
    if (backBtn) backBtn.addEventListener('click', handleClose);
    if (closeBtn) closeBtn.addEventListener('click', handleClose);

    // Filter chip clicks
    const chips = modalRoot.querySelectorAll('.search-filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-category');
        this.activeCategory = cat;

        chips.forEach(c => {
          if (c.getAttribute('data-category') === cat) {
            c.className = 'search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 bg-primary-container text-on-primary shadow-xs';
          } else {
            c.className = 'search-filter-chip px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 bg-surface-container-low text-text-secondary hover:text-text-primary hover:bg-surface-container';
          }
        });

        this._updateResultsList();
      });
    });

    this._bindItemClicks();
  }

  /**
   * Bind item click handlers to execute navigation / detail modal
   */
  _bindItemClicks() {
    if (!this.modalRoot) return;

    // Quick suggestion pill clicks
    const suggestionPills = this.modalRoot.querySelectorAll('.search-suggestion-pill');
    suggestionPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.getAttribute('data-query');
        const input = this.modalRoot.querySelector('#search-modal-input');
        const clearBtn = this.modalRoot.querySelector('#btn-clear-search-input');
        if (input) {
          input.value = query;
          input.focus();
        }
        this.searchQuery = query;
        if (clearBtn) clearBtn.classList.remove('hidden');
        this._updateResultsList();
      });
    });

    // Reset button in empty state
    const resetBtn = this.modalRoot.querySelector('#btn-reset-search');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const input = this.modalRoot.querySelector('#search-modal-input');
        const clearBtn = this.modalRoot.querySelector('#btn-clear-search-input');
        if (input) {
          input.value = '';
          input.focus();
        }
        this.searchQuery = '';
        this.activeCategory = 'all';
        if (clearBtn) clearBtn.classList.add('hidden');
        this._updateResultsList();
      });
    }

    // Click on individual search result cards
    const resultRows = this.modalRoot.querySelectorAll('.search-result-item');
    resultRows.forEach(row => {
      row.addEventListener('click', () => {
        const type = row.getAttribute('data-type');
        const id = row.getAttribute('data-id');
        this._handleItemSelect(type, id);
      });
    });
  }

  /**
   * Execute action when user clicks an item
   * @param {string} type
   * @param {string} id
   */
  _handleItemSelect(type, id) {
    this.modalManager.close(this.modalId);

    if (type === 'task') {
      // Open Task Detail Modal
      this.modalManager.open('task-detail', { taskId: id });
    } else if (type === 'doc') {
      // Open PDF Viewer Modal
      this.modalManager.open('pdf-viewer', { docId: id });
    } else if (type === 'sop') {
      // Navigate to Dokumen & SOP view
      window.location.hash = '#/dokumen';
    } else if (type === 'workspace' || type === 'project') {
      // Navigate to Ruang Kerja view
      window.location.hash = '#/ruang-kerja';
    } else if (type === 'calendar') {
      // Navigate to Calendar view
      window.location.hash = '#/calendar';
    }
  }

  /**
   * Update the results container dynamically
   */
  _updateResultsList() {
    if (!this.modalRoot) return;
    const container = this.modalRoot.querySelector('#search-modal-results');
    if (!container) return;

    const results = this._performSearch(this.searchQuery, this.activeCategory);
    container.innerHTML = this._renderResultsContent(results);
    this._bindItemClicks();
  }

  /**
   * Gather items matching query and category
   * @param {string} query
   * @param {string} category
   * @returns {Array}
   */
  _performSearch(query, category) {
    const q = (query || '').toLowerCase().trim();
    const results = [];

    // 1. Tasks
    if (category === 'all' || category === 'task') {
      const tasks = this.taskService ? (this.taskService.tasks || []) : [];
      tasks.forEach(t => {
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchCode = (t.code || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchWs = (t.workspace || '').toLowerCase().includes(q);
        const matchPic = (t.pic?.name || '').toLowerCase().includes(q);
        const matchTags = Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(q));

        if (!q || matchTitle || matchCode || matchDesc || matchWs || matchPic || matchTags) {
          results.push({
            type: 'task',
            id: t.id,
            categoryLabel: 'TUGAS',
            title: t.title,
            code: t.code,
            subtitle: `${t.code} • Workspace: ${t.workspace} • PIC: ${t.pic?.name || 'Tim'} • Status: ${t.status}`,
            icon: 'task_alt',
            iconBg: 'bg-primary/10 text-primary',
            badge: t.priority || 'Normal',
            badgeBg: t.priority === 'Critical' ? 'bg-status-urgent/15 text-status-urgent' : 'bg-primary/10 text-primary'
          });
        }
      });
    }

    // 2. Documents & SOP
    if (category === 'all' || category === 'doc') {
      // SOP Resmi
      const sopTitle = 'SOP: Kalibrasi Safe-Zone LED Billboard & Emisi Luminansi';
      const sopCode = 'SOP-ENG-OOH-2024.08';
      const sopDesc = 'standar operasional prosedur safe-zone led billboard novastar emisi luminansi jakarta';
      if (!q || sopTitle.toLowerCase().includes(q) || sopCode.toLowerCase().includes(q) || sopDesc.includes(q)) {
        results.push({
          type: 'sop',
          id: 'sop-led-kalibrasi',
          categoryLabel: 'SOP RESMI',
          title: sopTitle,
          code: sopCode,
          subtitle: `${sopCode} • Standar Teknis Safe-Zone 16:9 4K & Emisi Nits`,
          icon: 'menu_book',
          iconBg: 'bg-status-success/15 text-status-success',
          badge: 'Versi 3.2',
          badgeBg: 'bg-status-success/15 text-status-success'
        });
      }

      // Legal Documents (PDF)
      const docs = this.documentService ? this.documentService.getDocuments() : [];
      docs.forEach(d => {
        const matchTitle = (d.title || '').toLowerCase().includes(q);
        const matchIssuer = (d.issuer || '').toLowerCase().includes(q);
        const matchSk = (d.skNumber || '').toLowerCase().includes(q);
        const matchOfficer = (d.officer || '').toLowerCase().includes(q);

        if (!q || matchTitle || matchIssuer || matchSk || matchOfficer) {
          results.push({
            type: 'doc',
            id: d.id,
            categoryLabel: 'DOKUMEN RESMI',
            title: d.title,
            code: d.skNumber,
            subtitle: `${d.skNumber} • ${d.issuer} • ${d.status}`,
            icon: 'picture_as_pdf',
            iconBg: 'bg-error-container/15 text-error-container',
            badge: 'PDF',
            badgeBg: 'bg-error-container/15 text-error-container'
          });
        }
      });
    }

    // 3. Workspaces & Projects
    if (category === 'all' || category === 'workspace') {
      // Workspaces
      const workspaces = [
        { id: 'ws-ruangkreasi', name: 'RuangKreasi (Creative & Production Dev)', slug: 'ruangkreasi', role: 'Dev' },
        { id: 'ws-layarbaca', name: 'LayarBaca Interactive Magazine', slug: 'layarbaca', role: 'Produk' },
        { id: 'ws-aikreativ', name: 'AIKreativ Automation Hub', slug: 'aikreativ', role: 'Studio' },
        { id: 'ws-panenkunci', name: 'Panen Kunci SaaS Infrastructure', slug: 'panen-kunci', role: 'SaaS' },
        { id: 'ws-sharinginaja', name: 'Sharinginaja Cloud Storage', slug: 'sharinginaja', role: 'Cloud' }
      ];

      workspaces.forEach(ws => {
        if (!q || ws.name.toLowerCase().includes(q) || ws.slug.includes(q)) {
          results.push({
            type: 'workspace',
            id: ws.slug,
            categoryLabel: 'RUANG KERJA',
            title: ws.name,
            code: ws.slug.toUpperCase(),
            subtitle: `Ruang Kerja Aktif • Kategori: ${ws.role}`,
            icon: 'workspaces',
            iconBg: 'bg-tertiary/15 text-tertiary',
            badge: ws.role,
            badgeBg: 'bg-tertiary/15 text-tertiary'
          });
        }
      });

      // Projects
      const projects = this.projectService ? (this.projectService.projects || []) : [];
      projects.forEach(p => {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCode = (p.code || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchWs = (p.workspace || '').toLowerCase().includes(q);

        if (!q || matchName || matchCode || matchDesc || matchWs) {
          results.push({
            type: 'project',
            id: p.id,
            categoryLabel: 'PROYEK',
            title: p.name,
            code: p.code,
            subtitle: `${p.code} • Workspace: ${p.workspace} • Progress: ${p.progress}%`,
            icon: 'folder',
            iconBg: 'bg-amber-500/15 text-amber-600',
            badge: `${p.progress}%`,
            badgeBg: 'bg-amber-500/15 text-amber-600'
          });
        }
      });
    }

    // 4. Calendar Events
    if (category === 'all' || category === 'calendar') {
      const events = this.calendarService ? (this.calendarService.events || []) : [];
      events.forEach(evt => {
        const matchTitle = (evt.title || '').toLowerCase().includes(q);
        const matchDesc = (evt.description || '').toLowerCase().includes(q);
        const matchLoc = (evt.location || '').toLowerCase().includes(q);
        const matchPic = (evt.pic || '').toLowerCase().includes(q);
        const matchPillar = (evt.pillar || '').toLowerCase().includes(q);

        if (!q || matchTitle || matchDesc || matchLoc || matchPic || matchPillar) {
          results.push({
            type: 'calendar',
            id: evt.id,
            categoryLabel: 'JADWAL',
            title: evt.title,
            code: evt.dayName ? `${evt.dayName}, ${evt.date}` : evt.date,
            subtitle: `${evt.dayName || ''}, ${evt.date || ''} (${evt.time || ''}) • ${evt.location || 'Online'}`,
            icon: 'calendar_month',
            iconBg: 'bg-blue-500/15 text-blue-600',
            badge: evt.badge || 'Agenda',
            badgeBg: 'bg-blue-500/15 text-blue-600'
          });
        }
      });
    }

    return results;
  }

  /**
   * Render results content or empty state
   * @param {Array} results
   * @returns {string}
   */
  _renderResultsContent(results) {
    // If no query entered yet, show search suggestions and shortcuts
    if (!this.searchQuery) {
      return `
        <div class="py-3 flex flex-col gap-4">
          <!-- Suggestion Chips -->
          <div>
            <span class="font-caption-meta text-[11px] text-text-muted uppercase font-bold tracking-wider block mb-2">
              Pencarian Cepat &amp; Populer
            </span>
            <div class="flex flex-wrap gap-2">
              <button class="search-suggestion-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-[12px] font-medium border border-surface-border transition-colors" data-query="Safe-Zone LED" type="button">
                <span class="material-symbols-outlined text-[15px] text-primary">search</span>
                <span>Safe-Zone LED</span>
              </button>
              <button class="search-suggestion-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-[12px] font-medium border border-surface-border transition-colors" data-query="SOP Kalibrasi" type="button">
                <span class="material-symbols-outlined text-[15px] text-status-success">menu_book</span>
                <span>SOP Kalibrasi</span>
              </button>
              <button class="search-suggestion-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-[12px] font-medium border border-surface-border transition-colors" data-query="RuangKreasi" type="button">
                <span class="material-symbols-outlined text-[15px] text-tertiary">workspaces</span>
                <span>RuangKreasi</span>
              </button>
              <button class="search-suggestion-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-[12px] font-medium border border-surface-border transition-colors" data-query="Dishub" type="button">
                <span class="material-symbols-outlined text-[15px] text-error-container">picture_as_pdf</span>
                <span>Izin Dishub</span>
              </button>
              <button class="search-suggestion-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-[12px] font-medium border border-surface-border transition-colors" data-query="Novastar" type="button">
                <span class="material-symbols-outlined text-[15px] text-amber-500">memory</span>
                <span>Novastar Controller</span>
              </button>
            </div>
          </div>

          <!-- Highlighted Quick Items -->
          <div class="pt-3 border-t border-surface-border">
            <span class="font-caption-meta text-[11px] text-text-muted uppercase font-bold tracking-wider block mb-2">
              Item Prioritas
            </span>
            <div class="flex flex-col gap-1.5">
              ${results.slice(0, 4).map(item => this._renderItemCard(item)).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // If query returned 0 items
    if (results.length === 0) {
      return `
        <div class="py-12 flex flex-col items-center justify-center text-center px-4">
          <div class="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-text-muted mb-3">
            <span class="material-symbols-outlined text-[32px]">search_off</span>
          </div>
          <h4 class="font-headline-md text-[15px] font-bold text-text-primary mb-1">
            Tidak ditemukan hasil untuk "${this._escapeHtml(this.searchQuery)}"
          </h4>
          <p class="font-body-default text-[12px] text-text-muted max-w-sm mb-4">
            Coba gunakan kata kunci yang lebih singkat, periksa ejaan, atau alihkan filter kategori ke "Semua".
          </p>
          <button
            id="btn-reset-search"
            class="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-primary font-medium text-[12px] border border-surface-border transition-colors"
            type="button"
          >
            Reset Pencarian
          </button>
        </div>
      `;
    }

    // Results found
    return `
      <div class="py-1">
        <div class="flex items-center justify-between pb-2 mb-1">
          <span class="font-caption-meta text-[11px] text-text-muted font-bold uppercase tracking-wider">
            Hasil Pencarian (${results.length})
          </span>
          <span class="font-caption-meta text-[11px] text-primary font-semibold">
            Kueri: "${this._escapeHtml(this.searchQuery)}"
          </span>
        </div>
        <div class="flex flex-col gap-1.5">
          ${results.map(item => this._renderItemCard(item)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual item card
   * @param {Object} item
   * @returns {string}
   */
  _renderItemCard(item) {
    return `
      <div
        class="search-result-item flex items-center gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-surface-container-low active:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-surface-border group"
        data-type="${item.type}"
        data-id="${item.id}"
        role="button"
        tabindex="0"
      >
        <!-- Icon -->
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}">
          <span class="material-symbols-outlined text-[20px]">${item.icon}</span>
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0 flex flex-col">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="font-badge-micro text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container text-text-muted">
              ${item.categoryLabel}
            </span>
            <span class="font-headline-md text-[13px] font-bold text-text-primary truncate group-hover:text-primary transition-colors">
              ${this._escapeHtml(item.title)}
            </span>
          </div>
          <span class="font-caption-meta text-[11px] text-text-muted truncate">
            ${this._escapeHtml(item.subtitle)}
          </span>
        </div>

        <!-- Trailing Badge & Chevron -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="hidden sm:inline-block px-2 py-0.5 rounded-full font-badge-micro text-[10px] font-bold ${item.badgeBg}">
            ${item.badge}
          </span>
          <span class="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all">
            chevron_right
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML utility
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

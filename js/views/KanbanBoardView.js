import { BaseView } from '../core/BaseView.js';

/**
 * KanbanBoardView - Single Responsibility Principle (SRP)
 * Renders the project's focused Kanban board with custom theme backgrounds,
 * interactive columns, HTML5 desktop drag-and-drop, touch mobile drag-and-drop,
 * quick card addition, Trello-style toolbar icons, Left Inbox drawer,
 * and bottom floating dock with rich interactive behavior.
 */
export class KanbanBoardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');

    this.projectId = null;
    this.project = null;
    this.currentWorkspace = localStorage.getItem('active_workspace') || 'ruangkreasi';

    // Drag state
    this._draggedTaskId = null;
    this._draggedFromCol = null;
    this.highlightTaskId = null;

    // Trello-style states matching screenshot
    this.isInboxOpen = false;
    this.isStarred = localStorage.getItem(`starred_board_${this.currentWorkspace}`) === 'true';
    this.activeFilter = 'all';
    this.boardVisibility = localStorage.getItem(`board_vis_${this.currentWorkspace}`) || 'Ruang Kerja';
    this.isAddingList = false;

    // Active popup/modal tracking
    this.activePopup = null; // 'view-switch' | 'members' | 'powerups' | 'automation' | 'filter' | 'visibility' | 'share' | 'more' | 'switch-boards'

    this._initColumns();

    // Auto-update kanban whenever tasks change
    this._onTasksUpdated = () => {
      if (this._draggedTaskId) return;
      if (this.element) {
        this.mount(this.element);
      }
    };
    this.eventBus.on('tasks:updated', this._onTasksUpdated);
  }

  _initColumns() {
    const saved = localStorage.getItem(`kanban_columns_${this.currentWorkspace}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.columns = parsed;
          return;
        }
      } catch (e) {}
    }

    // Default columns matching modern Trello workflow
    if (this.currentWorkspace.toLowerCase() === 'aikreativ') {
      this.columns = [
        { id: 'backlog',      title: 'To Do',              color: 'border-slate-300',  dot: 'bg-slate-400',    badge: 'bg-slate-100 text-slate-700' },
        { id: 'in-progress',  title: 'Doing',              color: 'border-blue-500',   dot: 'bg-blue-500',     badge: 'bg-blue-100 text-blue-700' },
        { id: 'review-qa',    title: 'Review QA',          color: 'border-rose-500',   dot: 'bg-rose-500',     badge: 'bg-rose-100 text-rose-700' },
        { id: 'ready-launch', title: 'Ready to Launch',    color: 'border-purple-500', dot: 'bg-purple-600',   badge: 'bg-purple-100 text-purple-700' },
        { id: 'done',         title: 'Done',               color: 'border-emerald-500',dot: 'bg-emerald-600',  badge: 'bg-emerald-100 text-emerald-700' }
      ];
    } else {
      this.columns = [
        { id: 'backlog',      title: 'Daftar Pekerjaan',   color: 'border-slate-300',  dot: 'bg-slate-400',    badge: 'bg-slate-100 text-slate-700' },
        { id: 'in-progress',  title: 'Sedang Berjalan',    color: 'border-blue-500',   dot: 'bg-blue-500',     badge: 'bg-blue-100 text-blue-700' },
        { id: 'review-qa',    title: 'Review QA Lapangan', color: 'border-rose-500',   dot: 'bg-rose-500',     badge: 'bg-rose-100 text-rose-700' },
        { id: 'ready-launch', title: 'Siap Launching',     color: 'border-purple-500', dot: 'bg-purple-600',   badge: 'bg-purple-100 text-purple-700' },
        { id: 'done',         title: 'Selesai',             color: 'border-emerald-500',dot: 'bg-emerald-600',  badge: 'bg-emerald-100 text-emerald-700' }
      ];
    }
  }

  unmount() {
    if (this._onTasksUpdated) {
      this.eventBus.off('tasks:updated', this._onTasksUpdated);
    }
    super.unmount();
  }

  setWorkspace(workspace) {
    this.currentWorkspace = workspace || 'ruangkreasi';
    this.isStarred = localStorage.getItem(`starred_board_${this.currentWorkspace}`) === 'true';
    this.boardVisibility = localStorage.getItem(`board_vis_${this.currentWorkspace}`) || 'Ruang Kerja';
    this._initColumns();
  }

  setProject(projectId) {
    this.projectId = projectId;
    if (this.projectService) {
      this.project = this.projectService.getProject(projectId);
      if (this.project) {
        this.currentWorkspace = this.project.workspace || 'ruangkreasi';
        this.setWorkspace(this.currentWorkspace);
      }
    }
  }

  getWorkspaceName(wsKey) {
    if (!wsKey) return 'RuangKreasi';
    const names = {
      'ruangkreasi': 'RuangKreasi',
      'layarbaca': 'LayarBaca',
      'aikreativ': 'AIKreativ',
      'panen-kunci': 'Panen Kunci',
      'sharinginaja': 'Sharinginaja'
    };
    if (names[wsKey]) return names[wsKey];
    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const found = custom.find(w => w.id === wsKey);
      if (found && found.title) return found.title;
    } catch (e) {}
    return wsKey.charAt(0).toUpperCase() + wsKey.slice(1);
  }

  render() {
    // Resolve project if projectId set
    if (this.projectId && !this.project && this.projectService) {
      this.project = this.projectService.getProject(this.projectId);
      if (this.project) {
        this.currentWorkspace = this.project.workspace || 'ruangkreasi';
      }
    }

    const currentWsName = this.getWorkspaceName(this.currentWorkspace);
    const boardTitle = this.project ? this.project.name : currentWsName;

    // Board theme wallpaper
    const savedTheme = localStorage.getItem(`board_theme_${this.currentWorkspace}`);
    let theme = null;
    if (savedTheme) {
      try { theme = JSON.parse(savedTheme); } catch(e) {}
    }
    if (!theme) {
      theme = this.project?.theme || {
        type: 'image',
        value: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
        name: 'City Skyline'
      };
    }

    // Filter tasks for this project / workspace
    const currentWs = (this.currentWorkspace || 'ruangkreasi').toLowerCase();
    const allTasks = this.taskService ? this.taskService.getTasks().filter(t => {
      const taskWs = (t.workspace || '').toLowerCase();
      const matchWs = this.projectId ? (t.projectId === this.projectId || (!t.projectId && taskWs === currentWs)) : (taskWs === currentWs);
      if (!matchWs) return false;
      if (this.activeFilter === 'critical') return t.priority === 'Critical';
      if (this.activeFilter === 'high') return t.priority === 'High' || t.priority === 'Critical';
      if (this.activeFilter === 'done') return t.status === 'done';
      if (this.activeFilter === 'in-progress') return t.status === 'in-progress';
      return true;
    }) : [];

    // Background style according to theme
    let bgStyle = '';
    if (theme.type === 'image') {
      bgStyle = `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${theme.value}') center/cover fixed;`;
    } else if (theme.type === 'gradient') {
      bgStyle = `background: ${theme.value};`;
    } else {
      bgStyle = `background-color: ${theme.value};`;
    }

    return `
      <style>
        /* ── Drag-and-Drop Styles ── */
        .kanban-card[draggable="true"] {
          cursor: grab;
          user-select: none;
        }
        .kanban-card[draggable="true"]:active {
          cursor: grabbing;
        }
        .kanban-card.is-dragging {
          opacity: 0.35;
          transform: scale(0.97);
          box-shadow: 0 0 0 2px #0c66e4, 0 8px 24px rgba(12,102,228,0.25);
          transition: opacity 0.15s, transform 0.15s;
        }
        .kanban-column {
          transition: background-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
        }
        .kanban-column.drag-over {
          background-color: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 2px #0c66e4, inset 0 0 0 2px rgba(12,102,228,0.15);
          transform: scale(1.015);
        }
        .column-drop-hint {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          margin-bottom: 8px;
          border-radius: 10px;
          border: 2px dashed #0c66e4;
          background: rgba(12,102,228,0.06);
          color: #0c66e4;
          font-size: 11.5px;
          font-weight: 600;
          animation: pulse-border 1.2s infinite ease-in-out;
        }
        .kanban-column.drag-over .column-drop-hint {
          display: flex;
        }
        @keyframes pulse-border {
          0%, 100% { border-color: #0c66e4; background: rgba(12,102,228,0.06); }
          50%       { border-color: #388bff; background: rgba(12,102,228,0.14); }
        }
        @keyframes drop-snap {
          0%   { transform: scale(0.95); opacity: 0.7; }
          60%  { transform: scale(1.03); }
          100% { transform: scale(1.00); opacity: 1; }
        }
        .drop-snap {
          animation: drop-snap 0.28s ease-out forwards;
        }
        .drag-ghost-badge {
          position: fixed;
          top: -999px;
          left: -999px;
          z-index: 99999;
          background: #0c66e4;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(12,102,228,0.4);
          pointer-events: none;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kanban-column.is-collapsed {
          min-width: 48px !important;
          max-width: 48px !important;
          padding: 8px 6px !important;
          cursor: pointer;
        }
        .kanban-column.is-collapsed .column-header-inner {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          border-bottom: none !important;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          align-items: center;
          gap: 12px;
        }
        .kanban-column.is-collapsed .column-drop-hint,
        .kanban-column.is-collapsed [data-cards-area],
        .kanban-column.is-collapsed .btn-quick-add-col,
        .kanban-column.is-collapsed .column-count-badge {
          display: none !important;
        }

        /* Slide-in animation for Inbox drawer */
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      </style>

      <!-- Ghost badge element for custom drag image -->
      <div class="drag-ghost-badge" id="kanban-drag-ghost">
        <span class="material-symbols-outlined" style="font-size:15px">drag_indicator</span>
        <span id="kanban-drag-ghost-label">Tugas</span>
      </div>

      <!-- Main Kanban Canvas with Theme Background -->
      <div class="flex flex-col w-full min-h-[calc(100vh-var(--topbar-height))] relative transition-all duration-300 select-none" style="${bgStyle}">
        
        <!-- Board Top Header Bar (Trello Toolbar) -->
        <div class="w-full px-4 sm:px-6 py-2.5 bg-black/35 backdrop-blur-md border-b border-white/15 flex flex-wrap items-center justify-between gap-3 text-white z-30 relative">
          
          <!-- Left: Back to Home + Board Title + View Switcher Icon [|||] v -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              id="btn-kanban-back-home"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Kembali ke Beranda"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span class="hidden sm:inline">Beranda</span>
            </button>

            <span class="text-white/30 hidden sm:inline">|</span>

            <div class="flex items-center gap-1.5 min-w-0">
              <h1 class="text-[17px] sm:text-[19px] font-bold text-white tracking-tight drop-shadow-sm truncate">
                ${boardTitle}
              </h1>

              <!-- View Switcher Button [|||] v -->
              <div class="relative">
                <button
                  id="btn-board-view-switch"
                  class="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                  title="Ganti Tampilan Papan"
                  type="button"
                >
                  <span class="material-symbols-outlined text-[17px]">view_week</span>
                  <span class="material-symbols-outlined text-[15px]">expand_more</span>
                </button>
              </div>
            </div>

            <!-- Filter Badge Chip (if filter is active) -->
            ${this.activeFilter !== 'all' ? `
              <div class="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-semibold">
                <span class="material-symbols-outlined text-[13px]">filter_alt</span>
                <span>Filter: ${this.activeFilter}</span>
                <button id="btn-reset-filter-chip" class="hover:text-white cursor-pointer ml-1" title="Reset filter">✕</button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Trello Toolbar Icons from screenshot -->
          <div class="flex items-center gap-1 sm:gap-2">
            
            <!-- Member Avatar Badge [ A ] -->
            <button
              id="btn-board-avatar"
              class="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[13px] flex items-center justify-center border-2 border-white/50 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Anggota Papan (Awa)"
              type="button"
            >
              <span>A</span>
            </button>

            <!-- Power-Ups Icon (Plug) -->
            <button
              id="btn-board-powerups"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Power-Ups"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">power</span>
            </button>

            <!-- Automation / Butler Icon (Bolt) -->
            <button
              id="btn-board-automation"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Automasi Butler"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">bolt</span>
            </button>

            <!-- Filter Icon (Funnel) -->
            <button
              id="btn-board-filter"
              class="w-8 h-8 rounded-lg hover:bg-white/20 ${this.activeFilter !== 'all' ? 'text-amber-300 bg-white/20' : 'text-white/90'} hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Filter Kartu"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">filter_list</span>
            </button>

            <!-- Star Favorite Icon -->
            <button
              id="btn-star-board"
              class="w-8 h-8 rounded-lg hover:bg-white/20 ${this.isStarred ? 'text-amber-300' : 'text-white/90'} hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="${this.isStarred ? 'Hapus dari favorit' : 'Bintangi Papan'}"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">${this.isStarred ? 'star' : 'star_border'}</span>
            </button>

            <!-- Workspace Visibility Icon (Group) -->
            <button
              id="btn-board-visibility"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Visibilitas: ${this.boardVisibility}"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">group</span>
            </button>

            <!-- Share Button [+ Share] -->
            <button
              id="btn-board-share"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[12.5px] font-semibold backdrop-blur-md transition-all shadow-xs active:scale-95 cursor-pointer"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px]">person_add</span>
              <span class="hidden sm:inline">Share</span>
            </button>

            <!-- More Menu Icon [...] -->
            <button
              id="btn-board-more-menu"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Menu Pengaturan Papan"
              type="button"
            >
              <span class="material-symbols-outlined text-[22px]">more_horiz</span>
            </button>

            <!-- Quick Add Task Button -->
            <button
              id="btn-add-kanban-task"
              class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-bold transition-all shadow-md shadow-blue-600/30 active:scale-95 cursor-pointer ml-1"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Kartu Baru</span>
            </button>

          </div>

        </div>

        <!-- Main Body: Split View with Left Inbox Drawer + Board Columns -->
        <div class="flex-1 flex overflow-hidden w-full relative">

          <!-- Left: Inbox Drawer (Opened when isInboxOpen is true) -->
          ${this.isInboxOpen ? `
            <aside
              id="kanban-inbox-panel"
              class="w-72 sm:w-80 flex-shrink-0 bg-[#f4f5f7]/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-white/20 shadow-2xl flex flex-col z-20 animate-slide-in-left transition-all"
            >
              <!-- Inbox Header -->
              <div class="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#0c66e4] text-[20px]">inbox</span>
                  <h3 class="font-bold text-[15px] text-slate-800 dark:text-white tracking-tight">Inbox</h3>
                </div>

                <div class="flex items-center gap-1">
                  <button id="btn-inbox-tune" class="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="Urutkan Inbox">
                    <span class="material-symbols-outlined text-[17px]">tune</span>
                  </button>
                  <button id="btn-inbox-more" class="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="Opsi Inbox">
                    <span class="material-symbols-outlined text-[17px]">more_horiz</span>
                  </button>
                  <button id="btn-close-inbox" class="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer" title="Tutup Inbox">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              <!-- Quick Add Card Input in Inbox -->
              <div class="p-3 border-b border-slate-200/80 dark:border-slate-800">
                <form id="form-inbox-add-card" class="flex flex-col gap-2">
                  <div class="relative">
                    <input
                      id="input-inbox-card-title"
                      type="text"
                      placeholder="Add a card"
                      class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 shadow-xs focus:ring-2 focus:ring-[#0c66e4] focus:outline-none transition-all"
                      autocomplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    class="w-full py-1.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-semibold rounded-lg transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span class="material-symbols-outlined text-[15px]">add</span>
                    <span>Tambahkan ke Papan</span>
                  </button>
                </form>
              </div>

              <!-- Graphic Illustration Section: Consolidate your to-dos -->
              <div class="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
                <h4 class="font-bold text-[14.5px] text-slate-800 dark:text-white mb-6">
                  Consolidate your to-dos
                </h4>

                <!-- Circular App Icons matching screenshot -->
                <div class="relative w-48 h-48 mb-6 flex items-center justify-center">
                  
                  <!-- Subtle connecting lines background -->
                  <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 192 192">
                    <path d="M 60,60 L 130,95 L 90,140 L 45,120 Z" stroke="#94a3b8" stroke-dasharray="3,3" fill="none" stroke-width="1.5" />
                  </svg>

                  <!-- 1. Email Icon (Blue circle) -->
                  <div
                    class="btn-inbox-app-badge absolute top-2 left-6 w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Email"
                    title="Koneksi Email"
                  >
                    <span class="material-symbols-outlined text-[22px] text-blue-600 group-hover:rotate-12 transition-transform">mail</span>
                  </div>

                  <!-- 2. Phone Icon (Amber circle) -->
                  <div
                    class="btn-inbox-app-badge absolute top-16 left-16 w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Mobile App"
                    title="Koneksi Mobile"
                  >
                    <span class="material-symbols-outlined text-[19px] text-amber-600 group-hover:scale-110 transition-transform">smartphone</span>
                  </div>

                  <!-- 3. Slack Icon (Green / hashtag) -->
                  <div
                    class="btn-inbox-app-badge absolute bottom-4 left-4 w-11 h-11 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Slack"
                    title="Integrasi Slack"
                  >
                    <span class="material-symbols-outlined text-[20px] text-emerald-600 group-hover:rotate-45 transition-transform">tag</span>
                  </div>

                  <!-- 4. Chrome Icon with NEW badge (Gold/yellow ring) -->
                  <div
                    class="btn-inbox-app-badge absolute top-6 right-4 w-14 h-14 rounded-full bg-amber-50/70 border-2 border-amber-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group relative"
                    data-app="Google Chrome Extension"
                    title="Ekstensi Chrome"
                  >
                    <!-- NEW pill badge -->
                    <span class="absolute -top-2.5 px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded text-[9px] font-bold shadow-xs tracking-wider">
                      NEW
                    </span>
                    <span class="material-symbols-outlined text-[26px] text-amber-500 group-hover:scale-110 transition-transform">public</span>
                  </div>

                  <!-- 5. Teams Icon (Purple circle) -->
                  <div
                    class="btn-inbox-app-badge absolute bottom-3 right-8 w-11 h-11 rounded-full bg-purple-50 border-2 border-purple-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Microsoft Teams"
                    title="Integrasi Teams"
                  >
                    <span class="material-symbols-outlined text-[20px] text-purple-600 group-hover:rotate-12 transition-transform">forum</span>
                  </div>

                </div>

                <p class="text-[12px] text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                  Hubungkan sumber pekerjaan Anda untuk mengumpulkan tugas di satu papan terpadu.
                </p>
              </div>

              <!-- Footer Note: Inbox is only visible to you -->
              <div class="p-3 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                <span class="material-symbols-outlined text-[14px]">lock</span>
                <span>Inbox is only visible to you</span>
              </div>
            </aside>
          ` : ''}

          <!-- Kanban Columns Stream (Full Height, Swipeable/Scrollable) -->
          <div class="flex-1 w-full overflow-x-auto p-4 sm:p-6 pb-24" id="kanban-scroll-area">
            <div class="flex gap-4 items-start min-w-max pb-8" id="kanban-board">
              
              ${this.columns.map(col => {
                const colTasks = allTasks.filter(t => t.status === col.id);

                return `
                  <div
                    class="kanban-column flex flex-col bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg min-w-[280px] max-w-[280px] flex-shrink-0 transition-all"
                    data-column-id="${col.id}"
                  >
                    <!-- Column Header matching Trello with count and action icons -->
                    <div class="column-header-inner flex items-center justify-between pb-2 mb-2 border-b-2 ${col.color}">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full ${col.dot} inline-block shrink-0"></span>
                        <h3 class="column-header-title font-bold text-[13.5px] text-text-primary tracking-tight truncate">${col.title}</h3>
                        <span class="column-count-badge px-2 py-0.2 rounded-full ${col.badge} text-[10.5px] font-mono font-bold shrink-0">
                          ${colTasks.length}
                        </span>
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        <button class="btn-clear-kanban-col w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" data-column-id="${col.id}" data-column-title="${col.title}" title="Bersihkan/hapus semua kartu di kolom ini" type="button">
                          <span class="material-symbols-outlined text-[15px]">delete_sweep</span>
                        </button>
                        <button class="HWSXYBl9AjpaH2 bqDBTa8KAMX3yi fHETqJ4siBv5Ok" type="button" data-testid="list-collapse-button" title="Ciutkan daftar">
                          <span role="img" aria-label="Collapse list" class="text-slate-400 hover:text-slate-700 flex items-center">
                            <svg fill="none" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" fill-rule="evenodd" d="M6.25 8.75H0v-1.5h6.25zm3.5-1.5H16v1.5H9.75z" clip-rule="evenodd"></path><path fill="currentColor" fill-rule="evenodd" d="M5.19 8 2.22 5.03l1.06-1.06 3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5-1.06-1.06zm4.03-.53 3.5-3.5 1.06 1.06L10.81 8l2.97 2.97-1.06 1.06-3.5-3.5a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path></svg>
                          </span>
                        </button>
                      </div>
                    </div>

                    <!-- Drop Hint (shown on drag-over) -->
                    <div class="column-drop-hint">
                      <span class="material-symbols-outlined text-[14px]">south</span>
                      <span>Lepaskan kartu di sini</span>
                    </div>

                    <!-- Cards List Container -->
                    <div class="flex flex-col gap-2.5 min-h-[140px]" data-cards-area="${col.id}">
                      ${colTasks.map(task => `
                        <div
                          class="kanban-card p-3.5 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-[#0c66e4] hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 group active:scale-[0.99]"
                          data-task-id="${task.id}"
                          data-task-status="${task.status}"
                          draggable="true"
                        >
                          <!-- Card Code & Priority & Delete Button -->
                          <div class="flex items-center justify-between gap-1.5">
                            <span class="px-2 py-0.5 rounded bg-surface-container-low font-mono text-[10.5px] font-bold text-primary">
                              ${task.code || '#TASK'}
                            </span>
                            <div class="flex items-center gap-1">
                              <span class="px-2 py-0.5 rounded text-[9.5px] font-bold ${this.getPriorityBadge(task.priority)}">
                                ${task.priority}
                              </span>
                              <button
                                class="btn-delete-kanban-card w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                                data-task-id="${task.id}"
                                title="Hapus kartu ini"
                                type="button"
                              >
                                <span class="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>

                          <!-- Title -->
                          <h4 class="text-[13px] font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug">
                            ${task.title}
                          </h4>

                          <!-- Visual Thumbnail if Available -->
                          ${task.code === '#RK-304' ? `
                            <div class="relative h-24 rounded-lg overflow-hidden bg-slate-900 shadow-inner my-0.5">
                              <img
                                alt="Billboard Preview"
                                class="w-full h-full object-cover"
                                src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80"
                              />
                              <span class="absolute bottom-1 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">16:9 4K</span>
                            </div>
                          ` : ''}

                          <!-- Footer: PIC & Column Shift Buttons -->
                          <div class="flex items-center justify-between pt-2 border-t border-surface-border text-[11px] text-text-muted">
                            <div class="flex items-center gap-1.5">
                              <div class="w-5 h-5 rounded-full bg-[#0c66e4] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">
                                ${task.pic?.initials || 'SR'}
                              </div>
                              <span class="text-[11px] font-medium text-text-secondary truncate max-w-[85px]">
                                ${(task.pic?.name || 'Tim').split(' ')[0]}
                              </span>
                            </div>

                            <!-- Shift Column Buttons (Quick status shift) -->
                            <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                              <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="prev" title="Pindah ke kolom kiri">
                                <span class="material-symbols-outlined text-[14px]">arrow_back</span>
                              </button>
                              <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="next" title="Pindah ke kolom kanan">
                                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      `).join('')}

                      ${colTasks.length === 0 ? `
                        <div class="p-4 rounded-xl border border-dashed border-surface-border text-center text-text-muted text-[11px] flex flex-col items-center justify-center gap-1 min-h-[90px] bg-white/40">
                          <span class="material-symbols-outlined text-[18px] text-text-muted/60">inbox</span>
                          <span>Kolom kosong — lepaskan kartu di sini</span>
                        </div>
                      ` : ''}
                    </div>

                    <!-- Quick Add Card Button in Column -->
                    <button
                      class="btn-quick-add-col mt-2.5 py-1.5 px-2 rounded-xl text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      data-column-id="${col.id}"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-[16px]">add</span>
                      <span>Tambah kartu</span>
                    </button>

                  </div>
                `;
              }).join('')}

              <!-- + Add another list (Trello Style) -->
              <div class="flex-shrink-0 min-w-[270px]">
                ${this.isAddingList ? `
                  <div class="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg flex flex-col gap-2.5">
                    <input
                      id="input-new-list-title"
                      type="text"
                      placeholder="Masukkan judul daftar..."
                      class="w-full px-3 py-2 text-[13px] bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#0c66e4] focus:outline-none"
                      autofocus
                    />
                    <div class="flex items-center gap-2">
                      <button
                        id="btn-confirm-add-list"
                        type="button"
                        class="px-3.5 py-1.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        Tambah daftar
                      </button>
                      <button
                        id="btn-cancel-add-list"
                        type="button"
                        class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                ` : `
                  <button
                    id="btn-add-another-list"
                    class="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold text-[13.5px] transition-all border border-white/15 cursor-pointer shadow-md active:scale-98"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[20px]">add</span>
                    <span>Add another list</span>
                  </button>
                `}
              </div>

            </div>
          </div>

        </div>

        <!-- Floating Bottom Dock matching screenshot -->
        <nav
          id="kanban-bottom-dock"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-1 transition-all"
        >
          <!-- 1. Inbox Button -->
          <button
            id="btn-dock-inbox"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all relative ${this.isInboxOpen ? 'text-[#0c66e4] bg-blue-50/80 dark:bg-blue-900/30 font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'} cursor-pointer"
            type="button"
          >
            <span class="material-symbols-outlined text-[17px]">inbox</span>
            <span>Inbox</span>
            ${this.isInboxOpen ? '<span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>' : ''}
          </button>

          <!-- 2. Planner Button -->
          <button
            id="btn-dock-planner"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            type="button"
          >
            <span class="material-symbols-outlined text-[17px]">calendar_month</span>
            <span>Planner</span>
          </button>

          <!-- 3. Board Button (Active) -->
          <button
            id="btn-dock-board"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-[#0c66e4] bg-blue-50/80 dark:bg-blue-900/30 relative transition-all cursor-pointer"
            type="button"
          >
            <span class="material-symbols-outlined text-[17px]">view_week</span>
            <span>Board</span>
            <span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>
          </button>

          <!-- 4. Switch Boards Button -->
          <button
            id="btn-dock-switch"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            type="button"
          >
            <span class="material-symbols-outlined text-[17px]">dashboard_customize</span>
            <span>Switch boards</span>
          </button>
        </nav>

        <!-- ==================== POPUPS & MODALS FOR ALL ICONS ==================== -->

        <!-- 1. View Switcher Popover -->
        <div
          id="popup-view-switcher"
          class="hidden absolute top-14 left-24 sm:left-36 z-50 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white flex flex-col gap-1"
        >
          <div class="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tampilan Papan
          </div>
          <button class="btn-select-view flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold bg-blue-50 text-[#0c66e4] dark:bg-blue-900/30 cursor-pointer" data-view="kanban">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[17px]">view_week</span>
              <span>Papan (Board)</span>
            </div>
            <span class="material-symbols-outlined text-[16px]">check</span>
          </button>
          <button class="btn-select-view flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" data-view="project-table">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[17px]">table_chart</span>
              <span>Tabel Proyek</span>
            </div>
          </button>
          <button class="btn-select-view flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" data-view="calendar">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[17px]">calendar_month</span>
              <span>Kalender / Planner</span>
            </div>
          </button>
          <button class="btn-select-view flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" data-view="gantt">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[17px]">timeline</span>
              <span>Timeline / Gantt</span>
            </div>
          </button>
        </div>

        <!-- 2. Members Popover -->
        <div
          id="popup-board-members"
          class="hidden absolute top-14 right-44 sm:right-64 z-50 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 text-slate-800 dark:text-white flex flex-col gap-3"
        >
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-[13.5px]">Anggota Papan ${boardTitle}</h4>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">4 Anggota</span>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">A</div>
                <div>
                  <div class="text-[12px] font-bold">Awa (Anda)</div>
                  <div class="text-[10.5px] text-slate-500">Admin & Pemilik Papan</div>
                </div>
              </div>
              <span class="text-[10px] text-emerald-600 font-bold">Online</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">SR</div>
                <div>
                  <div class="text-[12px] font-bold">Sari Rahmawati</div>
                  <div class="text-[10.5px] text-slate-500">Creative Lead</div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center">BW</div>
                <div>
                  <div class="text-[12px] font-bold">Bagas Wicaksono</div>
                  <div class="text-[10.5px] text-slate-500">Graphic Specialist</div>
                </div>
              </div>
            </div>
          </div>
          <button
            id="btn-open-invite-member"
            class="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">person_add</span>
            <span>Undang Anggota Baru</span>
          </button>
        </div>

        <!-- 3. Power-Ups Modal -->
        <div
          id="modal-powerups"
          class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="material-symbols-outlined text-[24px] text-amber-500">power</span>
                <h3 class="font-bold text-[16px]">Power-Ups & Integrasi Papan</h3>
              </div>
              <button class="btn-close-modal w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">tag</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Slack Notifications</div>
                    <div class="text-[11px] text-slate-500">Kirim update aktivitas kartu ke channel tim</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="Slack" checked />
              </div>

              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">cloud_upload</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Google Drive</div>
                    <div class="text-[11px] text-slate-500">Lampirkan file docs dan sheet langsung</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="Google Drive" checked />
              </div>

              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">code</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">GitHub Integration</div>
                    <div class="text-[11px] text-slate-500">Hubungkan commit & PR ke kartu proyek</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="GitHub" checked />
              </div>

              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">tune</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Custom Fields</div>
                    <div class="text-[11px] text-slate-500">Tambah atribut kustom dan kalkulasi</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="Custom Fields" checked />
              </div>
            </div>
            <button class="btn-close-modal w-full py-2.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white font-semibold text-[13px] rounded-xl transition-all cursor-pointer">
              Selesai
            </button>
          </div>
        </div>

        <!-- 4. Automation / Butler Modal -->
        <div
          id="modal-automation"
          class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="material-symbols-outlined text-[24px] text-blue-500">bolt</span>
                <h3 class="font-bold text-[16px]">Automasi Butler AI</h3>
              </div>
              <button class="btn-close-modal w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white">Auto-Status Selesai</div>
                  <div class="text-[11px] text-slate-500">Pindahkan kartu ke 'Done' bila checklist tuntas</div>
                </div>
                <input type="checkbox" class="automation-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-rule="Auto-Status" checked />
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white">Peringatan Tugas Kritis</div>
                  <div class="text-[11px] text-slate-500">Beri notifikasi mendesak saat prioritas Critical</div>
                </div>
                <input type="checkbox" class="automation-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-rule="Peringatan Kritis" checked />
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white">Reminder Deadline 24 Jam</div>
                  <div class="text-[11px] text-slate-500">Ingatkan PIC sehari sebelum jadwal selesai</div>
                </div>
                <input type="checkbox" class="automation-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-rule="Deadline Reminder" checked />
              </div>
            </div>
            <button class="btn-close-modal w-full py-2.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white font-semibold text-[13px] rounded-xl transition-all cursor-pointer">
              Simpan Aturan Butler
            </button>
          </div>
        </div>

        <!-- 5. Filter Popover -->
        <div
          id="popup-filter"
          class="hidden absolute top-14 right-20 sm:right-36 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white flex flex-col gap-1"
        >
          <div class="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Filter Berdasarkan
          </div>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'all' ? 'text-[#0c66e4] bg-blue-50 font-bold' : ''}" data-filter="all">
            <span>Semua Kartu</span>
            ${this.activeFilter === 'all' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'critical' ? 'text-rose-600 bg-rose-50 font-bold' : ''}" data-filter="critical">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span>Hanya Prioritas Kritis</span>
            ${this.activeFilter === 'critical' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'high' ? 'text-amber-600 bg-amber-50 font-bold' : ''}" data-filter="high">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Prioritas Tinggi & Kritis</span>
            ${this.activeFilter === 'high' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'in-progress' ? 'text-blue-600 bg-blue-50 font-bold' : ''}" data-filter="in-progress">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Sedang Berjalan</span>
            ${this.activeFilter === 'in-progress' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'done' ? 'text-emerald-600 bg-emerald-50 font-bold' : ''}" data-filter="done">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Sudah Selesai</span>
            ${this.activeFilter === 'done' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
        </div>

        <!-- 6. Visibility Popover -->
        <div
          id="popup-visibility"
          class="hidden absolute top-14 right-14 sm:right-28 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white flex flex-col gap-1"
        >
          <div class="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Visibilitas Papan
          </div>
          <button class="btn-set-visibility flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer ${this.boardVisibility === 'Ruang Kerja' ? 'bg-blue-50 text-[#0c66e4]' : ''}" data-vis="Ruang Kerja">
            <span class="material-symbols-outlined text-[18px] mt-0.5">group</span>
            <div>
              <div class="text-[12.5px] font-bold">Ruang Kerja</div>
              <div class="text-[10.5px] text-slate-500">Semua anggota workspace ini dapat melihat & mengedit</div>
            </div>
          </button>
          <button class="btn-set-visibility flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer ${this.boardVisibility === 'Pribadi' ? 'bg-blue-50 text-[#0c66e4]' : ''}" data-vis="Pribadi">
            <span class="material-symbols-outlined text-[18px] mt-0.5">lock</span>
            <div>
              <div class="text-[12.5px] font-bold">Pribadi</div>
              <div class="text-[10.5px] text-slate-500">Hanya Anda yang dapat melihat papan ini</div>
            </div>
          </button>
          <button class="btn-set-visibility flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer ${this.boardVisibility === 'Publik' ? 'bg-blue-50 text-[#0c66e4]' : ''}" data-vis="Publik">
            <span class="material-symbols-outlined text-[18px] mt-0.5">public</span>
            <div>
              <div class="text-[12.5px] font-bold">Publik</div>
              <div class="text-[10.5px] text-slate-500">Siapa saja dengan tautan dapat melihat papan</div>
            </div>
          </button>
        </div>

        <!-- 7. Share Modal -->
        <div
          id="modal-share"
          class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="material-symbols-outlined text-[24px] text-blue-600">share</span>
                <h3 class="font-bold text-[16px]">Bagikan Papan Proyek</h3>
              </div>
              <button class="btn-close-modal w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div>
                <label class="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Tautan Papan</label>
                <div class="flex gap-2">
                  <input
                    id="input-share-link"
                    type="text"
                    readonly
                    value="https://app.creativeoffice.id/board/${this.currentWorkspace}"
                    class="flex-1 px-3 py-2 text-[12.5px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 select-all"
                  />
                  <button
                    id="btn-copy-share-link"
                    type="button"
                    class="px-3.5 py-2 bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <span class="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Salin</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Undang Lewat Email</label>
                <div class="flex gap-2">
                  <input
                    id="input-invite-email"
                    type="email"
                    placeholder="email.rekan@perusahaan.com"
                    class="flex-1 px-3 py-2 text-[12.5px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#0c66e4] focus:outline-none"
                  />
                  <button
                    id="btn-send-email-invite"
                    type="button"
                    class="px-3.5 py-2 bg-slate-800 hover:bg-black text-white text-[12px] font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 8. More Menu / Theme Drawer -->
        <div
          id="drawer-more-menu"
          class="hidden fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto"
        >
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 class="font-bold text-[16px] text-slate-800 dark:text-white">Menu Papan</h3>
            <button class="btn-close-drawer w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Background Themes Picker -->
          <div class="flex flex-col gap-2">
            <h4 class="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Ubah Tema Wallpaper</h4>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-blue-500 text-left transition-all cursor-pointer"
                data-theme-type="image"
                data-theme-name="City Skyline"
                data-theme-val="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80"
              >
                <div class="h-14 rounded-lg bg-cover bg-center mb-1.5" style="background-image: url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=300&q=80')"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">City Skyline</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-blue-500 text-left transition-all cursor-pointer"
                data-theme-type="image"
                data-theme-name="Sunset City"
                data-theme-val="https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1600&q=80"
              >
                <div class="h-14 rounded-lg bg-cover bg-center mb-1.5" style="background-image: url('https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=300&q=80')"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Sunset City</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-blue-500 text-left transition-all cursor-pointer"
                data-theme-type="gradient"
                data-theme-name="Neon Cyber"
                data-theme-val="linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)"
              >
                <div class="h-14 rounded-lg mb-1.5" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Neon Dark</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-blue-500 text-left transition-all cursor-pointer"
                data-theme-type="gradient"
                data-theme-name="Deep Forest"
                data-theme-val="linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
              >
                <div class="h-14 rounded-lg mb-1.5" style="background: linear-gradient(135deg, #064e3b 0%, #022c22 100%)"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Deep Forest</div>
              </button>
            </div>
          </div>

          <!-- Board Actions -->
          <div class="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <h4 class="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Aksi Papan</h4>
            <button id="btn-export-board-json" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12.5px] font-semibold text-left transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Ekspor Data Papan (JSON)</span>
            </button>
            <button id="btn-archive-board" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-[12.5px] font-semibold text-left transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">archive</span>
              <span>Arsipkan Papan</span>
            </button>
          </div>
        </div>

        <!-- 9. Switch Boards Modal -->
        <div
          id="modal-switch-boards"
          class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="material-symbols-outlined text-[22px] text-[#0c66e4]">dashboard_customize</span>
                <h3 class="font-bold text-[15.5px]">Pilih Papan Proyek</h3>
              </div>
              <button class="btn-close-modal w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div class="flex flex-col gap-2">
              <button class="btn-switch-ws flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer ${this.currentWorkspace === 'aikreativ' ? 'border-[#0c66e4] bg-blue-50/50' : ''}" data-ws="aikreativ">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[12px]">AK</div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">AIKreativ</div>
                    <div class="text-[10.5px] text-slate-500">Papan Studio AI & Generatif</div>
                  </div>
                </div>
                ${this.currentWorkspace === 'aikreativ' ? '<span class="text-[10px] font-bold text-[#0c66e4] bg-blue-100 px-2 py-0.5 rounded-full">Aktif</span>' : ''}
              </button>

              <button class="btn-switch-ws flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer ${this.currentWorkspace === 'ruangkreasi' ? 'border-[#0c66e4] bg-blue-50/50' : ''}" data-ws="ruangkreasi">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[12px]">RK</div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">RuangKreasi</div>
                    <div class="text-[10.5px] text-slate-500">Kampanye OOH & Billboard</div>
                  </div>
                </div>
                ${this.currentWorkspace === 'ruangkreasi' ? '<span class="text-[10px] font-bold text-[#0c66e4] bg-blue-100 px-2 py-0.5 rounded-full">Aktif</span>' : ''}
              </button>

              <button class="btn-switch-ws flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer ${this.currentWorkspace === 'layarbaca' ? 'border-[#0c66e4] bg-blue-50/50' : ''}" data-ws="layarbaca">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[12px]">LB</div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">LayarBaca</div>
                    <div class="text-[10.5px] text-slate-500">EPUB3 Engine & Penerbitan</div>
                  </div>
                </div>
                ${this.currentWorkspace === 'layarbaca' ? '<span class="text-[10px] font-bold text-[#0c66e4] bg-blue-100 px-2 py-0.5 rounded-full">Aktif</span>' : ''}
              </button>

              <button class="btn-switch-ws flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer ${this.currentWorkspace === 'panen-kunci' ? 'border-[#0c66e4] bg-blue-50/50' : ''}" data-ws="panen-kunci">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[12px]">PK</div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Panen Kunci</div>
                    <div class="text-[10.5px] text-slate-500">Security & Key Vault</div>
                  </div>
                </div>
                ${this.currentWorkspace === 'panen-kunci' ? '<span class="text-[10px] font-bold text-[#0c66e4] bg-blue-100 px-2 py-0.5 rounded-full">Aktif</span>' : ''}
              </button>

              <button class="btn-switch-ws flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer ${this.currentWorkspace === 'sharinginaja' ? 'border-[#0c66e4] bg-blue-50/50' : ''}" data-ws="sharinginaja">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[12px]">SA</div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Sharinginaja</div>
                    <div class="text-[10.5px] text-slate-500">File Storage & Kolaborasi</div>
                  </div>
                </div>
                ${this.currentWorkspace === 'sharinginaja' ? '<span class="text-[10px] font-bold text-[#0c66e4] bg-blue-100 px-2 py-0.5 rounded-full">Aktif</span>' : ''}
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  getPriorityBadge(priority) {
    switch (priority) {
      case 'Critical': return 'bg-rose-100 text-rose-700';
      case 'High':     return 'bg-amber-100 text-amber-700';
      default:         return 'bg-slate-100 text-slate-700';
    }
  }

  /**
   * Set up both HTML5 DnD (desktop) and Touch DnD (mobile).
   */
  _setupDragAndDrop() {
    this._setupDesktopDragAndDrop();
    this._setupTouchDragAndDrop();
  }

  /**
   * HTML5 Drag-and-Drop — Desktop.
   */
  _setupDesktopDragAndDrop() {
    const ghost = this.element.querySelector('#kanban-drag-ghost');
    const ghostLabel = this.element.querySelector('#kanban-drag-ghost-label');
    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const columns = this.element.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this._draggedTaskId = card.getAttribute('data-task-id');
        this._draggedFromCol = card.getAttribute('data-task-status');

        const task = this.taskService.getTask(this._draggedTaskId);
        if (ghost && ghostLabel && task) {
          ghostLabel.textContent = `${task.code || ''} ${task.title.substring(0, 30)}...`;
          ghost.style.top  = '-999px';
          ghost.style.left = '-999px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 0, 0);
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this._draggedTaskId);

        requestAnimationFrame(() => card.classList.add('is-dragging'));
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        this._draggedTaskId = null;
        this._draggedFromCol = null;
        columns.forEach(col => col.classList.remove('drag-over'));
      });
    });

    columns.forEach(col => {
      const colId = col.getAttribute('data-column-id');

      col.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (this._draggedTaskId && colId !== this._draggedFromCol) {
          col.classList.add('drag-over');
        }
      });

      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain') || this._draggedTaskId;
        if (!taskId) return;

        this._dropTaskInColumn(taskId, colId);
      });
    });
  }

  /**
   * Touch Drag-and-Drop — Mobile support.
   */
  _setupTouchDragAndDrop() {
    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const LONG_PRESS_MS = 320;
    const DRAG_THRESHOLD = 8;

    cards.forEach(card => {
      let pressTimer = null;
      let touchStartX = 0;
      let touchStartY = 0;
      let isDragActive = false;

      card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isDragActive = false;

        pressTimer = setTimeout(() => {
          isDragActive = true;
          this._activateTouchDrag(card, touch);
          if (navigator.vibrate) navigator.vibrate(35);
        }, LONG_PRESS_MS);
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);

        if (!isDragActive && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        if (isDragActive && this._touchDragState) {
          e.preventDefault();
          this._onTouchDragMove(e.touches[0]);
        }
      }, { passive: false });

      card.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        pressTimer = null;

        if (isDragActive && this._touchDragState) {
          e.preventDefault();
          this._onTouchDragEnd(e.changedTouches[0]);
          isDragActive = false;
        }
      });

      card.addEventListener('touchcancel', () => {
        clearTimeout(pressTimer);
        pressTimer = null;
        if (isDragActive && this._touchDragState) {
          this._cancelTouchDrag();
          isDragActive = false;
        }
      });
    });
  }

  _activateTouchDrag(card, touch) {
    const taskId = card.getAttribute('data-task-id');
    const fromCol = card.getAttribute('data-task-status');
    const task = this.taskService.getTask(taskId);
    if (!task) return;

    const ghost = document.createElement('div');
    ghost.id = 'touch-drag-ghost';
    ghost.style.cssText = `
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      left: ${touch.clientX - 140}px;
      top: ${touch.clientY - 40}px;
      width: 280px;
      background: #0c66e4;
      color: #fff;
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 12px 40px rgba(12,102,228,0.45);
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0.96;
      max-width: 80vw;
    `;
    ghost.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0">drag_indicator</span>
      <div style="min-width:0">
        <div style="font-size:10px;opacity:0.8;font-weight:600">${task.code || ''}</div>
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${task.title}</div>
      </div>
    `;
    document.body.appendChild(ghost);

    card.classList.add('is-dragging');

    this._touchDragState = {
      taskId,
      fromCol,
      ghost,
      sourceCard: card,
      currentOverCol: null
    };
  }

  _onTouchDragMove(touch) {
    const state = this._touchDragState;
    if (!state) return;

    const x = touch.clientX;
    const y = touch.clientY;

    state.ghost.style.left = `${x - 140}px`;
    state.ghost.style.top  = `${y - 40}px`;

    state.ghost.style.display = 'none';
    const elUnder = document.elementFromPoint(x, y);
    state.ghost.style.display = '';

    const targetCol = elUnder?.closest('.kanban-column');
    const targetColId = targetCol?.getAttribute('data-column-id') ?? null;

    if (targetColId !== state.currentOverCol) {
      this.element.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
      if (targetColId && targetColId !== state.fromCol) {
        targetCol.classList.add('drag-over');
      }
      state.currentOverCol = targetColId;
    }
  }

  _onTouchDragEnd(touch) {
    const state = this._touchDragState;
    if (!state) return;

    const x = touch.clientX;
    const y = touch.clientY;

    state.ghost.style.display = 'none';
    const elUnder = document.elementFromPoint(x, y);
    const targetCol = elUnder?.closest('.kanban-column');
    const targetColId = targetCol?.getAttribute('data-column-id') ?? null;

    this._cleanupTouchDrag();

    if (targetColId && targetColId !== state.fromCol) {
      this._dropTaskInColumn(state.taskId, targetColId);
    } else {
      state.sourceCard.classList.remove('is-dragging');
    }
  }

  _cancelTouchDrag() {
    const state = this._touchDragState;
    if (!state) return;
    this._cleanupTouchDrag();
    state.sourceCard.classList.remove('is-dragging');
  }

  _cleanupTouchDrag() {
    const state = this._touchDragState;
    if (!state) return;

    if (state.ghost && state.ghost.parentNode) {
      state.ghost.parentNode.removeChild(state.ghost);
    }

    this.element.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });

    this._touchDragState = null;
  }

  _dropTaskInColumn(taskId, colId) {
    const task = this.taskService.getTask(taskId);
    if (!task || task.status === colId) return;

    this.taskService.updateTaskStatus(taskId, colId);
    this.mount(this.element);

    requestAnimationFrame(() => {
      const newCard = this.element.querySelector(`.kanban-card[data-task-id="${taskId}"]`);
      if (newCard) {
        newCard.classList.add('drop-snap');
        newCard.addEventListener('animationend', () => newCard.classList.remove('drop-snap'), { once: true });
      }
    });
  }

  _closeAllPopups() {
    const popups = [
      '#popup-view-switcher',
      '#popup-board-members',
      '#modal-powerups',
      '#modal-automation',
      '#popup-filter',
      '#popup-visibility',
      '#modal-share',
      '#drawer-more-menu',
      '#modal-switch-boards'
    ];
    popups.forEach(sel => {
      const el = this.element.querySelector(sel);
      if (el) el.classList.add('hidden');
    });
  }

  _togglePopup(selector) {
    const el = this.element.querySelector(selector);
    if (!el) return;
    const isCurrentlyHidden = el.classList.contains('hidden');
    this._closeAllPopups();
    if (isCurrentlyHidden) {
      el.classList.remove('hidden');
    }
  }

  bindEvents() {
    // 1. Back to Home (Beranda)
    const backHomeBtn = this.element.querySelector('#btn-kanban-back-home');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // 2. Add Kanban Task from top bar
    const addTaskBtn = this.element.querySelector('#btn-add-kanban-task');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.modalManager.open('new-task', {
          workspace: this.currentWorkspace,
          projectId: this.projectId
        });
      });
    }

    // 3. Quick Add Card in Column
    const quickAddBtns = this.element.querySelectorAll('.btn-quick-add-col');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.getAttribute('data-column-id');
        this.modalManager.open('new-task', {
          workspace: this.currentWorkspace,
          projectId: this.projectId,
          status: colId
        });
      });
    });

    // 4. Card click opens Task Detail
    const cards = this.element.querySelectorAll('.kanban-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const taskId = card.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (task && this.modalManager) {
          this.modalManager.open('task-detail', { task });
        }
      });
    });

    // 5. Shift column buttons
    const columnOrder = this.columns.map(c => c.id);
    const shiftButtons = this.element.querySelectorAll('.btn-shift-col');
    shiftButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const dir    = btn.getAttribute('data-dir');
        const task   = this.taskService.getTask(taskId);
        if (task) {
          const currentIndex = columnOrder.indexOf(task.status);
          const newIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
          if (newIndex >= 0 && newIndex < columnOrder.length) {
            this.taskService.updateTaskStatus(taskId, columnOrder[newIndex]);
            this.mount(this.element);
          }
        }
      });
    });

    // 6. Star board toggle
    const starBtn = this.element.querySelector('#btn-star-board');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isStarred = !this.isStarred;
        localStorage.setItem(`starred_board_${this.currentWorkspace}`, this.isStarred ? 'true' : 'false');
        if (this.notificationService) {
          this.notificationService.success(this.isStarred ? 'Papan ditambahkan ke favorit ⭐' : 'Papan dihapus dari favorit');
        }
        this.mount(this.element);
      });
    }

    // 7. Setup Drag & Drop
    this._setupDragAndDrop();

    // 8. Setup List Collapse Button Toggle
    const collapseBtns = this.element.querySelectorAll('[data-testid="list-collapse-button"]');
    collapseBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const col = btn.closest('.kanban-column');
        if (col) {
          col.classList.toggle('is-collapsed');
        }
      });
    });

    const columns = this.element.querySelectorAll('.kanban-column');
    columns.forEach(col => {
      col.addEventListener('click', (e) => {
        if (col.classList.contains('is-collapsed')) {
          col.classList.remove('is-collapsed');
        }
      });
    });

    // 9. Remove / Delete Single Card from Kanban (with Undo, no confirm prompt)
    const deleteCardBtns = this.element.querySelectorAll('.btn-delete-kanban-card');
    deleteCardBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (!task) return;

        const taskTitle = task.title;
        const result = this.taskService.deleteTask(taskId, true);
        this.mount(this.element);

        if (this.notificationService && result) {
          const truncatedTitle = taskTitle.length > 32 ? taskTitle.substring(0, 32) + '...' : taskTitle;
          this.notificationService.showWithAction(
            `Kartu "${truncatedTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTask(result.task, result.index);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        }
      });
    });

    // 10. Clear / Remove all cards in a Kanban Column (with Undo, no confirm prompt)
    const clearColBtns = this.element.querySelectorAll('.btn-clear-kanban-col');
    clearColBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        const tasksInCol = this.taskService.getTasks().filter(t => {
          if (this.projectId) {
            return t.status === colId && (t.projectId === this.projectId || (!t.projectId && t.workspace === this.currentWorkspace));
          }
          return t.status === colId && t.workspace === this.currentWorkspace;
        });

        if (tasksInCol.length === 0) {
          if (this.notificationService) {
            this.notificationService.info(`Kolom "${colTitle}" sudah kosong.`);
          }
          return;
        }

        const removedItems = [];
        tasksInCol.forEach(t => {
          const res = this.taskService.deleteTask(t.id, true);
          if (res) removedItems.push(res);
        });
        this.mount(this.element);

        if (this.notificationService && removedItems.length > 0) {
          this.notificationService.showWithAction(
            `${removedItems.length} kartu di kolom "${colTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTasks(removedItems);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        }
      });
    });

    // ==================== INTERACTIVE BEHAVIORS FOR ALL ICONS ====================

    // A. View Switcher Dropdown [|||] v
    const viewSwitchBtn = this.element.querySelector('#btn-board-view-switch');
    if (viewSwitchBtn) {
      viewSwitchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-view-switcher');
      });
    }

    const selectViewBtns = this.element.querySelectorAll('.btn-select-view');
    selectViewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetView = btn.getAttribute('data-view');
        this._closeAllPopups();
        if (targetView === 'kanban') {
          if (this.notificationService) {
            this.notificationService.info('Anda sedang berada di Tampilan Papan.');
          }
        } else {
          this.eventBus.emit('navigate', { view: targetView, workspace: this.currentWorkspace, projectId: this.projectId });
        }
      });
    });

    // B. Member Avatar [ A ]
    const avatarBtn = this.element.querySelector('#btn-board-avatar');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-board-members');
      });
    }

    const openInviteMemberBtn = this.element.querySelector('#btn-open-invite-member');
    if (openInviteMemberBtn) {
      openInviteMemberBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        if (this.modalManager) {
          this.modalManager.open('add-member', { workspace: this.currentWorkspace });
        }
      });
    }

    // C. Power-Ups Icon (Plug)
    const powerupsBtn = this.element.querySelector('#btn-board-powerups');
    if (powerupsBtn) {
      powerupsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#modal-powerups');
      });
    }

    const powerupToggles = this.element.querySelectorAll('.powerup-toggle');
    powerupToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const name = toggle.getAttribute('data-name');
        const state = toggle.checked ? 'diaktifkan' : 'dinonaktifkan';
        if (this.notificationService) {
          this.notificationService.success(`Power-Up ${name} berhasil ${state}.`);
        }
      });
    });

    // D. Automation / Butler Icon (Bolt)
    const automationBtn = this.element.querySelector('#btn-board-automation');
    if (automationBtn) {
      automationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#modal-automation');
      });
    }

    const autoToggles = this.element.querySelectorAll('.automation-toggle');
    autoToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const rule = toggle.getAttribute('data-rule');
        const state = toggle.checked ? 'aktif' : 'nonaktif';
        if (this.notificationService) {
          this.notificationService.info(`Aturan automasi "${rule}" sekarang ${state}.`);
        }
      });
    });

    // E. Filter Icon (Funnel)
    const filterBtn = this.element.querySelector('#btn-board-filter');
    if (filterBtn) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-filter');
      });
    }

    const filterOptionBtns = this.element.querySelectorAll('.btn-set-filter');
    filterOptionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fVal = btn.getAttribute('data-filter');
        this.activeFilter = fVal;
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info(`Filter diterapkan: ${fVal === 'all' ? 'Semua Kartu' : fVal}`);
        }
        this.mount(this.element);
      });
    });

    const resetFilterChip = this.element.querySelector('#btn-reset-filter-chip');
    if (resetFilterChip) {
      resetFilterChip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeFilter = 'all';
        this.mount(this.element);
      });
    }

    // F. Visibility Icon (Group)
    const visibilityBtn = this.element.querySelector('#btn-board-visibility');
    if (visibilityBtn) {
      visibilityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-visibility');
      });
    }

    const setVisBtns = this.element.querySelectorAll('.btn-set-visibility');
    setVisBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vVal = btn.getAttribute('data-vis');
        this.boardVisibility = vVal;
        localStorage.setItem(`board_vis_${this.currentWorkspace}`, vVal);
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Visibilitas papan diubah menjadi "${vVal}".`);
        }
        this.mount(this.element);
      });
    });

    // G. Share Button
    const shareBtn = this.element.querySelector('#btn-board-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#modal-share');
      });
    }

    const copyLinkBtn = this.element.querySelector('#btn-copy-share-link');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const linkInput = this.element.querySelector('#input-share-link');
        if (linkInput) {
          try {
            await navigator.clipboard.writeText(linkInput.value);
            if (this.notificationService) {
              this.notificationService.success('Tautan papan berhasil disalin ke clipboard!');
            }
          } catch (err) {
            linkInput.select();
            document.execCommand('copy');
            if (this.notificationService) {
              this.notificationService.success('Tautan papan berhasil disalin!');
            }
          }
        }
      });
    }

    const sendEmailInviteBtn = this.element.querySelector('#btn-send-email-invite');
    if (sendEmailInviteBtn) {
      sendEmailInviteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emailInput = this.element.querySelector('#input-invite-email');
        if (emailInput && emailInput.value.trim()) {
          if (this.notificationService) {
            this.notificationService.success(`Undangan berhasil dikirimkan ke ${emailInput.value.trim()}!`);
          }
          emailInput.value = '';
          this._closeAllPopups();
        } else if (this.notificationService) {
          this.notificationService.warning('Silakan masukkan alamat email yang valid.');
        }
      });
    }

    // H. More Menu Drawer [...]
    const moreMenuBtn = this.element.querySelector('#btn-board-more-menu');
    if (moreMenuBtn) {
      moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#drawer-more-menu');
      });
    }

    const themeBtns = this.element.querySelectorAll('.btn-select-theme');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-theme-type');
        const name = btn.getAttribute('data-theme-name');
        const val  = btn.getAttribute('data-theme-val');
        const themeObj = { type, name, value: val };
        localStorage.setItem(`board_theme_${this.currentWorkspace}`, JSON.stringify(themeObj));
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Tema papan diubah ke "${name}".`);
        }
        this.mount(this.element);
      });
    });

    const exportBtn = this.element.querySelector('#btn-export-board-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentWs = this.currentWorkspace;
        const tasks = this.taskService.getTasks().filter(t => t.workspace === currentWs);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
          workspace: currentWs,
          exportedAt: new Date().toISOString(),
          columns: this.columns,
          tasks
        }, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `board-${currentWs}-${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        if (this.notificationService) {
          this.notificationService.success('Data papan berhasil diekspor.');
        }
        this._closeAllPopups();
      });
    }

    const archiveBtn = this.element.querySelector('#btn-archive-board');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info(`Papan "${this.getWorkspaceName(this.currentWorkspace)}" telah diarsipkan.`);
        }
      });
    }

    // Modal Close Buttons
    const closeBtns = this.element.querySelectorAll('.btn-close-modal, .btn-close-drawer');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
      });
    });

    // Close popups when clicking outside
    this.element.addEventListener('click', (e) => {
      const isInsidePopup = e.target.closest('#popup-view-switcher, #popup-board-members, #modal-powerups, #modal-automation, #popup-filter, #popup-visibility, #modal-share, #drawer-more-menu, #modal-switch-boards');
      const isTrigger = e.target.closest('#btn-board-view-switch, #btn-board-avatar, #btn-board-powerups, #btn-board-automation, #btn-board-filter, #btn-board-visibility, #btn-board-share, #btn-board-more-menu, #btn-dock-switch');
      if (!isInsidePopup && !isTrigger) {
        this._closeAllPopups();
      }
    });

    // ==================== LEFT INBOX DRAWER INTERACTION ====================
    const closeInboxBtn = this.element.querySelector('#btn-close-inbox');
    if (closeInboxBtn) {
      closeInboxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isInboxOpen = false;
        this.mount(this.element);
      });
    }

    const formInboxAddCard = this.element.querySelector('#form-inbox-add-card');
    if (formInboxAddCard) {
      formInboxAddCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = this.element.querySelector('#input-inbox-card-title');
        const val = input ? input.value.trim() : '';
        if (!val) {
          if (this.notificationService) {
            this.notificationService.warning('Ketikkan nama kartu terlebih dahulu.');
          }
          return;
        }

        const newTask = this.taskService.addTask({
          title: val,
          workspace: this.currentWorkspace,
          status: 'backlog',
          priority: 'Medium',
          pic: { name: 'Awa', initials: 'AW', role: 'Owner' }
        });

        this.highlightTaskId = newTask.id;
        this.mount(this.element);

        if (this.notificationService) {
          this.notificationService.success(`Kartu "${val}" berhasil ditambahkan ke To Do!`);
        }
      });
    }

    const inboxAppBadges = this.element.querySelectorAll('.btn-inbox-app-badge');
    inboxAppBadges.forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const appName = badge.getAttribute('data-app');
        if (this.notificationService) {
          this.notificationService.info(`Integrasi ${appName} aktif dan siap menyinkronkan tugas ke Inbox.`);
        }
      });
    });

    const inboxTuneBtn = this.element.querySelector('#btn-inbox-tune');
    if (inboxTuneBtn) {
      inboxTuneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.notificationService) {
          this.notificationService.info('Inbox diurutkan berdasarkan tanggal terbaru.');
        }
      });
    }

    const inboxMoreBtn = this.element.querySelector('#btn-inbox-more');
    if (inboxMoreBtn) {
      inboxMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.notificationService) {
          this.notificationService.info('Opsi Inbox: Arsipkan tugas lama & bersihkan tuntas.');
        }
      });
    }

    // ==================== FLOATING BOTTOM DOCK INTERACTION ====================

    // Dock 1: Inbox Toggle
    const dockInboxBtn = this.element.querySelector('#btn-dock-inbox');
    if (dockInboxBtn) {
      dockInboxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isInboxOpen = !this.isInboxOpen;
        this.mount(this.element);
      });
    }

    // Dock 2: Planner (Navigate to Calendar View)
    const dockPlannerBtn = this.element.querySelector('#btn-dock-planner');
    if (dockPlannerBtn) {
      dockPlannerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eventBus.emit('navigate', { view: 'calendar', workspace: this.currentWorkspace });
      });
    }

    // Dock 3: Board (Reset/Focus Board)
    const dockBoardBtn = this.element.querySelector('#btn-dock-board');
    if (dockBoardBtn) {
      dockBoardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scrollArea = this.element.querySelector('#kanban-scroll-area');
        if (scrollArea) {
          scrollArea.scrollTo({ left: 0, behavior: 'smooth' });
        }
        if (this.notificationService) {
          this.notificationService.info('Tampilan Papan aktif.');
        }
      });
    }

    // Dock 4: Switch Boards
    const dockSwitchBtn = this.element.querySelector('#btn-dock-switch');
    if (dockSwitchBtn) {
      dockSwitchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#modal-switch-boards');
      });
    }

    const switchWsBtns = this.element.querySelectorAll('.btn-switch-ws');
    switchWsBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetWs = btn.getAttribute('data-ws');
        this.currentWorkspace = targetWs;
        localStorage.setItem('active_workspace', targetWs);
        this.eventBus.emit('workspace:selected', { workspace: targetWs });
        this.setWorkspace(targetWs);
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Beralih ke papan "${this.getWorkspaceName(targetWs)}".`);
        }
        this.mount(this.element);
      });
    });

    // ==================== + ADD ANOTHER LIST (TRELLO STYLE) ====================
    const addAnotherListBtn = this.element.querySelector('#btn-add-another-list');
    if (addAnotherListBtn) {
      addAnotherListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isAddingList = true;
        this.mount(this.element);
      });
    }

    const cancelAddListBtn = this.element.querySelector('#btn-cancel-add-list');
    if (cancelAddListBtn) {
      cancelAddListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isAddingList = false;
        this.mount(this.element);
      });
    }

    const confirmAddListBtn = this.element.querySelector('#btn-confirm-add-list');
    const inputNewList = this.element.querySelector('#input-new-list-title');

    const handleCreateNewList = () => {
      const val = inputNewList ? inputNewList.value.trim() : '';
      if (!val) {
        if (this.notificationService) {
          this.notificationService.warning('Silakan masukkan judul daftar baru.');
        }
        return;
      }

      const newColId = 'col-' + Date.now();
      const newCol = {
        id: newColId,
        title: val,
        color: 'border-indigo-500',
        dot: 'bg-indigo-500',
        badge: 'bg-indigo-100 text-indigo-700'
      };

      this.columns.push(newCol);
      localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
      this.isAddingList = false;

      if (this.notificationService) {
        this.notificationService.success(`Kolom "${val}" berhasil ditambahkan ke papan!`);
      }
      this.mount(this.element);
    };

    if (confirmAddListBtn) {
      confirmAddListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCreateNewList();
      });
    }

    if (inputNewList) {
      inputNewList.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCreateNewList();
        } else if (e.key === 'Escape') {
          this.isAddingList = false;
          this.mount(this.element);
        }
      });
    }

    // Highlight kartu yang baru dibuat bila ada
    if (this.highlightTaskId) {
      const targetId = this.highlightTaskId;
      this.highlightTaskId = null;
      requestAnimationFrame(() => {
        const card = this.element.querySelector(`.kanban-card[data-task-id="${targetId}"]`);
        if (card) {
          card.classList.add('drop-snap', 'ring-2', 'ring-primary', 'ring-offset-2');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          setTimeout(() => {
            card.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      });
    }
  }
}

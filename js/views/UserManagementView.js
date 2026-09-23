import { BaseView } from '../core/BaseView.js';
import { apiService } from '../services/ApiService.js';
import { supabaseService } from '../services/SupabaseService.js';

import { DEFAULT_SEEDED_USERS } from '../data/seedUsers.js';
export { DEFAULT_SEEDED_USERS };

/**
 * UserManagementView - Halaman Manajemen Pengguna untuk Administrator
 * Memungkinkan Admin melihat daftar karyawan/siswa PKL, mengelola perangkat, membuat akun baru,
 * mengedit akun, mengatur penugasan papan kanban & tugas, mereset perangkat HP, dan login langsung ke akun.
 */
export class UserManagementView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container ? container.resolve('AuthService') : null;
    this.notificationService = container ? container.resolve('NotificationService') : null;
    this.projectService = container ? container.resolve('ProjectService') : null;
    this.taskService = container ? container.resolve('TaskService') : null;
    this.supabaseService = (container && container.resolve('SupabaseService')) || supabaseService;

    this.searchQuery = '';
    this.editingUser = null;
    this.isCreateModalOpen = false;
    this.isEditModalOpen = false;

    this.defaultUsers = [];

    this.broadcastChannel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('creative_office_user_sync');
        this.broadcastChannel.onmessage = (e) => {
          if (e.data && e.data.type === 'USERS_MODIFIED') {
            this.syncFromBackend(true);
          }
        };
      } catch (e) {}
    }

    // Polling background setiap 15 detik agar perubahan dari admin lain otomatis sinkron
    this.syncInterval = setInterval(() => {
      this.syncFromBackend(true);
    }, 15000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncFromBackend(true);
        }
      });
    }

    if (this.eventBus) {
      this.eventBus.on('projects:updated', () => {
        if (this.element) {
          this._refreshBoardSelectors();
        }
      });
    }

    this._initUsers();
    // Sinkronkan data terbaru dari server saat view dibuat
    this.syncFromBackend(true);
  }

  async syncFromBackend(silent = false) {
    try {
      let remoteUsers = null;

      // 1. Coba ambil langsung dari Supabase tabel users jika client terhubung
      if (this.supabaseService && this.supabaseService.isConfigured()) {
        try {
          const sbUsers = await this.supabaseService.getUsers();
          if (Array.isArray(sbUsers) && sbUsers.length > 0) {
            const defaultBoard = this.getAvailableBoards()[0];
            const defId = defaultBoard?.id || 'panen-kunci';
            const defWs = defaultBoard?.workspace || defId;
            const defName = defaultBoard?.name || 'Panen Kunci';

            remoteUsers = sbUsers.map(row => ({
              id: row.id,
              username: row.username || (row.email ? `@${row.email.split('@')[0]}` : `@${row.name?.toLowerCase().replace(/\s+/g, '')}`),
              fullName: row.full_name || row.name,
              role: row.role || 'student',
              nip: row.nip || '',
              position: row.position || row.title || 'Anggota Tim',
              school: row.school || '',
              assignedProjectId: row.assigned_project_id || (row.workspace_access && row.workspace_access[0]) || defId,
              assignedWorkspace: row.assigned_workspace || (row.workspace_access && row.workspace_access[0]) || defWs,
              assignedBoardName: row.assigned_board_name || defName,
              assignedProjects: row.assigned_projects || (row.assigned_project_id ? [row.assigned_project_id] : (row.workspace_access || [defId])),
              assignedBoardNames: row.assigned_board_names || [row.assigned_board_name || defName],
              workspaceAccess: row.workspace_access || (row.assigned_projects ? row.assigned_projects : [row.assigned_project_id || defId]),
              assignedTaskId: row.assigned_task_id || 'all',
              assignedTaskTitle: row.assigned_task_title || 'Seluruh Papan (Semua Tugas)',
              device: row.bound_device_name || row.device || (row.bound_device_id ? 'Terikat' : 'Belum Terikat'),
              isDeviceBound: Boolean(row.bound_device_id || row.is_device_bound),
              telegramChat: row.telegram_chat || '',
              telegramId: row.telegram_id || '',
              apiDeposit: row.api_deposit || '',
              qr_data: row.qr_data || row.username || row.name,
              updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
            }));
          }
        } catch (sbErr) {
          console.warn('[UserManagementView] Direct Supabase fetch users warning:', sbErr.message);
        }
      }

      // 2. Fallback ke API backend
      if (remoteUsers === null) {
        remoteUsers = await apiService.getManagedUsers();
      }

      if (Array.isArray(remoteUsers)) {
        // Filter out any user IDs that are in local deleted blocklist
        // This prevents sync from re-adding users that were deleted but not yet confirmed by Supabase
        const deletedIds = this._getDeletedIds();
        if (deletedIds.size > 0) {
          remoteUsers = remoteUsers.filter(u => !deletedIds.has(String(u.id)));
        }

        const stored = localStorage.getItem('creative_office_managed_users');
        const remoteStr = JSON.stringify(remoteUsers);

        if (stored !== remoteStr) {
          localStorage.setItem('creative_office_managed_users', remoteStr);
          this._updateTableBody();
          if (!silent && this.notificationService && remoteUsers.length > 0) {
            this.notificationService.info('Daftar pengguna disinkronkan dari database server.');
          }
        }
      }
    } catch (err) {
      console.warn('[UserManagementView] Sync backend warning:', err.message);
    }
  }

  _updateTableBody() {
    if (!this.element) return;
    const tbody = this.element.querySelector('tbody');
    if (!tbody) return;
    const allUsers = this.getUsers();
    const query = (this.searchQuery || '').trim().toLowerCase();
    const filtered = query
      ? allUsers.filter(u =>
          (u.username || '').toLowerCase().includes(query) ||
          (u.fullName || '').toLowerCase().includes(query) ||
          (u.position || '').toLowerCase().includes(query) ||
          (u.role || '').toLowerCase().includes(query) ||
          (u.nip || '').toLowerCase().includes(query) ||
          (u.assignedBoardName || '').toLowerCase().includes(query) ||
          (u.assignedTaskTitle || '').toLowerCase().includes(query)
        )
      : allUsers;

    tbody.innerHTML = filtered.length > 0
      ? filtered.map(u => this._renderUserRow(u)).join('')
      : (allUsers.length === 0 ? this._renderEmptyState() : this._renderSearchEmptyState());

    // Update total count badge
    const countBadge = this.element.querySelector('#badge-total-users');
    if (countBadge) {
      countBadge.textContent = `${allUsers.length} Pengguna`;
    }

    if (typeof this._bindRowEvents === 'function') {
      this._bindRowEvents();
    }
  }

  _initUsers() {
    try {
      const stored = localStorage.getItem('creative_office_managed_users');
      let currentUsers = [];
      if (stored) {
        try { currentUsers = JSON.parse(stored); } catch (e) {}
      }

      // Bersihkan jika masih berisi data default lama yang sudah dihapus di Supabase
      const defaultLegacyIds = ['usr-1790046404637', 'usr-1790046919250', 'usr-1790049070981'];
      const defaultLegacyUsernames = ['@nazwaaulial', '@jax_ck', '@fazlies'];
      if (Array.isArray(currentUsers) && currentUsers.length > 0) {
        const onlyLegacy = currentUsers.every(u => 
          defaultLegacyIds.includes(u.id) || 
          defaultLegacyUsernames.includes(u.username)
        );
        if (onlyLegacy) {
          localStorage.setItem('creative_office_managed_users', JSON.stringify(DEFAULT_SEEDED_USERS));
          return;
        }
      }

      if (!Array.isArray(currentUsers) || currentUsers.length === 0) {
        localStorage.setItem('creative_office_managed_users', JSON.stringify(DEFAULT_SEEDED_USERS));
      }
    } catch (e) {}
  }

  /** Mendapatkan daftar ID pengguna yang sudah dihapus secara lokal (blocklist) */
  _getDeletedIds() {
    try {
      const raw = localStorage.getItem('creative_office_deleted_user_ids');
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {}
    return new Set();
  }

  /** Menambahkan ID ke blocklist pengguna dihapus */
  _addDeletedId(id) {
    const ids = this._getDeletedIds();
    ids.add(String(id));
    try {
      localStorage.setItem('creative_office_deleted_user_ids', JSON.stringify([...ids]));
    } catch (e) {}
  }

  /** Menghapus ID dari blocklist (setelah benar-benar terhapus dari Supabase) */
  _removeDeletedId(id) {
    const ids = this._getDeletedIds();
    ids.delete(String(id));
    try {
      localStorage.setItem('creative_office_deleted_user_ids', JSON.stringify([...ids]));
    } catch (e) {}
  }

  getUsers() {
    try {
      const stored = localStorage.getItem('creative_office_managed_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deletedIds = this._getDeletedIds();
          // Filter out any user that is in the local deleted blocklist
          return deletedIds.size > 0 ? parsed.filter(u => !deletedIds.has(String(u.id))) : parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_SEEDED_USERS;
  }

  saveUsers(users) {
    try {
      localStorage.setItem('creative_office_managed_users', JSON.stringify(users));
      // 🚀 1. Langsung kirim dan sinkronkan ke Supabase jika aktif
      if (this.supabaseService && this.supabaseService.isConfigured()) {
        this.supabaseService.saveUsers(users).catch(err => {
          console.warn('[UserManagementView] Gagal sync users ke Supabase:', err.message);
        });
      }
      // 🚀 2. Langsung kirim ke Backend API & PostgreSQL (Port 5000 / LAN / Cloud)
      apiService.saveManagedUsers(users).catch(err => {
        console.warn('[UserManagementView] Gagal sync ke server backend:', err.message);
      });
      // Broadcast ke tab/jendela lain
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'USERS_MODIFIED', timestamp: Date.now() });
        } catch (e) {}
      }
    } catch (e) {}
  }

  /**
   * Helper untuk mendeteksi kunci kanonik papan proyek agar tidak terjadi opsi duplikat
   */
  _getCanonicalBoardKey(id, name, workspace) {
    return String(id || workspace || name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Mengambil daftar seluruh papan / project yang aktif di sistem tanpa duplikasi
   * Murni mengambil data live dari ProjectService / Supabase
   */
  getAvailableBoards() {
    let projects = [];
    if (this.projectService && typeof this.projectService.getAllProjects === 'function') {
      try {
        projects = this.projectService.getAllProjects();
      } catch (e) {}
    }

    // Fallback ke localStorage jika projectService belum termuat
    if (!projects || projects.length === 0) {
      try {
        const stored = localStorage.getItem('creative_office_projects');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            projects = parsed;
          }
        }
      } catch (e) {}
    }

    const map = new Map();
    (projects || []).forEach(p => {
      if (p && (p.id || p.name || p.title || p.workspace)) {
        const id = String(p.id || p.workspace || '').trim();
        const name = String(p.name || p.title || id).trim();
        const workspace = String(p.workspace || id).trim();
        const key = this._getCanonicalBoardKey(id, name, workspace);
        if (key && !map.has(key)) {
          map.set(key, {
            id: id,
            name: name,
            workspace: workspace
          });
        }
      }
    });

    return Array.from(map.values());
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _renderBoardChecklistHtml(type, availableBoards, selectedIds = []) {
    if (!availableBoards || availableBoards.length === 0) {
      return `
        <div class="p-3 text-center text-xs text-white/50 italic">
          Belum ada papan proyek aktif di sistem.
        </div>
      `;
    }
    return availableBoards.map(b => {
      const isChecked = selectedIds.includes(b.id) || selectedIds.includes(b.workspace);
      return `
        <label class="item-${type}-project-option flex items-center justify-between p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all text-xs select-none ${isChecked ? 'bg-purple-600/20 border border-purple-500/30' : 'border border-transparent'}">
          <div class="flex items-center gap-2 min-w-0 flex-1 mr-1">
            <input
              type="checkbox"
              class="cb-${type}-project rounded accent-purple-600 w-4 h-4 cursor-pointer shrink-0"
              value="${this.escapeHtml(b.id)}"
              data-name="${this.escapeHtml(b.name)}"
              ${isChecked ? 'checked' : ''}
            />
            <span class="truncate font-medium text-white/90 text-[11px] sm:text-[11.5px]">${this.escapeHtml(b.name)}</span>
          </div>
          <span class="text-[9px] sm:text-[9.5px] font-mono text-purple-300 bg-purple-500/20 border border-purple-400/30 px-1.5 py-0.5 rounded uppercase shrink-0">
            ${this.escapeHtml(b.workspace || b.id)}
          </span>
        </label>
      `;
    }).join('');
  }

  _renderBoardOptionsHtml(availableBoards, selectedIds = []) {
    return (availableBoards || []).map(b => {
      const isSelected = selectedIds.includes(b.id) || selectedIds.includes(b.workspace);
      return `<option value="${this.escapeHtml(b.id)}" data-name="${this.escapeHtml(b.name)}" ${isSelected ? 'selected' : ''}>${this.escapeHtml(b.name)}</option>`;
    }).join('');
  }

  /**
   * Mengambil daftar tugas untuk papan proyek tertentu
   */
  getTasksForBoard(boardId) {
    if (!this.taskService) return [];
    try {
      if (typeof this.taskService.getTasksForBoard === 'function') {
        const proj = this.projectService ? this.projectService.getProject(boardId) : null;
        return this.taskService.getTasksForBoard(proj || boardId, boardId);
      }
      return this.taskService.getTasks(boardId);
    } catch (e) {
      return this.taskService.getTasks ? this.taskService.getTasks(boardId) : [];
    }
  }

  /**
   * Mengambil daftar seluruh tugas dari satu atau banyak papan proyek secara bersih tanpa duplikasi tugas
   */
  getTasksForBoards(boardIds) {
    if (!this.taskService) return [];
    const list = Array.isArray(boardIds) ? boardIds : [boardIds];
    const map = new Map();
    const seenTitles = new Set();

    list.forEach(bId => {
      const tasks = this.getTasksForBoard(bId);
      if (Array.isArray(tasks)) {
        tasks.forEach(t => {
          if (!t || !t.id) return;
          const cleanTitle = String(t.title || '').trim().toLowerCase();
          const cleanId = String(t.id).trim();
          if (!map.has(cleanId) && !seenTitles.has(cleanTitle)) {
            map.set(cleanId, t);
            if (cleanTitle) seenTitles.add(cleanTitle);
          }
        });
      }
    });
    return Array.from(map.values());
  }

  render() {
    const allUsers = this.getUsers();
    const query = (this.searchQuery || '').trim().toLowerCase();
    const filteredUsers = query
      ? allUsers.filter(u =>
          (u.username || '').toLowerCase().includes(query) ||
          (u.fullName || '').toLowerCase().includes(query) ||
          (u.position || '').toLowerCase().includes(query) ||
          (u.role || '').toLowerCase().includes(query) ||
          (u.nip || '').toLowerCase().includes(query) ||
          (u.assignedBoardName || '').toLowerCase().includes(query) ||
          (u.assignedTaskTitle || '').toLowerCase().includes(query)
        )
      : allUsers;

    return `
      <div class="flex-1 p-4 md:p-8 select-none relative min-h-screen overflow-hidden text-white" style="background-color: #0b061a; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 50% 40%, rgba(124, 58, 237, 0.16) 0%, transparent 70%), radial-gradient(rgba(192, 132, 252, 0.16) 1.2px, transparent 1.2px); background-size: 100% 100%, 100% 100%, 100% 100%, 32px 32px; background-attachment: fixed;">
        <!-- Ambient Studio Glow Orbs -->
        <div class="creativoffice-orb bg-purple-600/25 w-[460px] h-[460px] -top-24 -left-20"></div>
        <div class="creativoffice-orb bg-amber-500/15 w-[420px] h-[420px] top-64 -right-16"></div>

        <div class="relative z-10 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6">
          <datalist id="school-datalist">
            <option value="SMKN 2 Sukabumi"></option>
            <option value="SMK PGRI 1 Cimahi"></option>
            <option value="Universitas Jenderal Achmad Yani"></option>
          </datalist>

          <!-- Navigation Back & Quick Actions -->
          <div class="flex items-center justify-between">
            <button
              id="btn-back-to-dashboard"
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold shadow-sm border border-white/15 backdrop-blur-md transition-all cursor-pointer active:scale-95"
              title="Kembali ke Dashboard Utama"
            >
              <span class="material-symbols-outlined text-[17px]">arrow_back</span>
              <span>Kembali ke Dashboard</span>
            </button>

            <div class="flex items-center gap-2">
              ${allUsers.length > 0 ? `
              <button
                id="btn-clear-all-users"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Hapus / Kosongkan Seluruh Pengguna"
              >
                <span class="material-symbols-outlined text-[15px]">delete_sweep</span>
                <span>Kosongkan Pengguna</span>
              </button>
              ` : ''}

              <span class="text-xs font-semibold text-white/70 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
                Total: <span id="badge-total-users" class="text-purple-300 font-bold">${allUsers.length} Pengguna</span>
              </span>
            </div>
          </div>

          <!-- Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10.5px] font-mono font-bold tracking-wider uppercase text-white/60">Sistem Administrasi</span>
                <span class="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">CreativOffice</span>
              </div>
              <h1 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1 drop-shadow-sm">Manajemen Pengguna</h1>
              <p class="text-xs text-white/60 mt-1">Kelola akun karyawan, siswa PKL, penugasan papan kanban & tugas, serta kartu scan QR SampulKreativ</p>
            </div>

            <div class="flex items-center gap-2.5">
              <!-- Live Search Box -->
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-2.5 text-white/40 text-[18px]">search</span>
                <input
                  id="input-search-users"
                  type="text"
                  placeholder="Cari pengguna, peran, atau tugas..."
                  value="${this.searchQuery}"
                  class="w-48 sm:w-64 h-10 pl-9 pr-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 rounded-xl border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400/50 backdrop-blur-md transition-all shadow-inner"
                />
              </div>

              <button
                id="btn-open-create-user-modal"
                class="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg shadow-purple-950/50 border border-purple-400/35 transition-all cursor-pointer active:scale-95 shrink-0"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" x2="19" y1="8" y2="14"></line>
                  <line x1="22" x2="16" y1="11" y2="11"></line>
                </svg>
                <span>Buat Akun Baru</span>
              </button>
            </div>
          </div>

          <!-- Users Table Card -->
          <div class="bg-[#120d28]/75 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-purple-950/60 overflow-hidden border border-white/15">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[760px]">
                <thead>
                  <tr class="border-b border-white/10 bg-white/5">
                    <th class="text-left px-5 py-3.5 text-xs font-bold text-white/70 uppercase tracking-wider">Username</th>
                    <th class="text-left px-5 py-3.5 text-xs font-bold text-white/70 uppercase tracking-wider">Nama Lengkap</th>
                    <th class="text-left px-5 py-3.5 text-xs font-bold text-white/70 uppercase tracking-wider">Role</th>
                    <th class="text-left px-5 py-3.5 text-xs font-bold text-white/70 uppercase tracking-wider">Papan & Tugas Ditugaskan</th>
                    <th class="text-left px-5 py-3.5 text-xs font-bold text-white/70 uppercase tracking-wider">Perangkat Terikat</th>
                    <th class="text-left px-5 py-3.5 text-xs font-bold text-white/70 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${filteredUsers.length > 0
                    ? filteredUsers.map(u => this._renderUserRow(u)).join('')
                    : (allUsers.length === 0 ? this._renderEmptyState() : this._renderSearchEmptyState())
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Modals -->
          ${this._renderCreateModal()}
          ${this._renderEditModal()}
        </div>
      </div>
    `;
  }

  _renderEmptyState() {
    return `
      <tr>
        <td colspan="6" class="py-16 px-4 text-center">
          <div class="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div class="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 mb-3.5 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 class="text-base font-bold text-white">Belum Ada Pengguna</h3>
            <p class="text-xs text-white/60 mt-1 leading-relaxed">
              Belum ada pengguna yang didaftarkan. Anda dapat membuat akun baru dan menentukan tugas serta papan Kanban mereka sekarang.
            </p>
            <button
              id="btn-empty-create-user"
              type="button"
              class="mt-4 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-md border border-purple-400/35 transition-all cursor-pointer active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <line x1="19" x2="19" y1="8" y2="14"></line>
                <line x1="22" x2="16" y1="11" y2="11"></line>
              </svg>
              <span>Buat Akun Baru</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  _renderSearchEmptyState() {
    return `
      <tr>
        <td colspan="6" class="py-12 px-4 text-center">
          <div class="flex flex-col items-center justify-center max-w-xs mx-auto text-white/40">
            <span class="material-symbols-outlined text-[32px] text-white/40 mb-1">search_off</span>
            <p class="text-xs font-semibold text-white/80">Tidak ada pengguna yang cocok</p>
            <p class="text-[11px] text-white/40 mt-0.5">Coba gunakan kata kunci pencarian yang lain</p>
          </div>
        </td>
      </tr>
    `;
  }

  _renderUserRow(u) {
    const roleBadgeClass = u.role === 'admin'
      ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
      : (u.role === 'student' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30' : 'bg-blue-500/20 text-blue-300 border border-blue-400/30');

    const deviceBadge = u.isDeviceBound
      ? `<span class="font-semibold px-2 py-1 bg-white/10 text-white/90 border border-white/10 rounded-lg text-xs inline-flex items-center gap-1" title="${u.device}">
           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone text-purple-300" aria-hidden="true">
             <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
             <path d="M12 18h.01"></path>
           </svg> ${u.device}
         </span>`
      : `<span class="font-semibold px-2 py-1 bg-white/5 text-white/40 border border-white/5 rounded-lg text-xs">Belum Terikat</span>`;

    let boardList = [];
    if (Array.isArray(u.assignedBoardNames) && u.assignedBoardNames.length > 0) {
      boardList = u.assignedBoardNames;
    } else if (u.assignedBoardName) {
      boardList = u.assignedBoardName.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(u.assignedProjects) && u.assignedProjects.length > 0) {
      boardList = u.assignedProjects;
    } else if (u.assignedProjectId) {
      boardList = [u.assignedProjectId === 'panen-kunci' ? 'Panen Kunci' : u.assignedProjectId];
    }

    const coreMap = {
      'proj-1790146409036-876': 'Panen Kunci',
      'proj-1790146434093-686': 'Creative Office',
      'proj-1790146459019-450': 'AIKreativ',
      'proj-1790146474472-592': 'Sharinginaja',
      'proj-1790146495006-9': 'Ruang Kreasi',
      'proj-1790146512680-427': 'LayarBaca',
      'panen-kunci': 'Panen Kunci',
      'creativoffice': 'Creative Office',
      'aikreativ': 'AIKreativ',
      'sharinginaja': 'Sharinginaja',
      'ruangkreasi': 'Ruang Kreasi',
      'layarbaca': 'LayarBaca'
    };
    boardList = boardList.map(item => {
      const s = String(item).trim();
      if (coreMap[s]) return coreMap[s];
      if (coreMap[s.toLowerCase()]) return coreMap[s.toLowerCase()];
      const matchProj = this.getAvailableBoards().find(b => b.id === s || b.workspace === s);
      if (matchProj && matchProj.name) return matchProj.name;
      return s;
    });

    const primaryBoard = boardList[0] || (u.assignedProjectId === 'panen-kunci' ? 'Panen Kunci' : u.assignedProjectId) || 'Panen Kunci';
    const extraBoardsCount = boardList.length - 1;
    const allBoardsTooltip = boardList.join(', ');
    const hasTask = Boolean(u.assignedTaskTitle || u.assignedTaskId);

    return `
      <tr class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-white" data-user-id="${u.id}">
        <td class="px-5 py-4 text-sm font-mono text-purple-300 font-bold">${u.username}</td>
        <td class="px-5 py-4 text-sm text-white/80 font-medium">
          <div class="font-bold text-white">${u.fullName}</div>
          ${u.nip ? `<div class="text-[10px] text-amber-300 font-mono font-bold mt-0.5">${u.nip}</div>` : ''}
          <div class="text-xs text-white/50 font-normal mt-0.5">${u.position}</div>
          ${u.telegramChat ? `
            <div class="text-[10px] text-white/60 font-mono mt-0.5">
              <span class="font-extrabold text-teal-300">Telegram Chat:</span> ${u.telegramChat} <span class="text-white/20">|</span> <span class="font-bold text-white/40">ID:</span> ${u.telegramId || '-'}
            </div>
          ` : ''}
        </td>
        <td class="px-5 py-4">
          <span class="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${roleBadgeClass}">${u.role}</span>
        </td>
        <td class="px-5 py-4">
          ${boardList.length > 0 ? `
            <div class="flex flex-col gap-1 max-w-[260px]">
              <div class="flex items-center gap-1.5 flex-wrap">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 w-fit" title="${allBoardsTooltip}">
                  <span class="material-symbols-outlined text-[14px] text-indigo-300">view_kanban</span>
                  <span class="truncate max-w-[140px]">${primaryBoard}</span>
                </div>
                ${extraBoardsCount > 0 ? `
                  <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/35 shadow-xs cursor-default" title="${allBoardsTooltip}">
                    +${extraBoardsCount} papan
                  </span>
                ` : ''}
              </div>
              <div class="text-[11.5px] text-purple-200/90 font-medium flex items-center gap-1.5 truncate" title="${u.assignedTaskTitle || 'Akses Seluruh Tugas Papan'}">
                <span class="material-symbols-outlined text-[14px] text-amber-400 shrink-0">task_alt</span>
                <span class="truncate">${u.assignedTaskTitle || (hasTask ? 'Tugas Tertaut' : 'Seluruh Papan (Semua Tugas)')}</span>
              </div>
            </div>
          ` : `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
              <span class="material-symbols-outlined text-[14px]">block</span>
              <span>Belum Ditugaskan Papan</span>
            </span>
          `}
        </td>
        <td class="px-5 py-4 text-sm max-w-[150px] truncate">
          ${deviceBadge}
        </td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-2">
            ${u.role !== 'admin' ? `
              <button
                class="btn-user-login-direct ${boardList.length === 0 ? 'text-white/40 bg-white/5 border border-white/10 hover:bg-white/10' : 'text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30'} px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
                data-id="${u.id}"
                data-has-board="${boardList.length > 0 ? 'true' : 'false'}"
                title="${boardList.length > 0 ? `Masuk langsung ke Kanban ${primaryBoard} akun ${u.username} tanpa scan` : `Akun belum ditugaskan papan proyek`}"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-in" aria-hidden="true">
                  <path d="m10 17 5-5-5-5"></path>
                  <path d="M15 12H3"></path>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                </svg>
                <span class="text-[10.5px]">Masuk</span>
              </button>
            ` : ''}

            <button
              class="btn-user-edit text-white/50 hover:text-teal-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              data-id="${u.id}"
              title="Edit Akun & Penugasan Tugas"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen" aria-hidden="true">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
              </svg>
            </button>

            ${u.isDeviceBound ? `
              <button
                class="btn-user-reset-device text-white/50 hover:text-amber-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                data-id="${u.id}"
                title="Reset Perangkat HP"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone" aria-hidden="true">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                  <path d="M12 18h.01"></path>
                </svg>
              </button>
            ` : ''}


            <button
              class="btn-user-delete text-white/50 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              data-id="${u.id}"
              title="Hapus Akun Permanen"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2 lucide-trash-2" aria-hidden="true">
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M3 6h18"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  _renderCreateModal() {
    const availableBoards = this.getAvailableBoards();
    const defaultBoard = availableBoards.length > 0 ? availableBoards[0] : null;
    const defaultIds = defaultBoard ? [defaultBoard.id] : [];

    return `
      <div id="modal-create-user" class="hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div class="bg-[#0e0a22]/95 backdrop-blur-2xl rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl shadow-purple-950/80 border border-white/15 text-white max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar my-auto" style="background-color: #0e0a22; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%);">
          <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3 sm:mb-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-400 text-[20px] sm:text-[22px]">person_add</span>
              <h3 class="text-base sm:text-lg font-bold text-white">Buat Akun & Penugasan Baru</h3>
            </div>
            <button id="btn-close-create-user" class="text-white/50 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" type="button">
              <span class="material-symbols-outlined text-[18px] sm:text-[20px]">close</span>
            </button>
          </div>

          <form id="form-create-user" class="flex flex-col gap-3 sm:gap-3.5">
            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Username (dengan @)</label>
              <input id="input-new-username" type="text" placeholder="@contohuser" required class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Nama Lengkap</label>
              <input id="input-new-fullname" type="text" placeholder="Nama Lengkap Karyawan/Siswa" required class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Role</label>
                <select id="select-new-role" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  <option value="student">student (Siswa PKL)</option>
                  <option value="employee" selected>employee (Karyawan)</option>
                  <option value="admin">admin (Administrator)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Nomor Induk (NIP/NISN)</label>
                <input id="input-new-nip" type="text" placeholder="2026..." class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Posisi / Jabatan</label>
              <input id="input-new-position" type="text" placeholder="Contoh: Frontend Developer / UI Designer / Siswa PKL" required class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <!-- Penugasan Papan Kanban & Tugas -->
            <div class="p-3 sm:p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col gap-2.5 sm:gap-3">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-purple-300 text-[18px]">assignment</span>
                <span class="text-xs font-bold text-purple-200">Penugasan Papan Kanban & Tugas</span>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5 gap-2">
                  <label class="block text-[11px] font-semibold text-white/80 truncate">Tujuan Papan Kanban (Bisa &gt; 1)</label>
                  <span id="count-selected-new-projects" class="text-[9.5px] sm:text-[10px] font-bold text-white/50 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full shadow-xs shrink-0">0 Papan Terpilih</span>
                </div>

                <!-- Custom Multi-Select Dropdown Trigger -->
                <div
                  id="trigger-new-projects"
                  class="w-full min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/15 bg-[#171135] text-white text-xs cursor-pointer flex items-center justify-between hover:border-purple-400 transition-colors shadow-inner select-none"
                  role="button"
                  tabindex="0"
                  title="Klik untuk memilih satu atau beberapa papan proyek"
                >
                  <div id="tags-selected-new-projects" class="flex items-center gap-1 sm:gap-1.5 flex-wrap flex-1 py-0.5 min-w-0">
                    <span class="text-white/40 text-[10.5px] italic">Klik untuk memilih papan proyek...</span>
                  </div>
                  <span id="icon-chevron-new-projects" class="material-symbols-outlined text-[18px] text-white/60 shrink-0 ml-1.5 transition-transform duration-200">expand_more</span>
                </div>

                <!-- Dropdown Checklist Panel -->
                <div id="panel-new-projects-dropdown" class="hidden mt-1.5 p-2 sm:p-2.5 rounded-xl border border-white/15 bg-[#110c29] flex flex-col gap-2 max-h-52 sm:max-h-56 overflow-y-auto custom-scrollbar shadow-2xl z-20 relative">
                  <!-- Search Bar & Quick Actions -->
                  <div class="flex items-center gap-1.5 pb-2 border-b border-white/10">
                    <div class="relative flex-1 min-w-0">
                      <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[13px] sm:text-[14px] text-white/40">search</span>
                      <input
                        id="input-search-new-boards"
                        type="text"
                        placeholder="Cari papan..."
                        class="w-full pl-6 sm:pl-7 pr-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10.5px] sm:text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <button type="button" id="btn-select-all-new-projects" class="text-[9.5px] sm:text-[10px] text-purple-300 hover:text-purple-200 font-semibold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Semua
                    </button>
                    <button type="button" id="btn-clear-all-new-projects" class="text-[9.5px] sm:text-[10px] text-white/40 hover:text-white/70 font-semibold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Reset
                    </button>
                  </div>

                  <!-- Board Checklist -->
                  <div id="checklist-new-projects-wrap" class="flex flex-col gap-1">
                    ${this._renderBoardChecklistHtml('new', availableBoards, [])}
                  </div>
                </div>

                <!-- Hidden Synced Native Select -->
                <select id="select-new-project" multiple class="hidden">
                  ${this._renderBoardOptionsHtml(availableBoards, [])}
                </select>

                <p class="text-[9.5px] sm:text-[10px] text-white/50 mt-1">Saat scan QR SampulKreativ, pengguna memiliki hak akses ke seluruh papan yang dipilih.</p>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-white/80 mb-1">Tugas Khusus untuk Pengguna Ini</label>
                <div class="relative">
                  <select id="select-new-task" class="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 appearance-none pr-8 cursor-pointer transition-colors truncate">
                    <option value="all">⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
                    <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>

              <div id="wrap-new-custom-task" class="hidden">
                <label class="block text-[11px] font-semibold text-amber-300 mb-1">Ketik Judul Tugas Baru</label>
                <input id="input-new-custom-task" type="text" placeholder="Contoh: Implementasi UI Landing Page & Integrasi API" class="w-full px-3.5 py-2 rounded-xl border border-amber-400/40 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Asal Sekolah / Kampus (Opsional)</label>
              <input id="input-new-school" list="school-datalist" type="text" placeholder="Pilih atau ketik asal sekolah..." class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
              <button id="btn-cancel-create-user" type="button" class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">Batal</button>
              <button type="submit" class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md border border-purple-400/35 cursor-pointer transition-all">Simpan Akun & Penugasan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  _renderEditModal() {
    const availableBoards = this.getAvailableBoards();

    return `
      <div id="modal-edit-user" class="hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div class="bg-[#0e0a22]/95 backdrop-blur-2xl rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl shadow-purple-950/80 border border-white/15 text-white max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar my-auto" style="background-color: #0e0a22; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%);">
          <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3 sm:mb-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-400 text-[20px] sm:text-[22px]">edit_note</span>
              <h3 class="text-base sm:text-lg font-bold text-white">Edit Data Pengguna & Tugas</h3>
            </div>
            <button id="btn-close-edit-user" class="text-white/50 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" type="button">
              <span class="material-symbols-outlined text-[18px] sm:text-[20px]">close</span>
            </button>
          </div>

          <form id="form-edit-user" class="flex flex-col gap-3 sm:gap-3.5">
            <input type="hidden" id="input-edit-user-id" />

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Username</label>
              <input id="input-edit-username" type="text" readonly class="w-full px-3.5 py-2 rounded-xl border border-white/10 text-xs bg-white/5 text-white/50 font-mono" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Nama Lengkap</label>
              <input id="input-edit-fullname" type="text" required class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Role</label>
                <select id="select-edit-role" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  <option value="student">student (Siswa PKL)</option>
                  <option value="employee">employee (Karyawan)</option>
                  <option value="admin">admin (Administrator)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Nomor Induk (NIP/NISN)</label>
                <input id="input-edit-nip" type="text" class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Posisi / Jabatan</label>
              <input id="input-edit-position" type="text" required class="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <!-- Penugasan Papan Kanban & Tugas -->
            <div class="p-3 sm:p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col gap-2.5 sm:gap-3">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-purple-300 text-[18px]">assignment</span>
                <span class="text-xs font-bold text-purple-200">Penugasan Papan Kanban & Tugas</span>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5 gap-2">
                  <label class="block text-[11px] font-semibold text-white/80 truncate">Tujuan Papan Kanban (Bisa &gt; 1)</label>
                  <span id="count-selected-edit-projects" class="text-[9.5px] sm:text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 rounded-full shadow-xs shrink-0">0 Papan Terpilih</span>
                </div>

                <!-- Custom Multi-Select Dropdown Trigger -->
                <div
                  id="trigger-edit-projects"
                  class="w-full min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/15 bg-[#171135] text-white text-xs cursor-pointer flex items-center justify-between hover:border-purple-400 transition-colors shadow-inner select-none"
                  role="button"
                  tabindex="0"
                  title="Klik untuk memilih satu atau beberapa papan proyek"
                >
                  <div id="tags-selected-edit-projects" class="flex items-center gap-1 sm:gap-1.5 flex-wrap flex-1 py-0.5 min-w-0">
                    <span class="text-white/40 text-[10.5px] italic">Klik untuk memilih minimal 1 papan...</span>
                  </div>
                  <span id="icon-chevron-edit-projects" class="material-symbols-outlined text-[18px] text-white/60 shrink-0 ml-1.5 transition-transform duration-200">expand_more</span>
                </div>

                <!-- Dropdown Checklist Panel -->
                <div id="panel-edit-projects-dropdown" class="hidden mt-1.5 p-2 sm:p-2.5 rounded-xl border border-white/15 bg-[#110c29] flex flex-col gap-2 max-h-52 sm:max-h-56 overflow-y-auto custom-scrollbar shadow-2xl z-20 relative">
                  <!-- Search Bar & Quick Actions -->
                  <div class="flex items-center gap-1.5 pb-2 border-b border-white/10">
                    <div class="relative flex-1 min-w-0">
                      <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[13px] sm:text-[14px] text-white/40">search</span>
                      <input
                        id="input-search-edit-boards"
                        type="text"
                        placeholder="Cari papan..."
                        class="w-full pl-6 sm:pl-7 pr-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10.5px] sm:text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <button type="button" id="btn-select-all-edit-projects" class="text-[9.5px] sm:text-[10px] text-purple-300 hover:text-purple-200 font-semibold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Semua
                    </button>
                    <button type="button" id="btn-clear-all-edit-projects" class="text-[9.5px] sm:text-[10px] text-white/40 hover:text-white/70 font-semibold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Reset
                    </button>
                  </div>

                  <!-- Board Checklist -->
                  <div id="checklist-edit-projects-wrap" class="flex flex-col gap-1">
                    ${this._renderBoardChecklistHtml('edit', availableBoards, [])}
                  </div>
                </div>

                <!-- Hidden Synced Native Select -->
                <select id="select-edit-project" multiple class="hidden">
                  ${this._renderBoardOptionsHtml(availableBoards, [])}
                </select>

                <p class="text-[9.5px] sm:text-[10px] text-white/50 mt-1">Pengguna dapat mengakses dan mengerjakan tugas pada seluruh papan yang dicentang.</p>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-white/80 mb-1">Tugas Khusus untuk Pengguna Ini</label>
                <div class="relative">
                  <select id="select-edit-task" class="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 appearance-none pr-8 cursor-pointer transition-colors truncate">
                    <option value="all">⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
                    <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>

              <div id="wrap-edit-custom-task" class="hidden">
                <label class="block text-[11px] font-semibold text-amber-300 mb-1">Ketik Judul Tugas Baru</label>
                <input id="input-edit-custom-task" type="text" placeholder="Contoh: Optimasi Query Database & Perbaikan Bug" class="w-full px-3.5 py-2 rounded-xl border border-amber-400/40 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Telegram Chat</label>
                <input id="input-edit-telegram-chat" type="text" placeholder="KIE Nama" class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Telegram ID</label>
                <input id="input-edit-telegram-id" type="text" placeholder="-100..." class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
              <button id="btn-cancel-edit-user" type="button" class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">Batal</button>
              <button type="submit" class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md border border-purple-400/35 cursor-pointer transition-all">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.element) return;

    // Back to dashboard
    const btnBack = this.element.querySelector('#btn-back-to-dashboard');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        window.location.hash = '#/dashboard';
        if (this.eventBus) {
          this.eventBus.emit('navigate', { view: 'dashboard' });
        }
      });
    }

    // Modal Create User
    const btnOpenCreate = this.element.querySelector('#btn-open-create-user-modal');
    const modalCreate = this.element.querySelector('#modal-create-user');
    const btnCloseCreate = this.element.querySelector('#btn-close-create-user');
    const btnCancelCreate = this.element.querySelector('#btn-cancel-create-user');
    const formCreate = this.element.querySelector('#form-create-user');
    const selectNewTask = this.element.querySelector('#select-new-task');
    const wrapNewCustomTask = this.element.querySelector('#wrap-new-custom-task');
    const inputNewCustomTask = this.element.querySelector('#input-new-custom-task');

    // Multi-Board Selector Helper for Create & Edit modals
    const setupMultiBoardSelector = (type) => {
      const isCreate = type === 'new';
      const prefix = isCreate ? 'new' : 'edit';
      const trigger = this.element.querySelector(`#trigger-${prefix}-projects`);
      const panel = this.element.querySelector(`#panel-${prefix}-projects-dropdown`);
      const tagsContainer = this.element.querySelector(`#tags-selected-${prefix}-projects`);
      const countBadge = this.element.querySelector(`#count-selected-${prefix}-projects`);
      const chevron = this.element.querySelector(`#icon-chevron-${prefix}-projects`);
      const searchInput = this.element.querySelector(`#input-search-${prefix}-boards`);
      const btnSelectAll = this.element.querySelector(`#btn-select-all-${prefix}-projects`);
      const btnClearAll = this.element.querySelector(`#btn-clear-all-${prefix}-projects`);
      const selectElement = this.element.querySelector(`#select-${prefix}-project`);
      const taskSelect = this.element.querySelector(`#select-${prefix}-task`);
      const wrapCustomTask = this.element.querySelector(`#wrap-${prefix}-custom-task`);
      const inputCustomTask = this.element.querySelector(`#input-${prefix}-custom-task`);

      const getCheckboxes = () => Array.from(this.element.querySelectorAll(`.cb-${prefix}-project`));
      const getCheckedBoxes = () => Array.from(this.element.querySelectorAll(`.cb-${prefix}-project:checked`));

      const updateTaskOptions = (preferredTaskId = null) => {
        if (!taskSelect) return;
        const checked = getCheckedBoxes();
        const available = this.getAvailableBoards();
        const defaultFallbackId = available.length > 0 ? available[0].id : null;
        const boardIds = checked.length > 0 ? checked.map(c => c.value) : (defaultFallbackId ? [defaultFallbackId] : []);
        const tasks = this.getTasksForBoards(boardIds);

        const boardCountLabel = boardIds.length > 1 ? `${boardIds.length} Papan Terpilih` : 'Papan Ini';
        let optionsHtml = `
          <option value="all">⭐ Seluruh Papan (Semua Tugas di ${boardCountLabel})</option>
        `;

        if (tasks && tasks.length > 0) {
          if (boardIds.length > 1) {
            // Kelompokkan per papan agar rapi dan tidak campur aduk di tampilan mobile & desktop
            const grouped = new Map();
            tasks.forEach(t => {
              const ws = t.workspace || t.board || 'Umum';
              if (!grouped.has(ws)) grouped.set(ws, []);
              grouped.get(ws).push(t);
            });

            const allAvailable = this.getAvailableBoards();
            grouped.forEach((wsTasks, wsKey) => {
              const bObj = allAvailable.find(b => b.id === wsKey || b.workspace === wsKey);
              const bTitle = bObj ? bObj.name : wsKey.toUpperCase();
              optionsHtml += `<optgroup label="📂 ${bTitle}">`;
              wsTasks.forEach(t => {
                const isSelected = (preferredTaskId && String(preferredTaskId) === String(t.id)) ? 'selected' : '';
                const codeBadge = t.code ? `[${t.code}] ` : '';
                optionsHtml += `<option value="${t.id}" data-title="${t.title}" ${isSelected}>${codeBadge}${t.title}</option>`;
              });
              optionsHtml += `</optgroup>`;
            });
          } else {
            optionsHtml += tasks.map(t => {
              const isSelected = (preferredTaskId && String(preferredTaskId) === String(t.id)) ? 'selected' : '';
              const codeBadge = t.code ? `[${t.code}] ` : '';
              return `<option value="${t.id}" data-title="${t.title}" ${isSelected}>${codeBadge}${t.title}</option>`;
            }).join('');
          }
        }

        optionsHtml += `
          <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
        `;

        taskSelect.innerHTML = optionsHtml;
        if (preferredTaskId) {
          taskSelect.value = preferredTaskId;
        }
        if (wrapCustomTask) wrapCustomTask.classList.add('hidden');
      };

      if (taskSelect) {
        taskSelect.addEventListener('change', () => {
          if (taskSelect.value === 'create_new') {
            if (wrapCustomTask) wrapCustomTask.classList.remove('hidden');
            if (inputCustomTask) inputCustomTask.focus();
          } else {
            if (wrapCustomTask) wrapCustomTask.classList.add('hidden');
          }
        });
      }

      const syncUI = (preferredTaskId = null) => {
        const checked = getCheckedBoxes();
        const count = checked.length;

        if (countBadge) {
          countBadge.textContent = count > 0 ? `${count} Papan Terpilih` : '0 Papan Terpilih';
        }

        // Sync with hidden select element
        if (selectElement) {
          const selectedVals = checked.map(c => c.value);
          Array.from(selectElement.options).forEach(opt => {
            opt.selected = selectedVals.includes(opt.value);
          });
        }

        // Highlight checkboxes labels
        getCheckboxes().forEach(cb => {
          const itemLabel = cb.closest(`.item-${prefix}-project-option`);
          if (itemLabel) {
            if (cb.checked) {
              itemLabel.classList.add('bg-purple-600/20', 'border-purple-500/30');
              itemLabel.classList.remove('border-transparent');
            } else {
              itemLabel.classList.remove('bg-purple-600/20', 'border-purple-500/30');
              itemLabel.classList.add('border-transparent');
            }
          }
        });

        // Render tags
        if (tagsContainer) {
          if (count === 0) {
            tagsContainer.innerHTML = `<span class="text-white/40 text-[10.5px] italic">Klik untuk memilih minimal 1 papan...</span>`;
          } else {
            tagsContainer.innerHTML = checked.map(cb => {
              const bName = cb.getAttribute('data-name') || cb.value;
              return `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[10.5px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/35 shadow-xs max-w-full">
                  <span class="truncate max-w-[120px] sm:max-w-[170px]">${bName}</span>
                  <span class="btn-remove-${prefix}-tag material-symbols-outlined text-[13px] hover:text-white cursor-pointer ml-0.5 active:scale-90" data-val="${cb.value}">close</span>
                </span>
              `;
            }).join('');

            // Bind tag remove buttons
            tagsContainer.querySelectorAll(`.btn-remove-${prefix}-tag`).forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = btn.getAttribute('data-val');
                const targetCb = getCheckboxes().find(c => c.value === val);
                if (targetCb) {
                  targetCb.checked = false;
                  syncUI();
                }
              });
            });
          }
        }

        updateTaskOptions(preferredTaskId);
      };

      // Toggle dropdown panel
      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isClosed = panel?.classList.contains('hidden');
          // Close other panels
          document.querySelectorAll('#panel-new-projects-dropdown, #panel-edit-projects-dropdown').forEach(p => p.classList.add('hidden'));
          document.querySelectorAll('#icon-chevron-new-projects, #icon-chevron-edit-projects').forEach(i => i.classList.remove('rotate-180'));

          if (isClosed && panel) {
            panel.classList.remove('hidden');
            if (chevron) chevron.classList.add('rotate-180');
            if (searchInput) {
              searchInput.value = '';
              searchInput.focus();
              filterBoardItems('');
            }
          }
        });
      }

      // Checkbox changes
      getCheckboxes().forEach(cb => {
        cb.addEventListener('change', () => {
          syncUI();
        });
      });

      // Filter board items
      const filterBoardItems = (query) => {
        const q = query.trim().toLowerCase();
        getCheckboxes().forEach(cb => {
          const itemLabel = cb.closest(`.item-${prefix}-project-option`);
          const name = (cb.getAttribute('data-name') || '').toLowerCase();
          const val = cb.value.toLowerCase();
          if (itemLabel) {
            if (!q || name.includes(q) || val.includes(q)) {
              itemLabel.classList.remove('hidden');
            } else {
              itemLabel.classList.add('hidden');
            }
          }
        });
      };

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          filterBoardItems(e.target.value);
        });
      }

      if (btnSelectAll) {
        btnSelectAll.addEventListener('click', (e) => {
          e.stopPropagation();
          getCheckboxes().forEach(cb => { cb.checked = true; });
          syncUI();
        });
      }

      if (btnClearAll) {
        btnClearAll.addEventListener('click', (e) => {
          e.stopPropagation();
          getCheckboxes().forEach(cb => { cb.checked = false; });
          syncUI();
        });
      }

      if (panel) {
        panel.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      return { syncUI, updateTaskOptions };
    };

    // Initialize selectors
    this._setupMultiBoardSelector = setupMultiBoardSelector;
    const newBoardSelector = setupMultiBoardSelector('new');
    const editBoardSelector = setupMultiBoardSelector('edit');
    this._newBoardSelector = newBoardSelector;
    this._editBoardSelector = editBoardSelector;
    newBoardSelector.syncUI();

    // Global click listener to close dropdowns when clicking outside
    document.addEventListener('click', () => {
      const panelNew = this.element?.querySelector('#panel-new-projects-dropdown');
      const panelEdit = this.element?.querySelector('#panel-edit-projects-dropdown');
      const chevronNew = this.element?.querySelector('#icon-chevron-new-projects');
      const chevronEdit = this.element?.querySelector('#icon-chevron-edit-projects');

      if (panelNew) panelNew.classList.add('hidden');
      if (panelEdit) panelEdit.classList.add('hidden');
      if (chevronNew) chevronNew.classList.remove('rotate-180');
      if (chevronEdit) chevronEdit.classList.remove('rotate-180');
    });



    const openCreateModal = () => {
      if (modalCreate) {
        modalCreate.classList.remove('hidden');
        // Reset to default: first available active board checked
        const available = this.getAvailableBoards();
        const firstId = available.length > 0 ? available[0].id : null;
        this.element.querySelectorAll('.cb-new-project').forEach(cb => {
          cb.checked = Boolean(firstId && cb.value === firstId);
        });
        newBoardSelector.syncUI();
        const firstInput = modalCreate.querySelector('input');
        if (firstInput) setTimeout(() => firstInput.focus(), 60);
      }
    };

    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', openCreateModal);
    }

    const bindEmptyBtn = () => {
      const btnEmptyCreate = this.element.querySelector('#btn-empty-create-user');
      if (btnEmptyCreate) {
        btnEmptyCreate.addEventListener('click', openCreateModal);
      }
    };
    bindEmptyBtn();

    // Live search input
    const searchInput = this.element.querySelector('#input-search-users');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        const tbody = this.element.querySelector('tbody');
        if (tbody) {
          const allUsers = this.getUsers();
          const query = this.searchQuery.trim().toLowerCase();
          const filtered = query
            ? allUsers.filter(u =>
                (u.username || '').toLowerCase().includes(query) ||
                (u.fullName || '').toLowerCase().includes(query) ||
                (u.position || '').toLowerCase().includes(query) ||
                (u.role || '').toLowerCase().includes(query) ||
                (u.nip || '').toLowerCase().includes(query) ||
                (u.assignedBoardName || '').toLowerCase().includes(query) ||
                (u.assignedTaskTitle || '').toLowerCase().includes(query)
              )
            : allUsers;
          tbody.innerHTML = filtered.length > 0
            ? filtered.map(u => this._renderUserRow(u)).join('')
            : (allUsers.length === 0 ? this._renderEmptyState() : this._renderSearchEmptyState());
          this._bindRowEvents();
          bindEmptyBtn();
        }
      });
    }

    const closeCreateModal = () => {
      if (modalCreate) {
        modalCreate.classList.add('hidden');
        if (formCreate) formCreate.reset();
        if (wrapNewCustomTask) wrapNewCustomTask.classList.add('hidden');
      }
    };

    if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateModal);
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateModal);

    if (formCreate) {
      formCreate.addEventListener('submit', (e) => {
        e.preventDefault();
        let username = (this.element.querySelector('#input-new-username')?.value || '').trim();
        if (username && !username.startsWith('@')) username = `@${username}`;
        const fullName = (this.element.querySelector('#input-new-fullname')?.value || '').trim();
        const role = this.element.querySelector('#select-new-role')?.value || 'employee';
        const nip = (this.element.querySelector('#input-new-nip')?.value || '').trim();
        const position = (this.element.querySelector('#input-new-position')?.value || '').trim();
        const school = (this.element.querySelector('#input-new-school')?.value || '').trim();

        // Multi-board selection handling
        const checkedBoxes = Array.from(this.element.querySelectorAll('.cb-new-project:checked'));
        let assignedProjects = checkedBoxes.map(cb => cb.value);
        let assignedBoardNames = checkedBoxes.map(cb => cb.getAttribute('data-name') || cb.value);

        const assignedProjectId = assignedProjects[0] || '';
        const assignedWorkspace = assignedProjectId;
        const assignedBoardName = assignedBoardNames.join(', ');

        const taskSelect = this.element.querySelector('#select-new-task');
        let assignedTaskId = taskSelect ? taskSelect.value : 'all';
        let assignedTaskTitle = '';

        if (assignedTaskId === 'create_new') {
          const customTaskTitle = (this.element.querySelector('#input-new-custom-task')?.value || '').trim();
          if (customTaskTitle && this.taskService) {
            const initials = fullName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
            const createdTask = this.taskService.addTask({
              title: customTaskTitle,
              description: `Tugas otomatis untuk ${fullName} (${position}).`,
              workspace: assignedProjectId,
              board: assignedProjectId,
              status: 'in-progress',
              priority: 'High',
              pic: { name: fullName, initials, role: position }
            });
            assignedTaskId = createdTask.id;
            assignedTaskTitle = createdTask.title;
          } else {
            assignedTaskId = 'all';
            assignedTaskTitle = 'Seluruh Papan (Semua Tugas)';
          }
        } else if (assignedTaskId === 'all') {
          assignedTaskTitle = `Seluruh Papan (${assignedProjects.length > 1 ? `${assignedProjects.length} Papan Terpilih` : 'Semua Tugas'})`;
        } else {
          const selectedTaskOpt = taskSelect ? taskSelect.options[taskSelect.selectedIndex] : null;
          assignedTaskTitle = selectedTaskOpt ? (selectedTaskOpt.getAttribute('data-title') || selectedTaskOpt.text) : '';

          // Update PIC on selected task
          if (this.taskService) {
            const initials = fullName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
            this.taskService.updateTask(assignedTaskId, {
              pic: { name: fullName, initials, role: position }
            });
          }
        }

        if (!username || !fullName) return;

        const users = this.getUsers();
        const newUser = {
          id: `usr-${Date.now()}`,
          username,
          fullName,
          role,
          nip,
          position,
          school,
          assignedProjectId,
          assignedWorkspace,
          assignedProjects,
          assignedBoardNames,
          assignedBoardName,
          workspaceAccess: assignedProjects,
          assignedTaskId,
          assignedTaskTitle,
          device: 'Belum Terikat',
          isDeviceBound: false,
          telegramChat: '',
          telegramId: '',
          apiDeposit: '',
          qr_data: username
        };

        users.push(newUser);
        this.saveUsers(users);
        if (this.supabaseService && this.supabaseService.isConfigured()) {
          this.supabaseService.saveUser(newUser).catch(err => {
            console.warn('[UserManagementView] Gagal sync user baru ke Supabase:', err.message);
          });
        }
        apiService.saveManagedUser(newUser).catch(err => {
          console.warn('[UserManagementView] Gagal sync user baru ke backend API:', err.message);
        });
        closeCreateModal();
        if (this.notificationService) {
          this.notificationService.success(`Akun ${username} berhasil dibuat & otomatis tersimpan ke Supabase!`);
        }
        this.mount(this.element);
      });
    }

    // Modal Edit User
    const modalEdit = this.element.querySelector('#modal-edit-user');
    const btnCloseEdit = this.element.querySelector('#btn-close-edit-user');
    const btnCancelEdit = this.element.querySelector('#btn-cancel-edit-user');
    const formEdit = this.element.querySelector('#form-edit-user');
    const selectEditTask = this.element.querySelector('#select-edit-task');
    const wrapEditCustomTask = this.element.querySelector('#wrap-edit-custom-task');
    const inputEditCustomTask = this.element.querySelector('#input-edit-custom-task');

    if (selectEditTask) {
      selectEditTask.addEventListener('change', () => {
        if (selectEditTask.value === 'create_new') {
          if (wrapEditCustomTask) wrapEditCustomTask.classList.remove('hidden');
          if (inputEditCustomTask) inputEditCustomTask.focus();
        } else {
          if (wrapEditCustomTask) wrapEditCustomTask.classList.add('hidden');
        }
      });
    }

    const closeEditModal = () => {
      if (modalEdit) modalEdit.classList.add('hidden');
      if (wrapEditCustomTask) wrapEditCustomTask.classList.add('hidden');
    };

    if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

    if (formEdit) {
      formEdit.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = this.element.querySelector('#input-edit-user-id')?.value;
        const fullName = (this.element.querySelector('#input-edit-fullname')?.value || '').trim();
        const role = this.element.querySelector('#select-edit-role')?.value || 'employee';
        const nip = (this.element.querySelector('#input-edit-nip')?.value || '').trim();
        const position = (this.element.querySelector('#input-edit-position')?.value || '').trim();
        const telegramChat = (this.element.querySelector('#input-edit-telegram-chat')?.value || '').trim();
        const telegramId = (this.element.querySelector('#input-edit-telegram-id')?.value || '').trim();

        // Multi-board selection handling for edit
        const checkedEditBoxes = Array.from(this.element.querySelectorAll('.cb-edit-project:checked'));
        let assignedProjects = checkedEditBoxes.map(cb => cb.value);
        let assignedBoardNames = checkedEditBoxes.map(cb => cb.getAttribute('data-name') || cb.value);

        const assignedProjectId = assignedProjects[0] || '';
        const assignedWorkspace = assignedProjectId;
        const assignedBoardName = assignedBoardNames.join(', ');

        const taskSelect = this.element.querySelector('#select-edit-task');
        let assignedTaskId = taskSelect ? taskSelect.value : 'all';
        let assignedTaskTitle = '';

        if (assignedTaskId === 'create_new') {
          const customTaskTitle = (this.element.querySelector('#input-edit-custom-task')?.value || '').trim();
          if (customTaskTitle && this.taskService) {
            const initials = fullName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
            const createdTask = this.taskService.addTask({
              title: customTaskTitle,
              description: `Tugas otomatis untuk ${fullName} (${position}).`,
              workspace: assignedProjectId,
              board: assignedProjectId,
              status: 'in-progress',
              priority: 'High',
              pic: { name: fullName, initials, role: position }
            });
            assignedTaskId = createdTask.id;
            assignedTaskTitle = createdTask.title;
          } else {
            assignedTaskId = 'all';
            assignedTaskTitle = 'Seluruh Papan (Semua Tugas)';
          }
        } else if (assignedTaskId === 'all') {
          assignedTaskTitle = `Seluruh Papan (${assignedProjects.length > 1 ? `${assignedProjects.length} Papan Terpilih` : 'Semua Tugas'})`;
        } else {
          const selectedTaskOpt = taskSelect ? taskSelect.options[taskSelect.selectedIndex] : null;
          assignedTaskTitle = selectedTaskOpt ? (selectedTaskOpt.getAttribute('data-title') || selectedTaskOpt.text) : '';

          // Update PIC on selected task
          if (this.taskService) {
            const initials = fullName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
            this.taskService.updateTask(assignedTaskId, {
              pic: { name: fullName, initials, role: position }
            });
          }
        }

        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx].fullName = fullName;
          users[idx].role = role;
          users[idx].nip = nip;
          users[idx].position = position;
          users[idx].assignedProjectId = assignedProjectId;
          users[idx].assignedWorkspace = assignedWorkspace;
          users[idx].assignedProjects = assignedProjects;
          users[idx].assignedBoardNames = assignedBoardNames;
          users[idx].assignedBoardName = assignedBoardName;
          users[idx].workspaceAccess = assignedProjects;
          users[idx].assignedTaskId = assignedTaskId;
          users[idx].assignedTaskTitle = assignedTaskTitle;
          users[idx].telegramChat = telegramChat;
          users[idx].telegramId = telegramId;

          this.saveUsers(users);

          // Update active session user if editing the currently logged-in user
          const currentUser = this.authService ? this.authService.getCurrentUser() : null;
          if (currentUser && (currentUser.id === userId || currentUser.username === users[idx].username)) {
            currentUser.assignedProjects = assignedProjects;
            currentUser.assignedBoardNames = assignedBoardNames;
            currentUser.assignedProjectId = assignedProjectId;
            currentUser.assignedWorkspace = assignedWorkspace;
            currentUser.workspaceAccess = assignedProjects;
            currentUser.assignedTaskId = assignedTaskId;
            currentUser.assignedTaskTitle = assignedTaskTitle;
            try {
              localStorage.setItem('creative_office_auth_user', JSON.stringify(currentUser));
              localStorage.setItem('creative_office_user', JSON.stringify(currentUser));
            } catch (e) {}
          }
          if (this.eventBus) {
            this.eventBus.emit('user:assignment-updated', { user: users[idx] });
            this.eventBus.emit('auth:profile-updated', currentUser || users[idx]);
          }

          if (this.supabaseService && this.supabaseService.isConfigured()) {
            this.supabaseService.saveUser(users[idx]).catch(err => {
              console.warn('[UserManagementView] Gagal sync edit user ke Supabase:', err.message);
            });
          }
          apiService.saveManagedUser(users[idx]).catch(err => {
            console.warn('[UserManagementView] Gagal sync edit user ke backend API:', err.message);
          });
          closeEditModal();
          if (this.notificationService) {
            this.notificationService.success(`Perubahan akun ${users[idx].username} & penugasan papan berhasil disimpan ke Supabase!`);
          }
          this.mount(this.element);
        }
      });
    }

    this._editBoardSelector = editBoardSelector;

    this._bindRowEvents();
  }

  _bindRowEvents() {
    if (!this.element) return;

    // Login Direct Button (Masuk langsung ke Kanban & tugas yang ditugaskan)
    const loginBtns = this.element.querySelectorAll('.btn-user-login-direct');
    loginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const user = this.getUsers().find(u => u.id === userId);
        if (!user) return;

        const hasAssignedBoard = Boolean(user.assignedProjectId || (user.assignedProjects && user.assignedProjects.length > 0));
        if (user.role !== 'admin' && !hasAssignedBoard) {
          if (this.notificationService) {
            this.notificationService.warning(`Akun ${user.username} belum memiliki penugasan papan proyek! Silakan edit akun dan tambahkan minimal 1 papan sebelum masuk.`);
          }
          return;
        }

        const defaultBoard = this.getAvailableBoards()[0];
        const defaultBoardId = defaultBoard?.id || 'panen-kunci';
        const targetProj = user.assignedProjectId || (user.assignedProjects && user.assignedProjects[0]) || defaultBoardId;
        const targetWs = user.assignedWorkspace || (defaultBoard?.workspace || targetProj);
        const targetTask = user.assignedTaskId;

        if (confirm(`Masuk langsung sebagai ${user.fullName} (${user.username}) ke Papan Kanban "${user.assignedBoardName || targetProj}"?`)) {
          const userAvatar = this.authService ? this.authService.resolveUserAvatar(user) : (user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || user.username)}`);

          const targetProjects = (user.assignedProjects && Array.isArray(user.assignedProjects) && user.assignedProjects.length > 0)
            ? user.assignedProjects
            : ((user.workspaceAccess && Array.isArray(user.workspaceAccess) && user.workspaceAccess.length > 0)
              ? user.workspaceAccess
              : [targetWs, targetProj]);

          const userObj = {
            id: user.id,
            name: user.fullName,
            username: user.username,
            role: user.role === 'admin' ? 'admin' : 'user',
            title: user.position,
            avatar: userAvatar,
            assignedProjectId: targetProj,
            assignedWorkspace: targetWs,
            assignedProjects: targetProjects,
            workspaceAccess: targetProjects,
            assignedTaskId: targetTask,
            assignedTaskTitle: user.assignedTaskTitle || ''
          };

          if (this.authService && typeof this.authService.loginAsUser === 'function') {
            this.authService.loginAsUser(userObj, { silent: true });
          } else {
            this.authService.loginWithRole(user.role === 'admin' ? 'admin' : 'user');
          }
          try {
            sessionStorage.setItem('creative_office_session_active', 'true');
            sessionStorage.setItem('auth_login_method', 'direct');

            // Simpan active project & workspace
            localStorage.setItem('active_workspace', targetWs);
            localStorage.setItem('active_project_id', targetProj);
            localStorage.setItem('user_invited_workspace', targetWs);
            localStorage.setItem('user_invited_project', targetProj);

            if (targetTask && targetTask !== 'all') {
              localStorage.setItem('active_assigned_task_id', targetTask);
              localStorage.setItem('active_assigned_task_title', user.assignedTaskTitle || '');
            } else {
              localStorage.removeItem('active_assigned_task_id');
              localStorage.removeItem('active_assigned_task_title');
            }
          } catch (e) {}

          if (this.notificationService) {
            this.notificationService.success(`Berhasil login sebagai ${user.fullName}! Mengalihkan ke Kanban...`);
          }

          const eb = this.container ? this.container.resolve('EventBus') : null;
          if (eb) {
            eb.emit('navigate', {
              view: user.role === 'admin' ? 'dashboard' : 'kanban',
              projectId: targetProj,
              workspace: targetWs
            });
          }
          window.location.hash = user.role === 'admin' ? '#/dashboard' : `#/kanban/${targetProj}`;
        }
      });
    });

    // Edit Button
    const editBtns = this.element.querySelectorAll('.btn-user-edit');
    const modalEdit = this.element.querySelector('#modal-edit-user');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const user = this.getUsers().find(u => u.id === userId);
        if (!user || !modalEdit) return;

        this.element.querySelector('#input-edit-user-id').value = user.id;
        this.element.querySelector('#input-edit-username').value = user.username;
        this.element.querySelector('#input-edit-fullname').value = user.fullName;
        this.element.querySelector('#select-edit-role').value = user.role;
        this.element.querySelector('#input-edit-nip').value = user.nip || '';
        this.element.querySelector('#input-edit-position').value = user.position || '';
        this.element.querySelector('#input-edit-telegram-chat').value = user.telegramChat || '';
        this.element.querySelector('#input-edit-telegram-id').value = user.telegramId || '';

        // Determine user's boards for edit checkboxes
        const defaultBoard = this.getAvailableBoards()[0];
        const defaultBoardId = defaultBoard?.id || null;
        const userBoardIds = (user.assignedProjects && Array.isArray(user.assignedProjects) && user.assignedProjects.length > 0)
          ? user.assignedProjects
          : ((user.workspaceAccess && Array.isArray(user.workspaceAccess) && user.workspaceAccess.length > 0)
            ? user.workspaceAccess
            : (user.assignedProjectId ? [user.assignedProjectId] : (defaultBoardId ? [defaultBoardId] : [])));

        const editCbs = this.element.querySelectorAll('.cb-edit-project');
        editCbs.forEach(cb => {
          const val = cb.value;
          const boardObj = this.getAvailableBoards().find(b => b.id === val);
          const isMatch = userBoardIds.some(uid => {
            if (uid === val) return true;
            if (boardObj && (boardObj.workspace === uid || boardObj.name.toLowerCase() === String(uid).toLowerCase())) return true;
            if (val.includes('panen') && String(uid).includes('panen')) return true;
            return false;
          });
          cb.checked = isMatch;
        });

        if (this._editBoardSelector) {
          this._editBoardSelector.syncUI(user.assignedTaskId);
        }

        modalEdit.classList.remove('hidden');
      });
    });

    // Reset Device Button
    const resetBtns = this.element.querySelectorAll('.btn-user-reset-device');
    resetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Reset keterikatan perangkat untuk ${user.fullName} (${user.username})?`)) {
          user.isDeviceBound = false;
          user.device = 'Belum Terikat';
          this.saveUsers(users);
          if (this.notificationService) {
            this.notificationService.success(`Perangkat ${user.username} berhasil di-reset menjadi Belum Terikat.`);
          }
          this.mount(this.element);
        }
      });
    });



    // Delete User Button
    const deleteBtns = this.element.querySelectorAll('.btn-user-delete');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-id');
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
          if (this.notificationService) {
            this.notificationService.warning('Tidak dapat menghapus akun admin utama!');
          }
          return;
        }

        if (confirm(`Apakah Anda yakin ingin menghapus akun ${user.fullName} (${user.username}) secara permanen?`)) {
          // 1. Tambahkan ke blocklist lokal DULU agar sync tidak membawa balik user ini
          this._addDeletedId(userId);

          // 2. Hapus dari localStorage
          const updated = users.filter(u => u.id !== userId);
          this.saveUsers(updated);

          // 3. Hapus dari Supabase (await agar hasilnya terkonfirmasi)
          let supabaseOk = false;
          if (this.supabaseService && this.supabaseService.isConfigured()) {
            try {
              supabaseOk = await this.supabaseService.deleteUser(userId);
              if (!supabaseOk) {
                console.warn('[UserManagementView] Supabase deleteUser returned false untuk ID:', userId);
              }
            } catch (err) {
              console.warn('[UserManagementView] Gagal hapus user dari Supabase:', err.message);
            }
          }

          // 4. Hapus dari backend API juga
          apiService.deleteManagedUser(userId).catch(err => {
            console.warn('[UserManagementView] Gagal hapus user dari backend:', err.message);
          });

          // 5. Jika Supabase berhasil, hapus dari blocklist (tidak perlu lagi)
          //    Jika gagal, biarkan di blocklist agar user tidak muncul lagi dari sync
          if (supabaseOk) {
            this._removeDeletedId(userId);
          }

          if (this.notificationService) {
            const extraInfo = supabaseOk ? '' : ' (Catatan: data di Supabase mungkin belum terhapus, akan disembunyikan secara lokal)';
            this.notificationService.success(`Akun ${user.username} telah dihapus.${extraInfo}`);
          }

          // 6. Re-render tabel
          this._updateTableBody();
        }
      });
    });

    // Clear All Users Button
    const btnClearAll = this.element.querySelector('#btn-clear-all-users');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        if (confirm('Apakah Anda yakin ingin mengosongkan SELURUH pengguna? Data pengguna akan dihapus dari aplikasi & database.')) {
          this.saveUsers([]);
          await apiService.clearAllManagedUsers().catch(() => {});
          if (this.supabaseService && this.supabaseService.isConfigured()) {
            await this.supabaseService.clearAllUsers().catch(() => {});
          }
          if (this.notificationService) {
            this.notificationService.success('Seluruh pengguna berhasil dikosongkan.');
          }
          this.mount(this.element);
        }
      });
    }
  }

  /**
   * Memperbarui daftar opsi papan Kanban pada modal Buat & Edit Pengguna secara real-time
   * saat event projects:updated terdeteksi dari Supabase / Dashboard
   */
  _refreshBoardSelectors() {
    if (!this.element) return;
    const availableBoards = this.getAvailableBoards();
    const defaultBoard = availableBoards.length > 0 ? availableBoards[0] : null;

    // Refresh Create Modal Checklist & Select
    const newWrap = this.element.querySelector('#checklist-new-projects-wrap');
    const newSelect = this.element.querySelector('#select-new-project');
    if (newWrap) {
      newWrap.innerHTML = this._renderBoardChecklistHtml('new', availableBoards, defaultBoard ? [defaultBoard.id] : []);
    }
    if (newSelect) {
      newSelect.innerHTML = this._renderBoardOptionsHtml(availableBoards, defaultBoard ? [defaultBoard.id] : []);
    }

    // Refresh Edit Modal Checklist & Select
    const editWrap = this.element.querySelector('#checklist-edit-projects-wrap');
    const editSelect = this.element.querySelector('#select-edit-project');
    if (editWrap) {
      editWrap.innerHTML = this._renderBoardChecklistHtml('edit', availableBoards, []);
    }
    if (editSelect) {
      editSelect.innerHTML = this._renderBoardOptionsHtml(availableBoards, []);
    }

    // Re-bind listeners for both selectors
    if (typeof this._setupMultiBoardSelector === 'function') {
      this._newBoardSelector = this._setupMultiBoardSelector('new');
      this._editBoardSelector = this._setupMultiBoardSelector('edit');
      this._newBoardSelector?.syncUI();
    }
  }
}

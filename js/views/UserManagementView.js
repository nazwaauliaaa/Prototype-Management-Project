import { BaseView } from '../core/BaseView.js';
import { apiService } from '../services/ApiService.js';

/**
 * UserManagementView - Halaman Manajemen Pengguna untuk Administrator
 * Memungkinkan Admin melihat daftar karyawan/siswa PKL, mengelola perangkat, membuat akun baru,
 * mengedit akun, mengatur penugasan papan kanban & tugas, mereset perangkat HP, dan login langsung ke akun.
 */
export class UserManagementView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container.resolve('AuthService');
    this.notificationService = container.resolve('NotificationService');
    this.projectService = container.resolve('ProjectService');
    this.taskService = container.resolve('TaskService');

    this.searchQuery = '';
    this.editingUser = null;
    this.isCreateModalOpen = false;
    this.isEditModalOpen = false;

    this.defaultUsers = [
      {
        id: 'usr-1790046404637',
        username: '@nazwaaulial',
        fullName: 'Nazwa Aulia Latifah',
        role: 'student',
        nip: '2026',
        position: 'Siswa PKL',
        school: '',
        assignedProjectId: 'creativoffice',
        assignedWorkspace: 'creativoffice',
        assignedBoardName: 'CreativOffice',
        assignedTaskId: 'all',
        assignedTaskTitle: 'Seluruh Papan (Semua Tugas)',
        device: 'Belum Terikat',
        isDeviceBound: false,
        telegramChat: '',
        telegramId: '',
        apiDeposit: '',
        qr_data: '@nazwaaulial'
      },
      {
        id: 'usr-1790046919250',
        username: '@jax_ck',
        fullName: 'Fakhrul Miandi Rachman',
        role: 'student',
        nip: '2026',
        position: 'Siswa PKL',
        school: '',
        assignedProjectId: 'panen-kunci',
        assignedWorkspace: 'panen-kunci',
        assignedBoardName: 'Panen Kunci (Utama)',
        assignedTaskId: 'all',
        assignedTaskTitle: 'Seluruh Papan (Semua Tugas)',
        device: 'Belum Terikat',
        isDeviceBound: false,
        telegramChat: '',
        telegramId: '',
        apiDeposit: '',
        qr_data: '@jax_ck'
      },
      {
        id: 'usr-1790049070981',
        username: '@fazlies',
        fullName: 'Muhamad Fazli Esfandiar',
        role: 'student',
        nip: '2026',
        position: 'Siswa PKL',
        school: '',
        assignedProjectId: 'creativoffice',
        assignedWorkspace: 'creativoffice',
        assignedBoardName: 'CreativOffice (Creative Office)',
        assignedTaskId: 'all',
        assignedTaskTitle: 'Seluruh Papan (Semua Tugas)',
        device: 'Belum Terikat',
        isDeviceBound: false,
        telegramChat: '',
        telegramId: '',
        apiDeposit: '',
        qr_data: '@fazlies'
      }
    ];

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

    this._initUsers();
    // Sinkronkan data terbaru dari server saat view dibuat
    this.syncFromBackend(true);
  }

  async syncFromBackend(silent = false) {
    try {
      const remoteUsers = await apiService.getManagedUsers();
      if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        const stored = localStorage.getItem('creative_office_managed_users');
        let localUsers = [];
        try { localUsers = JSON.parse(stored) || []; } catch (e) {}

        const userMap = new Map();
        // 1. Masukkan default users
        this.defaultUsers.forEach(u => userMap.set(u.id || u.username.toLowerCase(), u));
        // 2. Timpa dengan local users jika ada
        localUsers.forEach(u => userMap.set(u.id || (u.username && u.username.toLowerCase()), u));
        // 3. Timpa dengan remote users dari database/server
        remoteUsers.forEach(u => userMap.set(u.id || (u.username && u.username.toLowerCase()), u));

        const merged = Array.from(userMap.values());
        const mergedStr = JSON.stringify(merged);

        if (stored !== mergedStr) {
          localStorage.setItem('creative_office_managed_users', mergedStr);
          this._updateTableBody();
          if (!silent && this.notificationService) {
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
      if (!Array.isArray(currentUsers) || currentUsers.length === 0) {
        localStorage.setItem('creative_office_managed_users', JSON.stringify(this.defaultUsers));
      } else {
        let changed = false;
        this.defaultUsers.forEach(d => {
          const dUsn = d.username.replace(/^@/, '').toLowerCase();
          if (!currentUsers.some(u => (u.username && u.username.replace(/^@/, '').toLowerCase() === dUsn) || (u.fullName && u.fullName.toLowerCase() === d.fullName.toLowerCase()))) {
            currentUsers.push(d);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('creative_office_managed_users', JSON.stringify(currentUsers));
        }
      }
    } catch (e) {}
  }

  getUsers() {
    try {
      const stored = localStorage.getItem('creative_office_managed_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [...this.defaultUsers];
  }

  saveUsers(users) {
    try {
      localStorage.setItem('creative_office_managed_users', JSON.stringify(users));
      // 🚀 Langsung kirim dan sinkronkan ke Database PostgreSQL / Supabase & Vercel Serverless
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
   * Mengambil daftar seluruh papan / project yang aktif di sistem
   */
  getAvailableBoards() {
    const defaultBoards = [
      { id: 'creativoffice', name: 'CreativOffice (Creative Office)', workspace: 'creativoffice' },
      { id: 'panen-kunci', name: 'Panen Kunci (Utama)', workspace: 'panen-kunci' },
      { id: 'ruangkreasi', name: 'Ruang Kreasi', workspace: 'ruangkreasi' },
      { id: 'aikreativ', name: 'AIKreativ Studio', workspace: 'aikreativ' },
      { id: 'sharinginaja', name: 'Sharinginaja Platform', workspace: 'sharinginaja' },
      { id: 'layarbaca', name: 'LayarBaca', workspace: 'layarbaca' }
    ];

    const map = new Map();
    defaultBoards.forEach(b => map.set(b.id, b));

    if (this.projectService) {
      try {
        const customProjects = this.projectService.getAllProjects();
        customProjects.forEach(p => {
          if (p && p.id) {
            map.set(p.id, {
              id: p.id,
              name: p.name || p.title || p.id,
              workspace: p.workspace || p.id
            });
          }
        });
      } catch (e) {}
    }

    return Array.from(map.values());
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
   * Mengambil daftar seluruh tugas dari satu atau banyak papan proyek
   */
  getTasksForBoards(boardIds) {
    if (!this.taskService) return [];
    const list = Array.isArray(boardIds) ? boardIds : [boardIds];
    const map = new Map();
    list.forEach(bId => {
      const tasks = this.getTasksForBoard(bId);
      if (Array.isArray(tasks)) {
        tasks.forEach(t => {
          if (t && t.id && !map.has(t.id)) {
            map.set(t.id, t);
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

            <span class="text-xs font-semibold text-white/70 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
              Total: <span class="text-purple-300 font-bold">${allUsers.length} Pengguna</span>
            </span>
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
          ${u.assignedProjectId || boardList.length > 0 ? `
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
            <span class="text-xs text-white/40 italic flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-white/30">hourglass_empty</span>
              <span>Belum Ditugaskan</span>
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
                class="btn-user-login-direct text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
                data-id="${u.id}"
                title="Masuk langsung ke Kanban ${boardName} akun ${u.username} tanpa scan"
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

    return `
      <div id="modal-create-user" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-[#0e0a22]/95 backdrop-blur-2xl rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-purple-950/80 border border-white/15 text-white max-h-[90vh] overflow-y-auto custom-scrollbar" style="background-color: #0e0a22; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%);">
          <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-400 text-[22px]">person_add</span>
              <h3 class="text-lg font-bold text-white">Buat Akun & Penugasan Baru</h3>
            </div>
            <button id="btn-close-create-user" class="text-white/50 hover:text-white cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="form-create-user" class="flex flex-col gap-3.5">
            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Username (dengan @)</label>
              <input id="input-new-username" type="text" placeholder="@contohuser" required class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Nama Lengkap</label>
              <input id="input-new-fullname" type="text" placeholder="Nama Lengkap Karyawan/Siswa" required class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div class="grid grid-cols-2 gap-3">
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
                <input id="input-new-nip" type="text" placeholder="2026..." class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Posisi / Jabatan</label>
              <input id="input-new-position" type="text" placeholder="Contoh: Frontend Developer / UI Designer / Siswa PKL" required class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <!-- Penugasan Papan Kanban & Tugas -->
            <div class="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col gap-3">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-purple-300 text-[18px]">assignment</span>
                <span class="text-xs font-bold text-purple-200">Penugasan Papan Kanban & Tugas</span>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-[11px] font-semibold text-white/80">Tujuan Papan Kanban Proyek (Bisa Pilih &gt; 1)</label>
                  <span id="count-selected-new-projects" class="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-400/30 px-2 py-0.2 rounded-full shadow-xs">1 Papan Terpilih</span>
                </div>

                <!-- Custom Multi-Select Dropdown Trigger -->
                <div
                  id="trigger-new-projects"
                  class="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-white/15 bg-[#171135] text-white text-xs cursor-pointer flex items-center justify-between hover:border-purple-400 transition-colors shadow-inner"
                  role="button"
                  tabindex="0"
                  title="Klik untuk memilih satu atau beberapa papan proyek"
                >
                  <div id="tags-selected-new-projects" class="flex items-center gap-1.5 flex-wrap flex-1 py-0.5">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/35 shadow-xs">
                      <span class="truncate max-w-[150px]">CreativOffice (Creative Office)</span>
                      <span class="btn-remove-new-tag material-symbols-outlined text-[13px] hover:text-white cursor-pointer ml-0.5" data-val="creativoffice">close</span>
                    </span>
                  </div>
                  <span id="icon-chevron-new-projects" class="material-symbols-outlined text-[18px] text-white/60 shrink-0 ml-1.5 transition-transform">expand_more</span>
                </div>

                <!-- Dropdown Checklist Panel -->
                <div id="panel-new-projects-dropdown" class="hidden mt-1.5 p-2.5 rounded-xl border border-white/15 bg-[#110c29] flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar shadow-2xl z-20 relative">
                  <!-- Search Bar & Quick Actions -->
                  <div class="flex items-center gap-2 pb-2 border-b border-white/10">
                    <div class="relative flex-1">
                      <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-white/40">search</span>
                      <input
                        id="input-search-new-boards"
                        type="text"
                        placeholder="Cari papan..."
                        class="w-full pl-7 pr-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <button type="button" id="btn-select-all-new-projects" class="text-[10px] text-purple-300 hover:text-purple-200 font-semibold px-1.5 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Pilih Semua
                    </button>
                    <button type="button" id="btn-clear-all-new-projects" class="text-[10px] text-white/40 hover:text-white/70 font-semibold px-1.5 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Bersihkan
                    </button>
                  </div>

                  <!-- Board Checklist -->
                  <div class="flex flex-col gap-1">
                    ${availableBoards.map(b => `
                      <label class="item-new-project-option flex items-center justify-between p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all text-xs select-none ${b.id === 'creativoffice' ? 'bg-purple-600/20 border border-purple-500/30' : 'border border-transparent'}">
                        <div class="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            class="cb-new-project rounded accent-purple-600 w-4 h-4 cursor-pointer shrink-0"
                            value="${b.id}"
                            data-name="${b.name}"
                            ${b.id === 'creativoffice' ? 'checked' : ''}
                          />
                          <span class="truncate font-medium text-white/90 text-[11.5px]">${b.name}</span>
                        </div>
                        <span class="text-[9.5px] font-mono text-purple-300 bg-purple-500/20 border border-purple-400/30 px-1.5 py-0.2 rounded uppercase ml-2 shrink-0">
                          ${b.workspace || b.id}
                        </span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Hidden Synced Native Select -->
                <select id="select-new-project" multiple class="hidden">
                  ${availableBoards.map(b => `
                    <option value="${b.id}" data-name="${b.name}" ${b.id === 'creativoffice' ? 'selected' : ''}>${b.name}</option>
                  `).join('')}
                </select>

                <p class="text-[10px] text-white/50 mt-1">Saat scan QR SampulKreativ, pengguna memiliki hak akses ke seluruh papan yang dipilih.</p>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-white/80 mb-1">Tugas Khusus untuk Pengguna Ini</label>
                <select id="select-new-task" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  <option value="all">⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
                  <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
                </select>
              </div>

              <div id="wrap-new-custom-task" class="hidden">
                <label class="block text-[11px] font-semibold text-amber-300 mb-1">Ketik Judul Tugas Baru</label>
                <input id="input-new-custom-task" type="text" placeholder="Contoh: Implementasi UI Landing Page & Integrasi API" class="w-full px-3.5 py-2 rounded-xl border border-amber-400/40 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Asal Sekolah / Kampus (Opsional)</label>
              <input id="input-new-school" list="school-datalist" type="text" placeholder="Pilih atau ketik asal sekolah..." class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
              <button id="btn-cancel-create-user" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">Batal</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md border border-purple-400/35 cursor-pointer transition-all">Simpan Akun & Penugasan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  _renderEditModal() {
    const availableBoards = this.getAvailableBoards();

    return `
      <div id="modal-edit-user" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-[#0e0a22]/95 backdrop-blur-2xl rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-purple-950/80 border border-white/15 text-white max-h-[90vh] overflow-y-auto custom-scrollbar" style="background-color: #0e0a22; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%);">
          <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-400 text-[22px]">edit_note</span>
              <h3 class="text-lg font-bold text-white">Edit Data Pengguna & Tugas</h3>
            </div>
            <button id="btn-close-edit-user" class="text-white/50 hover:text-white cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="form-edit-user" class="flex flex-col gap-3.5">
            <input type="hidden" id="input-edit-user-id" />

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Username</label>
              <input id="input-edit-username" type="text" readonly class="w-full px-3.5 py-2 rounded-xl border border-white/10 text-xs bg-white/5 text-white/50 font-mono" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Nama Lengkap</label>
              <input id="input-edit-fullname" type="text" required class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Role</label>
                <select id="select-edit-role" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  <option value="student">student</option>
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Nomor Induk (NIP/NISN)</label>
                <input id="input-edit-nip" type="text" class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Posisi / Jabatan</label>
              <input id="input-edit-position" type="text" required class="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
            </div>

            <!-- Penugasan Papan Kanban & Tugas -->
            <div class="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col gap-3">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-purple-300 text-[18px]">assignment</span>
                <span class="text-xs font-bold text-purple-200">Penugasan Papan Kanban & Tugas</span>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-[11px] font-semibold text-white/80">Tujuan Papan Kanban Proyek (Bisa Pilih &gt; 1)</label>
                  <span id="count-selected-edit-projects" class="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-400/30 px-2 py-0.2 rounded-full shadow-xs">1 Papan Terpilih</span>
                </div>

                <!-- Custom Multi-Select Dropdown Trigger -->
                <div
                  id="trigger-edit-projects"
                  class="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-white/15 bg-[#171135] text-white text-xs cursor-pointer flex items-center justify-between hover:border-purple-400 transition-colors shadow-inner"
                  role="button"
                  tabindex="0"
                  title="Klik untuk memilih satu atau beberapa papan proyek"
                >
                  <div id="tags-selected-edit-projects" class="flex items-center gap-1.5 flex-wrap flex-1 py-0.5"></div>
                  <span id="icon-chevron-edit-projects" class="material-symbols-outlined text-[18px] text-white/60 shrink-0 ml-1.5 transition-transform">expand_more</span>
                </div>

                <!-- Dropdown Checklist Panel -->
                <div id="panel-edit-projects-dropdown" class="hidden mt-1.5 p-2.5 rounded-xl border border-white/15 bg-[#110c29] flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar shadow-2xl z-20 relative">
                  <!-- Search Bar & Quick Actions -->
                  <div class="flex items-center gap-2 pb-2 border-b border-white/10">
                    <div class="relative flex-1">
                      <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-white/40">search</span>
                      <input
                        id="input-search-edit-boards"
                        type="text"
                        placeholder="Cari papan..."
                        class="w-full pl-7 pr-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <button type="button" id="btn-select-all-edit-projects" class="text-[10px] text-purple-300 hover:text-purple-200 font-semibold px-1.5 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Pilih Semua
                    </button>
                    <button type="button" id="btn-clear-all-edit-projects" class="text-[10px] text-white/40 hover:text-white/70 font-semibold px-1.5 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                      Bersihkan
                    </button>
                  </div>

                  <!-- Board Checklist -->
                  <div class="flex flex-col gap-1">
                    ${availableBoards.map(b => `
                      <label class="item-edit-project-option flex items-center justify-between p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all text-xs select-none border border-transparent">
                        <div class="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            class="cb-edit-project rounded accent-purple-600 w-4 h-4 cursor-pointer shrink-0"
                            value="${b.id}"
                            data-name="${b.name}"
                          />
                          <span class="truncate font-medium text-white/90 text-[11.5px]">${b.name}</span>
                        </div>
                        <span class="text-[9.5px] font-mono text-purple-300 bg-purple-500/20 border border-purple-400/30 px-1.5 py-0.2 rounded uppercase ml-2 shrink-0">
                          ${b.workspace || b.id}
                        </span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Hidden Synced Native Select -->
                <select id="select-edit-project" multiple class="hidden">
                  ${availableBoards.map(b => `
                    <option value="${b.id}" data-name="${b.name}">${b.name}</option>
                  `).join('')}
                </select>

                <p class="text-[10px] text-white/50 mt-1">Pengguna dapat mengakses dan mengerjakan tugas pada seluruh papan yang dicentang.</p>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-white/80 mb-1">Tugas Khusus untuk Pengguna Ini</label>
                <select id="select-edit-task" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  <option value="all">⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
                  <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
                </select>
              </div>

              <div id="wrap-edit-custom-task" class="hidden">
                <label class="block text-[11px] font-semibold text-amber-300 mb-1">Ketik Judul Tugas Baru</label>
                <input id="input-edit-custom-task" type="text" placeholder="Contoh: Optimasi Query Database & Perbaikan Bug" class="w-full px-3.5 py-2 rounded-xl border border-amber-400/40 bg-white/10 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
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
              <button id="btn-cancel-edit-user" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">Batal</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md border border-purple-400/35 cursor-pointer transition-all">Simpan Perubahan</button>
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

      const getCheckboxes = () => Array.from(this.element.querySelectorAll(`.cb-${prefix}-project`));
      const getCheckedBoxes = () => Array.from(this.element.querySelectorAll(`.cb-${prefix}-project:checked`));

      const updateTaskOptions = (preferredTaskId = null) => {
        if (!taskSelect) return;
        const checked = getCheckedBoxes();
        const boardIds = checked.length > 0 ? checked.map(c => c.value) : ['creativoffice'];
        const tasks = this.getTasksForBoards(boardIds);

        const boardCountLabel = boardIds.length > 1 ? `${boardIds.length} Papan Terpilih` : 'Papan Ini';
        let optionsHtml = `
          <option value="all">⭐ Seluruh Papan (Semua Tugas di ${boardCountLabel})</option>
        `;

        if (tasks && tasks.length > 0) {
          optionsHtml += tasks.map(t => {
            const isSelected = preferredTaskId === t.id ? 'selected' : '';
            return `<option value="${t.id}" data-title="${t.title}" ${isSelected}>[${t.workspace || t.board || 'TSK'}] ${t.title}</option>`;
          }).join('');
        }

        optionsHtml += `
          <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
        `;

        taskSelect.innerHTML = optionsHtml;
        if (wrapCustomTask) wrapCustomTask.classList.add('hidden');
      };

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
            tagsContainer.innerHTML = `<span class="text-white/40 italic">Klik untuk memilih minimal 1 papan...</span>`;
          } else {
            tagsContainer.innerHTML = checked.map(cb => {
              const bName = cb.getAttribute('data-name') || cb.value;
              return `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/35 shadow-xs">
                  <span class="truncate max-w-[140px]">${bName}</span>
                  <span class="btn-remove-${prefix}-tag material-symbols-outlined text-[13px] hover:text-white cursor-pointer ml-0.5" data-val="${cb.value}">close</span>
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
    const newBoardSelector = setupMultiBoardSelector('new');
    const editBoardSelector = setupMultiBoardSelector('edit');

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

    if (selectNewTask) {
      selectNewTask.addEventListener('change', () => {
        if (selectNewTask.value === 'create_new') {
          if (wrapNewCustomTask) wrapNewCustomTask.classList.remove('hidden');
          if (inputNewCustomTask) inputNewCustomTask.focus();
        } else {
          if (wrapNewCustomTask) wrapNewCustomTask.classList.add('hidden');
        }
      });
    }

    const openCreateModal = () => {
      if (modalCreate) {
        modalCreate.classList.remove('hidden');
        // Reset to default: 'creativoffice' checked
        this.element.querySelectorAll('.cb-new-project').forEach(cb => {
          cb.checked = cb.value === 'creativoffice';
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

        if (assignedProjects.length === 0) {
          assignedProjects = ['creativoffice'];
          assignedBoardNames = ['CreativOffice'];
        }

        const assignedProjectId = assignedProjects[0];
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
        closeCreateModal();
        if (this.notificationService) {
          this.notificationService.success(`Akun ${username} berhasil dibuat & ditugaskan ke ${assignedProjects.length > 1 ? `${assignedProjects.length} Papan Proyek` : `"${assignedBoardName}"`}!`);
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

        if (assignedProjects.length === 0) {
          assignedProjects = ['creativoffice'];
          assignedBoardNames = ['CreativOffice'];
        }

        const assignedProjectId = assignedProjects[0];
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
          closeEditModal();
          if (this.notificationService) {
            this.notificationService.success(`Perubahan akun ${users[idx].username} & penugasan papan berhasil disimpan!`);
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

        const targetProj = user.assignedProjectId || 'creativoffice';
        const targetWs = user.assignedWorkspace || targetProj;
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
        const userBoardIds = (user.assignedProjects && Array.isArray(user.assignedProjects) && user.assignedProjects.length > 0)
          ? user.assignedProjects
          : ((user.workspaceAccess && Array.isArray(user.workspaceAccess) && user.workspaceAccess.length > 0)
            ? user.workspaceAccess
            : (user.assignedProjectId ? [user.assignedProjectId] : ['creativoffice']));

        const editCbs = this.element.querySelectorAll('.cb-edit-project');
        editCbs.forEach(cb => {
          cb.checked = userBoardIds.includes(cb.value);
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
      btn.addEventListener('click', () => {
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
          const updated = users.filter(u => u.id !== userId);
          this.saveUsers(updated);
          apiService.deleteManagedUser(userId).catch(() => {});
          if (this.notificationService) {
            this.notificationService.success(`Akun ${user.username} telah dihapus.`);
          }
          this.mount(this.element);
        }
      });
    });
  }
}

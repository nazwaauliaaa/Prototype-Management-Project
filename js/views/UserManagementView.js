import { BaseView } from '../core/BaseView.js';
import { QRCodeGenerator } from '../services/QRCodeGenerator.js';

/**
 * UserManagementView - Halaman Manajemen Pengguna untuk Administrator
 * Memungkinkan Admin melihat daftar karyawan/siswa PKL, mengelola perangkat, membuat akun baru,
 * mengedit akun, mengatur penugasan papan kanban & tugas, mencetak kartu karyawan ber-QR,
 * mereset perangkat HP, dan login langsung ke akun.
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
    this.printingUser = null;
    this.isCreateModalOpen = false;
    this.isEditModalOpen = false;
    this.isPrintModalOpen = false;

    this.defaultUsers = [];

    this._initUsers();
  }

  _initUsers() {
    try {
      const resetKey = 'creative_office_managed_users_reset_empty_v2';
      if (!localStorage.getItem(resetKey)) {
        localStorage.setItem(resetKey, 'true');
        localStorage.setItem('creative_office_managed_users', JSON.stringify([]));
      }
    } catch (e) {}
  }

  getUsers() {
    try {
      const stored = localStorage.getItem('creative_office_managed_users');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return [];
  }

  saveUsers(users) {
    try {
      localStorage.setItem('creative_office_managed_users', JSON.stringify(users));
    } catch (e) {}
  }

  /**
   * Mengambil daftar seluruh papan / project yang aktif di sistem
   */
  getAvailableBoards() {
    const defaultBoards = [
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
          ${this._renderPrintModal()}
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

    const boardName = u.assignedBoardName || (u.assignedProjectId === 'panen-kunci' ? 'Panen Kunci' : u.assignedProjectId) || 'Panen Kunci';
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
          ${u.assignedProjectId ? `
            <div class="flex flex-col gap-1 max-w-[240px]">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 w-fit">
                <span class="material-symbols-outlined text-[14px] text-indigo-300">view_kanban</span>
                <span class="truncate">${boardName}</span>
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
              class="btn-user-print-card text-white/50 hover:text-purple-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              data-id="${u.id}"
              title="Cetak Kartu & QR Scan SampulKreativ"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card" aria-hidden="true">
                <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                <line x1="2" x2="22" y1="10" y2="10"></line>
              </svg>
            </button>

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
                <label class="block text-[11px] font-semibold text-white/80 mb-1">Tujuan Papan Kanban Proyek</label>
                <select id="select-new-project" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  ${availableBoards.map(b => `
                    <option value="${b.id}" data-name="${b.name}" ${b.id === 'panen-kunci' ? 'selected' : ''}>${b.name}</option>
                  `).join('')}
                </select>
                <p class="text-[10px] text-white/50 mt-1">Saat scan QR SampulKreativ, pengguna langsung masuk ke papan ini.</p>
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
                <label class="block text-[11px] font-semibold text-white/80 mb-1">Tujuan Papan Kanban Proyek</label>
                <select id="select-edit-project" class="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#171135] text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                  ${availableBoards.map(b => `
                    <option value="${b.id}" data-name="${b.name}">${b.name}</option>
                  `).join('')}
                </select>
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

  _renderPrintModal() {
    return `
      <div id="modal-print-user-card" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-[#0e0a22]/95 backdrop-blur-2xl rounded-2xl max-w-sm w-full p-6 shadow-2xl shadow-purple-950/80 border border-white/15 text-center flex flex-col items-center text-white" style="background-color: #0e0a22; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%);">
          <div class="w-full flex items-center justify-between pb-2 border-b border-white/10 mb-4">
            <h3 class="text-sm font-bold text-white">Kartu Identitas & QR SampulKreativ</h3>
            <button id="btn-close-print-modal" class="text-white/50 hover:text-white cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Card Mockup with Scannable QR -->
          <div id="print-card-badge" class="w-full aspect-[1.58/1] rounded-2xl p-4 bg-gradient-to-br from-[#1b123a] via-[#2a1758] to-[#401f80] border border-purple-400/35 text-white shadow-xl flex flex-col justify-between text-left relative overflow-hidden mb-4">
            <div class="flex items-center justify-between relative z-10">
              <div class="flex items-center gap-2">
                <img src="/assets/logo.png" class="w-6 h-6 rounded-md object-contain bg-white/10 p-0.5" alt="Logo" />
                <span class="text-[11px] font-bold tracking-wider uppercase">Sampulkreativ Technology</span>
              </div>
              <span id="print-card-role" class="text-[9.5px] px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 font-semibold uppercase">EMPLOYEE</span>
            </div>

            <div class="relative z-10 my-2 flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h4 id="print-card-name" class="text-[15px] font-bold tracking-tight text-white truncate">Nama Pengguna</h4>
                <p id="print-card-pos" class="text-[11px] text-purple-200 truncate">Jabatan Pegawai</p>
                <p id="print-card-nip" class="text-[10px] font-mono text-amber-300 mt-0.5">2026...</p>
                
                <!-- Assigned Board & Task on Card -->
                <div class="mt-1 flex flex-col gap-0.5">
                  <div class="inline-flex items-center gap-1 text-[9.5px] text-teal-300 font-bold">
                    <span class="material-symbols-outlined text-[12px]">view_kanban</span>
                    <span id="print-card-board" class="truncate">Panen Kunci</span>
                  </div>
                  <div id="print-card-task" class="text-[9px] text-purple-200/90 truncate max-w-[140px]">
                    Semua Tugas Papan
                  </div>
                </div>
              </div>

              <!-- Scannable QR Code Container -->
              <div class="shrink-0 flex flex-col items-center">
                <div id="print-card-qr-container" class="w-18 h-18 bg-white p-1 rounded-xl shadow-md flex items-center justify-center overflow-hidden">
                  <!-- SVG QR inserted dynamically -->
                </div>
                <span class="text-[7.5px] font-mono text-white/60 tracking-wider mt-1 uppercase">Scan SampulKreativ</span>
              </div>
            </div>

            <div class="flex items-center justify-between relative z-10 text-[9.5px] text-white/80 border-t border-white/15 pt-1.5 font-mono">
              <span id="print-card-username" class="text-purple-300">@username</span>
              <span class="text-white/50">CREATIVE OFFICE ID</span>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full">
            <button id="btn-do-print" type="button" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs shadow-md border border-purple-400/35 cursor-pointer flex items-center justify-center gap-1.5 transition-all">
              <span class="material-symbols-outlined text-[16px]">print</span>
              <span>Cetak Kartu</span>
            </button>
            <button id="btn-cancel-print" type="button" class="px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/10 text-white/80 font-semibold text-xs cursor-pointer transition-colors">
              Tutup
            </button>
          </div>
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
    const selectNewProject = this.element.querySelector('#select-new-project');
    const selectNewTask = this.element.querySelector('#select-new-task');
    const wrapNewCustomTask = this.element.querySelector('#wrap-new-custom-task');
    const inputNewCustomTask = this.element.querySelector('#input-new-custom-task');

    const updateCreateTaskOptions = () => {
      if (!selectNewTask) return;
      const boardId = selectNewProject ? selectNewProject.value : 'panen-kunci';
      const tasks = this.getTasksForBoard(boardId);

      let optionsHtml = `
        <option value="all">⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
      `;

      if (tasks && tasks.length > 0) {
        optionsHtml += tasks.map(t => `
          <option value="${t.id}" data-title="${t.title}">[${t.code || 'TSK'}] ${t.title}</option>
        `).join('');
      }

      optionsHtml += `
        <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
      `;

      selectNewTask.innerHTML = optionsHtml;
      if (wrapNewCustomTask) wrapNewCustomTask.classList.add('hidden');
    };

    if (selectNewProject) {
      selectNewProject.addEventListener('change', updateCreateTaskOptions);
    }

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
        updateCreateTaskOptions();
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

        const boardSelect = this.element.querySelector('#select-new-project');
        const assignedProjectId = boardSelect ? boardSelect.value : 'panen-kunci';
        const selectedBoardOption = boardSelect ? boardSelect.options[boardSelect.selectedIndex] : null;
        const assignedBoardName = selectedBoardOption ? (selectedBoardOption.getAttribute('data-name') || selectedBoardOption.text) : 'Panen Kunci';

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
          assignedTaskTitle = 'Seluruh Papan (Semua Tugas)';
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
          assignedWorkspace: assignedProjectId,
          assignedBoardName,
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
          this.notificationService.success(`Akun ${username} berhasil dibuat & ditugaskan ke "${assignedBoardName}"!`);
        }
        this.mount(this.element);
      });
    }

    // Modal Edit User
    const modalEdit = this.element.querySelector('#modal-edit-user');
    const btnCloseEdit = this.element.querySelector('#btn-close-edit-user');
    const btnCancelEdit = this.element.querySelector('#btn-cancel-edit-user');
    const formEdit = this.element.querySelector('#form-edit-user');
    const selectEditProject = this.element.querySelector('#select-edit-project');
    const selectEditTask = this.element.querySelector('#select-edit-task');
    const wrapEditCustomTask = this.element.querySelector('#wrap-edit-custom-task');
    const inputEditCustomTask = this.element.querySelector('#input-edit-custom-task');

    const updateEditTaskOptions = (preferredTaskId = null) => {
      if (!selectEditTask) return;
      const boardId = selectEditProject ? selectEditProject.value : 'panen-kunci';
      const tasks = this.getTasksForBoard(boardId);

      let optionsHtml = `
        <option value="all">⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
      `;

      if (tasks && tasks.length > 0) {
        optionsHtml += tasks.map(t => `
          <option value="${t.id}" data-title="${t.title}" ${preferredTaskId === t.id ? 'selected' : ''}>[${t.code || 'TSK'}] ${t.title}</option>
        `).join('');
      }

      optionsHtml += `
        <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
      `;

      selectEditTask.innerHTML = optionsHtml;
      if (wrapEditCustomTask) wrapEditCustomTask.classList.add('hidden');
    };

    if (selectEditProject) {
      selectEditProject.addEventListener('change', () => updateEditTaskOptions());
    }

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

        const boardSelect = this.element.querySelector('#select-edit-project');
        const assignedProjectId = boardSelect ? boardSelect.value : 'panen-kunci';
        const selectedBoardOption = boardSelect ? boardSelect.options[boardSelect.selectedIndex] : null;
        const assignedBoardName = selectedBoardOption ? (selectedBoardOption.getAttribute('data-name') || selectedBoardOption.text) : 'Panen Kunci';

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
          assignedTaskTitle = 'Seluruh Papan (Semua Tugas)';
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
          users[idx].assignedWorkspace = assignedProjectId;
          users[idx].assignedBoardName = assignedBoardName;
          users[idx].assignedTaskId = assignedTaskId;
          users[idx].assignedTaskTitle = assignedTaskTitle;
          users[idx].telegramChat = telegramChat;
          users[idx].telegramId = telegramId;

          this.saveUsers(users);
          closeEditModal();
          if (this.notificationService) {
            this.notificationService.success(`Perubahan akun ${users[idx].username} & penugasan berhasil disimpan!`);
          }
          this.mount(this.element);
        }
      });
    }

    // Modal Print Card
    const modalPrint = this.element.querySelector('#modal-print-user-card');
    const btnClosePrint = this.element.querySelector('#btn-close-print-modal');
    const btnCancelPrint = this.element.querySelector('#btn-cancel-print');
    const btnDoPrint = this.element.querySelector('#btn-do-print');

    const closePrintModal = () => {
      if (modalPrint) modalPrint.classList.add('hidden');
    };

    if (btnClosePrint) btnClosePrint.addEventListener('click', closePrintModal);
    if (btnCancelPrint) btnCancelPrint.addEventListener('click', closePrintModal);
    if (btnDoPrint) {
      btnDoPrint.addEventListener('click', () => {
        window.print();
      });
    }

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

        const targetProj = user.assignedProjectId || 'panen-kunci';
        const targetWs = user.assignedWorkspace || targetProj;
        const targetTask = user.assignedTaskId;

        if (confirm(`Masuk langsung sebagai ${user.fullName} (${user.username}) ke Papan Kanban "${user.assignedBoardName || targetProj}"?`)) {
          const userAvatar = this.authService ? this.authService.resolveUserAvatar(user) : (user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || user.username)}`);

          const userObj = {
            id: user.id,
            name: user.fullName,
            username: user.username,
            role: user.role === 'admin' ? 'admin' : 'user',
            title: user.position,
            avatar: userAvatar,
            assignedProjectId: targetProj,
            assignedWorkspace: targetWs,
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

        const projSelect = this.element.querySelector('#select-edit-project');
        if (projSelect) {
          projSelect.value = user.assignedProjectId || 'panen-kunci';
        }

        // Update task options for the user's project
        const taskSelect = this.element.querySelector('#select-edit-task');
        if (taskSelect) {
          const boardId = user.assignedProjectId || 'panen-kunci';
          const tasks = this.getTasksForBoard(boardId);

          let optionsHtml = `
            <option value="all" ${user.assignedTaskId === 'all' || !user.assignedTaskId ? 'selected' : ''}>⭐ Seluruh Papan (Semua Tugas di Papan Ini)</option>
          `;

          if (tasks && tasks.length > 0) {
            optionsHtml += tasks.map(t => `
              <option value="${t.id}" data-title="${t.title}" ${user.assignedTaskId === t.id ? 'selected' : ''}>[${t.code || 'TSK'}] ${t.title}</option>
            `).join('');
          }

          optionsHtml += `
            <option value="create_new">➕ Buat Tugas Baru Langsung untuk Pengguna...</option>
          `;

          taskSelect.innerHTML = optionsHtml;
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

    // Print Card Button with Real Scannable QR Code
    const printBtns = this.element.querySelectorAll('.btn-user-print-card');
    const modalPrint = this.element.querySelector('#modal-print-user-card');
    printBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const user = this.getUsers().find(u => u.id === userId);
        if (!user || !modalPrint) return;

        const nameEl = this.element.querySelector('#print-card-name');
        const posEl = this.element.querySelector('#print-card-pos');
        const nipEl = this.element.querySelector('#print-card-nip');
        const usnEl = this.element.querySelector('#print-card-username');
        const roleEl = this.element.querySelector('#print-card-role');
        const boardEl = this.element.querySelector('#print-card-board');
        const taskEl = this.element.querySelector('#print-card-task');
        const qrContainer = this.element.querySelector('#print-card-qr-container');

        if (nameEl) nameEl.textContent = user.fullName;
        if (posEl) posEl.textContent = user.position;
        if (nipEl) nipEl.textContent = `NIP: ${user.nip || '-'}`;
        if (usnEl) usnEl.textContent = user.username;
        if (roleEl) roleEl.textContent = user.role.toUpperCase();
        if (boardEl) boardEl.textContent = user.assignedBoardName || (user.assignedProjectId === 'panen-kunci' ? 'Panen Kunci' : user.assignedProjectId) || 'Panen Kunci';
        if (taskEl) taskEl.textContent = user.assignedTaskTitle || 'Seluruh Tugas Papan';

        // Generate clean QR code string that can be scanned by SampulKreativ app / webcam
        if (qrContainer) {
          const qrPayload = JSON.stringify({
            id: user.id,
            username: user.username,
            name: user.fullName,
            role: user.role,
            nip: user.nip || '',
            project: user.assignedProjectId || 'panen-kunci',
            task: user.assignedTaskId || 'all'
          });

          // Standard SVG QR for crisp printing
          const svgMarkup = QRCodeGenerator.generate(qrPayload, {
            size: 72,
            darkColor: '#0b061a',
            lightColor: '#ffffff',
            margin: 1
          });
          qrContainer.innerHTML = svgMarkup || `<span class="text-[9px] text-slate-800 font-mono font-bold">${user.username}</span>`;
        }

        modalPrint.classList.remove('hidden');
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
          if (this.notificationService) {
            this.notificationService.success(`Akun ${user.username} telah dihapus.`);
          }
          this.mount(this.element);
        }
      });
    });
  }
}

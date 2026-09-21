import { BaseView } from '../core/BaseView.js';

/**
 * UserManagementView - Halaman Manajemen Pengguna untuk Administrator
 * Memungkinkan Admin melihat daftar karyawan/siswa PKL, mengelola perangkat, membuat akun baru,
 * mengedit akun, mencetak kartu karyawan, mereset perangkat HP, dan login langsung ke akun.
 */
export class UserManagementView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container.resolve('AuthService');
    this.notificationService = container.resolve('NotificationService');
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

  render() {
    const allUsers = this.getUsers();
    const query = (this.searchQuery || '').trim().toLowerCase();
    const filteredUsers = query
      ? allUsers.filter(u =>
          (u.username || '').toLowerCase().includes(query) ||
          (u.fullName || '').toLowerCase().includes(query) ||
          (u.position || '').toLowerCase().includes(query) ||
          (u.role || '').toLowerCase().includes(query) ||
          (u.nip || '').toLowerCase().includes(query)
        )
      : allUsers;

    return `
      <div class="flex-1 bg-[#F0F2F5] p-4 md:p-8 select-none relative min-h-screen">
        <datalist id="school-datalist">
          <option value="SMKN 2 Sukabumi"></option>
          <option value="SMK PGRI 1 Cimahi"></option>
          <option value="Universitas Jenderal Achmad Yani"></option>
        </datalist>

        <!-- Navigation Back & Quick Actions -->
        <div class="flex items-center justify-between mb-4">
          <button
            id="btn-back-to-dashboard"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs border border-slate-200 transition-all cursor-pointer active:scale-95"
            title="Kembali ke Dashboard Utama"
          >
            <span class="material-symbols-outlined text-[17px]">arrow_back</span>
            <span>Kembali ke Dashboard</span>
          </button>

          <span class="text-xs font-semibold text-slate-500 bg-white/70 px-3 py-1 rounded-lg border border-slate-200/60">
            Total: <span class="text-[#1C3D3F] font-bold">${allUsers.length} Pengguna</span>
          </span>
        </div>

        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-[#1C3D3F]">Manajemen Pengguna</h1>
            <p class="text-xs text-slate-500 mt-1">Kelola data karyawan, siswa PKL, hak akses, dan keterikatan perangkat</p>
          </div>

          <div class="flex items-center gap-2.5">
            <!-- Live Search Box -->
            <div class="relative">
              <span class="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                id="input-search-users"
                type="text"
                placeholder="Cari pengguna..."
                value="${this.searchQuery}"
                class="w-48 sm:w-60 h-10 pl-8 pr-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-xs"
              />
            </div>

            <button
              id="btn-open-create-user-modal"
              class="flex items-center justify-center gap-2 bg-[#2AB0B2] hover:bg-[#209092] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
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
        <div class="bg-white rounded-2xl shadow-xs overflow-hidden border border-gray-100/50">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[650px]">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50/50">
                  <th class="text-left px-5 py-4 text-sm font-semibold text-gray-700">Username</th>
                  <th class="text-left px-5 py-4 text-sm font-semibold text-gray-700">Nama Lengkap</th>
                  <th class="text-left px-5 py-4 text-sm font-semibold text-gray-700">Role</th>
                  <th class="text-left px-5 py-4 text-sm font-semibold text-gray-700">Perangkat Terikat</th>
                  <th class="text-left px-5 py-4 text-sm font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
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
    `;
  }

  _renderEmptyState() {
    return `
      <tr>
        <td colspan="5" class="py-16 px-4 text-center">
          <div class="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div class="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#2AB0B2] mb-3.5 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 class="text-base font-bold text-[#1C3D3F]">Belum Ada Pengguna</h3>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
              Belum ada pengguna yang mendaftar atau masuk ke dalam sistem. Akun akan muncul otomatis saat pengguna mendaftar, atau Anda dapat membuat akun baru sekarang.
            </p>
            <button
              id="btn-empty-create-user"
              type="button"
              class="mt-4 inline-flex items-center justify-center gap-2 bg-[#2AB0B2] hover:bg-[#209092] text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
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
        <td colspan="5" class="py-12 px-4 text-center">
          <div class="flex flex-col items-center justify-center max-w-xs mx-auto text-slate-400">
            <span class="material-symbols-outlined text-[32px] text-slate-300 mb-1">search_off</span>
            <p class="text-xs font-semibold text-slate-600">Tidak ada pengguna yang cocok</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Coba gunakan kata kunci pencarian yang lain</p>
          </div>
        </td>
      </tr>
    `;
  }

  _renderUserRow(u) {
    const roleBadgeClass = u.role === 'admin'
      ? 'bg-teal-50 text-teal-600'
      : (u.role === 'student' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600');

    const deviceBadge = u.isDeviceBound
      ? `<span class="font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs inline-flex items-center gap-1" title="${u.device}">
           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone text-slate-500" aria-hidden="true">
             <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
             <path d="M12 18h.01"></path>
           </svg> ${u.device}
         </span>`
      : `<span class="font-semibold px-2 py-1 bg-gray-50 text-gray-400 rounded text-xs">Belum Terikat</span>`;

    return `
      <tr class="border-b border-gray-55 last:border-0 hover:bg-gray-50/30 transition-colors" data-user-id="${u.id}">
        <td class="px-5 py-4 text-sm font-mono text-[#1C3D3F] font-semibold">${u.username}</td>
        <td class="px-5 py-4 text-sm text-gray-600 font-medium">
          <div class="font-bold text-[#1C3D3F]">${u.fullName}</div>
          ${u.nip ? `<div class="text-[10px] text-[#2AB0B2] font-mono font-bold mt-0.5">${u.nip}</div>` : ''}
          <div class="text-xs text-gray-400 font-normal mt-0.5">${u.position}</div>
          ${u.telegramChat ? `
            <div class="text-[10px] text-gray-600 font-mono mt-0.5">
              <span class="font-extrabold text-[#2AB0B2]">Telegram Chat:</span> ${u.telegramChat} <span class="text-gray-300">|</span> <span class="font-bold text-gray-400">ID:</span> ${u.telegramId || '-'}
            </div>
          ` : ''}
          ${u.apiDeposit ? `
            <div class="mt-1">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key mr-1 text-teal-600" aria-hidden="true">
                  <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"></path>
                  <path d="m21 2-9.6 9.6"></path>
                  <circle cx="7.5" cy="15.5" r="5.5"></circle>
                </svg> KIE API: ${u.apiDeposit}
              </span>
            </div>
          ` : ''}
        </td>
        <td class="px-5 py-4">
          <span class="px-2.5 py-1 rounded text-xs font-semibold capitalize ${roleBadgeClass}">${u.role}</span>
        </td>
        <td class="px-5 py-4 text-sm max-w-[160px] truncate">
          ${deviceBadge}
        </td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-2.5">
            ${u.role !== 'admin' ? `
              <button
                class="btn-user-login-direct text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 shadow-3xs"
                data-id="${u.id}"
                title="Masuk langsung ke dashboard ${u.username} tanpa QR"
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
              class="btn-user-edit text-gray-300 hover:text-[#2AB0B2] transition-colors cursor-pointer"
              data-id="${u.id}"
              title="Edit Akun"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen" aria-hidden="true">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
              </svg>
            </button>

            ${u.isDeviceBound ? `
              <button
                class="btn-user-reset-device text-gray-300 hover:text-amber-500 transition-colors cursor-pointer"
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

            ${u.nip ? `
              <button
                class="btn-user-print-card text-gray-300 hover:text-[#2AB0B2] transition-colors cursor-pointer"
                data-id="${u.id}"
                title="Cetak Kartu Karyawan"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card" aria-hidden="true">
                  <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                  <line x1="2" x2="22" y1="10" y2="10"></line>
                </svg>
              </button>
            ` : ''}

            <button
              class="btn-user-delete text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
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
    return `
      <div id="modal-create-user" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <h3 class="text-lg font-bold text-[#1C3D3F]">Buat Akun Baru</h3>
            <button id="btn-close-create-user" class="text-gray-400 hover:text-gray-600 cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="form-create-user" class="flex flex-col gap-3.5">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Username (dengan @)</label>
              <input id="input-new-username" type="text" placeholder="@contohuser" required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input id="input-new-fullname" type="text" placeholder="Nama Lengkap Karyawan/Siswa" required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                <select id="select-new-role" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2] bg-white">
                  <option value="student">student (Siswa PKL)</option>
                  <option value="employee" selected>employee (Karyawan)</option>
                  <option value="admin">admin (Administrator)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Nomor Induk (NIP/NISN)</label>
                <input id="input-new-nip" type="text" placeholder="2026..." class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Posisi / Jabatan</label>
              <input id="input-new-position" type="text" placeholder="Contoh: Frontend Developer / Siswa PKL" required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Asal Sekolah / Kampus (Opsional)</label>
              <input id="input-new-school" list="school-datalist" type="text" placeholder="Pilih atau ketik asal sekolah..." class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
              <button id="btn-cancel-create-user" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 cursor-pointer">Batal</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2AB0B2] hover:bg-[#209092] text-white shadow-xs cursor-pointer">Simpan Akun</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  _renderEditModal() {
    return `
      <div id="modal-edit-user" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <h3 class="text-lg font-bold text-[#1C3D3F]">Edit Data Pengguna</h3>
            <button id="btn-close-edit-user" class="text-gray-400 hover:text-gray-600 cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="form-edit-user" class="flex flex-col gap-3.5">
            <input type="hidden" id="input-edit-user-id" />

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Username</label>
              <input id="input-edit-username" type="text" readonly class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-500 font-mono" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input id="input-edit-fullname" type="text" required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                <select id="select-edit-role" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2] bg-white">
                  <option value="student">student</option>
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Nomor Induk (NIP/NISN)</label>
                <input id="input-edit-nip" type="text" class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Posisi / Jabatan</label>
              <input id="input-edit-position" type="text" required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Telegram Chat</label>
                <input id="input-edit-telegram-chat" type="text" placeholder="KIE Nama" class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Telegram ID</label>
                <input id="input-edit-telegram-id" type="text" placeholder="-100..." class="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#2AB0B2]" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
              <button id="btn-cancel-edit-user" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 cursor-pointer">Batal</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2AB0B2] hover:bg-[#209092] text-white shadow-xs cursor-pointer">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  _renderPrintModal() {
    return `
      <div id="modal-print-user-card" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center flex flex-col items-center">
          <div class="w-full flex items-center justify-between pb-2 border-b border-gray-100 mb-4">
            <h3 class="text-sm font-bold text-[#1C3D3F]">Kartu Pegawai / Siswa</h3>
            <button id="btn-close-print-modal" class="text-gray-400 hover:text-gray-600 cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Card Mockup -->
          <div id="print-card-badge" class="w-full aspect-[1.58/1] rounded-2xl p-4 bg-gradient-to-br from-[#1C3D3F] via-[#245255] to-[#2AB0B2] text-white shadow-xl flex flex-col justify-between text-left relative overflow-hidden mb-4">
            <div class="flex items-center justify-between relative z-10">
              <div class="flex items-center gap-2">
                <img src="/assets/logo.png" class="w-6 h-6 rounded-md object-contain bg-white/10 p-0.5" alt="Logo" />
                <span class="text-[11px] font-bold tracking-wider uppercase">Sampulkreativ Technology</span>
              </div>
              <span id="print-card-role" class="text-[9.5px] px-2 py-0.5 rounded-full bg-white/20 font-semibold uppercase">EMPLOYEE</span>
            </div>

            <div class="relative z-10 my-2">
              <h4 id="print-card-name" class="text-[15px] font-bold tracking-tight text-white">Nama Pengguna</h4>
              <p id="print-card-pos" class="text-[11px] text-teal-200">Jabatan Pegawai</p>
              <p id="print-card-nip" class="text-[10px] font-mono text-white/70 mt-1">2026...</p>
            </div>

            <div class="flex items-center justify-between relative z-10 text-[9.5px] text-white/80 border-t border-white/15 pt-1.5 font-mono">
              <span id="print-card-username">@username</span>
              <span>CREATIVE OFFICE ID</span>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full">
            <button id="btn-do-print" type="button" class="flex-1 py-2.5 rounded-xl bg-[#2AB0B2] hover:bg-[#209092] text-white font-bold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5 transition-all">
              <span class="material-symbols-outlined text-[16px]">print</span>
              <span>Cetak Kartu</span>
            </button>
            <button id="btn-cancel-print" type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer">
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

    const openCreateModal = () => {
      if (modalCreate) {
        modalCreate.classList.remove('hidden');
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
                (u.nip || '').toLowerCase().includes(query)
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
          device: 'Belum Terikat',
          isDeviceBound: false,
          telegramChat: '',
          telegramId: '',
          apiDeposit: ''
        };

        users.push(newUser);
        this.saveUsers(users);
        closeCreateModal();
        if (this.notificationService) {
          this.notificationService.success(`Akun ${username} (${fullName}) berhasil dibuat!`);
        }
        this.mount(this.element);
      });
    }

    // Modal Edit User
    const modalEdit = this.element.querySelector('#modal-edit-user');
    const btnCloseEdit = this.element.querySelector('#btn-close-edit-user');
    const btnCancelEdit = this.element.querySelector('#btn-cancel-edit-user');
    const formEdit = this.element.querySelector('#form-edit-user');

    const closeEditModal = () => {
      if (modalEdit) modalEdit.classList.add('hidden');
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

        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx].fullName = fullName;
          users[idx].role = role;
          users[idx].nip = nip;
          users[idx].position = position;
          users[idx].telegramChat = telegramChat;
          users[idx].telegramId = telegramId;
          this.saveUsers(users);
          closeEditModal();
          if (this.notificationService) {
            this.notificationService.success(`Perubahan akun ${users[idx].username} berhasil disimpan!`);
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

    // Login Direct Button
    const loginBtns = this.element.querySelectorAll('.btn-user-login-direct');
    loginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const user = this.getUsers().find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Masuk langsung sebagai ${user.fullName} (${user.username})?`)) {
          this.authService.loginWithRole(user.role === 'admin' ? 'admin' : 'user');
          try {
            localStorage.setItem('creative_office_auth_user', JSON.stringify({
              id: user.id,
              name: user.fullName,
              username: user.username,
              role: user.role === 'admin' ? 'admin' : 'user',
              title: user.position
            }));
            sessionStorage.setItem('creative_office_session_active', 'true');
          } catch (e) {}

          if (this.notificationService) {
            this.notificationService.success(`Berhasil login sebagai ${user.fullName}`);
          }
          window.location.hash = user.role === 'admin' ? '#/dashboard' : '#/kanban';
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

    // Print Card Button
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

        if (nameEl) nameEl.textContent = user.fullName;
        if (posEl) posEl.textContent = user.position;
        if (nipEl) nipEl.textContent = `NIP: ${user.nip || '-'}`;
        if (usnEl) usnEl.textContent = user.username;
        if (roleEl) roleEl.textContent = user.role.toUpperCase();

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

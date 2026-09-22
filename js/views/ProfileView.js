import { BaseView } from '../core/BaseView.js';

/**
 * ProfileView - View untuk mengelola profil pengguna (khususnya role User dan anggota tim)
 * Mengizinkan perubahan foto profil, nama lengkap, alamat email/gmail, kata sandi, dan info kontak.
 */
export class ProfileView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container.resolve('AuthService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.pendingAvatarUrl = null;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _compressImage(file, maxSize = 256, quality = 0.85) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            const targetDim = Math.min(maxSize, minDim);
            canvas.width = targetDim;
            canvas.height = targetDim;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetDim, targetDim);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch (err) {
            resolve(loadEvt.target.result);
          }
        };
        img.onerror = () => resolve(loadEvt.target.result);
        img.src = loadEvt.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  render() {
    const user = this.authService.getCurrentUser() || {
      name: 'User Anggota',
      email: 'user@sampulkreativ.id',
      role: 'user',
      title: 'Editor & Anggota Tim Proyek',
      avatar: '',
      workspaceAccess: ['panen-kunci']
    };

    const isUserRole = (user.role || '').toLowerCase() === 'user';
    const currentAvatar = this.pendingAvatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=2563eb&color=fff&bold=true`;
    const userInitial = user.name ? user.name.slice(0, 2).toUpperCase() : 'US';
    const activeWs = localStorage.getItem('active_workspace') || (user.workspaceAccess && user.workspaceAccess[0]) || 'panen-kunci';

    return `
      <div class="profile-page-container min-h-[calc(100vh-var(--topbar-height))] text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start custom-scrollbar relative overflow-hidden">
        
        <!-- Ambient Studio Glow Orbs -->
        <div class="creativoffice-orb bg-purple-600/25 w-[450px] h-[450px] -top-20 -left-20"></div>
        <div class="creativoffice-orb bg-indigo-600/20 w-[420px] h-[420px] top-64 -right-20"></div>

        <div class="relative z-10 w-full max-w-4xl flex flex-col gap-6">

          <!-- Top Navigation & Breadcrumb -->
          <div class="flex items-center justify-between gap-4 pb-3 border-b border-white/15">
            <div class="flex items-center gap-2">
              <button id="btn-profile-back" type="button" class="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10" title="Kembali ke Papan Projek">
                <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Kembali ke Papan Projek</span>
              </button>
              <span class="text-white/40">/</span>
              <span class="font-bold text-white">Profil &amp; Kredensial CreativOffice</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full text-[11px] font-bold ${isUserRole ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35' : 'bg-purple-500/20 text-purple-300 border border-purple-400/35'} flex items-center gap-1.5 shadow-sm">
                <span class="material-symbols-outlined text-[14px]">${isUserRole ? 'verified' : 'admin_panel_settings'}</span>
                <span>CreativOffice Pass • ${isUserRole ? 'Anggota Terverifikasi' : user.role.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <!-- Profile Hero Card -->
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/25 to-blue-900/30 border border-white/15 backdrop-blur-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xl">
            
            <!-- Avatar Section with Upload trigger -->
            <div class="relative group shrink-0 flex flex-col items-center">
              <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-purple-400/50 shadow-md bg-white/5 flex items-center justify-center cursor-pointer">
                <img 
                  id="profile-avatar-preview" 
                  src="${currentAvatar}" 
                  alt="${this._escapeHtml(user.name)}" 
                  class="w-full h-full object-cover"
                />

                <!-- Upload Button Overlay -->
                <label 
                  for="input-profile-avatar" 
                  class="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white text-[11.5px] font-bold gap-1 cursor-pointer"
                  title="Klik untuk mengganti foto profil"
                >
                  <span class="material-symbols-outlined text-[24px]">photo_camera</span>
                  <span>Ganti Foto</span>
                </label>
              </div>
              <input type="file" id="input-profile-avatar" class="hidden" accept="image/png,image/jpeg,image/webp,image/gif" />
              <span class="text-[10px] text-white/60 mt-1.5 flex items-center gap-1 font-medium">
                <span class="material-symbols-outlined text-[12px] text-purple-300">touch_app</span>
                <span>Klik foto untuk ganti</span>
              </span>
            </div>

            <!-- Hero Info & Quick Avatar Actions -->
            <div class="flex-1 text-center sm:text-left min-w-0 flex flex-col gap-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 class="text-[20px] sm:text-[22px] font-bold text-white tracking-tight" id="display-profile-name">
                    ${this._escapeHtml(user.name)}
                  </h2>
                  <p class="text-[13px] text-white/70 font-mono flex items-center justify-center sm:justify-start gap-1 mt-0.5" id="display-profile-email">
                    <span class="material-symbols-outlined text-[15px] text-purple-300">mail</span>
                    <span>${this._escapeHtml(user.email || 'user@sampulkreativ.id')}</span>
                  </p>
                </div>

                <div class="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                  <button 
                    type="button" 
                    id="btn-remove-avatar" 
                    class="h-8.5 px-3 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-white/70 text-[12px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                    title="Gunakan avatar inisial nama"
                  >
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                    <span>Reset Inisial</span>
                  </button>
                </div>
              </div>

              <!-- Presets Avatar Options -->
              <div class="mt-2 pt-2.5 border-t border-white/10 flex items-center gap-2 flex-wrap justify-center sm:justify-start text-[11px] text-white/60">
                <span class="font-semibold">Pilihan Avatar Cepat:</span>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 font-bold hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer" data-seed="blue">🔵 Biru</button>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-200 font-bold hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer" data-seed="purple">🟣 Ungu</button>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer" data-seed="emerald">🟢 Hijau</button>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 font-bold hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer" data-seed="amber">🟡 Oranye</button>
              </div>
            </div>
          </div>

          <!-- Main Profile Settings Form -->
          <form id="form-edit-user-profile" class="flex flex-col gap-6">

            <!-- Section 1: Informasi Akun -->
            <div class="p-6 rounded-2xl bg-[#0e0a22]/85 backdrop-blur-2xl border border-white/15 flex flex-col gap-4 shadow-2xl shadow-purple-950/70 text-white">
              <div class="flex items-center gap-2.5 pb-3 border-b border-white/10">
                <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[19px]">badge</span>
                </div>
                <div>
                  <h3 class="text-[15px] font-bold text-white">Informasi Data Pribadi</h3>
                  <p class="text-[12px] text-white/60">Perbarui nama tampilan dan alamat email yang tercatat di papan proyek</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Nama Lengkap -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Nama Lengkap <span class="text-rose-400">*</span>
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-purple-300 text-[18px]">person</span>
                    <input 
                      type="text" 
                      id="input-profile-name" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 text-[13px] font-medium focus:outline-none focus:border-purple-400 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/30 transition-all"
                      value="${this._escapeHtml(user.name)}"
                      placeholder="Contoh: Nazwa Aulia Latifah"
                      required
                    />
                  </div>
                </div>

                <!-- Alamat Gmail / Email -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Alamat Gmail / Email <span class="text-rose-400">*</span>
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-purple-300 text-[18px]">mail</span>
                    <input 
                      type="email" 
                      id="input-profile-email" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 text-[13px] font-medium font-mono focus:outline-none focus:border-purple-400 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/30 transition-all"
                      value="${this._escapeHtml(user.email || '')}"
                      placeholder="nama@gmail.com"
                      required
                    />
                  </div>
                </div>

                <!-- Posisi / Peran Deskriptif -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Jabatan / Posisi Tim
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-purple-300 text-[18px]">work</span>
                    <input 
                      type="text" 
                      id="input-profile-title" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 text-[13px] font-medium focus:outline-none focus:border-purple-400 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/30 transition-all"
                      value="${this._escapeHtml(user.title || user.jobdesk || 'Editor & Anggota Tim Proyek')}"
                      placeholder="Contoh: UI/UX Designer / Content Creator"
                    />
                  </div>
                </div>

                <!-- Nomor Telepon / WhatsApp -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    No. Telepon / WhatsApp (Opsional)
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-purple-300 text-[18px]">phone</span>
                    <input 
                      type="tel" 
                      id="input-profile-phone" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 text-[13px] font-medium font-mono focus:outline-none focus:border-purple-400 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/30 transition-all"
                      value="${this._escapeHtml(user.phone || '')}"
                      placeholder="0812-3456-7890"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Footer -->
            <div class="pt-2 flex items-center justify-end gap-3">
              <button 
                type="button" 
                id="btn-cancel-profile-edit" 
                class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15 text-[13px] font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>

              <button 
                type="submit" 
                id="btn-save-profile" 
                class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[13px] flex items-center gap-2 shadow-lg shadow-purple-600/30 border border-purple-400/40 transition-all cursor-pointer active:scale-98"
              >
                <span class="material-symbols-outlined text-[18px]">check</span>
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    `;
  }

  bindEvents() {
    // Back navigation button: kembali ke papan kanban projek yang dikirim oleh admin
    const backBtn = this.element.querySelector('#btn-profile-back');
    const cancelBtn = this.element.querySelector('#btn-cancel-profile-edit');
    const handleBack = () => {
      // Revert pending avatar preview on cancel or back
      const currentUser = this.authService ? this.authService.getCurrentUser() : null;
      if (avatarImg && currentUser) {
        avatarImg.src = currentUser.avatar || '';
      }
      this.pendingAvatarUrl = null;

      const user = this.authService ? this.authService.getCurrentUser() : null;
      const isUserRole = (user?.role || '').toLowerCase() === 'user';

      if (!isUserRole) {
        // Admin or Manager: return to previous view or dashboard
        const fromView = localStorage.getItem('profile_opened_from_view');
        if (fromView && fromView !== 'profile' && fromView !== 'profil') {
          this.eventBus.emit('navigate', { view: fromView });
          return;
        }
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        this.eventBus.emit('navigate', { view: 'dashboard' });
      } else {
        // Regular user: pinned to their kanban board
        const returnProj = localStorage.getItem('profile_return_project') ||
                           localStorage.getItem('user_invited_project') ||
                           localStorage.getItem('active_project_id') ||
                           (user?.workspaceAccess && user.workspaceAccess[0]) || 'panen-kunci';
        const returnWs = localStorage.getItem('profile_return_workspace') ||
                         localStorage.getItem('user_invited_workspace') ||
                         localStorage.getItem('active_workspace') ||
                         returnProj;
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: returnProj,
          workspace: returnWs
        });
      }
    };
    if (backBtn) backBtn.addEventListener('click', handleBack);
    if (cancelBtn) cancelBtn.addEventListener('click', handleBack);

    // Avatar upload handling
    const fileInput = this.element.querySelector('#input-profile-avatar');
    const avatarImg = this.element.querySelector('#profile-avatar-preview');
    const removeAvatarBtn = this.element.querySelector('#btn-remove-avatar');

    if (avatarImg && fileInput) {
      avatarImg.parentElement?.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
          fileInput.click();
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (file.size > 12 * 1024 * 1024) {
            this.notificationService.warning('Ukuran foto terlalu besar. Maksimum 12MB.');
            return;
          }
          this.notificationService.info('Mengompres dan memproses foto profil...');
          const compressed = await this._compressImage(file, 256, 0.85);
          if (compressed) {
            this.pendingAvatarUrl = compressed;
            if (avatarImg) avatarImg.src = this.pendingAvatarUrl;
            this.notificationService.info('Foto dipilih! Klik "Simpan Perubahan" untuk menyimpan.');
          }
        }
      });
    }

    // Reset avatar button (deferred until save)
    if (removeAvatarBtn) {
      removeAvatarBtn.addEventListener('click', () => {
        const u = this.authService.getCurrentUser();
        const fallbackName = u?.name || 'User';
        this.pendingAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=2563eb&color=fff&bold=true`;
        if (avatarImg) avatarImg.src = this.pendingAvatarUrl;
        this.notificationService.info('Avatar diubah ke inisial. Klik "Simpan Perubahan" untuk menyimpan.');
      });
    }

    // Avatar Presets (deferred until save)
    const presetBtns = this.element.querySelectorAll('.btn-avatar-preset');
    const presetColors = {
      blue: '2563eb',
      purple: '7c3aed',
      emerald: '059669',
      amber: 'd97706'
    };
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const seed = btn.getAttribute('data-seed') || 'blue';
        const color = presetColors[seed] || '2563eb';
        const u = this.authService.getCurrentUser();
        const fallbackName = u?.name || 'User';
        this.pendingAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=${color}&color=fff&bold=true`;
        if (avatarImg) avatarImg.src = this.pendingAvatarUrl;
        this.notificationService.info(`Preset warna avatar dipilih. Klik "Simpan Perubahan" untuk menyimpan.`);
      });
    });

    // Form submit handler
    const form = this.element.querySelector('#form-edit-user-profile');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = this.element.querySelector('#input-profile-name');
        const emailInput = this.element.querySelector('#input-profile-email');
        const titleInput = this.element.querySelector('#input-profile-title');
        const phoneInput = this.element.querySelector('#input-profile-phone');

        const newName = nameInput ? nameInput.value.trim() : '';
        const newEmail = emailInput ? emailInput.value.trim() : '';
        const newTitle = titleInput ? titleInput.value.trim() : '';
        const newPhone = phoneInput ? phoneInput.value.trim() : '';

        if (!newName) {
          this.notificationService.warning('Nama lengkap tidak boleh kosong.');
          return;
        }

        if (!newEmail || !newEmail.includes('@')) {
          this.notificationService.warning('Format alamat email/Gmail tidak valid.');
          return;
        }

        // Apply updates through AuthService
        const updates = {
          name: newName,
          email: newEmail,
          title: newTitle,
          phone: newPhone
        };

        if (this.pendingAvatarUrl) {
          updates.avatar = this.pendingAvatarUrl;
        }

        const updatedUser = this.authService.updateCurrentUser(updates);
        if (updatedUser) {
          if (updatedUser.avatar) {
            try {
              localStorage.removeItem('current_user_avatar_override');
              if (this.authService && typeof this.authService.saveUserAvatar === 'function') {
                this.authService.saveUserAvatar(updatedUser, updatedUser.avatar);
              }
              if (updatedUser.id) localStorage.setItem(`user_avatar_id_${updatedUser.id}`, updatedUser.avatar);
              if (updatedUser.email) localStorage.setItem(`user_avatar_email_${updatedUser.email.toLowerCase().trim()}`, updatedUser.avatar);
              if (updatedUser.name) localStorage.setItem(`user_avatar_name_${updatedUser.name.toLowerCase().trim()}`, updatedUser.avatar);
            } catch (e) {}
          }
          // Update display names on page
          const dispName = this.element.querySelector('#display-profile-name');
          const dispEmail = this.element.querySelector('#display-profile-email span:nth-child(2)');
          if (dispName) dispName.textContent = updatedUser.name;
          if (dispEmail) dispEmail.textContent = updatedUser.email;
          this.pendingAvatarUrl = null;
          if (this.notificationService) {
            this.notificationService.success('Profil berhasil diperbarui!');
          }
        }
      });
    }
  }
}

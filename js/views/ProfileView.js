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
      <div class="min-h-[calc(100vh-var(--topbar-height))] bg-surface-container-lowest text-text-primary p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start custom-scrollbar">
        <div class="w-full max-w-4xl flex flex-col gap-6">

          <!-- Top Navigation & Breadcrumb -->
          <div class="flex items-center justify-between gap-4 pb-3 border-b border-surface-border">
              <button id="btn-profile-back" type="button" class="inline-flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer font-semibold px-2.5 py-1 rounded-lg hover:bg-surface-container" title="Kembali ke Papan Projek">
                <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Kembali ke Papan Projek</span>
              </button>
              <span class="text-text-muted">/</span>
              <span class="font-bold text-text-primary">Pengaturan Profil</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${isUserRole ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30' : 'bg-primary/10 text-primary border border-primary/20'} flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">${isUserRole ? 'verified' : 'admin_panel_settings'}</span>
                <span>${isUserRole ? 'Anggota Terverifikasi (Di-ACC)' : user.role.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <!-- Profile Hero Card -->
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-emerald-950/40 border border-surface-border p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
            
            <!-- Avatar Section with Upload trigger -->
            <div class="relative group shrink-0 flex flex-col items-center">
              <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-md bg-surface-container-low flex items-center justify-center cursor-pointer">
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
              <span class="text-[10px] text-text-muted mt-1.5 flex items-center gap-1 font-medium">
                <span class="material-symbols-outlined text-[12px] text-primary">touch_app</span>
                <span>Klik foto untuk ganti</span>
              </span>
            </div>

            <!-- Hero Info & Quick Avatar Actions -->
            <div class="flex-1 text-center sm:text-left min-w-0 flex flex-col gap-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 class="text-[20px] sm:text-[22px] font-bold text-text-primary tracking-tight" id="display-profile-name">
                    ${this._escapeHtml(user.name)}
                  </h2>
                  <p class="text-[13px] text-text-secondary font-mono flex items-center justify-center sm:justify-start gap-1 mt-0.5" id="display-profile-email">
                    <span class="material-symbols-outlined text-[15px] text-primary">mail</span>
                    <span>${this._escapeHtml(user.email || 'user@sampulkreativ.id')}</span>
                  </p>
                </div>

                <div class="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                  <button 
                    type="button" 
                    id="btn-remove-avatar" 
                    class="h-8.5 px-3 rounded-xl bg-surface-container hover:bg-rose-50 hover:text-rose-600 text-text-muted text-[12px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-surface-border"
                    title="Gunakan avatar inisial nama"
                  >
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                    <span>Reset Inisial</span>
                  </button>
                </div>
              </div>

              <!-- Presets Avatar Options -->
              <div class="mt-2 pt-2.5 border-t border-surface-border/60 flex items-center gap-2 flex-wrap justify-center sm:justify-start text-[11px] text-text-muted">
                <span class="font-semibold">Pilihan Avatar Cepat:</span>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer" data-seed="blue">🔵 Biru</button>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer" data-seed="purple">🟣 Ungu</button>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer" data-seed="emerald">🟢 Hijau</button>
                <button type="button" class="btn-avatar-preset px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer" data-seed="amber">🟡 Oranye</button>
              </div>
            </div>
          </div>

          <!-- Main Profile Settings Form -->
          <form id="form-edit-user-profile" class="flex flex-col gap-6">

            <!-- Section 1: Informasi Akun -->
            <div class="p-6 rounded-2xl bg-surface-container-lowest border border-surface-border flex flex-col gap-4 shadow-xs">
              <div class="flex items-center gap-2.5 pb-3 border-b border-surface-border">
                <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[19px]">badge</span>
                </div>
                <div>
                  <h3 class="text-[15px] font-bold text-text-primary">Informasi Data Pribadi</h3>
                  <p class="text-[12px] text-text-muted">Perbarui nama tampilan dan alamat email yang tercatat di papan proyek</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Nama Lengkap -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Nama Lengkap <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">person</span>
                    <input 
                      type="text" 
                      id="input-profile-name" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary text-[13px] font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value="${this._escapeHtml(user.name)}"
                      placeholder="Contoh: Nazwa Aulia Latifah"
                      required
                    />
                  </div>
                </div>

                <!-- Alamat Gmail / Email -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Alamat Gmail / Email <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">mail</span>
                    <input 
                      type="email" 
                      id="input-profile-email" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary text-[13px] font-medium font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value="${this._escapeHtml(user.email || '')}"
                      placeholder="nama@gmail.com"
                      required
                    />
                  </div>
                </div>

                <!-- Posisi / Peran Deskriptif -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Jabatan / Posisi Tim
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">work</span>
                    <input 
                      type="text" 
                      id="input-profile-title" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary text-[13px] font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value="${this._escapeHtml(user.title || user.jobdesk || 'Editor & Anggota Tim Proyek')}"
                      placeholder="Contoh: UI/UX Designer / Content Creator"
                    />
                  </div>
                </div>

                <!-- Nomor Telepon / WhatsApp -->
                <div>
                  <label class="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    No. Telepon / WhatsApp (Opsional)
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">phone</span>
                    <input 
                      type="tel" 
                      id="input-profile-phone" 
                      class="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary text-[13px] font-medium font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
                class="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary text-[13px] font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button 
                type="submit" 
                id="btn-save-profile" 
                class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[13px] flex items-center gap-2 shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-98"
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
      const returnProj = localStorage.getItem('profile_return_project') ||
                         localStorage.getItem('user_invited_project') ||
                         localStorage.getItem('active_project_id');

      const returnWs = localStorage.getItem('profile_return_workspace') ||
                       localStorage.getItem('user_invited_workspace') ||
                       localStorage.getItem('active_workspace') ||
                       returnProj;

      if (returnProj) {
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: returnProj,
          workspace: returnWs
        });
      } else {
        this.eventBus.emit('navigate', { view: 'dashboard' });
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
            try {
              localStorage.setItem('current_user_avatar_override', this.pendingAvatarUrl);
              const u = this.authService.getCurrentUser();
              if (u?.email) localStorage.setItem(`user_avatar_${u.email.toLowerCase().trim()}`, this.pendingAvatarUrl);
              if (u?.name) localStorage.setItem(`user_avatar_${u.name.toLowerCase().trim()}`, this.pendingAvatarUrl);
            } catch (err) {}
            this.authService.updateCurrentUser({ avatar: this.pendingAvatarUrl });
            this.notificationService.success('Foto profil berhasil diubah & diperbarui di semua tempat!');
          }
        }
      });
    }

    // Reset avatar button
    if (removeAvatarBtn) {
      removeAvatarBtn.addEventListener('click', () => {
        const u = this.authService.getCurrentUser();
        const fallbackName = u?.name || 'User';
        this.pendingAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=2563eb&color=fff&bold=true`;
        if (avatarImg) avatarImg.src = this.pendingAvatarUrl;
        this.authService.updateCurrentUser({ avatar: this.pendingAvatarUrl });
        this.notificationService.info('Avatar direset ke inisial nama dan diperbarui.');
      });
    }

    // Avatar Presets
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
        this.authService.updateCurrentUser({ avatar: this.pendingAvatarUrl });
        this.notificationService.info(`Preset warna avatar diterapkan di semua tempat.`);
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

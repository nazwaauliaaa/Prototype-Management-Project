import { BaseView } from '../core/BaseView.js';
import { QRCodeGenerator } from '../services/QRCodeGenerator.js';
import { apiService } from '../services/ApiService.js';

/**
 * RegisterView - Single Responsibility Principle (SRP)
 * Renders the Registration View for registering an unregistered QR code,
 * binding it to the user identity in PostgreSQL/Supabase, and locking access to this device.
 */
export class RegisterView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container.resolve('AuthService');
    this.notificationService = container.resolve('NotificationService');
    this.qrCode = this._extractScannedQr();
    this.parsedPayload = this._parsePayload(this.qrCode);
  }

  _extractScannedQr() {
    // 1. From URL query string
    const urlParams = new URLSearchParams(window.location.search);
    let qr = urlParams.get('qr') || urlParams.get('code');
    if (qr) return decodeURIComponent(qr).trim();

    // 2. From hash params e.g. #/register?qr=...
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const hashQuery = hash.split('?')[1];
      const hp = new URLSearchParams(hashQuery);
      qr = hp.get('qr') || hp.get('code');
      if (qr) return decodeURIComponent(qr).trim();
    }

    // 3. From sessionStorage
    qr = sessionStorage.getItem('pending_registration_qr');
    if (qr) return qr.trim();

    return 'QR-NEW-' + Date.now().toString().slice(-6);
  }

  _parsePayload(raw) {
    if (!raw) return {};
    let parsed = {};
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {}
    } else if (raw.includes(':')) {
      const lines = raw.split(/[\r\n,]+/);
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const k = line.slice(0, colonIdx).trim().toLowerCase();
          const v = line.slice(colonIdx + 1).trim();
          if (k && v) parsed[k] = v;
        }
      }
    }
    return parsed;
  }

  render() {
    const defaultName = this.parsedPayload.name || this.parsedPayload.nama || '';
    const defaultRole = (this.parsedPayload.role || this.parsedPayload.peran || 'user').toLowerCase();
    const defaultJobdesk = this.parsedPayload.jobdesk || this.parsedPayload.job || this.parsedPayload.jabatan || (defaultRole === 'admin' ? 'Administrator' : 'Web development');
    const defaultEmail = this.parsedPayload.email || (defaultName ? `${defaultName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id` : '');
    const deviceName = apiService.getDeviceName();
    const deviceId = apiService.getDeviceId();

    return `
      <div class="min-h-screen relative overflow-hidden flex items-center justify-center p-spacing-lg" style="background: radial-gradient(circle at 50% 15%, #581c87 0%, #3b0764 35%, #1e0538 70%, #0c0117 100%);">
        
        <!-- Glowing Neon Purple Cyber Aura & Animated Ambient Orbs -->
        <div class="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-purple-600/35 blur-[120px] pointer-events-none animate-pulse"></div>
        <div class="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-fuchsia-600/30 blur-[130px] pointer-events-none animate-pulse"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-violet-600/25 blur-[140px] pointer-events-none"></div>
        
        <!-- Futuristic Neon Dot Grid Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-25" style="background-image: radial-gradient(rgba(216, 180, 254, 0.45) 1.2px, transparent 1.2px); background-size: 28px 28px;"></div>

        <!-- Ambient Neon Horizontal Glow Streaks -->
        <div class="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none"></div>
        <div class="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent pointer-events-none"></div>

        <main class="w-full max-w-lg relative z-10 py-6">
          <div class="relative w-full bg-surface-container-lowest/95 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.35),0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-6 sm:p-8 flex flex-col border border-purple-400/40 text-slate-800">
            
            <!-- Atmospheric top accent gradients (Neon Purple & Magenta Glow) -->
            <div class="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/30 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -top-12 -right-12 w-48 h-48 bg-fuchsia-500/30 rounded-full blur-2xl pointer-events-none"></div>

            <!-- Header & Badge -->
            <div class="relative z-10 flex items-center justify-between gap-3 mb-5 pb-4 border-b border-purple-100">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-sm p-2 flex items-center justify-center shrink-0">
                  <img alt="Creative Office Logo" class="w-full h-full object-contain rounded-lg" src="assets/logo.svg" />
                </div>
                <div>
                  <h1 class="font-bold text-[18px] sm:text-[20px] text-slate-900 tracking-tight leading-snug">Pendaftaran Akun QR</h1>
                  <p class="text-[11.5px] text-purple-700 font-medium">Daftarkan Kode QR ke Database PostgreSQL</p>
                </div>
              </div>
              <span class="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 font-badge-micro text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                NEW USER GATE
              </span>
            </div>

            <!-- Scanned QR Preview Info Card -->
            <div class="relative z-10 mb-5 p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/80 flex items-center gap-4">
              <div class="w-16 h-16 bg-white p-1 rounded-xl shadow-xs border border-purple-200 shrink-0 flex items-center justify-center">
                ${QRCodeGenerator.generate(this.qrCode, { size: 56, darkColor: '#3b0764' })}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-[15px] text-amber-600">qr_code_scanner</span>
                  <span class="text-[11px] font-bold text-amber-900 uppercase tracking-wider">QR Belum Terdaftar</span>
                </div>
                <p class="text-[12px] text-slate-700 font-mono font-medium truncate" title="${this.qrCode}">
                  ${this.qrCode}
                </p>
                <p class="text-[10.5px] text-slate-500 mt-0.5">Kode QR di atas akan disimpan dan dikaitkan ke identitas Anda.</p>
              </div>
            </div>

            <!-- Registration Form -->
            <form id="form-register-user" class="relative z-10 flex flex-col gap-4">
              
              <!-- Nama Lengkap -->
              <div>
                <label for="input-reg-name" class="block text-[12px] font-bold text-slate-800 mb-1">
                  Nama Lengkap <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400 pointer-events-none">person</span>
                  <input
                    id="input-reg-name"
                    name="name"
                    type="text"
                    required
                    value="${defaultName}"
                    placeholder="Contoh: Dimas Anggara"
                    class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-purple-600 rounded-xl text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                  />
                </div>
              </div>

              <!-- Role & Jobdesk Row -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Role -->
                <div>
                  <label for="select-reg-role" class="block text-[12px] font-bold text-slate-800 mb-1">
                    Peran / Otoritas <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400 pointer-events-none">badge</span>
                    <select
                      id="select-reg-role"
                      name="role"
                      class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 focus:border-purple-600 rounded-xl text-[12.5px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium appearance-none"
                    >
                      <option value="user" ${defaultRole === 'user' ? 'selected' : ''}>Kontributor / User</option>
                      <option value="manajement-project" ${defaultRole === 'manajement-project' ? 'selected' : ''}>Project Manager</option>
                      <option value="qa" ${defaultRole === 'qa' ? 'selected' : ''}>Quality Assurance</option>
                      <option value="admin" ${defaultRole === 'admin' ? 'selected' : ''}>Administrator</option>
                    </select>
                    <span class="material-symbols-outlined absolute right-2.5 top-2.5 text-[18px] text-slate-400 pointer-events-none">arrow_drop_down</span>
                  </div>
                </div>

                <!-- Jobdesk -->
                <div>
                  <label for="input-reg-jobdesk" class="block text-[12px] font-bold text-slate-800 mb-1">
                    Jobdesk / Posisi <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400 pointer-events-none">work</span>
                    <input
                      id="input-reg-jobdesk"
                      name="jobdesk"
                      type="text"
                      required
                      value="${defaultJobdesk}"
                      placeholder="Contoh: Web development"
                      class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-purple-600 rounded-xl text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <!-- Email Kantor -->
              <div>
                <label for="input-reg-email" class="block text-[12px] font-bold text-slate-800 mb-1">
                  Email Kantor <span class="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400 pointer-events-none">mail</span>
                  <input
                    id="input-reg-email"
                    name="email"
                    type="email"
                    value="${defaultEmail}"
                    placeholder="nama.lengkap@sampulkreativ.id"
                    class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-purple-600 rounded-xl text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                  />
                </div>
              </div>

              <!-- Single Device Lock Notice -->
              <div class="p-3 rounded-2xl bg-blue-50/90 border border-blue-200/80 flex items-start gap-2.5 text-blue-900">
                <div class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <span class="material-symbols-outlined text-[16px]">phonelink_lock</span>
                </div>
                <div class="text-[11px] leading-relaxed">
                  <span class="font-bold">Keamanan Terikat Perangkat:</span>
                  Akun Anda akan secara otomatis dikunci ke perangkat ini:
                  <strong class="font-mono text-blue-800">${deviceName}</strong>.
                </div>
              </div>

              <!-- Feedback / Error Message -->
              <div id="reg-feedback" class="text-center text-[12px] min-h-[20px]"></div>

              <!-- Submit & Cancel Buttons -->
              <div class="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  id="btn-submit-register"
                  type="submit"
                  class="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[13px] shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Daftarkan QR & Masuk</span>
                </button>
                
                <button
                  id="btn-cancel-register"
                  type="button"
                  class="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Kembali</span>
                </button>
              </div>

            </form>

            <!-- Footer -->
            <div class="mt-4 pt-3 flex items-center justify-center gap-1 text-slate-400 font-caption-meta text-[11px]">
              <span class="material-symbols-outlined text-[14px] text-emerald-600">verified_user</span>
              <span>256-Bit SSL Enkripsi • Tersinkronisasi ke PostgreSQL</span>
            </div>

          </div>
        </main>
      </div>
    `;
  }

  bindEvents() {
    const form = this.element.querySelector('#form-register-user');
    const nameInput = this.element.querySelector('#input-reg-name');
    const roleSelect = this.element.querySelector('#select-reg-role');
    const emailInput = this.element.querySelector('#input-reg-email');
    const jobdeskInput = this.element.querySelector('#input-reg-jobdesk');
    const feedback = this.element.querySelector('#reg-feedback');
    const submitBtn = this.element.querySelector('#btn-submit-register');
    const cancelBtn = this.element.querySelector('#btn-cancel-register');

    // Auto-update email as name changes if not manually modified
    let emailManuallyEdited = false;
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        emailManuallyEdited = true;
      });
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (!emailManuallyEdited && emailInput) {
          const val = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
          emailInput.value = val ? `${val}@sampulkreativ.id` : '';
        }
      });
    }

    // Role preset helper
    if (roleSelect && jobdeskInput) {
      roleSelect.addEventListener('change', () => {
        const r = roleSelect.value;
        if (!jobdeskInput.value || jobdeskInput.value === 'Web development' || jobdeskInput.value === 'Anggota Tim & Kontributor' || jobdeskInput.value === 'Administrator' || jobdeskInput.value === 'QA Lead' || jobdeskInput.value === 'Project Manager') {
          if (r === 'admin') jobdeskInput.value = 'Administrator';
          else if (r === 'manajement-project') jobdeskInput.value = 'Project Manager';
          else if (r === 'qa') jobdeskInput.value = 'QA Lead';
          else jobdeskInput.value = 'Web development';
        }
      });
    }

    // Cancel / Back to Auth
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('pending_registration_qr');
        window.location.hash = '#/auth';
      });
    }

    // Submit Registration
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput ? nameInput.value.trim() : '';
        const role = roleSelect ? roleSelect.value : 'user';
        const jobdesk = jobdeskInput ? jobdeskInput.value.trim() : 'Anggota Tim & Kontributor';
        const email = emailInput ? emailInput.value.trim() : '';

        if (!name) {
          if (feedback) feedback.innerHTML = '<span class="text-rose-500 font-bold">Nama lengkap wajib diisi!</span>';
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
            <span>Mendaftarkan ke PostgreSQL...</span>
          `;
        }

        if (feedback) {
          feedback.innerHTML = '<span class="text-purple-600 font-semibold animate-pulse">Menghubungkan ke database & mengunci perangkat...</span>';
        }

        try {
          const payload = {
            name,
            role,
            jobdesk,
            title: jobdesk,
            email,
            qr_data: this.qrCode,
            rawCode: this.qrCode
          };

          const result = await apiService.registerUser(payload);

          // Handle single device lock conflict
          if (result && result.locked) {
            if (feedback) {
              feedback.innerHTML = `<span class="text-rose-500 font-bold">❌ Gagal: Akun "${name}" sudah terikat pada perangkat "${result.boundDeviceName || 'Perangkat Lain'}".</span>`;
            }
            if (this.notificationService) {
              this.notificationService.error(`Akun terkunci pada perangkat "${result.boundDeviceName}"`);
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">how_to_reg</span><span>Daftarkan QR & Masuk</span>`;
            }
            return;
          }

          let savedUser = null;
          let isOfflineFallback = false;

          if (result && result.success && result.data) {
            savedUser = result.data;
          } else if (!result || !result.locked) {
            // Fallback registrasi offline jika backend PostgreSQL tidak dapat dihubungi
            console.warn('[RegisterView] Backend offline/gagal, beralih ke registrasi lokal:', result?.error);
            isOfflineFallback = true;
            savedUser = {
              id: 'usr-' + Date.now().toString().slice(-6),
              name,
              role,
              jobdesk,
              title: jobdesk,
              email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
              workspace_access: ['ruangkreasi', 'panen-kunci'],
              bound_device_id: apiService.getDeviceId(),
              bound_device_name: apiService.getDeviceName(),
              is_locked_to_device: true,
              qr_data: this.qrCode
            };
          }

          if (savedUser) {
            sessionStorage.removeItem('pending_registration_qr');

            if (feedback) {
              feedback.innerHTML = isOfflineFallback
                ? '<span class="text-emerald-600 font-bold">✅ Berhasil Terdaftar (Mode Lokal)!</span><br><span class="text-[11px] text-amber-600 dark:text-amber-400">Tersimpan di browser karena backend PostgreSQL offline. Membuka sesi...</span>'
                : '<span class="text-emerald-600 font-bold">✅ Berhasil Terdaftar! Membuka sesi kerja...</span>';
            }

            if (this.notificationService) {
              if (isOfflineFallback) {
                this.notificationService.warning(`Akun ${savedUser.name} didaftarkan dalam Mode Offline (Lokal).`);
              } else {
                this.notificationService.success(`🎉 Selamat datang, ${savedUser.name}! Akun dan QR Anda telah resmi terdaftar di database.`);
              }
            }

            sessionStorage.setItem('auth_login_method', 'qr');
            const userInstance = this.authService.registerNewUser({
              ...savedUser,
              boundDeviceId: apiService.getDeviceId(),
              boundDeviceName: apiService.getDeviceName(),
              loginMethod: 'qr',
              qr_data: this.qrCode
            });

            localStorage.setItem('creative_office_user', JSON.stringify({
              ...savedUser,
              boundDeviceId: apiService.getDeviceId(),
              boundDeviceName: apiService.getDeviceName()
            }));

            setTimeout(() => {
              this.authService.loginAsUser(userInstance);
              const userRole = (userInstance.role || '').toLowerCase();
              if (userRole === 'user') {
                const targetWs = (userInstance.workspaceAccess && userInstance.workspaceAccess[0]) || 'panen-kunci';
                window.location.hash = `#/kanban/${targetWs}`;
              } else {
                window.location.hash = '#/dashboard';
              }
            }, 500);
            return;
          }

          const errMsg = (result && result.error) || 'Gagal menyimpan ke database.';
          if (feedback) {
            feedback.innerHTML = `<span class="text-rose-500 font-semibold">⚠️ ${errMsg}</span>`;
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">how_to_reg</span><span>Daftarkan QR & Masuk</span>`;
          }
        } catch (err) {
          console.warn('[RegisterView] Exception submit registrasi, beralih ke offline mode:', err);
          
          // Tetap izinkan user masuk dengan mode lokal offline
          try {
            sessionStorage.removeItem('pending_registration_qr');
            const fallbackUser = {
              id: 'usr-' + Date.now().toString().slice(-6),
              name,
              role,
              jobdesk,
              title: jobdesk,
              email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
              workspace_access: ['ruangkreasi', 'panen-kunci'],
              boundDeviceId: apiService.getDeviceId(),
              boundDeviceName: apiService.getDeviceName(),
              loginMethod: 'qr',
              qr_data: this.qrCode
            };

            if (feedback) {
              feedback.innerHTML = '<span class="text-emerald-600 font-bold">✅ Berhasil Terdaftar (Mode Lokal)!</span><br><span class="text-[11px] text-amber-600 dark:text-amber-400">Backend offline. Mengalihkan ke sesi kerja...</span>';
            }

            const userInstance = this.authService.registerNewUser(fallbackUser);
            localStorage.setItem('creative_office_user', JSON.stringify(fallbackUser));

            setTimeout(() => {
              this.authService.loginAsUser(userInstance);
              const userRole = (userInstance.role || '').toLowerCase();
              if (userRole === 'user') {
                const targetWs = (userInstance.workspaceAccess && userInstance.workspaceAccess[0]) || 'panen-kunci';
                window.location.hash = `#/kanban/${targetWs}`;
              } else {
                window.location.hash = '#/dashboard';
              }
            }, 500);
            return;
          } catch (innerErr) {
            if (feedback) {
              feedback.innerHTML = `<span class="text-rose-500 font-semibold">⚠️ Terjadi kesalahan: ${err.message}</span>`;
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">how_to_reg</span><span>Daftarkan QR & Masuk</span>`;
            }
          }
        }
      });
    }
  }
}

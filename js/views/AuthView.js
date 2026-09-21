import { BaseView } from '../core/BaseView.js';
import { QRCodeGenerator } from '../services/QRCodeGenerator.js';
import { apiService } from '../services/ApiService.js';
import { getDeviceId, getDeviceName, simulateSwitchDevice } from '../utils/deviceHelper.js';
import { User } from '../models/User.js';
import jsQR from 'jsqr';

/**
 * AuthView - Single Responsibility Principle (SRP)
 * Renders the Security Barcode/QR Card Gate, real-time QR camera scanner,
 * file upload scanner, Supabase account synchronization, and single device locking.
 */
export class AuthView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container.resolve('AuthService');
    this.notificationService = container.resolve('NotificationService');
  }

  getApprovedUsers() {
    try {
      const approvedMap = new Map();

      // 1. Dari approved_board_users di localStorage
      const rawApproved = localStorage.getItem('approved_board_users');
      if (rawApproved) {
        const list = JSON.parse(rawApproved);
        if (Array.isArray(list)) {
          list.forEach(u => {
            if (u && (u.email || u.name)) {
              const key = (u.email || u.name).toLowerCase().trim();
              approvedMap.set(key, u);
            }
          });
        }
      }

      // 2. Cari dari semua board_members_* di localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('board_members_')) {
          try {
            const rawMembers = localStorage.getItem(k);
            if (rawMembers) {
              const members = JSON.parse(rawMembers);
              if (Array.isArray(members)) {
                members.forEach(m => {
                  if (m && m.email && !m.email.endsWith('@workspace') && m.id !== 'usr-001') {
                    const key = m.email.toLowerCase().trim();
                    if (!approvedMap.has(key)) {
                      approvedMap.set(key, {
                        id: m.id || `usr-${Date.now()}`,
                        name: m.name || m.email.split('@')[0],
                        email: m.email,
                        role: 'user',
                        title: m.roleDescription || m.role || 'Anggota Tim',
                        color: m.color || '#2563eb',
                        initials: m.initials || (m.name ? m.name.slice(0, 2).toUpperCase() : 'U'),
                        workspace: m.workspace || k.replace('board_members_', ''),
                        projectId: m.projectId || m.workspace || k.replace('board_members_', '')
                      });
                    }
                  }
                });
              }
            }
          } catch (e) {}
        }
      }

      return Array.from(approvedMap.values());
    } catch (e) {
      return [];
    }
  }

  _renderModalApprovedUsersBanner() {
    const users = this.getApprovedUsers();
    if (!users || users.length === 0) return '';

    return `
      <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-800 dark:text-emerald-300">
            <span class="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
            <span>Akun Sudah Di-ACC Admin</span>
          </div>
          <span class="text-[9.5px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded">
            Masuk Kapan Saja
          </span>
        </div>
        <p class="text-[11px] text-emerald-700 dark:text-emerald-400 leading-tight">
          Akun Anda telah disetujui sebelumnya. Anda tidak perlu meminta link lagi, klik tombol di bawah untuk langsung membuka papan:
        </p>
        <div class="flex flex-col gap-1.5 mt-0.5">
          ${users.map(u => `
            <button
              type="button"
              class="btn-modal-quick-login-approved w-full p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-[11.5px] font-bold flex items-center justify-between shadow-xs transition-all cursor-pointer"
              data-user-email="${u.email}"
              data-user-name="${u.name}"
              data-user-ws="${u.workspace || ''}"
              data-user-proj="${u.projectId || ''}"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-[16px]">account_circle</span>
                <span class="truncate">${u.name} (${u.email})</span>
              </div>
              <span class="flex items-center gap-0.5 text-[10.5px] shrink-0 font-medium">
                <span>Buka Papan</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  loginAsApprovedMember({ email, name, workspace, projectId }) {
    try {
      if (typeof this.stopCamera === 'function') this.stopCamera();
      if (typeof this._cleanupCamera === 'function') this._cleanupCamera();
      if (this.cameraStream) {
        try {
          this.cameraStream.getTracks().forEach(t => {
            try { t.enabled = false; t.stop(); } catch(e) {}
          });
          this.cameraStream = null;
        } catch(e) {}
      }

      const cleanWs = workspace || localStorage.getItem('active_workspace') || 'panen-kunci';
      const cleanProj = projectId || localStorage.getItem('active_project_id') || cleanWs;
      const cleanName = name || email.split('@')[0];
      const cleanEmail = (email || '').toLowerCase().trim();

      const userInstance = new User({
        id: 'usr-' + Date.now(),
        name: cleanName,
        email: cleanEmail,
        role: 'user',
        title: 'Editor & Anggota Tim Proyek',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=2563eb&color=fff&bold=true`,
        workspaceAccess: [cleanWs, cleanProj, 'workspace-utama', 'ruangkreasi', 'panen-kunci', 'layarbaca', 'aikreativ']
      });

      if (this.authService) {
        this.authService.loginAsUser(userInstance);
      }

      localStorage.setItem('active_workspace', cleanWs);
      localStorage.setItem('active_project_id', cleanProj);
      localStorage.setItem('user_invited_workspace', cleanWs);
      localStorage.setItem('user_invited_project', cleanProj);

      if (this.notificationService) {
        this.notificationService.success(`🎉 Selamat datang kembali, ${cleanName}! Anda langsung masuk ke Papan.`);
      }

      const eventBus = this.container ? this.container.resolve('EventBus') : null;
      if (eventBus) {
        eventBus.emit('board:members_updated', { workspace: cleanWs, projectId: cleanProj });
        eventBus.emit('auth:login', userInstance);
      }

      window.location.hash = `#/kanban/${cleanProj}`;
    } catch (e) {
      console.error('Error loginAsApprovedMember:', e);
    }
  }

  render() {
    return `
      <div class="min-h-screen relative overflow-hidden flex items-center justify-center p-spacing-lg" style="background: radial-gradient(circle at 50% 15%, #581c87 0%, #3b0764 35%, #1e0538 70%, #0c0117 100%);">
        <style>
          @media (min-width: 768px) {
            #btn-switch-camera {
              display: none !important;
            }
          }
        </style>
        
        <!-- Glowing Neon Purple Cyber Aura & Animated Ambient Orbs -->
        <div class="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-purple-600/35 blur-[120px] pointer-events-none animate-pulse"></div>
        <div class="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-fuchsia-600/30 blur-[130px] pointer-events-none animate-pulse"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-violet-600/25 blur-[140px] pointer-events-none"></div>
        
        <!-- Futuristic Neon Dot Grid Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-25" style="background-image: radial-gradient(rgba(216, 180, 254, 0.45) 1.2px, transparent 1.2px); background-size: 28px 28px;"></div>

        <!-- Ambient Neon Horizontal Glow Streaks -->
        <div class="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none"></div>
        <div class="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent pointer-events-none"></div>

        <main class="w-full max-w-md relative z-10">
          <div class="relative w-full bg-surface-container-lowest/95 backdrop-blur-2xl rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.35),0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-spacing-xl flex flex-col items-center border border-purple-400/40">
            
            <!-- Atmospheric top accent gradients (Neon Purple & Magenta Glow) -->
            <div class="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/30 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -top-12 -right-12 w-48 h-48 bg-fuchsia-500/30 rounded-full blur-2xl pointer-events-none"></div>

            <!-- Header & Brand -->
            <div class="relative z-10 flex flex-col items-center text-center mb-spacing-md">
              <div class="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-sm p-spacing-xs flex items-center justify-center mb-spacing-sm">
                <img alt="Creative Office Logo" class="w-full h-full object-contain rounded-xl" src="/assets/logo.png" />
              </div>
              
              <div class="flex items-center gap-2 mb-1">
                <h1 class="font-headline-lg text-[22px] font-bold text-text-primary tracking-tight">Creative Office</h1>
                <span class="inline-flex items-center gap-1 bg-status-success/10 text-status-success font-badge-micro text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
                  HTTPS
                </span>
              </div>
              <p class="font-caption-meta text-[11px] text-text-secondary">by Sampulkreativ Technology</p>
            </div>

            <!-- Scanner Viewfinder Component (Portrait) -->
            <div class="relative z-10 w-full mb-spacing-md">
              <div class="relative w-full max-w-[280px] mx-auto aspect-[3/4] min-h-[300px] max-h-[380px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-spacing-md group border border-purple-500/30">
                
                <!-- Live Camera Video Feed (un-mirrored orientation for natural QR scanning) -->
                <video id="camera-video-stream" class="absolute inset-0 w-full h-full object-cover hidden z-10" playsinline autoplay muted style="transform: none; -webkit-transform: none;"></video>
                <!-- Camera Simulation Canvas (fallback if hardware camera is blocked/unavailable) -->
                <canvas id="camera-sim-canvas" class="absolute inset-0 w-full h-full object-cover hidden z-10" style="transform: none; -webkit-transform: none;"></canvas>

                <!-- Top Camera Status Indicator Badge -->
                <div id="camera-badge-info" class="hidden absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-status-success font-mono text-[9px] font-semibold items-center gap-1.5 z-30">
                  <span class="w-1.5 h-1.5 rounded-full bg-status-success animate-ping"></span>
                  <span id="camera-badge-mode">KAMERA DEPAN</span>
                </div>

                <!-- Top Camera Switch Button (In Viewfinder, Mobile view only, hidden on desktop) -->
                <button
                  id="btn-switch-camera"
                  type="button"
                  class="md:hidden flex absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-purple-950/80 active:scale-95 text-white text-[10px] font-semibold items-center gap-1.5 border border-purple-400/40 backdrop-blur-md shadow-lg cursor-pointer z-30 transition-all group/cam"
                  title="Ganti ke Kamera Depan / Belakang"
                >
                  <span id="icon-switch-camera" class="material-symbols-outlined text-[15px] text-emerald-400 group-hover/cam:rotate-180 transition-transform duration-300">flip_camera_ios</span>
                  <span id="text-switch-camera" class="font-mono text-[9px] text-purple-200">Belakang</span>
                </button>

                <!-- Viewfinder Corner Reticles (Neon Purple Glow) -->
                <div class="absolute top-3 left-3 w-5 h-5 flex flex-col justify-between pointer-events-none z-20">
                  <div class="w-5 h-0.5 bg-purple-400 rounded-full shadow-[0_0_8px_#c084fc]"></div>
                  <div class="w-0.5 h-4 bg-purple-400 rounded-full -mt-0.5 shadow-[0_0_8px_#c084fc]"></div>
                </div>
                <div class="absolute top-3 right-3 w-5 h-5 flex flex-col items-end justify-between pointer-events-none z-20">
                  <div class="w-5 h-0.5 bg-purple-400 rounded-full shadow-[0_0_8px_#c084fc]"></div>
                  <div class="w-0.5 h-4 bg-purple-400 rounded-full -mt-0.5 shadow-[0_0_8px_#c084fc]"></div>
                </div>
                <div class="absolute bottom-3 left-3 w-5 h-5 flex flex-col justify-between pointer-events-none z-20">
                  <div class="w-0.5 h-4 bg-purple-400 rounded-full mb-[-2px] shadow-[0_0_8px_#c084fc]"></div>
                  <div class="w-5 h-0.5 bg-purple-400 rounded-full shadow-[0_0_8px_#c084fc]"></div>
                </div>
                <div class="absolute bottom-3 right-3 w-5 h-5 flex flex-col items-end justify-between pointer-events-none z-20">
                  <div class="w-0.5 h-4 bg-purple-400 rounded-full mb-[-2px] shadow-[0_0_8px_#c084fc]"></div>
                  <div class="w-5 h-0.5 bg-purple-400 rounded-full shadow-[0_0_8px_#c084fc]"></div>
                </div>

                <!-- Animated Laser Beam Line -->
                <div class="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#ef4444] laser-scanner-beam pointer-events-none z-20"></div>

                <!-- Dynamic QR Code Container (shown if camera is off) -->
                <div id="qr-scanner-area" class="flex flex-col items-center justify-center opacity-90 transition-transform duration-300 group-hover:scale-105 cursor-pointer z-20" title="Klik untuk simulasi scan">
                  <div class="w-24 h-24 bg-white p-1.5 rounded-lg shadow-sm">
                    ${QRCodeGenerator.generate('http://localhost:3000/#/auth?scan=auto', { size: 84, darkColor: '#0b1c30' })}
                  </div>
                  <span class="mt-2.5 text-white/90 font-caption-meta text-[11px] tracking-wide uppercase font-semibold">Pindai ID Card / QR</span>
                </div>

                <!-- Live Camera Reticle Overlay (when camera is on, portrait proportion) -->
                <div id="camera-active-overlay" class="hidden absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                  <div class="w-40 h-40 border-2 border-dashed border-status-success/80 rounded-2xl animate-pulse flex items-center justify-center">
                    <span class="material-symbols-outlined text-[36px] text-status-success/80">filter_center_focus</span>
                  </div>
                  <span class="mt-3 px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-status-success font-mono text-[10px] font-bold tracking-wider">
                    SCANNING BARCODE / QR...
                  </span>
                </div>

                <!-- Scanner Controls Overlay (automatically on) -->
                <div class="absolute bottom-1.5 inset-x-1.5 sm:bottom-2 sm:inset-x-2 flex items-center justify-center px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg z-30">
                  <div class="flex items-center gap-2">
                    <span id="camera-status-dot" class="w-2 h-2 rounded-full bg-status-success animate-ping shrink-0"></span>
                    <span id="camera-status-text" class="font-badge-micro text-[10px] text-white uppercase tracking-wider">Kamera Pemindai Aktif</span>
                  </div>
                </div>
              </div>

              <p id="scanner-feedback" class="mt-2 text-center font-caption-meta text-[11px] text-text-muted">
                Arahkan barcode fisik kartu pegawai atau QR aplikasi ke dalam kotak pemindai.
              </p>
            </div>

            <!-- Direct to Beranda / Dashboard Button -->
            <div class="relative z-10 w-full flex flex-col gap-2 mt-2">
              <button
                id="btn-direct-to-home"
                type="button"
                class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-[13px] shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] border border-purple-400/30"
                title="Langsung masuk ke halaman beranda tanpa scan QR"
              >
                <span class="material-symbols-outlined text-[18px]">home</span>
                <span>Langsung Masuk ke Halaman Beranda</span>
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            <!-- Security Verification Footer -->
            <div class="mt-spacing-md pt-spacing-xs flex items-center justify-center gap-1.5 text-text-muted font-caption-meta text-[11px]">
              <span class="material-symbols-outlined text-[16px] text-status-success">verified_user</span>
              <span>256-Bit SSL Enkripsi • Keamanan Terverifikasi</span>
            </div>

          </div>
        </main>

        <!-- User Invite-Only Modal Dialog -->
        <div id="modal-user-invite-gate" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 text-slate-800 dark:text-slate-100">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                  <span class="material-symbols-outlined text-[20px]">link</span>
                </div>
                <div>
                  <h3 class="font-bold text-[15px] text-slate-900 dark:text-white">Akses Khusus Undangan</h3>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Peran User (Hanya via Tautan Admin/Manajer)</p>
                </div>
              </div>
              <button id="btn-close-user-invite-modal" class="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors" type="button">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Banner Akun yang Sudah Di-ACC (Bebas Masuk Kapan Saja) -->
            ${this._renderModalApprovedUsersBanner()}

            <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-[12px] leading-relaxed">
              <span class="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">lock</span>
              <div>
                <span class="font-bold">Akses Terbatas:</span>
                Pengguna dengan peran <b>User</b> tidak memiliki izin akses ke dashboard utama dan <b>hanya dapat membuka Papan Kanban</b> melalui tautan undangan resmi yang dibagikan oleh Admin atau Manajer Proyek.
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-bold text-[11.5px] uppercase tracking-wider text-slate-600 dark:text-slate-400">Tempel Tautan Undangan</label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[17px]">link</span>
                <input
                  id="input-user-invite-url"
                  type="text"
                  placeholder="https://.../?accept_invite=inv-...#/kanban"
                  class="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono"
                />
              </div>
              <p id="user-invite-url-error" class="hidden text-[11px] text-rose-500 font-medium"></p>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-0.5">
              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  id="input-user-invite-name"
                  type="text"
                  placeholder="Nama Anda..."
                  class="w-full h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Alamat Gmail</label>
                <input
                  id="input-user-invite-email"
                  type="email"
                  placeholder="nama@gmail.com"
                  class="w-full h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2 pt-1">
              <button
                id="btn-submit-user-invite-url"
                class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-98 transition-all cursor-pointer"
                type="button"
              >
                <span class="material-symbols-outlined text-[18px]">login</span>
                <span>Buka & Masuk via Tautan</span>
              </button>

              <div id="user-invite-resume-container" class="hidden flex flex-col gap-1">
                <button
                  id="btn-resume-invited-session"
                  class="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[12px] flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                  type="button"
                >
                  <span class="material-symbols-outlined text-[17px]">check_circle</span>
                  <span id="btn-resume-invited-label">Lanjutkan ke Papan Terundang</span>
                </button>
              </div>

              <div class="relative flex items-center justify-center my-1">
                <div class="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
                <span class="absolute px-2 bg-white dark:bg-slate-900 font-badge-micro text-[10px] text-slate-400 uppercase">Atau Uji Coba Demo</span>
              </div>

              <button
                id="btn-simulate-manager-invite"
                class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                type="button"
                title="Simulasi tautan undangan dari Manajer Proyek untuk keperluan pengujian"
              >
                <span class="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">mark_email_read</span>
                <span>Simulasikan Tautan Undangan Manajer (Demo)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Single Device Locked Security Modal Dialog -->
        <div id="modal-device-locked" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-300 dark:border-rose-900/80 p-6 flex flex-col items-center text-center">
            
            <div class="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 shadow-inner">
              <span class="material-symbols-outlined text-4xl">phonelink_lock</span>
            </div>

            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[10.5px] uppercase tracking-wider mb-2">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Akses Ditolak • Device Lock</span>
            </div>

            <h3 class="text-[17px] font-bold text-slate-900 dark:text-white" id="locked-user-title">Akun Terkunci di Perangkat Lain</h3>
            
            <p class="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-4 leading-relaxed" id="locked-user-description">
              Akun ini sudah tersambung dan aktif di perangkat lain. Sistem keamanan membatasi akses sehingga perangkat ini tidak dapat mengakses akun tersebut.
            </p>

            <div class="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs mb-5 flex flex-col gap-2">
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Perangkat Resmi:</span>
                <b class="text-slate-900 dark:text-slate-100 font-mono" id="locked-bound-device">Perangkat Lain</b>
              </div>
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Status Database Supabase:</span>
                <span class="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">lock</span> Terikat 1 Perangkat
                </span>
              </div>
              <div class="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[10.5px] text-slate-500 dark:text-slate-400">
                💡 Untuk memindahkan akun ke perangkat ini, silakan keluar sesi (logout) di perangkat sebelumnya terlebih dahulu.
              </div>
            </div>

            <div class="w-full flex flex-col gap-2">
              <button
                id="btn-switch-device-login"
                class="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-purple-500/30 flex items-center justify-center gap-1.5"
                type="button"
              >
                <span class="material-symbols-outlined text-[16px]">phonelink_ring</span>
                <span>Pindahkan Akun ke Perangkat Ini & Masuk</span>
              </button>
              <button
                id="btn-close-locked-modal"
                class="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                type="button"
              >
                Tutup & Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const feedback = this.element.querySelector('#scanner-feedback');
    const videoEl = this.element.querySelector('#camera-video-stream');
    const canvasEl = this.element.querySelector('#camera-sim-canvas');
    const qrArea = this.element.querySelector('#qr-scanner-area');
    const activeOverlay = this.element.querySelector('#camera-active-overlay');
    const cameraStatusDot = this.element.querySelector('#camera-status-dot');
    const cameraStatusText = this.element.querySelector('#camera-status-text');
    const cameraBadgeInfo = this.element.querySelector('#camera-badge-info');
    const cameraBadgeMode = this.element.querySelector('#camera-badge-mode');

    // Camera Switch Selectors (Viewfinder Button)
    const btnSwitchCamera = this.element.querySelector('#btn-switch-camera');
    const textSwitchCamera = this.element.querySelector('#text-switch-camera');
    const iconSwitchCamera = this.element.querySelector('#icon-switch-camera');

    this.isCameraOn = false;
    this.facingMode = 'user'; // 'user' (depan) atau 'environment' (belakang)
    this.cameraStream = null;
    this.simAnimId = null;
    this.barcodeDetectorInterval = null;

    const applyMirrorState = () => {
      const isFront = this.facingMode === 'user';
      // Sesuai permintaan user: kamera depan dijadikan mirror (scaleX(-1)), kamera belakang tidak dijadikan mirror (none)
      const transformValue = isFront ? 'scaleX(-1)' : 'none';
      if (videoEl) {
        videoEl.style.setProperty('transform', transformValue, 'important');
        videoEl.style.setProperty('-webkit-transform', transformValue, 'important');
        videoEl.classList.toggle('camera-mirrored', isFront);
        videoEl.classList.toggle('camera-unmirrored', !isFront);
      }
      if (canvasEl) {
        canvasEl.style.setProperty('transform', transformValue, 'important');
        canvasEl.style.setProperty('-webkit-transform', transformValue, 'important');
        canvasEl.classList.toggle('camera-mirrored', isFront);
        canvasEl.classList.toggle('camera-unmirrored', !isFront);
      }
      if (cameraBadgeMode) {
        cameraBadgeMode.textContent = isFront ? 'KAMERA DEPAN' : 'KAMERA BELAKANG';
      }
      if (cameraStatusText && this.isCameraOn) {
        cameraStatusText.textContent = isFront ? 'Kamera Depan Aktif' : 'Kamera Belakang Aktif';
      }
      if (textSwitchCamera) {
        textSwitchCamera.textContent = isFront ? 'Belakang' : 'Depan';
      }
      if (iconSwitchCamera) {
        iconSwitchCamera.classList.toggle('rotate-180', !isFront);
      }
    };

    const toggleCameraFacingMode = async () => {
      this.facingMode = (this.facingMode === 'user') ? 'environment' : 'user';
      const isFront = this.facingMode === 'user';
      
      if (this.notificationService) {
        this.notificationService.info(`Beralih ke ${isFront ? 'Kamera Depan' : 'Kamera Belakang'}...`);
      }
      
      await startCamera();
    };

    if (btnSwitchCamera) {
      btnSwitchCamera.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCameraFacingMode();
      });
    }

    const stopCamera = () => {
      this.isCameraOn = false;
      this._cameraStarting = false;

      if (this.barcodeDetectorInterval) {
        clearInterval(this.barcodeDetectorInterval);
        this.barcodeDetectorInterval = null;
      }

      // 1. Matikan semua track pada this.cameraStream
      if (this.cameraStream) {
        try {
          this.cameraStream.getTracks().forEach(t => {
            try {
              t.enabled = false;
              t.stop();
            } catch (e) {}
          });
        } catch (e) {}
        this.cameraStream = null;
      }

      // 2. Matikan semua track pada videoEl.srcObject
      if (videoEl && videoEl.srcObject) {
        try {
          const s = videoEl.srcObject;
          if (s && typeof s.getTracks === 'function') {
            s.getTracks().forEach(t => {
              try {
                t.enabled = false;
                t.stop();
              } catch (e) {}
            });
          }
        } catch (e) {}
        try {
          videoEl.pause();
        } catch (e) {}
        videoEl.srcObject = null;
      }

      // 3. Bersihkan seluruh media streams yang tersimpan di memori komponen
      if (Array.isArray(this._allStreams)) {
        this._allStreams.forEach(s => {
          try {
            if (s && typeof s.getTracks === 'function') {
              s.getTracks().forEach(t => {
                try {
                  t.enabled = false;
                  t.stop();
                } catch (e) {}
              });
            }
          } catch (e) {}
        });
        this._allStreams = [];
      }

      if (videoEl) {
        videoEl.classList.add('hidden');
      }

      if (this.simAnimId) {
        cancelAnimationFrame(this.simAnimId);
        this.simAnimId = null;
      }

      if (canvasEl) canvasEl.classList.add('hidden');
      if (activeOverlay) activeOverlay.classList.add('hidden');
      if (cameraBadgeInfo) {
        cameraBadgeInfo.classList.remove('flex');
        cameraBadgeInfo.classList.add('hidden');
      }
      if (qrArea) qrArea.classList.remove('hidden');
      if (cameraStatusDot) {
        cameraStatusDot.className = 'w-2 h-2 rounded-full bg-slate-400 shrink-0';
      }
      if (cameraStatusText) cameraStatusText.textContent = 'Kamera Siap';
    };

    this.stopCamera = stopCamera;
    this._cleanupCamera = stopCamera;

    const startCanvasSimulation = () => {
      if (!canvasEl) return;
      canvasEl.classList.remove('hidden');
      applyMirrorState();
      const ctx = canvasEl.getContext('2d');
      canvasEl.width = 320;
      canvasEl.height = 240;

      let frame = 0;
      const drawSimFeed = () => {
        if (!this.isCameraOn) return;
        frame++;
        ctx.fillStyle = '#060d17';
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

        // Ambient scanner grid pattern
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
        ctx.lineWidth = 1;
        const step = 20;
        for (let x = 0; x < canvasEl.width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(canvasEl.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvasEl.height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasEl.width, y);
          ctx.stroke();
        }

        // Animated target crosshair
        const cx = canvasEl.width / 2;
        const cy = canvasEl.height / 2;
        const radius = 35 + Math.sin(frame * 0.05) * 5;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // HUD overlay text (clearly stating orientation)
        const isFront = this.facingMode === 'user';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(`CAM: SENSOR READY (${isFront ? 'DEPAN' : 'BELAKANG'})`, 12, 20);
        ctx.fillText('AI DETECT: SCANNING...', 12, 35);
        ctx.fillText(new Date().toISOString().substring(11, 19) + ' WIB', canvasEl.width - 95, 20);

        this.simAnimId = requestAnimationFrame(drawSimFeed);
      };
      drawSimFeed();
    };

    const startCamera = async () => {
      this.isCameraOn = true;
      this._cameraStarting = true;
      if (!this._allStreams) this._allStreams = [];

      // Hentikan stream yang mungkin masih berjalan sebelumnya
      if (this.cameraStream) {
        try {
          this.cameraStream.getTracks().forEach(t => {
            try { t.enabled = false; t.stop(); } catch (e) {}
          });
        } catch (e) {}
        this.cameraStream = null;
      }
      if (videoEl && videoEl.srcObject) {
        try {
          const s = videoEl.srcObject;
          if (s && s.getTracks) {
            s.getTracks().forEach(t => {
              try { t.enabled = false; t.stop(); } catch (e) {}
            });
          }
        } catch (e) {}
        videoEl.srcObject = null;
      }
      if (this.barcodeDetectorInterval) {
        clearInterval(this.barcodeDetectorInterval);
        this.barcodeDetectorInterval = null;
      }
      if (qrArea) qrArea.classList.add('hidden');
      if (activeOverlay) activeOverlay.classList.remove('hidden');
      if (cameraBadgeInfo) {
        cameraBadgeInfo.classList.remove('hidden');
        cameraBadgeInfo.classList.add('flex');
      }
      if (cameraStatusDot) {
        cameraStatusDot.className = 'w-2 h-2 rounded-full bg-status-success animate-ping shrink-0';
      }
      applyMirrorState();

      const isFront = this.facingMode === 'user';
      if (feedback) {
        feedback.innerHTML = `<span class="text-status-success font-semibold">${isFront ? 'Kamera Depan Aktif' : 'Kamera Belakang Aktif'}.</span> Arahkan barcode fisik kartu pegawai atau QR aplikasi seluler ke kamera.`;
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          let stream = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: this.facingMode },
                aspectRatio: { ideal: 0.75 },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
          } catch (camErr1) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: this.facingMode
                }
              });
            } catch (camErr2) {
              // Fallback for general webcam
              stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
              });
            }
          }

          if (stream) {
            this._allStreams.push(stream);
          }

          // Anti race-condition: jika user sudah login / kamera dimatikan saat getUserMedia berlangsung
          if (!this.isCameraOn || this._unmounted) {
            if (stream) {
              stream.getTracks().forEach(t => {
                try {
                  t.enabled = false;
                  t.stop();
                } catch (e) {}
              });
            }
            return;
          }

          this.cameraStream = stream;
          if (videoEl) {
            videoEl.srcObject = stream;
            videoEl.classList.remove('hidden');
            applyMirrorState();
            await videoEl.play().catch(() => {});

            // Real-time QR Code scanning from camera video frame using jsQR
            const offscreenCanvas = document.createElement('canvas');
            const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
            let isScanningFrame = false;

            this.barcodeDetectorInterval = setInterval(() => {
              if (!this.isCameraOn || this._unmounted || !videoEl || videoEl.readyState < 2 || isScanningFrame) return;
              try {
                const w = videoEl.videoWidth;
                const h = videoEl.videoHeight;
                if (!w || !h) return;

                const scale = Math.min(1, 640 / w);
                const targetW = Math.floor(w * scale);
                const targetH = Math.floor(h * scale);

                offscreenCanvas.width = targetW;
                offscreenCanvas.height = targetH;
                offscreenCtx.drawImage(videoEl, 0, 0, targetW, targetH);
                const imgData = offscreenCtx.getImageData(0, 0, targetW, targetH);

                const code = jsQR(imgData.data, targetW, targetH, { inversionAttempts: 'attemptBoth' });
                if (code && code.data) {
                  isScanningFrame = true;
                  handleQrAuthentication(code.data).finally(() => {
                    setTimeout(() => { isScanningFrame = false; }, 2000);
                  });
                }
              } catch (e) {}
            }, 300);
          }
        } else {
          startCanvasSimulation();
        }
      } catch (err) {
        console.warn('Physical camera unavailable or access denied, running simulation feed:', err);
        startCanvasSimulation();
      }
    };

    /**
     * =========================================================================
     * INTI FITUR: PEMROSESAN QR, SINKRONISASI KE SUPABASE & DEVICE LOCKING
     * =========================================================================
     */
    const handleQrAuthentication = async (rawCode, forceSwitch = false) => {
      if (!rawCode) return;
      const cleanCode = String(rawCode).trim();
      console.log('[AuthView] Kode QR terdeteksi:', cleanCode, forceSwitch ? '(forceSwitch)' : '');

      sessionStorage.setItem('auth_login_method', 'qr');

      // 0. Deteksi jika kode QR adalah tautan undangan proyek (misal scan QR dari AddMemberModal)
      if (cleanCode.includes('accept_invite') || (cleanCode.includes('#/kanban/') && cleanCode.includes('?'))) {
        stopCamera();
        if (feedback) {
          feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">QR Papan Proyek Terdeteksi!</span> Mengalihkan ke Papan...`;
        }
        if (this.notificationService) {
          this.notificationService.success('Papan terverifikasi via QR! Membuka proyek...');
        }

        let targetUrl = cleanCode;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = window.location.origin + window.location.pathname + (targetUrl.startsWith('?') ? targetUrl : '?' + targetUrl);
        }
        try {
          const parsed = new URL(targetUrl);
          parsed.searchParams.set('via', 'qr');
          targetUrl = parsed.toString();
        } catch (e) {}

        setTimeout(() => {
          window.location.href = targetUrl;
        }, 400);
        return;
      }

      const handleDeviceLocked = (lockedRes, fallbackUser) => {
        console.warn('[AuthView] Akses Ditolak: Terkunci di perangkat lain', lockedRes);
        this.lastScannedLockedCode = cleanCode;

        if (feedback) {
          feedback.innerHTML = `<span class="text-rose-500 font-bold">❌ Akses Ditolak: Akun Terkunci di Perangkat Lain!</span>`;
        }

        const lockedModal = this.element.querySelector('#modal-device-locked');
        const titleEl = this.element.querySelector('#locked-user-title');
        const descEl = this.element.querySelector('#locked-user-description');
        const boundDevEl = this.element.querySelector('#locked-bound-device');

        const boundName = lockedRes.boundDeviceName || 'Perangkat Utama Lain';
        const userName = (lockedRes.data && lockedRes.data.name) || (fallbackUser && fallbackUser.name) || 'Pengguna';

        if (titleEl) titleEl.textContent = `Akun "${userName}" Terkunci`;
        if (descEl) {
          descEl.innerHTML = `Akun <b>${userName}</b> saat ini sudah tersambung di <b>${boundName}</b>. Sesuai kebijakan keamanan, <b>perangkat ini tidak dapat mengakses akun tersebut</b> selama masih terikat pada perangkat resmi.`;
        }
        if (boundDevEl) boundDevEl.textContent = boundName;

        if (lockedModal) lockedModal.classList.remove('hidden');
        if (this.notificationService) {
          this.notificationService.error(`Akses ditolak: Akun ${userName} terkunci di perangkat "${boundName}"!`);
        }
      };

      // 1. Verifikasi Utama: Panggil API Eksternal Sampulkreativ
      // POST https://app.sampulkreativ.id/api/external/verify-qr
      // Header: x-api-key: sampulkreativ-pm-secret-2026, Content-Type: application/json
      // Body: { "qr_data": "<hasil_scan_kamera>" }
      // Otomatis disinkronkan langsung ke database Supabase (tabel users)
      try {
        if (feedback) {
          feedback.innerHTML = `<span class="text-purple-600 dark:text-purple-400 font-bold animate-pulse">🔍 Memverifikasi QR ke API Sampulkreativ & Supabase...</span>`;
        }

        const sampulRes = await apiService.verifySampulkreativQr(cleanCode, { forceSwitch });

        if (sampulRes && sampulRes.locked) {
          handleDeviceLocked(sampulRes, sampulRes.data);
          return;
        }

        if (sampulRes && sampulRes.success && sampulRes.data) {
          const verifiedUser = sampulRes.data;
          stopCamera();

          try {
            const regMap = JSON.parse(localStorage.getItem('registered_qr_codes') || '{}');
            if (cleanCode) regMap[cleanCode.trim()] = verifiedUser.name;
            if (verifiedUser.qr_data) regMap[verifiedUser.qr_data.trim()] = verifiedUser.name;
            if (verifiedUser.email) regMap[verifiedUser.email.toLowerCase().trim()] = verifiedUser.name;
            if (verifiedUser.name) regMap[verifiedUser.name.toLowerCase().trim()] = verifiedUser.name;
            localStorage.setItem('registered_qr_codes', JSON.stringify(regMap));
          } catch (e) {}

          if (feedback) {
            feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">✅ Terverifikasi via Sampulkreativ API!</span> Tersambung ke Supabase...`;
          }
          // Pastikan selalu tersinkronisasi ke database Supabase (tabel users)
          try {
            await apiService.registerUser({
              id: verifiedUser.id,
              name: verifiedUser.name,
              role: verifiedUser.role,
              jobdesk: verifiedUser.jobdesk || verifiedUser.title,
              title: verifiedUser.title || verifiedUser.jobdesk,
              email: verifiedUser.email,
              avatar: verifiedUser.avatar,
              qr_data: cleanCode,
              workspace_access: ['ruangkreasi', 'panen-kunci']
            });
          } catch (syncErr) {
            console.warn('[AuthView] Sync Supabase notice:', syncErr);
          }

          const userInstance = this.authService.registerNewUser({
            ...verifiedUser,
            workspaceAccess: verifiedUser.workspace_access || verifiedUser.workspaceAccess || ['ruangkreasi', 'panen-kunci'],
            boundDeviceId: apiService.getDeviceId(),
            boundDeviceName: apiService.getDeviceName(),
            loginMethod: 'qr',
            qr_data: cleanCode
          });

          setTimeout(() => {
            stopCamera();
            this.authService.loginAsUser(userInstance, { silent: true });

            const allowedWs = 'panen-kunci';
            const allowedProj = allowedWs;

            localStorage.setItem('active_workspace', allowedWs);
            localStorage.setItem('active_project_id', allowedProj);
            localStorage.setItem('user_invited_workspace', allowedWs);
            localStorage.setItem('user_invited_project', allowedProj);

            const isUser = (userInstance.role || '').toLowerCase() === 'user';
            const targetView = isUser ? 'kanban' : 'dashboard';
            const targetHash = isUser ? `#/kanban/${allowedProj}` : '#/dashboard';

            const eb = this.container ? this.container.resolve('EventBus') : null;
            if (eb) {
              eb.emit('navigate', {
                view: targetView,
                projectId: allowedProj,
                workspace: allowedWs
              });
            }
            window.location.hash = targetHash;
          }, 400);
          return;
        }
      } catch (sampulErr) {
        console.warn('[AuthView] Verifikasi API Sampulkreativ dilewati ke fallback lokal:', sampulErr);
      }

      if (feedback) {
        feedback.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">Memeriksa database Supabase & Memvalidasi Perangkat...</span>`;
      }

      // 2. Ekstrak data jika kode berupa format JSON / teks terstruktur
      let parsedUser = null;
      try {
        let parsed = null;
        if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
          try {
            parsed = JSON.parse(cleanCode);
          } catch {}
        } else if (cleanCode.includes(':')) {
          // Mendukung format plain text:
          // Nama: Dimas Anggara
          // Role: User
          // Jobdesk: Creative Specialist
          parsed = {};
          const lines = cleanCode.split(/[\r\n,]+/);
          for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
              const k = line.slice(0, colonIdx).trim();
              const v = line.slice(colonIdx + 1).trim();
              if (k && v) parsed[k] = v;
            }
          }
        }

        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          const getKey = (keys) => {
            for (const k of keys) {
              for (const key of Object.keys(parsed)) {
                if (key.toLowerCase() === k.toLowerCase() && parsed[key]) {
                  return String(parsed[key]).trim();
                }
              }
            }
            return null;
          };

          const name = getKey(['name', 'nama']);
          const role = getKey(['role', 'peran']) || 'user';
          const jobdesk = getKey(['jobdesk', 'job', 'title', 'jabatan', 'posisi', 'jobdesk/posisi', 'jobdesk / posisi', 'posisi / jobdesk']) || 'Anggota Tim & Kontributor';
          const finalId = `usr-${Date.now().toString().slice(-6)}`;
          const email = getKey(['email']) || (name ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}${role.toLowerCase() === 'admin' ? '.admin' : ''}@sampulkreativ.id` : null);

          if (name) {
            parsedUser = {
              id: finalId,
              name,
              role: role.toLowerCase(),
              jobdesk,
              title: jobdesk,
              email,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + (role.toLowerCase() === 'admin' ? ' Admin' : ''))}`,
              qr_data: cleanCode
            };
          }
        }
      } catch (e) {
        console.warn('Gagal parse QR payload:', e);
      }

      // 3. Jika bukan JSON langsung, lakukan lookup via backend Supabase
      let payloadToSend = parsedUser;

      // Helper pemeriksaan apakah akun / QR sudah pernah terdaftar
      const checkExistingUser = (codeToCheck, userToCheck) => {
        if (!userToCheck && !codeToCheck) return null;
        const targetName = (userToCheck?.name || '').toLowerCase().trim();
        const targetEmail = (userToCheck?.email || '').toLowerCase().trim();
        const cleanTargetCode = (codeToCheck || '').toString().trim();

        // 1. Registered codes tracker
        try {
          const registered = JSON.parse(localStorage.getItem('registered_qr_codes') || '{}');
          if (cleanTargetCode && registered[cleanTargetCode]) return registered[cleanTargetCode];
          if (targetEmail && registered[targetEmail]) return registered[targetEmail];
          if (targetName && registered[targetName]) return registered[targetName];
        } catch (e) {}

        // 2. Custom users
        const customUsers = this.authService?.customUsers || [];
        const matchCustom = customUsers.find(u =>
          (cleanTargetCode && (u.qr_data === cleanTargetCode || u.rawCode === cleanTargetCode)) ||
          (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail) ||
          (targetName && u.name && u.name.toLowerCase().trim() === targetName)
        );
        if (matchCustom) return matchCustom;

        // 3. Approved users
        try {
          const approved = JSON.parse(localStorage.getItem('approved_board_users') || '[]');
          const matchApproved = approved.find(u =>
            (cleanTargetCode && (u.qr_data === cleanTargetCode || u.rawCode === cleanTargetCode)) ||
            (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail) ||
            (targetName && u.name && u.name.toLowerCase().trim() === targetName)
          );
          if (matchApproved) return matchApproved;
        } catch (e) {}

        // 4. Role profiles in authService (Sari Rahmawati, Dr. Hendra, Budi Pratama, Dimas Anggara)
        if (this.authService?.roleProfiles) {
          const profiles = Object.values(this.authService.roleProfiles);
          const matchProfile = profiles.find(p =>
            (targetEmail && p.email && p.email.toLowerCase().trim() === targetEmail) ||
            (targetName && p.name && p.name.toLowerCase().trim() === targetName)
          );
          if (matchProfile) return matchProfile;
        }

        return null;
      };

      // Helper: Registrasi otomatis akun baru langsung ke Supabase dan navigasi ke Beranda
      const autoRegisterAndEnter = async (codeToReg, userToReg) => {
        if (!userToReg || !userToReg.name) {
          if (feedback) {
            feedback.innerHTML = `<span class="text-rose-500 font-bold">⚠️ Kode QR belum terdaftar dan tidak memuat format identitas akun (Nama, Role, Jobdesk/Posisi, Email).</span>`;
          }
          if (this.notificationService) {
            this.notificationService.warning('Kode QR belum terdaftar dan tidak berisi data pengguna yang lengkap.');
          }
          setTimeout(() => {
            this.isScanning = false;
          }, 1500);
          return;
        }

        stopCamera();

        const existingUser = checkExistingUser(codeToReg, userToReg);
        const isAlreadyRegistered = Boolean(existingUser);

        if (feedback) {
          if (isAlreadyRegistered) {
            feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">QR Dikenali!</span> Mengalihkan ke Beranda...`;
          } else {
            feedback.innerHTML = `<span class="text-purple-600 dark:text-purple-400 font-bold animate-pulse">✨ Mendaftarkan QR baru...</span>`;
          }
        }

        const regPayload = {
          id: userToReg.id || `usr-${Date.now().toString().slice(-6)}`,
          name: userToReg.name,
          role: (userToReg.role || 'user').toLowerCase(),
          jobdesk: userToReg.jobdesk || 'Anggota Tim & Kontributor',
          title: userToReg.jobdesk || 'Anggota Tim & Kontributor',
          email: userToReg.email || `${userToReg.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`,
          avatar: userToReg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userToReg.name)}`,
          qr_data: codeToReg,
          rawCode: codeToReg,
          deviceId: apiService.getDeviceId(),
          deviceName: apiService.getDeviceName(),
          workspace_access: ['ruangkreasi', 'panen-kunci']
        };

        try {
          const regResult = await apiService.registerUser(regPayload);

          // Jika terjadi single-device lock conflict
          if (regResult && regResult.locked) {
            handleDeviceLocked(regResult, userToReg);
            return;
          }

          const wasAlreadyRegistered = isAlreadyRegistered || (regResult && regResult.autoCreated === false) || Boolean(regResult && regResult.isExisting);
          const registeredData = (regResult && regResult.data) ? regResult.data : regPayload;

          // Simpan ke daftar registered_qr_codes agar pemindaian berikutnya langsung dikenali
          try {
            const regMap = JSON.parse(localStorage.getItem('registered_qr_codes') || '{}');
            if (codeToReg) regMap[codeToReg.trim()] = registeredData.name;
            if (regPayload.rawCode) regMap[regPayload.rawCode.trim()] = registeredData.name;
            if (registeredData.qr_data) regMap[registeredData.qr_data.trim()] = registeredData.name;
            if (registeredData.email) regMap[registeredData.email.toLowerCase().trim()] = registeredData.name;
            if (registeredData.name) regMap[registeredData.name.toLowerCase().trim()] = registeredData.name;
            localStorage.setItem('registered_qr_codes', JSON.stringify(regMap));
          } catch (e) {}

          if (feedback) {
            if (wasAlreadyRegistered) {
              feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">✅ Berhasil Login!</span> Mengalihkan ke Beranda...`;
            } else {
              feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">✅ QR Berhasil Teregistrasi!</span> Mengalihkan ke Beranda...`;
            }
          }

          if (this.notificationService) {
            if (wasAlreadyRegistered) {
              this.notificationService.success(`Berhasil login sebagai ${registeredData.name}!`);
            } else {
              this.notificationService.success(`Akun "${registeredData.name}" berhasil teregistrasi!`);
            }
          }

          const userInstance = this.authService.registerNewUser({
            ...registeredData,
            workspaceAccess: registeredData.workspace_access || registeredData.workspaceAccess || ['ruangkreasi', 'panen-kunci'],
            boundDeviceId: apiService.getDeviceId(),
            boundDeviceName: apiService.getDeviceName(),
            loginMethod: 'qr',
            qr_data: codeToReg
          });

          setTimeout(() => {
            stopCamera();
            this.authService.loginAsUser(userInstance, { silent: true });

            const allowedWs = 'panen-kunci';
            const allowedProj = allowedWs;

            localStorage.setItem('active_workspace', allowedWs);
            localStorage.setItem('active_project_id', allowedProj);
            localStorage.setItem('user_invited_workspace', allowedWs);
            localStorage.setItem('user_invited_project', allowedProj);

            const isUser = (userInstance.role || '').toLowerCase() === 'user';
            const targetView = isUser ? 'kanban' : 'dashboard';
            const targetHash = isUser ? `#/kanban/${allowedProj}` : '#/dashboard';

            // Arahkan sesuai role
            const eb = this.container ? this.container.resolve('EventBus') : null;
            if (eb) {
              eb.emit('navigate', {
                view: targetView,
                projectId: allowedProj,
                workspace: allowedWs
              });
            }
            window.location.hash = targetHash;
          }, 450);
        } catch (regErr) {
          console.warn('[AuthView] Error registrasi otomatis:', regErr);
          // Fallback lokal jika backend tidak terjangkau
          const userInstance = this.authService.registerNewUser({
            ...regPayload,
            workspaceAccess: ['ruangkreasi', 'panen-kunci'],
            boundDeviceId: apiService.getDeviceId(),
            boundDeviceName: apiService.getDeviceName(),
            loginMethod: 'qr',
            qr_data: codeToReg
          });

          try {
            const regMap = JSON.parse(localStorage.getItem('registered_qr_codes') || '{}');
            if (codeToReg) regMap[codeToReg.trim()] = userInstance.name;
            if (regPayload.rawCode) regMap[regPayload.rawCode.trim()] = userInstance.name;
            if (userInstance.email) regMap[userInstance.email.toLowerCase().trim()] = userInstance.name;
            if (userInstance.name) regMap[userInstance.name.toLowerCase().trim()] = userInstance.name;
            localStorage.setItem('registered_qr_codes', JSON.stringify(regMap));
          } catch (e) {}

          if (feedback) {
            if (isAlreadyRegistered) {
              feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">✅ Berhasil Login!</span> Mengalihkan ke Beranda...`;
            } else {
              feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">✅ QR Berhasil Teregistrasi!</span> Mengalihkan ke Beranda...`;
            }
          }

          if (this.notificationService) {
            if (isAlreadyRegistered) {
              this.notificationService.success(`Berhasil login sebagai ${userInstance.name}!`);
            } else {
              this.notificationService.success(`Akun "${userInstance.name}" berhasil teregistrasi!`);
            }
          }

          this.authService.loginAsUser(userInstance, { silent: true });
          const isUser = (userInstance.role || '').toLowerCase() === 'user';
          window.location.hash = isUser ? '#/kanban/panen-kunci' : '#/dashboard';
        }
      };

      try {
        let lookupUrl = `${apiService.baseUrl}/qr/lookup?code=${encodeURIComponent(cleanCode)}&deviceId=${encodeURIComponent(apiService.getDeviceId())}&deviceName=${encodeURIComponent(apiService.getDeviceName())}`;
        if (forceSwitch) {
          lookupUrl += '&forceSwitch=true';
        }
        const lookupRes = await fetch(lookupUrl);
        const lookupData = await lookupRes.json();

        // 1. Jika akun terdaftar dan terkunci di perangkat lain
        if (lookupData && lookupData.locked) {
          handleDeviceLocked(lookupData, parsedUser);
          return;
        }

        // 2. Jika akun sudah terdaftar di database PostgreSQL / Supabase
        if (lookupRes.ok && lookupData && lookupData.success && lookupData.type === 'user' && lookupData.data) {
          const userFromDb = lookupData.data;
          stopCamera();

          try {
            const regMap = JSON.parse(localStorage.getItem('registered_qr_codes') || '{}');
            if (cleanCode) regMap[cleanCode.trim()] = userFromDb.name;
            if (userFromDb.qr_data) regMap[userFromDb.qr_data.trim()] = userFromDb.name;
            if (userFromDb.email) regMap[userFromDb.email.toLowerCase().trim()] = userFromDb.name;
            if (userFromDb.name) regMap[userFromDb.name.toLowerCase().trim()] = userFromDb.name;
            localStorage.setItem('registered_qr_codes', JSON.stringify(regMap));
          } catch (e) {}

          if (feedback) {
            feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">✅ Berhasil Login!</span> Mengalihkan ke Beranda...`;
          }
          if (this.notificationService) {
            this.notificationService.success(`Berhasil login sebagai ${userFromDb.name}!`);
          }

          const userInstance = this.authService.registerNewUser({
            ...userFromDb,
            workspaceAccess: userFromDb.workspace_access || userFromDb.workspaceAccess,
            boundDeviceId: apiService.getDeviceId(),
            boundDeviceName: apiService.getDeviceName(),
            loginMethod: 'qr',
            qr_data: cleanCode
          });

          setTimeout(() => {
            stopCamera();
            this.authService.loginAsUser(userInstance, { silent: true });

            const allowedWs = 'panen-kunci';
            const allowedProj = allowedWs;
            
            // Simpan active workspace & project
            localStorage.setItem('active_workspace', allowedWs);
            localStorage.setItem('active_project_id', allowedProj);
            localStorage.setItem('user_invited_workspace', allowedWs);
            localStorage.setItem('user_invited_project', allowedProj);

            // Arahkan ke Kanban jika role user, ke Beranda jika role lain
            const isUser = (userInstance.role || '').toLowerCase() === 'user';
            const targetView = isUser ? 'kanban' : 'dashboard';
            const targetHash = isUser ? `#/kanban/${allowedProj}` : '#/dashboard';

            const eb = this.container ? this.container.resolve('EventBus') : null;
            if (eb) {
              eb.emit('navigate', {
                view: targetView,
                projectId: allowedProj,
                workspace: allowedWs
              });
            }
            window.location.hash = targetHash;
          }, 400);
          return;
        }

        // 3. Jika TIDAK ADA di database PostgreSQL/Supabase -> Otomatis daftarkan langsung dan masuk ke Beranda!
        await autoRegisterAndEnter(cleanCode, parsedUser);
      } catch (lookupErr) {
        console.warn('[AuthView] Error lookup database, coba registrasi otomatis:', lookupErr);
        await autoRegisterAndEnter(cleanCode, parsedUser);
      }
    };

    /**
     * Memproses file gambar QR yang diunggah
     */
    const processQrImageFile = (file) => {
      if (!file) return;
      if (feedback) {
        feedback.innerHTML = `<span class="text-indigo-600 font-semibold animate-pulse">Menganalisis file gambar QR...</span>`;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imgData.data, img.width, img.height, {
            inversionAttempts: 'attemptBoth'
          });

          if (code && code.data) {
            handleQrAuthentication(code.data);
          } else {
            // Coba skala menengah jika gambar terlalu besar
            const scale = 800 / Math.max(img.width, img.height);
            if (scale < 1) {
              const canvas2 = document.createElement('canvas');
              canvas2.width = Math.floor(img.width * scale);
              canvas2.height = Math.floor(img.height * scale);
              const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });
              ctx2.drawImage(img, 0, 0, canvas2.width, canvas2.height);
              const imgData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
              const code2 = jsQR(imgData2.data, canvas2.width, canvas2.height, {
                inversionAttempts: 'attemptBoth'
              });
              if (code2 && code2.data) {
                handleQrAuthentication(code2.data);
                return;
              }
            }

            if (feedback) {
              feedback.innerHTML = `<span class="text-rose-500 font-semibold">Tidak dapat membaca kode QR dari gambar tersebut.</span>`;
            }
            if (this.notificationService) {
              this.notificationService.error('QR tidak terbaca. Pastikan foto QR jelas dan tidak buram.');
            }
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    // Event listener input file QR
    const qrFileInput = this.element.querySelector('#auth-qr-file-input');
    if (qrFileInput) {
      qrFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) processQrImageFile(file);
      });
    }



    // Modal Device Locked Close Listener
    const lockedModal = this.element.querySelector('#modal-device-locked');
    const closeLockedModalBtn = this.element.querySelector('#btn-close-locked-modal');
    if (closeLockedModalBtn && lockedModal) {
      closeLockedModalBtn.addEventListener('click', () => {
        lockedModal.classList.add('hidden');
      });
    }

    const switchDeviceBtn = this.element.querySelector('#btn-switch-device-login');
    if (switchDeviceBtn && lockedModal) {
      switchDeviceBtn.addEventListener('click', async () => {
        lockedModal.classList.add('hidden');
        if (this.lastScannedLockedCode) {
          if (feedback) {
            feedback.innerHTML = `<span class="text-purple-600 dark:text-purple-400 font-semibold animate-pulse">Memindahkan akun ke perangkat ini & membuka sesi...</span>`;
          }
          await handleQrAuthentication(this.lastScannedLockedCode, true);
        }
      });
    }

    const inviteModal = this.element.querySelector('#modal-user-invite-gate');
    const closeInviteModalBtn = this.element.querySelector('#btn-close-user-invite-modal');
    const inputInviteUrl = this.element.querySelector('#input-user-invite-url');
    const inviteError = this.element.querySelector('#user-invite-url-error');
    const submitInviteBtn = this.element.querySelector('#btn-submit-user-invite-url');
    const simulateInviteBtn = this.element.querySelector('#btn-simulate-manager-invite');
    const resumeContainer = this.element.querySelector('#user-invite-resume-container');
    const resumeBtn = this.element.querySelector('#btn-resume-invited-session');
    const resumeLabel = this.element.querySelector('#btn-resume-invited-label');

    const openInviteModal = () => {
      const savedWs = localStorage.getItem('user_invited_workspace');
      if (savedWs && resumeContainer && resumeLabel) {
        resumeContainer.classList.remove('hidden');
        resumeLabel.textContent = `Lanjutkan ke Papan Terundang (${savedWs.toUpperCase()})`;
      } else if (resumeContainer) {
        resumeContainer.classList.add('hidden');
      }
      if (inviteError) inviteError.classList.add('hidden');
      if (inputInviteUrl) inputInviteUrl.value = '';
      if (inviteModal) inviteModal.classList.remove('hidden');
    };

    if (closeInviteModalBtn) {
      closeInviteModalBtn.addEventListener('click', () => {
        if (inviteModal) inviteModal.classList.add('hidden');
      });
    }

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        if (inviteModal) inviteModal.classList.add('hidden');
        handleRoleSelect('user', true);
      });
    }

    if (submitInviteBtn) {
      submitInviteBtn.addEventListener('click', () => {
        const rawUrl = inputInviteUrl?.value.trim() || '';
        const customName = this.element.querySelector('#input-user-invite-name')?.value.trim();
        const customEmail = this.element.querySelector('#input-user-invite-email')?.value.trim();

        // Khusus buat user yg sudah di-ACC sebelumnya: bisa masuk kapan aja hanya dengan email!
        if (customEmail) {
          const approved = this.getApprovedUsers();
          const matched = approved.find(u => u.email.toLowerCase() === customEmail.toLowerCase());
          if (matched) {
            if (inviteModal) inviteModal.classList.add('hidden');
            this.loginAsApprovedMember(matched);
            return;
          }
        }

        if (!rawUrl) {
          if (inviteError) {
            inviteError.textContent = 'Harap masukkan tautan undangan, atau masukkan alamat email Anda yang telah disetujui Admin.';
            inviteError.classList.remove('hidden');
          }
          return;
        }

        try {
          let targetUrl = rawUrl;
          if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            targetUrl = window.location.origin + window.location.pathname + (rawUrl.startsWith('?') ? rawUrl : '?' + rawUrl);
          }
          const parsed = new URL(targetUrl);
          const hasInvite = parsed.searchParams.has('accept_invite') || parsed.searchParams.has('invite');
          if (!hasInvite) {
            if (inviteError) {
              inviteError.textContent = 'Tautan tidak memiliki parameter token undangan (accept_invite / invite).';
              inviteError.classList.remove('hidden');
            }
            return;
          }

          if (customName) parsed.searchParams.set('name', customName);
          if (customEmail) parsed.searchParams.set('email', customEmail);

          if (inviteModal) inviteModal.classList.add('hidden');
          if (feedback) {
            feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Memverifikasi Tautan Undangan...</span> Mengalihkan ke Papan Kanban...`;
          }
          window.location.href = parsed.toString();
        } catch (err) {
          if (inviteError) {
            inviteError.textContent = 'Format URL tidak valid. Contoh: ' + window.location.origin + '/?accept_invite=inv-123#/kanban';
            inviteError.classList.remove('hidden');
          }
        }
      });
    }

    if (simulateInviteBtn) {
      simulateInviteBtn.addEventListener('click', () => {
        const targetWs = 'aikreativ';
        const targetTitle = 'AIKreativ';
        const invId = 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const demoLink = `${window.location.origin}${window.location.pathname}?accept_invite=${invId}&name=Dimas%20Anggara&email=dimas.anggara%40gmail.com&role=user&ws=${targetWs}&project_id=${targetWs}&board_title=${encodeURIComponent(targetTitle)}&inviter_name=awaa&inviter_role=admin&color=%232563eb#/kanban/${targetWs}`;
        
        if (inviteModal) inviteModal.classList.add('hidden');
        if (feedback) {
          feedback.innerHTML = `<span class="text-emerald-500 font-semibold animate-pulse">awaa(admin) mengundang anda ke Ruang AIKreativ...</span> Membuka Papan Kanban...`;
        }
        setTimeout(() => {
          window.location.href = demoLink;
        }, 500);
      });
    }

    // Tombol login instan untuk akun yang sudah di-ACC (bisa masuk kapan aja tanpa minta link lagi)
    const approvedBtns = this.element.querySelectorAll('.btn-direct-approved-login, .btn-modal-quick-login-approved');
    approvedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-user-email');
        const name = btn.getAttribute('data-user-name');
        const ws = btn.getAttribute('data-user-ws');
        const proj = btn.getAttribute('data-user-proj');
        if (inviteModal) inviteModal.classList.add('hidden');
        this.loginAsApprovedMember({ email, name, workspace: ws, projectId: proj });
      });
    });

    const handleRoleSelect = (role, isResuming = false) => {
      if (role === 'user' && !isResuming) {
        // Cek jika pengguna sudah di-ACC sebelumnya: langsung masuk tanpa link lagi!
        const approved = this.getApprovedUsers();
        if (approved.length > 0) {
          this.loginAsApprovedMember(approved[0]);
          return;
        }
        // User cannot enter directly without invite link
        openInviteModal();
        return;
      }

      stopCamera();
      if (feedback) {
        feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Autentikasi Terverifikasi!</span> Mengalihkan sesi ke Creative Office...`;
      }
      setTimeout(() => {
        stopCamera();
        this.authService.loginWithRole(role);
        if (role === 'user') {
          const u = this.authService.getCurrentUser();
          const allowedWs = (u?.workspaceAccess && u.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
          const allowedProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || allowedWs;
          window.location.hash = `#/kanban/${allowedProj}`;
        } else {
          window.location.hash = '#/dashboard';
        }
      }, 700);
    };

    const roleButtons = this.element.querySelectorAll('.role-auth-btn');
    roleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        handleRoleSelect(role);
      });
    });

    if (qrArea) {
      qrArea.addEventListener('click', () => {
        if (feedback) {
          feedback.innerHTML = `<span class="text-brand-accent animate-pulse font-semibold">Membaca Barcode ID Card Pegawai...</span>`;
        }
        this.authService.simulateScan().then(user => {
          if (feedback) {
            feedback.innerHTML = `<span class="text-status-success font-semibold">Scan Berhasil!</span> Selamat datang, ${user.name}`;
          }
          setTimeout(() => {
            stopCamera();
            const role = (user.role || '').toLowerCase();
            if (role === 'user') {
              const allowedWs = (user.workspaceAccess && user.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
              const allowedProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || allowedWs;
              window.location.hash = `#/kanban/${allowedProj}`;
            } else {
              window.location.hash = '#/dashboard';
            }
          }, 600);
        });
      });
    }

    // Direct to Home/Beranda button handler
    const btnDirectToHome = this.element.querySelector('#btn-direct-to-home');
    if (btnDirectToHome) {
      btnDirectToHome.addEventListener('click', (e) => {
        e.preventDefault();
        stopCamera();

        if (feedback) {
          feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Memverifikasi akses... Mengalihkan ke Beranda!</span>`;
        }

        // Cek sesi aktif terlebih dahulu
        if (!this.authService.isLoggedIn()) {
          this.authService.restoreSession();
        }

        if (this.authService.isLoggedIn()) {
          const u = this.authService.getCurrentUser();
          const role = (u?.role || '').toLowerCase();
          if (role === 'user') {
            const curWs = (u.workspaceAccess && u.workspaceAccess[0]) || localStorage.getItem('active_workspace') || 'panen-kunci';
            const curProj = localStorage.getItem('active_project_id') || curWs;
            window.location.hash = `#/kanban/${curProj}`;
          } else {
            window.location.hash = '#/dashboard';
          }
        } else {
          // Periksa apakah role terakhir adalah user
          const lastRole = localStorage.getItem('active_user_role');
          if (lastRole === 'user') {
            this.authService.loginWithRole('user');
            const curProj = localStorage.getItem('active_project_id') || 'panen-kunci';
            window.location.hash = `#/kanban/${curProj}`;
          } else {
            this.authService.loginWithRole('admin');
            window.location.hash = '#/dashboard';
          }
        }
      });
    }



    // Automatically activate camera when QR gate loads (User requirement)
    startCamera();
  }

  unmount() {
    this._unmounted = true;
    if (typeof this.stopCamera === 'function') {
      try { this.stopCamera(); } catch (e) {}
    }
    if (typeof this._cleanupCamera === 'function') {
      try { this._cleanupCamera(); } catch (e) {}
    }
    if (this.cameraStream) {
      try {
        this.cameraStream.getTracks().forEach(t => {
          try {
            t.enabled = false;
            t.stop();
          } catch (e) {}
        });
        this.cameraStream = null;
      } catch (e) {}
    }
    if (Array.isArray(this._allStreams)) {
      this._allStreams.forEach(s => {
        try {
          if (s && typeof s.getTracks === 'function') {
            s.getTracks().forEach(t => {
              try { t.enabled = false; t.stop(); } catch (e) {}
            });
          }
        } catch (e) {}
      });
      this._allStreams = [];
    }
    if (this.barcodeDetectorInterval) {
      clearInterval(this.barcodeDetectorInterval);
      this.barcodeDetectorInterval = null;
    }
    super.unmount();
  }
}

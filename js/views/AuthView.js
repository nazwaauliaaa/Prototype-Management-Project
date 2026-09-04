import { BaseView } from '../core/BaseView.js';

/**
 * AuthView - Single Responsibility Principle (SRP)
 * Renders the Security Barcode/QR Card Gate and role authorization simulator.
 */
export class AuthView extends BaseView {
  constructor(container) {
    super(container);
    this.authService = container.resolve('AuthService');
  }

  render() {
    return `
      <div class="min-h-screen bg-canvas-bg flex items-center justify-center p-spacing-lg">
        <main class="w-full max-w-md">
          <div class="relative w-full bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden p-spacing-xl flex flex-col items-center border border-surface-border">
            
            <!-- Atmospheric top accent gradients -->
            <div class="absolute -top-12 -left-12 w-48 h-48 bg-brand-subdued rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -top-12 -right-12 w-48 h-48 bg-secondary-container/40 rounded-full blur-2xl pointer-events-none"></div>

            <!-- Header & Brand -->
            <div class="relative z-10 flex flex-col items-center text-center mb-spacing-md">
              <div class="w-16 h-16 rounded-2xl bg-surface-container-low shadow-sm p-spacing-xs flex items-center justify-center mb-spacing-sm">
                <img alt="Creative Office Logo" class="w-full h-full object-contain rounded-xl" src="assets/logo.svg" />
              </div>
              
              <div class="flex items-center gap-2 mb-1">
                <h1 class="font-headline-lg text-[22px] font-bold text-text-primary tracking-tight">Creative Office</h1>
                <span class="inline-flex items-center gap-1 bg-status-success/10 text-status-success font-badge-micro text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
                  HTTPS
                </span>
              </div>
              <p class="font-caption-meta text-[11px] text-text-secondary">by Sampulkreativ Technology</p>

              <!-- Domain Internal Badge -->
              <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-text-secondary font-caption-meta text-[11px]">
                <span class="material-symbols-outlined text-[13px] text-brand-accent">lock</span>
                <span class="font-semibold text-text-primary">creativeoffice.app</span>
                <span class="w-1 h-1 rounded-full bg-text-muted"></span>
                <span class="text-text-muted">Internal Network</span>
              </div>
            </div>

            <!-- Scanner Viewfinder Component -->
            <div class="relative z-10 w-full mb-spacing-md">
              <div class="relative w-full aspect-[4/3] max-h-48 bg-slate-950 rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-spacing-md group">
                
                <!-- Viewfinder Corner Reticles -->
                <div class="absolute top-3 left-3 w-5 h-5 flex flex-col justify-between pointer-events-none">
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full -mt-0.5"></div>
                </div>
                <div class="absolute top-3 right-3 w-5 h-5 flex flex-col items-end justify-between pointer-events-none">
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full -mt-0.5"></div>
                </div>
                <div class="absolute bottom-3 left-3 w-5 h-5 flex flex-col justify-between pointer-events-none">
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full mb-[-2px]"></div>
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                </div>
                <div class="absolute bottom-3 right-3 w-5 h-5 flex flex-col items-end justify-between pointer-events-none">
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full mb-[-2px]"></div>
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                </div>

                <!-- Animated Laser Beam Line -->
                <div class="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#ef4444] laser-scanner-beam pointer-events-none"></div>

                <!-- QR Hologram Mockup -->
                <div class="flex flex-col items-center justify-center opacity-85 pointer-events-none transition-transform duration-300 group-hover:scale-105">
                  <svg class="w-16 h-16 text-white/80" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h2.25v2.25H13.5v-2.25ZM18 13.5h2.25v2.25H18v-2.25ZM15.75 18H18v2.25h-2.25V18ZM13.5 18h.75v2.25h-.75V18ZM18 18h2.25v2.25H18V18Z" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                  <span class="mt-2 text-white/90 font-caption-meta text-[11px] tracking-wide uppercase font-semibold">Pindai ID Card / QR</span>
                </div>

                <!-- Scanner Controls Overlay -->
                <div class="absolute bottom-2 inset-x-2 flex items-center justify-between px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-status-success animate-ping"></span>
                    <span class="font-badge-micro text-[10px] text-white uppercase tracking-wider">Kamera Sensor Aktif</span>
                  </div>
                  <button id="btn-trigger-scan" class="text-brand-subdued hover:text-white font-badge-micro text-[11px] flex items-center gap-1 transition-colors" type="button">
                    <span class="material-symbols-outlined text-[14px]">flip_camera_android</span>
                    <span>Uji Sensor</span>
                  </button>
                </div>
              </div>

              <p id="scanner-feedback" class="mt-2 text-center font-caption-meta text-[11px] text-text-muted">
                Arahkan barcode fisik kartu pegawai atau QR aplikasi seluler ke dalam kotak pemindai.
              </p>
            </div>

            <!-- Role Simulator Selection Block -->
            <div class="w-full mb-spacing-md">
              <div class="flex items-center justify-between mb-2">
                <label class="font-caption-meta text-[11px] font-bold uppercase tracking-wider text-text-secondary">Simulasi Otorisasi Peran</label>
                <span class="font-badge-micro text-[10px] text-brand-accent bg-brand-subdued px-1.5 py-0.5 rounded font-semibold">Auto-Routing</span>
              </div>

              <div class="space-y-2">
                <!-- Role 1: Eksekutif -->
                <button class="role-auth-btn w-full p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between text-left group border border-surface-border" data-role="eksekutif" type="button">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center shrink-0 text-tertiary">
                      <span class="material-symbols-outlined text-[20px]">query_stats</span>
                    </div>
                    <div class="min-w-0">
                      <div class="font-body-medium text-[13px] text-text-primary font-bold truncate">Eksekutif</div>
                      <div class="font-caption-meta text-[11px] text-text-secondary truncate">Akses Penuh & Executive Dashboard</div>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors text-[18px]">arrow_forward</span>
                </button>

                <!-- Role 2: Tim Kreatif -->
                <button class="role-auth-btn w-full p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between text-left group border border-surface-border" data-role="kreatif" type="button">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center shrink-0 text-primary-container">
                      <span class="material-symbols-outlined text-[20px]">palette</span>
                    </div>
                    <div class="min-w-0">
                      <div class="font-body-medium text-[13px] text-text-primary font-bold truncate">Tim Kreatif</div>
                      <div class="font-caption-meta text-[11px] text-text-secondary truncate">Workspace & Creative Hub (RuangKreasi, LayarBaca)</div>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors text-[18px]">arrow_forward</span>
                </button>

                <!-- Role 3: Tim Teknis -->
                <button class="role-auth-btn w-full p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between text-left group border border-surface-border" data-role="teknis" type="button">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-text-primary">
                      <span class="material-symbols-outlined text-[20px]">terminal</span>
                    </div>
                    <div class="min-w-0">
                      <div class="font-body-medium text-[13px] text-text-primary font-bold truncate">Tim Teknis</div>
                      <div class="font-caption-meta text-[11px] text-text-secondary truncate">Sprint, Code & QA Checklist (Panen Kunci, AIKreativ)</div>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Divider -->
            <div class="relative w-full flex items-center justify-center my-2">
              <div class="w-full h-px bg-surface-border"></div>
              <span class="absolute px-2.5 bg-surface-container-lowest font-badge-micro text-[10px] text-text-muted uppercase">Atau Masuk Melalui</span>
            </div>

            <!-- SSO Corporate Button -->
            <div class="w-full mt-2">
              <button id="btn-sso-login" class="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 text-text-primary font-body-medium text-[13px] font-semibold border border-surface-border" type="button">
                <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"></path>
                </svg>
                <span>Sampulkreativ Corporate SSO</span>
              </button>
            </div>

            <!-- Security Verification Footer -->
            <div class="mt-spacing-lg pt-spacing-sm flex items-center justify-center gap-1.5 text-text-muted font-caption-meta text-[11px]">
              <span class="material-symbols-outlined text-[16px] text-status-success">verified_user</span>
              <span>256-Bit SSL Enkripsi • Keamanan Terverifikasi</span>
            </div>

          </div>
        </main>
      </div>
    `;
  }

  bindEvents() {
    const feedback = this.element.querySelector('#scanner-feedback');

    const handleRoleSelect = (role) => {
      if (feedback) {
        feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Autentikasi Terverifikasi!</span> Mengalihkan sesi ke Creative Office...`;
      }
      setTimeout(() => {
        this.authService.loginWithRole(role);
        this.eventBus.emit('navigate', { view: 'dashboard' });
      }, 700);
    };

    const roleButtons = this.element.querySelectorAll('.role-auth-btn');
    roleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        handleRoleSelect(role);
      });
    });

    const testScanBtn = this.element.querySelector('#btn-trigger-scan');
    if (testScanBtn) {
      testScanBtn.addEventListener('click', () => {
        if (feedback) {
          feedback.innerHTML = `<span class="text-brand-accent animate-pulse font-semibold">Membaca Barcode ID Card Pegawai...</span>`;
        }
        this.authService.simulateScan().then(user => {
          if (feedback) {
            feedback.innerHTML = `<span class="text-status-success font-semibold">Scan Berhasil!</span> Selamat datang, ${user.name}`;
          }
          setTimeout(() => {
            this.eventBus.emit('navigate', { view: 'dashboard' });
          }, 600);
        });
      });
    }

    const ssoBtn = this.element.querySelector('#btn-sso-login');
    if (ssoBtn) {
      ssoBtn.addEventListener('click', () => {
        if (feedback) {
          feedback.innerHTML = `<span class="text-primary font-semibold animate-pulse">Menghubungkan ke Gateway OAuth2 Sampulkreativ...</span>`;
        }
        setTimeout(() => {
          handleRoleSelect('eksekutif');
        }, 800);
      });
    }
  }
}

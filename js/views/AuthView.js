import { BaseView } from '../core/BaseView.js';
import { QRCodeGenerator } from '../services/QRCodeGenerator.js';

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
                
                <!-- Live Camera Video Feed (strictly mirrored by default) -->
                <video id="camera-video-stream" class="absolute inset-0 w-full h-full object-cover hidden z-10" playsinline autoplay muted style="transform: scaleX(-1); -webkit-transform: scaleX(-1);"></video>
                <!-- Camera Simulation Canvas (fallback if hardware camera is blocked/unavailable) -->
                <canvas id="camera-sim-canvas" class="absolute inset-0 w-full h-full object-cover hidden z-10" style="transform: scaleX(-1); -webkit-transform: scaleX(-1);"></canvas>

                <!-- Top Camera Status Indicator Badge -->
                <div id="camera-badge-info" class="hidden absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-status-success font-mono text-[9px] font-semibold items-center gap-1.5 z-30">
                  <span class="w-1.5 h-1.5 rounded-full bg-status-success animate-ping"></span>
                  <span id="camera-badge-mode">KAMERA AKTIF (MIRROR)</span>
                </div>

                <!-- Viewfinder Corner Reticles -->
                <div class="absolute top-3 left-3 w-5 h-5 flex flex-col justify-between pointer-events-none z-20">
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full -mt-0.5"></div>
                </div>
                <div class="absolute top-3 right-3 w-5 h-5 flex flex-col items-end justify-between pointer-events-none z-20">
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full -mt-0.5"></div>
                </div>
                <div class="absolute bottom-3 left-3 w-5 h-5 flex flex-col justify-between pointer-events-none z-20">
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full mb-[-2px]"></div>
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                </div>
                <div class="absolute bottom-3 right-3 w-5 h-5 flex flex-col items-end justify-between pointer-events-none z-20">
                  <div class="w-0.5 h-4 bg-brand-accent rounded-full mb-[-2px]"></div>
                  <div class="w-5 h-0.5 bg-brand-accent rounded-full"></div>
                </div>

                <!-- Animated Laser Beam Line -->
                <div class="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#ef4444] laser-scanner-beam pointer-events-none z-20"></div>

                <!-- Dynamic QR Code Container (shown if camera is off) -->
                <div id="qr-scanner-area" class="flex flex-col items-center justify-center opacity-90 transition-transform duration-300 group-hover:scale-105 cursor-pointer z-20" title="Klik untuk simulasi scan">
                  <div class="w-20 h-20 bg-white p-1.5 rounded-lg shadow-sm">
                    ${QRCodeGenerator.generate('http://localhost:3000/#/auth?scan=auto', { size: 68, darkColor: '#0b1c30' })}
                  </div>
                  <span class="mt-2 text-white/90 font-caption-meta text-[11px] tracking-wide uppercase font-semibold">Pindai ID Card / QR</span>
                </div>

                <!-- Live Camera Reticle Overlay (when camera is on) -->
                <div id="camera-active-overlay" class="hidden absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                  <div class="w-32 h-32 border-2 border-dashed border-status-success/80 rounded-xl animate-pulse flex items-center justify-center">
                    <span class="material-symbols-outlined text-[32px] text-status-success/80">filter_center_focus</span>
                  </div>
                  <span class="mt-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-status-success font-mono text-[10px] font-bold tracking-wider">
                    SCANNING BARCODE / QR...
                  </span>
                </div>

                <!-- Scanner Controls Overlay (no toggle buttons, automatically on) -->
                <div class="absolute bottom-1.5 inset-x-1.5 sm:bottom-2 sm:inset-x-2 flex items-center justify-between px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg z-30">
                  <div class="flex items-center gap-2 min-w-0">
                    <span id="camera-status-dot" class="w-2 h-2 rounded-full bg-status-success animate-ping shrink-0"></span>
                    <span id="camera-status-text" class="font-badge-micro text-[10px] text-white uppercase tracking-wider truncate">Kamera Pemindai Aktif</span>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button id="btn-trigger-scan" class="bg-brand-accent/20 hover:bg-brand-accent/30 text-white font-badge-micro text-[10px] flex items-center gap-1 transition-colors px-2 py-1 rounded-md border border-brand-accent/30" type="button">
                      <span class="material-symbols-outlined text-[13px]">qr_code_scanner</span>
                      <span>Uji Scan</span>
                    </button>
                  </div>
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
    const videoEl = this.element.querySelector('#camera-video-stream');
    const canvasEl = this.element.querySelector('#camera-sim-canvas');
    const qrArea = this.element.querySelector('#qr-scanner-area');
    const activeOverlay = this.element.querySelector('#camera-active-overlay');
    const cameraStatusDot = this.element.querySelector('#camera-status-dot');
    const cameraStatusText = this.element.querySelector('#camera-status-text');
    const cameraBadgeInfo = this.element.querySelector('#camera-badge-info');
    const cameraBadgeMode = this.element.querySelector('#camera-badge-mode');

    this.isCameraOn = false;
    this.isMirrored = true; // Automatically mirrored by default (scaleX -1)
    this.cameraStream = null;
    this.simAnimId = null;
    this.barcodeDetectorInterval = null;

    const applyMirrorState = () => {
      const transformValue = 'scaleX(-1)';
      if (videoEl) {
        videoEl.style.transform = transformValue;
        videoEl.style.webkitTransform = transformValue;
      }
      if (canvasEl) {
        canvasEl.style.transform = transformValue;
        canvasEl.style.webkitTransform = transformValue;
      }
      if (cameraBadgeMode) {
        cameraBadgeMode.textContent = 'KAMERA AKTIF (MIRROR)';
      }
      if (cameraStatusText && this.isCameraOn) {
        cameraStatusText.textContent = 'Kamera Pemindai Aktif';
      }
    };

    const stopCamera = () => {
      this.isCameraOn = false;
      if (this.barcodeDetectorInterval) {
        clearInterval(this.barcodeDetectorInterval);
        this.barcodeDetectorInterval = null;
      }
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraStream = null;
      }
      if (this.simAnimId) {
        cancelAnimationFrame(this.simAnimId);
        this.simAnimId = null;
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
        videoEl.classList.add('hidden');
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
          ctx.lineTo(x, canvasEl.height);
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

        // HUD overlay text (clearly stating mirror orientation)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText('CAM: SENSOR READY (MIRROR)', 12, 20);
        ctx.fillText('AI DETECT: SCANNING...', 12, 35);
        ctx.fillText(new Date().toISOString().substring(11, 19) + ' WIB', canvasEl.width - 95, 20);

        this.simAnimId = requestAnimationFrame(drawSimFeed);
      };
      drawSimFeed();
    };

    const startCamera = async () => {
      this.isCameraOn = true;
      if (qrArea) qrArea.classList.add('hidden');
      if (activeOverlay) activeOverlay.classList.remove('hidden');
      if (cameraBadgeInfo) {
        cameraBadgeInfo.classList.remove('hidden');
        cameraBadgeInfo.classList.add('flex');
      }
      if (cameraStatusDot) {
        cameraStatusDot.className = 'w-2 h-2 rounded-full bg-status-success animate-ping shrink-0';
      }
      if (cameraStatusText) cameraStatusText.textContent = 'Kamera Pemindai Aktif';
      applyMirrorState();

      if (feedback) {
        feedback.innerHTML = `<span class="text-status-success font-semibold">Kamera Aktif (Mirror).</span> Arahkan barcode fisik kartu pegawai atau QR aplikasi seluler ke kamera.`;
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          let stream = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
          } catch (camErr) {
            // Fallback for environment/any webcam
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
          }

          this.cameraStream = stream;
          if (videoEl) {
            videoEl.srcObject = stream;
            videoEl.classList.remove('hidden');
            applyMirrorState();
            await videoEl.play();

            // Real barcode / QR detection support via BarcodeDetector API if available
            if ('BarcodeDetector' in window) {
              try {
                const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
                this.barcodeDetectorInterval = setInterval(async () => {
                  if (!this.isCameraOn || !videoEl || videoEl.readyState < 2) return;
                  try {
                    const barcodes = await detector.detect(videoEl);
                    if (barcodes && barcodes.length > 0) {
                      clearInterval(this.barcodeDetectorInterval);
                      this.barcodeDetectorInterval = null;
                      triggerScanSimulation();
                    }
                  } catch (e) {}
                }, 400);
              } catch (e) {}
            }
          }
        } else {
          startCanvasSimulation();
        }
      } catch (err) {
        console.warn('Physical camera unavailable or access denied, running simulation feed:', err);
        startCanvasSimulation();
      }
    };

    const handleRoleSelect = (role) => {
      stopCamera();
      if (feedback) {
        feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Autentikasi Terverifikasi!</span> Mengalihkan sesi ke Creative Office...`;
      }
      setTimeout(() => {
        // loginWithRole emits 'auth:login' which is handled in app.js to navigate to dashboard
        this.authService.loginWithRole(role);
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
    
    const triggerScanSimulation = () => {
      if (feedback) {
        feedback.innerHTML = `<span class="text-brand-accent animate-pulse font-semibold">Membaca Barcode ID Card Pegawai...</span>`;
      }
      this.authService.simulateScan().then(user => {
        if (feedback) {
          feedback.innerHTML = `<span class="text-status-success font-semibold">Scan Berhasil!</span> Selamat datang, ${user.name}`;
        }
        setTimeout(() => {
          stopCamera();
          // loginWithRole (inside simulateScan) already emits 'auth:login' => navigates to dashboard
        }, 600);
      });
    };

    if (testScanBtn) testScanBtn.addEventListener('click', triggerScanSimulation);
    if (qrArea) qrArea.addEventListener('click', triggerScanSimulation);

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

    // Automatically activate camera when QR gate loads (User requirement)
    startCamera();
  }

  unmount() {
    if (this._cleanupCamera) {
      this._cleanupCamera();
    }
    super.unmount();
  }
}

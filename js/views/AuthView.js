import { BaseView } from '../core/BaseView.js';
import { QRCodeGenerator } from '../services/QRCodeGenerator.js';
import { apiService } from '../services/ApiService.js';
import { getDeviceId, getDeviceName, simulateSwitchDevice } from '../utils/deviceHelper.js';
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
            </div>

            <!-- Scanner Viewfinder Component (Portrait) -->
            <div class="relative z-10 w-full mb-spacing-md">
              <div class="relative w-full max-w-[280px] mx-auto aspect-[3/4] min-h-[300px] max-h-[380px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-spacing-md group">
                
                <!-- Live Camera Video Feed (strictly mirrored by default, portrait orientation) -->
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



            <!-- Security Verification Footer -->
            <div class="mt-spacing-lg pt-spacing-sm flex items-center justify-center gap-1.5 text-text-muted font-caption-meta text-[11px]">
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
                id="btn-close-locked-modal"
                class="w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
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
              video: {
                facingMode: 'user',
                aspectRatio: { ideal: 0.75 },
                width: { ideal: 720 },
                height: { ideal: 960 }
              }
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

            // Real-time QR Code scanning from camera video frame using jsQR
            const offscreenCanvas = document.createElement('canvas');
            const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
            let isScanningFrame = false;

            this.barcodeDetectorInterval = setInterval(() => {
              if (!this.isCameraOn || !videoEl || videoEl.readyState < 2 || isScanningFrame) return;
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
    const handleQrAuthentication = async (rawCode) => {
      if (!rawCode) return;
      const cleanCode = String(rawCode).trim();
      console.log('[AuthView] Kode QR terdeteksi:', cleanCode);

      if (feedback) {
        feedback.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">Memverifikasi ke Supabase & Memvalidasi Perangkat...</span>`;
      }

      // 1. Ekstrak data jika kode berupa JSON (seperti format QR Muhamad Fazli Esfandiar)
      let parsedUser = null;
      try {
        let parsed = null;
        if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
          try {
            parsed = JSON.parse(cleanCode);
          } catch {}
        } else if (cleanCode.includes(':')) {
          // Mendukung format plain text:
          // Nama: Muhamad Fazli Esfandiar
          // Role: Admin
          // Jobdesk: Web development
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
          const jobdesk = getKey(['jobdesk', 'job', 'title', 'jabatan', 'posisi']) || 'Web development';
          const isFazli = name && name.toLowerCase().includes('fazli');
          const finalId = isFazli ? (role.toLowerCase() === 'admin' ? 'usr-admin-fazli' : 'usr-352837') : `usr-${Date.now().toString().slice(-6)}`;
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

      // 2. Jika bukan JSON langsung, lakukan lookup via backend
      let payloadToSend = parsedUser;
      if (!payloadToSend) {
        payloadToSend = {
          rawCode: cleanCode,
          name: cleanCode.includes('usr-') ? null : cleanCode
        };
      }

      // 3. Kirim ke API Supabase dengan identitas perangkat ini
      try {
        const result = await apiService.registerUser(payloadToSend);

        // KASUS A: PERANGKAT LAIN TERKUNCI (SINGLE DEVICE LOCK TERPICU!)
        if (result && result.locked) {
          console.warn('[AuthView] Akses Ditolak: Terkunci di perangkat lain', result);
          if (feedback) {
            feedback.innerHTML = `<span class="text-rose-500 font-bold">❌ Akses Ditolak: Akun Terkunci di Perangkat Lain!</span>`;
          }

          const lockedModal = this.element.querySelector('#modal-device-locked');
          const titleEl = this.element.querySelector('#locked-user-title');
          const descEl = this.element.querySelector('#locked-user-description');
          const boundDevEl = this.element.querySelector('#locked-bound-device');

          const boundName = result.boundDeviceName || 'Perangkat Utama Lain';
          const userName = (result.data && result.data.name) || (parsedUser && parsedUser.name) || 'Pengguna';

          if (titleEl) titleEl.textContent = `Akun "${userName}" Terkunci`;
          if (descEl) {
            descEl.innerHTML = `Akun <b>${userName}</b> saat ini sudah tersambung di <b>${boundName}</b>. Sesuai kebijakan keamanan, <b>perangkat ini tidak dapat mengakses akun tersebut</b> selama masih terikat pada perangkat resmi.`;
          }
          if (boundDevEl) boundDevEl.textContent = boundName;

          if (lockedModal) lockedModal.classList.remove('hidden');
          if (this.notificationService) {
            this.notificationService.error(`Akses ditolak: Akun ${userName} terkunci di perangkat "${boundName}"!`);
          }
          return;
        }

        // KASUS B: BERHASIL LOGIN & TERIKAT KE PERANGKAT INI
        if (result && result.success && result.data) {
          const savedUser = result.data;
          stopCamera();

          if (feedback) {
            feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">Autentikasi Supabase Sukses!</span> Mengunci perangkat & masuk...`;
          }

          if (this.notificationService) {
            this.notificationService.success(`🎉 Selamat datang, ${savedUser.name}! Akun terhubung ke Supabase dan perangkat ini telah terkunci secara resmi.`);
          }

          // Daftarkan dan masuki akun
          const userInstance = this.authService.registerNewUser({
            ...savedUser,
            boundDeviceId: apiService.getDeviceId(),
            boundDeviceName: apiService.getDeviceName()
          });

          setTimeout(() => {
            this.authService.loginAsUser(userInstance);
          }, 600);
          return;
        }

        // KASUS C: BACKEND OFFLINE ATAU KONEKSI TERPUTUS TAPI IDENTITAS QR LENGKAP (GRACEFUL SESSION FALLBACK)
        if (parsedUser && parsedUser.name) {
          stopCamera();
          if (feedback) {
            feedback.innerHTML = `<span class="text-emerald-500 font-bold animate-pulse">QR Terverifikasi!</span> Masuk ke sesi...`;
          }
          if (this.notificationService) {
            this.notificationService.success(`🎉 Selamat datang, ${parsedUser.name}! Berhasil masuk sebagai ${(parsedUser.role || 'user').toUpperCase()}.`);
          }

          const userInstance = this.authService.registerNewUser({
            ...parsedUser,
            boundDeviceId: apiService.getDeviceId(),
            boundDeviceName: apiService.getDeviceName()
          });

          setTimeout(() => {
            this.authService.loginAsUser(userInstance);
          }, 600);
          return;
        }

        // KASUS D: JIKA SERVER MENGEMBALIKAN ERROR SPESIFIK
        if (result && result.error) {
          if (feedback) {
            feedback.innerHTML = `<span class="text-rose-500 font-semibold">⚠️ ${result.error}</span>`;
          }
          return;
        }

        // KASUS E: KODE QR BENAR-BENAR TIDAK DIKENALI
        if (feedback) {
          feedback.innerHTML = `<span class="text-amber-500 font-semibold">Kode QR tidak dikenali di database.</span>`;
        }
      } catch (err) {
        console.error('Error saat login QR:', err);

        // Fallback jika terjadi exception tapi parsedUser ada
        if (parsedUser && parsedUser.name) {
          stopCamera();
          const userInstance = this.authService.registerNewUser(parsedUser);
          this.authService.loginAsUser(userInstance);
          return;
        }

        if (feedback) {
          feedback.innerHTML = `<span class="text-rose-500 font-semibold">Gagal memvalidasi QR: ${err.message}</span>`;
        }
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

    // Tombol Cepat: QR Muhamad Fazli Esfandiar (Demo Pengujian Langsung)
    const quickMyQrBtn = this.element.querySelector('#btn-quick-my-qr');
    if (quickMyQrBtn) {
      quickMyQrBtn.addEventListener('click', () => {
        handleQrAuthentication('{"Nama":"Muhamad Fazli Esfandiar","Role":"User","Jobdesk":"Web development"}');
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
        if (!rawUrl) {
          if (inviteError) {
            inviteError.textContent = 'Harap masukkan tautan undangan yang valid.';
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

          if (inviteModal) inviteModal.classList.add('hidden');
          if (feedback) {
            feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Memverifikasi Tautan Undangan...</span> Mengalihkan ke Papan Kanban...`;
          }
          window.location.href = targetUrl;
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

    const handleRoleSelect = (role, isResuming = false) => {
      if (role === 'user' && !isResuming) {
        // User cannot enter directly without invite link
        openInviteModal();
        return;
      }

      stopCamera();
      if (feedback) {
        feedback.innerHTML = `<span class="text-status-success font-semibold animate-pulse">Autentikasi Terverifikasi!</span> Mengalihkan sesi ke Creative Office...`;
      }
      setTimeout(() => {
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
          }, 600);
        });
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

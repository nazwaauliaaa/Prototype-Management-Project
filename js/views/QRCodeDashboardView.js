import { BaseView } from '../core/BaseView.js';
import { QRCodeGenerator } from '../services/QRCodeGenerator.js';
import { apiService } from '../services/ApiService.js';
import jsQR from 'jsqr';

/**
 * QRCodeDashboardView - Dashboard QR Code & Pemindai Database
 * Terhubung dengan database PostgreSQL (projects, tasks, users)
 * Mendukung otomatisasi pembuatan akun baru saat mendeteksi QR role User
 */
export class QRCodeDashboardView extends BaseView {
  constructor(container) {
    super(container);
    this.projectService = container.resolve('ProjectService');
    this.taskService = container.resolve('TaskService');
    this.authService = container.resolve('AuthService');
    this.notificationService = container.resolve('NotificationService');
    this.eventBus = container.resolve('EventBus');

    this.activeTab = 'scanner'; // 'scanner' | 'history'
    this.videoStream = null;
    this.isScanning = false;
    this.animationFrameId = null;
    this.currentFacingMode = 'environment'; // 'environment' (belakang) | 'user' (depan)
    this.lastScannedResult = null;
    this._lastScanTime = 0; // throttle scan frame rate
    this._isProcessing = false; // prevent concurrent processing

    // Riwayat scan lokal
    this.scanHistory = this._loadScanHistory();
  }

  _loadScanHistory() {
    try {
      const stored = localStorage.getItem('creative_office_qr_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  _saveScanHistory(item) {
    this.scanHistory.unshift(item);
    if (this.scanHistory.length > 50) this.scanHistory.pop();
    try {
      localStorage.setItem('creative_office_qr_history', JSON.stringify(this.scanHistory));
    } catch (e) {
      console.warn('Gagal menyimpan riwayat scan:', e);
    }
  }

  /**
   * Main render template
   */
  render() {
    const canAccess = this.authService && typeof this.authService.canAccessQrHub === 'function'
      ? this.authService.canAccessQrHub()
      : false;

    if (!canAccess) {
      const currentUser = this.authService ? this.authService.getCurrentUser() : null;
      const userRole = currentUser ? (currentUser.title || currentUser.role || 'User') : 'Tamu';

      return `
        <div class="w-full max-w-lg mx-auto my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm text-center flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div class="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/50 text-rose-600 flex items-center justify-center shadow-xs">
            <span class="material-symbols-outlined text-3xl">lock</span>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Akses Fitur Terbatas</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Halaman <b>QR Hub & Scanner</b> hanya dapat diakses oleh pengguna dengan role <b>Admin</b> dan <b>Manajemen Project</b>.
            </p>
          </div>
          <div class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px] text-slate-400">person</span>
            <span>Peran Anda saat ini: <b class="capitalize">${userRole}</b></span>
          </div>
          <button
            id="btn-access-denied-back"
            class="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Kembali ke Beranda
          </button>
        </div>
      `;
    }

    return `
      <div class="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 animate-in fade-in duration-300">
        
        <!-- Header & Navigation Toolbar -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <span class="material-symbols-outlined text-2xl">qr_code_scanner</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">QR Scanner & Hub Database</h1>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  PostgreSQL
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pindai atau kelola kode QR terhubung data proyek, tugas, dan anggota tim</p>
            </div>
          </div>

          <!-- Navigation Tabs & Sync Button -->
          <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
              <button
                class="tab-btn px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${this.activeTab === 'scanner' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                data-tab="scanner"
              >
                <span class="material-symbols-outlined text-[17px]">center_focus_strong</span>
                <span>Pemindai QR</span>
              </button>

              <button
                class="tab-btn px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${this.activeTab === 'history' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                data-tab="history"
              >
                <span class="material-symbols-outlined text-[17px]">history</span>
                <span>Riwayat (${this.scanHistory.length})</span>
              </button>
            </div>

            <button
              id="btn-refresh-db-data"
              class="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
              title="Sinkronkan ulang data dari PostgreSQL"
            >
              <span class="material-symbols-outlined text-[16px]">sync</span>
              <span class="hidden sm:inline">Sync Database</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Tab Content -->
        <div id="tab-content-area" class="w-full">
          ${this._renderTabContent()}
        </div>

        <!-- Result Modal / Card Area -->
        <div id="qr-result-modal" class="hidden fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <!-- Diisi secara dinamis saat QR terbaca -->
        </div>

      </div>
    `;
  }

  _renderTabContent() {
    if (this.activeTab === 'scanner') {
      return this._renderScannerTab();
    } else {
      return this._renderHistoryTab();
    }
  }

  /**
   * ==========================================
   * TAB 1: PEMINDAI QR (SCANNER HUB)
   * ==========================================
   */
  _renderScannerTab() {
    return `
      <div class="max-w-2xl mx-auto w-full flex flex-col gap-4">
        
        <!-- Live Camera Viewfinder & Image Dropper Card -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">photo_camera</span>
              </div>
              <div>
                <h2 class="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-none">Kamera Pemindai Langsung</h2>
                <span class="text-[11px] text-slate-400">Arahkan kamera ke kode QR fisik atau digital</span>
              </div>
            </div>
            
            <!-- Camera Switcher / Status -->
            <div class="flex items-center gap-2">
              <button
                id="btn-toggle-facing"
                class="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer font-medium"
                title="Ganti kamera depan / belakang"
              >
                <span class="material-symbols-outlined text-[15px]">cameraswitch</span>
                <span class="hidden sm:inline">Flip Kamera</span>
              </button>
            </div>
          </div>

          <!-- Viewfinder Container -->
          <div class="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-md border border-slate-800 group">
            
            <video id="qr-video" class="w-full h-full object-cover" playsinline muted></video>
            <canvas id="qr-canvas" class="hidden"></canvas>

            <!-- Viewfinder Overlay Reticle -->
            <div id="camera-overlay" class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <!-- Laser Scanning line (active when scanning) -->
              <div id="scanner-laser" class="hidden absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-[bounce_2s_infinite]"></div>

              <!-- 4 Corner Focus Brackets -->
              <div class="relative w-52 h-52 sm:w-60 sm:h-60 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
                <div class="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-indigo-500 rounded-tl-lg"></div>
                <div class="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-indigo-500 rounded-tr-lg"></div>
                <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-indigo-500 rounded-bl-lg"></div>
                <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-indigo-500 rounded-br-lg"></div>
                
                <div class="text-center text-white/90 text-xs px-3.5 py-1.5 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1.5 shadow-sm border border-white/10">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="font-medium text-[11px]">Arahkan ke kode QR</span>
                </div>
              </div>
            </div>

            <!-- Camera Idle / Placeholder State -->
            <div id="camera-idle-placeholder" class="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-300 gap-3">
              <div class="w-16 h-16 rounded-2xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-lg">
                <span class="material-symbols-outlined text-3xl">videocam</span>
              </div>
              <div>
                <h3 class="font-bold text-white text-sm sm:text-base">Kamera Belum Aktif</h3>
                <p class="text-xs text-slate-400 max-w-xs mt-1">
                  Nyalakan kamera untuk memindai kode QR fisik pada kartu anggota tim atau dokumen.
                </p>
              </div>
              <button
                id="btn-start-camera"
                class="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-lg">play_arrow</span>
                <span>Mulai Kamera Scanner</span>
              </button>
            </div>

            <!-- Camera Active Bar (Bottom) -->
            <div id="camera-controls-bar" class="hidden absolute bottom-3 inset-x-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-white text-xs">
              <div class="flex items-center gap-2 px-2">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span class="font-medium text-slate-200 text-xs">Memindai real-time...</span>
              </div>
              <button
                id="btn-stop-camera"
                class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px]">stop</span>
                <span>Hentikan</span>
              </button>
            </div>

          </div>

          <!-- Upload QR Image Dropzone -->
          <div class="mt-4">
            <label
              for="qr-file-input"
              class="w-full py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 cursor-pointer transition-all group shadow-2xs"
            >
              <span class="material-symbols-outlined text-lg text-slate-400 group-hover:text-indigo-500 transition-colors">upload_file</span>
              <span><b>Pilih atau Seret Gambar QR</b> (PNG, JPG, SVG)</span>
              <input id="qr-file-input" type="file" accept="image/*" class="hidden" />
            </label>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * ==========================================
   * TAB 2: RIWAYAT SCAN (AUDIT LOG)
   * ==========================================
   */
  _renderHistoryTab() {
    if (this.scanHistory.length === 0) {
      return `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <span class="material-symbols-outlined text-4xl text-slate-300">history</span>
          <h4 class="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Riwayat Scan</h4>
          <p class="text-xs">Arahkan kamera ke kode QR atau unggah gambar untuk mulai memindai.</p>
        </div>
      `;
    }

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 class="font-bold text-sm text-slate-900 dark:text-white">Log Riwayat Pemindaian (${this.scanHistory.length})</h3>
          <button
            id="btn-clear-history"
            class="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[15px]">delete_sweep</span>
            <span>Bersihkan Riwayat</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="py-3 px-4">Waktu</th>
                <th class="py-3 px-4">Kode QR / ID</th>
                <th class="py-3 px-4">Entitas Database</th>
                <th class="py-3 px-4">Tipe</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${this.scanHistory.map(h => `
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">${h.timestamp || 'Baru saja'}</td>
                  <td class="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white truncate max-w-xs">${h.rawCode}</td>
                  <td class="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">${h.title || 'Tidak Diketahui'}</td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${h.type === 'project' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400' : h.type === 'user' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : h.type === 'task' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400' : 'bg-slate-100 text-slate-600'}">
                      ${h.type || 'Custom'}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    ${h.autoCreated ? `
                      <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Akun Baru Dibuat ✨
                      </span>
                    ` : h.found ? `
                      <span class="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Terverifikasi di DB
                      </span>
                    ` : `
                      <span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Tidak Ditemukan
                      </span>
                    `}
                  </td>
                  <td class="py-3 px-4 text-right">
                    <button
                      class="btn-re-inspect-history px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-semibold text-[11px] transition-colors cursor-pointer"
                      data-code='${h.rawCode.replace(/'/g, "&apos;")}'
                    >
                      Buka Lagi
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners to DOM
   */
  bindEvents() {
    const canAccess = this.authService && typeof this.authService.canAccessQrHub === 'function'
      ? this.authService.canAccessQrHub()
      : false;

    if (!canAccess) {
      const backBtn = this.element.querySelector('#btn-access-denied-back');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          const u = this.authService ? this.authService.getCurrentUser() : null;
          const fallback = u && u.role === 'user' ? 'kanban' : 'dashboard';
          this.eventBus.emit('navigate', { view: fallback });
        });
      }
      return;
    }

    // 1. Tab switches
    const tabBtns = this.element.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.activeTab = tab;
        this._stopCamera();
        this.mount(this.element);
      });
    });

    // 2. Sync Database button
    const refreshBtn = this.element.querySelector('#btn-refresh-db-data');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('animate-spin');
        if (this.projectService && this.projectService.syncFromBackend) {
          await this.projectService.syncFromBackend();
        }
        if (this.taskService && this.taskService.syncFromBackend) {
          await this.taskService.syncFromBackend();
        }
        refreshBtn.classList.remove('animate-spin');
        this.notificationService.success('Data database berhasil disinkronkan.');
        this.mount(this.element);
      });
    }

    // 3. Scanner tab specific listeners
    if (this.activeTab === 'scanner') {
      const startCamBtn = this.element.querySelector('#btn-start-camera');
      const stopCamBtn = this.element.querySelector('#btn-stop-camera');
      const toggleFacingBtn = this.element.querySelector('#btn-toggle-facing');
      const fileInput = this.element.querySelector('#qr-file-input');

      if (startCamBtn) startCamBtn.addEventListener('click', () => this._startCamera());
      if (stopCamBtn) stopCamBtn.addEventListener('click', () => this._stopCamera());
      if (toggleFacingBtn) {
        toggleFacingBtn.addEventListener('click', () => {
          this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
          if (this.isScanning) {
            this._stopCamera();
            this._startCamera();
          }
        });
      }

      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this._decodeImageFile(file);
        });
      }
    }

    // 4. History tab specific listeners
    if (this.activeTab === 'history') {
      const clearBtn = this.element.querySelector('#btn-clear-history');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.scanHistory = [];
          localStorage.removeItem('creative_office_qr_history');
          this.mount(this.element);
          this.notificationService.info('Riwayat pemindaian QR telah dibersihkan.');
        });
      }

      const reinspectBtns = this.element.querySelectorAll('.btn-re-inspect-history');
      reinspectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-code');
          if (code) this._processQrCode(code);
        });
      });
    }
  }

  /**
   * ==========================================
   * KAMERA & PEMINDAIAN REAL-TIME
   * ==========================================
   */
  async _startCamera() {
    const video = this.element.querySelector('#qr-video');
    const idlePlaceholder = this.element.querySelector('#camera-idle-placeholder');
    const controlsBar = this.element.querySelector('#camera-controls-bar');
    const laser = this.element.querySelector('#scanner-laser');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notificationService.error('Browser Anda tidak mendukung akses kamera.');
      return;
    }

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.currentFacingMode }
      });
      video.srcObject = this.videoStream;
      await video.play();

      this.isScanning = true;
      if (idlePlaceholder) idlePlaceholder.classList.add('hidden');
      if (controlsBar) controlsBar.classList.remove('hidden');
      if (laser) laser.classList.remove('hidden');

      this._scanLoop();
      this.notificationService.info('Kamera aktif. Silakan arahkan ke kode QR.');
    } catch (err) {
      console.error('Gagal mengakses kamera:', err);
      this.notificationService.error(`Gagal membuka kamera: ${err.message || 'Izin ditolak'}`);
    }
  }

  _stopCamera() {
    this.isScanning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    const video = this.element?.querySelector('#qr-video');
    if (video) video.srcObject = null;

    const idlePlaceholder = this.element?.querySelector('#camera-idle-placeholder');
    const controlsBar = this.element?.querySelector('#camera-controls-bar');
    const laser = this.element?.querySelector('#scanner-laser');

    if (idlePlaceholder) idlePlaceholder.classList.remove('hidden');
    if (controlsBar) controlsBar.classList.add('hidden');
    if (laser) laser.classList.add('hidden');
  }

  _scanLoop() {
    if (!this.isScanning) return;

    this.animationFrameId = requestAnimationFrame(() => {
      if (!this.isScanning) return;

      const now = Date.now();
      // Throttle: only scan every 150ms to avoid CPU overload & improve detection
      if (now - this._lastScanTime < 150) {
        this._scanLoop();
        return;
      }
      this._lastScanTime = now;

      const video = this.element?.querySelector('#qr-video');
      const canvas = this.element?.querySelector('#qr-canvas');

      if (!video || !canvas) {
        this._scanLoop();
        return;
      }

      // Only process if video has actual data
      if (video.readyState < video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
        this._scanLoop();
        return;
      }

      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Use imported jsQR module (not window.jsQR from CDN)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth' // try both normal & inverted QR codes
        });

        if (code && code.data) {
          // QR ditemukan!
          this._isProcessing = true;
          this._stopCamera();
          this._playSuccessBeep();
          this._showScanningFeedback(true);
          this._processQrCode(code.data).finally(() => {
            this._isProcessing = false;
          });
          return;
        }
      } catch (err) {
        console.warn('[QR Scanner] Error saat memproses frame:', err.message);
      }

      this._scanLoop();
    });
  }

  _decodeImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Scale down very large images for faster processing
        const MAX_SIZE = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        // Use imported jsQR module — attempts both normal & inverted
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data) {
          this._playSuccessBeep();
          this._processQrCode(code.data);
        } else {
          // Try with original size if scaled image failed
          if (w !== img.width) {
            const canvas2 = document.createElement('canvas');
            canvas2.width = img.width;
            canvas2.height = img.height;
            const ctx2 = canvas2.getContext('2d');
            ctx2.drawImage(img, 0, 0);
            const imageData2 = ctx2.getImageData(0, 0, img.width, img.height);
            const code2 = jsQR(imageData2.data, imageData2.width, imageData2.height, {
              inversionAttempts: 'attemptBoth'
            });
            if (code2 && code2.data) {
              this._playSuccessBeep();
              this._processQrCode(code2.data);
              return;
            }
          }
          this.notificationService.error('❌ Tidak dapat mendeteksi kode QR dari gambar tersebut. Pastikan gambar jelas dan QR tidak terpotong.');
        }
      };
      img.onerror = () => {
        this.notificationService.error('Gagal memuat gambar. Pastikan format file didukung (PNG, JPG, SVG).');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Tampilkan feedback visual singkat saat QR berhasil terdeteksi
   */
  _showScanningFeedback(success) {
    const overlay = this.element?.querySelector('#camera-overlay');
    if (!overlay) return;
    const feedbackEl = document.createElement('div');
    feedbackEl.className = `absolute inset-0 flex items-center justify-center pointer-events-none ${
      success ? 'bg-emerald-500/20' : 'bg-rose-500/20'
    } transition-opacity duration-300`;
    feedbackEl.innerHTML = success
      ? `<span class="material-symbols-outlined text-6xl text-emerald-400 drop-shadow-lg">check_circle</span>`
      : `<span class="material-symbols-outlined text-6xl text-rose-400 drop-shadow-lg">error</span>`;
    overlay.appendChild(feedbackEl);
    setTimeout(() => feedbackEl.remove(), 600);
  }

  _playSuccessBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  }

  /**
   * =========================================================================
   * PEMROSESAN QR, DETEKSI ROLE USER, & OTOMATISASI PEMBUATAN AKUN BARU
   * =========================================================================
   */
  async _processQrCode(rawCode) {
    if (!rawCode) return;
    let cleanCode = String(rawCode).trim();

    // 1. Coba periksa apakah kode QR berupa JSON berisi informasi User
    let jsonUser = null;
    try {
      let parsed = null;
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        try {
          parsed = JSON.parse(cleanCode);
        } catch {}
      } else if (cleanCode.includes(':')) {
        // Mendukung format plain text seperti:
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

      if (parsed && typeof parsed === 'object') {
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
        const role = getKey(['role', 'peran', 'type']) || 'user';
        const jobdesk = getKey(['jobdesk', 'job', 'title', 'jabatan', 'posisi']) || 'Web development';
        const id = getKey(['id', 'userid', 'user_id']);
        const email = getKey(['email']) || (name ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}${role.toLowerCase() === 'admin' ? '.admin' : ''}@sampulkreativ.id` : null);
        const avatar = getKey(['avatar']);

        if (name) {
          const isFazli = name.toLowerCase().includes('fazli');
          const finalId = id || (isFazli ? (role.toLowerCase() === 'admin' ? 'usr-admin-fazli' : 'usr-352837') : `usr-${Date.now().toString().slice(-6)}`);
          jsonUser = {
            id: finalId,
            name,
            role: role.toLowerCase(),
            jobdesk,
            title: jobdesk,
            email,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + (role.toLowerCase() === 'admin' ? ' Admin' : ''))}`
          };
        }
      }
    } catch (e) {
      console.warn('Gagal parse QR text/JSON:', e);
    }

    // Coba ekstrak jika URL (misal: .../auth?scan=...)
    let parsedId = cleanCode;
    if (cleanCode.includes('/project/')) {
      const parts = cleanCode.split('/project/');
      parsedId = parts[1].split('?')[0].split('/')[0];
    } else if (cleanCode.includes('scan=')) {
      parsedId = cleanCode.split('scan=')[1].split('&')[0];
    }

    console.log(`[QR Scanner] Memproses kode: "${cleanCode}"`);

    let matchedData = null;
    let entityType = null;
    let wasAutoCreated = false;

    // JIKA QR MEMUAT DATA USER DENGAN ROLE USER ATAU ADMIN (LANGSUNG DARI JSON)
    if (jsonUser && jsonUser.name) {
      matchedData = jsonUser;
      entityType = 'user';
    }

    // 2. Cari via Backend PostgreSQL API
    if (!matchedData) {
      try {
        const backendLookup = await apiService.lookupQr(parsedId);
        if (backendLookup && backendLookup.success && backendLookup.data) {
          matchedData = backendLookup.data;
          entityType = backendLookup.type;
        }
      } catch (e) {
        console.warn('Backend lookup gagal, mencoba pencarian lokal:', e);
      }
    }

    // 3. Fallback pencarian lokal
    if (!matchedData) {
      // Cek apakah ada di daftar users AuthService
      const allUsers = this.authService ? this.authService.getAllUsers() : [];
      const userMatch = allUsers.find(u => 
        u.id === parsedId || 
        u.name.toLowerCase() === parsedId.toLowerCase() ||
        (u.email && u.email.toLowerCase() === parsedId.toLowerCase())
      );

      if (userMatch) {
        matchedData = userMatch;
        entityType = 'user';
      } else {
        // Cek ProjectService
        const project = this.projectService ? this.projectService.getProject(parsedId) : null;
        if (project) {
          matchedData = project;
          entityType = 'project';
        } else {
          // Cek TaskService
          const task = this.taskService ? this.taskService.getTask(parsedId) : null;
          if (task) {
            matchedData = task;
            entityType = 'task';
          }
        }
      }
    }

    // =========================================================================
    // ATURAN UTAMA: DETEKSI QR PENGGUNA (USER / ADMIN) -> OTOMATIS DAFTAR/SINKRON
    // =========================================================================
    if (entityType === 'user' && matchedData) {
      const userRole = (matchedData.role || 'user').toLowerCase();
      const targetName = matchedData.name || 'Pengguna';
      const targetJobdesk = matchedData.jobdesk || matchedData.title || (userRole === 'admin' ? 'Administrator' : 'Creative Specialist');
      const targetEmail = matchedData.email || `${targetName.toLowerCase().replace(/[^a-z0-9]/g, '.')}${userRole === 'admin' ? '.admin' : ''}@sampulkreativ.id`;
      const targetAvatar = matchedData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetName + (userRole === 'admin' ? ' Admin' : ''))}`;
      const isFazli = targetName.toLowerCase().includes('fazli');
      const targetId = matchedData.id && (matchedData.id.startsWith('usr-') || matchedData.id.startsWith('adm-'))
        ? matchedData.id
        : (isFazli ? (userRole === 'admin' ? 'usr-admin-fazli' : 'usr-352837') : `usr-${Date.now().toString().slice(-6)}`);

      // Otomatis daftarkan akun di AuthService
      const newAccount = this.authService.registerNewUser({
        id: targetId,
        name: targetName,
        role: userRole,
        title: targetJobdesk,
        jobdesk: targetJobdesk,
        email: targetEmail,
        avatar: targetAvatar
      });

      // Sinkronisasi pembuatan/pembaruan akun ke database Supabase via ApiService
      try {
        const syncResult = await apiService.registerUser(newAccount);
        if (syncResult && syncResult.locked) {
          this.notificationService.error(`⚠️ ${syncResult.error}`);
        } else if (syncResult && syncResult.data) {
          matchedData = { ...newAccount, ...syncResult.data };
        }
      } catch (e) {
        console.warn('Gagal sinkron user ke Supabase:', e);
      }

      wasAutoCreated = true;
      this.notificationService.success(`🎉 Akun "${targetName}" [${userRole.toUpperCase()}] (${targetJobdesk}) berhasil terhubung ke database!`);
    }

    // Simpan ke riwayat
    const historyEntry = {
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      rawCode: cleanCode,
      title: matchedData ? (matchedData.name || matchedData.title) : 'Tidak Diketahui',
      type: entityType || 'Unknown',
      found: Boolean(matchedData),
      autoCreated: wasAutoCreated
    };
    this._saveScanHistory(historyEntry);

    // Tampilkan Modal Hasil Scan
    this._showResultModal(cleanCode, entityType, matchedData, wasAutoCreated);
  }

  /**
   * ==========================================
   * POPUP HASIL PEMINDAIAN INTERAKTIF
   * ==========================================
   */
  _showResultModal(rawCode, type, data, isAutoCreated = false) {
    const modal = this.element.querySelector('#qr-result-modal');
    if (!modal) return;

    let contentHtml = '';

    if (!data) {
      // Data TIDAK DITEMUKAN di database
      contentHtml = `
        <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
          <div class="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Data QR Tidak Ditemukan</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Kode QR berhasil terbaca namun tidak ada proyek, tugas, atau pengguna di database yang cocok dengan kode ini.
          </p>
          <div class="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 break-all mb-5">
            ${rawCode}
          </div>
          <button
            id="btn-close-result-modal"
            class="w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Tutup & Pindai Ulang
          </button>
        </div>
      `;
    } else if (type === 'user') {
      const userRole = (data.role || 'user').toLowerCase();
      const isAdmin = userRole === 'admin';
      const qrPayload = JSON.stringify({ nama: data.name, role: isAdmin ? 'Admin' : 'User', jobdesk: data.jobdesk || data.title });
      const qrDarkColor = isAdmin ? '#78350f' : '#065f46';
      const qrSvg = QRCodeGenerator.generate(qrPayload, { size: 90, darkColor: qrDarkColor });

      const borderClass = isAdmin ? 'border-amber-300 dark:border-amber-700/80' : 'border-emerald-200 dark:border-emerald-800/80';
      const badgeBg = isAdmin ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';
      const roleBadge = isAdmin ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300/80' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/80';
      const btnBg = isAdmin ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20';

      contentHtml = `
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border ${borderClass} shadow-2xl p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
          
          <!-- Background Glow -->
          <div class="absolute -top-10 -right-10 w-44 h-44 ${isAdmin ? 'bg-amber-500/10' : 'bg-emerald-500/10'} rounded-full blur-2xl pointer-events-none"></div>

          <!-- Top Header Tag -->
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-bold ${badgeBg} flex items-center gap-1.5 shadow-2xs">
                <span class="material-symbols-outlined text-[15px] ${isAdmin ? 'text-amber-600' : 'text-emerald-600'}">${isAdmin ? 'admin_panel_settings' : 'verified_user'}</span>
                <span>${isAdmin ? 'PROFIL ADMINISTRATOR TERVERIFIKASI' : 'PROFIL PENGGUNA TERVERIFIKASI'}</span>
              </span>
              ${isAutoCreated ? `
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  Akun Terdaftar
                </span>
              ` : ''}
            </div>
            <button id="btn-close-result-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- User Card -->
          <div class="flex items-start gap-4 mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <img
              src="${data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name + (isAdmin ? ' Admin' : ''))}`}"
              alt="${data.name}"
              class="w-16 h-16 rounded-2xl object-cover bg-white ring-2 ${isAdmin ? 'ring-amber-500/40' : 'ring-emerald-500/30'} shadow-sm shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">${data.name}</h3>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${roleBadge} border">
                  Role: ${userRole.toUpperCase()}
                </span>
              </div>
              <p class="text-xs font-semibold ${isAdmin ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'} mt-0.5">${data.jobdesk || data.title || (isAdmin ? 'Administrator' : 'Creative Specialist')}</p>
              <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">mail</span>${data.email || 'user@sampulkreativ.id'}</span>
                <span>•</span>
                <span class="font-mono text-slate-400">${data.id}</span>
              </div>
            </div>
            
            <div class="hidden sm:flex w-16 h-16 bg-white p-1 rounded-xl shadow-2xs shrink-0 items-center justify-center">
              ${qrSvg}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              id="btn-login-new-user"
              class="w-full sm:flex-1 py-3 px-4 ${btnBg} active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              data-user-id="${data.id}"
            >
              <span class="material-symbols-outlined text-[18px]">login</span>
              <span>Masuk Sebagai ${data.name.split(' ')[0]} (${userRole.toUpperCase()})</span>
            </button>

            <button
              id="btn-download-scanned-qr"
              class="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              data-id="${data.id}"
              data-filename="IDCard-${data.name.replace(/\s+/g, '-')}"
              title="Unduh ID Card QR"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh QR ID</span>
            </button>
          </div>

        </div>
      `;
    } else if (type === 'project') {
      // PROYEK DITEMUKAN
      const qrSvg = QRCodeGenerator.generate(data.id, { size: 90, darkColor: '#312e81' });
      contentHtml = `
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
          
          <!-- Top Tag -->
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">folder</span>
                PROYEK TERVERIFIKASI
              </span>
              <span class="text-xs font-mono font-bold text-slate-400">${data.code || 'PRJ'}</span>
            </div>
            <button id="btn-close-result-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Project Main Info -->
          <div class="flex items-start gap-4 mb-5">
            <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl p-1.5 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 shadow-xs">
              ${qrSvg}
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">${data.name}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${data.description || 'Tidak ada deskripsi proyek.'}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${data.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                  ${data.status}
                </span>
                <span class="text-xs text-slate-400">• Ruang: ${data.workspace || 'ruangkreasi'}</span>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-5 text-center">
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase">Progres</div>
              <div class="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">${data.progress || 0}%</div>
            </div>
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase">Anggaran</div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">${data.budget || 'Rp 0'}</div>
            </div>
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase">Tenggat</div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">${data.dueDate || 'Segera'}</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
            <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${data.progress || 0}%"></div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2.5">
            <button
              id="btn-open-project-board"
              class="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              data-project-id="${data.id}"
            >
              <span class="material-symbols-outlined text-[17px]">view_kanban</span>
              <span>Buka Papan Kanban Proyek</span>
            </button>
            <button
              id="btn-download-scanned-qr"
              class="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              data-id="${data.id}"
              data-filename="QR-${data.code || data.id}"
              title="Unduh QR SVG"
            >
              <span class="material-symbols-outlined text-[17px]">download</span>
            </button>
          </div>

        </div>
      `;
    } else if (type === 'task') {
      // TUGAS / DELIVERABLE DITEMUKAN
      const qrSvg = QRCodeGenerator.generate(data.id, { size: 90, darkColor: '#581c87' });
      const isDone = data.status === 'done';

      contentHtml = `
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
          
          <!-- Top Tag -->
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">task_alt</span>
                TUGAS / DELIVERABLE TERDAFTAR
              </span>
              <span class="text-xs font-mono font-bold text-slate-400">${data.code || '#RK'}</span>
            </div>
            <button id="btn-close-result-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Task Main Info -->
          <div class="flex items-start gap-4 mb-5">
            <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl p-1.5 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 shadow-xs">
              ${qrSvg}
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">${data.title}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${data.description || 'Tidak ada rincian tugas tambahan.'}</p>
              
              <div class="flex items-center gap-2 mt-2">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  Status: ${data.status}
                </span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                  Prioritas: ${data.priority}
                </span>
              </div>
            </div>
          </div>

          <!-- Meta Info Cards -->
          <div class="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-5 text-xs">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                ${data.pic ? (data.pic.initials || data.pic.name.substring(0, 2)) : 'SR'}
              </div>
              <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase">PIC Bertugas</div>
                <div class="font-bold text-slate-800 dark:text-slate-200">${data.pic ? data.pic.name : 'Sari Rahmawati'}</div>
              </div>
            </div>

            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase">Estimasi Waktu</div>
              <div class="font-bold text-slate-800 dark:text-slate-200">${data.hours || 0} Jam (${data.timeline || 'Sprint Aktif'})</div>
            </div>
          </div>

          <!-- Instant Database Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center gap-2.5">
            ${!isDone ? `
              <button
                id="btn-mark-task-done"
                class="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                data-task-id="${data.id}"
              >
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Tandai Selesai (Update DB)</span>
              </button>
            ` : `
              <button
                id="btn-mark-task-progress"
                class="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                data-task-id="${data.id}"
              >
                <span class="material-symbols-outlined text-[18px]">replay</span>
                <span>Kembalikan ke In-Progress</span>
              </button>
            `}

            <button
              id="btn-open-kanban-board"
              class="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-outlined text-[17px]">view_kanban</span>
              <span>Buka Board</span>
            </button>
          </div>

        </div>
      `;
    }

    modal.innerHTML = contentHtml;
    modal.classList.remove('hidden');

    // Bind inside modal events
    const closeBtn = modal.querySelector('#btn-close-result-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    // Login sebagai user baru
    const loginUserBtn = modal.querySelector('#btn-login-new-user');
    if (loginUserBtn) {
      loginUserBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (this.authService && data) {
          this.authService.loginAsUser(data);
          this.eventBus.emit('navigate', { view: 'dashboard' });
        }
      });
    }

    const openProjBtn = modal.querySelector('#btn-open-project-board');
    if (openProjBtn) {
      openProjBtn.addEventListener('click', () => {
        const pId = openProjBtn.getAttribute('data-project-id');
        modal.classList.add('hidden');
        this.eventBus.emit('navigate', { view: 'kanban', projectId: pId });
      });
    }

    const openKanbanBtn = modal.querySelector('#btn-open-kanban-board');
    if (openKanbanBtn) {
      openKanbanBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.eventBus.emit('navigate', { view: 'kanban' });
      });
    }

    const downloadQrBtn = modal.querySelector('#btn-download-scanned-qr');
    if (downloadQrBtn) {
      downloadQrBtn.addEventListener('click', () => {
        const id = downloadQrBtn.getAttribute('data-id');
        const fn = downloadQrBtn.getAttribute('data-filename') || 'qr';
        QRCodeGenerator.downloadSvg(id, fn);
        this.notificationService.success(`Kode QR ${fn} berhasil diunduh.`);
      });
    }

    // Update status button directly in Database
    const markDoneBtn = modal.querySelector('#btn-mark-task-done');
    if (markDoneBtn) {
      markDoneBtn.addEventListener('click', async () => {
        const taskId = markDoneBtn.getAttribute('data-task-id');
        if (this.taskService) {
          this.taskService.updateTaskStatus(taskId, 'done');
          this.notificationService.success(`Tugas berhasil ditandai selesai di PostgreSQL!`);
          modal.classList.add('hidden');
          this.mount(this.element);
        }
      });
    }

    const markProgressBtn = modal.querySelector('#btn-mark-task-progress');
    if (markProgressBtn) {
      markProgressBtn.addEventListener('click', async () => {
        const taskId = markProgressBtn.getAttribute('data-task-id');
        if (this.taskService) {
          this.taskService.updateTaskStatus(taskId, 'in-progress');
          this.notificationService.info(`Status tugas dikembalikan ke In-Progress.`);
          modal.classList.add('hidden');
          this.mount(this.element);
        }
      });
    }
  }

  /**
   * Cleanup when unmounting view
   */
  unmount() {
    this._stopCamera();
    super.unmount();
  }
}

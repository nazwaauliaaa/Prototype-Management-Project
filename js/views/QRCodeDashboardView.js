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

    this.activeTab = 'scanner'; // 'scanner' | 'catalog' | 'history'
    this.catalogFilter = 'all'; // 'all' | 'project' | 'task' | 'user'
    this.catalogSearch = '';
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
    const projects = this.projectService ? this.projectService.getAllProjects() : [];
    const tasks = this.taskService ? this.taskService.getTasks() : [];
    const users = this.authService ? this.authService.getAllUsers() : [];
    const totalItems = projects.length + tasks.length + users.length;

    return `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 animate-in fade-in duration-300">
        
        <!-- Top Hero Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <span class="material-symbols-outlined text-2xl">qr_code_scanner</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">QR Scanner & Hub Database</h1>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  PostgreSQL Sync
                </span>
                <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  ⚡ Auto-Account Creation
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Pindai QR proyek, tugas, atau ID card pengguna. <b>Mendeteksi QR role User otomatis membuat akun baru dengan nama & jobdesk yang sama.</b>
              </p>
            </div>
          </div>

          <!-- Quick Stats Pills -->
          <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">folder</span>
              <div class="text-left">
                <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Proyek</div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${projects.length}</div>
              </div>
            </div>

            <div class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <span class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-lg">task_alt</span>
              <div class="text-left">
                <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tugas</div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${tasks.length}</div>
              </div>
            </div>

            <div class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">group</span>
              <div class="text-left">
                <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pengguna</div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${users.length}</div>
              </div>
            </div>

            <div class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">history</span>
              <div class="text-left">
                <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Scan</div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${this.scanHistory.length}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div class="flex items-center gap-2 overflow-x-auto">
            <button
              class="tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${this.activeTab === 'scanner' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'}"
              data-tab="scanner"
            >
              <span class="material-symbols-outlined text-base">center_focus_strong</span>
              <span>Pemindai QR (Scanner)</span>
            </button>

            <button
              class="tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${this.activeTab === 'catalog' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'}"
              data-tab="catalog"
            >
              <span class="material-symbols-outlined text-base">grid_view</span>
              <span>Katalog QR Database (${totalItems})</span>
            </button>

            <button
              class="tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${this.activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'}"
              data-tab="history"
            >
              <span class="material-symbols-outlined text-base">history</span>
              <span>Riwayat Scan (${this.scanHistory.length})</span>
            </button>
          </div>

          <button
            id="btn-refresh-db-data"
            class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Sinkronkan ulang data dari PostgreSQL"
          >
            <span class="material-symbols-outlined text-[16px]">sync</span>
            <span class="hidden sm:inline">Sync Database</span>
          </button>
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
    } else if (this.activeTab === 'catalog') {
      return this._renderCatalogTab();
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
    const projects = this.projectService ? this.projectService.getAllProjects() : [];
    const tasks = this.taskService ? this.taskService.getTasks() : [];
    const allUsers = this.authService ? this.authService.getAllUsers() : [];

    // Pre-defined / database user team members with role User & jobdesk
    const roleUserCandidates = [
      { id: 'usr-004', name: 'Dimas Anggara', role: 'user', jobdesk: 'Creative Specialist & Konten 3D', email: 'dimas.anggara@sampulkreativ.id' },
      { id: 'usr-005', name: 'Rizky Firmansyah', role: 'user', jobdesk: 'UI/UX Designer & Prototyper', email: 'rizky.firmansyah@sampulkreativ.id' },
      { id: 'usr-006', name: 'Dewi Sartika', role: 'user', jobdesk: 'Content Strategist & Copywriter', email: 'dewi.sartika@sampulkreativ.id' },
      { id: 'usr-007', name: 'Bagas Wicaksono', role: 'user', jobdesk: 'Design System & Brand Identity', email: 'bagas.wicaksono@sampulkreativ.id' },
      { id: 'usr-008', name: 'Fitri Handayani', role: 'user', jobdesk: 'Frontend Web Developer', email: 'fitri.handayani@sampulkreativ.id' },
      { id: 'usr-009', name: 'Ahmad Fauzi', role: 'user', jobdesk: 'Motion Graphic & Video Editor', email: 'ahmad.fauzi@sampulkreativ.id' }
    ];

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left: Live Camera Viewfinder & Image Dropper (7 Cols) -->
        <div class="lg:col-span-7 flex flex-col gap-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-600">photo_camera</span>
                <h2 class="font-bold text-slate-900 dark:text-white text-base">Kamera Pemindai Langsung</h2>
              </div>
              
              <!-- Camera Switcher / Status -->
              <div class="flex items-center gap-2">
                <button
                  id="btn-toggle-facing"
                  class="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Ganti kamera depan / belakang"
                >
                  <span class="material-symbols-outlined text-[16px]">cameraswitch</span>
                  <span class="hidden sm:inline">Flip Kamera</span>
                </button>
              </div>
            </div>

            <!-- Viewfinder Container -->
            <div class="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner border border-slate-800 group">
              
              <video id="qr-video" class="w-full h-full object-cover" playsinline muted></video>
              <canvas id="qr-canvas" class="hidden"></canvas>

              <!-- Viewfinder Overlay Reticle -->
              <div id="camera-overlay" class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <!-- Laser Scanning line (active when scanning) -->
                <div id="scanner-laser" class="hidden absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-[bounce_2s_infinite]"></div>

                <!-- 4 Corner Focus Brackets -->
                <div class="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center">
                  <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                  <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                  <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                  <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                  
                  <div class="text-center text-white/90 text-xs px-4 py-2 bg-black/60 backdrop-blur-xs rounded-lg flex flex-col items-center gap-1">
                    <span class="font-medium">Tunjukkan kode QR ke kamera</span>
                    <span class="text-[10px] text-emerald-400 font-bold">QR role User = Otomatis Buat Akun</span>
                  </div>
                </div>
              </div>

              <!-- Camera Idle / Placeholder State -->
              <div id="camera-idle-placeholder" class="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-slate-300 gap-3">
                <div class="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg">
                  <span class="material-symbols-outlined text-3xl">videocam</span>
                </div>
                <div>
                  <h3 class="font-bold text-white text-sm sm:text-base">Kamera Sedang Tidak Aktif</h3>
                  <p class="text-xs text-slate-400 max-w-xs mt-1">
                    Nyalakan kamera untuk memindai QR fisik di dokumen, kartu ID anggota tim, atau layar perangkat lain.
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
                  <span class="font-medium text-slate-200">Memindai real-time...</span>
                </div>
                <button
                  id="btn-stop-camera"
                  class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[15px]">stop</span>
                  <span>Hentikan</span>
                </button>
              </div>

            </div>

            <!-- Upload QR Image Dropzone -->
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <label
                for="qr-file-input"
                class="w-full flex-1 py-3 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all group"
              >
                <span class="material-symbols-outlined text-xl text-slate-400 group-hover:text-indigo-500 transition-colors">upload_file</span>
                <span><b>Pilih atau Jatuhkan Gambar QR</b> (PNG, JPG, SVG)</span>
                <input id="qr-file-input" type="file" accept="image/*" class="hidden" />
              </label>
            </div>
          </div>
        </div>

        <!-- Right: Simulator & Manual Input (5 Cols) -->
        <div class="lg:col-span-5 flex flex-col gap-5">
          
          <!-- Quick 1-Click Database Simulator Card -->
          <div class="bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <span class="material-symbols-outlined text-lg text-emerald-600">bolt</span>
              <h3>Simulator Scan Cepat (Database Item)</h3>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Pilih item dari database untuk mensimulasikan hasil pemindaian kamera secara langsung:
            </p>

            <div class="flex flex-col gap-3.5">
              
              <!-- User Role QR Simulation (FEATURE UTAMA) -->
              <div class="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl">
                <label class="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">person_add</span>
                    <span>Scan QR Pengguna (Role: User)</span>
                  </span>
                  <span class="text-[9px] bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded font-bold">Auto Buat Akun</span>
                </label>
                <div class="flex gap-2 mt-1.5">
                  <select id="sim-user-select" class="flex-1 text-xs bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">-- Pilih ID Card User untuk di-Scan --</option>
                    ${roleUserCandidates.map(u => `
                      <option value='${JSON.stringify({ type: "user", role: "user", id: u.id, name: u.name, jobdesk: u.jobdesk, email: u.email })}'>
                        ${u.name} • ${u.jobdesk}
                      </option>
                    `).join('')}
                  </select>
                  <button
                    id="btn-simulate-user"
                    class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title="Simulasikan scan QR role User"
                  >
                    Scan
                  </button>
                </div>
              </div>

              <!-- Project Simulation -->
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Proyek Database</label>
                <div class="flex gap-2">
                  <select id="sim-project-select" class="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- Pilih Proyek untuk di-Scan --</option>
                    ${projects.map(p => `<option value="${p.id}">${p.code || 'PRJ'} — ${p.name}</option>`).join('')}
                  </select>
                  <button
                    id="btn-simulate-project"
                    class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    Scan
                  </button>
                </div>
              </div>

              <!-- Task Simulation -->
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Tugas / Deliverable Database</label>
                <div class="flex gap-2">
                  <select id="sim-task-select" class="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- Pilih Tugas untuk di-Scan --</option>
                    ${tasks.map(t => `<option value="${t.id}">${t.code || '#RK'} — ${t.title}</option>`).join('')}
                  </select>
                  <button
                    id="btn-simulate-task"
                    class="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    Scan
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Manual Code / Barcode Gun Input Card -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center gap-2 mb-2 text-slate-900 dark:text-white font-bold text-sm">
              <span class="material-symbols-outlined text-slate-600">keyboard</span>
              <h3>Input Kode Manual / Barcode Scanner</h3>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Ketikkan ID, kode proyek (<code>PRJ-...</code>), tugas (<code>#RK-...</code>), atau user ID (<code>usr-...</code>).
            </p>

            <form id="form-manual-qr" class="flex gap-2">
              <div class="relative flex-1">
                <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  id="input-manual-code"
                  type="text"
                  placeholder="Ketik kode atau scan barcode..."
                  class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Cari
              </button>
            </form>
          </div>

          <!-- Quick Tips Card -->
          <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
            <span class="material-symbols-outlined text-indigo-600 text-lg shrink-0">info</span>
            <div>
              <span class="font-bold">Otomasi Deteksi QR Role User:</span>
              <p class="mt-0.5 text-indigo-800/90 dark:text-indigo-400 leading-relaxed">
                Saat kamera mendeteksi QR dengan <code>role: user</code>, sistem langsung membuatkan akun baru di database dengan <b>nama</b>, <b>role (User)</b>, dan <b>jobdesk</b> persis seperti data pada QR, lalu menyediakan opsi untuk login sebagai akun tersebut seketika!
              </p>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  /**
   * ==========================================
   * TAB 2: KATALOG & GALERI QR DATABASE
   * ==========================================
   */
  _renderCatalogTab() {
    const allProjects = this.projectService ? this.projectService.getAllProjects() : [];
    const allTasks = this.taskService ? this.taskService.getTasks() : [];
    const allUsers = this.authService ? this.authService.getAllUsers() : [];

    let items = [];
    
    // Proyek
    if (this.catalogFilter === 'all' || this.catalogFilter === 'project') {
      items.push(...allProjects.map(p => ({
        id: p.id,
        code: p.code || 'PRJ',
        title: p.name,
        type: 'project',
        status: p.status,
        progress: p.progress,
        workspace: p.workspace,
        meta: `${p.members ? p.members.length : 0} Anggota • ${p.budget || ''}`,
        payload: p.id
      })));
    }

    // Tugas
    if (this.catalogFilter === 'all' || this.catalogFilter === 'task') {
      items.push(...allTasks.map(t => ({
        id: t.id,
        code: t.code || '#RK',
        title: t.title,
        type: 'task',
        status: t.status,
        priority: t.priority,
        workspace: t.workspace,
        meta: `PIC: ${t.pic ? t.pic.name : 'Unassigned'} • ${t.hours || 0} Jam`,
        payload: t.id
      })));
    }

    // Pengguna / User
    if (this.catalogFilter === 'all' || this.catalogFilter === 'user') {
      items.push(...allUsers.map(u => ({
        id: u.id,
        code: u.id,
        title: u.name,
        type: 'user',
        role: u.role || 'user',
        jobdesk: u.jobdesk || u.title || 'Creative Specialist',
        workspace: 'Semua Ruang',
        meta: `Role: ${u.role || 'user'} • Jobdesk: ${u.jobdesk || u.title || 'Staff'}`,
        payload: JSON.stringify({ type: 'user', role: u.role || 'user', id: u.id, name: u.name, jobdesk: u.jobdesk || u.title || 'Creative Specialist', email: u.email })
      })));
    }

    // Filter by search query
    if (this.catalogSearch) {
      const q = this.catalogSearch.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.code.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }

    return `
      <div class="flex flex-col gap-4">
        
        <!-- Filter and Search Header -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              class="catalog-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 ${this.catalogFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}"
              data-filter="all"
            >
              Semua (${allProjects.length + allTasks.length + allUsers.length})
            </button>
            <button
              class="catalog-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 ${this.catalogFilter === 'project' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}"
              data-filter="project"
            >
              Proyek (${allProjects.length})
            </button>
            <button
              class="catalog-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 ${this.catalogFilter === 'task' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}"
              data-filter="task"
            >
              Tugas (${allTasks.length})
            </button>
            <button
              class="catalog-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 ${this.catalogFilter === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}"
              data-filter="user"
            >
              Pengguna / User (${allUsers.length})
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-72">
            <span class="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
            <input
              id="catalog-search-input"
              type="text"
              value="${this.catalogSearch}"
              placeholder="Cari nama, kode, atau peran..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <!-- Grid of QR Cards -->
        ${items.length === 0 ? `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <span class="material-symbols-outlined text-4xl text-slate-300">qr_code_2</span>
            <h4 class="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Item Ditemukan</h4>
            <p class="text-xs">Cobalah mengubah kata kunci pencarian atau filter.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            ${items.map(item => this._renderCatalogItemCard(item)).join('')}
          </div>
        `}

      </div>
    `;
  }

  _renderCatalogItemCard(item) {
    const isProject = item.type === 'project';
    const isUser = item.type === 'user';
    const qrPayload = item.payload || item.id;
    
    // Generate QR SVG for this item
    const darkColor = isUser ? '#047857' : isProject ? '#312e81' : '#581c87';
    const qrSvg = QRCodeGenerator.generate(qrPayload, { size: 100, darkColor });

    let badgeClass = 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400';
    let badgeText = 'Tugas';
    if (isProject) {
      badgeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400';
      badgeText = 'Proyek';
    } else if (isUser) {
      badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
      badgeText = 'Pengguna (User)';
    }

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <!-- Header Tag -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badgeClass}">
              ${badgeText}
            </span>
            <span class="text-[11px] font-mono font-bold text-slate-500">${item.code}</span>
          </div>

          <!-- QR Code Preview Box -->
          <div class="w-full aspect-square bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 flex items-center justify-center mb-3 border border-slate-100 dark:border-slate-700/60 group-hover:border-indigo-200 transition-colors">
            <div class="w-32 h-32 flex items-center justify-center bg-white p-2 rounded-lg shadow-2xs">
              ${qrSvg}
            </div>
          </div>

          <!-- Title & Meta -->
          <h4 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1 mb-1" title="${item.title}">${item.title}</h4>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">${item.meta}</p>
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
          <button
            class="btn-catalog-scan-sim flex-1 py-1.5 px-2 ${isUser ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
            data-payload='${qrPayload.replace(/'/g, "&apos;")}'
            title="Simulasikan pemindaian QR ini"
          >
            <span class="material-symbols-outlined text-[14px]">center_focus_strong</span>
            <span>Scan Ini</span>
          </button>

          <button
            class="btn-catalog-download-svg p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
            data-payload='${qrPayload.replace(/'/g, "&apos;")}'
            data-filename="QR-${item.code || item.id}"
            title="Download QR SVG"
          >
            <span class="material-symbols-outlined text-[16px]">download</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * ==========================================
   * TAB 3: RIWAYAT SCAN (AUDIT LOG)
   * ==========================================
   */
  _renderHistoryTab() {
    if (this.scanHistory.length === 0) {
      return `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <span class="material-symbols-outlined text-4xl text-slate-300">history</span>
          <h4 class="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Riwayat Scan</h4>
          <p class="text-xs">Gunakan tab Pemindai QR atau Simulator untuk mulai memindai data database.</p>
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
      const manualForm = this.element.querySelector('#form-manual-qr');
      const simProjectBtn = this.element.querySelector('#btn-simulate-project');
      const simTaskBtn = this.element.querySelector('#btn-simulate-task');
      const simUserBtn = this.element.querySelector('#btn-simulate-user');

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

      if (manualForm) {
        manualForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = this.element.querySelector('#input-manual-code');
          if (input && input.value.trim()) {
            this._processQrCode(input.value.trim());
          }
        });
      }

      if (simUserBtn) {
        simUserBtn.addEventListener('click', () => {
          const select = this.element.querySelector('#sim-user-select');
          if (select && select.value) {
            this._processQrCode(select.value);
          } else {
            this.notificationService.info('Silakan pilih salah satu kartu pengguna terlebih dahulu.');
          }
        });
      }

      if (simProjectBtn) {
        simProjectBtn.addEventListener('click', () => {
          const select = this.element.querySelector('#sim-project-select');
          if (select && select.value) {
            this._processQrCode(select.value);
          } else {
            this.notificationService.info('Silakan pilih salah satu proyek terlebih dahulu.');
          }
        });
      }

      if (simTaskBtn) {
        simTaskBtn.addEventListener('click', () => {
          const select = this.element.querySelector('#sim-task-select');
          if (select && select.value) {
            this._processQrCode(select.value);
          } else {
            this.notificationService.info('Silakan pilih salah satu tugas terlebih dahulu.');
          }
        });
      }
    }

    // 4. Catalog tab specific listeners
    if (this.activeTab === 'catalog') {
      const filterBtns = this.element.querySelectorAll('.catalog-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.catalogFilter = btn.getAttribute('data-filter');
          this.mount(this.element);
        });
      });

      const searchInput = this.element.querySelector('#catalog-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.catalogSearch = e.target.value;
          clearTimeout(this._searchTimer);
          this._searchTimer = setTimeout(() => {
            const area = this.element.querySelector('#tab-content-area');
            if (area) area.innerHTML = this._renderCatalogTab();
            this._bindCatalogItemEvents();
          }, 200);
        });
      }

      this._bindCatalogItemEvents();
    }

    // 5. History tab specific listeners
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

  _bindCatalogItemEvents() {
    const simBtns = this.element.querySelectorAll('.btn-catalog-scan-sim');
    simBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const payload = btn.getAttribute('data-payload');
        if (payload) this._processQrCode(payload);
      });
    });

    const downloadBtns = this.element.querySelectorAll('.btn-catalog-download-svg');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const payload = btn.getAttribute('data-payload');
        const filename = btn.getAttribute('data-filename') || 'qrcode';
        if (payload) {
          QRCodeGenerator.downloadSvg(payload, filename);
          this.notificationService.success(`Kode QR ${filename} berhasil diunduh.`);
        }
      });
    });
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
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.role && parsed.role.toLowerCase() === 'user' || parsed.type === 'user') {
          jsonUser = parsed;
        }
      }
    } catch {}

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

    // JIKA QR MEMUAT DATA USER DENGAN ROLE USER (LANGSUNG DARI JSON)
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
    // ATURAN UTAMA: JIKA DETEKSI QR DENGAN ROLE USER -> OTOMATIS BUAT AKUN BARU
    // =========================================================================
    if (entityType === 'user' && matchedData) {
      const userRole = (matchedData.role || 'user').toLowerCase();
      
      if (userRole === 'user') {
        const targetName = matchedData.name || 'Anggota Tim';
        const targetJobdesk = matchedData.jobdesk || matchedData.title || 'Creative Specialist';
        const targetEmail = matchedData.email || `${targetName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`;
        const targetAvatar = matchedData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetName)}`;
        const targetId = matchedData.id && matchedData.id.startsWith('usr-') ? matchedData.id : `usr-${Date.now().toString().slice(-6)}`;

        // Otomatis daftarkan akun baru di AuthService
        const newAccount = this.authService.registerNewUser({
          id: targetId,
          name: targetName,
          role: 'user',
          title: targetJobdesk,
          jobdesk: targetJobdesk,
          email: targetEmail,
          avatar: targetAvatar
        });

        // Sinkronisasi pembuatan akun ke database PostgreSQL via ApiService
        apiService.registerUser(newAccount).catch(() => {});

        matchedData = newAccount;
        wasAutoCreated = true;

        this.notificationService.success(`🎉 Akun "${targetName}" (${targetJobdesk}) berhasil dibuat otomatis dari data QR!`);
      }
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
      // PENGGUNA (ROLE: USER) - OTOMATIS MEMBUAT AKUN BARU
      const qrPayload = JSON.stringify({ type: 'user', role: 'user', id: data.id, name: data.name, jobdesk: data.jobdesk || data.title, email: data.email });
      const qrSvg = QRCodeGenerator.generate(qrPayload, { size: 90, darkColor: '#065f46' });

      contentHtml = `
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-800/80 shadow-2xl p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
          
          <!-- Background Glow -->
          <div class="absolute -top-10 -right-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Top Header Tag -->
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1.5 shadow-2xs">
                <span class="material-symbols-outlined text-[15px] text-emerald-600">verified_user</span>
                <span>${isAutoCreated ? 'AKUN BARU BERHASIL DIBUAT OTOMATIS' : 'PROFIL PENGGUNA TERVERIFIKASI'}</span>
              </span>
            </div>
            <button id="btn-close-result-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Celebration Info Banner (jika dibuat otomatis) -->
          <div class="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
            <span class="material-symbols-outlined text-emerald-600 text-xl shrink-0">check_circle</span>
            <div>
              <div class="font-bold">Akun Terdaftar di Sistem & Database!</div>
              <p class="text-[11px] text-emerald-800/90 dark:text-emerald-400 mt-0.5">
                Sistem telah meregistrasi akun pengguna dengan <b>Nama</b>, <b>Role (User)</b>, dan <b>Jobdesk</b> yang identik dengan database QR yang ditunjukkan ke kamera.
              </p>
            </div>
          </div>

          <!-- User Card -->
          <div class="flex items-start gap-4 mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <img
              src="${data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`}"
              alt="${data.name}"
              class="w-16 h-16 rounded-2xl object-cover bg-white ring-2 ring-emerald-500/30 shadow-sm shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">${data.name}</h3>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/80">
                  Role: USER
                </span>
              </div>
              <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">${data.jobdesk || data.title || 'Creative Specialist'}</p>
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
              class="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              data-user-id="${data.id}"
            >
              <span class="material-symbols-outlined text-[18px]">login</span>
              <span>Masuk Sebagai ${data.name.split(' ')[0]} Sekarang</span>
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

import { BaseModal } from '../../core/BaseModal.js';

/**
 * TaskDetailModal - Super Card #RK-304
 * Multi-tab comprehensive task modal:
 * Tab 1: Checklist QA & Teknis
 * Tab 2: Pratinjau Visual & Rasio
 * Tab 3: Log Aktivitas & Catatan Tim
 * Tab 4: Dokumen Legalitas
 */
export class TaskDetailModal extends BaseModal {
  constructor(container) {
    super(container, 'task-detail');
    this.taskService = container.resolve('TaskService');
    this.documentService = container.resolve('DocumentService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.activeTab = 'checklist'; // 'checklist' | 'visual' | 'logs' | 'legal'
    this.currentTask = null;
    this.comments = [
      {
        author: 'Sari Rahmawati',
        role: 'Creative Lead',
        time: '10:45 WIB',
        text: 'Kecerahan nits stabil di 7,500 nits, tidak ada ghosting saat perpindahan frame 60fps. Menunggu final pass redundansi CDN.'
      },
      {
        author: 'Budi Pratama',
        role: 'QA OOH Field Tech',
        time: '10:15 WIB',
        text: 'Uji visibilitas jarak 75m dari Flyover Antasari lolos. Tipografi tajam dan terbaca jelas pada kecepatan berkendara 50 km/jam.'
      },
      {
        author: 'Bpk. Hendro',
        role: 'Dinas Perhubungan DKI',
        time: '09:30 WIB',
        text: 'Inspeksi penataan titik reklame outdoor rampung. Rekomendasi teknis SK-8812 sah dan telah diunggah ke portal.'
      }
    ];
  }

  render(data) {
    const task = (data && data.task) ? data.task : (this.taskService.getTask('#RK-304') || this.taskService.getTasks()[0]);
    this.currentTask = task;
    if (data && data.tab) {
      this.activeTab = data.tab;
    }

    return `
      <div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col max-h-[92vh] modal-content-box">
        
        <!-- Modal Header -->
        <div class="p-spacing-lg bg-surface-container-low border-b border-surface-border flex flex-col gap-spacing-sm">
          <div class="flex flex-wrap items-center justify-between gap-spacing-sm">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-badge-micro text-[11px] font-bold tracking-wide">
                ${task.code}
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-status-planning/20 text-status-planning font-badge-micro text-[11px] font-bold capitalize">
                ${task.workspace}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error text-on-error font-badge-micro text-[10px] font-bold tracking-wide uppercase">
                <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                ● LIVE CRITICAL AUDIT
              </span>
              <span class="px-2 py-0.5 rounded bg-error-container text-on-error-container font-badge-micro text-[10px] font-bold">
                ${task.priority}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                id="btn-modal-reschedule" 
                class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary font-body-medium text-[12px] transition-colors"
                type="button"
              >
                <span class="material-symbols-outlined text-[16px]">schedule</span>
                <span>Jadwalkan Ulang</span>
              </button>
              <button 
                id="btn-close-modal" 
                aria-label="Tutup Modal" 
                class="w-8 h-8 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container text-text-muted flex items-center justify-center transition-colors"
                type="button"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <div>
            <h2 class="font-headline-lg text-[18px] text-text-primary font-bold tracking-tight">
              ${task.title}
            </h2>
            <p class="font-body-default text-[13px] text-text-secondary mt-1">
              ${task.description || 'Audit lapangan langsung uji keterbacaan, kecerahan siang hari, sinkronisasi controller Novastar, dan failover stream transmisi 4K.'}
            </p>
          </div>
        </div>

        <!-- Meta Information Strip -->
        <div class="p-spacing-md bg-surface-container-lowest border-b border-surface-border grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
          <div class="flex flex-col gap-1 p-2.5 rounded-xl bg-surface-container-low">
            <div class="flex items-center gap-1.5 text-text-muted font-caption-meta text-[11px]">
              <span class="material-symbols-outlined text-[15px] text-brand-accent">calendar_clock</span>
              <span>Waktu & Sisa Sesi</span>
            </div>
            <span class="font-body-medium text-[13px] text-text-primary font-semibold">${task.timeline}</span>
            <span class="font-caption-meta text-[11px] text-primary font-bold">10:00 - 12:00 WIB <span class="text-status-urgent">(Sisa 35 Menit)</span></span>
          </div>

          <div class="flex flex-col gap-1 p-2.5 rounded-xl bg-surface-container-low">
            <div class="flex items-center gap-1.5 text-text-muted font-caption-meta text-[11px]">
              <span class="material-symbols-outlined text-[15px] text-status-planning">pin_drop</span>
              <span>Lokasi Audit OOH</span>
            </div>
            <span class="font-body-medium text-[13px] text-text-primary font-semibold">${task.location || 'Titik Bundaran HI (Mega LED)'}</span>
            <span class="font-caption-meta text-[11px] text-text-secondary">Posko Satelit Antasari #Slot-02</span>
          </div>

          <div class="flex flex-col gap-1 p-2.5 rounded-xl bg-surface-container-low">
            <div class="flex items-center gap-1.5 text-text-muted font-caption-meta text-[11px]">
              <span class="material-symbols-outlined text-[15px] text-status-success">verified_user</span>
              <span>Izin & Sinkronisasi</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded bg-status-success/15 text-status-success font-badge-micro text-[10px] font-semibold">Izin Dishub & Satpol PP #SK-8812</span>
            </div>
            <span class="font-caption-meta text-[11px] text-text-secondary">G-Cal Synced • Bot #kampanye-q3 Aktif</span>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="px-spacing-lg pt-spacing-sm bg-surface-container-low border-b border-surface-border flex items-center gap-1 overflow-x-auto">
          <button 
            class="modal-tab-btn px-3 py-2 border-b-2 font-body-medium text-[13px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${this.activeTab === 'checklist' ? 'border-primary text-primary font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}" 
            data-tab="checklist" 
            type="button"
          >
            <span class="material-symbols-outlined text-[16px]">checklist</span>
            <span>Checklist QA & Teknis (3/4 Selesai)</span>
          </button>

          <button 
            class="modal-tab-btn px-3 py-2 border-b-2 font-body-medium text-[13px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${this.activeTab === 'visual' ? 'border-primary text-primary font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}" 
            data-tab="visual" 
            type="button"
          >
            <span class="material-symbols-outlined text-[16px]">aspect_ratio</span>
            <span>Pratinjau Visual & Rasio</span>
          </button>

          <button 
            class="modal-tab-btn px-3 py-2 border-b-2 font-body-medium text-[13px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${this.activeTab === 'logs' ? 'border-primary text-primary font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}" 
            data-tab="logs" 
            type="button"
          >
            <span class="material-symbols-outlined text-[16px]">quick_reference_all</span>
            <span>Log Aktivitas & Catatan Tim</span>
            <span class="px-1.5 py-0.2 rounded-full bg-surface-container text-text-muted font-badge-micro text-[10px] font-bold">${this.comments.length}</span>
          </button>

          <button 
            class="modal-tab-btn px-3 py-2 border-b-2 font-body-medium text-[13px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${this.activeTab === 'legal' ? 'border-primary text-primary font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}" 
            data-tab="legal" 
            type="button"
          >
            <span class="material-symbols-outlined text-[16px]">verified</span>
            <span>Dokumen Legalitas</span>
            <span class="px-1.5 py-0.2 rounded-full bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold">4 Berkas Valid</span>
          </button>
        </div>

        <!-- Tab Content Body -->
        <div class="p-spacing-lg flex-1 overflow-y-auto flex flex-col gap-spacing-md bg-surface-container-lowest">
          ${this.renderActiveTabContent()}
        </div>

        <!-- Modal Footer -->
        <div class="p-spacing-md bg-surface-container-low border-t border-surface-border flex flex-wrap items-center justify-between gap-spacing-sm">
          <div class="flex items-center gap-spacing-xs flex-wrap">
            <button id="btn-mark-all-done" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-status-success text-white font-body-medium text-[13px] hover:opacity-90 transition-opacity shadow-sm" type="button">
              <span class="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Tandai Semua Selesai</span>
            </button>
            <button id="btn-escalate-blocker" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error-container text-on-error-container font-body-medium text-[13px] hover:bg-error hover:text-white transition-colors" type="button">
              <span class="material-symbols-outlined text-[16px]">report_problem</span>
              <span>Eskalasi Blocker</span>
            </button>
          </div>
          <button id="btn-footer-close" class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-text-primary font-body-medium text-[13px] transition-colors" type="button">
            Tutup
          </button>
        </div>

      </div>
    `;
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'visual':
        return this.renderVisualTab();
      case 'logs':
        return this.renderLogsTab();
      case 'legal':
        return this.renderLegalTab();
      default:
        return this.renderChecklistTab();
    }
  }

  renderChecklistTab() {
    return `
      <div class="flex flex-col gap-2.5">
        <span class="font-caption-meta text-[11px] text-text-muted uppercase tracking-wider font-semibold">
          Daftar Pengujian Lapangan Safe-Zone & Hardware
        </span>

        <!-- Checklist Item 1 -->
        <div class="p-3 rounded-xl bg-status-success/15 border border-status-success/20 flex items-start gap-3">
          <div class="w-6 h-6 rounded-md bg-status-success text-white flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </div>
          <div class="flex flex-col flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="font-body-medium text-[13px] text-text-primary font-semibold">
                Uji keterbacaan tipografi kampanye pada kecepatan 40-60 km/jam di jalur kendaraan
              </span>
              <span class="px-2 py-0.5 rounded bg-status-success text-white font-badge-micro text-[10px] font-bold">Lolos / Pass</span>
            </div>
            <p class="font-caption-meta text-[11px] text-text-secondary mt-0.5">
              Jarak pandang optimum 75m terkonfirmasi jelas dari flyover dan bundaran tanpa distorsi sudut pandang.
            </p>
          </div>
        </div>

        <!-- Checklist Item 2 -->
        <div class="p-3 rounded-xl bg-status-success/15 border border-status-success/20 flex items-start gap-3">
          <div class="w-6 h-6 rounded-md bg-status-success text-white flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </div>
          <div class="flex flex-col flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="font-body-medium text-[13px] text-text-primary font-semibold">
                Kalibrasi pixel pitch & rasio 3840 x 2160 (16:9 4K) pada controller Novastar MCTRL4K
              </span>
              <span class="px-2 py-0.5 rounded bg-status-success text-white font-badge-micro text-[10px] font-bold">Selesai</span>
            </div>
            <p class="font-caption-meta text-[11px] text-text-secondary mt-0.5">
              Mapping canvas 1:1 tanpa peregangan (aspect-ratio preservation locked).
            </p>
          </div>
        </div>

        <!-- Checklist Item 3 -->
        <div class="p-3 rounded-xl bg-status-success/15 border border-status-success/20 flex items-start gap-3">
          <div class="w-6 h-6 rounded-md bg-status-success text-white flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </div>
          <div class="flex flex-col flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="font-body-medium text-[13px] text-text-primary font-semibold">
                Uji nits kecerahan di bawah terik siang hari (Outdoor Ambient Light Sensor)
              </span>
              <span class="px-2 py-0.5 rounded bg-status-success text-white font-badge-micro text-[10px] font-bold">Safe Area Pass 98%</span>
            </div>
            <p class="font-caption-meta text-[11px] text-text-secondary mt-0.5">
              Output kecerahan 7,500 nits, kontras rasio terkalibrasi tajam terhadap terik matahari Jakarta.
            </p>
          </div>
        </div>

        <!-- Checklist Item 4 -->
        <div class="p-3 rounded-xl bg-surface-container-low border border-surface-border flex items-start gap-3">
          <div class="w-6 h-6 rounded-md border-2 border-primary-container flex items-center justify-center shrink-0 mt-0.5">
            <span class="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          </div>
          <div class="flex flex-col flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="font-body-medium text-[13px] text-text-primary font-semibold">
                Sinyal live-stream failover redundansi CDN Antasari
              </span>
              <span class="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-badge-micro text-[10px] font-bold">Sedang Diuji - 85%</span>
            </div>
            <p class="font-caption-meta text-[11px] text-text-secondary mt-0.5">
              Menunggu verifikasi ping redundansi uplink 4G/5G backup switchover.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  renderVisualTab() {
    return `
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-headline-md text-[15px] font-bold text-text-primary">Simulasi Billboard Outdoor Bundaran HI</h3>
            <p class="font-caption-meta text-[11px] text-text-secondary">Rasio 16:9 UHD 4K (3840 x 2160 px) dengan Safe-Zone Overlay</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold">Safe Area 98% Pass</span>
            <span class="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-text-secondary">7,500 Nits Outdoor</span>
          </div>
        </div>

        <!-- Billboard Image with Safe Area Grid Overlay -->
        <div class="relative w-full aspect-[16/9] max-h-80 rounded-xl overflow-hidden bg-on-background shadow-inner">
          <img 
            alt="Simulasi Billboard Bundaran HI" 
            class="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9cLSlK-ybgxsHTOmKx9P6qW4dU9Pj4US3TTVY-VqPfbA7B32xwJgc2f_eCQrU0jV4dtkLkkz3hMB_09FxmgjDiFXemye5oEMHbyn4syMOUpAnJ7fDfmNk9w5xsKO3HVP45BkfwleAUBg6aeAARbH2OuCAERhrTCQqpHG_zPB0vMpDMlZIKgRjI1BV5ghBTxxukptOIGvw6kCwVGCovOpK3q7RrMRmQ3mCTHG7YUqMXrHu2MeZ8T1C"
          />
          
          <!-- Safe Zone Grid Lines -->
          <div class="absolute inset-4 border-2 border-dashed border-status-success/80 pointer-events-none flex items-center justify-center">
            <span class="bg-black/70 text-white font-badge-micro text-[10px] px-2.5 py-1 rounded backdrop-blur-sm">
              Safe-Zone Safe Margin (10% Safe Padding)
            </span>
          </div>

          <div class="absolute bottom-3 left-3 bg-on-background/80 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-2 text-[11px]">
            <span class="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
            <span>Feed Novastar MCTRL4K Active</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3 rounded-xl bg-surface-container-low border border-surface-border">
            <span class="font-caption-meta text-[10px] text-text-muted uppercase font-semibold">Resolusi Asli</span>
            <p class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">3840 x 2160 (16:9)</p>
          </div>
          <div class="p-3 rounded-xl bg-surface-container-low border border-surface-border">
            <span class="font-caption-meta text-[10px] text-text-muted uppercase font-semibold">Kecerahan Terukur</span>
            <p class="font-body-medium text-[13px] font-bold text-status-success mt-0.5">7,500 Nits (Lolos)</p>
          </div>
          <div class="p-3 rounded-xl bg-surface-container-low border border-surface-border">
            <span class="font-caption-meta text-[10px] text-text-muted uppercase font-semibold">Distorsi Sudut</span>
            <p class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">&lt; 1.2% (Standar Industri)</p>
          </div>
        </div>
      </div>
    `;
  }

  renderLogsTab() {
    return `
      <div class="flex flex-col gap-4">
        <!-- Add comment input form -->
        <div class="p-3 bg-surface-container-low rounded-xl border border-surface-border flex flex-col gap-2">
          <label class="font-caption-meta text-[11px] text-text-muted font-bold uppercase" for="input-task-comment">
            Tambah Catatan Tim Lapangan
          </label>
          <div class="flex gap-2">
            <input 
              id="input-task-comment" 
              class="flex-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-text-primary text-[13px] border border-surface-border focus:outline-none focus:border-primary" 
              placeholder="Tulis update hasil uji teknis..." 
              type="text"
            />
            <button 
              id="btn-add-comment" 
              class="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-body-medium text-[12px] font-semibold hover:bg-brand-accent transition-colors shrink-0" 
              type="button"
            >
              Kirim
            </button>
          </div>
        </div>

        <!-- Comment Logs Stream -->
        <div class="flex flex-col gap-3">
          ${this.comments.map(c => `
            <div class="p-3 rounded-xl bg-surface-container-low border border-surface-border flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                    ${c.author.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <span class="font-body-medium text-[13px] font-bold text-text-primary">${c.author}</span>
                  <span class="px-1.5 py-0.2 rounded bg-surface-container text-text-muted text-[10px]">${c.role}</span>
                </div>
                <span class="font-caption-meta text-[11px] text-text-muted">${c.time}</span>
              </div>
              <p class="font-body-default text-[13px] text-text-secondary mt-1 pl-8">
                "${c.text}"
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderLegalTab() {
    const docs = this.documentService.getDocuments();

    return `
      <div class="flex flex-col gap-4">
        <!-- Compliance Banner -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-status-success/15 via-surface-container-low to-surface-container-lowest border border-status-success/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-status-success text-white flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="font-headline-md text-[14px] font-bold text-text-primary">Kepatuhan Hukum & Izin OOH 100% Terpenuhi</span>
                <span class="px-2 py-0.5 rounded-full bg-status-success text-white font-badge-micro text-[10px] font-bold">RESMI & SAH</span>
              </div>
              <p class="font-body-default text-[12px] text-text-secondary mt-0.5">
                Titik LED Bundaran HI & Flyover Antasari telah memenuhi regulasi Perda Penyelenggaraan Reklame DKI Jakarta & laik tayang komersial.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 font-mono text-[11px] text-text-muted shrink-0">
            <span>Ref: SK-8812</span>
          </div>
        </div>

        <!-- Grid of 4 Legal Docs -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${docs.map(doc => `
            <div class="p-3.5 rounded-xl bg-surface-container-low border border-surface-border hover:border-primary/40 transition-all flex flex-col justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[20px]">${doc.icon}</span>
                </div>
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.2 rounded bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold">${doc.status}</span>
                    <span class="text-text-muted font-mono text-[10px]">${doc.fileSize}</span>
                  </div>
                  <h4 class="font-body-medium text-[13px] font-bold text-text-primary mt-1 leading-snug">${doc.title}</h4>
                  <span class="font-caption-meta text-[11px] text-text-secondary mt-0.5">${doc.issuer}</span>
                </div>
              </div>

              <div class="p-2 rounded-lg bg-surface-container-lowest border border-surface-border flex flex-col gap-0.5 text-[11px] text-text-secondary font-mono">
                <div class="flex justify-between"><span>Nomor SK:</span><span class="font-bold text-text-primary">${doc.skNumber}</span></div>
                <div class="flex justify-between"><span>Berlaku s/d:</span><span>${doc.expiry}</span></div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-surface-border">
                <span class="font-caption-meta text-[10px] text-status-success font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">verified</span> Terverifikasi
                </span>
                <div class="flex items-center gap-1.5">
                  <button 
                    class="btn-open-pdf-viewer px-2.5 py-1 rounded-lg bg-primary text-on-primary font-caption-meta text-[11px] font-medium flex items-center gap-1 shadow-xs hover:bg-brand-accent transition-colors" 
                    data-doc-id="${doc.id}" 
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[14px]">visibility</span>
                    <span>Pratinjau PDF</span>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents(modalRoot) {
    // Close button handlers
    const closeBtn = modalRoot.querySelector('#btn-close-modal');
    const footerCloseBtn = modalRoot.querySelector('#btn-footer-close');
    const closeAction = () => this.modalManager.close(this.modalId);
    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeAction);

    // Reschedule button
    const rescheduleBtn = modalRoot.querySelector('#btn-modal-reschedule');
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener('click', () => {
        this.modalManager.open('reschedule', { task: this.currentTask });
      });
    }

    // Tabs switching
    const tabBtns = modalRoot.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.modalManager.open(this.modalId, { task: this.currentTask, tab: this.activeTab });
      });
    });

    // Add comment button
    const commentInput = modalRoot.querySelector('#input-task-comment');
    const commentBtn = modalRoot.querySelector('#btn-add-comment');
    if (commentBtn && commentInput) {
      const submitComment = () => {
        const text = commentInput.value.trim();
        if (text) {
          const authUser = this.container.resolve('AuthService').getCurrentUser();
          this.comments.unshift({
            author: authUser ? authUser.name : 'Sari Rahmawati',
            role: authUser ? authUser.title : 'Tim Lapangan',
            time: 'Baru saja',
            text
          });
          this.modalManager.open(this.modalId, { task: this.currentTask, tab: 'logs' });
          this.notificationService.success('Catatan berhasil ditambahkan ke log.');
        }
      };

      commentBtn.addEventListener('click', submitComment);
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitComment();
      });
    }

    // Open PDF preview buttons
    const pdfButtons = modalRoot.querySelectorAll('.btn-open-pdf-viewer');
    pdfButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.getAttribute('data-doc-id');
        this.modalManager.open('pdf-viewer', { docId, page: 1 });
      });
    });

    // Mark all done button
    const markDoneBtn = modalRoot.querySelector('#btn-mark-all-done');
    if (markDoneBtn) {
      markDoneBtn.addEventListener('click', () => {
        if (this.currentTask) {
          this.taskService.updateTaskStatus(this.currentTask.id, 'done');
          this.notificationService.success(`Semua checklist ${this.currentTask.code} disetujui & ditandai selesai!`);
          this.modalManager.close(this.modalId);
        }
      });
    }

    // Escalate blocker
    const escalateBtn = modalRoot.querySelector('#btn-escalate-blocker');
    if (escalateBtn) {
      escalateBtn.addEventListener('click', () => {
        this.notificationService.warning(`Tiket eskalasi blocker telah dikirim ke tim infrastruktur Sampulkreativ.`);
      });
    }
  }
}

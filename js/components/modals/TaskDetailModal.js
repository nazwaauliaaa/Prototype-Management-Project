import { BaseModal } from '../../core/BaseModal.js';

/**
 * TaskDetailModal - Super Card #RK-304
 * Multi-tab comprehensive task modal:
 * Tab 1: Pratinjau Visual & Rasio
 * Tab 2: Log Aktivitas & Catatan Tim
 * Tab 3: Dokumen Legalitas
 */
export class TaskDetailModal extends BaseModal {
  constructor(container) {
    super(container, 'task-detail');
    this.taskService = container.resolve('TaskService');
    this.documentService = container.resolve('DocumentService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.activeTab = 'visual'; // 'visual' | 'logs' | 'legal'
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

    const authUser = this.container.resolve('AuthService').getCurrentUser();
    const role = (authUser?.role || 'manajement-project').toLowerCase();
    const isAdmin = authUser ? authUser.isAdmin() : false;
    const isPM = authUser ? authUser.isProjectManager() : true;
    const isQA = authUser ? authUser.isQA() : false;
    const isUser = authUser ? authUser.isUser() : false;

    // Format status label and color badge
    const statusMap = {
      'backlog': { label: 'Daftar Pekerjaan', badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/70 dark:border-slate-700', dotClass: 'bg-slate-500' },
      'in-progress': { label: 'Sedang Berjalan', badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300/70 dark:border-blue-700', dotClass: 'bg-blue-500' },
      'review-qa': { label: 'Review QA Lapangan', badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/70 dark:border-amber-700', dotClass: 'bg-amber-500' },
      'ready-launch': { label: 'Siap Launching', badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300/70 dark:border-purple-700', dotClass: 'bg-purple-500' },
      'done': { label: 'Selesai', badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/70 dark:border-emerald-700', dotClass: 'bg-emerald-500' }
    };
    const currentStatusInfo = statusMap[task.status] || { 
      label: task.status || 'Aktif', 
      badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/70 dark:border-slate-700', 
      dotClass: 'bg-blue-500' 
    };

    // Format priority label and color badge
    const priorityMap = {
      'Critical': { label: 'Kritis', badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300/70 dark:border-rose-700' },
      'High': { label: 'Tinggi', badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300/70 dark:border-orange-700' },
      'Medium': { label: 'Sedang', badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/70 dark:border-amber-700' },
      'Low': { label: 'Rendah', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300/70 dark:border-slate-700' }
    };
    const currentPriorityInfo = priorityMap[task.priority] || { 
      label: task.priority || 'Normal', 
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300/70 dark:border-slate-700' 
    };

    return `
      <div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col max-h-[92vh] modal-content-box">
        
        <!-- Modal Header -->
        <div class="px-6 py-5 bg-surface-container-low/90 dark:bg-slate-900/90 border-b border-surface-border">
          <div class="flex items-start justify-between gap-4 sm:gap-6">
            <!-- Left: Task Code, Badges, Title & Description -->
            <div class="flex-1 min-w-0">
              <!-- Meta Badges -->
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Task ID -->
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono text-[11px] font-bold tracking-wider">
                  <span class="material-symbols-outlined text-[13px] opacity-70">tag</span>
                  ${task.code || '#RK-304'}
                </span>

                <!-- Status Badge -->
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${currentStatusInfo.badgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${currentStatusInfo.dotClass}"></span>
                  <span>${currentStatusInfo.label}</span>
                </span>

                <!-- Priority Badge -->
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${currentPriorityInfo.badgeClass}">
                  <span class="material-symbols-outlined text-[13px] opacity-75">flag</span>
                  <span>Prioritas: <strong>${currentPriorityInfo.label}</strong></span>
                </span>
              </div>

              <!-- Title -->
              <h2 class="text-[19px] sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-words mt-2.5 mb-1.5">
                ${task.title}
              </h2>

              <!-- Description -->
              <p class="text-[13px] sm:text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                ${task.description ? task.description : '<span class="italic text-slate-400">Tidak ada deskripsi tambahan untuk tugas ini.</span>'}
              </p>
            </div>

            <!-- Right: Action Buttons & Close Button -->
            <div class="flex items-center gap-2 shrink-0 pt-0.5">
              ${!isUser ? `
              <button 
                id="btn-modal-reschedule" 
                class="h-8.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-border text-text-secondary hover:text-text-primary text-[12px] font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm active:scale-95"
                type="button"
                title="Jadwalkan Ulang Tugas"
              >
                <span class="material-symbols-outlined text-[16px] text-text-muted">schedule</span>
                <span class="hidden sm:inline">Jadwalkan Ulang</span>
              </button>

              <button 
                id="btn-modal-delete-task" 
                class="h-8.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[12px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm active:scale-95"
                type="button"
                title="Hapus tugas ini"
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
                <span>Hapus</span>
              </button>

              <div class="w-px h-5 bg-surface-border mx-1 hidden sm:block"></div>
              ` : ''}

              <button 
                id="btn-close-modal" 
                aria-label="Tutup Modal" 
                class="w-8.5 h-8.5 rounded-xl bg-surface-container/60 hover:bg-surface-container-high hover:text-rose-500 text-text-muted flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-surface-border/50"
                type="button"
                title="Tutup Modal"
              >
                <span class="material-symbols-outlined text-[19px]">close</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Meta & QA Status Bar -->
        <div class="p-spacing-md bg-surface-container-lowest border-b border-surface-border flex flex-col gap-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
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
                <span>Assignee & Penanggung Jawab</span>
              </div>
              <span class="font-body-medium text-[13px] text-text-primary font-semibold">${task.assignee || 'Dimas Anggara (User)'}</span>
              <span class="font-caption-meta text-[11px] text-text-secondary">Status Task: <strong class="capitalize text-primary">${task.status}</strong></span>
            </div>
          </div>

          <!-- Status Testing QA Control Panel -->
          <div class="p-3 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border border-slate-700/80 shadow-inner">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-emerald-400">fact_check</span>
              <div class="flex flex-col">
                <span class="text-[12px] font-bold text-slate-100">Status Pengujian QA</span>
                <span class="text-[10.5px] text-slate-400">
                  ${isQA || isPM || isAdmin ? 'Pilih status testing di bawah untuk memperbarui status pekerjaan:' : 'Status pengujian saat ini oleh tim QA:'}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <button 
                type="button"
                data-qa-status="untested"
                class="btn-set-qa-status px-2.5 py-1 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1 ${qaStatus === 'untested' ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} ${!isQA && !isPM && !isAdmin ? 'opacity-80 cursor-default' : 'cursor-pointer'}"
              >
                <span>🔵 Belum diuji</span>
              </button>

              <button 
                type="button"
                data-qa-status="testing"
                class="btn-set-qa-status px-2.5 py-1 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1 ${qaStatus === 'testing' ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} ${!isQA && !isPM && !isAdmin ? 'opacity-80 cursor-default' : 'cursor-pointer'}"
              >
                <span>🟡 Testing</span>
              </button>

              <button 
                type="button"
                data-qa-status="passed"
                class="btn-set-qa-status px-2.5 py-1 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1 ${qaStatus === 'passed' ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} ${!isQA && !isPM && !isAdmin ? 'opacity-80 cursor-default' : 'cursor-pointer'}"
              >
                <span>🟢 Passed</span>
              </button>

              <button 
                type="button"
                data-qa-status="failed"
                class="btn-set-qa-status px-2.5 py-1 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1 ${qaStatus === 'failed' ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} ${!isQA && !isPM && !isAdmin ? 'opacity-80 cursor-default' : 'cursor-pointer'}"
              >
                <span>🔴 Failed (Ada Bug)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tab Content Body -->
        <div class="p-spacing-lg flex-1 overflow-y-auto flex flex-col gap-6 bg-surface-container-lowest">
          ${this.renderActiveTabContent()}
        </div>

        <!-- Modal Footer Actions according to role -->
        <div class="p-spacing-md bg-surface-container-low border-t border-surface-border flex flex-wrap items-center justify-between gap-spacing-sm">
          <div class="flex items-center gap-spacing-xs flex-wrap">
            ${isUser ? `
            <button id="btn-user-submit-review" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 text-white font-body-medium text-[13px] hover:bg-sky-700 transition-colors shadow-xs" type="button">
              <span class="material-symbols-outlined text-[16px]">send</span>
              <span>Submit ke QA (Review)</span>
            </button>
            <button id="btn-user-upload-work" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-100 font-body-medium text-[13px] hover:bg-slate-700 transition-colors" type="button">
              <span class="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Unggah Deliverable</span>
            </button>
            <button id="btn-escalate-blocker" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/60 font-body-medium text-[13px] hover:bg-amber-500/25 transition-colors" type="button">
              <span class="material-symbols-outlined text-[16px]">report_problem</span>
              <span>Lapor Kendala</span>
            </button>
            ` : `
            <button id="btn-mark-all-done" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-status-success text-white font-body-medium text-[13px] hover:opacity-90 transition-opacity shadow-sm" type="button">
              <span class="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Setujui & Selesaikan</span>
            </button>
            <button id="btn-escalate-blocker" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error-container text-on-error-container font-body-medium text-[13px] hover:bg-error hover:text-white transition-colors" type="button">
              <span class="material-symbols-outlined text-[16px]">report_problem</span>
              <span>Eskalasi Blocker</span>
            </button>
            `}
          </div>
          <button id="btn-footer-close" class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-text-primary font-body-medium text-[13px] transition-colors" type="button">
            Tutup
          </button>
        </div>

      </div>
    `;
  }

  renderActiveTabContent() {
    const taskAttachments = this.currentTask?.attachments || this.currentTask?.assets || [];
    return `
      ${taskAttachments.length > 0 ? `
      <section id="section-task-attachments" class="flex flex-col gap-3 pb-4 border-b border-surface-border">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px] text-primary">attach_file</span>
          <h3 class="font-headline-md text-[14px] font-bold text-text-primary">Lampiran & File Tugas (${taskAttachments.length})</h3>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          ${taskAttachments.map(att => {
            const ext = (att.name || '').split('.').pop().toLowerCase();
            let icon = 'attach_file';
            if (att.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) icon = 'image';
            else if (att.type?.includes('pdf') || ext === 'pdf') icon = 'picture_as_pdf';
            else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) icon = 'folder_zip';
            else if (['xls', 'xlsx', 'csv'].includes(ext)) icon = 'table_chart';
            else if (['doc', 'docx', 'txt', 'md'].includes(ext)) icon = 'description';

            return `
              <div class="p-2.5 rounded-xl bg-surface-container-low border border-surface-border flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[18px]">${icon}</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-semibold text-text-primary truncate" title="${att.name || 'Dokumen'}">${att.name || 'Dokumen'}</span>
                    <span class="text-[10px] text-text-muted">${att.formattedSize || att.size || 'File Lampiran'}</span>
                  </div>
                </div>
                ${att.url ? `
                <a href="${att.url}" download="${att.name || 'lampiran'}" class="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-primary transition-colors shrink-0" title="Unduh File">
                  <span class="material-symbols-outlined text-[16px]">download</span>
                </a>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
      ` : ''}

      <section id="section-visual" class="flex flex-col gap-4">
        ${this.renderVisualTab()}
      </section>

      <section id="section-legal" class="flex flex-col gap-4 pt-4 border-t border-surface-border">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px] text-primary">verified</span>
          <h3 class="font-headline-md text-[14px] font-bold text-text-primary">Dokumen & Kepatuhan Legalitas</h3>
        </div>
        ${this.renderLegalTab()}
      </section>

      <section id="section-logs" class="flex flex-col gap-4 pt-4 border-t border-surface-border">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px] text-primary">quick_reference_all</span>
          <h3 class="font-headline-md text-[14px] font-bold text-text-primary">Log Aktivitas & Catatan Tim</h3>
          <span class="px-1.5 py-0.2 rounded-full bg-surface-container text-text-muted font-badge-micro text-[10px] font-bold">${this.comments.length}</span>
        </div>
        ${this.renderLogsTab()}
      </section>
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

    // Delete task button handler (with Undo, no confirm prompt)
    const deleteBtn = modalRoot.querySelector('#btn-modal-delete-task');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!this.currentTask) return;
        const task = this.currentTask;
        const taskTitle = task.title;
        const result = this.taskService.deleteTask(task.id, true);
        this.modalManager.close(this.modalId);

        if (this.notificationService && result) {
          const truncatedTitle = taskTitle.length > 32 ? taskTitle.substring(0, 32) + '...' : taskTitle;
          this.notificationService.showWithAction(
            `Tugas "${truncatedTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTask(result.task, result.index);
              }
            },
            'warning',
            6500
          );
        }
      });
    }

    // Back to workspace from modal
    const wsBackBtn = modalRoot.querySelector('#btn-modal-back-workspace');
    if (wsBackBtn) {
      wsBackBtn.addEventListener('click', () => {
        this.modalManager.close(this.modalId);
        const eventBus = this.container.resolve('EventBus');
        if (eventBus) eventBus.emit('navigate', { view: 'workspaces' });
      });
    }

    // Reschedule button
    const rescheduleBtn = modalRoot.querySelector('#btn-modal-reschedule');
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener('click', () => {
        this.modalManager.open('reschedule', { task: this.currentTask });
      });
    }

    // Auto-scroll to target section if requested
    if (this.activeTab && this.activeTab !== 'visual') {
      const targetSection = modalRoot.querySelector(`#section-${this.activeTab}`);
      if (targetSection) {
        setTimeout(() => targetSection.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }

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

    // QA Status Toggle Handlers (🔵 Belum diuji, 🟡 Testing, 🟢 Passed, 🔴 Failed)
    const qaButtons = modalRoot.querySelectorAll('.btn-set-qa-status');
    qaButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const authUser = this.container.resolve('AuthService').getCurrentUser();
        const role = (authUser?.role || '').toLowerCase();
        const canManageQA = authUser ? (authUser.isQA() || authUser.isProjectManager() || authUser.isAdmin()) : true;

        if (!canManageQA) {
          if (this.notificationService) {
            this.notificationService.warning('Hanya QA, Project Manager, atau Admin yang dapat mengubah status testing QA.');
          }
          return;
        }

        const newQaStatus = btn.getAttribute('data-qa-status');
        if (!this.currentTask) return;

        this.currentTask.qaStatus = newQaStatus;

        if (newQaStatus === 'passed') {
          this.taskService.updateTaskStatus(this.currentTask.id, 'done');
          this.comments.unshift({
            author: authUser ? authUser.name : 'Budi Pratama (QA)',
            role: 'QA Lead',
            time: 'Baru saja',
            text: '🟢 QA PASS: Pengujian berhasil 100%. Task disetujui & ditandai Selesai!'
          });
          if (this.notificationService) {
            this.notificationService.success(`QA Testing PASSED! Task ${this.currentTask.code} disetujui & selesai.`);
          }
        } else if (newQaStatus === 'failed') {
          // Return task to User for fix
          this.taskService.updateTaskStatus(this.currentTask.id, 'in-progress');
          this.comments.unshift({
            author: authUser ? authUser.name : 'Budi Pratama (QA)',
            role: 'QA Lead',
            time: 'Baru saja',
            text: '🔴 QA FAILED: Ditemukan kendala/bug. Task dikembalikan ke User (In Progress) untuk diperbaiki.'
          });
          if (this.notificationService) {
            this.notificationService.warning(`QA Testing FAILED: Task ${this.currentTask.code} dikembalikan ke User.`);
          }
        } else if (newQaStatus === 'testing') {
          this.taskService.updateTaskStatus(this.currentTask.id, 'review');
          if (this.notificationService) {
            this.notificationService.info(`Status pengujian QA: 🟡 Sedang Diuji.`);
          }
        } else {
          if (this.notificationService) {
            this.notificationService.info(`Status pengujian QA: 🔵 Belum Diuji.`);
          }
        }

        // Re-open modal to refresh UI
        this.modalManager.open(this.modalId, { task: this.currentTask, tab: this.activeTab });
      });
    });

    // User submission to QA review
    const submitReviewBtn = modalRoot.querySelector('#btn-user-submit-review');
    if (submitReviewBtn) {
      submitReviewBtn.addEventListener('click', () => {
        if (!this.currentTask) return;
        this.taskService.updateTaskStatus(this.currentTask.id, 'review');
        this.currentTask.qaStatus = 'testing';
        const authUser = this.container.resolve('AuthService').getCurrentUser();
        this.comments.unshift({
          author: authUser ? authUser.name : 'Dimas Anggara (User)',
          role: 'Contributor',
          time: 'Baru saja',
          text: '📤 User mengunggah hasil pekerjaan & mengirimkan task ke QA untuk diuji.'
        });
        if (this.notificationService) {
          this.notificationService.success(`Pekerjaan berhasil dikirim ke tim QA untuk dites!`);
        }
        this.modalManager.open(this.modalId, { task: this.currentTask, tab: 'logs' });
      });
    }

    // User upload deliverable
    const uploadWorkBtn = modalRoot.querySelector('#btn-user-upload-work');
    if (uploadWorkBtn) {
      uploadWorkBtn.addEventListener('click', () => {
        const authUser = this.container.resolve('AuthService').getCurrentUser();
        this.comments.unshift({
          author: authUser ? authUser.name : 'Dimas Anggara (User)',
          role: 'Contributor',
          time: 'Baru saja',
          text: '📎 Berkas deliverables baru telah diunggah: [Final_Render_4K_V2.mp4]'
        });
        if (this.notificationService) {
          this.notificationService.success('Hasil pekerjaan / deliverable berhasil diunggah.');
        }
        this.modalManager.open(this.modalId, { task: this.currentTask, tab: 'logs' });
      });
    }

    // Mark all done button
    const markDoneBtn = modalRoot.querySelector('#btn-mark-all-done');
    if (markDoneBtn) {
      markDoneBtn.addEventListener('click', () => {
        if (this.currentTask) {
          this.taskService.updateTaskStatus(this.currentTask.id, 'done');
          this.currentTask.qaStatus = 'passed';
          this.notificationService.success(`Semua checklist ${this.currentTask.code} disetujui & ditandai selesai!`);
          this.modalManager.close(this.modalId);
        }
      });
    }

    // Escalate blocker / report obstacle
    const escalateBtn = modalRoot.querySelector('#btn-escalate-blocker');
    if (escalateBtn) {
      escalateBtn.addEventListener('click', () => {
        const authUser = this.container.resolve('AuthService').getCurrentUser();
        this.comments.unshift({
          author: authUser ? authUser.name : 'Dimas Anggara (User)',
          role: 'Contributor',
          time: 'Baru saja',
          text: '⚠️ LAPORAN KENDALA: Diperlukan bantuan eskalasi teknis pada titik integrasi.'
        });
        this.notificationService.warning(`Laporan kendala berhasil dikirim ke Project Manager & tim terkait.`);
        this.modalManager.open(this.modalId, { task: this.currentTask, tab: 'logs' });
      });
    }
  }
}

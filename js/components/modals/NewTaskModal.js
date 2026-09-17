import { BaseModal } from '../../core/BaseModal.js';

/**
 * NewTaskModal - Single Responsibility Principle (SRP)
 * Modal form for quickly creating tasks across workspaces and boards.
 */
export class NewTaskModal extends BaseModal {
  constructor(container) {
    super(container, 'new-task');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
  }

  getRegisteredMembers() {
    const defaultMembers = [
      { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
      { name: 'Bagas Wicaksono', initials: 'BW', role: 'Graphic Specialist' },
      { name: 'Farhan Maulana', initials: 'FM', role: 'AI Researcher' },
      { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
      { name: 'Dina Lestari', initials: 'DL', role: 'UI Specialist' },
      { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
      { name: 'Dimas Anggara', initials: 'DA', role: 'Creative Specialist' }
    ];
    try {
      const custom = JSON.parse(localStorage.getItem('team_members') || '[]');
      return [...custom, ...defaultMembers];
    } catch (e) {
      return defaultMembers;
    }
  }

  getWorkspacesList() {
    const defaultWs = [
      { id: 'ruangkreasi', title: 'RuangKreasi (Studio Dev)' },
      { id: 'layarbaca', title: 'LayarBaca (Produk)' },
      { id: 'aikreativ', title: 'AIKreativ (Studio)' },
      { id: 'panen-kunci', title: 'Panen Kunci (SaaS)' },
      { id: 'sharinginaja', title: 'Sharinginaja (Cloud)' }
    ];
    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const formatted = custom.map(c => ({ id: c.id, title: `${c.title} (Baru)` }));
      return [...formatted, ...defaultWs];
    } catch (e) {
      return defaultWs;
    }
  }

  render(data = {}) {
    this._modalData = data || {};
    this.uploadedAttachments = [];
    const activeWs = data?.workspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const activeProjectId = data?.projectId || localStorage.getItem('active_project_id') || null;
    const activeStatus = data?.status || 'backlog';
    const workspaces = this.getWorkspacesList();
    const members = this.getRegisteredMembers();

    // Dapatkan kolom aktual papan untuk status awal tugas
    let boardColumns = [
      { id: 'backlog', title: 'Daftar Pekerjaan', color: 'bg-slate-400' },
      { id: 'in-progress', title: 'Sedang Berjalan', color: 'bg-blue-500' },
      { id: 'review-qa', title: 'Review QA Lapangan', color: 'bg-amber-500' },
      { id: 'ready-launch', title: 'Siap Launching', color: 'bg-purple-500' },
      { id: 'done', title: 'Selesai', color: 'bg-emerald-500' }
    ];

    try {
      const savedCols = localStorage.getItem(`kanban_columns_${activeWs}`) || (activeProjectId ? localStorage.getItem(`kanban_columns_${activeProjectId}`) : null);
      if (savedCols) {
        const parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed) && parsed.length > 0) {
          boardColumns = parsed.map(c => ({
            id: c.id,
            title: c.title,
            color: c.dot || 'bg-blue-500'
          }));
        }
      }
    } catch (e) { }

    if (activeStatus && !boardColumns.some(c => c.id === activeStatus)) {
      boardColumns.unshift({
        id: activeStatus,
        title: activeStatus,
        color: 'bg-blue-500'
      });
    }

    const currentSelectedCol = boardColumns.find(c => c.id === activeStatus) || boardColumns[0];

    return `
      <div class="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col modal-content-box animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="p-spacing-md bg-surface-container-low border-b border-surface-border flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <span class="material-symbols-outlined text-[18px]">add_task</span>
            </div>
            <div>
              <h3 class="font-headline-md text-[15px] font-bold text-text-primary">Buat Tugas Baru</h3>
              <p class="font-caption-meta text-[11px] text-text-secondary">Tambahkan deliverable baru ke workspace</p>
            </div>
          </div>
          <button id="btn-close-new-task" class="w-7 h-7 rounded-lg hover:bg-surface-container text-text-muted hover:text-text-primary flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Form -->
        <form id="form-new-task" class="p-spacing-lg flex flex-col gap-3.5 text-[13px]">
          <!-- Judul Tugas -->
          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Judul Tugas *</label>
            <input 
              id="new-task-title" 
              class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium" 
              placeholder="Contoh: Kalibrasi Audio & Visual Sinyal LED..." 
              required
            />
          </div>

          <!-- Penanggung Jawab (PIC) (In-Modal Custom Dropdown, 100% Mobile Safe) -->
          <div class="relative z-30" id="wrapper-custom-pic-select">
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Penanggung Jawab (PIC)</label>
            
            <select id="new-task-pic" class="hidden">
              ${members.map((m, idx) => `
                <option value="${m.name}|${m.initials}|${m.role}" ${idx === 0 ? 'selected' : ''}>${m.name} (${m.role})</option>
              `).join('')}
              <option value="__new_member__">+ Tambah Orang Baru...</option>
            </select>

            <button
              type="button"
              id="btn-custom-pic-trigger"
              class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium flex items-center justify-between gap-2 transition-all cursor-pointer hover:border-primary/50 text-[12.5px]"
              aria-expanded="false"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0" id="custom-pic-avatar">
                  ${members[0]?.initials || 'PIC'}
                </span>
                <span id="custom-pic-text" class="truncate font-medium text-text-primary">
                  ${members[0] ? `${members[0].name} (${members[0].role})` : 'Pilih PIC...'}
                </span>
              </div>
              <span class="material-symbols-outlined text-[18px] text-text-muted transition-transform duration-200 shrink-0" id="custom-pic-chevron">expand_more</span>
            </button>

            <div
              id="custom-pic-menu"
              class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-surface-container-lowest border border-surface-border rounded-xl shadow-2xl z-50 overflow-hidden py-1 max-h-56 overflow-y-auto transition-all animate-in fade-in slide-in-from-top-1 duration-150 custom-scrollbar"
            >
              ${members.map((m, idx) => `
                <button
                  type="button"
                  class="btn-pic-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${idx === 0 ? 'bg-primary/10 text-primary font-bold' : 'text-text-primary'}"
                  data-pic-val="${m.name}|${m.initials}|${m.role}"
                  data-pic-label="${m.name} (${m.role})"
                  data-pic-initials="${m.initials || 'PIC'}"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      ${m.initials || 'PIC'}
                    </span>
                    <span class="truncate">${m.name} (${m.role})</span>
                  </div>
                  ${idx === 0 ? '<span class="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>' : ''}
                </button>
              `).join('')}
              <div class="border-t border-surface-border my-1"></div>
              <button
                type="button"
                class="btn-pic-option w-full px-3 py-2 text-left text-[12.5px] font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                data-pic-val="__new_member__"
                data-pic-label="+ Tambah Orang Baru..."
                data-pic-initials="+"
              >
                <span class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[13px] font-bold flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[14px]">add</span>
                </span>
                <span>+ Tambah Orang Baru...</span>
              </button>
            </div>
          </div>

          <!-- Formulir Tambah Orang Baru (Full-Width Card) -->
          <div id="new-pic-field-wrapper" class="hidden p-3 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 rounded-xl flex flex-col gap-2.5 transition-all animate-in fade-in slide-in-from-top-1 duration-150">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[14px]">person_add</span>
                </div>
                <span class="font-caption-meta text-[11.5px] font-bold text-text-primary">Data Orang / Anggota Baru</span>
              </div>
              <span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                <span class="material-symbols-outlined text-[12px]">cloud_done</span>
                Tersimpan Otomatis ke Tim
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="font-caption-meta text-[10.5px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Nama Lengkap <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-pic-name"
                  placeholder="Contoh: Nadia Safitri"
                  class="w-full px-3 py-2 bg-surface-container-lowest border border-surface-border rounded-lg text-text-primary text-[12px] placeholder:text-text-muted focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 transition-all font-medium"
                />
              </div>
              <div>
                <label class="font-caption-meta text-[10.5px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Peran / Posisi <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-pic-role"
                  placeholder="Contoh: UI/UX Designer"
                  class="w-full px-3 py-2 bg-surface-container-lowest border border-surface-border rounded-lg text-text-primary text-[12px] placeholder:text-text-muted focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 transition-all font-medium"
                />
              </div>
            </div>

            <p class="font-caption-meta text-[10.5px] text-text-muted flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px] text-purple-500">info</span>
              Profil baru ini akan disimpan ke daftar tim dan otomatis dijadikan penanggung jawab tugas ini.
            </p>
          </div>

          <!-- Prioritas & Status Awal (Responsive Grid, In-Modal Dropdown) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative z-20" id="wrapper-custom-priority-select">
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Prioritas</label>
              
              <!-- Hidden native select for form data compatibility -->
              <select id="new-task-priority" class="hidden">
                <option value="Medium">Sedang (Medium)</option>
                <option value="High" selected>Tinggi (High)</option>
                <option value="Critical">Kritis (Critical)</option>
                <option value="Low">Rendah (Low)</option>
              </select>

              <button
                type="button"
                id="btn-custom-priority-trigger"
                class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium flex items-center justify-between gap-2 transition-all cursor-pointer hover:border-primary/50 text-[12.5px]"
                aria-expanded="false"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span id="custom-priority-dot" class="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500"></span>
                  <span id="custom-priority-text" class="truncate font-medium text-text-primary">Tinggi (High)</span>
                </div>
                <span class="material-symbols-outlined text-[18px] text-text-muted transition-transform duration-200 shrink-0" id="custom-priority-chevron">expand_more</span>
              </button>

              <div
                id="custom-priority-menu"
                class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-surface-container-lowest border border-surface-border rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <button type="button" class="btn-priority-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer text-text-primary" data-priority-id="Critical" data-priority-label="Kritis (Critical)" data-priority-color="bg-rose-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-rose-500"></span>
                    <span class="truncate">Kritis (Critical)</span>
                  </div>
                </button>
                <button type="button" class="btn-priority-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer bg-primary/10 text-primary font-bold" data-priority-id="High" data-priority-label="Tinggi (High)" data-priority-color="bg-amber-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500"></span>
                    <span class="truncate">Tinggi (High)</span>
                  </div>
                  <span class="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                </button>
                <button type="button" class="btn-priority-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer text-text-primary" data-priority-id="Medium" data-priority-label="Sedang (Medium)" data-priority-color="bg-blue-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500"></span>
                    <span class="truncate">Sedang (Medium)</span>
                  </div>
                </button>
                <button type="button" class="btn-priority-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer text-text-primary" data-priority-id="Low" data-priority-label="Rendah (Low)" data-priority-color="bg-slate-400">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400"></span>
                    <span class="truncate">Rendah (Low)</span>
                  </div>
                </button>
              </div>
            </div>

            <div class="relative z-20" id="wrapper-custom-status-select">
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Status Awal</label>
              
              <!-- Hidden native select for form data compatibility -->
              <select id="new-task-status" class="hidden">
                ${boardColumns.map(c => `
                  <option value="${c.id}" ${c.id === currentSelectedCol.id ? 'selected' : ''}>${c.title}</option>
                `).join('')}
              </select>

              <!-- Custom Dropdown Button (In-Modal, 100% Safe from Screen/Modal Overflow) -->
              <button
                type="button"
                id="btn-custom-status-trigger"
                class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium flex items-center justify-between gap-2 transition-all cursor-pointer hover:border-primary/50 text-[12.5px]"
                aria-expanded="false"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span id="custom-status-dot" class="w-2.5 h-2.5 rounded-full shrink-0 ${currentSelectedCol.color}"></span>
                  <span id="custom-status-text" class="truncate font-medium text-text-primary">${currentSelectedCol.title}</span>
                </div>
                <span class="material-symbols-outlined text-[18px] text-text-muted transition-transform duration-200 shrink-0" id="custom-status-chevron">expand_more</span>
              </button>

              <!-- In-Modal Dropdown Menu List: Absolute and bound strictly to column width -->
              <div
                id="custom-status-menu"
                class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-surface-container-lowest border border-surface-border rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-all animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto"
              >
                ${boardColumns.map(c => {
                  const isMatch = c.id === currentSelectedCol.id;
                  return `
                    <button
                      type="button"
                      class="btn-status-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${isMatch ? 'bg-primary/10 text-primary font-bold' : 'text-text-primary'}"
                      data-status-id="${c.id}"
                      data-status-label="${c.title}"
                      data-status-color="${c.color}"
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0 ${c.color}"></span>
                        <span class="truncate">${c.title}</span>
                      </div>
                      ${isMatch ? '<span class="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Rentang Tanggal & Deadline (Timeline & Gantt) -->
          <div class="p-3 bg-surface-container-low rounded-xl border border-surface-border flex flex-col gap-2">
            <span class="font-caption-meta text-[11px] text-text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[15px] text-brand-accent">date_range</span>
              <span>Jadwal & Deadline (Timeline & Gantt)</span>
            </span>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="font-caption-meta text-[10px] text-text-muted font-semibold uppercase block mb-1">Tanggal Mulai</label>
                <input 
                  id="new-task-start-date" 
                  type="date" 
                  value="2026-09-11"
                  class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-[12px] font-medium"
                  required
                />
              </div>
              <div>
                <label class="font-caption-meta text-[10px] text-text-muted font-semibold uppercase block mb-1">Tanggal Deadline</label>
                <input 
                  id="new-task-end-date" 
                  type="date" 
                  value="2026-09-15"
                  class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-[12px] font-medium"
                  required
                />
              </div>
            </div>
            <p class="font-caption-meta text-[10px] text-text-muted">
              Menentukan rentang durasi tugas pada diagram Gantt dan jadwal kalender global.
            </p>
          </div>

          <!-- Deskripsi Singkat -->
          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Deskripsi Singkat</label>
            <textarea 
              id="new-task-desc" 
              class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-[12px]" 
              rows="2" 
              placeholder="Jelaskan kebutuhan teknis deliverable ini..."
            ></textarea>
          </div>

          <!-- Lampiran / Attachment -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase">Lampiran / Attachment</label>
              <span id="attachment-file-count" class="text-[10.5px] text-text-muted font-medium">0 file dipilih</span>
            </div>

            <div class="relative border-2 border-dashed border-surface-border hover:border-primary/60 dark:hover:border-primary/60 rounded-xl p-3.5 bg-surface-container-lowest transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group text-center">
              <input 
                type="file" 
                id="new-task-attachment" 
                multiple
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              />
              <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform pointer-events-none">
                <span class="material-symbols-outlined text-[20px]">attach_file</span>
              </div>
              <div class="pointer-events-none">
                <span class="text-[12.5px] font-semibold text-text-primary">Unggah atau seret file ke sini</span>
                <span class="text-[10.5px] text-text-muted block mt-0.5">Mendukung gambar, dokumen, PDF, spreadsheet, atau arsip</span>
              </div>
            </div>

            <!-- List Preview Lampiran -->
            <div id="attachment-preview-list" class="hidden flex flex-col gap-1.5 mt-2 max-h-36 overflow-y-auto pr-1"></div>
          </div>

          <div class="pt-2 border-t border-surface-border flex items-center justify-end gap-2">
            <button id="btn-cancel-new-task" class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary text-[12px] font-medium transition-colors" type="button">
              Batal
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-primary text-on-primary font-body-medium text-[12px] font-bold hover:bg-brand-accent transition-colors shadow-sm">
              Buat Tugas
            </button>
          </div>
        </form>
      </div>
    `;
  }

  bindEvents(modalRoot) {
    const closeBtn = modalRoot.querySelector('#btn-close-new-task');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-new-task');
    const closeAction = () => this.modalManager.close(this.modalId);
    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAction);

    const picSelect = modalRoot.querySelector('#new-task-pic');
    const newPicWrapper = modalRoot.querySelector('#new-pic-field-wrapper');
    const newPicNameInput = modalRoot.querySelector('#input-new-pic-name');

    // Custom PIC Dropdown handling (confined within modal)
    const picTrigger = modalRoot.querySelector('#btn-custom-pic-trigger');
    const picMenu = modalRoot.querySelector('#custom-pic-menu');
    const picChevron = modalRoot.querySelector('#custom-pic-chevron');
    const picText = modalRoot.querySelector('#custom-pic-text');
    const picAvatar = modalRoot.querySelector('#custom-pic-avatar');
    const picOptions = modalRoot.querySelectorAll('.btn-pic-option');

    const togglePicMenu = (show) => {
      if (!picMenu) return;
      const willOpen = show !== undefined ? show : picMenu.classList.contains('hidden');
      if (willOpen) {
        picMenu.classList.remove('hidden');
        if (picChevron) picChevron.classList.add('rotate-180');
        if (picTrigger) picTrigger.setAttribute('aria-expanded', 'true');
        if (prioMenu && !prioMenu.classList.contains('hidden')) togglePrioMenu(false);
        if (statusMenu && !statusMenu.classList.contains('hidden')) toggleStatusMenu(false);
      } else {
        picMenu.classList.add('hidden');
        if (picChevron) picChevron.classList.remove('rotate-180');
        if (picTrigger) picTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    if (picTrigger) {
      picTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePicMenu();
      });
    }

    picOptions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const picVal = btn.dataset.picVal;
        const picLabel = btn.dataset.picLabel;
        const picInitials = btn.dataset.picInitials;

        if (picSelect) {
          picSelect.value = picVal;
          if (picVal === '__new_member__') {
            if (newPicWrapper) newPicWrapper.classList.remove('hidden');
            if (newPicNameInput) newPicNameInput.focus();
          } else {
            if (newPicWrapper) newPicWrapper.classList.add('hidden');
          }
        }

        if (picText) picText.textContent = picLabel;
        if (picAvatar) picAvatar.textContent = picInitials;

        picOptions.forEach(o => {
          if (o.dataset.picVal === '__new_member__') return;
          const isMatch = o.dataset.picVal === picVal;
          o.className = `btn-pic-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${
            isMatch ? 'bg-primary/10 text-primary font-bold' : 'text-text-primary'
          }`;
          const existingCheck = o.querySelector('.material-symbols-outlined');
          if (isMatch && !existingCheck) {
            const checkSpan = document.createElement('span');
            checkSpan.className = 'material-symbols-outlined text-[16px] text-primary shrink-0';
            checkSpan.textContent = 'check';
            o.appendChild(checkSpan);
          } else if (!isMatch && existingCheck) {
            existingCheck.remove();
          }
        });

        togglePicMenu(false);
      });
    });

    // Custom Status & Priority Dropdowns handling (strictly confined within modal, responsive in mobile & desktop)
    const prioTrigger = modalRoot.querySelector('#btn-custom-priority-trigger');
    const prioMenu = modalRoot.querySelector('#custom-priority-menu');
    const prioChevron = modalRoot.querySelector('#custom-priority-chevron');
    const hiddenPrioritySelect = modalRoot.querySelector('#new-task-priority');
    const customPriorityDot = modalRoot.querySelector('#custom-priority-dot');
    const customPriorityText = modalRoot.querySelector('#custom-priority-text');

    const togglePrioMenu = (show) => {
      if (!prioMenu) return;
      const willOpen = show !== undefined ? show : prioMenu.classList.contains('hidden');
      if (willOpen) {
        prioMenu.classList.remove('hidden');
        if (prioChevron) prioChevron.classList.add('rotate-180');
        if (prioTrigger) prioTrigger.setAttribute('aria-expanded', 'true');
        if (picMenu && !picMenu.classList.contains('hidden')) togglePicMenu(false);
        if (statusMenu && !statusMenu.classList.contains('hidden')) toggleStatusMenu(false);
      } else {
        prioMenu.classList.add('hidden');
        if (prioChevron) prioChevron.classList.remove('rotate-180');
        if (prioTrigger) prioTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    if (prioTrigger) {
      prioTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePrioMenu();
      });
    }

    const prioOptionButtons = modalRoot.querySelectorAll('.btn-priority-option');
    prioOptionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prioId = btn.dataset.priorityId;
        const prioLabel = btn.dataset.priorityLabel;
        const prioColor = btn.dataset.priorityColor;

        if (hiddenPrioritySelect) hiddenPrioritySelect.value = prioId;
        if (customPriorityText) customPriorityText.textContent = prioLabel;
        if (customPriorityDot) customPriorityDot.className = `w-2.5 h-2.5 rounded-full shrink-0 ${prioColor}`;

        prioOptionButtons.forEach(otherBtn => {
          const isMatch = otherBtn.dataset.priorityId === prioId;
          otherBtn.className = `btn-priority-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${
            isMatch ? 'bg-primary/10 text-primary font-bold' : 'text-text-primary'
          }`;
          const existingCheck = otherBtn.querySelector('.material-symbols-outlined');
          if (isMatch && !existingCheck) {
            const checkSpan = document.createElement('span');
            checkSpan.className = 'material-symbols-outlined text-[16px] text-primary shrink-0';
            checkSpan.textContent = 'check';
            otherBtn.appendChild(checkSpan);
          } else if (!isMatch && existingCheck) {
            existingCheck.remove();
          }
        });

        togglePrioMenu(false);
      });
    });

    const statusTrigger = modalRoot.querySelector('#btn-custom-status-trigger');
    const statusMenu = modalRoot.querySelector('#custom-status-menu');
    const statusChevron = modalRoot.querySelector('#custom-status-chevron');
    const hiddenStatusSelect = modalRoot.querySelector('#new-task-status');
    const customStatusDot = modalRoot.querySelector('#custom-status-dot');
    const customStatusText = modalRoot.querySelector('#custom-status-text');

    const toggleStatusMenu = (show) => {
      if (!statusMenu) return;
      const willOpen = show !== undefined ? show : statusMenu.classList.contains('hidden');
      if (willOpen) {
        statusMenu.classList.remove('hidden');
        if (statusChevron) statusChevron.classList.add('rotate-180');
        if (statusTrigger) statusTrigger.setAttribute('aria-expanded', 'true');
        if (picMenu && !picMenu.classList.contains('hidden')) togglePicMenu(false);
        if (prioMenu && !prioMenu.classList.contains('hidden')) togglePrioMenu(false);
      } else {
        statusMenu.classList.add('hidden');
        if (statusChevron) statusChevron.classList.remove('rotate-180');
        if (statusTrigger) statusTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    if (statusTrigger && statusMenu) {
      statusTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleStatusMenu();
      });

      const optionButtons = modalRoot.querySelectorAll('.btn-status-option');
      optionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const statusId = btn.dataset.statusId;
          const statusLabel = btn.dataset.statusLabel;
          const statusColor = btn.dataset.statusColor;

          if (hiddenStatusSelect) {
            hiddenStatusSelect.value = statusId;
          }

          if (customStatusText) {
            customStatusText.textContent = statusLabel;
          }

          if (customStatusDot) {
            customStatusDot.className = `w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`;
          }

          optionButtons.forEach(otherBtn => {
            const isMatch = otherBtn.dataset.statusId === statusId;
            otherBtn.className = `btn-status-option w-full px-3 py-2 text-left text-[12.5px] font-medium flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${
              isMatch ? 'bg-primary/10 text-primary font-bold' : 'text-text-primary'
            }`;
            const existingCheck = otherBtn.querySelector('.material-symbols-outlined');
            if (isMatch && !existingCheck) {
              const checkSpan = document.createElement('span');
              checkSpan.className = 'material-symbols-outlined text-[16px] text-primary shrink-0';
              checkSpan.textContent = 'check';
              otherBtn.appendChild(checkSpan);
            } else if (!isMatch && existingCheck) {
              existingCheck.remove();
            }
          });

          toggleStatusMenu(false);
        });
      });
    }

    const handleOutsideClickNewTask = (e) => {
      if (!picTrigger?.contains(e.target) && !picMenu?.contains(e.target)) {
        togglePicMenu(false);
      }
      if (!prioTrigger?.contains(e.target) && !prioMenu?.contains(e.target)) {
        togglePrioMenu(false);
      }
      if (!statusTrigger?.contains(e.target) && !statusMenu?.contains(e.target)) {
        toggleStatusMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClickNewTask);

    // Attachment file handling
    const attachmentInput = modalRoot.querySelector('#new-task-attachment');
    const attachmentCount = modalRoot.querySelector('#attachment-file-count');
    const previewList = modalRoot.querySelector('#attachment-preview-list');

    const formatSize = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getIconForType = (mime = '', name = '') => {
      const ext = name.split('.').pop().toLowerCase();
      if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
      if (mime?.includes('pdf') || ext === 'pdf') return 'picture_as_pdf';
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder_zip';
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
      if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'description';
      return 'attach_file';
    };

    const renderAttachmentPreviews = () => {
      if (!previewList || !attachmentCount) return;
      if (this.uploadedAttachments.length === 0) {
        previewList.classList.add('hidden');
        previewList.innerHTML = '';
        attachmentCount.textContent = '0 file dipilih';
        return;
      }

      previewList.classList.remove('hidden');
      attachmentCount.textContent = `${this.uploadedAttachments.length} file dipilih`;

      previewList.innerHTML = this.uploadedAttachments.map((att, idx) => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-surface-border text-[11.5px] animate-in fade-in duration-150">
          <div class="flex items-center gap-2 min-w-0">
            <span class="material-symbols-outlined text-[18px] text-primary shrink-0">${getIconForType(att.type, att.name)}</span>
            <span class="font-medium text-text-primary truncate max-w-[220px]" title="${att.name}">${att.name}</span>
            <span class="text-text-muted text-[10px] shrink-0 font-mono">(${att.formattedSize})</span>
          </div>
          <button type="button" data-index="${idx}" class="btn-remove-attachment w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title="Hapus lampiran">
            <span class="material-symbols-outlined text-[15px] pointer-events-none">close</span>
          </button>
        </div>
      `).join('');

      previewList.querySelectorAll('.btn-remove-attachment').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const index = parseInt(btn.dataset.index, 10);
          this.uploadedAttachments.splice(index, 1);
          renderAttachmentPreviews();
        });
      });
    };

    if (attachmentInput) {
      attachmentInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (readEvent) => {
            this.uploadedAttachments.push({
              name: file.name,
              size: file.size,
              formattedSize: formatSize(file.size),
              type: file.type,
              url: readEvent.target.result
            });
            renderAttachmentPreviews();
          };
          if (file.size <= 5 * 1024 * 1024) {
            reader.readAsDataURL(file);
          } else {
            this.uploadedAttachments.push({
              name: file.name,
              size: file.size,
              formattedSize: formatSize(file.size),
              type: file.type,
              url: ''
            });
            renderAttachmentPreviews();
          }
        });
        attachmentInput.value = '';
      });
    }

    const form = modalRoot.querySelector('#form-new-task');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = modalRoot.querySelector('#new-task-title').value;
        const workspace = this._modalData?.workspace || localStorage.getItem('active_workspace') || 'ruangkreasi';
        const projectId = this._modalData?.projectId || localStorage.getItem('active_project_id') || null;
        const priority = modalRoot.querySelector('#new-task-priority').value;
        const hours = modalRoot.querySelector('#new-task-hours')?.value
          ? parseInt(modalRoot.querySelector('#new-task-hours').value, 10)
          : 8;
        const status = modalRoot.querySelector('#new-task-status')?.value || this._modalData?.status || 'backlog';
        const description = modalRoot.querySelector('#new-task-desc').value;
        const startDate = modalRoot.querySelector('#new-task-start-date').value || '2026-09-11';
        const endDate = modalRoot.querySelector('#new-task-end-date').value || '2026-09-15';

        // Format timeline string for Monday table & Gantt display (e.g. "20 - 24 Ags")
        const formatDayMonth = (dateStr) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length >= 3) {
            const day = parseInt(parts[2], 10);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            const monthIndex = parseInt(parts[1], 10) - 1;
            return `${day} ${monthNames[monthIndex] || 'Ags'}`;
          }
          return dateStr;
        };

        const timelineStr = `${formatDayMonth(startDate)} – ${formatDayMonth(endDate)}`;

        let picVal = modalRoot.querySelector('#new-task-pic')?.value || 'Sari Rahmawati|SR|Creative Lead';
        let picName, picInitials, picRole;

        if (picVal === '__new_member__') {
          const newPicNameInput = modalRoot.querySelector('#input-new-pic-name');
          const newPicRoleInput = modalRoot.querySelector('#input-new-pic-role');
          const customName = newPicNameInput ? newPicNameInput.value.trim() : '';
          const customRole = newPicRoleInput ? newPicRoleInput.value.trim() : 'Anggota Tim';

          if (customName) {
            picName = customName;
            picRole = customRole;
            picInitials = customName
              .split(/\s+/)
              .map(word => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'MB';

            // Simpan ke localStorage agar nama ini tersimpan di tim
            try {
              const customMembers = JSON.parse(localStorage.getItem('team_members') || '[]');
              const newMemberObj = {
                name: picName,
                initials: picInitials,
                role: picRole,
                email: `${picName.toLowerCase().replace(/[^a-z0-9]/g, '')}@sampulkreativ.id`,
                workspace: workspace
              };
              customMembers.unshift(newMemberObj);
              localStorage.setItem('team_members', JSON.stringify(customMembers));
            } catch (err) {
              console.warn('Gagal menyimpan anggota baru:', err);
            }
          } else {
            picName = 'Sari Rahmawati';
            picInitials = 'SR';
            picRole = 'Creative Lead';
          }
        } else {
          [picName, picInitials, picRole] = picVal.split('|');
        }

        const createdTask = this.taskService.addTask({
          title,
          workspace,
          projectId,
          priority,
          hours,
          status,
          description,
          startDate,
          endDate,
          deadline: endDate,
          timeline: timelineStr,
          pic: { name: picName, initials: picInitials || 'PIC', role: picRole || 'Specialist' },
          qaProgress: { passed: 0, total: 3 },
          attachments: [...(this.uploadedAttachments || [])],
          assets: [...(this.uploadedAttachments || [])]
        });

        // Also add to CalendarService if available
        try {
          const calService = this.container.resolve('CalendarService');
          if (calService && calService.addEvent) {
            calService.addEvent({
              title,
              description,
              pillar: workspace,
              date: startDate,
              time: '09:00 - 17:00 WIB',
              pic: picName,
              status,
              badge: `${formatDayMonth(endDate)} Deadline`,
              taskRef: createdTask.code
            });
          }
        } catch (calErr) {
          console.warn('Calendar sync notice:', calErr);
        }

        // Simpan workspace & project aktif
        if (workspace) localStorage.setItem('active_workspace', workspace);
        if (projectId) localStorage.setItem('active_project_id', projectId);

        // Tutup modal
        this.modalManager.close(this.modalId);

        // Langsung arahkan & buka di papan Kanban dengan highlight kartu baru
        this.eventBus.emit('navigate', {
          view: 'kanban',
          workspace,
          projectId,
          newTaskId: createdTask.id
        });
      });
    }
  }
}

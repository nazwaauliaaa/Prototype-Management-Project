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
    const activeWs = data?.workspace || localStorage.getItem('active_workspace') || 'ruangkreasi';
    const activeStatus = data?.status || 'in-progress';
    const workspaces = this.getWorkspacesList();
    const members = this.getRegisteredMembers();

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

          <!-- Penanggung Jawab (PIC) -->
          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Penanggung Jawab (PIC)</label>
            <select id="new-task-pic" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium cursor-pointer">
              ${members.map(m => `
                <option value="${m.name}|${m.initials}|${m.role}">${m.name} (${m.role})</option>
              `).join('')}
              <option value="__new_member__">+ Tambah Orang Baru...</option>
            </select>
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

            <div class="grid grid-cols-2 gap-3">
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

          <!-- Prioritas & Status Awal -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Prioritas</label>
              <select id="new-task-priority" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium cursor-pointer">
                <option value="Medium">Sedang (Medium)</option>
                <option value="High" selected>Tinggi (High)</option>
                <option value="Critical">Kritis (Critical)</option>
                <option value="Low">Rendah (Low)</option>
              </select>
            </div>

            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Status Awal</label>
              <select id="new-task-status" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium cursor-pointer">
                <option value="backlog" ${activeStatus === 'backlog' ? 'selected' : ''}>Daftar Pekerjaan</option>
                <option value="in-progress" ${activeStatus === 'in-progress' ? 'selected' : ''}>Sedang Berjalan</option>
                <option value="review-qa" ${activeStatus === 'review-qa' ? 'selected' : ''}>Review QA Lapangan</option>
                <option value="ready-launch" ${activeStatus === 'ready-launch' ? 'selected' : ''}>Siap Launching</option>
                <option value="done" ${activeStatus === 'done' ? 'selected' : ''}>Selesai</option>
              </select>
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

    if (picSelect && newPicWrapper) {
      picSelect.addEventListener('change', () => {
        if (picSelect.value === '__new_member__') {
          newPicWrapper.classList.remove('hidden');
          if (newPicNameInput) newPicNameInput.focus();
        } else {
          newPicWrapper.classList.add('hidden');
        }
      });
    }

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
        const priority = modalRoot.querySelector('#new-task-priority').value;
        const hours = modalRoot.querySelector('#new-task-hours')?.value
          ? parseInt(modalRoot.querySelector('#new-task-hours').value, 10)
          : 8;
        const status = modalRoot.querySelector('#new-task-status').value;
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
          projectId: this._modalData?.projectId || null,
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

        // Simpan workspace aktif
        localStorage.setItem('active_workspace', workspace);

        // Tutup modal
        this.modalManager.close(this.modalId);

        // Langsung arahkan & buka di papan Kanban dengan highlight kartu baru
        this.eventBus.emit('navigate', {
          view: 'kanban',
          workspace,
          projectId: this._modalData?.projectId || null,
          newTaskId: createdTask.id
        });
      });
    }
  }
}

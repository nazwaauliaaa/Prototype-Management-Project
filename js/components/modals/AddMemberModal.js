import { BaseModal } from '../../core/BaseModal.js';

/**
 * AddMemberModal - Single Responsibility Principle (SRP)
 * Modal form for adding new team members, collaborators, or PICs to workspaces and tasks.
 */
export class AddMemberModal extends BaseModal {
  constructor(container) {
    super(container, 'add-member');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.currentWorkspace = 'ruangkreasi';
  }

  getExistingMembers() {
    const defaultMembers = [
      { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead', color: '#8b5cf6', email: 'sari.rahmawati@sampulkreativ.id' },
      { name: 'Bagas Wicaksono', initials: 'BW', role: 'Graphic Specialist', color: '#3b82f6', email: 'bagas.wicaksono@sampulkreativ.id' },
      { name: 'Farhan Maulana', initials: 'FM', role: 'AI Researcher', color: '#10b981', email: 'farhan.maulana@sampulkreativ.id' },
      { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security', color: '#f59e0b', email: 'kevin.santoso@sampulkreativ.id' },
      { name: 'Dina Lestari', initials: 'DL', role: 'UI Specialist', color: '#ec4899', email: 'dina.lestari@sampulkreativ.id' },
      { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead', color: '#06b6d4', email: 'budi.pratama@sampulkreativ.id' },
      { name: 'Dimas Anggara', initials: 'DA', role: 'Creative Specialist', color: '#6366f1', email: 'dimas.anggara@sampulkreativ.id' }
    ];

    try {
      const custom = JSON.parse(localStorage.getItem('team_members') || '[]');
      return [...custom, ...defaultMembers];
    } catch (e) {
      return defaultMembers;
    }
  }

  render(data = {}) {
    this.currentWorkspace = data?.workspace || this.currentWorkspace || 'ruangkreasi';
    const workspaceTasks = this.taskService ? this.taskService.getTasks(this.currentWorkspace) : [];

    return `
      <div class="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col modal-content-box animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="p-spacing-md bg-surface-container-low border-b border-surface-border flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <span class="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 class="font-headline-md text-[15px] font-bold text-text-primary">Tambah Orang / Anggota Tim</h3>
              <p class="font-caption-meta text-[11px] text-text-secondary">Tambahkan personil ke ruang kerja & tugas deliverable</p>
            </div>
          </div>
          <button id="btn-close-add-member" class="w-7 h-7 rounded-lg hover:bg-surface-container text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer" type="button">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Form -->
        <form id="form-add-member" class="p-spacing-lg flex flex-col gap-3.5 text-[13px]">
          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Nama Lengkap *</label>
            <input 
              id="input-member-name" 
              class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium text-xs transition-colors" 
              placeholder="Contoh: Nadia Safitri, Rian Pratama..." 
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Peran / Posisi *</label>
              <input 
                id="input-member-role" 
                class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium text-xs transition-colors" 
                placeholder="Contoh: QA Engineer" 
                value="Creative Specialist"
                required
              />
            </div>

            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Warna Avatar</label>
              <select id="select-member-color" class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium text-xs transition-colors cursor-pointer">
                <option value="#8b5cf6" selected>Ungu (Creative)</option>
                <option value="#3b82f6">Biru (Engineer)</option>
                <option value="#10b981">Hijau (QA / Ops)</option>
                <option value="#f59e0b">Amber (Lead)</option>
                <option value="#ec4899">Pink (Designer)</option>
                <option value="#06b6d4">Cyan (DevOps)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Email Perusahaan</label>
            <input 
              id="input-member-email" 
              type="email"
              class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-xs transition-colors" 
              placeholder="nama@sampulkreativ.id" 
            />
          </div>

          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Tugaskan Langsung ke Deliverable (Opsional)</label>
            <select id="select-member-assign-task" class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-xs transition-colors cursor-pointer">
              <option value="">-- Hanya Tambahkan ke Tim (Tanpa Tugas) --</option>
              ${workspaceTasks.map(t => `
                <option value="${t.id}">${t.code} - ${t.title.slice(0, 38)}...</option>
              `).join('')}
            </select>
          </div>

          <!-- Preview Pill -->
          <div class="p-2.5 bg-surface-container-low rounded-xl border border-surface-border flex items-center gap-3">
            <div id="member-preview-badge" class="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              NS
            </div>
            <div class="flex flex-col min-w-0">
              <span id="member-preview-name" class="font-body-medium text-xs font-bold text-text-primary truncate">Nama Anggota</span>
              <span id="member-preview-role" class="text-[11px] text-text-muted truncate">Creative Specialist</span>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
            <button id="btn-cancel-add-member" class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary text-xs font-semibold transition-colors cursor-pointer" type="button">
              Batal
            </button>
            <button type="submit" class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-on-primary font-body-medium text-xs font-bold hover:bg-brand-accent transition-all shadow-sm active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">check</span>
              <span>Simpan Anggota</span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  bindEvents(modalRoot) {
    const closeBtn = modalRoot.querySelector('#btn-close-add-member');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-add-member');
    const closeAction = () => this.modalManager.close(this.modalId);
    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAction);

    // Live preview updates
    const nameInput = modalRoot.querySelector('#input-member-name');
    const roleInput = modalRoot.querySelector('#input-member-role');
    const colorSelect = modalRoot.querySelector('#select-member-color');
    const badge = modalRoot.querySelector('#member-preview-badge');
    const namePreview = modalRoot.querySelector('#member-preview-name');
    const rolePreview = modalRoot.querySelector('#member-preview-role');

    const updatePreview = () => {
      const name = nameInput?.value.trim() || 'Nama Anggota';
      const role = roleInput?.value.trim() || 'Creative Specialist';
      const color = colorSelect?.value || '#8b5cf6';
      
      const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'NA';
      if (badge) {
        badge.textContent = initials;
        badge.style.backgroundColor = color;
      }
      if (namePreview) namePreview.textContent = name;
      if (rolePreview) rolePreview.textContent = role;
    };

    if (nameInput) nameInput.addEventListener('input', updatePreview);
    if (roleInput) roleInput.addEventListener('input', updatePreview);
    if (colorSelect) colorSelect.addEventListener('change', updatePreview);

    // Form submission
    const form = modalRoot.querySelector('#form-add-member');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput?.value.trim();
        const role = roleInput?.value.trim() || 'Tim Member';
        const color = colorSelect?.value || '#8b5cf6';
        const email = modalRoot.querySelector('#input-member-email')?.value.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sampulkreativ.id`;
        const assignedTaskId = modalRoot.querySelector('#select-member-assign-task')?.value;

        if (!name) return;

        const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
        const newMember = {
          id: 'mem-' + Date.now(),
          name,
          role,
          color,
          email,
          initials,
          workspace: this.currentWorkspace
        };

        // Persist to custom team members in localStorage
        try {
          const custom = JSON.parse(localStorage.getItem('team_members') || '[]');
          custom.unshift(newMember);
          localStorage.setItem('team_members', JSON.stringify(custom));
        } catch (err) {
          console.error('Error saving team member:', err);
        }

        // If assigned to a task, update task PIC
        if (assignedTaskId && this.taskService) {
          const task = this.taskService.getTask(assignedTaskId);
          if (task) {
            task.pic = { name, initials, role };
            this.eventBus.emit('tasks:updated', this.taskService.tasks);
          }
        }

        // Emit member added event
        this.eventBus.emit('member:added', { member: newMember, workspace: this.currentWorkspace });
        this.notificationService.success(`Anggota baru "${name}" (${role}) berhasil ditambahkan!`);

        this.modalManager.close(this.modalId);
      });
    }
  }
}

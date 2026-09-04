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

  render() {
    return `
      <div class="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col modal-content-box">
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
          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Judul Tugas</label>
            <input 
              id="new-task-title" 
              class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium" 
              placeholder="Contoh: Kalibrasi Audio & Visual Sinyal LED..." 
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Pilar Workspace</label>
              <select id="new-task-workspace" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium">
                <option value="ruangkreasi" selected>RuangKreasi (Studio Dev)</option>
                <option value="layarbaca">LayarBaca (Produk)</option>
                <option value="aikreativ">AIKreativ (Studio)</option>
                <option value="panen-kunci">Panen Kunci (SaaS)</option>
                <option value="sharinginaja">Sharinginaja (Cloud)</option>
              </select>
            </div>

            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Prioritas</label>
              <select id="new-task-priority" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium">
                <option value="Medium">Sedang (Medium)</option>
                <option value="High">Tinggi (High)</option>
                <option value="Critical">Kritis (Critical)</option>
                <option value="Low">Rendah (Low)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Estimasi Beban (Jam)</label>
              <input 
                id="new-task-hours" 
                type="number" 
                min="1" 
                max="100" 
                value="8" 
                class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium"
              />
            </div>
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Status Awal</label>
              <select id="new-task-status" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium">
                <option value="in-progress" selected>In Progress</option>
                <option value="backlog">Backlog</option>
                <option value="review-qa">Review QA</option>
                <option value="ready-launch">Siap Launching</option>
              </select>
            </div>
          </div>

          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Deskripsi Singkat</label>
            <textarea 
              id="new-task-desc" 
              class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-[12px]" 
              rows="2" 
              placeholder="Jelaskan kebutuhan teknis deliverable ini..."
            ></textarea>
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

    const form = modalRoot.querySelector('#form-new-task');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = modalRoot.querySelector('#new-task-title').value;
        const workspace = modalRoot.querySelector('#new-task-workspace').value;
        const priority = modalRoot.querySelector('#new-task-priority').value;
        const hours = parseInt(modalRoot.querySelector('#new-task-hours').value, 10) || 8;
        const status = modalRoot.querySelector('#new-task-status').value;
        const description = modalRoot.querySelector('#new-task-desc').value;

        this.taskService.addTask({
          title,
          workspace,
          priority,
          hours,
          status,
          description,
          pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
          timeline: 'Hari Ini',
          qaProgress: { passed: 0, total: 3 }
        });

        this.modalManager.close(this.modalId);
      });
    }
  }
}

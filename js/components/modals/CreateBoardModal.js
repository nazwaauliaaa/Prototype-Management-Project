import { BaseModal } from '../../core/BaseModal.js';

/**
 * CreateBoardModal - Single Responsibility Principle (SRP)
 * Modal form for creating a new project / board with automatic workspace creation and custom themes.
 */
export class CreateBoardModal extends BaseModal {
  constructor(container) {
    super(container, 'create-board');
    this.projectService = container.resolve('ProjectService');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.eventBus = container.resolve('EventBus');

    // Predefined rich themes (Wallpapers, Gradients, Colors)
    this.themes = [
      // Wallpapers / Photos
      {
        id: 'skyline',
        name: 'City Skyline',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'mountain',
        name: 'Moody Mountain',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'ocean',
        name: 'Ocean Waves',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'cosmic',
        name: 'Cosmic Nebula',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'architecture',
        name: 'Modern Architecture',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },

      // Gradients
      {
        id: 'sunset-peach',
        name: 'Sunset Peach',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
        value: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'ocean-breeze',
        name: 'Ocean Breeze',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
        value: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'royal-indigo',
        name: 'Royal Indigo',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #3730a3 0%, #6366f1 50%, #818cf8 100%)',
        value: 'linear-gradient(135deg, #3730a3 0%, #6366f1 50%, #818cf8 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'emerald-aurora',
        name: 'Emerald Aurora',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #065f46 0%, #10b981 50%, #34d399 100%)',
        value: 'linear-gradient(135deg, #065f46 0%, #10b981 50%, #34d399 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'berry-fuchsia',
        name: 'Berry Fuchsia',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)',
        value: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'midnight-dark',
        name: 'Midnight Dark',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        textColor: '#ffffff'
      },

      // Solid Colors
      {
        id: 'trello-blue',
        name: 'Trello Blue',
        type: 'color',
        thumb: '#0079bf',
        value: '#0079bf',
        textColor: '#ffffff'
      },
      {
        id: 'emerald-green',
        name: 'Emerald Green',
        type: 'color',
        thumb: '#059669',
        value: '#059669',
        textColor: '#ffffff'
      },
      {
        id: 'royal-purple',
        name: 'Royal Purple',
        type: 'color',
        thumb: '#7c3aed',
        value: '#7c3aed',
        textColor: '#ffffff'
      },
      {
        id: 'warm-amber',
        name: 'Warm Amber',
        type: 'color',
        thumb: '#d97706',
        value: '#d97706',
        textColor: '#ffffff'
      }
    ];

    const berryTheme = this.themes.find(t => t.id === 'berry-fuchsia') || this.themes[0];
    this.selectedTheme = berryTheme;
  }

  render(data = {}) {
    const berryTheme = this.themes.find(t => t.id === 'berry-fuchsia') || this.themes[0];
    this.selectedTheme = berryTheme;
    const prefillTitle = data?.prefillTitle || '';

    return `
      <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all duration-300 scale-100 translate-y-0 my-auto flex flex-col max-h-[90vh] overflow-y-auto modal-content-box animate-in fade-in zoom-in duration-200">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">create_new_folder</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Tambah Proyek Baru</h3>
              <p class="text-[11px] text-slate-500">Otomatis membuat ruang kerja baru untuk proyek Anda</p>
            </div>
          </div>
          <button id="btn-close-create-project" class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer" type="button" title="Tutup">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Modal Form -->
        <form id="form-create-project" class="flex flex-col gap-3.5">
          <!-- Nama Proyek -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Proyek *</label>
            <input 
              id="input-ws-project-name" 
              type="text" 
              required 
              value="${prefillTitle}"
              placeholder="Contoh: Kampanye LED Brand Launch Q4" 
              class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
              autofocus
            />
          </div>

          <!-- Kategori / Divisi -->
          <div class="w-full min-w-0">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori / Divisi</label>
            <select 
              id="select-ws-new-workspace-tag" 
              class="w-full max-w-full truncate bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer block"
              style="max-width: 100%; text-overflow: ellipsis; box-sizing: border-box;"
            >
              <option value="Dev / Creative Hub" selected>Dev / Creative</option>
              <option value="Produk / Inovasi">Produk / Inovasi</option>
              <option value="Studio / Digital & AI">Digital & AI</option>
              <option value="SaaS / Security & Core">SaaS & Security</option>
              <option value="Cloud / Infrastruktur">Cloud Infra</option>
              <option value="Marketing / Kampanye">Marketing</option>
            </select>
          </div>

          <!-- Prioritas & Deadline -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
              <select 
                id="select-ws-project-priority" 
                class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
              >
                <option value="Critical">Critical</option>
                <option value="High" selected>High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Target Deadline</label>
              <input 
                id="input-ws-project-due" 
                type="text" 
                placeholder="Contoh: Nov 2026" 
                value="Des 2026" 
                class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>

          <!-- Deskripsi Proyek -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Proyek</label>
            <textarea 
              id="input-ws-project-desc" 
              rows="2" 
              placeholder="Keterangan sasaran proyek dan ruang lingkup pekerjaan..." 
              class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Tema Visual Papan & Preview -->
          <div class="flex flex-col gap-2 pt-1 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700">Tema Visual Papan</label>
              <span id="selected-theme-name-label" class="text-[11px] text-purple-600 font-semibold">${this.selectedTheme.name}</span>
            </div>

            <!-- Mini Live Preview -->
            <div 
              id="board-theme-preview" 
              class="relative w-full h-20 rounded-xl p-3 flex flex-col justify-between shadow-xs border border-slate-200 overflow-hidden transition-all duration-300"
              style="background-image: url('${this.selectedTheme.value}'); background-size: cover; background-position: center;"
            >
              <div class="relative z-10 flex items-center justify-between text-white/90 text-[10px]">
                <span id="preview-theme-badge" class="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded font-medium">Tema: ${this.selectedTheme.name}</span>
                <span id="preview-workspace-badge" class="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded font-mono">WORKSPACE</span>
              </div>
              <div class="relative z-10">
                <span id="preview-board-title" class="text-white text-[13px] font-bold drop-shadow-md truncate block">
                  ${prefillTitle || 'Nama Proyek Baru'}
                </span>
              </div>
            </div>

            <!-- Theme Buttons -->
            <div class="grid grid-cols-8 sm:grid-cols-8 gap-1.5 mt-0.5">
              ${this.themes.map(theme => `
                <button
                  type="button"
                  class="theme-select-btn relative aspect-[14/10] rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${theme.id === this.selectedTheme.id ? 'border-purple-600 ring-2 ring-purple-600/30 scale-105' : 'border-transparent opacity-85 hover:opacity-100'}"
                  data-theme-id="${theme.id}"
                  title="${theme.name}"
                  style="${theme.type === 'image' ? `background-image: url('${theme.thumb}'); background-size: cover; background-position: center;` : `background: ${theme.thumb};`}"
                >
                  <span class="sr-only">${theme.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-slate-100">
            <button 
              id="btn-cancel-create-project" 
              type="button" 
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button 
              id="btn-submit-create-project" 
              type="submit" 
              class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-purple-400/40"
            >
              <span class="material-symbols-outlined text-[16px]">save</span>
              <span>Simpan &amp; Buat Ruang Kerja</span>
            </button>
          </div>
        </form>

      </div>
    `;
  }

  bindEvents(container) {
    const form = container.querySelector('#form-create-project');
    const projectNameInput = container.querySelector('#input-ws-project-name');
    const newWorkspaceInput = container.querySelector('#input-ws-new-workspace-name');
    const workspaceTagSelect = container.querySelector('#select-ws-new-workspace-tag');
    const prioritySelect = container.querySelector('#select-ws-project-priority');
    const dueDateInput = container.querySelector('#input-ws-project-due');

    const previewEl = container.querySelector('#board-theme-preview');
    const previewTitle = container.querySelector('#preview-board-title');
    const previewBadge = container.querySelector('#preview-theme-badge');
    const previewWorkspace = container.querySelector('#preview-workspace-badge');
    const themeNameLabel = container.querySelector('#selected-theme-name-label');
    const themeButtons = container.querySelectorAll('.theme-select-btn');

    const closeBtn = container.querySelector('#btn-close-create-project');
    const cancelBtn = container.querySelector('#btn-cancel-create-project');

    let workspaceUserEdited = false;

    // Focus project name input
    setTimeout(() => {
      if (projectNameInput) projectNameInput.focus();
    }, 100);

    // Live update preview title & auto-fill workspace name
    if (projectNameInput) {
      projectNameInput.addEventListener('input', () => {
        const val = projectNameInput.value.trim();
        if (previewTitle) {
          previewTitle.textContent = val || 'Nama Proyek Baru';
        }

        if (previewWorkspace) {
          previewWorkspace.textContent = (val ? `${val} Hub` : 'WORKSPACE').toUpperCase();
        }
      });
    }

    // Theme selector
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const themeId = btn.getAttribute('data-theme-id');
        const foundTheme = this.themes.find(t => t.id === themeId);
        if (!foundTheme) return;

        this.selectedTheme = foundTheme;

        // Active ring
        themeButtons.forEach(b => {
          b.classList.remove('border-purple-600', 'ring-2', 'ring-purple-600/30', 'scale-105');
          b.classList.add('border-transparent', 'opacity-85');
        });
        btn.classList.add('border-purple-600', 'ring-2', 'ring-purple-600/30', 'scale-105');
        btn.classList.remove('border-transparent', 'opacity-85');

        // Update preview styles
        if (previewEl) {
          if (foundTheme.type === 'image') {
            previewEl.style.background = `url('${foundTheme.value}') center/cover no-repeat`;
          } else {
            previewEl.style.background = foundTheme.value;
          }
        }

        if (previewBadge) {
          previewBadge.textContent = `Tema: ${foundTheme.name}`;
        }
        if (themeNameLabel) {
          themeNameLabel.textContent = foundTheme.name;
        }
      });
    });

    // Close & Cancel
    const handleClose = () => {
      this.modalManager.close(this.modalId);
    };

    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (cancelBtn) cancelBtn.addEventListener('click', handleClose);

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = projectNameInput ? projectNameInput.value.trim() : '';
        const wsTitle = `${name} Hub`;
        const wsTag = workspaceTagSelect ? workspaceTagSelect.value : 'Dev / Creative Hub';
        const priority = prioritySelect ? prioritySelect.value : 'High';
        const dueDate = dueDateInput ? dueDateInput.value : 'Des 2026';
        const budget = budgetInput ? budgetInput.value : 'Rp 85.000.000';
        const description = descInput ? descInput.value.trim() : `Ruang kerja dan deliverable proyek ${name}.`;

        if (!name) {
          if (projectNameInput) projectNameInput.focus();
          return;
        }

        // Generate unique workspace ID
        const slugBase = wsTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ws-baru';
        const newWorkspaceId = `${slugBase}-${Date.now().toString().slice(-4)}`;

        // Color palette for workspace
        const palette = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#f43f5e'];
        const chosenColor = palette[Math.floor(Math.random() * palette.length)];

        const newWorkspace = {
          id: newWorkspaceId,
          title: wsTitle,
          tag: wsTag,
          description: description,
          color: chosenColor,
          isCustom: true,
          iconSvg: `
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          `
        };

        // Persist to custom workspaces in localStorage
        try {
          const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
          custom.unshift(newWorkspace);
          localStorage.setItem('custom_workspaces', JSON.stringify(custom));
        } catch (err) {
          console.error('Error saving custom workspace:', err);
        }

        // Set active workspace
        localStorage.setItem('active_workspace', newWorkspaceId);

        // 1. Create project with full metadata & theme
        const newProject = this.projectService.addProject({
          name: name,
          workspace: newWorkspaceId,
          tag: wsTag,
          priority: priority,
          dueDate: dueDate,
          budget: budget,
          description: description,
          theme: {
            id: this.selectedTheme.id,
            name: this.selectedTheme.name,
            type: this.selectedTheme.type,
            value: this.selectedTheme.value,
            thumb: this.selectedTheme.thumb
          },
          status: 'active',
          progress: 0,
          tasksCount: { total: 3, completed: 0 },
          isUserCreated: true
        });

        // 2. Initialize starter cards in TaskService
        if (this.taskService) {
          const prefix = wsTitle.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'PRJ';
          this.taskService.addTask({
            code: `#${prefix}-101`,
            title: `Kickoff & Ruang Lingkup: ${name}`,
            description: description,
            workspace: newWorkspaceId,
            board: 'sprint-1',
            projectId: newProject.id,
            status: 'in-progress',
            priority: priority,
            pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
            timeline: `${dueDate} (Fase Inisiasi)`,
            hours: 16,
            qaProgress: { passed: 1, total: 3 },
            tags: ['Inisiasi', 'Baru']
          });

          this.taskService.addTask({
            code: `#${prefix}-102`,
            title: `Penyusunan Rencana Kerja & Kebutuhan Ruang Kerja ${wsTitle}`,
            description: 'Setup kebutuhan kolaborasi, pembagian tugas anggota, dan milestone utama.',
            workspace: newWorkspaceId,
            board: 'sprint-1',
            projectId: newProject.id,
            status: 'backlog',
            priority: 'Medium',
            pic: { name: 'Bagas Wicaksono', initials: 'BW', role: 'Design Specialist' },
            timeline: dueDate,
            hours: 12,
            qaProgress: { passed: 0, total: 2 },
            tags: ['Perencanaan']
          });
        }

        // 3. Close modal
        this.modalManager.close(this.modalId);

        // 4. Emit project & workspace events
        this.eventBus.emit('workspace:created', { workspace: newWorkspace });
        this.eventBus.emit('workspace:changed', { workspaceId: newWorkspaceId });
        this.eventBus.emit('project:created', { project: newProject });
        this.eventBus.emit('project:added', { project: newProject });

        // 5. Navigate to dashboard so what was newly created immediately appears on dashboard!
        this.eventBus.emit('navigate', {
          view: 'dashboard'
        });
      });
    }
  }
}

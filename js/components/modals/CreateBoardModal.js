import { BaseModal } from '../../core/BaseModal.js';

/**
 * CreateBoardModal - Single Responsibility Principle (SRP)
 * Modal form for creating a new project / board with customizable themes (photos, gradients, solid colors).
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

    this.selectedTheme = this.themes[0]; // Default to City Skyline
  }

  render(data = {}) {
    this.selectedTheme = this.themes[0];

    return `
      <div class="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col modal-content-box animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="px-5 py-3.5 bg-surface-container-low border-b border-surface-border flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-[#0c66e4] text-white flex items-center justify-center shadow-xs">
              <span class="material-symbols-outlined text-[20px]">dashboard_customize</span>
            </div>
            <div>
              <h3 class="font-headline-md text-[15px] font-bold text-text-primary">Buat Papan Baru</h3>
              <p class="font-caption-meta text-[11px] text-text-secondary">Atur nama proyek dan tema visual papan</p>
            </div>
          </div>
          <button id="btn-close-create-board" class="w-8 h-8 rounded-lg hover:bg-surface-container text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer" type="button">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Form Body -->
        <form id="form-create-board" class="p-5 flex flex-col gap-4">
          
          <!-- Live Preview Card -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Pratinjau Papan</label>
            <div 
              id="board-theme-preview" 
              class="relative w-full h-32 rounded-xl p-4 flex flex-col justify-between shadow-md transition-all duration-300 border border-black/10 overflow-hidden"
              style="background-image: url('${this.selectedTheme.value}'); background-size: cover; background-position: center;"
            >
              <!-- Semi-dark overlay for readability -->
              <div class="absolute inset-0 bg-black/25 backdrop-blur-[1px] pointer-events-none"></div>

              <!-- Top dummy kanban columns icons -->
              <div class="relative z-10 flex items-center justify-between text-white/80 text-[11px]">
                <div class="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-md font-mono text-[10px]">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span id="preview-theme-badge">Tema: ${this.selectedTheme.name}</span>
                </div>
                <div class="flex items-center gap-1">
                  <div class="w-5 h-5 rounded bg-white/20"></div>
                  <div class="w-5 h-5 rounded bg-white/20"></div>
                  <div class="w-5 h-5 rounded bg-white/20"></div>
                </div>
              </div>

              <!-- Board Title in Preview -->
              <div class="relative z-10">
                <span id="preview-board-title" class="text-white text-[16px] font-bold drop-shadow-md tracking-tight block truncate">
                  Nama Proyek Baru
                </span>
                <span class="text-white/80 text-[11px] drop-shadow-sm block">
                  Papan Kanban • Sampulkreativ Workspace
                </span>
              </div>
            </div>
          </div>

          <!-- Board Title Input -->
          <div class="flex flex-col gap-1.5">
            <label for="board-title-input" class="text-[12px] font-bold text-text-primary flex items-center justify-between">
              <span>Judul Papan / Nama Proyek <span class="text-rose-500">*</span></span>
              <span class="text-[11px] text-text-muted font-normal">Wajib diisi</span>
            </label>
            <input
              id="board-title-input"
              type="text"
              required
              placeholder="Contoh: Redesign Aplikasi Mobile, Campaign Q4, dsb."
              class="w-full px-3 py-2 bg-surface-container-low border border-surface-border rounded-xl text-text-primary placeholder:text-text-muted text-[13px] font-medium focus:outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20 transition-all"
              autofocus
            />
            <p id="board-title-error" class="text-rose-600 text-[11px] hidden font-medium">Harap masukkan judul papan terlebih dahulu.</p>
          </div>

          <!-- Theme Selector -->
          <div class="flex flex-col gap-2">
            <label class="text-[12px] font-bold text-text-primary flex items-center justify-between">
              <span>Pilih Tema Latar Belakang</span>
              <span id="selected-theme-name-label" class="text-[11px] text-[#0c66e4] font-semibold">${this.selectedTheme.name}</span>
            </label>

            <!-- Wallpapers & Photos -->
            <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider">Wallpaper Foto</span>
            <div class="grid grid-cols-6 gap-2">
              ${this.themes.filter(t => t.type === 'image').map(theme => `
                <button
                  type="button"
                  class="theme-select-btn relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${theme.id === this.selectedTheme.id ? 'border-[#0c66e4] ring-2 ring-[#0c66e4]/40 scale-105' : 'border-transparent opacity-85 hover:opacity-100'}"
                  data-theme-id="${theme.id}"
                  title="${theme.name}"
                  style="background-image: url('${theme.thumb}'); background-size: cover; background-position: center;"
                >
                  <span class="sr-only">${theme.name}</span>
                </button>
              `).join('')}
            </div>

            <!-- Gradients -->
            <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Gradien Modern</span>
            <div class="grid grid-cols-6 gap-2">
              ${this.themes.filter(t => t.type === 'gradient').map(theme => `
                <button
                  type="button"
                  class="theme-select-btn relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${theme.id === this.selectedTheme.id ? 'border-[#0c66e4] ring-2 ring-[#0c66e4]/40 scale-105' : 'border-transparent opacity-85 hover:opacity-100'}"
                  data-theme-id="${theme.id}"
                  title="${theme.name}"
                  style="background: ${theme.thumb};"
                >
                  <span class="sr-only">${theme.name}</span>
                </button>
              `).join('')}
            </div>

            <!-- Colors -->
            <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Warna Solid</span>
            <div class="grid grid-cols-4 gap-2">
              ${this.themes.filter(t => t.type === 'color').map(theme => `
                <button
                  type="button"
                  class="theme-select-btn relative h-7 rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${theme.id === this.selectedTheme.id ? 'border-[#0c66e4] ring-2 ring-[#0c66e4]/40 scale-105' : 'border-transparent opacity-85 hover:opacity-100'}"
                  data-theme-id="${theme.id}"
                  title="${theme.name}"
                  style="background-color: ${theme.thumb};"
                >
                  <span class="sr-only">${theme.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Workspace / Visibility Dropdown -->
          <div class="grid grid-cols-2 gap-3 pt-1 border-t border-surface-border">
            <div class="flex flex-col gap-1">
              <label for="board-workspace-select" class="text-[11px] font-semibold text-text-secondary">Ruang Kerja</label>
              <select
                id="board-workspace-select"
                class="w-full px-2.5 py-1.5 bg-surface-container-low border border-surface-border rounded-lg text-text-primary text-[12px] focus:outline-none focus:border-[#0c66e4]"
              >
                <option value="ruangkreasi">RuangKreasi (Studio Dev)</option>
                <option value="layarbaca">LayarBaca (Produk)</option>
                <option value="aikreativ">AIKreativ (AI Studio)</option>
                <option value="panen-kunci">Panen Kunci (SaaS)</option>
                <option value="sharinginaja">Sharinginaja (Cloud)</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label for="board-visibility-select" class="text-[11px] font-semibold text-text-secondary">Visibilitas</label>
              <select
                id="board-visibility-select"
                class="w-full px-2.5 py-1.5 bg-surface-container-low border border-surface-border rounded-lg text-text-primary text-[12px] focus:outline-none focus:border-[#0c66e4]"
              >
                <option value="workspace">Ruang Kerja (Semua Anggota)</option>
                <option value="private">Privat (Hanya Saya)</option>
                <option value="public">Publik (Organisasi)</option>
              </select>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="pt-3 border-t border-surface-border flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-create-board"
              type="button"
              class="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container text-[13px] font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-create-board"
              type="submit"
              class="px-5 py-2 rounded-xl bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[13px] font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Buat Papan</span>
            </button>
          </div>

        </form>
      </div>
    `;
  }

  bindEvents(container) {
    const form = container.querySelector('#form-create-board');
    const titleInput = container.querySelector('#board-title-input');
    const titleError = container.querySelector('#board-title-error');
    const previewEl = container.querySelector('#board-theme-preview');
    const previewTitle = container.querySelector('#preview-board-title');
    const previewBadge = container.querySelector('#preview-theme-badge');
    const themeNameLabel = container.querySelector('#selected-theme-name-label');
    const themeButtons = container.querySelectorAll('.theme-select-btn');
    const closeBtn = container.querySelector('#btn-close-create-board');
    const cancelBtn = container.querySelector('#btn-cancel-create-board');
    const workspaceSelect = container.querySelector('#board-workspace-select');

    // Auto focus title input
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 100);

    // Live update preview title
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        const val = titleInput.value.trim();
        if (previewTitle) {
          previewTitle.textContent = val || 'Nama Proyek Baru';
        }
        if (titleError) {
          titleError.classList.add('hidden');
        }
      });
    }

    // Theme buttons click handler
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const themeId = btn.getAttribute('data-theme-id');
        const foundTheme = this.themes.find(t => t.id === themeId);
        if (!foundTheme) return;

        this.selectedTheme = foundTheme;

        // Update active class on buttons
        themeButtons.forEach(b => {
          b.classList.remove('border-[#0c66e4]', 'ring-2', 'ring-[#0c66e4]/40', 'scale-105');
          b.classList.add('border-transparent', 'opacity-85');
        });
        btn.classList.add('border-[#0c66e4]', 'ring-2', 'ring-[#0c66e4]/40', 'scale-105');
        btn.classList.remove('border-transparent', 'opacity-85');

        // Update preview styles
        if (previewEl) {
          if (foundTheme.type === 'image') {
            previewEl.style.background = `url('${foundTheme.value}') center/cover no-repeat`;
          } else if (foundTheme.type === 'gradient') {
            previewEl.style.background = foundTheme.value;
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

    // Close / Cancel handlers
    const handleClose = () => {
      this.modalManager.close(this.modalId);
    };

    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (cancelBtn) cancelBtn.addEventListener('click', handleClose);

    // Form submit
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = titleInput ? titleInput.value.trim() : '';

        if (!title) {
          if (titleError) titleError.classList.remove('hidden');
          if (titleInput) titleInput.focus();
          return;
        }

        const workspace = workspaceSelect ? workspaceSelect.value : 'ruangkreasi';

        // 1. Create project with theme
        const newProject = this.projectService.addProject({
          name: title,
          workspace: workspace,
          theme: {
            id: this.selectedTheme.id,
            name: this.selectedTheme.name,
            type: this.selectedTheme.type,
            value: this.selectedTheme.value,
            thumb: this.selectedTheme.thumb
          },
          status: 'active',
          progress: 0,
          tasksCount: { total: 3, completed: 0 }
        });

        // 2. Initialize starter cards in TaskService for this project
        if (this.taskService) {
          const starterTasks = [
            {
              title: `Riset Kebutuhan & Brief Awal: ${title}`,
              workspace: workspace,
              projectId: newProject.id,
              status: 'backlog',
              priority: 'High',
              pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' }
            },
            {
              title: `Desain Mockup & Alur Kerja ${title}`,
              workspace: workspace,
              projectId: newProject.id,
              status: 'in-progress',
              priority: 'Critical',
              pic: { name: 'Bagas Wicaksono', initials: 'BW', role: 'Graphic Specialist' }
            },
            {
              title: `Setup Lingkungan & Asset Starter`,
              workspace: workspace,
              projectId: newProject.id,
              status: 'review-qa',
              priority: 'Medium',
              pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' }
            }
          ];

          starterTasks.forEach(task => this.taskService.addTask(task));
        }

        // 3. Close modal
        this.modalManager.close(this.modalId);

        // 4. Immediately navigate directly to the new project's Kanban board!
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: newProject.id,
          workspace: workspace
        });
      });
    }
  }
}

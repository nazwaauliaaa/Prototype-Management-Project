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

    // Predefined rich themes (Wallpapers, Gradients, Colors) matching Creative Office modern theme
    this.themes = [
      // 1. Modern Creative Workspaces & Studio Aesthetics (Wallpapers)
      {
        id: 'studio-creative',
        name: 'Creative Studio',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'office-hub',
        name: 'Modern Office',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'minimal-desk',
        name: 'Minimalist Desk',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'tech-lab',
        name: 'Design Lab',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'fluid-indigo',
        name: 'Fluid Mesh 3D',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },
      {
        id: 'modern-arch',
        name: 'Modern Architecture',
        type: 'image',
        thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
        value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
        textColor: '#ffffff'
      },

      // 2. Curated Luxury & Elegant Gradients (CreativOffice Signature)
      {
        id: 'obsidian-violet',
        name: 'Obsidian Violet',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #0b061a 0%, #1e113b 50%, #3b1d75 100%)',
        value: 'linear-gradient(135deg, #0b061a 0%, #1e113b 50%, #3b1d75 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'royal-sapphire',
        name: 'Royal Sapphire',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #040d21 0%, #0a2540 50%, #173b6c 100%)',
        value: 'linear-gradient(135deg, #040d21 0%, #0a2540 50%, #173b6c 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'emerald-imperial',
        name: 'Emerald Imperial',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #021a14 0%, #064032 50%, #0c624d 100%)',
        value: 'linear-gradient(135deg, #021a14 0%, #064032 50%, #0c624d 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'midnight-slate',
        name: 'Midnight Slate',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #090a0f 0%, #161a23 50%, #282e3d 100%)',
        value: 'linear-gradient(135deg, #090a0f 0%, #161a23 50%, #282e3d 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'velvet-bordeaux',
        name: 'Velvet Bordeaux',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #1f0409 0%, #3e0b17 50%, #681628 100%)',
        value: 'linear-gradient(135deg, #1f0409 0%, #3e0b17 50%, #681628 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'champagne-bronze',
        name: 'Champagne Bronze',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #1c1006 0%, #38210c 50%, #5d3613 100%)',
        value: 'linear-gradient(135deg, #1c1006 0%, #38210c 50%, #5d3613 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'amethyst-royale',
        name: 'Amethyst Royale',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #170426 0%, #330d52 50%, #59168f 100%)',
        value: 'linear-gradient(135deg, #170426 0%, #330d52 50%, #59168f 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'nordic-twilight',
        name: 'Nordic Twilight',
        type: 'gradient',
        thumb: 'linear-gradient(135deg, #03171e 0%, #073b4c 50%, #118ab2 100%)',
        value: 'linear-gradient(135deg, #03171e 0%, #073b4c 50%, #118ab2 100%)',
        textColor: '#ffffff'
      },

      // 3. Modern Pro Colors (Clean Minimalist Accents)
      {
        id: 'brand-indigo',
        name: 'Brand Indigo',
        type: 'color',
        thumb: '#4f46e5',
        value: '#4f46e5',
        textColor: '#ffffff'
      },
      {
        id: 'creative-violet',
        name: 'Creative Violet',
        type: 'color',
        thumb: '#7c3aed',
        value: '#7c3aed',
        textColor: '#ffffff'
      },
      {
        id: 'deep-slate',
        name: 'Deep Slate',
        type: 'color',
        thumb: '#1e293b',
        value: '#1e293b',
        textColor: '#ffffff'
      },
      {
        id: 'emerald-green',
        name: 'Emerald Green',
        type: 'color',
        thumb: '#059669',
        value: '#059669',
        textColor: '#ffffff'
      }
    ];

    const defaultTheme = this.themes.find(t => t.id === 'creative-indigo') || this.themes[0];
    this.selectedTheme = defaultTheme;
  }

  render(data = {}) {
    const defaultTheme = this.themes.find(t => t.id === 'creative-indigo') || this.themes[0];
    this.selectedTheme = defaultTheme;
    const prefillTitle = data?.prefillTitle || '';

    return `
      <div class="relative w-full max-w-lg bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-purple-950/80 p-6 overflow-hidden transform transition-all duration-300 scale-100 translate-y-0 my-auto flex flex-col max-h-[90vh] overflow-y-auto modal-content-box animate-in fade-in zoom-in duration-200 text-white">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">create_new_folder</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Tambah Proyek Baru</h3>
              <p class="text-[11px] text-white/60">Otomatis membuat ruang kerja baru untuk proyek Anda</p>
            </div>
          </div>
          <button id="btn-close-create-project" class="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer" type="button" title="Tutup">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Modal Form -->
        <form id="form-create-project" class="flex flex-col gap-3.5">
          <!-- Nama Proyek -->
          <div>
            <label class="block text-xs font-semibold text-white/80 mb-1">Nama Proyek *</label>
            <input 
              id="input-ws-project-name" 
              type="text" 
              required 
              value="${prefillTitle}"
              placeholder="Contoh: Kampanye LED Brand Launch Q4" 
              class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
              autofocus
            />
          </div>

          <!-- Kategori / Divisi (In-Modal Custom Dropdown, 100% Mobile Safe) -->
          <div class="w-full min-w-0 relative z-30" id="wrapper-custom-board-category">
            <label class="block text-xs font-semibold text-white/80 mb-1">Kategori / Divisi</label>
            
            <select id="select-ws-new-workspace-tag" class="hidden">
              <option value="Dev / Creative Hub" selected>Dev / Creative</option>
              <option value="Produk / Inovasi">Produk / Inovasi</option>
              <option value="Studio / Digital & AI">Digital & AI</option>
              <option value="SaaS / Security & Core">SaaS & Security</option>
              <option value="Cloud / Infrastruktur">Cloud Infra</option>
              <option value="Marketing / Kampanye">Marketing</option>
            </select>

            <button
              type="button"
              id="btn-custom-board-category-trigger"
              class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-purple-400 text-white text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              aria-expanded="false"
            >
              <span id="custom-board-category-text" class="truncate font-medium">Dev / Creative</span>
              <span class="material-symbols-outlined text-[18px] text-white/40 transition-transform duration-200 shrink-0" id="custom-board-category-chevron">expand_more</span>
            </button>

            <div
              id="custom-board-category-menu"
              class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <button type="button" class="btn-board-category-option w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-white/10 hover:text-white text-purple-300 bg-purple-600/20 transition-colors cursor-pointer border-l-2 border-purple-400" data-value="Dev / Creative Hub" data-label="Dev / Creative">
                <span class="truncate">Dev / Creative</span>
                <span class="material-symbols-outlined text-[16px] text-purple-300 shrink-0">check</span>
              </button>
              <button type="button" class="btn-board-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Produk / Inovasi" data-label="Produk / Inovasi">
                <span class="truncate">Produk / Inovasi</span>
              </button>
              <button type="button" class="btn-board-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Studio / Digital & AI" data-label="Digital & AI">
                <span class="truncate">Digital & AI</span>
              </button>
              <button type="button" class="btn-board-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="SaaS / Security & Core" data-label="SaaS & Security">
                <span class="truncate">SaaS & Security</span>
              </button>
              <button type="button" class="btn-board-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Cloud / Infrastruktur" data-label="Cloud Infra">
                <span class="truncate">Cloud Infra</span>
              </button>
              <button type="button" class="btn-board-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Marketing / Kampanye" data-label="Marketing">
                <span class="truncate">Marketing</span>
              </button>
            </div>
          </div>

          <!-- Prioritas & Deadline (Responsive: 1 col on mobile, 2 col on sm+) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative z-20" id="wrapper-custom-board-priority">
              <label class="block text-xs font-semibold text-white/80 mb-1">Prioritas</label>
              
              <select id="select-ws-project-priority" class="hidden">
                <option value="Critical">Critical</option>
                <option value="High" selected>High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <button
                type="button"
                id="btn-custom-board-priority-trigger"
                class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-purple-400 text-white text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                aria-expanded="false"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span id="custom-board-priority-dot" class="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500"></span>
                  <span id="custom-board-priority-text" class="truncate font-medium">High</span>
                </div>
                <span class="material-symbols-outlined text-[18px] text-white/40 transition-transform duration-200 shrink-0" id="custom-board-priority-chevron">expand_more</span>
              </button>

              <div
                id="custom-board-priority-menu"
                class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <button type="button" class="btn-board-priority-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 text-white/80 transition-colors cursor-pointer" data-value="Critical" data-label="Critical" data-color="bg-rose-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-rose-500"></span>
                    <span class="truncate">Critical</span>
                  </div>
                </button>
                <button type="button" class="btn-board-priority-option w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-white/10 text-purple-300 bg-purple-600/20 transition-colors cursor-pointer border-l-2 border-purple-400" data-value="High" data-label="High" data-color="bg-amber-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500"></span>
                    <span class="truncate">High</span>
                  </div>
                  <span class="material-symbols-outlined text-[16px] text-purple-300 shrink-0">check</span>
                </button>
                <button type="button" class="btn-board-priority-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 text-white/80 transition-colors cursor-pointer" data-value="Medium" data-label="Medium" data-color="bg-blue-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500"></span>
                    <span class="truncate">Medium</span>
                  </div>
                </button>
                <button type="button" class="btn-board-priority-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 text-white/80 transition-colors cursor-pointer" data-value="Low" data-label="Low" data-color="bg-slate-400">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400"></span>
                    <span class="truncate">Low</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-white/80 mb-1">Target Deadline</label>
              <input 
                id="input-ws-project-due" 
                type="text" 
                placeholder="Contoh: Nov 2026" 
                value="Des 2026" 
                class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
              />
            </div>
          </div>

          <!-- Deskripsi Proyek -->
          <div>
            <label class="block text-xs font-semibold text-white/80 mb-1">Deskripsi Proyek</label>
            <textarea 
              id="input-ws-project-desc" 
              rows="2" 
              placeholder="Keterangan sasaran proyek dan ruang lingkup pekerjaan..." 
              class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Tema Visual Papan & Preview -->
          <div class="flex flex-col gap-2 pt-1 border-t border-white/10">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-white/80">Tema Visual Papan</label>
              <span id="selected-theme-name-label" class="text-[11px] text-purple-300 font-semibold">${this.selectedTheme.name}</span>
            </div>

            <!-- Mini Live Preview -->
            <div 
              id="board-theme-preview" 
              class="relative w-full h-20 rounded-xl p-3 flex flex-col justify-between shadow-md border border-white/15 overflow-hidden transition-all duration-300"
              style="${this.selectedTheme.type === 'image' ? `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${this.selectedTheme.value}') center center / cover no-repeat;` : `background: ${this.selectedTheme.value};`}"
            >
              <div class="relative z-10 flex items-center justify-between text-white/90 text-[10px]">
                <span id="preview-theme-badge" class="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded font-medium">Tema: ${this.selectedTheme.name}</span>
                <span id="preview-workspace-badge" class="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded font-mono">WORKSPACE</span>
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
                  class="theme-select-btn relative aspect-[14/10] rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${theme.id === this.selectedTheme.id ? 'border-purple-400 ring-2 ring-purple-400/40 scale-105' : 'border-white/10 opacity-75 hover:opacity-100 hover:border-white/30'}"
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
          <div class="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-white/10">
            <button 
              id="btn-cancel-create-project" 
              type="button" 
              class="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button 
              id="btn-submit-create-project" 
              type="submit" 
              class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-600/30 hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-purple-400/40"
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
    const descInput = container.querySelector('#input-ws-project-desc');
    const budgetInput = container.querySelector('#input-ws-project-budget');

    const previewEl = container.querySelector('#board-theme-preview');
    const previewTitle = container.querySelector('#preview-board-title');
    const previewBadge = container.querySelector('#preview-theme-badge');
    const previewWorkspace = container.querySelector('#preview-workspace-badge');
    const themeNameLabel = container.querySelector('#selected-theme-name-label');
    const themeButtons = container.querySelectorAll('.theme-select-btn');

    const closeBtn = container.querySelector('#btn-close-create-project');
    const cancelBtn = container.querySelector('#btn-cancel-create-project');

    let workspaceUserEdited = false;

    // Custom Priority Dropdown handlers (declared early to prevent TDZ)
    const wrapperPrio = container.querySelector('#wrapper-custom-board-priority');
    const prioTrigger = container.querySelector('#btn-custom-board-priority-trigger');
    const prioMenu = container.querySelector('#custom-board-priority-menu');
    const prioChevron = container.querySelector('#custom-board-priority-chevron');
    const prioText = container.querySelector('#custom-board-priority-text');
    const prioDot = container.querySelector('#custom-board-priority-dot');
    const prioOptions = container.querySelectorAll('.btn-board-priority-option');

    const togglePrioMenu = (show) => {
      if (!prioMenu) return;
      const willOpen = show !== undefined ? show : prioMenu.classList.contains('hidden');
      if (willOpen) {
        if (wrapperPrio) wrapperPrio.style.zIndex = '50';
        prioMenu.classList.remove('hidden');
        if (prioChevron) prioChevron.classList.add('rotate-180');
        if (prioTrigger) prioTrigger.setAttribute('aria-expanded', 'true');
        if (catMenu && !catMenu.classList.contains('hidden')) toggleCatMenu(false);
      } else {
        if (wrapperPrio) wrapperPrio.style.zIndex = '';
        prioMenu.classList.add('hidden');
        if (prioChevron) prioChevron.classList.remove('rotate-180');
        if (prioTrigger) prioTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    // Custom Category Dropdown handlers (confined within modal)
    const wrapperCat = container.querySelector('#wrapper-custom-board-category');
    const catTrigger = container.querySelector('#btn-custom-board-category-trigger');
    const catMenu = container.querySelector('#custom-board-category-menu');
    const catChevron = container.querySelector('#custom-board-category-chevron');
    const catText = container.querySelector('#custom-board-category-text');
    const catOptions = container.querySelectorAll('.btn-board-category-option');

    const toggleCatMenu = (show) => {
      if (!catMenu) return;
      const willOpen = show !== undefined ? show : catMenu.classList.contains('hidden');
      if (willOpen) {
        if (wrapperCat) wrapperCat.style.zIndex = '50';
        catMenu.classList.remove('hidden');
        if (catChevron) catChevron.classList.add('rotate-180');
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'true');
        if (prioMenu && !prioMenu.classList.contains('hidden')) togglePrioMenu(false);
      } else {
        if (wrapperCat) wrapperCat.style.zIndex = '';
        catMenu.classList.add('hidden');
        if (catChevron) catChevron.classList.remove('rotate-180');
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    if (catTrigger) {
      catTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCatMenu();
      });
    }

    catOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        const label = opt.getAttribute('data-label');
        if (workspaceTagSelect) workspaceTagSelect.value = val;
        if (catText) catText.textContent = label;

        catOptions.forEach(o => {
          const isMatch = o.getAttribute('data-value') === val;
          o.className = `btn-board-category-option w-full px-3 py-2 text-left text-xs ${isMatch ? 'font-semibold text-purple-300 bg-purple-600/20 border-l-2 border-purple-400' : 'font-medium text-white/80'} flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer`;
          const existingCheck = o.querySelector('.material-symbols-outlined');
          if (isMatch && !existingCheck) {
            const check = document.createElement('span');
            check.className = 'material-symbols-outlined text-[16px] text-purple-300 shrink-0';
            check.textContent = 'check';
            o.appendChild(check);
          } else if (!isMatch && existingCheck) {
            existingCheck.remove();
          }
        });
        toggleCatMenu(false);
      });
    });

    if (prioTrigger) {
      prioTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePrioMenu();
      });
    }

    prioOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        const label = opt.getAttribute('data-label');
        const color = opt.getAttribute('data-color');
        if (prioritySelect) prioritySelect.value = val;
        if (prioText) prioText.textContent = label;
        if (prioDot) prioDot.className = `w-2.5 h-2.5 rounded-full shrink-0 ${color}`;

        prioOptions.forEach(o => {
          const isMatch = o.getAttribute('data-value') === val;
          o.className = `btn-board-priority-option w-full px-3 py-2 text-left text-xs ${isMatch ? 'font-semibold text-purple-300 bg-purple-600/20 border-l-2 border-purple-400' : 'font-medium text-white/80'} flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer`;
          const existingCheck = o.querySelector('.material-symbols-outlined');
          if (isMatch && !existingCheck) {
            const check = document.createElement('span');
            check.className = 'material-symbols-outlined text-[16px] text-purple-300 shrink-0';
            check.textContent = 'check';
            o.appendChild(check);
          } else if (!isMatch && existingCheck) {
            existingCheck.remove();
          }
        });
        togglePrioMenu(false);
      });
    });

    const handleOutsideClick = (e) => {
      if (!container.isConnected) {
        document.removeEventListener('click', handleOutsideClick);
        return;
      }
      if (!catTrigger?.contains(e.target) && !catMenu?.contains(e.target)) {
        toggleCatMenu(false);
      }
      if (!prioTrigger?.contains(e.target) && !prioMenu?.contains(e.target)) {
        togglePrioMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);

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
          b.classList.remove('border-purple-400', 'ring-2', 'ring-purple-400/40', 'scale-105');
          b.classList.add('border-white/10', 'opacity-75');
        });
        btn.classList.add('border-purple-400', 'ring-2', 'ring-purple-400/40', 'scale-105');
        btn.classList.remove('border-white/10', 'opacity-75');

        // Update preview styles
        if (previewEl) {
          if (foundTheme.type === 'image') {
            previewEl.style.background = `linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${foundTheme.value}') center center / cover no-repeat`;
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

        const activeTheme = this.selectedTheme || this.themes[0] || {
          id: 'minimal-desk',
          name: 'Minimalist Desk',
          type: 'image',
          value: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80'
        };

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
            id: activeTheme.id,
            name: activeTheme.name,
            type: activeTheme.type,
            value: activeTheme.value,
            thumb: activeTheme.thumb || activeTheme.value
          },
          status: 'active',
          progress: 0,
          tasksCount: { total: 2, completed: 0 },
          isUserCreated: true
        });

        localStorage.setItem('active_project_id', newProject.id);

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

        if (this.notificationService) {
          this.notificationService.success(`Papan proyek "${name}" berhasil dibuat!`);
        }

        // 4. Emit project & workspace events
        this.eventBus.emit('workspace:created', { workspace: newWorkspace });
        this.eventBus.emit('workspace:changed', { workspaceId: newWorkspaceId });
        this.eventBus.emit('project:created', { project: newProject });
        this.eventBus.emit('project:added', { project: newProject });

        // 5. Navigate to kanban so what was newly created immediately opens!
        window.location.hash = `#/kanban/${newProject.id}`;
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: newProject.id,
          workspace: newWorkspaceId
        });
      });
    }
  }
}

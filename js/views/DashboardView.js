import { BaseView } from '../core/BaseView.js';

/**
 * DashboardView - Single Responsibility Principle (SRP)
 * Minimalist, clean Trello-style Home/Dashboard showing:
 * 1. Most popular templates carousel/grid
 * 2. Recently viewed & Your Boards with custom visual themes
 * 3. "+ Create new board" action card
 */
export class DashboardView extends BaseView {
  constructor(container) {
    super(container);
    this.projectService = container.resolve('ProjectService');
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
  }

  render() {
    const projects = this.projectService ? this.projectService.getAllProjects() : [];

    // Predefined popular templates (as seen in Trello screenshot)
    const templates = [
      {
        id: 'tmpl-project-mgmt',
        title: 'Project Management',
        badge: 'Template',
        bg: 'linear-gradient(135deg, #0079bf 0%, #00aecc 100%)',
        mockupImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=70'
      },
      {
        id: 'tmpl-scrum',
        title: 'Scrum',
        badge: 'Template',
        bg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
        mockupImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=70'
      },
      {
        id: 'tmpl-bug-tracking',
        title: 'Bug Tracking',
        badge: 'Template',
        bg: 'linear-gradient(135deg, #0284c7 0%, #60a5fa 100%)',
        mockupImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=300&q=70'
      },
      {
        id: 'tmpl-web-design',
        title: 'Web Design Process',
        badge: 'Template',
        bg: 'linear-gradient(135deg, #0284c7 0%, #22d3ee 100%)',
        mockupImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=70'
      }
    ];

    return `
      <div class="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 gap-8">

        <!-- 1. TEMPLATES SECTION (Matching Trello layout) -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-text-secondary">space_dashboard</span>
              <h2 class="text-[17px] font-bold text-text-primary tracking-tight">Most popular templates</h2>
            </div>
            <button id="btn-close-templates" class="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-container transition-colors" title="Tutup saran template" type="button">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <p class="text-[12.5px] text-text-secondary -mt-1">
            Get going faster with a template from the community or create your own custom workflow.
          </p>

          <!-- Template Cards Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
            ${templates.map(tmpl => `
              <div 
                class="template-card group relative h-24 sm:h-28 rounded-xl overflow-hidden p-3 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between border border-black/10 active:scale-[0.98]"
                data-template-id="${tmpl.id}"
                data-template-title="${tmpl.title}"
                style="background: ${tmpl.bg};"
                role="button"
                tabindex="0"
              >
                <!-- Subtle translucent overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 group-hover:from-black/60 transition-colors"></div>

                <span class="relative z-10 font-bold text-white text-[13px] sm:text-[14px] leading-snug drop-shadow-sm">
                  ${tmpl.title}
                </span>

                <div class="relative z-10 flex items-center justify-between text-white/80 text-[10px]">
                  <span class="bg-black/25 backdrop-blur-xs px-1.5 py-0.5 rounded font-medium">${tmpl.badge}</span>
                  <span class="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">north_east</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>


        <!-- 2. RECENTLY VIEWED & YOUR BOARDS (Papan Proyek Anda) -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-text-secondary">schedule</span>
              <h2 class="text-[17px] font-bold text-text-primary tracking-tight">Recently viewed</h2>
            </div>
          </div>

          <!-- Boards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            ${projects.map(project => {
              const theme = project.theme || {
                type: 'image',
                value: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
                name: 'City Skyline'
              };

              let bgStyle = '';
              if (theme.type === 'image') {
                bgStyle = `background: url('${theme.value}') center/cover no-repeat;`;
              } else if (theme.type === 'gradient') {
                bgStyle = `background: ${theme.value};`;
              } else {
                bgStyle = `background-color: ${theme.value};`;
              }

              return `
                <div 
                  class="board-card group relative h-28 sm:h-32 rounded-xl overflow-hidden p-3.5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between border border-black/10 active:scale-[0.98]"
                  data-project-id="${project.id}"
                  data-workspace="${project.workspace || 'ruangkreasi'}"
                  style="${bgStyle}"
                  role="button"
                  tabindex="0"
                  title="Buka papan ${project.name}"
                >
                  <!-- Dark glass backdrop for clear readable title -->
                  <div class="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors"></div>

                  <!-- Board Title -->
                  <div class="relative z-10 flex flex-col">
                    <h3 class="font-bold text-white text-[15px] sm:text-[16px] leading-tight drop-shadow-md truncate group-hover:text-white">
                      ${project.name}
                    </h3>
                    <span class="text-white/80 text-[11px] font-medium drop-shadow-sm mt-0.5 truncate">
                      ${project.workspace ? project.workspace.toUpperCase() : 'WORKSPACE'}
                    </span>
                  </div>

                  <!-- Bottom Footer inside card -->
                  <div class="relative z-10 flex items-center justify-between text-white/90 text-[11px]">
                    <span class="bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md font-mono text-[10.5px]">
                      ${project.tasksCount ? `${project.tasksCount.total} Tugas` : 'Kanban'}
                    </span>
                    <div class="w-6 h-6 rounded-md bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:bg-[#0c66e4] group-hover:text-white transition-colors">
                      <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}

            <!-- "+ Create new board" Card -->
            <div 
              id="btn-card-create-board"
              class="h-28 sm:h-32 rounded-xl bg-surface-container hover:bg-surface-container-high border-2 border-dashed border-surface-border hover:border-[#0c66e4]/50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5 text-text-secondary hover:text-[#0c66e4] shadow-xs active:scale-[0.98] group p-3 text-center"
              role="button"
              tabindex="0"
            >
              <div class="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-text-muted group-hover:text-[#0c66e4] shadow-xs group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[20px]">add</span>
              </div>
              <span class="text-[13px] font-semibold">Create new board</span>
              <span class="text-[10px] text-text-muted">Pilih tema & mulai alur kerja</span>
            </div>

          </div>
        </section>

      </div>
    `;
  }

  bindEvents() {
    // 1. Board cards navigation -> Immediately opens Kanban board for that project!
    const boardCards = this.element.querySelectorAll('.board-card');
    boardCards.forEach(card => {
      const openBoard = () => {
        const projectId = card.getAttribute('data-project-id');
        const workspace = card.getAttribute('data-workspace') || 'ruangkreasi';
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: projectId,
          workspace: workspace
        });
      };

      card.addEventListener('click', openBoard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openBoard();
        }
      });
    });

    // 2. "+ Create new board" card click
    const createBoardCard = this.element.querySelector('#btn-card-create-board');
    if (createBoardCard) {
      const openCreateModal = () => {
        if (this.modalManager) {
          this.modalManager.open('create-board');
        }
      };
      createBoardCard.addEventListener('click', openCreateModal);
      createBoardCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCreateModal();
        }
      });
    }

    // 3. Template cards click -> Opens create board modal with pre-filled title
    const templateCards = this.element.querySelectorAll('.template-card');
    templateCards.forEach(card => {
      card.addEventListener('click', () => {
        const title = card.getAttribute('data-template-title');
        if (this.modalManager) {
          this.modalManager.open('create-board', { prefillTitle: title });
        }
      });
    });

    // 4. Close templates button (can hide template section)
    const closeTemplatesBtn = this.element.querySelector('#btn-close-templates');
    if (closeTemplatesBtn) {
      closeTemplatesBtn.addEventListener('click', () => {
        const section = closeTemplatesBtn.closest('section');
        if (section) section.style.display = 'none';
      });
    }
  }
}

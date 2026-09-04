import { BaseView } from '../core/BaseView.js';

/**
 * GanttTimelineView - Single Responsibility Principle (SRP)
 * Renders master launch roadmap and interactive Gantt chart timeline for RuangKreasi Q3.
 */
export class GanttTimelineView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
  }

  render() {
    const tasks = this.taskService.getTasks('ruangkreasi');

    return `
      <div class="flex flex-col w-full px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Header -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-gantt">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-text-primary font-medium">RuangKreasi</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold">Timeline & Gantt Roadmap Q3</span>
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="font-headline-lg text-[20px] text-on-surface font-bold tracking-tight">
                Timeline & Gantt Chart Peluncuran RuangKreasi
              </h1>
              <p class="font-caption-meta text-[11px] text-text-secondary">
                Pelacakan milestone, dependensi deliverable antar pilar, dan simulasi penayangan serentak 14 titik Jabodetabek.
              </p>
            </div>

            <!-- Milestone Progress Pill -->
            <div class="flex items-center gap-4 bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm border border-surface-border">
              <div class="flex flex-col">
                <span class="font-badge-micro text-[10px] text-text-muted uppercase">TARGET GRAND LAUNCH</span>
                <span class="font-body-medium text-[13px] text-primary font-bold">25 Agustus 2024 (H-5)</span>
              </div>
              <div class="w-px h-6 bg-surface-border"></div>
              <div class="flex flex-col">
                <span class="font-badge-micro text-[10px] text-text-muted uppercase">KESIAPAN GLOBAL</span>
                <span class="font-body-medium text-[13px] text-status-success font-bold">78% On-Track</span>
              </div>
            </div>
          </div>
        </div>

        <!-- View Switcher Bar -->
        <div class="flex items-center justify-between border-b border-surface-border mb-6">
          <div class="flex items-center gap-1 -mb-px overflow-x-auto">
            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="kanban">
              <span class="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Kanban View</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="project-table">
              <span class="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Tabel (Monday Style)</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="docs-sheets">
              <span class="material-symbols-outlined text-[18px]">description</span>
              <span>Docs & Sheets</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="calendar">
              <span class="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Kalender & Jadwal</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-medium text-[13px] text-primary border-b-2 border-primary bg-surface-container-lowest/60 font-bold shadow-sm transition-all rounded-t-lg" data-view="gantt">
              <span class="material-symbols-outlined text-[18px] text-primary">waterfall_chart</span>
              <span>Timeline & Gantt</span>
              <span class="px-1.5 py-0.5 rounded-full bg-primary text-on-primary font-badge-micro text-[10px] font-bold">Live</span>
            </button>
          </div>
        </div>

        <!-- Gantt Visual Board Container -->
        <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border overflow-hidden flex flex-col">
          
          <!-- Timeline Header Days Scale -->
          <div class="grid grid-cols-12 bg-surface-container-low border-b border-surface-border text-center font-mono text-[11px] py-3 text-text-secondary font-semibold">
            <div class="col-span-4 text-left px-4 font-sans font-bold text-text-primary">Tiket Deliverable / Milestone</div>
            <div class="col-span-1 border-l border-surface-border/50">19 Ags<br/><span class="text-[9px] text-text-muted">Sen</span></div>
            <div class="col-span-1 border-l border-surface-border/50 bg-primary/10 text-primary font-bold">20 Ags<br/><span class="text-[9px]">HARI INI</span></div>
            <div class="col-span-1 border-l border-surface-border/50">21 Ags<br/><span class="text-[9px] text-text-muted">Rab</span></div>
            <div class="col-span-1 border-l border-surface-border/50">22 Ags<br/><span class="text-[9px] text-text-muted">Kam</span></div>
            <div class="col-span-1 border-l border-surface-border/50">23 Ags<br/><span class="text-[9px] text-text-muted">Jum</span></div>
            <div class="col-span-1 border-l border-surface-border/50">24 Ags<br/><span class="text-[9px] text-text-muted">Sab</span></div>
            <div class="col-span-2 border-l border-surface-border/50 bg-purple-100 text-purple-900 font-bold">25 Ags<br/><span class="text-[9px]">LAUNCH</span></div>
          </div>

          <!-- Gantt Rows Stream -->
          <div class="divide-y divide-surface-border font-sans text-[12px]">
            
            <!-- Row 1: RK-299 Legalitas -->
            <div class="grid grid-cols-12 items-center py-3.5 px-4 hover:bg-surface-container-low/50 transition-colors">
              <div class="col-span-4 flex items-center gap-2 pr-4">
                <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] font-bold text-text-muted">#RK-299</span>
                <span class="font-medium text-text-primary truncate">Perizinan Dishub & Satpol PP DKI</span>
              </div>
              <div class="col-span-8 flex items-center">
                <div class="w-[30%] bg-emerald-500 text-white text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-between shadow-xs">
                  <span>100% Selesai</span>
                  <span class="material-symbols-outlined text-[14px]">check</span>
                </div>
              </div>
            </div>

            <!-- Row 2: RK-304 Bundaran HI Safe-Zone (CURRENT LIVE) -->
            <div class="grid grid-cols-12 items-center py-3.5 px-4 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" id="gantt-row-rk304">
              <div class="col-span-4 flex items-center gap-2 pr-4">
                <span class="px-1.5 py-0.5 rounded bg-primary-container text-white font-mono text-[10px] font-bold">#RK-304</span>
                <span class="font-bold text-primary truncate">Audit Safe-Zone Bundaran HI & Antasari</span>
              </div>
              <div class="col-span-8 flex items-center pl-[12.5%]">
                <div class="w-[35%] bg-gradient-to-r from-primary-container to-tertiary text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                  <span>Live Audit (85%)</span>
                  <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                </div>
              </div>
            </div>

            <!-- Row 3: RK-302 Novastar Controller -->
            <div class="grid grid-cols-12 items-center py-3.5 px-4 hover:bg-surface-container-low/50 transition-colors">
              <div class="col-span-4 flex items-center gap-2 pr-4">
                <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] font-bold text-text-muted">#RK-302</span>
                <span class="font-medium text-text-primary truncate">Sinkronisasi Controller Novastar & Redundansi</span>
              </div>
              <div class="col-span-8 flex items-center pl-[25%]">
                <div class="w-[50%] bg-blue-500 text-white text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-between shadow-xs">
                  <span>Uji Uplink (60%)</span>
                </div>
              </div>
            </div>

            <!-- Row 4: RK-305 Carousel Approval -->
            <div class="grid grid-cols-12 items-center py-3.5 px-4 hover:bg-surface-container-low/50 transition-colors">
              <div class="col-span-4 flex items-center gap-2 pr-4">
                <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] font-bold text-text-muted">#RK-305</span>
                <span class="font-medium text-text-primary truncate">Final 3 Aset JPG Carousel Sign-Off</span>
              </div>
              <div class="col-span-8 flex items-center pl-[37.5%]">
                <div class="w-[35%] bg-amber-500 text-white text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-between shadow-xs">
                  <span>Approval Siap</span>
                </div>
              </div>
            </div>

            <!-- Row 5: RK-310 GRAND LAUNCH EVENT -->
            <div class="grid grid-cols-12 items-center py-4 px-4 bg-purple-50/50 hover:bg-purple-100/50 transition-colors">
              <div class="col-span-4 flex items-center gap-2 pr-4">
                <span class="px-1.5 py-0.5 rounded bg-purple-600 text-white font-mono text-[10px] font-bold">#RK-310</span>
                <span class="font-bold text-purple-900 truncate">★ GRAND LAUNCH 14 TITIK JABODETABEK</span>
              </div>
              <div class="col-span-8 flex items-center pl-[75%]">
                <div class="w-[25%] bg-gradient-to-r from-purple-600 to-indigo-700 text-white text-[10px] font-extrabold py-2 px-2.5 rounded-lg flex items-center justify-between shadow-md">
                  <span>MAJOR EVENT</span>
                  <span class="material-symbols-outlined text-[14px]">stars</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Gantt Footer -->
          <div class="p-4 bg-surface-container-low border-t border-surface-border flex items-center justify-between text-[11px] text-text-secondary">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded bg-emerald-500"></span> Selesai
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded bg-primary-container"></span> Sedang Berjalan
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded bg-purple-600"></span> Milestone Kunci
              </span>
            </div>
            <span>Auto-synced with Sampulkreativ Cloud Engine</span>
          </div>

        </div>

      </div>
    `;
  }

  bindEvents() {
    const tabs = this.element.querySelectorAll('.view-switch-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        this.eventBus.emit('navigate', { view });
      });
    });

    const rk304Row = this.element.querySelector('#gantt-row-rk304');
    if (rk304Row) {
      rk304Row.addEventListener('click', () => {
        const task = this.taskService.getTask('#RK-304');
        this.modalManager.open('task-detail', { task });
      });
    }

    const crumb = this.element.querySelector('#btn-crumb-gantt');
    if (crumb) {
      crumb.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }
  }
}

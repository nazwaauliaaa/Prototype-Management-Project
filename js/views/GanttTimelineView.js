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

    const calculateGanttPosition = (task) => {
      let startDay = 20;
      let endDay = 23;

      if (task.startDate && task.endDate) {
        const s = parseInt(task.startDate.split('-')[2], 10);
        const e = parseInt(task.endDate.split('-')[2], 10);
        if (!isNaN(s)) startDay = s;
        if (!isNaN(e)) endDay = e;
      } else if (task.timeline) {
        const matches = task.timeline.match(/\b(\d{1,2})\b/g);
        if (matches && matches.length >= 2) {
          startDay = parseInt(matches[0], 10);
          endDay = parseInt(matches[1], 10);
        } else if (matches && matches.length === 1) {
          startDay = parseInt(matches[0], 10);
          endDay = Math.min(25, startDay + 1);
        }
      }

      // Clamp to 19 - 25 August
      startDay = Math.max(19, Math.min(25, startDay));
      endDay = Math.max(startDay, Math.min(25, endDay));

      const leftPercent = ((startDay - 19) / 7) * 100;
      const spanDays = endDay - startDay + 1;
      const widthPercent = Math.min(100 - leftPercent, (spanDays / 7) * 100);

      return { leftPercent, widthPercent, startDay, endDay };
    };

    const getGanttBarStyle = (task) => {
      if (task.code === '#RK-304') {
        return 'bg-gradient-to-r from-primary-container to-tertiary text-white shadow-sm animate-pulse';
      }
      if (task.code === '#RK-310') {
        return 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold shadow-md';
      }
      switch (task.status) {
        case 'done':
          return 'bg-emerald-500 text-white shadow-xs';
        case 'review-qa':
          return 'bg-rose-500 text-white shadow-xs';
        case 'ready-launch':
          return 'bg-purple-600 text-white shadow-xs';
        case 'in-progress':
          return 'bg-blue-500 text-white shadow-xs';
        default:
          return 'bg-slate-400 text-white shadow-xs';
      }
    };

    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
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

        <!-- Gantt Visual Board Container with Mobile Horizontal Scroll -->
        <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border overflow-x-auto flex flex-col">
          <div class="min-w-[760px] flex flex-col">
            
            <!-- Timeline Header Days Scale -->
            <div class="grid grid-cols-12 bg-surface-container-low border-b border-surface-border text-center font-mono text-[11px] py-3 text-text-secondary font-semibold">
              <div class="col-span-4 text-left px-4 font-sans font-bold text-text-primary">Tiket Deliverable / Milestone</div>
              <div class="col-span-1 border-l border-surface-border/50 gantt-date-btn cursor-pointer hover:bg-surface-container transition-colors" data-date="19">19 Ags<br/><span class="text-[9px] text-text-muted">Sen</span></div>
              <div class="col-span-1 border-l border-surface-border/50 bg-primary/10 text-primary font-bold gantt-date-btn cursor-pointer hover:bg-primary/20 transition-colors" data-date="20">20 Ags<br/><span class="text-[9px]">HARI INI</span></div>
              <div class="col-span-1 border-l border-surface-border/50 gantt-date-btn cursor-pointer hover:bg-surface-container transition-colors" data-date="21">21 Ags<br/><span class="text-[9px] text-text-muted">Rab</span></div>
              <div class="col-span-1 border-l border-surface-border/50 gantt-date-btn cursor-pointer hover:bg-surface-container transition-colors" data-date="22">22 Ags<br/><span class="text-[9px] text-text-muted">Kam</span></div>
              <div class="col-span-1 border-l border-surface-border/50 gantt-date-btn cursor-pointer hover:bg-surface-container transition-colors" data-date="23">23 Ags<br/><span class="text-[9px] text-text-muted">Jum</span></div>
              <div class="col-span-1 border-l border-surface-border/50 gantt-date-btn cursor-pointer hover:bg-surface-container transition-colors" data-date="24">24 Ags<br/><span class="text-[9px] text-text-muted">Sab</span></div>
              <div class="col-span-2 border-l border-surface-border/50 bg-purple-100 text-purple-900 font-bold gantt-date-btn cursor-pointer hover:bg-purple-200 transition-colors" data-date="25">25 Ags<br/><span class="text-[9px]">LAUNCH</span></div>
            </div>

            <!-- Dynamic Gantt Rows Stream -->
            <div class="divide-y divide-surface-border font-sans text-[12px]">
              ${tasks.map(task => {
                const pos = calculateGanttPosition(task);
                const barClass = getGanttBarStyle(task);
                return `
                  <div 
                    class="gantt-task-row grid grid-cols-12 items-center py-3.5 px-4 hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                    data-task-id="${task.id}"
                  >
                    <div class="col-span-4 flex items-center gap-2 pr-4 min-w-0">
                      <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] font-bold text-primary shrink-0">${task.code}</span>
                      <span class="font-medium text-text-primary truncate" title="${task.title}">${task.title}</span>
                    </div>
                    <div class="col-span-8 relative flex items-center h-8">
                      <div 
                        class="absolute py-1 px-2.5 rounded-lg flex items-center justify-between text-[10px] font-semibold truncate transition-all hover:brightness-105 ${barClass}"
                        style="left: ${pos.leftPercent}%; width: ${pos.widthPercent}%;"
                      >
                        <span class="truncate">${task.timeline || `${pos.startDay} - ${pos.endDay} Ags`}</span>
                        <span class="material-symbols-outlined text-[12px] shrink-0 ml-1">
                          ${task.status === 'done' ? 'check' : task.status === 'review-qa' ? 'verified' : 'arrow_forward'}
                        </span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Gantt Footer -->
            <div class="p-4 bg-surface-container-low border-t border-surface-border flex flex-wrap items-center justify-between gap-4 text-[11px] text-text-secondary">
              <div class="flex flex-wrap items-center gap-4">
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
              <span>Sinkronisasi otomatis dengan Jadwal Global &amp; Timeline</span>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  bindEvents() {
    const taskRows = this.element.querySelectorAll('.gantt-task-row');
    taskRows.forEach(row => {
      row.addEventListener('click', () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (task) {
          this.modalManager.open('task-detail', { task });
        }
      });
    });

    const crumb = this.element.querySelector('#btn-crumb-gantt');
    if (crumb) {
      crumb.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    const dateBtns = this.element.querySelectorAll('.gantt-date-btn');
    dateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'calendar' });
      });
    });
  }
}

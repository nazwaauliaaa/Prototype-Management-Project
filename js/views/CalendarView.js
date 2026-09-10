import { BaseView } from '../core/BaseView.js';

/**
 * CalendarView - Single Responsibility Principle (SRP)
 * Renders the executive calendar suite with Month, Week, Day, Agenda list modes, and pillar filters.
 */
export class CalendarView extends BaseView {
  constructor(container) {
    super(container);
    this.calendarService = container.resolve('CalendarService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
    this.activeFilter = 'all';
    this.viewMode = 'agenda'; // 'month' | 'week' | 'day' | 'agenda'
  }

  render() {
    const events = this.calendarService.getEvents(this.activeFilter);
    const workload = this.calendarService.getWorkloadStats();

    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Context Header -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-cal">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-text-primary font-medium">Jadwal Global</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold">Agenda Eksekutif 19 – 25 Agustus 2024</span>
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="font-headline-lg text-[20px] text-on-surface font-bold tracking-tight">
                Agenda & Jadwal Eksekusi
              </h1>
              <p class="font-caption-meta text-[11px] text-text-secondary">
                Pusat sinkronisasi timeline, pengujian multi-layar, dan persiapan Grand Launch Jabodetabek.
              </p>
            </div>
          </div>

          <!-- Calendar Action Sub-bar -->
          <div class="flex flex-wrap items-center justify-between gap-4 bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-surface-border mt-2">
            <div class="flex items-center gap-2">
              <button id="btn-add-event" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-body-medium text-[12px] font-bold shadow-sm hover:bg-brand-accent transition-colors" type="button">
                <span class="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ Jadwal Baru</span>
              </button>
              
              <div class="flex items-center bg-surface-container-low rounded-lg p-0.5 border border-surface-border">
                <button class="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-container">
                  <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <div class="flex items-center gap-2 px-3 font-body-medium text-[12px] font-bold text-text-primary">
                  <span class="material-symbols-outlined text-[16px] text-brand-accent">event</span>
                  <span>19 – 25 Agustus 2024</span>
                </div>
                <button class="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-container">
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              <button class="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-primary font-caption-meta text-[11px] font-semibold transition-colors">
                Hari Ini
              </button>
            </div>

            <!-- Granularity Switcher -->
            <div class="flex items-center bg-surface-container-low p-1 rounded-xl border border-surface-border">
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'month' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="month">Bulan</button>
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'week' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="week">Minggu</button>
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'agenda' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="agenda">Agenda</button>
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'day' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="day">Hari</button>
            </div>
          </div>
        </div>

        <!-- Main Grid: Agenda Stream (8 cols) + Intelligence Sidebar (4 cols) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-spacing-lg">
          
          <!-- Left: Agenda Stream / Calendar Grid -->
          <section class="lg:col-span-8 flex flex-col gap-spacing-lg">
            
            <!-- Visual Calendar Grid -->
            <div class="p-spacing-md rounded-2xl bg-surface-container-lowest border border-surface-border shadow-sm">
              <div class="grid grid-cols-7 text-center font-caption-meta text-[12px] text-text-muted mb-2">
                <span class="font-semibold py-2">Min</span>
                <span class="font-semibold py-2">Sen</span>
                <span class="font-semibold py-2">Sel</span>
                <span class="font-semibold py-2">Rab</span>
                <span class="font-semibold py-2">Kam</span>
                <span class="font-semibold py-2">Jum</span>
                <span class="font-semibold py-2">Sab</span>
              </div>
              
              <div class="grid grid-cols-7 gap-1.5">
                <!-- Prev month days -->
                <div class="border border-surface-border/50 rounded-xl p-1.5 opacity-40 bg-surface-container-low min-h-[90px]"><span class="font-semibold text-[12px] p-1">28</span></div>
                <div class="border border-surface-border/50 rounded-xl p-1.5 opacity-40 bg-surface-container-low min-h-[90px]"><span class="font-semibold text-[12px] p-1">29</span></div>
                <div class="border border-surface-border/50 rounded-xl p-1.5 opacity-40 bg-surface-container-low min-h-[90px]"><span class="font-semibold text-[12px] p-1">30</span></div>
                <div class="border border-surface-border/50 rounded-xl p-1.5 opacity-40 bg-surface-container-low min-h-[90px]"><span class="font-semibold text-[12px] p-1">31</span></div>
                
                <!-- Current month days -->
                ${Array.from({length: 31}, (_, i) => {
                  const day = i + 1;
                  let eventsHtml = '';
                  let bgClass = 'bg-surface-container-lowest';
                  
                  if (day === 20) {
                    bgClass = 'bg-primary/5 ring-1 ring-primary/40';
                    eventsHtml = `
                      <div class="mt-1 flex flex-col gap-1">
                        <div class="text-[9px] bg-error text-white px-1.5 py-0.5 rounded truncate font-bold">LIVE AUDIT</div>
                        <div class="text-[9px] bg-status-planning/20 text-status-planning px-1.5 py-0.5 rounded truncate font-semibold">Briefing</div>
                        <div class="text-[9px] bg-status-success/20 text-status-success px-1.5 py-0.5 rounded truncate font-semibold">Deploy</div>
                      </div>
                    `;
                  } else if (day === 22) {
                    eventsHtml = `
                      <div class="mt-1 flex flex-col gap-1">
                        <div class="text-[9px] bg-status-warning/20 text-status-warning px-1.5 py-0.5 rounded truncate font-semibold">Desain UI</div>
                      </div>
                    `;
                  } else if (day === 25) {
                    eventsHtml = `
                      <div class="mt-1 flex flex-col gap-1">
                        <div class="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded truncate font-semibold">Grand Launch</div>
                      </div>
                    `;
                  }
                  
                  return `
                    <div class="border border-surface-border/50 rounded-xl p-1.5 hover:border-primary/50 transition-all cursor-pointer ${bgClass} min-h-[90px] flex flex-col">
                      <div class="flex justify-between items-center">
                        <span class="font-semibold text-[12px] w-6 h-6 flex items-center justify-center rounded-full ${day === 20 ? 'bg-primary text-on-primary shadow-sm' : 'text-text-primary'}">${day}</span>
                        ${eventsHtml && day !== 20 ? '<span class="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>' : ''}
                      </div>
                      ${eventsHtml}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Selected Day Agenda -->
            <div class="flex flex-col gap-4">
              <!-- Selasa 20 Agustus Section Header -->
              <div class="flex items-center justify-between px-2">
                <div class="flex items-center gap-2">
                  <span class="font-headline-lg text-[18px] font-bold text-text-primary">Selasa, 20 Agustus 2024</span>
                  <span class="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-badge-micro text-[10px] font-bold animate-pulse">
                    HARI INI • 3 AGENDA RUANGKREASI
                  </span>
                </div>
                <span class="font-caption-meta text-[11px] text-primary font-bold">Target Audit OOH & Sinkronisasi 4K</span>
              </div>

              <!-- Tuesday Card 1: Completed Morning Briefing -->
              <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-status-success mt-0.5 shrink-0">
                    <span class="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <span class="font-caption-meta text-[11px] text-text-muted font-bold">08:30 - 09:30 WIB</span>
                      <span class="px-1.5 py-0.2 rounded bg-status-planning/15 text-status-planning font-badge-micro text-[10px] font-bold">RuangKreasi</span>
                      <span class="px-1.5 py-0.2 rounded bg-surface-container font-badge-micro text-[10px]">Sync Vendor</span>
                    </div>
                    <h3 class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">
                      Briefing Pagi & Sinkronisasi Controller Vendor Novastar
                    </h3>
                    <span class="text-text-muted font-caption-meta text-[11px] mt-0.5">PIC: Sari Rahmawati • Protokol koneksi LED terverifikasi</span>
                  </div>
                </div>
                <span class="px-2 py-1 rounded bg-surface-container text-status-success font-caption-meta text-[11px] font-bold self-end md:self-auto">
                  Selesai
                </span>
              </div>

              <!-- Other Agenda Items -->
              <div class="flex flex-col gap-2">
                ${events.filter(e => e.id !== 'evt-2').map(evt => `
                  <div class="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/50 transition-all flex items-center justify-between gap-3 shadow-xs">
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mt-0.5 shrink-0">
                        <span class="material-symbols-outlined text-[18px]">event</span>
                      </div>
                      <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                          <span class="font-caption-meta text-[11px] text-text-muted font-bold">${evt.dayName}, ${evt.time}</span>
                          <span class="px-1.5 py-0.2 rounded bg-surface-container font-badge-micro text-[10px] font-semibold capitalize">${evt.pillar}</span>
                          <span class="px-1.5 py-0.2 rounded bg-surface-container text-text-secondary font-badge-micro text-[10px]">${evt.badge}</span>
                        </div>
                        <h4 class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">${evt.title}</h4>
                        <span class="text-text-muted font-caption-meta text-[11px] mt-0.5">PIC: ${evt.pic} • Lokasi: ${evt.location}</span>
                      </div>
                    </div>
                    <span class="px-2 py-1 rounded bg-surface-container text-text-secondary font-caption-meta text-[11px] capitalize font-medium">
                      ${evt.status}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

          </section>

          <!-- Right: Intelligence Sidebar -->
          <aside class="lg:col-span-4 flex flex-col gap-4">

            <!-- Workload Distribution Card -->
            <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-border shadow-sm flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="font-headline-md text-[14px] font-bold text-text-primary">Beban Kerja Minggu Ini</span>
                <span class="material-symbols-outlined text-[16px] text-text-muted">pie_chart</span>
              </div>

              <div class="flex flex-col gap-2.5">
                ${workload.map(w => `
                  <div class="flex flex-col gap-1 text-[11px]">
                    <div class="flex justify-between">
                      <span class="font-medium text-text-primary">${w.name}</span>
                      <span class="font-bold text-primary">${w.hours} Jam (${w.status})</span>
                    </div>
                    <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div class="h-full ${w.color} rounded-full" style="width: ${w.percent}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </aside>

        </div>

      </div>
    `;
  }

  bindEvents() {
    // Granularity switcher
    const granBtns = this.element.querySelectorAll('.cal-gran-btn');
    granBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.getAttribute('data-mode');
        this.mount(this.element);
      });
    });

    // Open detail task #RK-304
    const openTaskBtn = this.element.querySelector('#btn-open-task-rk304');
    if (openTaskBtn) {
      openTaskBtn.addEventListener('click', () => {
        const task = this.container.resolve('TaskService').getTask('#RK-304');
        this.modalManager.open('task-detail', { task });
      });
    }

    // Reschedule button
    const rescheduleBtn = this.element.querySelector('#btn-quick-reschedule');
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener('click', () => {
        const event = this.calendarService.getEvents()[1]; // RK-304 event
        this.modalManager.open('reschedule', { event });
      });
    }

    const addEventBtn = this.element.querySelector('#btn-add-event');
    if (addEventBtn) {
      addEventBtn.addEventListener('click', () => {
        this.modalManager.open('new-task');
      });
    }

    const crumb = this.element.querySelector('#btn-crumb-cal');
    if (crumb) {
      crumb.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }
  }
}

/**
 * ViewTabBar - Shared responsive tab navigation bar.
 * Shows icon-only on mobile, icon + short label on sm+, icon + full label on md+.
 * 
 * @param {string} activeView - The current active view key (e.g. 'project-table')
 * @param {number} [kanbanCount] - Optional count badge for kanban tab
 * @param {boolean} [hasLiveProcess] - If true shows Live badge on table tab
 * @returns {string} HTML string
 */
export function renderViewTabBar(activeView, kanbanCount = null, hasLiveProcess = false) {
  const tabs = [
    {
      view: 'kanban',
      icon: 'dashboard',
      labelShort: 'Kanban',
      labelFull: 'Kanban View',
      badge: kanbanCount !== null ? `<span class="ml-0.5 px-1.5 py-0.5 rounded-full bg-surface-container text-text-muted text-[10px] font-bold hidden sm:inline">${kanbanCount}</span>` : ''
    },
    {
      view: 'project-table',
      icon: 'table_chart',
      labelShort: 'Tabel',
      labelFull: 'Tabel (Monday Style)',
      badge: hasLiveProcess && activeView === 'project-table'
        ? `<span class="px-1.5 py-0.5 rounded-full bg-primary text-on-primary font-badge-micro text-[10px] font-bold hidden sm:inline">Live</span>`
        : ''
    },
    {
      view: 'docs-sheets',
      icon: 'description',
      labelShort: 'Docs',
      labelFull: 'Docs & Sheets'
    },
    {
      view: 'calendar',
      icon: 'calendar_month',
      labelShort: 'Jadwal',
      labelFull: 'Kalender & Jadwal'
    },
    {
      view: 'gantt',
      icon: 'waterfall_chart',
      labelShort: 'Gantt',
      labelFull: 'Timeline & Gantt'
    }
  ];

  const tabsHTML = tabs.map(tab => {
    const isActive = tab.view === activeView;
    const activeClass = isActive
      ? 'text-primary border-b-2 border-primary bg-surface-container-lowest/60 font-bold shadow-sm rounded-t-lg'
      : 'text-text-secondary hover:text-on-surface border-b-2 border-transparent hover:border-surface-border';
    const badge = tab.badge || '';

    return `
      <button 
        class="view-switch-tab flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 font-body-default text-[13px] transition-all shrink-0 ${activeClass}" 
        data-view="${tab.view}"
        title="${tab.labelFull}"
      >
        <span class="material-symbols-outlined text-[18px]">${tab.icon}</span>
        <span class="hidden sm:inline text-[12px] sm:text-[13px]">${tab.labelShort}</span>
        <span class="hidden md:inline text-[11px] text-text-muted/70">/ ${tab.labelFull.split(' ').slice(1).join(' ')}</span>
        ${badge}
      </button>
    `;
  }).join('');

  return `
    <div class="flex items-center gap-0 sm:gap-1 -mb-px overflow-x-auto scrollbar-hide">
      ${tabsHTML}
    </div>
  `;
}

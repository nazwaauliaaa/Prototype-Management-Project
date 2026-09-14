/**
 * NotificationService - Single Responsibility Principle (SRP)
 * Manages toast notifications, alerts, and system feedback.
 */
export class NotificationService {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.toasts = [];
    this.container = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast message
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {number} duration
   * @param {{ label: string, onClick: Function }|null} action
   */
  show(message, type = 'info', duration = 3500, action = null) {
    const id = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 transform -translate-y-4 opacity-0 text-sm font-medium ${this.getTypeStyles(type)}`;
    
    const iconName = this.getIcon(type);

    let actionBtnHtml = '';
    if (action && action.label) {
      actionBtnHtml = `
        <button 
          class="btn-toast-action px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
          type="button"
        >
          ${action.label}
        </button>
      `;
    }

    toast.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <span class="material-symbols-outlined text-[20px] shrink-0">${iconName}</span>
        <div class="truncate leading-tight">${message}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${actionBtnHtml}
        <button class="btn-toast-close text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer" type="button" title="Tutup">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    `;

    this.container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('-translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    const dismissToast = () => {
      clearTimeout(dismissTimer);
      toast.classList.add('opacity-0', '-translate-y-4');
      setTimeout(() => toast.remove(), 300);
    };

    let dismissTimer = setTimeout(() => {
      dismissToast();
    }, duration);

    const closeBtn = toast.querySelector('.btn-toast-close');
    if (closeBtn) closeBtn.addEventListener('click', dismissToast);

    const actionBtn = toast.querySelector('.btn-toast-action');
    if (actionBtn && action && typeof action.onClick === 'function') {
      actionBtn.addEventListener('click', () => {
        dismissToast();
        action.onClick();
      });
    }
  }

  /**
   * Show a toast message with an action button (e.g. Undo)
   * @param {string} message
   * @param {{ label: string, onClick: Function }} action
   * @param {'success'|'error'|'info'|'warning'} [type]
   * @param {number} [duration]
   */
  showWithAction(message, action, type = 'info', duration = 6000) {
    this.show(message, type, duration, action);
  }

  success(message, duration) {
    this.show(message, 'success', duration);
  }

  error(message, duration) {
    this.show(message, 'error', duration);
  }

  info(message, duration) {
    this.show(message, 'info', duration);
  }

  warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  getTypeStyles(type) {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'error':
        return 'bg-rose-50 text-rose-900 border-rose-200';
      case 'warning':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      default:
        return 'bg-indigo-50 text-indigo-900 border-indigo-200';
    }
  }

  getIcon(type) {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }
}

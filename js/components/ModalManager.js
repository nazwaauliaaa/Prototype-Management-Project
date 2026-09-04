/**
 * ModalManager - Single Responsibility Principle (SRP) & Open/Closed Principle (OCP)
 * Coordinates registration, opening, closing, and rendering of dialog modals.
 */
export class ModalManager {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.modals = new Map();
    this.container = null;
    this.activeModal = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'modal-container';
    this.container.className = 'fixed inset-0 z-50 hidden items-center justify-center p-3 md:p-6 bg-on-background/75 backdrop-blur-xl overflow-y-auto modal-backdrop';
    document.body.appendChild(this.container);

    // Global ESC key handler
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal.modalId);
      }
    });

    // Close when clicking directly on backdrop
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container && this.activeModal) {
        this.close(this.activeModal.modalId);
      }
    });
  }

  /**
   * Register a modal instance
   * @param {string} modalId
   * @param {BaseModal} modalInstance
   */
  register(modalId, modalInstance) {
    this.modals.set(modalId, modalInstance);
  }

  /**
   * Open a registered modal
   * @param {string} modalId
   * @param {*} [data]
   */
  open(modalId, data = null) {
    const modal = this.modals.get(modalId);
    if (!modal) {
      console.error(`[ModalManager] Modal "${modalId}" is not registered.`);
      return;
    }

    this.activeModal = modal;
    modal.isOpen = true;
    this.container.innerHTML = modal.render(data);
    this.container.classList.remove('hidden');
    this.container.classList.add('flex');
    modal.bindEvents(this.container);
    this.eventBus.emit('modal:opened', { modalId, data });
  }

  /**
   * Close the active modal
   * @param {string} [modalId]
   */
  close(modalId) {
    if (this.activeModal) {
      this.activeModal.isOpen = false;
      this.activeModal.onClose();
      this.container.classList.add('hidden');
      this.container.classList.remove('flex');
      this.container.innerHTML = '';
      const closedId = this.activeModal.modalId;
      this.activeModal = null;
      this.eventBus.emit('modal:closed', { modalId: closedId });
    }
  }
}

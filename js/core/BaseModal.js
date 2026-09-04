/**
 * BaseModal - Liskov Substitution Principle (LSP) & Open/Closed Principle (OCP)
 * Contract and base implementation for all dialog modals in Creative Office.
 */
export class BaseModal {
  /**
   * @param {DIContainer} container
   * @param {string} modalId
   */
  constructor(container, modalId) {
    if (new.target === BaseModal) {
      throw new TypeError("Cannot construct BaseModal instances directly.");
    }
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.modalId = modalId;
    this.isOpen = false;
  }

  /**
   * Returns HTML string for the modal contents
   * @param {*} data - Optional payload
   * @returns {string}
   */
  render(data) {
    throw new Error("Method 'render()' must be implemented by subclass.");
  }

  /**
   * Attaches modal specific event listeners
   * @param {HTMLElement} modalRoot
   */
  bindEvents(modalRoot) {
    // Override in subclass
  }

  /**
   * Hook called when modal closes
   */
  onClose() {
    // Optional cleanup in subclass
  }
}

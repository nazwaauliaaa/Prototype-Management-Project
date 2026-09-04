/**
 * BaseView - Liskov Substitution Principle (LSP) & Open/Closed Principle (OCP)
 * Contract and base implementation for all feature views in Creative Office.
 */
export class BaseView {
  /**
   * @param {DIContainer} container - Dependency injection container
   */
  constructor(container) {
    if (new.target === BaseView) {
      throw new TypeError("Cannot construct BaseView instances directly.");
    }
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.element = null;
  }

  /**
   * Returns the HTML string for this view
   * @returns {string}
   */
  render() {
    throw new Error("Method 'render()' must be implemented by subclass.");
  }

  /**
   * Mounts the view to a container element and attaches events
   * @param {HTMLElement} hostElement
   */
  mount(hostElement) {
    this.unmount();
    hostElement.innerHTML = this.render();
    this.element = hostElement;
    this.bindEvents();
    this.element.classList.add('view-fade-in');
  }

  /**
   * Attaches event listeners to the view's DOM elements
   */
  bindEvents() {
    // Override in subclass
  }

  /**
   * Cleans up event listeners and references when leaving the view
   */
  unmount() {
    if (this.element) {
      this.element.classList.remove('view-fade-in');
      this.element = null;
    }
  }
}

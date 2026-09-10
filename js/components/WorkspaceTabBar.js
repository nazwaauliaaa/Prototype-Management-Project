/**
 * WorkspaceTabBar Component (Disabled)
 * Dihapus sesuai permintaan pengguna.
 */
export class WorkspaceTabBar {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.hostElement = null;
  }

  render() {
    return '';
  }

  mount(hostElement) {
    this.hostElement = hostElement;
    if (this.hostElement) {
      this.hostElement.innerHTML = '';
      this.hostElement.classList.add('hidden');
    }
  }

  show() {
    // Disabled / tidak ditampilkan
    if (this.hostElement) {
      this.hostElement.classList.add('hidden');
    }
  }

  hide() {
    if (this.hostElement) {
      this.hostElement.classList.add('hidden');
    }
  }
}

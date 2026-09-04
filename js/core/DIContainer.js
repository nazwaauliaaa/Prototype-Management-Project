/**
 * DIContainer - Dependency Inversion Principle (DIP)
 * Central Inversion-of-Control (IoC) Container to register and resolve services/abstractions.
 */
export class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a singleton instance or factory
   * @param {string} key
   * @param {*} instanceOrFactory
   * @param {boolean} isFactory - If true, factory will be executed once to produce singleton
   */
  register(key, instanceOrFactory, isFactory = false) {
    this.services.set(key, { instanceOrFactory, isFactory, isSingleton: true });
  }

  /**
   * Register a transient factory that creates a new instance on every resolve
   * @param {string} key
   * @param {Function} factory
   */
  registerTransient(key, factory) {
    this.services.set(key, { instanceOrFactory: factory, isFactory: true, isSingleton: false });
  }

  /**
   * Resolve a service by key
   * @param {string} key
   * @returns {*}
   */
  resolve(key) {
    if (this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    const definition = this.services.get(key);
    if (!definition) {
      throw new Error(`[DIContainer] Service not found for key: ${key}`);
    }

    let instance;
    if (definition.isFactory) {
      instance = definition.instanceOrFactory(this);
    } else {
      instance = definition.instanceOrFactory;
    }

    if (definition.isSingleton) {
      this.singletons.set(key, instance);
    }

    return instance;
  }
}

/**
 * S4 Ledger — Vitest Setup File
 * Provides browser-like environment stubs for unit tests.
 * Extended for full source-module integration tests.
 */

// Stub localStorage
const store = {};
global.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
};

// Stub sessionStorage
const sessionStore = {};
global.sessionStorage = {
  getItem: (key) => sessionStore[key] || null,
  setItem: (key, val) => { sessionStore[key] = String(val); },
  removeItem: (key) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); },
  get length() { return Object.keys(sessionStore).length; },
  key: (i) => Object.keys(sessionStore)[i] || null,
};

// Stub navigator.clipboard
if (!global.navigator) global.navigator = {};
global.navigator.clipboard = {
  writeText: async () => {},
  readText: async () => '',
};

// Stub navigator.sendBeacon
if (!navigator.sendBeacon) {
  navigator.sendBeacon = () => true;
}

// Stub navigator.serviceWorker
try {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(),
        register: async () => ({}),
        getRegistrations: async () => [],
        addEventListener: () => {},
      },
      configurable: true,
    });
  } else if (!navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations = async () => [];
  }
} catch(e) { /* may already be defined */ }

// Stub Chart.js
global.Chart = class Chart {
  constructor(canvas, config) { this.data = config?.data || {}; this.options = config?.options || {}; this.canvas = canvas; }
  update() {}
  destroy() {}
  static getChart() { return null; }
};
global.Chart.register = () => {};
global.Chart.instances = [];

// Stub fetch
global.fetch = async (url, opts) => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
  headers: new Map(),
});

// Stub PerformanceObserver
if (typeof global.PerformanceObserver === 'undefined') {
  global.PerformanceObserver = class PerformanceObserver {
    constructor(cb) { this._cb = cb; }
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// Stub performance extensions
if (typeof performance !== 'undefined') {
  if (!performance.getEntriesByType) {
    performance.getEntriesByType = () => [];
  }
  if (!performance.memory) {
    performance.memory = { usedJSHeapSize: 50 * 1024 * 1024, totalJSHeapSize: 100 * 1024 * 1024 };
  }
}

// Stub requestAnimationFrame
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Stub ResizeObserver
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Stub IntersectionObserver
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Stub bootstrap
global.bootstrap = { Tab: class Tab { constructor() {} show() {} } };

// Stub window.matchMedia
window.matchMedia = window.matchMedia || function() {
  return { matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
};

// Stub HTMLCanvasElement.getContext for Chart.js
if (typeof HTMLCanvasElement !== 'undefined') {
  const _origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type) {
    if (type === '2d' || type === 'webgl') {
      return {
        fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
        putImageData: () => {}, createImageData: () => ([]),
        setTransform: () => {}, drawImage: () => {}, save: () => {}, fillText: () => {},
        restore: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
        closePath: () => {}, stroke: () => {}, translate: () => {}, scale: () => {},
        rotate: () => {}, arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }),
        transform: () => {}, rect: () => {}, clip: () => {}, canvas: this,
      };
    }
    return _origGetContext?.call(this, type) || null;
  };
}

// Provide undefined-but-declared globals that source modules reference without typeof guards
// (e.g. metrics.js line 983: `if (toolId === 'hub-analysis' && ilsResults)`)
if (typeof global.ilsResults === 'undefined') global.ilsResults = undefined;
if (typeof global.openILSTool === 'undefined') global.openILSTool = function() {};
if (typeof global.switchHubTab === 'undefined') global.switchHubTab = function() {};
if (typeof global.showILSResults === 'undefined') global.showILSResults = function() {};
if (typeof global._currentSection === 'undefined') global._currentSection = 'anchor';
if (typeof global.closeWalletSidebar === 'undefined') global.closeWalletSidebar = function() {};
if (typeof global.sha256 === 'undefined') global.sha256 = async function(str) { return 'mock-sha256-' + str.length; };
if (typeof global.sha256Binary === 'undefined') global.sha256Binary = async function() { return 'mock-sha256-binary'; };
if (typeof global._anchorToXRPL === 'undefined') global._anchorToXRPL = function() { return Promise.resolve({ hash: 'mock-tx-hash' }); };
if (typeof global.sessionRecords === 'undefined') global.sessionRecords = [];
if (typeof global.saveLocalRecord === 'undefined') global.saveLocalRecord = function() {};
if (typeof global.updateSLSBalance === 'undefined') global.updateSLSBalance = function() {};
if (typeof global.addToVault === 'undefined') global.addToVault = function() {};
if (typeof global.updateTxLog === 'undefined') global.updateTxLog = function() {};
if (typeof global._updateSlsBalance === 'undefined') global._updateSlsBalance = function() {};
if (typeof global.hideAnchorAnimation === 'undefined') global.hideAnchorAnimation = function() {};
if (typeof global.s4Notify === 'undefined') global.s4Notify = function() {};
if (typeof global.updateStats === 'undefined') global.updateStats = function() {};
if (typeof global.saveStats === 'undefined') global.saveStats = function() {};

// Suppress excessive console noise during tests
const _origWarn = console.warn;
const _origError = console.error;
console.warn = (...args) => {
  const msg = String(args[0] || '');
  if (msg.includes('[S4') || msg.includes('Unhandled')) return;
  _origWarn.apply(console, args);
};
console.error = (...args) => {
  const msg = String(args[0] || '');
  if (msg.includes('[S4') || msg.includes('Error')) return;
  _origError.apply(console, args);
};

// Stub indexedDB for jsdom
if (typeof global.indexedDB === 'undefined') {
  const _fakeStore = new Map();
  global.indexedDB = {
    open: () => {
      const req = { result: { objectStoreNames: { contains: () => true }, createObjectStore: () => ({}), transaction: () => ({ objectStore: () => ({ put: (d) => { const r = { onsuccess: null, onerror: null }; setTimeout(() => r.onsuccess && r.onsuccess(), 0); return r; }, get: (k) => { const r = { result: _fakeStore.get(k), onsuccess: null, onerror: null }; setTimeout(() => r.onsuccess && r.onsuccess(), 0); return r; } }), oncomplete: null, onerror: null }), close: () => {} }, onupgradeneeded: null, onsuccess: null, onerror: null };
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }); }, 0);
      return req;
    },
    deleteDatabase: () => ({ onsuccess: null, onerror: null })
  };
}

/**
 * S4 Ledger — Vitest Setup File
 * Provides browser-like environment stubs for unit tests.
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

// Stub Chart.js
global.Chart = class Chart {
  constructor() { this.data = {}; this.options = {}; }
  update() {}
  destroy() {}
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

// Suppress console.warn/error during tests (optional)
// Uncomment to silence noisy test output:
// console.warn = () => {};
// console.error = () => {};

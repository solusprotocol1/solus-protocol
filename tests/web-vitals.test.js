import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

function loadWebVitals(dom) {
    const code = require('fs').readFileSync(
        require('path').resolve(__dirname, '../prod-app/src/js/web-vitals.js'),
        'utf8'
    );
    dom.window.eval(code);
    return dom.window;
}

describe('Web Vitals — S4.vitals namespace', () => {
    let win;

    beforeEach(() => {
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'http://localhost',
            pretendToBeVisual: true,
            runScripts: 'dangerously'
        });
        // Mock performance.getEntriesByType for TTFB
        dom.window.performance.getEntriesByType = vi.fn(() => [{ responseStart: 42 }]);
        // jsdom doesn't have PerformanceObserver
        dom.window.PerformanceObserver = undefined;
        win = loadWebVitals(dom);
    });

    it('creates S4.vitals namespace', () => {
        expect(win.S4).toBeDefined();
        expect(win.S4.vitals).toBeDefined();
    });

    it('captures TTFB from navigation timing', () => {
        expect(win.S4.vitals.ttfb).toBe(42);
    });

    it('logs TTFB entry', () => {
        const entry = win.S4.vitals.entries.find(e => e.name === 'TTFB');
        expect(entry).toBeDefined();
        expect(entry.value).toBe(42);
    });

    it('initialises metric values to null/zero', () => {
        expect(win.S4.vitals.cls).toBe(0);
        // lcp/fid/inp stay null without PerformanceObserver
        expect(win.S4.vitals.lcp).toBeNull();
        expect(win.S4.vitals.fid).toBeNull();
        expect(win.S4.vitals.inp).toBeNull();
    });

    it('summary() returns formatted report', () => {
        const s = win.S4.vitals.summary();
        expect(s.TTFB).toBe('42ms');
        expect(s.LCP).toBe('n/a');
        expect(s.FID).toBe('n/a');
        expect(s.CLS).toBe('0.0000');
        expect(s.INP).toBe('n/a');
    });

    it('summary() returns grade', () => {
        const s = win.S4.vitals.summary();
        expect(typeof s.grade).toBe('string');
    });

    it('entries array has timestamps', () => {
        win.S4.vitals.entries.forEach(e => {
            expect(e.ts).toBeGreaterThan(0);
        });
    });
});

describe('Web Vitals — grading logic', () => {
    let win;

    beforeEach(() => {
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'http://localhost',
            pretendToBeVisual: true,
            runScripts: 'dangerously'
        });
        dom.window.performance.getEntriesByType = vi.fn(() => []);
        dom.window.PerformanceObserver = undefined;
        win = loadWebVitals(dom);
    });

    it('grade is "Good" when all metrics are excellent', () => {
        win.S4.vitals.lcp = 1500;
        win.S4.vitals.fid = 50;
        win.S4.vitals.cls = 0.05;
        win.S4.vitals.inp = 100;
        expect(win.S4.vitals.summary().grade).toBe('Good');
    });

    it('grade is "Needs Improvement" for moderate metrics', () => {
        win.S4.vitals.lcp = 3500;
        win.S4.vitals.fid = 200;
        win.S4.vitals.cls = 0.15;
        win.S4.vitals.inp = 300;
        expect(win.S4.vitals.summary().grade).toBe('Needs Improvement');
    });

    it('grade is "Poor" when all metrics are bad', () => {
        win.S4.vitals.lcp = 8000;
        win.S4.vitals.fid = 500;
        win.S4.vitals.cls = 0.5;
        win.S4.vitals.inp = 1000;
        expect(win.S4.vitals.summary().grade).toBe('Poor');
    });

    it('grade is "Good" with only CLS=0 (default)', () => {
        // CLS starts at 0, which is excellent — so grade reflects that
        expect(win.S4.vitals.summary().grade).toBe('Good');
    });
});

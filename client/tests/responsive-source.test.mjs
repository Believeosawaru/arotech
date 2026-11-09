// Source-level regression checks only; browser/viewport QA still required.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('theme button exposes an accessible label, pressed state, and the high-contrast theme class', () => {
  const layout = file('pages/AppLayout.tsx');
  const styles = file('styles.css');
  assert.match(layout, /aria-pressed=\{dark\}/);
  assert.match(layout, /className="theme-toggle/);
  assert.match(styles, /\.theme-toggle\{[^}]*color:#c3f26a!important;/s);
  assert.match(styles, /\.theme-toggle\{[^}]*background-color:#304e38!important;/s);
});

test('customer mobile navigation has clear, short labels and safe-area spacing', () => {
  const layout = file('pages/AppLayout.tsx');
  assert.match(layout, /aria-label="Quick navigation"/);
  assert.match(layout, /\['Home', 'Wallet', 'Send', 'History', 'Settings'\]/);
  assert.match(layout, /safe-area-inset-bottom/);
});

test('landing hamburger menu is available until navigation links appear', () => {
  const landing = file('pages/Landing.tsx');
  assert.match(landing, /rounded-full border border-line p-3 lg:hidden/);
  assert.match(landing, /hidden items-center gap-9 text-sm font-bold text-\[#6d7b71\] lg:flex/);
  assert.match(landing, /shadow-soft lg:hidden/);
});

test('mobile admin rows are readable as labeled cards', () => {
  const admin = file('pages/AdminPage.tsx');
  assert.match(admin, /Mobile: readable labeled records/);
  assert.match(admin, /space-y-3 p-3 sm:hidden/);
  assert.match(admin, /hidden w-full overflow-x-auto sm:block/);
});

test('modal remains scrollable within the mobile viewport', () => {
  const ui = file('components/UI.tsx');
  assert.match(ui, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
  assert.match(ui, /overflow-y-auto overscroll-contain/);
});

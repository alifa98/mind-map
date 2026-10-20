import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeData, computeLayout, ThemeManager } from '../src/mindmap.js';

const fixture = { label: 'A launch', children: [
  { label: 'Design', children: [{ label: 'Brand' }, { label: 'Experience' }] },
  { label: 'Build', children: [{ label: 'Prototype' }, { label: 'Review' }, { label: 'A much longer feature name to test layout bounds' }] },
  { label: 'Share', children: [{ label: 'A story' }] }
] };

test('normalization accepts the documented label aliases and isolates caller data', () => {
  const input = { name: ' Root ', children: [{ text: 'Child' }] };
  const data = normalizeData(input);
  assert.equal(data.label, 'Root'); assert.equal(data.children[0].label, 'Child');
  assert.equal(data.id, 'root'); assert.equal(data.children[0].id, 'root.0');
  data.children.push({ label: 'Changed' }); assert.equal(input.children.length, 1);
});

test('invalid JSON trees fail with useful errors', () => {
  assert.throws(() => normalizeData({ label: '' }), /nonempty/);
  assert.throws(() => normalizeData({ label: 'Root', children: 'oops' }), /must be an array/);
  assert.throws(() => normalizeData({ id: 'same', label: 'Root', children: [{ id: 'same', label: 'Child' }] }), /Duplicate/);
  const cycle = { label: 'Cycle', children: [] }; cycle.children.push(cycle);
  assert.throws(() => normalizeData(cycle), /circular/);
});

for (const style of ['organic-blob', 'table-matrix', 'radial-classic', 'tree-chart']) {
  test(`${style} positions every node once and includes every node in its bounds`, () => {
    const data = normalizeData(fixture), layout = computeLayout(data, { style });
    assert.equal(layout.nodes.length, 10); assert.equal(layout.edges.length, 9);
    assert.equal(new Set(layout.nodes.map(n => n.id)).size, 10);
    for (const n of layout.nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
      assert.ok(n.x - n.width / 2 >= layout.bounds.minX);
      assert.ok(n.x + n.width / 2 <= layout.bounds.maxX);
      assert.ok(n.y - n.height / 2 >= layout.bounds.minY);
      assert.ok(n.y + n.height / 2 <= layout.bounds.maxY);
    }
    assert.deepEqual(computeLayout(data, { style }), layout);
  });
  test(`${style} collapses branches while retaining the parent`, () => {
    const data = normalizeData(fixture), layout = computeLayout(data, { style }, new Set(['root.1']));
    assert.equal(layout.nodes.length, 7); assert.ok(layout.nodes.some(n => n.id === 'root.1'));
    assert.ok(!layout.nodes.some(n => n.id.startsWith('root.1.')));
  });
}

test('matrix parents merge exactly across their descendant rows', () => {
  const layout = computeLayout(normalizeData(fixture), { style: 'table-matrix' });
  const root = layout.nodes[0], children = layout.nodes.filter(n => n.depth === 1);
  assert.equal(root.height, children.reduce((sum, n) => sum + n.height, 0));
  const build = children.find(n => n.label === 'Build');
  assert.equal(build.height, layout.nodes.filter(n => n.id.startsWith(build.id + '.')).reduce((sum, n) => sum + n.height, 0));
});

test('organic layout balances root branches on both sides', () => {
  const layout = computeLayout(normalizeData(fixture), { style: 'organic-blob' });
  assert.ok(layout.nodes.some(n => n.depth === 1 && n.x < 0));
  assert.ok(layout.nodes.some(n => n.depth === 1 && n.x > 0));
  for (const { source, target } of layout.edges.filter(e => e.source.depth > 0)) {
    assert.ok(Math.abs(target.x - source.x) >= (source.width + target.width) / 2);
  }
});

test('tree direction changes the hierarchy axis', () => {
  const data = normalizeData(fixture);
  const vertical = computeLayout(data, { style: 'tree-chart', direction: 'vertical' });
  const horizontal = computeLayout(data, { style: 'tree-chart', direction: 'horizontal' });
  for (const e of vertical.edges) assert.ok(e.target.y > e.source.y);
  for (const e of horizontal.edges) assert.ok(e.target.x > e.source.x);
});

test('theme manager reacts to system changes, honors explicit themes, and removes its listener', () => {
  const oldWindow = globalThis.window;
  let listener, removed = false, callbacks = [];
  const media = { matches: false, addEventListener: (event, fn) => { listener = fn; }, removeEventListener: (event, fn) => { removed = listener === fn; } };
  globalThis.window = { matchMedia: query => { assert.equal(query, '(prefers-color-scheme: dark)'); return media; } };
  try {
    const container = { dataset: {} }, manager = new ThemeManager(container, 'system', (...args) => callbacks.push(args));
    assert.equal(container.dataset.theme, 'light');
    media.matches = true; listener(); assert.equal(container.dataset.theme, 'dark');
    manager.set('light'); listener(); assert.equal(container.dataset.theme, 'light');
    manager.set('system'); assert.equal(container.dataset.theme, 'dark');
    assert.throws(() => manager.set('invalid'), /Invalid theme/);
    manager.destroy(); assert.ok(removed); assert.ok(callbacks.length >= 4);
  } finally { globalThis.window = oldWindow; }
});

test('single-node trees work in all layouts', () => {
  for (const style of ['organic-blob', 'table-matrix', 'radial-classic', 'tree-chart']) {
    const layout = computeLayout(normalizeData({ label: 'A spark' }), { style });
    assert.equal(layout.nodes.length, 1); assert.equal(layout.edges.length, 0);
    assert.ok(layout.bounds.maxX > layout.bounds.minX && layout.bounds.maxY > layout.bounds.minY);
  }
});

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

const nestedColors = normalizeData({ label: 'An idea', children: [
  { id: 'green', label: 'One family', color: '#308060', children: [
    { id: 'child', label: 'A child', children: [{ id: 'grandchild', label: 'A grandchild', children: [{ id: 'great-grandchild', label: 'Another generation' }] }] },
    { id: 'override', label: 'A different family', color: '#b05030', children: [{ id: 'override-child', label: 'Inherit the override' }] }
  ] },
  { id: 'other', label: 'Another branch', children: [{ id: 'other-child', label: 'Another idea' }] }
] });

for (const style of ['organic-blob', 'table-matrix', 'radial-classic', 'tree-chart']) {
  test(`${style} mirrors RTL coordinates and bounds without changing labels or colors`, () => {
    const data = normalizeData(fixture);
    const ltr = computeLayout(data, { style, direction: 'horizontal' });
    const rtl = computeLayout(data, { style, direction: 'rtl' });
    for (const node of rtl.nodes) {
      const original = ltr.nodes.find(n => n.id === node.id);
      assert.equal(node.x, -original.x); assert.equal(node.y, original.y);
      assert.equal(node.label, original.label); assert.equal(node.color, original.color);
    }
    assert.equal(rtl.bounds.minX, -ltr.bounds.maxX); assert.equal(rtl.bounds.maxX, -ltr.bounds.minX);
    if (style === 'tree-chart' || style === 'table-matrix') for (const edge of rtl.edges) assert.ok(edge.target.x < edge.source.x);
  });

  test(`${style} inherits custom branch colors through every descendant and honors overrides`, () => {
    const { nodes } = computeLayout(nestedColors, { style });
    const color = id => nodes.find(node => node.id === id).color;
    for (const id of ['green', 'child', 'grandchild', 'great-grandchild']) assert.equal(color(id), '#308060');
    assert.equal(color('override'), '#b05030'); assert.equal(color('override-child'), '#b05030');
    assert.notEqual(color('other'), color('green')); assert.equal(color('other-child'), color('other'));
  });

  test(`${style} shades deeper nodes progressively within their inherited color family`, () => {
    const { nodes } = computeLayout(nestedColors, { style, depthShading: true, shadeStep: .18 });
    const node = id => nodes.find(n => n.id === id);
    const chain = ['green', 'child', 'grandchild', 'great-grandchild'].map(node);
    assert.equal(chain[0].color, '#308060'); assert.equal(new Set(chain.map(n => n.color)).size, 4);
    for (let i = 1; i < chain.length; i++) {
      assert.equal(chain[i].baseColor, '#308060');
      for (const offset of [1, 3, 5]) assert.ok(parseInt(chain[i].color.slice(offset, offset + 2), 16) > parseInt(chain[i - 1].color.slice(offset, offset + 2), 16));
    }
    assert.equal(node('override').color, '#b05030'); assert.equal(node('override-child').baseColor, '#b05030');
    assert.notEqual(node('override-child').color, '#b05030');
    const collapsed = computeLayout(nestedColors, { style, depthShading: true }, new Set(['other']));
    assert.equal(collapsed.nodes.find(n => n.id === 'grandchild').color, node('grandchild').color);
  });
}

test('LTR alias preserves the existing horizontal tree direction', () => {
  const data = normalizeData(fixture);
  assert.deepEqual(computeLayout(data, { style: 'tree-chart', direction: 'ltr' }), computeLayout(data, { style: 'tree-chart', direction: 'horizontal' }));
});

test('automatic text direction handles Persian, Arabic, Hebrew, mixed text, and leading numbers', () => {
  const labels = ['طراحی محصول', 'إطلاق المنتج', 'תכנון הפרויקט', '2026 · برنامه', 'API v2 — مستندات', 'A new idea'];
  const data = normalizeData({ label: 'Mixed scripts', children: labels.map(label => ({ label })) });
  const nodes = computeLayout(data).nodes.filter(n => n.depth === 1);
  assert.deepEqual(nodes.map(n => n.textDirection), ['rtl', 'rtl', 'rtl', 'rtl', 'ltr', 'ltr']);
  assert.ok(computeLayout(data, { textDirection: 'rtl' }).nodes.every(n => n.textDirection === 'rtl'));
  assert.ok(computeLayout(data, { textDirection: 'ltr' }).nodes.every(n => n.textDirection === 'ltr'));
});

test('per-node direction overrides survive normalization and take priority over map text direction', () => {
  const data = normalizeData({ label: 'Root', children: [{ label: 'سلام API', dir: 'ltr' }, { label: 'English label', dir: 'rtl' }, { label: 'عنوان', dir: 'auto' }] });
  assert.equal(data.children[0].dir, 'ltr');
  const nodes = computeLayout(data, { textDirection: 'ltr' }).nodes.filter(n => n.depth === 1);
  assert.deepEqual(nodes.map(n => n.textDirection), ['ltr', 'rtl', 'rtl']);
  assert.throws(() => normalizeData({ label: 'Invalid', dir: 'upside-down' }), /Invalid text direction/);
});

test('diacritics do not inflate estimated node widths', () => {
  const plain = 'ا'.repeat(20), marked = 'أ'.repeat(20);
  const width = label => computeLayout(normalizeData({ label })).nodes[0].width;
  assert.equal(width(plain), width(marked));
});

test('shade strength is adjustable and flat colors can also use depth shades', () => {
  const childColor = config => computeLayout(nestedColors, config).nodes.find(n => n.id === 'child').color;
  assert.notEqual(childColor({ depthShading: true, shadeStep: .1 }), childColor({ depthShading: true, shadeStep: .28 }));
  assert.equal(childColor({ depthShading: true, shadeStep: 0 }), '#308060');
  assert.notEqual(childColor({ colorScheme: 'flat', depthShading: true }), '#308060');
});

for (const style of ['organic-blob', 'table-matrix', 'radial-classic', 'tree-chart']) {
  test(`${style} mirrors collapsed counts with RTL layout flow, independently of text direction`, () => {
    const data = normalizeData(fixture), collapsed = new Set(['root.0', 'root.1', 'root.2']);
    const ltr = computeLayout(data, { style, direction: 'horizontal', textDirection: 'rtl' }, collapsed);
    const rtl = computeLayout(data, { style, direction: 'rtl', textDirection: 'ltr' }, collapsed);
    for (const node of rtl.nodes.filter(n => n.collapseAnchor)) {
      const original = ltr.nodes.find(n => n.id === node.id);
      assert.ok(Math.abs(node.collapseAnchor.x + original.collapseAnchor.x) < 1e-9);
      assert.ok(Math.abs(node.collapseAnchor.y - original.collapseAnchor.y) < 1e-9);
      if (style === 'table-matrix' || style === 'tree-chart') assert.ok(node.collapseAnchor.x < -node.width / 2);
      if (style === 'organic-blob' && node.depth > 0) assert.equal(Math.sign(node.collapseAnchor.x), node.side);
      if (style === 'radial-classic' && node.depth > 0) assert.ok(node.collapseAnchor.x * node.x + node.collapseAnchor.y * node.y > 0);
    }
  });

  test(`${style} includes visible count badges in fit and export bounds`, () => {
    const data = normalizeData(fixture), collapsed = new Set(['root.0', 'root.1', 'root.2']);
    for (const direction of ['vertical', 'horizontal', 'rtl']) {
      const { nodes, bounds } = computeLayout(data, { style, direction }, collapsed);
      for (const node of nodes.filter(n => collapsed.has(n.id))) {
        const { x, y } = node.collapseAnchor;
        assert.ok(node.x + x - 9 >= bounds.minX && node.x + x + 9 <= bounds.maxX);
        assert.ok(node.y + y - 9 >= bounds.minY && node.y + y + 9 <= bounds.maxY);
      }
    }
  });

  test(`${style} positions the collapsed root count consistently with its flow`, () => {
    const data = normalizeData(fixture);
    const node = computeLayout(data, { style, direction: 'rtl' }, new Set([data.id])).nodes[0];
    assert.ok(node.collapseAnchor.x < -node.width / 2); assert.equal(node.collapseAnchor.y, 0);
  });
}

test('top-down tree counts sit below collapsed nodes', () => {
  const data = normalizeData(fixture), collapsed = new Set(['root.0', 'root.1']);
  for (const textDirection of ['ltr', 'rtl', 'auto']) {
    const { nodes } = computeLayout(data, { style: 'tree-chart', direction: 'vertical', textDirection }, collapsed);
    for (const node of nodes.filter(n => collapsed.has(n.id))) {
      assert.equal(node.collapseAnchor.x, 0); assert.ok(node.collapseAnchor.y > node.height / 2);
    }
  }
});

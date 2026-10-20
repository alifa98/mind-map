const NS = 'http://www.w3.org/2000/svg';
const STYLES = `
.chic-mindmap{--bg-color:#fbfcfa;--text-color:#3a4540;--node-bg:#fff;--border-color:#e6eae6;--root-bg:#254c3b;--root-text:#fff;--branch-stroke:#8da99a;--shadow:0 3px 9px #233d2c08;--grid-color:#dce2db;position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg-color);color:var(--text-color);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;isolation:isolate;touch-action:none;transition:background .3s,color .3s}
.chic-mindmap[data-theme="dark"]{--bg-color:#171f1c;--text-color:#e0e7e1;--node-bg:#222e27;--border-color:#38453c;--root-bg:#b7dcc5;--root-text:#203d2b;--branch-stroke:#789784;--shadow:0 3px 9px #0002;--grid-color:#344338}
.chic-mindmap[data-grid="true"]{background-image:radial-gradient(var(--grid-color) .8px,transparent .8px);background-size:20px 20px}
.chic-mindmap>svg{display:block;width:100%;height:100%;overflow:visible;cursor:grab;outline:none}
.chic-mindmap>svg:active{cursor:grabbing}.chic-mindmap .cm-node{cursor:pointer;outline:none}.chic-mindmap .cm-node .cm-shape{fill:var(--node-bg);stroke:var(--border-color);stroke-width:1;filter:drop-shadow(0 2px 3px #152b1d04)}
.chic-mindmap .cm-node.cm-main .cm-shape{fill:color-mix(in srgb,var(--accent) 9%,var(--node-bg));stroke:color-mix(in srgb,var(--accent) 24%,var(--border-color))}
.chic-mindmap[data-depth-shading="true"] .cm-node:not(.cm-root) .cm-shape{fill:color-mix(in srgb,var(--accent) 14%,var(--node-bg));stroke:color-mix(in srgb,var(--accent) 42%,var(--border-color))}
.chic-mindmap .cm-node .cm-label[direction="rtl"],.chic-mindmap .cm-subtitle[direction="rtl"]{letter-spacing:normal}
.chic-mindmap .cm-node.cm-root .cm-shape{fill:var(--root-bg);stroke:var(--root-bg);filter:drop-shadow(0 5px 10px #1e473b18)}
.chic-mindmap .cm-label{fill:var(--text-color);font-size:12px;font-weight:450;dominant-baseline:middle;pointer-events:none;user-select:none}.chic-mindmap .cm-main .cm-label{fill:color-mix(in srgb,var(--accent) 70%,var(--text-color));font-size:13px;font-weight:600}.chic-mindmap .cm-root .cm-label{fill:var(--root-text);font-size:16px;font-weight:600;letter-spacing:-.4px}.chic-mindmap .cm-subtitle{fill:var(--root-text);font-size:10px;opacity:.65;pointer-events:none;dominant-baseline:middle}.chic-mindmap .cm-dot{fill:var(--accent)}.chic-mindmap .cm-node:hover .cm-shape,.chic-mindmap .cm-node:focus-visible .cm-shape{stroke:var(--accent,#86ac93);stroke-width:2}.chic-mindmap .cm-count{fill:var(--node-bg);stroke:var(--accent);stroke-width:1}.chic-mindmap .cm-count-label{font-size:9px;fill:var(--accent);text-anchor:middle;dominant-baseline:middle;pointer-events:none}.chic-mindmap .cm-edge{pointer-events:none}.chic-mindmap[data-animate="true"] .cm-node{transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .25s}.chic-mindmap[data-animate="true"] .cm-shape,.chic-mindmap[data-animate="true"] .cm-label{transition:fill .3s,stroke .3s}.chic-mindmap .cm-selection .cm-shape{stroke:var(--accent,#6a987a);stroke-width:2}
@keyframes chic-mindmap-appear{from{opacity:0}to{opacity:1}}
.chic-mindmap[data-animate="false"] .cm-node{animation:none!important}
@media(prefers-reduced-motion:reduce){.chic-mindmap,.chic-mindmap .cm-node,.chic-mindmap .cm-shape,.chic-mindmap .cm-label{transition:none!important;animation:none!important}}
`;
const PALETTE = ['#769c76', '#d09360', '#b9899b', '#8787b8', '#6c9caa', '#b29b64'];
const VALID = { style: ['organic-blob', 'table-matrix', 'radial-classic', 'tree-chart'], theme: ['light', 'dark', 'system'], colorScheme: ['rainbow', 'flat', 'gradient-branch'], direction: ['horizontal', 'vertical', 'ltr', 'rtl'], textDirection: ['auto', 'ltr', 'rtl'] };
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = text => segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
const isHorizontal = direction => ['horizontal', 'ltr', 'rtl'].includes(direction);
let instanceId = 0;

function textDirection(text, preference = 'auto') {
  if (preference !== 'auto') return preference;
  const firstLetter = text.match(/\p{Letter}/u)?.[0] || '';
  return /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(firstLetter) ? 'rtl' : 'ltr';
}

function shade(color, levels, step) {
  const amount = Math.min(.6, 1 - (1 - step) ** Math.max(0, levels));
  const rgb = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
  return '#' + rgb.map(channel => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0')).join('');
}

// Measure actual shaped glyphs when attached to SVG. Truncate on grapheme
// boundaries so Arabic diacritics, Hebrew points, and emoji stay intact.
function fitText(text, label, available, estimatedSize) {
  const parts = graphemes(label);
  const measure = () => text.getComputedTextLength?.() || graphemes(text.textContent).length * estimatedSize;
  text.textContent = label;
  if (measure() <= available) return false;
  let low = 0, high = parts.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    text.textContent = parts.slice(0, middle).join('') + '…';
    if (measure() <= available) low = middle; else high = middle - 1;
  }
  text.textContent = parts.slice(0, low).join('') + '…';
  return true;
}

function element(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (parent) parent.append(node);
  return node;
}

/** Validate and clone JSON without retaining mutable caller references. */
export function normalizeData(data) {
  const ids = new Set();
  const active = new WeakSet();
  let total = 0;
  function visit(input, path = 'root', depth = 0) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`Invalid node at ${path}. Expected an object.`);
    if (active.has(input)) throw new TypeError('Mind map data must not contain circular references.');
    if (depth > 100) throw new RangeError('Mind maps support up to 100 nested levels.');
    if (++total > 5000) throw new RangeError('Mind maps support up to 5,000 nodes.');
    const label = input.label ?? input.name ?? input.text;
    if (typeof label !== 'string' || !label.trim()) throw new TypeError(`Node ${path} needs a nonempty label, name, or text.`);
    const id = String(input.id ?? path);
    if (ids.has(id)) throw new TypeError(`Duplicate node id: ${id}`);
    ids.add(id);
    if (input.children !== undefined && !Array.isArray(input.children)) throw new TypeError(`children at ${path} must be an array.`);
    if (input.dir !== undefined && !VALID.textDirection.includes(input.dir)) throw new TypeError(`Invalid text direction at ${path}: ${input.dir}`);
    active.add(input);
    const result = { id, label: label.trim(), ...(input.dir !== undefined ? { dir: input.dir } : {}), ...(typeof input.subtitle === 'string' ? { subtitle: input.subtitle } : {}), ...(typeof input.color === 'string' && /^#[0-9a-f]{6}$/i.test(input.color) ? { color: input.color } : {}), ...(input.collapsed ? { collapsed: true } : {}), children: (input.children || []).map((child, i) => visit(child, `${path}.${i}`, depth + 1)) };
    active.delete(input);
    return result;
  }
  return visit(data);
}

function validateConfig(config) {
  for (const [key, options] of Object.entries(VALID)) if (config[key] !== undefined && !options.includes(config[key])) throw new TypeError(`Invalid ${key}: ${config[key]}. Expected ${options.join(', ')}.`);
  for (const key of ['spacing', 'branchWidth']) if (config[key] !== undefined && (!Number.isFinite(config[key]) || config[key] < .5 || config[key] > 3)) throw new TypeError(`${key} must be a number between 0.5 and 3.`);
  if (config.depthShading !== undefined && typeof config.depthShading !== 'boolean') throw new TypeError('depthShading must be a boolean.');
  if (config.shadeStep !== undefined && (!Number.isFinite(config.shadeStep) || config.shadeStep < 0 || config.shadeStep > .5)) throw new TypeError('shadeStep must be a number between 0 and 0.5.');
}

/** Theme updates only change a scoped data attribute; SVG nodes stay intact. */
export class ThemeManager {
  constructor(container, theme = 'system', onChange) {
    this.container = container;
    this.onChange = onChange;
    this.media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this.listener = () => { if (this.theme === 'system') this.apply(); };
    if (this.media?.addEventListener) this.media.addEventListener('change', this.listener);
    else this.media?.addListener?.(this.listener);
    this.set(theme);
  }
  set(theme) {
    if (!VALID.theme.includes(theme)) throw new TypeError(`Invalid theme: ${theme}`);
    this.theme = theme;
    this.apply();
  }
  apply() {
    this.resolved = this.theme === 'system' ? (this.media?.matches ? 'dark' : 'light') : this.theme;
    this.container.dataset.theme = this.resolved;
    this.onChange?.(this.resolved, this.theme);
  }
  destroy() {
    if (this.media?.removeEventListener) this.media.removeEventListener('change', this.listener);
    else this.media?.removeListener?.(this.listener);
  }
}

/** Deterministic layout, shared by rendering and fit-to-content. */
export function computeLayout(data, config = {}, collapsed = new Set()) {
  const style = config.style || 'organic-blob';
  const spacing = config.spacing ?? 1;
  const nodes = [], edges = [];
  const visible = node => collapsed.has(node.id) ? [] : node.children;
  const count = node => visible(node).length ? visible(node).reduce((sum, child) => sum + count(child), 0) : 1;
  const width = (node, depth) => depth === 0 ? Math.max(180, Math.min(260, graphemes(node.label).length * 8.5 + 55)) : Math.max(depth === 1 ? 131 : 105, Math.min(236, graphemes(node.label).length * 6.8 + (depth === 1 ? 52 : 30)));
  const create = (node, depth, branch, x, y, parent, extra = {}) => {
    const inherits = depth > 1 && !node.color;
    const baseColor = node.color || (inherits ? parent.baseColor : config.colorScheme === 'flat' ? '#789982' : PALETTE[(branch + PALETTE.length) % PALETTE.length]);
    const colorDepth = inherits ? parent.colorDepth : depth;
    const color = config.depthShading ? shade(baseColor, depth - colorDepth, config.shadeStep ?? .18) : baseColor;
    const item = { ...node, depth, branch, x, y, width: width(node, depth), height: depth === 0 ? 79 : depth === 1 ? 41 : 33, color, baseColor, colorDepth, textDirection: textDirection(node.label, node.dir ?? config.textDirection), ...extra };
    nodes.push(item);
    if (parent) edges.push({ source: parent, target: item });
    return item;
  };
  const root = create(data, 0, 0, 0, 0);
  const first = visible(data);
  if (style === 'organic-blob') {
    const split = Math.ceil(first.length / 2);
    const sides = [first.slice(0, split), first.slice(split)];
    sides.forEach((group, sideIndex) => {
      const side = sideIndex === 0 ? 1 : -1;
      const gap = 49 * spacing;
      const branchGap = 38 * spacing;
      const total = group.reduce((sum, child) => sum + count(child) * gap, 0) + Math.max(0, group.length - 1) * branchGap;
      let offset = -total / 2;
      function place(node, depth, branch, start, parent) {
        const leaves = count(node);
        const nodeWidth = width(node, depth);
        const x = depth === 1 ? side * 238 : parent.x + side * (parent.width / 2 + nodeWidth / 2 + 65);
        const item = create(node, depth, branch, x, start + leaves * gap / 2, parent, { side });
        let childOffset = start;
        visible(node).forEach(child => { place(child, depth + 1, branch, childOffset, item); childOffset += count(child) * gap; });
      }
      group.forEach((child, i) => { place(child, 1, sideIndex === 0 ? i : i + split, offset, root); offset += count(child) * gap + branchGap; });
    });
  } else if (style === 'radial-classic') {
    const total = count(data);
    function radial(node, depth, branch, start, span, parent) {
      const angle = start + span / 2;
      const radius = depth * 240 * spacing;
      const item = create(node, depth, branch, Math.cos(angle) * radius, Math.sin(angle) * radius, parent);
      let angleOffset = start;
      visible(node).forEach(child => { const childSpan = span * count(child) / count(node); radial(child, depth + 1, branch, angleOffset, childSpan, item); angleOffset += childSpan; });
    }
    let angle = -Math.PI / 2;
    first.forEach((child, i) => { const span = Math.PI * 2 * count(child) / total; radial(child, 1, i, angle, span, root); angle += span; });
  } else if (style === 'table-matrix') {
    const gap = 54 * spacing;
    nodes.length = 0;
    function matrix(node, depth, branch, start, parent) {
      const height = count(node) * gap;
      const item = create(node, depth, branch, depth * 248, start + height / 2, parent, { width: 248, height, matrix: true });
      let offset = start;
      visible(node).forEach((child, i) => { matrix(child, depth + 1, depth === 0 ? i : branch, offset, item); offset += count(child) * gap; });
    }
    matrix(data, 0, 0, -count(data) * gap / 2, null);
  } else {
    nodes.length = 0;
    const gap = (isHorizontal(config.direction) ? 96 : 260) * spacing;
    const vertical = !isHorizontal(config.direction);
    function tree(node, depth, branch, start, parent) {
      const position = start + count(node) * gap / 2;
      const item = create(node, depth, branch, vertical ? position : depth * 255, vertical ? depth * 140 : position, parent);
      let offset = start;
      visible(node).forEach((child, i) => { tree(child, depth + 1, depth === 0 ? i : branch, offset, item); offset += count(child) * gap; });
    }
    tree(data, 0, 0, -count(data) * gap / 2, null);
  }
  // Mirror coordinates, never glyphs, so labels remain readable in every layout.
  if (config.direction === 'rtl') nodes.forEach(node => { node.x = -node.x; if (node.side) node.side = -node.side; });
  // Collapse badges mark where hidden descendants would expand. Calculate this
  // after mirroring, independently of the label's reading direction.
  for (const node of nodes) {
    if (!node.children.length) continue;
    let dx = config.direction === 'rtl' ? -1 : 1, dy = 0;
    if (style === 'organic-blob') dx = node.side || dx;
    else if (style === 'tree-chart' && !isHorizontal(config.direction)) { dx = 0; dy = 1; }
    else if (style === 'radial-classic' && node.depth > 0 && (node.x || node.y)) { dx = node.x; dy = node.y; }
    const length = Math.hypot(dx, dy);
    const edge = 1 / Math.max(Math.abs(dx) / (node.width / 2), Math.abs(dy) / (node.height / 2));
    node.collapseAnchor = { x: dx * edge + dx / length * 5, y: dy * edge + dy / length * 5 };
  }
  const bounds = nodes.reduce((b, n) => {
    const badge = collapsed.has(n.id) ? n.collapseAnchor : null;
    return {
      minX: Math.min(b.minX, n.x - n.width / 2, badge ? n.x + badge.x - 9 : Infinity),
      maxX: Math.max(b.maxX, n.x + n.width / 2, badge ? n.x + badge.x + 9 : -Infinity),
      minY: Math.min(b.minY, n.y - n.height / 2, badge ? n.y + badge.y - 9 : Infinity),
      maxY: Math.max(b.maxY, n.y + n.height / 2, badge ? n.y + badge.y + 9 : -Infinity)
    };
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  return { nodes, edges, bounds };
}

function taperedPath(x1, y1, x2, y2, startWidth, endWidth) {
  const curve = t => { const u = 1 - t, middle = (x1 + x2) / 2; return { x: u ** 3 * x1 + 3 * u * u * t * middle + 3 * u * t * t * middle + t ** 3 * x2, y: u ** 3 * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y2 }; };
  const a = [], b = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, p = curve(t), prev = curve(Math.max(0, t - .002)), next = curve(Math.min(1, t + .002));
    const dx = next.x - prev.x, dy = next.y - prev.y, len = Math.hypot(dx, dy) || 1, w = (startWidth * (1 - t) + endWidth * t) / 2;
    a.push(`${p.x - dy / len * w},${p.y + dx / len * w}`); b.push(`${p.x + dy / len * w},${p.y - dx / len * w}`);
  }
  return `M${a.join('L')}L${b.reverse().join('L')}Z`;
}

export class MindMap {
  constructor({ container, data, config = {} } = {}) {
    if (!container || container.nodeType !== 1) throw new TypeError('MindMap requires a container element.');
    config = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
    validateConfig(config);
    this.data = normalizeData(data);
    this.config = { style: 'organic-blob', theme: 'system', colorScheme: 'rainbow', spacing: 1, branchWidth: 1, grid: true, animate: true, direction: 'vertical', textDirection: 'auto', depthShading: false, shadeStep: .18, ...config };
    this.container = container;
    this.id = `cm-${++instanceId}`;
    this.collapsed = new Set();
    this._loadCollapsed(this.data);
    this.listeners = [];
    this.destroyed = false;
    this.scale = 1;
    this.offset = { x: 0, y: 0 };
    this.container.classList.add('chic-mindmap');
    this.container.dataset.grid = String(this.config.grid);
    this.container.dataset.animate = String(this.config.animate);
    this.container.dataset.depthShading = String(this.config.depthShading);
    if (!document.querySelector('style[data-chic-mindmap]')) {
      const style = document.createElement('style'); style.dataset.chicMindmap = ''; style.textContent = STYLES; document.head.append(style);
    }
    this.svg = element('svg', { role: 'group', direction: 'ltr', 'aria-label': 'Interactive mind map. Use the arrow keys to pan, plus or minus to zoom, and zero to fit.', tabindex: '0' }, this.container);
    this.defs = element('defs', {}, this.svg);
    this.stage = element('g', {}, this.svg);
    this.edgeLayer = element('g', { 'aria-hidden': 'true' }, this.stage);
    this.nodeLayer = element('g', { role: 'group', 'aria-label': 'Mind map nodes' }, this.stage);
    this.themeManager = new ThemeManager(container, this.config.theme, (resolved, theme) => { this.config.onThemeChange?.(resolved, theme); });
    this._events();
    this.render();
    if (typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(() => this.fit()); this.observer.observe(container); }
  }
  _loadCollapsed(node) { if (node.collapsed) this.collapsed.add(node.id); node.children.forEach(child => this._loadCollapsed(child)); }
  _listen(target, event, fn, options) { target.addEventListener(event, fn, options); this.listeners.push(() => target.removeEventListener(event, fn, options)); }
  _events() {
    this._listen(this.svg, 'wheel', event => {
      event.preventDefault(); const rect = this.svg.getBoundingClientRect(); this.zoom(this.scale * Math.exp(-event.deltaY * .0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }, { passive: false });
    this._listen(this.svg, 'pointerdown', event => {
      if (event.button !== 0 || event.target.closest('.cm-node')) return;
      this.pan = { x: event.clientX, y: event.clientY, offset: { ...this.offset }, id: event.pointerId };
      this.svg.setPointerCapture(event.pointerId);
    });
    this._listen(this.svg, 'pointermove', event => {
      if (!this.pan) return; this.offset = { x: this.pan.offset.x + event.clientX - this.pan.x, y: this.pan.offset.y + event.clientY - this.pan.y }; this._transform();
    });
    const endPan = () => { this.pan = null; };
    this._listen(this.svg, 'pointerup', endPan); this._listen(this.svg, 'pointercancel', endPan);
    this._listen(this.svg, 'keydown', event => {
      if (event.target.closest('.cm-node')) return;
      const moves = { ArrowLeft: [35, 0], ArrowRight: [-35, 0], ArrowUp: [0, 35], ArrowDown: [0, -35] };
      if (moves[event.key]) { event.preventDefault(); this.offset.x += moves[event.key][0]; this.offset.y += moves[event.key][1]; this._transform(); }
      else if (['+', '=', '-', '0'].includes(event.key)) { event.preventDefault(); event.key === '0' ? this.fit() : this.zoom(this.scale * (event.key === '-' ? .85 : 1.15)); }
    });
  }
  render() {
    this.layout = computeLayout(this.data, this.config, this.collapsed);
    this.defs.replaceChildren(); this.edgeLayer.replaceChildren();
    const existing = new Map([...this.nodeLayer.children].map(node => [node.dataset.id, node]));
    this.layout.edges.forEach((edge, i) => this._edge(edge, i));
    this.layout.nodes.forEach(node => {
      let group = existing.get(node.id);
      if (!group) { group = element('g', {}, this.nodeLayer); if (this.config.animate) group.style.animation = 'chic-mindmap-appear .35s ease both'; }
      existing.delete(node.id);
      this._node(group, node);
    });
    existing.forEach(node => node.remove());
    this.fit();
    return this;
  }
  _edge({ source: a, target: b }, index) {
    if (this.config.style === 'table-matrix') return;
    const organic = this.config.style === 'organic-blob';
    const side = b.x >= a.x ? 1 : -1;
    let x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    if (organic || (this.config.style === 'tree-chart' && isHorizontal(this.config.direction))) { x1 += a.width / 2 * side - side * 2; x2 -= b.width / 2 * side - side * 2; }
    else if (this.config.style === 'tree-chart') { y1 += a.height / 2; y2 -= b.height / 2; }
    let paint = this.config.colorScheme === 'flat' && !this.config.depthShading && b.baseColor === '#789982' ? 'var(--branch-stroke)' : b.color;
    if (this.config.colorScheme !== 'flat' || this.config.depthShading) {
      const gradient = element('linearGradient', { id: `${this.id}-g${index}`, gradientUnits: 'userSpaceOnUse', x1, y1, x2, y2 }, this.defs);
      element('stop', { offset: '0%', 'stop-color': a.depth === 0 ? (this.config.colorScheme === 'gradient-branch' ? '#658b74' : b.color) : a.color, 'stop-opacity': a.depth === 0 ? '.65' : '.8' }, gradient);
      element('stop', { offset: '100%', 'stop-color': b.color, 'stop-opacity': '1' }, gradient);
      paint = `url(#${this.id}-g${index})`;
    }
    if (organic && a.depth === 0) element('path', { class: 'cm-edge', d: taperedPath(x1, y1, x2, y2, 9 * this.config.branchWidth, 2 * this.config.branchWidth), fill: paint, opacity: '.8' }, this.edgeLayer);
    else {
      let d = `M${x1},${y1}C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
      if (this.config.style === 'tree-chart' && !isHorizontal(this.config.direction)) d = `M${x1},${y1}C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
      if (this.config.style === 'radial-classic') d = `M${x1},${y1}Q${x1 * .35 + x2 * .65},${y1} ${x2},${y2}`;
      element('path', { class: 'cm-edge', d, stroke: paint, 'stroke-width': Math.max(1, 2.2 - a.depth * .35) * this.config.branchWidth, fill: 'none', 'stroke-linecap': 'round', opacity: '.65' }, this.edgeLayer);
    }
  }
  _node(group, node) {
    group.replaceChildren();
    group.dataset.id = node.id;
    group.setAttribute('class', `cm-node${node.depth === 0 ? ' cm-root' : node.depth === 1 ? ' cm-main' : ''}${this.selectedId === node.id ? ' cm-selection' : ''}`);
    group.setAttribute('transform', `translate(${node.x} ${node.y})`);
    group.style.transform = `translate(${node.x}px,${node.y}px)`;
    group.style.setProperty('--accent', node.color);
    group.setAttribute('tabindex', '0'); group.setAttribute('role', 'button');
    group.setAttribute('aria-label', node.label + (node.children.length ? `, ${this.collapsed.has(node.id) ? 'expand' : 'collapse'} ${node.children.length} children` : ''));
    if (node.children.length) group.setAttribute('aria-expanded', String(!this.collapsed.has(node.id))); else group.removeAttribute('aria-expanded');
    const { width: w, height: h } = node;
    if (node.depth === 0 && this.config.style === 'organic-blob') {
      element('path', { class: 'cm-shape', d: `M${-w / 2 + 25},${-h / 2 + 3}C${-w / 2 + 47},${-h / 2 - 5} ${w / 2 - 44},${-h / 2 - 6} ${w / 2 - 19},${-h / 2 + 6}C${w / 2 + 7},${-h / 2 + 18} ${w / 2 + 7},${h / 2 - 10} ${w / 2 - 19},${h / 2 - 3}C${w / 2 - 44},${h / 2 + 7} ${-w / 2 + 32},${h / 2 + 4} ${-w / 2 + 15},${h / 2 - 3}C${-w / 2 - 9},${h / 2 - 15} ${-w / 2 - 2},${-h / 2 + 13} ${-w / 2 + 25},${-h / 2 + 3}Z` }, group);
    } else element('rect', { class: 'cm-shape', x: -w / 2 + (node.matrix ? 1 : 0), y: -h / 2 + (node.matrix ? 1 : 0), width: w - (node.matrix ? 2 : 0), height: h - (node.matrix ? 2 : 0), rx: node.matrix ? 5 : node.depth === 0 ? 16 : 8 }, group);
    const rtl = node.textDirection === 'rtl';
    if (node.depth === 1) element('circle', { class: 'cm-dot', cx: rtl ? w / 2 - 17 : -w / 2 + 17, cy: 0, r: 3.2 }, group);
    const text = element('text', { class: 'cm-label', direction: node.textDirection, 'unicode-bidi': 'isolate', x: node.depth === 1 ? (rtl ? w / 2 - 28 : -w / 2 + 28) : 0, y: node.depth === 0 && node.subtitle ? -7 : 1, 'text-anchor': node.depth === 1 ? 'start' : 'middle' }, group);
    let truncated = fitText(text, node.label, w - (node.depth === 1 ? 47 : 25), node.depth === 0 ? 8.3 : 6.6);
    if (node.depth === 0 && node.subtitle) {
      const sub = element('text', { class: 'cm-subtitle', direction: textDirection(node.subtitle, node.dir ?? this.config.textDirection), 'unicode-bidi': 'isolate', x: 0, y: 15, 'text-anchor': 'middle' }, group);
      truncated = fitText(sub, node.subtitle, w - 28, 5.5) || truncated;
    }
    if (truncated) { const title = element('title', {}, group); title.textContent = node.label + (node.subtitle ? ` — ${node.subtitle}` : ''); }
    if (this.collapsed.has(node.id) && node.children.length) {
      const { x, y } = node.collapseAnchor;
      element('circle', { class: 'cm-count', cx: x, cy: y, r: 9 }, group);
      const count = element('text', { class: 'cm-count-label', direction: 'ltr', 'unicode-bidi': 'isolate', x, y: y + 1 }, group); count.textContent = String(node.children.length);
    }
    const activate = () => {
      this.selectedId = node.id;
      if (node.children.length) this.toggleNode(node.id);
      else { this.nodeLayer.querySelector('.cm-selection')?.classList.remove('cm-selection'); group.classList.add('cm-selection'); }
      this.config.onNodeClick?.({ ...node });
    };
    group.onclick = activate;
    group.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); activate(); } };
  }
  _transform() { this.stage.setAttribute('transform', `translate(${this.offset.x} ${this.offset.y}) scale(${this.scale})`); this.config.onViewChange?.(this.scale); }
  fit() {
    if (this.destroyed || !this.layout) return this;
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return this;
    const b = this.layout.bounds;
    this.scale = Math.max(.02, Math.min(1.15, (width - 84) / (b.maxX - b.minX + 20), (height - 105) / (b.maxY - b.minY + 20)));
    this.offset = { x: width / 2 - (b.minX + b.maxX) / 2 * this.scale, y: height / 2 - (b.minY + b.maxY) / 2 * this.scale };
    this._transform(); return this;
  }
  zoom(scale, point) {
    const rect = this.container.getBoundingClientRect();
    const center = point || { x: rect.width / 2, y: rect.height / 2 };
    const next = Math.max(.02, Math.min(4, scale));
    this.offset = { x: center.x - (center.x - this.offset.x) * next / this.scale, y: center.y - (center.y - this.offset.y) * next / this.scale };
    this.scale = next; this._transform(); return this;
  }
  zoomIn() { return this.zoom(this.scale * 1.2); }
  zoomOut() { return this.zoom(this.scale / 1.2); }
  setTheme(theme) { this.themeManager.set(theme); this.config.theme = theme; return this; }
  setStyle(style) { return this.setConfig({ style }); }
  setColorScheme(colorScheme) { return this.setConfig({ colorScheme }); }
  setConfig(config) {
    config = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
    validateConfig(config);
    const layoutKeys = ['style', 'colorScheme', 'direction', 'textDirection', 'depthShading', 'shadeStep', 'spacing', 'branchWidth'];
    const shouldRender = layoutKeys.some(key => key in config && config[key] !== this.config[key]);
    Object.assign(this.config, config);
    if ('theme' in config) this.setTheme(config.theme);
    if ('grid' in config) this.container.dataset.grid = String(config.grid);
    if ('animate' in config) this.container.dataset.animate = String(config.animate);
    if ('depthShading' in config) this.container.dataset.depthShading = String(config.depthShading);
    if (shouldRender) this.render();
    return this;
  }
  setData(data) { const next = normalizeData(data); this.data = next; this.collapsed.clear(); this._loadCollapsed(next); return this.render(); }
  getData() {
    const data = JSON.parse(JSON.stringify(this.data));
    const visit = node => { if (this.collapsed.has(node.id)) node.collapsed = true; else delete node.collapsed; node.children.forEach(visit); };
    visit(data); return data;
  }
  toggleNode(id) { const node = this.layout.nodes.find(node => node.id === id); if (!node?.children.length) return this; this.collapsed.has(id) ? this.collapsed.delete(id) : this.collapsed.add(id); return this.render(); }
  expandAll() { this.collapsed.clear(); return this.render(); }
  collapseAll() { this.collapsed.delete(this.data.id); const visit = node => { if (node.id !== this.data.id && node.children.length) this.collapsed.add(node.id); node.children.forEach(visit); }; visit(this.data); return this.render(); }
  exportSVG() {
    const clone = this.svg.cloneNode(true), b = this.layout.bounds, pad = 40;
    clone.setAttribute('xmlns', NS); clone.setAttribute('class', 'chic-mindmap'); clone.setAttribute('data-theme', this.themeManager.resolved);
    clone.setAttribute('data-depth-shading', String(this.config.depthShading));
    clone.setAttribute('width', String(Math.ceil(b.maxX - b.minX + pad * 2))); clone.setAttribute('height', String(Math.ceil(b.maxY - b.minY + pad * 2)));
    clone.setAttribute('viewBox', `${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`);
    clone.querySelector('g').removeAttribute('transform');
    clone.querySelectorAll('.cm-node').forEach(node => { node.style.animation = 'none'; node.style.transition = 'none'; node.classList.remove('cm-selection'); });
    const style = document.createElementNS(NS, 'style'); style.textContent = STYLES; clone.prepend(style);
    clone.style.width = 'auto'; clone.style.height = 'auto';
    return new XMLSerializer().serializeToString(clone);
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.observer?.disconnect(); this.themeManager.destroy(); this.listeners.forEach(remove => remove()); this.svg.remove(); this.container.classList.remove('chic-mindmap');
    for (const key of ['theme', 'grid', 'animate', 'depthShading']) delete this.container.dataset[key];
  }
}

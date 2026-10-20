import { MindMap, normalizeData } from './chic-mindmap.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg class="icon small" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const branch = (label, children) => ({ label, children: children.map(label => ({ label })) });
const examples = [
  { title: 'Product launch', description: 'From first spark to launch day.', tag: 'PLAN SOMETHING GREAT', color: '#83a078', style: 'organic-blob', data: { label: 'Product launch', subtitle: 'The next big thing', children: [branch('Design', ['Brand identity', 'User experience', 'Visual language']), branch('Marketing', ['Content strategy', 'Social channels', 'Launch campaign']), branch('Launch', ['Timeline & milestones', 'Team alignment', 'Success metrics']), branch('Strategy', ['Vision & goals', 'Audience & positioning', 'Market opportunity']), branch('Research', ['User interviews', 'Competitor insights', 'Trend exploration']), branch('Product', ['Core features', 'Roadmap', 'Prototype & test'])] } },
  { title: 'A creative life', description: 'Make a little room for what you love.', tag: 'FOLLOW YOUR CURIOSITY', color: '#ac91b3', style: 'radial-classic', data: { label: 'A creative life', subtitle: 'More of what matters', children: [branch('Make', ['Sketch every day', 'Start a side project', 'Write something']), branch('Explore', ['Visit a new city', 'Try a new medium', 'Read outside the lines']), branch('Connect', ['Find your people', 'Share your process', 'Collaborate']), branch('Recharge', ['Get outside', 'Slow mornings', 'Screen-free Sundays'])] } },
  { title: 'The next chapter', description: 'A thoughtful plan for your next move.', tag: 'GROW WITH INTENTION', color: '#ba9a6d', style: 'tree-chart', data: { label: 'The next chapter', children: [branch('Learn', ['Build new skills', 'Find a mentor', 'Read & reflect']), branch('Create', ['Personal portfolio', 'Meaningful projects', 'Share the journey']), branch('Grow', ['Set clear goals', 'Build good habits', 'Celebrate progress'])] } },
  { title: 'Weekend escape', description: 'Less planning stress. More adventure.', tag: 'GO SOMEWHERE NEW', color: '#7c9ca9', style: 'organic-blob', data: { label: 'Weekend escape', subtitle: 'A change of scenery', children: [branch('Where to?', ['Mountains', 'A cabin in the woods', 'Somewhere by the sea']), branch('Pack light', ['A good book', 'Camera & notebook', 'Walking shoes']), branch('Make time', ['A long breakfast', 'A new trail', 'Absolutely nothing']), branch('The details', ['Book a place', 'Plan the route', 'Invite a friend'])] } },
  { title: 'Team workspace', description: 'Get everyone on the same page.', tag: 'BETTER TOGETHER', color: '#9da76f', style: 'table-matrix', data: { label: 'Our team', children: [branch('Design', ['Brand & creative', 'Product design', 'Design systems']), branch('Engineering', ['Frontend', 'Backend', 'Quality assurance']), branch('Growth', ['Marketing', 'Customer success', 'Partnerships'])] } },
  { title: 'A fresh idea', description: 'An open canvas for your next big thing.', tag: 'START FROM A SPARK', color: '#bc8f97', style: 'organic-blob', data: { label: 'A fresh idea', subtitle: 'Where could this go?', children: [branch('What if…', ['A possibility', 'Another possibility']), branch('Start here', ['A small first step', 'Keep exploring'])] } },
  { title: 'Ideas in every language', description: 'Persian, Arabic, Hebrew, and a little English.', tag: 'RIGHT TO LEFT · DEPTH SHADES', color: '#6c9caa', style: 'tree-chart', config: { direction: 'rtl', textDirection: 'auto', depthShading: true, shadeStep: .18 }, data: { label: 'برنامه‌ریزی پروژه', subtitle: 'از ایده تا اجرا', children: [
    { label: 'طراحی محصول', color: '#4f8b76', children: [{ label: 'تجربهٔ کاربر', children: [{ label: 'مصاحبه با کاربران', children: [{ label: 'ثبت بازخوردها' }] }] }, { label: 'هویت بصری' }] },
    branch('إطلاق المنتج', ['خطة التسويق', 'الجدول الزمني 2026']),
    branch('תכנון הפרויקט', ['מחקר משתמשים', 'יעדים ומדדים']),
    { label: 'API v2 — مستندات', dir: 'ltr', children: [{ label: 'نسخهٔ جدید API v2' }] }
  ] } }
];
const names = { 'organic-blob': 'Organic blob', 'radial-classic': 'Radial classic', 'tree-chart': 'Tree chart', 'table-matrix': 'Table matrix', rainbow: 'Rainbow', flat: 'Keep it simple', 'gradient-branch': 'Branch gradient' };
const initialTheme = (() => { try { const value = localStorage.getItem('chic-mindmap-theme'); return ['light', 'dark', 'system'].includes(value) ? value : 'system'; } catch { return 'system'; } })();
let history = [structuredClone(examples[0].data)], historyIndex = 0, currentExample = 0;
let toastTimeout;
const map = new MindMap({
  container: $('#mindmap-root'), data: examples[0].data,
  config: {
    style: 'organic-blob', theme: initialTheme, colorScheme: 'rainbow',
    onThemeChange: resolved => { document.body.dataset.theme = resolved; $('meta[name="theme-color"]').content = resolved === 'dark' ? '#151c17' : '#f7f8f5'; },
    onViewChange: scale => { $('#zoom-value').textContent = `${Math.round(scale * 100)}%`; },
    onNodeClick: node => { updateCounts(); $('#status-label').textContent = node.children.length ? `${node.label} ${map.collapsed.has(node.id) ? 'folded' : 'unfolded'}` : node.label; }
  }
});
window.chicMap = map;
selectButtons('.theme-switch [data-theme]', 'theme', initialTheme);
updateCounts();
syncDirectionControl();

function toast(message) { clearTimeout(toastTimeout); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
function selectButtons(selector, key, value) { $$(selector).forEach(button => { const selected = button.dataset[key] === value; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); }); }
function updateCounts() {
  const count = node => 1 + (node.children || []).reduce((sum, child) => sum + count(child), 0);
  const total = count(map.data), visible = map.layout.nodes.length;
  $('#node-count').textContent = total === visible ? `${total} nodes` : `${visible} / ${total} nodes`;
  $('#undo').disabled = historyIndex === 0; $('#redo').disabled = historyIndex === history.length - 1;
}
function updateLayout(style) {
  map.setStyle(style); selectButtons('[data-layout]', 'layout', style); syncDirectionControl(); updateStatus();
}
function syncDirectionControl() {
  const tree = map.config.style === 'tree-chart', matrix = map.config.style === 'table-matrix', linear = tree || matrix;
  const vertical = $('#direction option[value="vertical"]');
  vertical.hidden = matrix; vertical.textContent = tree ? 'Top to bottom' : map.config.style === 'radial-classic' ? 'Default order' : 'Balanced';
  $('#direction option[value="horizontal"]').hidden = !linear;
  $('#direction option[value="rtl"]').textContent = linear ? 'Right to left' : 'Mirrored (RTL)';
  $('#direction').value = map.config.direction === 'rtl' ? 'rtl' : linear && (!tree || map.config.direction !== 'vertical') ? 'horizontal' : 'vertical';
}
function syncTextAndShades() {
  $('#text-direction').value = map.config.textDirection;
  $('#depth-shading-toggle').checked = map.config.depthShading;
  $('#shade-step-row').hidden = !map.config.depthShading;
  $('#shade-step').value = String(map.config.shadeStep);
}
function updateStatus() { $('#layout-status').replaceChildren(document.createTextNode(names[map.config.style]), Object.assign(document.createElement('span'), { className: 'status-separator', textContent: '/' }), document.createTextNode(names[map.config.colorScheme])); }
function commitData(data, title = data.label || data.name || data.text) {
  map.setData(data);
  history = history.slice(0, historyIndex + 1); history.push(structuredClone(data)); historyIndex++;
  updateTitle(title); updateCounts(); $('#status-label').textContent = 'All ideas in view';
}
function updateTitle(title) { const label = document.createElement('span'); label.dir = 'auto'; label.textContent = title; $('#map-title').replaceChildren(label, new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="icon small"><use href="#i-chevron"/></svg>`, 'image/svg+xml').documentElement); }
function openDialog(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }
function closeDialog(dialog) { dialog.close(); }
function openData() { $('#json-editor').value = JSON.stringify(map.getData(), null, 2); $('#json-error').textContent = ''; openDialog('#data-dialog'); }
function openDocs() { $('#usage-code').textContent = usageCode(); openDialog('#docs-dialog'); }
function usageCode() { return `import { MindMap } from 'chic-mindmap';\n\nconst map = new MindMap({\n  container: document.getElementById('mindmap-root'),\n  data: {\n    label: 'My next big idea',\n    children: [\n      { label: 'A possibility' },\n      { label: 'A place to start' }\n    ]\n  },\n  config: {\n    style: '${map.config.style}',\n    theme: '${map.config.theme}',\n    colorScheme: '${map.config.colorScheme}',\n    direction: '${map.config.direction}',\n    textDirection: '${map.config.textDirection}',\n    depthShading: ${map.config.depthShading},\n    shadeStep: ${map.config.shadeStep}\n  }\n});\n\nmap.setTheme('dark');`; }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied. Make it yours.'); } catch { toast('Clipboard unavailable. You can select and copy the code.'); } }

$$('[data-layout]').forEach(button => button.addEventListener('click', () => updateLayout(button.dataset.layout)));
$$('[data-color]').forEach(button => button.addEventListener('click', () => { map.setColorScheme(button.dataset.color); selectButtons('[data-color]', 'color', button.dataset.color); updateStatus(); }));
$$('.theme-switch [data-theme]').forEach(button => button.addEventListener('click', () => { map.setTheme(button.dataset.theme); selectButtons('.theme-switch [data-theme]', 'theme', button.dataset.theme); try { localStorage.setItem('chic-mindmap-theme', button.dataset.theme); } catch {} }));
$('#spacing').addEventListener('input', event => { const value = Number(event.target.value); map.setConfig({ spacing: value }); $('#spacing-value').textContent = value < .9 ? 'Cozy' : value > 1.1 ? 'Spacious' : 'Balanced'; event.target.style.background = `linear-gradient(to right,#86a472 ${(value - .65) / .85 * 100}%,var(--line) ${(value - .65) / .85 * 100}%)`; });
$('#grid-toggle').addEventListener('change', event => map.setConfig({ grid: event.target.checked }));
$('#animation-toggle').addEventListener('change', event => map.setConfig({ animate: event.target.checked }));
$('#direction').addEventListener('change', event => map.setConfig({ direction: event.target.value }));
$('#text-direction').addEventListener('change', event => map.setConfig({ textDirection: event.target.value }));
$('#depth-shading-toggle').addEventListener('change', event => { map.setConfig({ depthShading: event.target.checked }); $('#shade-step-row').hidden = !event.target.checked; });
$('#shade-step').addEventListener('change', event => map.setConfig({ shadeStep: Number(event.target.value) }));
$('#zoom-in').addEventListener('click', () => map.zoomIn());
$('#zoom-out').addEventListener('click', () => map.zoomOut());
$('#fit').addEventListener('click', () => { map.fit(); $('#status-label').textContent = 'All ideas in view'; });
$('#zoom-value').addEventListener('click', () => map.fit());
$('#fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#canvas-panel').requestFullscreen(); } catch { toast('Fullscreen is unavailable in this browser.'); } });
$('#open-data-top').addEventListener('click', openData); $('#open-data-side').addEventListener('click', openData);
$('#get-library').addEventListener('click', openDocs); $('#footer-code').addEventListener('click', openDocs);
$$('[data-nav]').forEach(button => button.addEventListener('click', () => { if (button.dataset.nav === 'documentation') openDocs(); else if (button.dataset.nav === 'examples') openDialog('#examples-dialog'); else { $$('dialog[open]').forEach(closeDialog); map.fit(); } }));
$('#map-title').addEventListener('click', () => openDialog('#examples-dialog'));
$$('.close-dialog').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog); } }));
$('#format-json').addEventListener('click', () => { try { $('#json-editor').value = JSON.stringify(JSON.parse($('#json-editor').value), null, 2); $('#json-error').textContent = ''; } catch (error) { $('#json-error').textContent = `Couldn't format this JSON: ${error.message}`; } });
$('#json-editor').addEventListener('keydown', event => { if (event.key === 'Tab') { event.preventDefault(); const { selectionStart: start, selectionEnd: end } = event.target; event.target.setRangeText('  ', start, end, 'end'); } if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') $('#apply-data').click(); });
$('#apply-data').addEventListener('click', () => { try { const data = JSON.parse($('#json-editor').value); normalizeData(data); commitData(data); closeDialog($('#data-dialog')); toast('Your ideas have a new home.'); } catch (error) { $('#json-error').textContent = error.message; } });
$$('[data-copy]').forEach(button => button.addEventListener('click', () => copy(button.dataset.copy)));
$('#copy-usage').addEventListener('click', () => copy(usageCode()));

function exampleArt(color, index) {
  const root = `<rect x="82" y="40" width="54" height="22" rx="9" fill="${color}" stroke="none"/><path d="M95 48h27m-24 6h21" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`;
  return `<svg viewBox="0 0 218 105" aria-hidden="true">${[18, 51, 84].map((y, i) => `<path d="M82 51C65 51 69 ${y} 45 ${y}M136 51C153 51 149 ${y} 173 ${y}" stroke="${i % 2 === 0 ? color : '#b9bc9b'}" opacity=".7"/><rect x="9" y="${y - 6}" width="36" height="12" rx="4" stroke="${color}" stroke-opacity=".45" fill="var(--surface)"/><rect x="173" y="${y - 6}" width="36" height="12" rx="4" stroke="${color}" stroke-opacity=".45" fill="var(--surface)"/>`).join('')}${root}</svg>`;
}
examples.forEach((example, index) => {
  const card = document.createElement('button'); card.className = 'example-card';
  card.innerHTML = `<div class="example-art">${exampleArt(example.color, index)}</div><div class="example-card-content"><h3>${example.title}</h3><p>${example.description}</p><span class="example-tag">${example.tag}</span></div>`;
  card.addEventListener('click', () => { currentExample = index; commitData(example.data); map.setConfig({ direction: 'vertical', textDirection: 'auto', depthShading: false, shadeStep: .18, ...example.config }); updateLayout(example.style); syncTextAndShades(); closeDialog($('#examples-dialog')); toast(`${example.title}. Now make it yours.`); });
  $('#examples-grid').append(card);
});

$('#undo').addEventListener('click', () => { if (historyIndex > 0) { historyIndex--; map.setData(history[historyIndex]); updateTitle(map.data.label); updateCounts(); toast('One step back.'); } });
$('#redo').addEventListener('click', () => { if (historyIndex < history.length - 1) { historyIndex++; map.setData(history[historyIndex]); updateTitle(map.data.label); updateCounts(); toast('One step forward.'); } });
$('#add-node').addEventListener('click', () => {
  $('#new-label').value = ''; $('#new-parent').replaceChildren();
  const append = (node, depth = 0) => { const option = document.createElement('option'); option.value = node.id; option.dir = node.dir || 'auto'; option.textContent = '— '.repeat(depth) + node.label; if (node.id === map.selectedId) option.selected = true; $('#new-parent').append(option); node.children.forEach(child => append(child, depth + 1)); };
  append(map.getData()); openDialog('#node-dialog');
});
$('#node-form').addEventListener('submit', event => {
  event.preventDefault(); const label = $('#new-label').value.trim(); if (!label) { $('#new-label').setCustomValidity('Give your new idea a label.'); $('#new-label').reportValidity(); return; }
  const data = map.getData(); const add = node => { if (node.id === $('#new-parent').value) { delete node.collapsed; node.children ||= []; node.children.push({ id: `idea-${crypto.randomUUID?.() || Date.now()}`, label }); } else node.children?.forEach(add); };
  add(data); commitData(data); closeDialog($('#node-dialog')); toast('A new possibility, connected.');
});
$('#new-label').addEventListener('input', event => event.target.setCustomValidity(''));
$('#reset-map').addEventListener('click', () => {
  commitData(examples[0].data); currentExample = 0;
  map.setConfig({ style: 'organic-blob', colorScheme: 'rainbow', spacing: 1, branchWidth: 1, grid: true, animate: true, direction: 'vertical', textDirection: 'auto', depthShading: false, shadeStep: .18 });
  selectButtons('[data-layout]', 'layout', 'organic-blob'); selectButtons('[data-color]', 'color', 'rainbow'); $('#grid-toggle').checked = true; $('#animation-toggle').checked = true; $('#spacing').value = 1; $('#spacing').style.background = ''; $('#spacing-value').textContent = 'Balanced'; syncDirectionControl(); syncTextAndShades();
  updateStatus(); updateCounts(); toast('A fresh canvas. A fresh perspective.');
});

$('#export-button').addEventListener('click', () => { const open = $('#export-menu').hidden; $('#export-menu').hidden = !open; $('#export-button').setAttribute('aria-expanded', String(open)); });
document.addEventListener('click', event => { if (!event.target.closest('.dropdown')) { $('#export-menu').hidden = true; $('#export-button').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('#export-menu').hidden = true; $('#export-button').setAttribute('aria-expanded', 'false'); } });
function download(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 15000); }
$$('[data-export]').forEach(button => button.addEventListener('click', async () => {
  const format = button.dataset.export; const filename = map.data.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mindmap';
  $('#export-menu').hidden = true; $('#export-button').setAttribute('aria-expanded', 'false');
  try {
    if (format === 'json') download(new Blob([JSON.stringify(map.getData(), null, 2)], { type: 'application/json' }), `${filename}.json`);
    else if (format === 'svg') download(new Blob([map.exportSVG()], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`);
    else {
      const svg = map.exportSVG(); const image = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Image rendering failed')); image.src = url; });
        const canvas = document.createElement('canvas'), b = map.layout.bounds;
        const ratio = Math.min(2, 8192 / Math.max(b.maxX - b.minX + 80, b.maxY - b.minY + 80));
        canvas.width = Math.ceil((b.maxX - b.minX + 80) * ratio); canvas.height = Math.ceil((b.maxY - b.minY + 80) * ratio);
        const context = canvas.getContext('2d'); context.fillStyle = map.themeManager.resolved === 'dark' ? '#171f1c' : '#fbfcfa'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('Image export is unavailable'); download(blob, `${filename}.png`);
      } finally { URL.revokeObjectURL(url); }
    }
    toast(`Your ${format.toUpperCase()} is ready. Take your ideas anywhere.`);
  } catch (error) { toast(`Couldn't export: ${error.message}`); }
}));

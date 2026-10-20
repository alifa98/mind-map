# chic-mindmap

A compact, zero-dependency SVG mind map library with four layouts, scoped light/dark themes, and a live playground. The core is approximately **7.7 kB gzipped**, with no external fonts, stylesheets, or runtime packages.

```sh
npm run dev
```

Open **http://localhost:5173**. The playground supports layout and theme switching, color schemes, collapsible branches, JSON editing, example maps, adding nodes, undo/redo for data changes, panning, zooming, fullscreen, and SVG/PNG/JSON exports. Theme preference is remembered locally.

## Build and verify

Requires Node.js 18 or newer. No installation step is needed to develop or build.

```sh
npm test
npm run build
npm pack --dry-run
```

The build creates:

- `dist/chic-mindmap.js` — native ESM.
- `dist/chic-mindmap.umd.js` — browser script, exposed as `ChicMindmap`.
- `dist/chic-mindmap.umd.cjs` — CommonJS entry.
- `dist/chic-mindmap.d.ts` — TypeScript declarations.
- `dist/index.html`, `playground.css`, and `playground.js` — a standalone static playground. Serve `dist/` with any static HTTP server.

The package is ready for local installation with `npm install /path/to/mind-map`, or for npm publication. The package name is not published by this project; `npm install chic-mindmap` applies after registry publication.

## Usage

Give the container an explicit height; the map fills its container.

```html
<div id="mindmap-root" style="width: 100%; height: 600px"></div>
```

```js
import { MindMap } from 'chic-mindmap';

const map = new MindMap({
  container: document.getElementById('mindmap-root'),
  data: {
    label: 'A big idea',
    subtitle: 'The next chapter',
    children: [
      { label: 'Explore', children: [{ label: 'A possibility' }] },
      { label: 'Create', children: [{ label: 'A first step' }] }
    ]
  },
  config: {
    style: 'organic-blob',
    theme: 'system',
    colorScheme: 'rainbow'
  }
});

map.setTheme('dark');
```

For a browser script:

```html
<script src="./dist/chic-mindmap.umd.js"></script>
<script>
  const map = new ChicMindmap.MindMap({
    container: document.getElementById('mindmap-root'),
    data: { label: 'Start here', children: [{ label: 'Keep exploring' }] }
  });
</script>
```

CommonJS: `const { MindMap } = require('chic-mindmap');`.

## Data

Nodes accept `label` (also `name` or `text`), optional stable string `id`, `children`, `subtitle` on the root, `color` as a six-digit hex color, and `collapsed`. Omitted IDs are derived from tree paths. Provide stable IDs when reordering nodes to retain identity during transitions. Input data is validated and cloned. Labels render as SVG text, never HTML. Duplicate IDs, circular references, empty labels, invalid children, more than 100 nested levels, and more than 5,000 nodes are rejected with descriptive errors.

## Configuration

| Option | Default | Values |
| --- | --- | --- |
| `style` | `organic-blob` | `organic-blob`, `table-matrix`, `radial-classic`, `tree-chart` |
| `theme` | `system` | `light`, `dark`, `system` |
| `colorScheme` | `rainbow` | `rainbow`, `flat`, `gradient-branch` |
| `direction` | `vertical` | `vertical`, `horizontal` (tree chart) |
| `spacing` | `1` | `0.5`–`3` |
| `branchWidth` | `1` | `0.5`–`3` |
| `grid` | `true` | Boolean |
| `animate` | `true` | Boolean; respects reduced-motion preferences |
| `onNodeClick` | — | `(node) => void` |
| `onThemeChange` | — | `(resolvedTheme, preference) => void` |
| `onViewChange` | — | `(scale) => void` |

Organic maps have a fluid central shape and tapered Bézier branches. Matrix cells merge across the rows occupied by their descendants. Radial maps distribute branches around 360°. Tree charts support both directions. Oversized labels are abbreviated with the full text available in their accessible name and hover title.

## Methods

```js
map.setTheme('system');
map.setStyle('table-matrix');
map.setColorScheme('gradient-branch');
map.setConfig({ spacing: 1.2, grid: false });
map.setData(nextTree);
map.toggleNode('root.0');
map.expandAll();
map.collapseAll(); // Keeps the root open.
map.fit();
map.zoom(1.25);
map.zoomIn();
map.zoomOut();
const tree = map.getData(); // Independent clone, including current collapsed state.
const svg = map.exportSVG(); // Self-contained SVG with embedded theme CSS.
map.destroy(); // Disconnects observers, listeners, and removes the SVG.
```

Mutating methods return the map instance for chaining. Updating data or layout fits the content to the container. `ResizeObserver` keeps maps fitted as the container changes size. Call `fit()` manually after resizing in older environments without this API.

## Themes and accessibility

The default reads `window.matchMedia('(prefers-color-scheme: dark)')` and reacts to changes while `theme: 'system'` is selected. Explicit themes stay fixed. Theme updates change only `data-theme` on the container; existing SVG elements are preserved. Multiple maps can use independent themes.

Customize scoped variables on `.chic-mindmap[data-theme="light"]` or `[data-theme="dark"]`: `--bg-color`, `--text-color`, `--node-bg`, `--border-color`, `--root-bg`, `--root-text`, `--branch-stroke`, and `--grid-color`.

Drag the canvas to pan and scroll to zoom. Keyboard users can Tab through nodes, press Enter or Space to fold branches, and focus the canvas to pan with arrow keys, zoom with `+`/`-`, or fit with `0`. Nodes have accessible names and expansion states. Motion respects `prefers-reduced-motion`. Supported browsers are current evergreen browsers with SVG, CSS custom properties, and `color-mix()` support. No network access is needed at runtime.

MIT licensed.

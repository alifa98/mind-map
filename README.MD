# chic-mindmap

A compact, zero-dependency SVG mind map library with four layouts, scoped light/dark themes, RTL text and layouts, optional depth-based color shades, and a live playground. The core is approximately **9.2 kB gzipped**, with no external fonts, stylesheets, or runtime packages.

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

Nodes accept `label` (also `name` or `text`), optional stable string `id`, `children`, `subtitle` on the root, `color` as a six-digit hex color, `dir` (`auto`, `ltr`, or `rtl`) for an individual label, and `collapsed`. Omitted IDs are derived from tree paths. Provide stable IDs when reordering nodes to retain identity during transitions. Input data is validated and cloned. Labels render as SVG text, never HTML. Duplicate IDs, circular references, empty labels, invalid children, more than 100 nested levels, and more than 5,000 nodes are rejected with descriptive errors.

## Configuration

| Option | Default | Values |
| --- | --- | --- |
| `style` | `organic-blob` | `organic-blob`, `table-matrix`, `radial-classic`, `tree-chart` |
| `theme` | `system` | `light`, `dark`, `system` |
| `colorScheme` | `rainbow` | `rainbow`, `flat`, `gradient-branch` |
| `direction` | `vertical` | `vertical` (top-down tree / default for other layouts), `horizontal` or `ltr`, `rtl` |
| `textDirection` | `auto` | `auto`, `ltr`, `rtl`; independent of layout flow |
| `depthShading` | `false` | Tint all descendant nodes and lighten their branch colors by depth |
| `shadeStep` | `0.18` | `0`–`0.5`; strength of each depth step when shading is enabled |
| `spacing` | `1` | `0.5`–`3` |
| `branchWidth` | `1` | `0.5`–`3` |
| `grid` | `true` | Boolean |
| `animate` | `true` | Boolean; respects reduced-motion preferences |
| `onNodeClick` | — | `(node) => void` |
| `onThemeChange` | — | `(resolvedTheme, preference) => void` |
| `onViewChange` | — | `(scale) => void` |

Organic maps have a fluid central shape and tapered Bézier branches. Matrix cells merge across the rows occupied by their descendants. Radial maps distribute branches around 360°. Tree charts support top-down, left-to-right, and right-to-left flow. RTL puts the root on the right in tree and matrix layouts; in organic and radial layouts it mirrors the default branch positions. Oversized labels are abbreviated with the full text available in their accessible name and hover title.

## Right-to-left languages and layouts

```js
map.setConfig({
  style: 'tree-chart',
  direction: 'rtl',       // Root on the right, descendants extend left.
  textDirection: 'auto'  // Detect the reading direction of each label.
});
```

Automatic text direction uses each label's first letter to recognize Persian, Arabic, and Hebrew, including labels preceded by numbers or punctuation. English and RTL labels can share the same map. Use `textDirection: 'rtl'` to force RTL globally, or `dir` on an individual node to override the map preference. The root subtitle is detected independently in automatic mode. SVG text uses isolated bidirectional runs, RTL labels align from the right, and label truncation uses grapheme boundaries where `Intl.Segmenter` is available. Exported SVG and PNG retain the reading direction and layout.

The playground has **Map flow**, **Text direction**, and an **Ideas in every language** example with Persian, Arabic, Hebrew, English, and four generations of descendants.

Collapsed-child counts follow the expansion direction: left for RTL tree and matrix layouts, outward along organic and radial branches, and below nodes in top-down trees. Counts mirror with the layout independently of label language, stay readable, and are included in fit and export bounds.

## Color continuity and depth shades

Every top-level branch keeps its color family through all descendants. A node's explicit `color` starts a new color family for its subtree. Enable depth shading for progressively lighter shades of that family and subtle tinted backgrounds on deeper nodes:

```js
map.setConfig({
  colorScheme: 'gradient-branch',
  depthShading: true,
  shadeStep: 0.18 // Smaller = subtler; larger = stronger.
});

map.setData({
  label: 'An idea',
  children: [{
    label: 'Research',
    color: '#4f8b76',
    children: [{
      label: 'Interviews', // Lighter green.
      children: [
        { label: 'Findings' }, // A still lighter green.
        { label: 'A new direction', color: '#b9899b', children: [
          { label: 'Next steps' } // Inherits a lighter shade of the new pink.
        ] }
      ]
    }]
  }]
});
```

Depth shading works with all four layouts and all three color schemes. Shades are capped so very deep hierarchies retain their color family. Disable `depthShading` to keep each family's exact color. In the playground, toggle **Shade by depth** and choose **Subtle**, **Balanced**, or **Bold** strength. Theme changes preserve branch colors and adapt the node backgrounds and text using the existing scoped variables.

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

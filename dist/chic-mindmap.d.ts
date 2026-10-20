export type Theme = 'light' | 'dark' | 'system';
export type LayoutStyle = 'organic-blob' | 'table-matrix' | 'radial-classic' | 'tree-chart';
export type ColorScheme = 'rainbow' | 'flat' | 'gradient-branch';
export interface MindMapNode {
  id?: string;
  label?: string;
  name?: string;
  text?: string;
  subtitle?: string;
  color?: string;
  collapsed?: boolean;
  children?: MindMapNode[];
}
export interface MindMapConfig {
  style?: LayoutStyle;
  theme?: Theme;
  colorScheme?: ColorScheme;
  direction?: 'vertical' | 'horizontal';
  spacing?: number;
  branchWidth?: number;
  grid?: boolean;
  animate?: boolean;
  onNodeClick?: (node: MindMapNode & { depth: number; x: number; y: number }) => void;
  onThemeChange?: (resolved: 'light' | 'dark', preference: Theme) => void;
  onViewChange?: (scale: number) => void;
}
export class ThemeManager {
  constructor(container: HTMLElement, theme?: Theme, onChange?: MindMapConfig['onThemeChange']);
  theme: Theme;
  resolved: 'light' | 'dark';
  set(theme: Theme): void;
  destroy(): void;
}
export class MindMap {
  constructor(options: { container: HTMLElement; data: MindMapNode; config?: MindMapConfig });
  config: MindMapConfig;
  scale: number;
  setTheme(theme: Theme): this;
  setStyle(style: LayoutStyle): this;
  setColorScheme(scheme: ColorScheme): this;
  setConfig(config: MindMapConfig): this;
  setData(data: MindMapNode): this;
  getData(): MindMapNode;
  toggleNode(id: string): this;
  expandAll(): this;
  collapseAll(): this;
  zoom(scale: number, point?: { x: number; y: number }): this;
  zoomIn(): this;
  zoomOut(): this;
  fit(): this;
  render(): this;
  exportSVG(): string;
  destroy(): void;
}
export function normalizeData(data: MindMapNode): MindMapNode & { id: string; label: string; children: MindMapNode[] };
export function computeLayout(data: ReturnType<typeof normalizeData>, config?: MindMapConfig, collapsed?: Set<string>): { nodes: Array<MindMapNode & { id: string; x: number; y: number; width: number; height: number; depth: number; color: string }>; edges: Array<{ source: object; target: object }>; bounds: { minX: number; minY: number; maxX: number; maxY: number } };

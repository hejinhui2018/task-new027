/** 语言代码：中文 / 英文 / 德文 */
export type LanguageCode = 'zh' | 'en' | 'de';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
];

/** 包装面板 */
export type PanelId = 'front' | 'side' | 'back';

export interface FontSpec {
  id: string;
  label: string;
  cssFamily: string;
}

/** 带步长的取值范围（闭区间） */
export interface Range {
  min: number;
  max: number;
  step: number;
}

/** 一个排版区域允许的字体、字号（pt）与行距（倍数）约束 */
export interface ZoneConstraints {
  allowedFontIds: string[];
  fontSizePt: Range;
  lineHeight: Range;
}

/** 毫米矩形（相对面板左上角） */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Zone {
  id: string;
  panelId: PanelId;
  name: string;
  rect: Rect;
  paddingMm: number;
  defaultConstraints: ZoneConstraints;
}

export interface Panel {
  id: PanelId;
  name: string;
  widthMm: number;
  heightMm: number;
  zones: Zone[];
}

/**
 * normal：普通文案块，放不下时按溢出处理；
 * atomic：不可拆分声明（如强制警示语），必须完整落在同一区域内，禁止跨区拆分。
 */
export type BlockKind = 'normal' | 'atomic';

export interface CopyBlock {
  id: string;
  zoneId: string;
  /** 中文显示名，用于违规定位 */
  label: string;
  kind: BlockKind;
  /** 同一面板内的阅读顺序（小者先读） */
  readingOrder: number;
  text: string;
}

export interface CopyVersion {
  id: string;
  name: string;
  note: string;
  copy: Record<LanguageCode, CopyBlock[]>;
}

export interface ProductSpec {
  fonts: FontSpec[];
  panels: Panel[];
  versions: CopyVersion[];
}

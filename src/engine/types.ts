/**
 * PackProof 排版引擎 —— 全部类型定义。
 * 引擎为纯函数：同一份输入（文案 + 约束 + 语言 + 版本 + 测量器）必然得到同一份输出。
 */

export type Language = 'zh' | 'en' | 'de';
export type VersionId = 'base' | 'nordic';
export type PanelId = 'front' | 'side' | 'back';

/** 用户可调整的排版约束 */
export interface Constraints {
  /** 允许使用的字体 id 列表（顺序即优先级） */
  allowedFonts: string[];
  /** 字号下限（pt） */
  minFontSizePt: number;
  /** 字号上限（pt） */
  maxFontSizePt: number;
  /** 行距下限（字号倍数） */
  minLineHeight: number;
  /** 行距上限（字号倍数） */
  maxLineHeight: number;
}

/** 面板上的一个矩形区域（真实毫米） */
export interface RegionDef {
  id: string;
  label: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

/** 包装面版（正面/侧面/背面），尺寸为真实毫米 */
export interface PanelDef {
  id: PanelId;
  label: string;
  widthMm: number;
  heightMm: number;
  /** 区域在数组中的顺序 = 阅读时从上到下的空间顺序 */
  regions: RegionDef[];
}

/** 文案表：blockId → 语言 → 版本 → 文本 */
export type TextsMap = Record<string, Record<Language, Record<VersionId, string>>>;

/** 一个文案区块（品牌、品名、警示语、强制声明……） */
export interface BlockDef {
  id: string;
  /** 中文名，用于界面与违规说明 */
  label: string;
  panelId: PanelId;
  /** 规定的阅读顺序（面板内从 1 开始递增） */
  order: number;
  /** 原子区块：不可拆分到多个区域（如强制声明） */
  atomic: boolean;
  /** 默认所在区域 */
  regionId: string;
  /** 特定语言+版本下的区域覆盖（例如改版时声明被挪到别的区域） */
  regionOverrides?: Partial<Record<Language, Partial<Record<VersionId, string>>>>;
}

/** 字体定义：cssFamily 用于浏览器渲染与 canvas 测量，widthFactor 仅用于离线表格测量器 */
export interface FontDef {
  id: string;
  label: string;
  cssFamily: string;
  widthFactor: number;
}

/** 一个候选排版方案 */
export interface Candidate {
  fontId: string;
  sizePt: number;
  lineHeight: number;
}

/** 一行已排版的文字 */
export interface LineItem {
  blockId: string;
  text: string;
  /** 行顶相对区域顶部的距离（mm） */
  yMm: number;
  /** 实测行宽（mm） */
  widthMm: number;
  /** 行高（mm） */
  lineHeightMm: number;
  /** 该行是否超出区域下边界 */
  overflowsRegion: boolean;
}

/** 超宽且不可断行的词 */
export interface OverlongToken {
  blockId: string;
  token: string;
  widthMm: number;
}

/** 区块在区域内的纵向占位 */
export interface BlockRange {
  blockId: string;
  startYMm: number;
  endYMm: number;
}

export type ViolationKind = 'OVERFLOW' | 'OUT_OF_BOUNDS' | 'ORDER' | 'ATOMIC_SPLIT';

/** 一条验收违规：说明哪段文字、哪条限制、具体数值 */
export interface Violation {
  kind: ViolationKind;
  panelId: PanelId;
  regionId: string;
  /** 引发违规的区块 */
  blockId?: string;
  /** 关联区块（如顺序冲突中的另一方） */
  relatedBlockId?: string;
  /** 面向用户的完整说明（含数值与建议） */
  message: string;
  /** 引发问题的文字片段 */
  snippet?: string;
  /** 需要的尺寸（mm） */
  neededMm?: number;
  /** 可用的尺寸（mm） */
  availableMm?: number;
  /** 越界的词（OUT_OF_BOUNDS） */
  token?: string;
}

/** 一个区域的排版结果 */
export interface RegionLayout {
  regionId: string;
  /** 是否找到满足全部约束的可用方案 */
  fits: boolean;
  /** 最终采用的方案（无可用方案时为最小兜底方案） */
  scheme: Candidate;
  items: LineItem[];
  totalHeightMm: number;
  overlong: OverlongToken[];
  blockRanges: BlockRange[];
  violations: Violation[];
}

export interface PanelLayout {
  panelId: PanelId;
  regions: RegionLayout[];
  /** 本面版全部违规（区域违规 + 阅读顺序违规） */
  violations: Violation[];
}

export interface LayoutResult {
  language: Language;
  version: VersionId;
  panels: PanelLayout[];
  violations: Violation[];
}

/** computeLayout 的输入：一份不可变的“文档 + 视角” */
export interface LayoutInput {
  texts: TextsMap;
  constraints: Constraints;
  language: Language;
  version: VersionId;
}

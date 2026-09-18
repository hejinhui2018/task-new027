import type {
  CopyBlock,
  CopyVersion,
  LanguageCode,
  PanelId,
  ProductSpec,
  Zone,
  ZoneConstraints,
} from '../types';
import { PT_TO_MM, type Measurer } from './measurer';
import { EPS_MM, wrapText } from './wrap';

/** 同一区域内相邻文案块的固定间距（mm） */
export const BLOCK_GAP_MM = 2;

/** 一套可用排版方案：字体 + 字号 + 行距 */
export interface Candidate {
  fontId: string;
  sizePt: number;
  lineHeight: number;
}

export interface LaidLine {
  text: string;
  widthMm: number;
}

export interface LaidBlock {
  block: CopyBlock;
  zoneId: string;
  candidate: Candidate;
  lines: LaidLine[];
  heightMm: number;
  /** 面板坐标系中的绝对顶边位置（mm） */
  topYMm: number;
  fitsHeight: boolean;
  fitsWidth: boolean;
  unbreakable: { token: string; widthMm: number }[];
}

export interface ZoneLayout {
  zoneId: string;
  blocks: LaidBlock[];
  usedHeightMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
}

export interface PanelLayout {
  panelId: PanelId;
  zones: Record<string, ZoneLayout>;
}

export type ViolationKind = 'overflow' | 'out-of-bounds' | 'reading-order' | 'atomic';

export interface Violation {
  /** 稳定 ID：kind + 文案块（+ 词），用于跨版本对比 */
  id: string;
  kind: ViolationKind;
  panelId: PanelId;
  zoneId: string;
  blockId: string;
  label: string;
  message: string;
}

export interface LayoutResult {
  panels: Record<PanelId, PanelLayout>;
  violations: Violation[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toFixed(1);

/** 约束兜底：用户把约束改到非法（无字体 / min>max）时回退到区域默认约束 */
function sanitizeConstraints(zone: Zone, c: ZoneConstraints | undefined): ZoneConstraints {
  const fallback = zone.defaultConstraints;
  if (!c) return fallback;
  if (c.allowedFontIds.length === 0) return fallback;
  if (c.fontSizePt.min > c.fontSizePt.max || c.lineHeight.min > c.lineHeight.max) return fallback;
  if (c.fontSizePt.min <= 0 || c.lineHeight.min <= 0) return fallback;
  return c;
}

/**
 * 枚举候选方案，优先级固定：字号从大到小 → 行距从小到大 → 字体按允许列表顺序。
 * 完全确定的顺序保证同一输入永远得到同一方案。
 */
export function* iterCandidates(c: ZoneConstraints): Generator<Candidate> {
  const sizes: number[] = [];
  for (let s = c.fontSizePt.max; s >= c.fontSizePt.min - 1e-9; s -= c.fontSizePt.step) {
    sizes.push(round2(s));
  }
  const lhs: number[] = [];
  for (let l = c.lineHeight.min; l <= c.lineHeight.max + 1e-9; l += c.lineHeight.step) {
    lhs.push(round2(l));
  }
  for (const sizePt of sizes) {
    for (const lineHeight of lhs) {
      for (const fontId of c.allowedFontIds) {
        yield { fontId, sizePt, lineHeight };
      }
    }
  }
}

export interface BlockLayoutResult {
  candidate: Candidate;
  lines: LaidLine[];
  heightMm: number;
  fitsHeight: boolean;
  fitsWidth: boolean;
  unbreakable: { token: string; widthMm: number }[];
}

/**
 * 为一个文案块选择排版方案：
 * 返回第一个宽度和高度都放得下的候选；若全部放不下，返回"最优失败方案"
 * （先比横向越界量，再比纵向溢出量，再按候选顺序），并标记 fits 标志。
 */
export function layoutBlock(
  block: CopyBlock,
  zone: Zone,
  constraints: ZoneConstraints,
  availHeightMm: number,
  measurer: Measurer,
): BlockLayoutResult {
  const c = sanitizeConstraints(zone, constraints);
  const innerWidthMm = zone.rect.w - 2 * zone.paddingMm;

  interface Attempt {
    candidate: Candidate;
    lines: LaidLine[];
    heightMm: number;
    fitsWidth: boolean;
    fitsHeight: boolean;
    unbreakable: { token: string; widthMm: number }[];
    widthOverflow: number;
    heightOverflow: number;
    index: number;
  }

  let fallback: Attempt | null = null;
  let index = 0;
  for (const candidate of iterCandidates(c)) {
    const wrap = wrapText(block.text, innerWidthMm, candidate.fontId, candidate.sizePt, measurer);
    const lines: LaidLine[] = wrap.lines.map((text, i) => ({ text, widthMm: wrap.lineWidthsMm[i] }));
    const heightMm = lines.length * candidate.sizePt * PT_TO_MM * candidate.lineHeight;
    const fitsWidth = wrap.unbreakable.length === 0;
    const fitsHeight = heightMm <= availHeightMm + EPS_MM;
    if (fitsWidth && fitsHeight) {
      return { candidate, lines, heightMm, fitsHeight: true, fitsWidth: true, unbreakable: [] };
    }
    const maxLineWidth = lines.reduce((m, l) => Math.max(m, l.widthMm), 0);
    const attempt: Attempt = {
      candidate,
      lines,
      heightMm,
      fitsWidth,
      fitsHeight,
      unbreakable: wrap.unbreakable,
      widthOverflow: Math.max(0, maxLineWidth - innerWidthMm),
      heightOverflow: Math.max(0, heightMm - availHeightMm),
      index,
    };
    if (fallback === null || compareAttempts(attempt, fallback) < 0) {
      fallback = attempt;
    }
    index += 1;
  }
  const best = fallback!;
  return {
    candidate: best.candidate,
    lines: best.lines,
    heightMm: best.heightMm,
    fitsHeight: best.fitsHeight,
    fitsWidth: best.fitsWidth,
    unbreakable: best.unbreakable,
  };
}

/** 字典序比较失败方案：横向越界优先，其次纵向溢出，其次候选顺序 */
function compareAttempts(
  a: { fitsWidth: boolean; widthOverflow: number; heightOverflow: number; index: number },
  b: { fitsWidth: boolean; widthOverflow: number; heightOverflow: number; index: number },
): number {
  const wa = a.fitsWidth ? 0 : 1;
  const wb = b.fitsWidth ? 0 : 1;
  if (wa !== wb) return wa - wb;
  if (Math.abs(a.widthOverflow - b.widthOverflow) > EPS_MM) return a.widthOverflow - b.widthOverflow;
  if (Math.abs(a.heightOverflow - b.heightOverflow) > EPS_MM) return a.heightOverflow - b.heightOverflow;
  return a.index - b.index;
}

function excerpt(text: string, max = 24): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * 对整个产品（某版本 + 某语言）排版并产出违规诊断。
 * 纯函数：输出只取决于输入与测量器，同一输入重复计算结果一致。
 */
export function layoutProduct(
  spec: ProductSpec,
  constraintsByZone: Record<string, ZoneConstraints>,
  version: CopyVersion,
  language: LanguageCode,
  measurer: Measurer,
): LayoutResult {
  const blocksByZone = new Map<string, CopyBlock[]>();
  for (const b of version.copy[language]) {
    const list = blocksByZone.get(b.zoneId) ?? [];
    list.push(b);
    blocksByZone.set(b.zoneId, list);
  }

  const panels = {} as Record<PanelId, PanelLayout>;
  const violations: Violation[] = [];
  const orderEntries: { panelId: PanelId; block: CopyBlock; topYMm: number }[] = [];

  for (const panel of spec.panels) {
    const zones: Record<string, ZoneLayout> = {};
    for (const zone of panel.zones) {
      const constraints = sanitizeConstraints(zone, constraintsByZone[zone.id]);
      const innerWidthMm = zone.rect.w - 2 * zone.paddingMm;
      const innerHeightMm = zone.rect.h - 2 * zone.paddingMm;
      const zoneBlocks = (blocksByZone.get(zone.id) ?? [])
        .slice()
        .sort((a, b) => a.readingOrder - b.readingOrder);

      const laid: LaidBlock[] = [];
      let used = 0;
      for (const block of zoneBlocks) {
        const availHeightMm = Math.max(0, innerHeightMm - used);
        const r = layoutBlock(block, zone, constraints, availHeightMm, measurer);
        const topYMm = zone.rect.y + zone.paddingMm + used;
        laid.push({
          block,
          zoneId: zone.id,
          candidate: r.candidate,
          lines: r.lines,
          heightMm: r.heightMm,
          topYMm,
          fitsHeight: r.fitsHeight,
          fitsWidth: r.fitsWidth,
          unbreakable: r.unbreakable,
        });
        orderEntries.push({ panelId: panel.id, block, topYMm });

        if (!r.fitsWidth) {
          const seen = new Set<string>();
          for (const u of r.unbreakable) {
            if (seen.has(u.token)) continue;
            seen.add(u.token);
            violations.push({
              id: `out-of-bounds:${block.id}:${u.token}`,
              kind: 'out-of-bounds',
              panelId: panel.id,
              zoneId: zone.id,
              blockId: block.id,
              label: block.label,
              message:
                `「${block.label}」中的词 “${u.token}” 宽 ${fmt(u.widthMm)}mm，` +
                `超过「${zone.name}」可用宽度 ${fmt(innerWidthMm)}mm（已按最小字号 ${constraints.fontSizePt.min}pt 测量仍越界），` +
                `文字将越出区域边界。可放宽字号下限、加宽区域或改写该词。`,
            });
          }
        }
        if (!r.fitsHeight) {
          const over = r.heightMm - availHeightMm;
          if (block.kind === 'atomic') {
            violations.push({
              id: `atomic:${block.id}`,
              kind: 'atomic',
              panelId: panel.id,
              zoneId: zone.id,
              blockId: block.id,
              label: block.label,
              message:
                `「${block.label}」是不可拆分的强制声明，必须完整放入「${zone.name}」：` +
                `在最小字号 ${constraints.fontSizePt.min}pt、最小行距 ${constraints.lineHeight.min} 下仍需 ${fmt(r.heightMm)}mm（${r.lines.length} 行），` +
                `区域剩余 ${fmt(availHeightMm)}mm，缺 ${fmt(over)}mm。禁止拆分到其他区域，请扩大区域或放宽字号/行距限制。` +
                `开头文字：“${excerpt(block.text)}”`,
            });
          } else {
            violations.push({
              id: `overflow:${block.id}`,
              kind: 'overflow',
              panelId: panel.id,
              zoneId: zone.id,
              blockId: block.id,
              label: block.label,
              message:
                `「${block.label}」在「${zone.name}」放不下：最小字号 ${constraints.fontSizePt.min}pt、最小行距 ${constraints.lineHeight.min} 下需 ${fmt(r.heightMm)}mm（${r.lines.length} 行），` +
                `区域剩余 ${fmt(availHeightMm)}mm，溢出 ${fmt(over)}mm。开头文字：“${excerpt(block.text)}”`,
            });
          }
        }
        used += r.heightMm + BLOCK_GAP_MM;
      }
      zones[zone.id] = {
        zoneId: zone.id,
        blocks: laid,
        usedHeightMm: laid.length > 0 ? used - BLOCK_GAP_MM : 0,
        innerWidthMm,
        innerHeightMm,
      };
    }
    panels[panel.id] = { panelId: panel.id, zones };
  }

  // 阅读顺序检查：同一面板内，阅读顺序靠后的块不得排在靠前块的上方
  for (const panel of spec.panels) {
    const entries = orderEntries
      .filter((e) => e.panelId === panel.id)
      .sort((a, b) => a.block.readingOrder - b.block.readingOrder || a.topYMm - b.topYMm);
    for (const e of entries) {
      const preds = entries.filter(
        (o) => o.block.readingOrder < e.block.readingOrder && o.topYMm > e.topYMm + EPS_MM,
      );
      if (preds.length > 0) {
        const predText = preds.map((p) => `「${p.block.label}」(顺序${p.block.readingOrder})`).join('、');
        violations.push({
          id: `reading-order:${e.block.id}`,
          kind: 'reading-order',
          panelId: panel.id,
          zoneId: e.block.zoneId,
          blockId: e.block.id,
          label: e.block.label,
          message:
            `阅读顺序错误：「${e.block.label}」的阅读顺序为 ${e.block.readingOrder}，应排在 ${predText} 之后，` +
            `但实际位置在其上方。请把它移到更靠下的区域，或调整阅读顺序编号。`,
        });
      }
    }
  }

  return { panels, violations };
}

/** 对比两组违规（按稳定 ID）：onlyA = 仅对比版本，onlyB = 仅当前版本 */
export function diffViolations(a: Violation[], b: Violation[]): {
  onlyA: Violation[];
  onlyB: Violation[];
  common: Violation[];
} {
  const aIds = new Set(a.map((v) => v.id));
  const bIds = new Set(b.map((v) => v.id));
  return {
    onlyA: a.filter((v) => !bIds.has(v.id)),
    onlyB: b.filter((v) => !aIds.has(v.id)),
    common: a.filter((v) => bIds.has(v.id)),
  };
}

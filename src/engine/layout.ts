import { PT_TO_MM, type Measurer } from './measure';
import { BLOCKS, PANELS } from './presets';
import type {
  BlockDef,
  Candidate,
  Constraints,
  Language,
  LayoutInput,
  LayoutResult,
  LineItem,
  OverlongToken,
  PanelDef,
  PanelLayout,
  RegionDef,
  RegionLayout,
  TextsMap,
  VersionId,
  Violation,
} from './types';
import { wrapText } from './wrap';

/** 区块之间的固定间距（mm） */
export const BLOCK_GAP_MM = 1;

const EPS = 1e-6;

/** 带上实际文本与最终区域的区块（排版直接使用的形态） */
export interface ResolvedBlock {
  id: string;
  label: string;
  order: number;
  atomic: boolean;
  panelId: BlockDef['panelId'];
  regionId: string;
  text: string;
}

export function resolveRegionId(block: BlockDef, language: Language, version: VersionId): string {
  return block.regionOverrides?.[language]?.[version] ?? block.regionId;
}

export function resolveBlocks(
  blocks: BlockDef[],
  texts: TextsMap,
  language: Language,
  version: VersionId,
): ResolvedBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    label: b.label,
    order: b.order,
    atomic: b.atomic,
    panelId: b.panelId,
    regionId: resolveRegionId(b, language, version),
    text: texts[b.id]?.[language]?.[version] ?? '',
  }));
}

/**
 * 枚举候选方案。优先级：字号从大到小 → 字体按允许列表顺序 → 行距从大到小。
 * 用整数步进避免浮点漂移，保证枚举结果确定。
 */
export function enumerateCandidates(c: Constraints): Candidate[] {
  const out: Candidate[] = [];
  const minS = Math.round(c.minFontSizePt * 2);
  const maxS = Math.round(c.maxFontSizePt * 2);
  const minL = Math.round(c.minLineHeight * 10);
  const maxL = Math.round(c.maxLineHeight * 10);
  for (let s = maxS; s >= minS; s--) {
    for (const fontId of c.allowedFonts) {
      for (let l = maxL; l >= minL; l--) {
        out.push({ fontId, sizePt: s / 2, lineHeight: l / 10 });
      }
    }
  }
  return out;
}

/** 没有任何组合可用时的兜底方案（最小字号、最小行距、首选字体） */
export function mostCompactScheme(c: Constraints): Candidate {
  return { fontId: c.allowedFonts[0], sizePt: c.minFontSizePt, lineHeight: c.minLineHeight };
}

interface RegionContent {
  items: LineItem[];
  totalHeightMm: number;
  overlong: OverlongToken[];
  blockRanges: { blockId: string; startYMm: number; endYMm: number }[];
}

/** 用指定方案把一个区域内的全部区块排版成行（纯函数） */
export function layoutRegionContent(
  blocks: ResolvedBlock[],
  region: RegionDef,
  scheme: Candidate,
  measurer: Measurer,
): RegionContent {
  const lineHeightMm = scheme.sizePt * scheme.lineHeight * PT_TO_MM;
  const items: LineItem[] = [];
  const overlong: OverlongToken[] = [];
  const blockRanges: RegionContent['blockRanges'] = [];
  let y = 0;
  let placed = 0;

  for (const block of blocks) {
    if (block.text.trim() === '') continue; // 空文案不占位
    if (placed > 0) y += BLOCK_GAP_MM;
    placed++;
    const startYMm = y;
    const { lines, overlongTokens } = wrapText(block.text, region.widthMm, (s) =>
      measurer.measure(s, scheme.fontId, scheme.sizePt),
    );
    for (const line of lines) {
      items.push({
        blockId: block.id,
        text: line,
        yMm: y,
        widthMm: measurer.measure(line, scheme.fontId, scheme.sizePt),
        lineHeightMm,
        overflowsRegion: y + lineHeightMm > region.heightMm + EPS,
      });
      y += lineHeightMm;
    }
    for (const t of overlongTokens) {
      overlong.push({ blockId: block.id, token: t.token, widthMm: t.widthMm });
    }
    blockRanges.push({ blockId: block.id, startYMm, endYMm: y });
  }

  return { items, totalHeightMm: y, overlong, blockRanges };
}

function contentFits(content: RegionContent, region: RegionDef): boolean {
  return content.totalHeightMm <= region.heightMm + EPS && content.overlong.length === 0;
}

function truncate(s: string, n = 24): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function fmt(mm: number): string {
  return mm.toFixed(1);
}

/** 没有任何候选方案可用时，分析失败原因：哪段文字、哪条限制、具体数值 */
function analyzeRegionFailure(
  panelId: PanelDef['id'],
  region: RegionDef,
  blocks: ResolvedBlock[],
  content: RegionContent,
  scheme: Candidate,
): Violation[] {
  const violations: Violation[] = [];
  const byId = new Map(blocks.map((b) => [b.id, b]));

  // 1) 越界：不可断行的词超过区域宽度
  for (const t of content.overlong) {
    const block = byId.get(t.blockId);
    violations.push({
      kind: 'OUT_OF_BOUNDS',
      panelId,
      regionId: region.id,
      blockId: t.blockId,
      token: t.token,
      neededMm: t.widthMm,
      availableMm: region.widthMm,
      snippet: truncate(t.token, 32),
      message:
        `区域「${region.label}」宽度不足：区块「${block?.label ?? t.blockId}」中的「${truncate(t.token, 32)}」` +
        `实测宽 ${fmt(t.widthMm)}mm，超过区域宽 ${fmt(region.widthMm)}mm；该词不可断行，` +
        `在允许的最小字号 ${scheme.sizePt}pt 下仍然超宽。请缩短该词、加宽区域或允许更小字号。`,
    });
  }

  // 2) 高度溢出：原子块报“声明拆分”，普通块报“溢出”
  if (content.totalHeightMm > region.heightMm + EPS) {
    for (const range of content.blockRanges) {
      const block = byId.get(range.blockId);
      if (block?.atomic && range.endYMm > region.heightMm + EPS) {
        const available = Math.max(0, region.heightMm - range.startYMm);
        const needed = range.endYMm - range.startYMm;
        violations.push({
          kind: 'ATOMIC_SPLIT',
          panelId,
          regionId: region.id,
          blockId: block.id,
          neededMm: needed,
          availableMm: available,
          snippet: truncate(block.text),
          message:
            `「${block.label}」为不可拆分声明：完整排入需要 ${fmt(needed)}mm，` +
            `区域「${region.label}」仅剩 ${fmt(available)}mm（区域高 ${fmt(region.heightMm)}mm）。` +
            `声明不可跨区拆分——请扩大区域、精简文案，或放宽字号/行距下限。`,
        });
      }
    }
    const crossing = content.blockRanges.find((r) => {
      const b = byId.get(r.blockId);
      return b && !b.atomic && r.endYMm > region.heightMm + EPS;
    });
    if (crossing) {
      const block = byId.get(crossing.blockId);
      const excess = content.totalHeightMm - region.heightMm;
      violations.push({
        kind: 'OVERFLOW',
        panelId,
        regionId: region.id,
        blockId: crossing.blockId,
        neededMm: content.totalHeightMm,
        availableMm: region.heightMm,
        snippet: truncate(block?.text ?? ''),
        message:
          `区域「${region.label}」高度不足：内容实测共需 ${fmt(content.totalHeightMm)}mm，` +
          `区域高 ${fmt(region.heightMm)}mm（超出 ${fmt(excess)}mm）；` +
          `区块「${block?.label ?? crossing.blockId}」越出下边界。` +
          `已尝试约束允许的全部字号/行距/字体组合均放不下。`,
      });
    }
  }

  return violations;
}

/** 排版单个区域：按优先级尝试候选方案，返回第一个满足全部约束的方案 */
export function layoutRegion(
  panelId: PanelDef['id'],
  region: RegionDef,
  blocks: ResolvedBlock[],
  constraints: Constraints,
  measurer: Measurer,
): RegionLayout {
  for (const scheme of enumerateCandidates(constraints)) {
    const content = layoutRegionContent(blocks, region, scheme, measurer);
    if (contentFits(content, region)) {
      return { regionId: region.id, fits: true, scheme, ...content, violations: [] };
    }
  }
  const scheme = mostCompactScheme(constraints);
  const content = layoutRegionContent(blocks, region, scheme, measurer);
  return {
    regionId: region.id,
    fits: false,
    scheme,
    ...content,
    violations: analyzeRegionFailure(panelId, region, blocks, content, scheme),
  };
}

/**
 * 阅读顺序校验：区块的 order 字段是规定顺序；
 * 实际阅读顺序 = 按区域空间顺序依次读出各区域内的区块。
 * 两者不一致时报第一条冲突，指出是哪两段文字。
 */
export function validateReadingOrder(
  panel: PanelDef,
  blocksByRegion: Map<string, ResolvedBlock[]>,
  panelBlocks: ResolvedBlock[],
): Violation | null {
  const actual: ResolvedBlock[] = [];
  for (const region of panel.regions) {
    actual.push(...(blocksByRegion.get(region.id) ?? []));
  }
  const required = [...panelBlocks].sort((a, b) => a.order - b.order);
  for (let i = 0; i < required.length; i++) {
    if (actual[i]?.id !== required[i].id) {
      const expected = required[i];
      const found = actual[i];
      const regionLabel =
        panel.regions.find((r) => r.id === expected.regionId)?.label ?? expected.regionId;
      return {
        kind: 'ORDER',
        panelId: panel.id,
        regionId: expected.regionId,
        blockId: expected.id,
        relatedBlockId: found?.id,
        snippet: truncate(expected.text),
        message:
          `阅读顺序冲突：面板「${panel.label}」规定「${expected.label}」排在第 ${i + 1} 位，` +
          `但按区域位置先读到的是「${found?.label ?? '（空）'}」。` +
          `请检查「${expected.label}」的区域位置（当前在「${regionLabel}」）。`,
      };
    }
  }
  return null;
}

/** 计算整份文档在指定语言与版本下的排版结果（纯函数，结果确定） */
export function computeLayout(input: LayoutInput, measurer: Measurer): LayoutResult {
  const resolved = resolveBlocks(BLOCKS, input.texts, input.language, input.version);
  const panels: PanelLayout[] = PANELS.map((panel) => {
    const panelBlocks = resolved.filter((b) => b.panelId === panel.id);
    const byRegion = new Map<string, ResolvedBlock[]>();
    for (const region of panel.regions) byRegion.set(region.id, []);
    for (const b of panelBlocks) byRegion.get(b.regionId)?.push(b);
    for (const list of byRegion.values()) list.sort((a, b) => a.order - b.order);

    const regions = panel.regions.map((region) =>
      layoutRegion(panel.id, region, byRegion.get(region.id) ?? [], input.constraints, measurer),
    );
    const orderViolation = validateReadingOrder(panel, byRegion, panelBlocks);
    const violations = [
      ...regions.flatMap((r) => r.violations),
      ...(orderViolation ? [orderViolation] : []),
    ];
    return { panelId: panel.id, regions, violations };
  });
  return {
    language: input.language,
    version: input.version,
    panels,
    violations: panels.flatMap((p) => p.violations),
  };
}

/** 违规的稳定标识：用于改版前后对比 */
export function violationKey(v: Violation): string {
  return `${v.kind}:${v.blockId ?? ''}:${v.regionId}`;
}

/** 对比两版违规清单：新增 / 已解决 / 持续存在 */
export function diffViolations(base: Violation[], revised: Violation[]) {
  const baseKeys = new Set(base.map(violationKey));
  const revisedKeys = new Set(revised.map(violationKey));
  return {
    added: revised.filter((v) => !baseKeys.has(violationKey(v))),
    resolved: base.filter((v) => !revisedKeys.has(violationKey(v))),
    persistent: revised.filter((v) => baseKeys.has(violationKey(v))),
  };
}

import { describe, expect, it } from 'vitest';
import { enumerateCandidates, layoutRegion, type ResolvedBlock } from '../src/engine/layout';
import { createTableMeasurer } from '../src/engine/measure';
import { FONTS } from '../src/engine/presets';
import type { Constraints, RegionDef } from '../src/engine/types';

const measurer = createTableMeasurer(FONTS);

const constraints: Constraints = {
  allowedFonts: ['sans', 'serif'],
  minFontSizePt: 6,
  maxFontSizePt: 8,
  minLineHeight: 1.1,
  maxLineHeight: 1.2,
};

const region = (w: number, h: number): RegionDef => ({
  id: 'r',
  label: '测试区',
  xMm: 0,
  yMm: 0,
  widthMm: w,
  heightMm: h,
});

const block = (text: string): ResolvedBlock[] => [
  { id: 'b', label: '区块', order: 1, atomic: false, panelId: 'front', regionId: 'r', text },
];

describe('候选方案选择', () => {
  it('枚举确定：字号从大到小，字体按允许顺序，行距从大到小', () => {
    const c = enumerateCandidates(constraints);
    expect(c.length).toBe(5 * 2 * 2); // 8/7.5/7/6.5/6 × 2 字体 × 2 行距
    expect(c[0]).toEqual({ fontId: 'sans', sizePt: 8, lineHeight: 1.2 });
    expect(c[1]).toEqual({ fontId: 'sans', sizePt: 8, lineHeight: 1.1 });
    expect(c[2]).toEqual({ fontId: 'serif', sizePt: 8, lineHeight: 1.2 });
    expect(c[c.length - 1]).toEqual({ fontId: 'serif', sizePt: 6, lineHeight: 1.1 });
  });

  it('放得下时选允许的最大字号', () => {
    const r = layoutRegion('front', region(120, 20), block('短文本'), constraints, measurer);
    expect(r.fits).toBe(true);
    expect(r.scheme.sizePt).toBe(8);
  });

  it('内容变长时自动降到能放下的字号', () => {
    // 30mm 宽、8mm 高：40 个 CJK 字在 6.5pt 以上放不下，6pt 下 3 行 ≈7mm 放下
    const r = layoutRegion('front', region(30, 8), block('字'.repeat(40)), constraints, measurer);
    expect(r.fits).toBe(true);
    expect(r.scheme.sizePt).toBe(6);
  });

  it('任何组合都放不下时回退最小方案并报溢出', () => {
    const r = layoutRegion('front', region(30, 2), block('字'.repeat(40)), constraints, measurer);
    expect(r.fits).toBe(false);
    expect(r.scheme).toEqual({ fontId: 'sans', sizePt: 6, lineHeight: 1.1 });
    expect(r.violations.some((v) => v.kind === 'OVERFLOW')).toBe(true);
  });

  it('收紧约束（最大字号调小）后方案随之变化', () => {
    const tightMax: Constraints = { ...constraints, maxFontSizePt: 7 };
    const r = layoutRegion('front', region(120, 20), block('短文本'), tightMax, measurer);
    expect(r.scheme.sizePt).toBe(7);
  });

  it('同一输入重复计算结果一致（确定性）', () => {
    const a = layoutRegion('front', region(30, 8), block('字'.repeat(40)), constraints, measurer);
    const b = layoutRegion('front', region(30, 8), block('字'.repeat(40)), constraints, measurer);
    expect(a).toEqual(b);
  });
});

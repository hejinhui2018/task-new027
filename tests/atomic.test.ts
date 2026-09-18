import { describe, expect, it } from 'vitest';
import { BLOCK_GAP_MM, layoutRegion, type ResolvedBlock } from '../src/engine/layout';
import { createTableMeasurer, PT_TO_MM } from '../src/engine/measure';
import { FONTS } from '../src/engine/presets';
import type { Constraints, RegionDef } from '../src/engine/types';
import { layoutFor } from './helpers';

const measurer = createTableMeasurer(FONTS);

/** 只允许 6pt / 行距 1.15 / 无衬线：唯一候选，便于精确计算 */
const tight: Constraints = {
  allowedFonts: ['sans'],
  minFontSizePt: 6,
  maxFontSizePt: 6,
  minLineHeight: 1.15,
  maxLineHeight: 1.15,
};

const LINE_H = 6 * 1.15 * PT_TO_MM; // 每行高 ≈ 2.433mm

const region = (heightMm: number): RegionDef => ({
  id: 'r1',
  label: '声明测试区',
  xMm: 0,
  yMm: 0,
  widthMm: 12, // 6pt CJK 每字 ≈2.117mm → 每行 5 字
  heightMm,
});

// 前置块：15 字 → 3 行；声明块：10 字 → 2 行
const filler: ResolvedBlock = {
  id: 'filler',
  label: '前置说明',
  order: 1,
  atomic: false,
  panelId: 'back',
  regionId: 'r1',
  text: '前'.repeat(15),
};
const decl: ResolvedBlock = {
  id: 'decl',
  label: '强制声明',
  order: 2,
  atomic: true,
  panelId: 'back',
  regionId: 'r1',
  text: '声明文字不可拆分声明',
};

describe('声明原子性', () => {
  it('空间足够时不报违规', () => {
    const r = layoutRegion('back', region(14), [filler, decl], tight, measurer);
    expect(r.fits).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('空间不足时声明不可拆分：报 ATOMIC_SPLIT 并给出需要/可用数值', () => {
    const r = layoutRegion('back', region(10), [filler, decl], tight, measurer);
    expect(r.fits).toBe(false);
    const v = r.violations.find((x) => x.kind === 'ATOMIC_SPLIT');
    expect(v).toBeDefined();
    expect(v!.blockId).toBe('decl');
    // 声明需要 2 行；可用 = 区域高 −（前置 3 行 + 块间距）
    expect(v!.neededMm).toBeCloseTo(2 * LINE_H, 6);
    expect(v!.availableMm).toBeCloseTo(10 - (3 * LINE_H + BLOCK_GAP_MM), 6);
    expect(v!.message).toContain('不可拆分');
    expect(v!.message).toContain('强制声明');
    expect(v!.snippet).toBe(decl.text);
  });

  it('声明的行保持连续，不会被拆走（全部行同属该区块、依次排布）', () => {
    const r = layoutRegion('back', region(10), [filler, decl], tight, measurer);
    const declLines = r.items.filter((i) => i.blockId === 'decl');
    expect(declLines.length).toBe(2);
    expect(declLines[1].yMm).toBeCloseTo(declLines[0].yMm + declLines[0].lineHeightMm, 6);
    // 非原子前置块只报溢出，不会误报声明拆分
    expect(r.violations.filter((v) => v.kind === 'ATOMIC_SPLIT').length).toBe(1);
  });

  it('非原子块放不下时报 OVERFLOW 而非 ATOMIC_SPLIT', () => {
    const r = layoutRegion('back', region(5), [filler], tight, measurer);
    expect(r.fits).toBe(false);
    expect(r.violations.some((v) => v.kind === 'OVERFLOW')).toBe(true);
    expect(r.violations.some((v) => v.kind === 'ATOMIC_SPLIT')).toBe(false);
  });

  it('预设：北欧改版德语背面出现声明拆分违规（认证区放不下强制声明）', () => {
    const layout = layoutFor('de', 'nordic');
    const v = layout.violations.find((x) => x.kind === 'ATOMIC_SPLIT');
    expect(v).toBeDefined();
    expect(v!.blockId).toBe('declaration');
    expect(v!.regionId).toBe('cert-zone');
    expect(v!.message).toContain('不可拆分');
  });
});

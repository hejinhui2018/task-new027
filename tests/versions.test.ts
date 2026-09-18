import { describe, expect, it } from 'vitest';
import { computeLayout } from '../src/engine/layout';
import { DEFAULT_CONSTRAINTS, PRESET_TEXTS } from '../src/engine/presets';
import { layoutFor, measurer } from './helpers';

describe('版本切换（北欧上市改版）', () => {
  it('基准版：中/英/德全部通过验收', () => {
    for (const lang of ['zh', 'en', 'de'] as const) {
      const layout = layoutFor(lang, 'base');
      expect(
        layout.violations,
        `${lang} 基准版不应有违规：${JSON.stringify(layout.violations, null, 2)}`,
      ).toEqual([]);
    }
  });

  it('北欧改版：中文仍然全部通过', () => {
    const layout = layoutFor('zh', 'nordic');
    expect(
      layout.violations,
      `中文改版不应有违规：${JSON.stringify(layout.violations, null, 2)}`,
    ).toEqual([]);
  });

  it('北欧改版：英语暴露溢出（正面标语）与越界（侧面链接），但不涉及声明与顺序', () => {
    const vs = layoutFor('en', 'nordic').violations;
    const overflow = vs.find((v) => v.kind === 'OVERFLOW');
    expect(overflow).toBeDefined();
    expect(overflow!.blockId).toBe('tagline');
    expect(overflow!.panelId).toBe('front');

    const oob = vs.find((v) => v.kind === 'OUT_OF_BOUNDS');
    expect(oob).toBeDefined();
    expect(oob!.blockId).toBe('contact');
    expect(oob!.panelId).toBe('side');
    expect(oob!.token).toContain('http');
    expect(oob!.neededMm).toBeGreaterThan(oob!.availableMm!);

    expect(vs.some((v) => v.kind === 'ATOMIC_SPLIT' || v.kind === 'ORDER')).toBe(false);
  });

  it('北欧改版：德语暴露声明拆分与阅读顺序错误，但不越界', () => {
    const vs = layoutFor('de', 'nordic').violations;
    expect(vs.some((v) => v.kind === 'ATOMIC_SPLIT' && v.blockId === 'declaration')).toBe(true);
    expect(vs.some((v) => v.kind === 'ORDER' && v.panelId === 'back')).toBe(true);
    // 德语警示语变长：背面警示语区溢出
    expect(vs.some((v) => v.kind === 'OVERFLOW' && v.blockId === 'warning')).toBe(true);
    expect(vs.some((v) => v.kind === 'OUT_OF_BOUNDS')).toBe(false);
  });

  it('切换语言改变排版结果', () => {
    const en = layoutFor('en', 'base');
    const de = layoutFor('de', 'base');
    expect(JSON.stringify(en.panels)).not.toBe(JSON.stringify(de.panels));
  });

  it('切换版本只影响有改动的面版（英语：背面声明区不变）', () => {
    const base = layoutFor('en', 'base');
    const nordic = layoutFor('en', 'nordic');
    const baseLegal = base.panels.find((p) => p.panelId === 'back')!.regions
      .find((r) => r.regionId === 'legal-zone')!;
    const nordicLegal = nordic.panels.find((p) => p.panelId === 'back')!.regions
      .find((r) => r.regionId === 'legal-zone')!;
    expect(nordicLegal).toEqual(baseLegal);
  });

  it('同一输入重复计算结果一致（确定性）', () => {
    const input = {
      texts: PRESET_TEXTS,
      constraints: DEFAULT_CONSTRAINTS,
      language: 'de' as const,
      version: 'nordic' as const,
    };
    expect(computeLayout(input, measurer)).toEqual(computeLayout(input, measurer));
  });
});

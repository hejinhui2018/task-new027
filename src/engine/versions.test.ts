import { describe, expect, it } from 'vitest';
import { defaultConstraints, productSpec } from '../data/product';
import { layoutProduct, type LayoutResult } from '../engine/layout';
import { MockMeasurer } from '../engine/measurer';
import type { LanguageCode } from '../types';

const measurer = new MockMeasurer();
const constraints = defaultConstraints(productSpec);

function layoutOf(versionId: string, lang: LanguageCode): LayoutResult {
  const version = productSpec.versions.find((v) => v.id === versionId)!;
  return layoutProduct(productSpec, constraints, version, lang, measurer);
}

const kinds = (r: LayoutResult) => [...new Set(r.violations.map((v) => v.kind))].sort();

describe('内置数据：现行版 v1.3 三种语言全部通过', () => {
  it.each(['zh', 'en', 'de'] as LanguageCode[])('%s 无违规', (lang) => {
    expect(layoutOf('v1-current', lang).violations).toEqual([]);
  });
});

describe('北欧上市改版 v2.0：德语与英语暴露不同冲突', () => {
  it('德语：不可拆分声明放不下 + 超长复合词越界', () => {
    const r = layoutOf('v2-nordic', 'de');
    expect(kinds(r)).toEqual(['atomic', 'out-of-bounds']);

    const atomic = r.violations.find((v) => v.kind === 'atomic')!;
    expect(atomic.blockId).toBe('legal');
    expect(atomic.panelId).toBe('back');
    expect(atomic.message).toContain('不可拆分');

    const oob = r.violations.find((v) => v.kind === 'out-of-bounds')!;
    expect(oob.blockId).toBe('storage');
    expect(oob.panelId).toBe('side');
    expect(oob.message).toContain('Kühllagerungstemperaturgrenzwerte');
  });

  it('英语：卖点声明溢出 + 新增处置说明阅读顺序错误', () => {
    const r = layoutOf('v2-nordic', 'en');
    expect(kinds(r)).toEqual(['overflow', 'reading-order']);

    const overflow = r.violations.find((v) => v.kind === 'overflow')!;
    expect(overflow.blockId).toBe('claims');
    expect(overflow.panelId).toBe('front');

    const order = r.violations.find((v) => v.kind === 'reading-order')!;
    expect(order.blockId).toBe('disposal');
    expect(order.panelId).toBe('back');
    expect(order.message).toContain('回收提示');
  });

  it('中文：改版后依然全部放得下（对照组）', () => {
    expect(layoutOf('v2-nordic', 'zh').violations).toEqual([]);
  });
});

describe('版本切换与确定性', () => {
  it('切换版本会切换诊断结果：德语 v1 干净，v2 暴露问题', () => {
    expect(layoutOf('v1-current', 'de').violations).toHaveLength(0);
    expect(layoutOf('v2-nordic', 'de').violations.length).toBeGreaterThan(0);
  });

  it('同一输入重复计算结果一致', () => {
    const a = layoutOf('v2-nordic', 'de');
    const b = layoutOf('v2-nordic', 'de');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

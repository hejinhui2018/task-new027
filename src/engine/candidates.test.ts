import { describe, expect, it } from 'vitest';
import { iterCandidates, layoutProduct } from '../engine/layout';
import { MockMeasurer } from '../engine/measurer';
import { constraintsOf, makeBlock, makeSpec, makeZone, TEST_CONSTRAINTS } from '../engine/fixtures';

const measurer = new MockMeasurer();

function layoutWith(zone: ReturnType<typeof makeZone>, text: string, factors?: Record<string, number>) {
  const spec = makeSpec([zone], [makeBlock('b1', zone.id, 1, text)]);
  const m = factors ? new MockMeasurer(factors) : measurer;
  return layoutProduct(spec, constraintsOf(spec), spec.versions[0], 'zh', m);
}

describe('候选方案枚举', () => {
  it('按 字号降序 → 行距升序 → 字体列表顺序 枚举', () => {
    const c = {
      allowedFontIds: ['sans', 'serif'],
      fontSizePt: { min: 8, max: 10, step: 2 },
      lineHeight: { min: 1, max: 1.1, step: 0.1 },
    };
    const all = [...iterCandidates(c)];
    expect(all[0]).toEqual({ fontId: 'sans', sizePt: 10, lineHeight: 1 });
    expect(all[1]).toEqual({ fontId: 'serif', sizePt: 10, lineHeight: 1 });
    expect(all[2]).toEqual({ fontId: 'sans', sizePt: 10, lineHeight: 1.1 });
    expect(all[all.length - 1]).toEqual({ fontId: 'serif', sizePt: 8, lineHeight: 1.1 });
    expect(all).toHaveLength(2 * 2 * 2);
  });
});

describe('候选方案选择', () => {
  // 区域内高 3mm：10pt 行高 3.53mm 放不下，8pt 行高 2.82mm 放得下
  const zone = makeZone('z', 'back', { x: 0, y: 0, w: 20, h: 7 });

  it('放得下时选最大字号', () => {
    const tall = makeZone('z', 'back', { x: 0, y: 0, w: 20, h: 20 }); // 内高 16mm
    const result = layoutWith(tall, 'ab');
    expect(result.violations).toEqual([]);
    expect(result.panels.back.zones.z.blocks[0].candidate.sizePt).toBe(10);
  });

  it('最大字号放不下时降到能放下的最大字号', () => {
    const result = layoutWith(zone, 'ab');
    expect(result.violations).toEqual([]);
    expect(result.panels.back.zones.z.blocks[0].candidate.sizePt).toBe(8);
  });

  it('按字体列表顺序回退：第一种字体太宽时选下一种', () => {
    const narrowZone = makeZone('z', 'back', { x: 0, y: 0, w: 12, h: 20 }, {
      ...TEST_CONSTRAINTS,
      allowedFontIds: ['wide', 'narrow'],
    });
    const result = layoutWith(narrowZone, 'aaaa', { wide: 2, narrow: 1 });
    expect(result.violations).toEqual([]);
    expect(result.panels.back.zones.z.blocks[0].candidate.fontId).toBe('narrow');
  });

  it('全部候选都放不下：报溢出并说明缺口与限制', () => {
    const tiny = makeZone('z', 'back', { x: 0, y: 0, w: 20, h: 5 }); // 内高 1mm
    const result = layoutWith(tiny, 'ab');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].kind).toBe('overflow');
    expect(result.violations[0].message).toContain('6pt'); // 已按最小字号尝试
    const laid = result.panels.back.zones.z.blocks[0];
    expect(laid.fitsHeight).toBe(false);
    expect(laid.candidate.sizePt).toBe(6); // 失败时回退到溢出最小的方案
  });

  it('同一输入重复计算结果一致（确定性）', () => {
    const a = layoutWith(zone, 'ab');
    const b = layoutWith(zone, 'ab');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

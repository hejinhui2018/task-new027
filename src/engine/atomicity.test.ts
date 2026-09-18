import { describe, expect, it } from 'vitest';
import { layoutProduct } from '../engine/layout';
import { MockMeasurer, PT_TO_MM } from '../engine/measurer';
import { constraintsOf, makeBlock, makeSpec, makeZone } from '../engine/fixtures';

const measurer = new MockMeasurer();
/** 1em == 1mm 的字号：行高恰好 1mm，便于手算行数 */
const SIZE = 1 / PT_TO_MM;
const EXACT = {
  allowedFontIds: ['sans'],
  fontSizePt: { min: SIZE, max: SIZE, step: 0.5 },
  lineHeight: { min: 1, max: 1, step: 0.05 },
};

// 区域：内宽 46mm（46 个 CJK 字/行），内高 6mm（6 行）
const ZONE = makeZone('legal', 'back', { x: 0, y: 0, w: 50, h: 10 }, EXACT);

function layoutWith(blocks: ReturnType<typeof makeBlock>[]) {
  const spec = makeSpec([ZONE], blocks);
  return layoutProduct(spec, constraintsOf(spec), spec.versions[0], 'zh', measurer);
}

describe('声明原子性', () => {
  it('放得下的不可拆分声明：无违规', () => {
    const result = layoutWith([makeBlock('legal', 'legal', 1, '高'.repeat(92), 'atomic')]);
    expect(result.violations).toEqual([]);
    expect(result.panels.back.zones.legal.blocks[0].fitsHeight).toBe(true);
  });

  it('放不下的不可拆分声明：报 atomic 违规，且声明保持完整、绝不拆到别的区域', () => {
    const text = '高'.repeat(46 * 7); // 7 行 > 6 行容量
    const result = layoutWith([makeBlock('legal', 'legal', 1, text, 'atomic')]);

    const atomic = result.violations.filter((v) => v.kind === 'atomic');
    expect(atomic).toHaveLength(1);
    expect(atomic[0].blockId).toBe('legal');
    expect(atomic[0].message).toContain('不可拆分');
    expect(atomic[0].message).toContain('7.0mm'); // 需要 7mm
    expect(atomic[0].message).toContain('6.0mm'); // 区域剩余 6mm
    // 不会退化成普通 overflow
    expect(result.violations.filter((v) => v.kind === 'overflow')).toHaveLength(0);

    // 声明的 7 行全部保留在同一区域内（未被拆分到其他区域）
    const laid = result.panels.back.zones.legal.blocks[0];
    expect(laid.lines).toHaveLength(7);
    expect(laid.fitsHeight).toBe(false);
    expect(Object.keys(result.panels.back.zones)).toEqual(['legal']);
  });

  it('同样放不下的普通文案块：报 overflow 而非 atomic', () => {
    const text = '高'.repeat(46 * 7);
    const result = layoutWith([makeBlock('note', 'legal', 1, text, 'normal')]);
    expect(result.violations.map((v) => v.kind)).toEqual(['overflow']);
    expect(result.violations[0].message).toContain('溢出');
  });
});

import { describe, expect, it } from 'vitest';
import { layoutProduct } from '../engine/layout';
import { MockMeasurer } from '../engine/measurer';
import { constraintsOf, makeBlock, makeSpec, makeZone } from '../engine/fixtures';

const measurer = new MockMeasurer();

// 上下两个区域：zTop 在面板顶部，zBottom 在底部
const ZONES = [
  makeZone('zTop', 'back', { x: 0, y: 0, w: 50, h: 10 }),
  makeZone('zBottom', 'back', { x: 0, y: 50, w: 50, h: 10 }),
];

function layoutWith(blocks: ReturnType<typeof makeBlock>[]) {
  const spec = makeSpec(ZONES, blocks);
  return layoutProduct(spec, constraintsOf(spec), spec.versions[0], 'zh', measurer);
}

describe('阅读顺序', () => {
  it('顺序编号与物理位置一致：无违规', () => {
    const result = layoutWith([
      makeBlock('a', 'zTop', 1, '高'),
      makeBlock('b', 'zBottom', 2, '高'),
    ]);
    expect(result.violations).toEqual([]);
  });

  it('顺序靠后的块排在上方：报 reading-order 并指出双方', () => {
    const result = layoutWith([
      makeBlock('a', 'zBottom', 1, '高'), // 应先读，却在底部
      makeBlock('b', 'zTop', 2, '高'), // 应后读，却在顶部
    ]);
    const violations = result.violations.filter((v) => v.kind === 'reading-order');
    expect(violations).toHaveLength(1);
    expect(violations[0].blockId).toBe('b');
    expect(violations[0].message).toContain('「b」');
    expect(violations[0].message).toContain('「a」');
    expect(violations[0].message).toContain('阅读顺序');
  });

  it('同一区域内多个块按阅读顺序堆叠，不产生误报', () => {
    const tall = [
      makeZone('zTop', 'back', { x: 0, y: 0, w: 50, h: 16 }),
      makeZone('zBottom', 'back', { x: 0, y: 50, w: 50, h: 10 }),
    ];
    const spec = makeSpec(tall, [
      makeBlock('a', 'zTop', 1, '高'),
      makeBlock('b', 'zTop', 2, '高'),
      makeBlock('c', 'zBottom', 3, '高'),
    ]);
    const result = layoutProduct(spec, constraintsOf(spec), spec.versions[0], 'zh', measurer);
    expect(result.violations).toEqual([]);
  });
});

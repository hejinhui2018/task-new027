import { describe, expect, it } from 'vitest';
import { createTableMeasurer, PT_TO_MM } from '../src/engine/measure';
import { FONTS } from '../src/engine/presets';
import { wrapText } from '../src/engine/wrap';

const m = createTableMeasurer(FONTS);
const at6 = (s: string) => m.measure(s, 'sans', 6);
/** 6pt 下 1em 的毫米数（CJK 一字的宽度） */
const EM6 = 6 * PT_TO_MM;

describe('换行测量', () => {
  it('拉丁文按单词贪心断行', () => {
    const width = at6('hello world'); // 恰好放下前两个词
    const r = wrapText('hello world foo', width + 1e-9, at6);
    expect(r.lines).toEqual(['hello world', 'foo']);
  });

  it('宽度足够时保持一行', () => {
    const r = wrapText('hello world', 1000, at6);
    expect(r.lines).toEqual(['hello world']);
    expect(r.overlongTokens).toEqual([]);
  });

  it('CJK 逐字断行', () => {
    // 每行最多 2 个汉字（2 字宽 2em，第 3 字放不下）
    const r = wrapText('包装版面验收', 2.5 * EM6, at6);
    expect(r.lines).toEqual(['包装', '版面', '验收']);
  });

  it('中英混排：CJK 逐字、拉丁整词', () => {
    // 4em 宽：'ab'(≈1.04em) + 2 个 CJK(2em) 放得下，'cd' 换行
    const r = wrapText('ab包装cd', 4 * EM6, at6);
    expect(r.lines).toEqual(['ab包装', 'cd']);
  });

  it('超宽词独占一行并记录（越界数据来源）', () => {
    const token = 'supercalifragilistic';
    const w = at6(token);
    const r = wrapText(`see ${token} end`, w - 1, at6);
    expect(r.overlongTokens).toEqual([{ token, widthMm: w }]);
    expect(r.lines).toContain(token);
    // 超宽词前后的内容正常成行
    expect(r.lines[0]).toBe('see');
    expect(r.lines[r.lines.length - 1]).toBe('end');
  });

  it('显式换行分段', () => {
    const r = wrapText('aaa\nbbb', 1000, at6);
    expect(r.lines).toEqual(['aaa', 'bbb']);
  });

  it('连续空白折叠为一个空格，行首不留空格', () => {
    const r = wrapText('aa    bb', 1000, at6);
    expect(r.lines).toEqual(['aa bb']);
  });

  it('同一输入重复计算结果一致（确定性）', () => {
    const text = '包装 proofreading 混合 text 排版';
    const a = wrapText(text, 8 * EM6, at6);
    const b = wrapText(text, 8 * EM6, at6);
    expect(a).toEqual(b);
  });
});

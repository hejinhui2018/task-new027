import type { FontSpec } from '../types';

/** 1pt = 25.4/72 mm */
export const PT_TO_MM = 25.4 / 72;

/**
 * 文字测量器：输入文字、字体与字号（pt），返回渲染宽度（mm）。
 * 浏览器中用 Canvas 2D 做真实测量；测试与无 Canvas 环境用字宽表估算。
 * 两种实现对同一输入都保证确定性输出。
 */
export interface Measurer {
  measure(text: string, fontId: string, sizePt: number): number;
}

const CJK_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;

/** 估算用字宽表（单位：em） */
export function charWidthEm(ch: string): number {
  if (CJK_RE.test(ch)) return 1;
  if (ch === ' ') return 0.3;
  if (/[0-9]/.test(ch)) return 0.55;
  if (/[A-ZÄÖÜẞ]/.test(ch)) return 0.68;
  if (/[a-zäöüß]/.test(ch)) return 0.5;
  return 0.3; // 标点及其余字符
}

export function estimateWidthMm(text: string, sizePt: number, fontFactor = 1): number {
  let em = 0;
  for (const ch of text) em += charWidthEm(ch);
  return em * fontFactor * sizePt * PT_TO_MM;
}

/** 测试与兜底用：基于字宽表的确定性测量器，可按字体加系数 */
export class MockMeasurer implements Measurer {
  constructor(private factors: Record<string, number> = {}) {}

  measure(text: string, fontId: string, sizePt: number): number {
    return estimateWidthMm(text, sizePt, this.factors[fontId] ?? 1);
  }
}

/** 浏览器环境：Canvas 2D 真实文字测量（带缓存，结果确定） */
export class CanvasMeasurer implements Measurer {
  private ctx: CanvasRenderingContext2D | null = null;
  private cache = new Map<string, number>();
  private fontFamilies = new Map<string, string>();

  constructor(fonts: FontSpec[]) {
    for (const f of fonts) this.fontFamilies.set(f.id, f.cssFamily);
    if (typeof document !== 'undefined') {
      this.ctx = document.createElement('canvas').getContext('2d');
    }
  }

  measure(text: string, fontId: string, sizePt: number): number {
    if (!this.ctx) return estimateWidthMm(text, sizePt);
    const key = `${fontId}|${sizePt}|${text}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const family = this.fontFamilies.get(fontId) ?? 'sans-serif';
    this.ctx.font = `${(sizePt * 96) / 72}px ${family}`;
    const mm = (this.ctx.measureText(text).width * 25.4) / 96;
    this.cache.set(key, mm);
    return mm;
  }
}

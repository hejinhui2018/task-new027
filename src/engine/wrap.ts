/**
 * 换行测量：把一段文字按区域宽度（mm）贪心断行。
 * - 拉丁文按单词断行（不拆词、不连字符化）；
 * - CJK/全角字符逐字可断；
 * - 连续空白折叠为一个空格，行首不留空格；
 * - 单个词超过行宽时记为“超宽词”（OUT_OF_BOUNDS 的数据来源），独占一行。
 * 纯函数：同一 (text, maxWidthMm, measure) 必然得到同一结果。
 */

export interface WrapResult {
  lines: string[];
  overlongTokens: { token: string; widthMm: number }[];
}

const EPS = 1e-6;

const CJK_RANGE =
  '\\u2E80-\\u2FDF\\u3000-\\u303F\\u3040-\\u30FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\uFF00-\\uFFEF';
/** 词（非空白非 CJK 的连续串）| 单个 CJK 字符 | 空白串 */
const TOKEN_RE = new RegExp(`[^\\s${CJK_RANGE}]+|[${CJK_RANGE}]|\\s+`, 'gu');
const WHITESPACE_RE = /^\s+$/u;

export function wrapText(
  text: string,
  maxWidthMm: number,
  measure: (s: string) => number,
): WrapResult {
  const lines: string[] = [];
  const overlongTokens: { token: string; widthMm: number }[] = [];
  const spaceW = measure(' ');

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push(''); // 空段落保留为空行
      continue;
    }
    const tokens = paragraph.match(TOKEN_RE) ?? [];
    let current = '';
    let currentW = 0;
    let pendingSpace = false;

    const flush = () => {
      if (current !== '') lines.push(current);
      current = '';
      currentW = 0;
    };

    for (const token of tokens) {
      if (WHITESPACE_RE.test(token)) {
        if (current !== '') pendingSpace = true;
        continue;
      }
      const w = measure(token);
      if (w > maxWidthMm + EPS) {
        // 不可断行的超宽词：独占一行并记录
        flush();
        overlongTokens.push({ token, widthMm: w });
        lines.push(token);
        pendingSpace = false;
        continue;
      }
      if (current === '') {
        current = token;
        currentW = w;
      } else {
        const sep = pendingSpace ? spaceW : 0;
        if (currentW + sep + w <= maxWidthMm + EPS) {
          current += (pendingSpace ? ' ' : '') + token;
          currentW += sep + w;
        } else {
          flush();
          current = token;
          currentW = w;
        }
      }
      pendingSpace = false;
    }
    flush();
  }

  return { lines, overlongTokens };
}

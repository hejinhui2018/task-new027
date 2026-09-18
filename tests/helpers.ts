import { computeLayout } from '../src/engine/layout';
import { createTableMeasurer } from '../src/engine/measure';
import { DEFAULT_CONSTRAINTS, FONTS, PRESET_TEXTS } from '../src/engine/presets';
import type { Constraints, Language, TextsMap, VersionId } from '../src/engine/types';

/** 测试统一使用确定性表格测量器（不依赖浏览器字体） */
export const measurer = createTableMeasurer(FONTS);

export function layoutFor(
  language: Language,
  version: VersionId,
  texts: TextsMap = PRESET_TEXTS,
  constraints: Constraints = DEFAULT_CONSTRAINTS,
) {
  return computeLayout({ texts, constraints, language, version }, measurer);
}

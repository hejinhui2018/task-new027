import { PANEL_BY_ID, REGION_BY_ID } from '../engine/presets';
import type { Violation, ViolationKind } from '../engine/types';

export const KIND_LABEL: Record<ViolationKind, string> = {
  OVERFLOW: '溢出',
  OUT_OF_BOUNDS: '越界',
  ORDER: '顺序错误',
  ATOMIC_SPLIT: '声明拆分',
};

interface Props {
  violations: Violation[];
  /** 违规标识 → 对比标签（如“新增”“已解决”） */
  tags?: Map<string, string>;
  compact?: boolean;
}

function keyOf(v: Violation): string {
  return `${v.kind}:${v.blockId ?? ''}:${v.regionId}`;
}

export function ViolationsPanel({ violations, tags, compact }: Props) {
  if (violations.length === 0) {
    return <div className="violations empty">✓ 当前语言与版本全部通过验收</div>;
  }
  return (
    <div className={compact ? 'violations compact' : 'violations'}>
      {violations.map((v, i) => {
        const tag = tags?.get(keyOf(v));
        return (
          <div className={`violation v-${v.kind}`} key={`${keyOf(v)}-${i}`}>
            <div className="v-head">
              <span className="v-kind">{KIND_LABEL[v.kind]}</span>
              <span className="v-loc">
                {PANEL_BY_ID[v.panelId]?.label} · {REGION_BY_ID[v.regionId]?.label ?? v.regionId}
              </span>
              {tag && <span className={`v-tag tag-${tag}`}>{tag}</span>}
            </div>
            <div className="v-msg">{v.message}</div>
            {v.snippet && <div className="v-snippet">「{v.snippet}」</div>}
          </div>
        );
      })}
    </div>
  );
}

import type { Violation, ViolationKind } from '../engine/layout';
import type { PanelId } from '../types';

const KIND_LABEL: Record<ViolationKind, string> = {
  overflow: '溢出',
  'out-of-bounds': '越界',
  'reading-order': '顺序错误',
  atomic: '不可拆分声明',
};

const PANEL_LABEL: Record<PanelId, string> = {
  front: '正面',
  side: '侧面',
  back: '背面',
};

export function ViolationList({ violations, onLocate }: { violations: Violation[]; onLocate: (v: Violation) => void }) {
  if (violations.length === 0) {
    return <p className="empty">没有发现问题，当前语言与版本通过验收。</p>;
  }
  const byPanel = new Map<PanelId, Violation[]>();
  for (const v of violations) {
    const list = byPanel.get(v.panelId) ?? [];
    list.push(v);
    byPanel.set(v.panelId, list);
  }
  return (
    <div className="violations">
      {(['front', 'side', 'back'] as PanelId[])
        .filter((p) => byPanel.has(p))
        .map((p) => (
          <section key={p} className="violation-group">
            <h3>{PANEL_LABEL[p]}</h3>
            <ul>
              {byPanel.get(p)!.map((v) => (
                <li key={v.id} className={`violation violation-${v.kind}`}>
                  <button className="violation-locate" onClick={() => onLocate(v)} title="在版面中定位">
                    [{KIND_LABEL[v.kind]}] {v.label}
                  </button>
                  <p className="violation-message">{v.message}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

/** 问题列表（支持对比模式的三分组展示） */
export function ViolationsPanel({
  violations,
  compare,
  onLocate,
}: {
  violations: Violation[];
  compare: { onlyA: Violation[]; onlyB: Violation[]; common: Violation[]; nameA: string; nameB: string } | null;
  onLocate: (v: Violation) => void;
}) {
  if (!compare) {
    return <ViolationList violations={violations} onLocate={onLocate} />;
  }
  return (
    <div className="violations">
      <section className="violation-group">
        <h3>仅当前版本（{compare.nameB}） · {compare.onlyB.length}</h3>
        <ViolationList violations={compare.onlyB} onLocate={onLocate} />
      </section>
      <section className="violation-group">
        <h3>仅对比版本（{compare.nameA}） · {compare.onlyA.length}</h3>
        <ViolationList violations={compare.onlyA} onLocate={onLocate} />
      </section>
      <section className="violation-group">
        <h3>两个版本共有 · {compare.common.length}</h3>
        <ViolationList violations={compare.common} onLocate={onLocate} />
      </section>
    </div>
  );
}

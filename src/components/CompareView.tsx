import { diffViolations, violationKey } from '../engine/layout';
import type { LayoutResult, Violation } from '../engine/types';
import { PanelView } from './PanelView';
import { ViolationsPanel } from './ViolationsPanel';

interface Props {
  base: LayoutResult;
  nordic: LayoutResult;
  zoom: number;
}

/** 改版前后对比：左基准版、右北欧改版，违规清单标注新增/已解决 */
export function CompareView({ base, nordic, zoom }: Props) {
  const diff = diffViolations(base.violations, nordic.violations);
  return (
    <div className="compare">
      <div className="compare-summary">
        改版前后对比（当前语言）：基准版 {base.violations.length} 项问题 → 北欧改版{' '}
        {nordic.violations.length} 项；<b className="added">新增 {diff.added.length}</b> ·{' '}
        <b className="resolved">已解决 {diff.resolved.length}</b> · 持续 {diff.persistent.length}
      </div>
      <div className="compare-cols">
        <CompareColumn
          title="基准版 v1.0"
          layout={base}
          zoom={zoom}
          tags={new Map(diff.resolved.map((v) => [violationKey(v), '已解决']))}
        />
        <CompareColumn
          title="北欧上市改版"
          layout={nordic}
          zoom={zoom}
          tags={new Map(diff.added.map((v) => [violationKey(v), '新增']))}
        />
      </div>
    </div>
  );
}

function CompareColumn({
  title,
  layout,
  zoom,
  tags,
}: {
  title: string;
  layout: LayoutResult;
  zoom: number;
  tags: Map<string, string>;
}) {
  return (
    <div className="compare-col">
      <h3>{title}</h3>
      <div className="compare-panels">
        {layout.panels.map((pl) => (
          <PanelView key={pl.panelId} layout={pl} zoom={zoom} />
        ))}
      </div>
      <ViolationsPanel violations={layout.violations} tags={tags} compact />
    </div>
  );
}

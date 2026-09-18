import type { LayoutResult } from '../engine/types';
import { PanelView } from './PanelView';

interface Props {
  layout: LayoutResult;
  zoom: number;
  onZoom: (z: number) => void;
}

function clampZoom(z: number): number {
  return Math.min(1.6, Math.max(0.4, Math.round(z * 100) / 100));
}

/** 单版本视图：正面 / 侧面 / 背面 三个面版并排（真实毫米） */
export function PanelsRow({ layout, zoom, onZoom }: Props) {
  return (
    <div className="panels-row-wrap">
      <div className="stage-toolbar">
        <span className="stage-title">版面预览（真实毫米区域）</span>
        <span className="legend">
          <i className="lg ok" /> 通过
          <i className="lg bad" /> 违规
          <i className="lg overflow" /> 溢出区域的内容
        </span>
        <div className="zoom">
          <button onClick={() => onZoom(clampZoom(zoom - 0.1))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => onZoom(clampZoom(zoom + 0.1))}>＋</button>
        </div>
      </div>
      <div className="panels-row">
        {layout.panels.map((pl) => (
          <PanelView key={pl.panelId} layout={pl} zoom={zoom} />
        ))}
      </div>
    </div>
  );
}

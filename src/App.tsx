import { useEffect, useMemo, useReducer, useState } from 'react';
import { computeLayout } from './engine/layout';
import { createCanvasMeasurer } from './engine/measure';
import { FONTS } from './engine/presets';
import { saveState } from './state/persistence';
import { initWorkbench, persistedOf, reducer } from './state/store';
import { CompareView } from './components/CompareView';
import { PanelsRow } from './components/PanelsRow';
import { SidePanel } from './components/SidePanel';
import { TopBar } from './components/TopBar';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initWorkbench);
  const [zoom, setZoom] = useState(1);
  // canvas 测量器：用与渲染一致的字体栈做真实文字测量
  const measurer = useMemo(() => createCanvasMeasurer(FONTS), []);

  // 任何变化都写入 localStorage（刷新恢复）
  useEffect(() => {
    saveState(persistedOf(state));
  }, [state]);

  // Ctrl/⌘+Z 撤销，Ctrl/⌘+Shift+Z / Ctrl+Y 重做
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
      } else if (k === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 编辑文案或约束后立即重排（纯函数计算，结果确定）
  const layout = useMemo(
    () =>
      computeLayout(
        {
          texts: state.texts,
          constraints: state.constraints,
          language: state.language,
          version: state.version,
        },
        measurer,
      ),
    [state.texts, state.constraints, state.language, state.version, measurer],
  );

  const baseLayout = useMemo(
    () =>
      state.compareMode
        ? computeLayout(
            {
              texts: state.texts,
              constraints: state.constraints,
              language: state.language,
              version: 'base',
            },
            measurer,
          )
        : null,
    [state.compareMode, state.texts, state.constraints, state.language, measurer],
  );
  const nordicLayout = useMemo(
    () =>
      state.compareMode
        ? computeLayout(
            {
              texts: state.texts,
              constraints: state.constraints,
              language: state.language,
              version: 'nordic',
            },
            measurer,
          )
        : null,
    [state.compareMode, state.texts, state.constraints, state.language, measurer],
  );

  return (
    <div className="app">
      <TopBar state={state} dispatch={dispatch} violationCount={layout.violations.length} />
      <div className="app-body">
        <SidePanel state={state} dispatch={dispatch} violations={layout.violations} />
        <main className="stage">
          {state.compareMode && baseLayout && nordicLayout ? (
            <CompareView base={baseLayout} nordic={nordicLayout} zoom={zoom * 0.62} />
          ) : (
            <PanelsRow layout={layout} zoom={zoom} onZoom={setZoom} />
          )}
        </main>
      </div>
    </div>
  );
}

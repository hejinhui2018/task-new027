import { useEffect, useMemo, useState } from 'react';
import { ConstraintsEditor } from './components/ConstraintsEditor';
import { CopyEditor } from './components/CopyEditor';
import { PanelView } from './components/PanelView';
import { TopBar } from './components/TopBar';
import { ViolationsPanel } from './components/ViolationsPanel';
import { productSpec } from './data/product';
import { diffViolations, layoutProduct, type Violation } from './engine/layout';
import { CanvasMeasurer } from './engine/measurer';
import { useWorkspace } from './state/useWorkspace';
import type { PanelId } from './types';

const SCALE = 4.5; // 像素/毫米
const PANEL_TABS: { id: PanelId; label: string }[] = [
  { id: 'front', label: '正面' },
  { id: 'side', label: '侧面' },
  { id: 'back', label: '背面' },
];
type SideTab = 'issues' | 'copy' | 'constraints';

export default function App() {
  const { state, dispatch, undo, redo, canUndo, canRedo, reset } = useWorkspace(productSpec);
  const [activePanel, setActivePanel] = useState<PanelId>('front');
  const [sideTab, setSideTab] = useState<SideTab>('issues');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Canvas 真实文字测量器（同一环境内结果确定）
  const measurer = useMemo(() => new CanvasMeasurer(productSpec.fonts), []);

  const version = state.versions.find((v) => v.id === state.versionId) ?? state.versions[0];
  // 编辑文案或约束后立即重排：layout 是 state 的纯函数
  const layout = useMemo(
    () => layoutProduct(productSpec, state.constraints, version, state.language, measurer),
    [state.constraints, version, state.language, measurer],
  );

  const compareVersion = state.compareWith
    ? state.versions.find((v) => v.id === state.compareWith) ?? null
    : null;
  const compareLayout = useMemo(
    () =>
      compareVersion
        ? layoutProduct(productSpec, state.constraints, compareVersion, state.language, measurer)
        : null,
    [compareVersion, state.constraints, state.language, measurer],
  );
  const compareDiff = useMemo(
    () => (compareLayout ? diffViolations(compareLayout.violations, layout.violations) : null),
    [compareLayout, layout],
  );

  // Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Shift+Z 或 Ctrl+Y 重做（输入框内不拦截）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const panel = productSpec.panels.find((p) => p.id === activePanel)!;
  const panelViolations = (panelId: PanelId, source: Violation[]) =>
    source.filter((v) => v.panelId === panelId);

  const locate = (v: Violation) => {
    setActivePanel(v.panelId);
    setSelectedZoneId(v.zoneId);
    setSideTab('issues');
  };

  return (
    <div className="app">
      <TopBar
        language={state.language}
        versionId={state.versionId}
        versions={state.versions}
        compareWith={state.compareWith}
        violationCount={layout.violations.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onLanguage={(language) => dispatch({ type: 'set-language', language })}
        onVersion={(versionId) => dispatch({ type: 'set-version', versionId })}
        onCompare={(versionId) => dispatch({ type: 'set-compare', versionId })}
        onUndo={undo}
        onRedo={redo}
        onReset={() => {
          if (window.confirm('重置将清除所有本地修改（文案、约束、历史）并恢复初始数据，确定吗？')) {
            reset();
          }
        }}
      />

      <main className="main">
        <section className="stage">
          <div className="panel-tabs" role="tablist" aria-label="面板">
            {PANEL_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activePanel === t.id}
                className={activePanel === t.id ? 'seg seg-active' : 'seg'}
                onClick={() => setActivePanel(t.id)}
              >
                {t.label}
                {panelViolations(t.id, layout.violations).length > 0 &&
                  ` ⚠${panelViolations(t.id, layout.violations).length}`}
              </button>
            ))}
          </div>

          <div className="panel-stage">
            {compareLayout && compareVersion ? (
              <div className="compare">
                <PanelView
                  panel={panel}
                  layout={compareLayout.panels[activePanel]}
                  violations={panelViolations(activePanel, compareLayout.violations)}
                  fonts={productSpec.fonts}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={(id) => {
                    setSelectedZoneId(id);
                    setSideTab('constraints');
                  }}
                  scale={SCALE}
                  title={`对比版 · ${compareVersion.name}`}
                />
                <PanelView
                  panel={panel}
                  layout={layout.panels[activePanel]}
                  violations={panelViolations(activePanel, layout.violations)}
                  fonts={productSpec.fonts}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={(id) => {
                    setSelectedZoneId(id);
                    setSideTab('constraints');
                  }}
                  scale={SCALE}
                  title={`当前版 · ${version.name}`}
                />
              </div>
            ) : (
              <PanelView
                panel={panel}
                layout={layout.panels[activePanel]}
                violations={panelViolations(activePanel, layout.violations)}
                fonts={productSpec.fonts}
                selectedZoneId={selectedZoneId}
                onSelectZone={(id) => {
                  setSelectedZoneId(id);
                  setSideTab('constraints');
                }}
                scale={SCALE}
              />
            )}
          </div>

          {compareDiff && compareVersion && (
            <div className="diff-bar">
              改版对比：仅当前版本 <strong>{compareDiff.onlyB.length}</strong> 项 · 仅
              {compareVersion.name} <strong>{compareDiff.onlyA.length}</strong> 项 · 共有{' '}
              <strong>{compareDiff.common.length}</strong> 项
            </div>
          )}
        </section>

        <aside className="side">
          <div className="side-tabs" role="tablist" aria-label="侧栏">
            <button
              role="tab"
              aria-selected={sideTab === 'issues'}
              className={sideTab === 'issues' ? 'seg seg-active' : 'seg'}
              onClick={() => setSideTab('issues')}
            >
              问题{layout.violations.length > 0 ? `（${layout.violations.length}）` : ''}
            </button>
            <button
              role="tab"
              aria-selected={sideTab === 'copy'}
              className={sideTab === 'copy' ? 'seg seg-active' : 'seg'}
              onClick={() => setSideTab('copy')}
            >
              文案
            </button>
            <button
              role="tab"
              aria-selected={sideTab === 'constraints'}
              className={sideTab === 'constraints' ? 'seg seg-active' : 'seg'}
              onClick={() => setSideTab('constraints')}
            >
              约束
            </button>
          </div>

          <div className="side-body">
            {sideTab === 'issues' && (
              <ViolationsPanel
                violations={layout.violations}
                compare={
                  compareDiff && compareVersion
                    ? { ...compareDiff, nameA: compareVersion.name, nameB: version.name }
                    : null
                }
                onLocate={locate}
              />
            )}
            {sideTab === 'copy' && (
              <CopyEditor
                spec={productSpec}
                version={version}
                language={state.language}
                onEdit={(blockId, text) =>
                  dispatch(
                    { type: 'edit-copy', versionId: version.id, language: state.language, blockId, text },
                    `copy:${version.id}:${state.language}:${blockId}`,
                  )
                }
              />
            )}
            {sideTab === 'constraints' && (
              <ConstraintsEditor
                spec={productSpec}
                constraints={state.constraints}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                onChange={(zoneId, constraints) =>
                  dispatch({ type: 'set-constraints', zoneId, constraints }, `constraint:${zoneId}`)
                }
              />
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

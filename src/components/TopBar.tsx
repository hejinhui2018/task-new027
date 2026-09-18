import type { Action, WorkbenchState } from '../state/store';
import { LANGUAGES, VERSIONS } from '../engine/presets';

interface Props {
  state: WorkbenchState;
  dispatch: React.Dispatch<Action>;
  violationCount: number;
}

export function TopBar({ state, dispatch, violationCount }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        PackProof <span>多语言包装版面验收台</span>
      </div>

      <div className="tabs" role="tablist" aria-label="语言">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            className={state.language === l.id ? 'tab active' : 'tab'}
            onClick={() => dispatch({ type: 'SET_LANGUAGE', language: l.id })}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="tabs" role="tablist" aria-label="文案版本">
        {VERSIONS.map((v) => (
          <button
            key={v.id}
            className={state.version === v.id ? 'tab active' : 'tab'}
            onClick={() => dispatch({ type: 'SET_VERSION', version: v.id })}
          >
            {v.label}
          </button>
        ))}
      </div>

      <button
        className={state.compareMode ? 'toggle active' : 'toggle'}
        onClick={() => dispatch({ type: 'TOGGLE_COMPARE' })}
        title="并排比较基准版与北欧上市改版"
      >
        对比改版前后
      </button>

      <div className="spacer" />

      <span className={violationCount === 0 ? 'status ok' : 'status bad'}>
        {violationCount === 0 ? '✓ 全部通过' : `✗ ${violationCount} 项违规`}
      </span>

      <button
        onClick={() => dispatch({ type: 'UNDO' })}
        disabled={state.past.length === 0}
        title="撤销 (Ctrl/⌘+Z)"
      >
        ↶ 撤销
      </button>
      <button
        onClick={() => dispatch({ type: 'REDO' })}
        disabled={state.future.length === 0}
        title="重做 (Ctrl/⌘+Shift+Z)"
      >
        ↷ 重做
      </button>
      <button
        onClick={() => {
          if (window.confirm('重置为内置预设？当前修改与历史将被清除。')) {
            dispatch({ type: 'RESET' });
          }
        }}
        title="恢复内置预设文案与约束"
      >
        ⟲ 重置
      </button>
    </header>
  );
}

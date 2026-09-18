import { LANGUAGES, type CopyVersion, type LanguageCode } from '../types';

interface TopBarProps {
  language: LanguageCode;
  versionId: string;
  versions: CopyVersion[];
  compareWith: string | null;
  violationCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onLanguage: (lang: LanguageCode) => void;
  onVersion: (versionId: string) => void;
  onCompare: (versionId: string | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

export function TopBar(props: TopBarProps) {
  const currentVersion = props.versions.find((v) => v.id === props.versionId);
  return (
    <header className="topbar">
      <div className="topbar-row">
        <h1 className="topbar-title">
          PackProof <span className="topbar-sub">多语言包装版面验收台</span>
        </h1>
        <div className="topbar-group" role="tablist" aria-label="语言">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="tab"
              aria-selected={props.language === l.code}
              className={props.language === l.code ? 'seg seg-active' : 'seg'}
              onClick={() => props.onLanguage(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <label className="topbar-field">
          文案版本
          <select value={props.versionId} onChange={(e) => props.onVersion(e.target.value)}>
            {props.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="topbar-field">
          改版对比
          <select
            value={props.compareWith ?? ''}
            onChange={(e) => props.onCompare(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">关闭</option>
            {props.versions
              .filter((v) => v.id !== props.versionId)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  对比 {v.name}
                </option>
              ))}
          </select>
        </label>
        <div className="topbar-group">
          <button className="btn" disabled={!props.canUndo} onClick={props.onUndo} title="撤销 (Ctrl+Z)">
            ⟲ 撤销
          </button>
          <button className="btn" disabled={!props.canRedo} onClick={props.onRedo} title="重做 (Ctrl+Shift+Z)">
            ⟳ 重做
          </button>
          <button className="btn btn-danger" onClick={props.onReset} title="清除本地修改并恢复初始数据">
            重置
          </button>
        </div>
        <span className={props.violationCount > 0 ? 'badge badge-bad' : 'badge badge-ok'}>
          {props.violationCount > 0 ? `${props.violationCount} 个问题` : '验收通过'}
        </span>
      </div>
      {currentVersion && <div className="topbar-note">{currentVersion.note}</div>}
    </header>
  );
}

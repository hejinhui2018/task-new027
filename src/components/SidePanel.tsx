import { useState } from 'react';
import type { Action, WorkbenchState } from '../state/store';
import type { Violation } from '../engine/types';
import { ConstraintsPanel } from './ConstraintsPanel';
import { CopyEditor } from './CopyEditor';
import { ViolationsPanel } from './ViolationsPanel';

interface Props {
  state: WorkbenchState;
  dispatch: React.Dispatch<Action>;
  violations: Violation[];
}

type Tab = 'issues' | 'copy' | 'constraints';

export function SidePanel({ state, dispatch, violations }: Props) {
  const [tab, setTab] = useState<Tab>('issues');
  return (
    <aside className="sidebar">
      <div className="side-tabs">
        <button className={tab === 'issues' ? 'active' : ''} onClick={() => setTab('issues')}>
          验收问题{violations.length > 0 && <b className="count">{violations.length}</b>}
        </button>
        <button className={tab === 'copy' ? 'active' : ''} onClick={() => setTab('copy')}>
          文案编辑
        </button>
        <button className={tab === 'constraints' ? 'active' : ''} onClick={() => setTab('constraints')}>
          排版约束
        </button>
      </div>
      <div className="side-content">
        {tab === 'issues' && <ViolationsPanel violations={violations} />}
        {tab === 'copy' && <CopyEditor state={state} dispatch={dispatch} />}
        {tab === 'constraints' && (
          <ConstraintsPanel constraints={state.constraints} dispatch={dispatch} />
        )}
      </div>
    </aside>
  );
}

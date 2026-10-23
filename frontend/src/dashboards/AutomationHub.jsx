import { useState } from 'react'
import { Activity, CalendarClock, CheckCircle2, CircleAlert, Clock3, FilePlus2, ListChecks, Plus, RefreshCw, Shield, Workflow, Zap } from 'lucide-react'
import { isApiConfigured } from '../lib/api.js'

const tabs = [
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'scheduled', label: 'Scheduled Tasks', icon: CalendarClock },
  { id: 'executions', label: 'Execution Logs', icon: Activity },
  { id: 'templates', label: 'Templates', icon: FilePlus2 },
]

const emptyCopy = {
  workflows: ['No workflows connected', 'Workflow definitions will appear here when the backend integration is configured.'],
  scheduled: ['No scheduled tasks connected', 'Schedules and their next run times will be supplied by the backend.'],
  executions: ['No execution history connected', 'Run status, timestamps, and logs will appear here when available.'],
  templates: ['No templates connected', 'Workflow templates will be loaded from the backend when its API is ready.'],
}

function EmptyState({ title, detail }) {
  return <div className="automation-empty-state"><span><CircleAlert size={20} /></span><strong>{title}</strong><p>{detail}</p></div>
}

/**
 * Automation Hub UI from all-dashboards.
 * Create Workflow opens the existing Automate modal when onCreateWorkflow is provided.
 */
export default function AutomationHub({ showToast = () => {}, onCreateWorkflow }) {
  const [activeTab, setActiveTab] = useState('workflows')
  const selectedTab = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const Icon = selectedTab.icon
  const backendStatus = isApiConfigured() ? 'API base URL set · workflow endpoints pending' : 'Backend not configured · set VITE_API_BASE_URL'
  const [title, detail] = emptyCopy[activeTab]
  const requestIntegration = () => showToast('Connect the workflow API to enable this action')
  const createWorkflow = () => {
    if (typeof onCreateWorkflow === 'function') onCreateWorkflow()
    else requestIntegration()
  }

  return <div className="automation-page">
    <section className="automation-hero">
      <div><span className="automation-kicker"><Shield size={13} /> AUTOMATION CONTROL</span><h1>Automation Hub</h1><p>Build, schedule, and manage intelligent automation workflows.</p></div>
      <div className="automation-hero-promise">“Automate today.<br />Stay secure tomorrow.”</div>
    </section>

    <nav className="automation-tabs" aria-label="Automation sections">
      {tabs.map(({ id, label, icon: TabIcon }) => <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><TabIcon size={14} />{label}</button>)}
    </nav>

    <section className="automation-metrics" aria-label="Workflow metrics">
      {[
        { label: 'Total Workflows', icon: Workflow },
        { label: 'Active Workflows', icon: Zap },
        { label: 'Scheduled Tasks', icon: CalendarClock },
        { label: 'Successful Runs', icon: CheckCircle2 },
      ].map(({ label, icon: MetricIcon }) => <article className="automation-metric" key={label}><span className="metric-icon"><MetricIcon size={17} /></span><div><small>{label}</small><b>—</b><span className="metric-footnote">Waiting for backend</span></div></article>)}
    </section>

    <section className="automation-overview-grid">
      <div className="automation-left-column">
        <article className="automation-panel automation-create-card">
          <span className="create-workflow-icon"><Plus size={23} /></span><div className="create-workflow-copy"><span className="automation-kicker">WORKFLOW DESIGNER</span><h2>Create a workflow</h2><p>Build an automation with connected workflow services.</p><button className="automation-primary-button" type="button" onClick={createWorkflow}><Plus size={13} /> Create Workflow</button></div>
        </article>
        <article className="automation-panel template-panel">
          <header className="automation-panel-header"><div><FilePlus2 size={15} /><h2>Popular Templates</h2></div><button type="button" onClick={() => setActiveTab('templates')}>Browse <span>›</span></button></header>
          <EmptyState title="Templates not connected" detail="Connect the workflow API to load available templates." />
        </article>
      </div>
      <article className="automation-panel recent-panel">
        <header className="automation-panel-header"><div><ListChecks size={15} /><h2>{activeTab === 'workflows' ? 'Recent Executions' : selectedTab.label}</h2></div><button type="button" onClick={() => setActiveTab('executions')}>View all <span>›</span></button></header>
        <EmptyState title={title} detail={detail} />
      </article>
    </section>

    <article className="automation-panel automation-tab-panel">
      <header className="automation-panel-header"><div><Icon size={15} /><h2>{selectedTab.label}</h2></div><div className="automation-toolbar-actions"><button type="button" aria-label="Refresh workflow data" onClick={requestIntegration}><RefreshCw size={13} /></button><button type="button" onClick={createWorkflow}><Plus size={13} /> Add</button></div></header>
      <EmptyState title={title} detail={detail} />
    </article>

    <footer className="automation-footer"><span><span className="automation-status-dot" /> {backendStatus}</span><span><Clock3 size={11} /> Data will be provided by the connected backend</span></footer>
  </div>
}

import { useState } from 'react'
import AutomationHub from './AutomationHub.jsx'
import AICommandCenter from './AICommandCenter.jsx'
import SectionPlaceholder from './SectionPlaceholder.jsx'
import {
  Bell, Check, ChevronDown, ChevronRight, CircleHelp, Code2, Crown,
  ExternalLink, FileCode2, FilePlus2, Folder, FolderOpen, Github, House,
  LayoutDashboard, LogOut, Maximize2, Menu, Network, PanelLeftClose, PanelLeftOpen, Play,
  Radio, RefreshCw, Search, Settings, Shield, ShieldAlert, ShieldCheck, Sparkles,
  Terminal, UserRound, X,
} from 'lucide-react'

const navItems = [
  { title: 'Main Dashboard', subtitle: 'Command Center', icon: House, id: 'main' },
  { title: 'AI Command Center', subtitle: 'AI Assistant & Agents', icon: Sparkles, color: 'cyan', id: 'ai' },
  { title: 'Automation Hub', subtitle: 'Intelligent Automation', icon: Network, color: 'cyan', id: 'automation' },
  { title: 'Threat Intelligence', subtitle: 'Detection & Fraud', icon: ShieldAlert, color: 'red', id: 'threat' },
  { title: 'Security Testing Lab', subtitle: 'Secure Apps & Vulnerabilities', icon: ShieldCheck, color: 'blue', id: 'security' },
  { title: 'Identity & Network', subtitle: 'Access, Zero Trust & Privacy', icon: Radio, color: 'cyan', id: 'identity' },
  { title: 'Investigation Center', subtitle: 'Digital Forensics & Analytics', icon: Search, color: 'blue', id: 'investigation' },
  { title: 'AI Defense & Response', subtitle: 'Guardrails & Incident Response', icon: Shield, color: 'red', id: 'defense' },
  { title: 'Developer Dashboard', subtitle: 'Coding Workspace', icon: Code2, color: 'cyan', id: 'developer' },
]

const tools = [
  { title: 'Code Editor', caption: 'Open the code editor', icon: Code2, color: 'cyan', target: 'editor' },
  { title: 'Project Builder', caption: 'Open the project explorer', icon: Folder, color: 'sky', target: 'explorer' },
  { title: 'Terminal', caption: 'Open the workspace terminal', icon: Terminal, color: 'pink', target: 'terminal' },
  { title: 'Live Preview', caption: 'Open preview when available', icon: LayoutDashboard, color: 'blue', target: 'preview' },
  { title: 'GitHub Integration', caption: 'Open repository integration', icon: Github, color: 'white', target: 'github' },
  { title: 'View', caption: 'Switch to VS Code workspace', icon: Maximize2, color: 'blue', target: 'vscode' },
]

function IconButton({ label, children, onClick, disabled = false }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function ResizeHandle({ orientation, onResize, label, style }) {
  const handlePointerDown = (event) => {
    event.preventDefault()
    let previous = orientation === 'vertical' ? event.clientX : event.clientY
    const move = (moveEvent) => {
      const current = orientation === 'vertical' ? moveEvent.clientX : moveEvent.clientY
      onResize(orientation === 'vertical' ? current - previous : previous - current)
      previous = current
    }
    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      document.body.classList.remove('is-resizing-dashboard')
    }
    document.body.classList.add('is-resizing-dashboard')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
    window.addEventListener('pointercancel', finish, { once: true })
  }

  return <button style={style} className={`workspace-resizer ${orientation}`} role="separator" aria-orientation={orientation} aria-label={label} onPointerDown={handlePointerDown} />
}

function EmptyState({ icon: Icon, title, detail, action }) {
  return <div className="workspace-empty-state"><span className="empty-state-icon"><Icon size={22} /></span><h3>{title}</h3><p>{detail}</p>{action && <span className="empty-state-action">{action}</span>}</div>
}

function DeveloperWorkspace({ openPanels, activeSidePanel, onNotify, onClosePanel, previewUrl, onPreviewUrl }) {
  const [explorerWidth, setExplorerWidth] = useState(252)
  const [sideWidth, setSideWidth] = useState(350)
  const [terminalHeight, setTerminalHeight] = useState(205)
  const showExplorer = openPanels.has('explorer')
  const showEditor = openPanels.has('editor')
  const showTerminal = openPanels.has('terminal')
  const showSidePanel = Boolean(activeSidePanel)
  const showProjectBuilderBesideEditor = showEditor && showExplorer
  const centerColumn = showExplorer ? 3 : 1
  const sideColumn = (showExplorer ? 3 : 1) + 2
  const hasUpperPane = showEditor

  const columns = showProjectBuilderBesideEditor
    ? `${explorerWidth}px 5px minmax(0, 1fr)`
    : [
        ...(showExplorer ? [`${explorerWidth}px`, '5px'] : []),
        'minmax(0, 1fr)',
        ...(showSidePanel ? ['5px', `${sideWidth}px`] : []),
      ].join(' ')
  const rows = showProjectBuilderBesideEditor
    ? 'max(68vh, 620px)'
    : hasUpperPane && showTerminal ? `minmax(150px, 1fr) 5px ${terminalHeight}px` : 'minmax(0, 1fr)'

  if (!showExplorer && !showEditor && !showTerminal && !showSidePanel) {
    return <div className="developer-workspace empty-workspace"><div><span className="workspace-empty-mark"><Code2 size={24} /></span><b>Choose a tool to open your workspace</b><small>Your editor, project explorer, terminal, preview, and integrations open only when selected above.</small></div></div>
  }

  return <div className={`developer-workspace ${showEditor ? 'editor-expanded' : ''} ${showProjectBuilderBesideEditor ? 'project-builder-open' : ''}`} style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}>
    {showExplorer && <section className="panel explorer-panel resizable-panel" style={{ gridColumn: 1, gridRow: '1 / -1' }}>
      <header className="panel-header"><div className="panel-heading"><Folder size={17} className="cyan" /><h2>Project Explorer</h2></div><div className="panel-actions"><IconButton label="New file (requires backend)" disabled><FilePlus2 size={15} /></IconButton><IconButton label="Refresh project files" onClick={() => onNotify('Connect the project-files API to load workspace files')}><RefreshCw size={15} /></IconButton><IconButton label="Close project explorer" onClick={() => onClosePanel('explorer')}><X size={15} /></IconButton></div></header>
      <div className="tree-scroll"><EmptyState icon={FolderOpen} title="No project files loaded" detail="Connect the workspace-files backend to show folders and files here." /></div>
      <footer className="explorer-footer"><span>Workspace files</span><span>Backend pending</span></footer>
    </section>}
    {showExplorer && <ResizeHandle orientation="vertical" label="Resize project explorer" style={{ gridColumn: 2, gridRow: '1 / -1' }} onResize={(delta) => setExplorerWidth((width) => Math.max(180, Math.min(520, width + delta)))} />}

    {showEditor && <section className="panel editor-panel resizable-panel" style={{ gridColumn: centerColumn, gridRow: 1 }}>
      <header className="tabs-header"><div className="tabs"><span className="editor-tab current"><Code2 size={14} /><span>Editor</span></span></div><IconButton label="Close code editor" onClick={() => onClosePanel('editor')}><X size={15} /></IconButton></header>
      <div className="editor-toolbar"><span><span className="editor-status" /> No file selected</span><div><span>UTF-8</span><span>Source</span><IconButton label="Refresh editor files" onClick={() => onNotify('Connect the workspace-files API to open source files')}><RefreshCw size={13} /></IconButton></div></div>
      <div className="code-area"><EmptyState icon={FileCode2} title="Open a project file to start editing" detail="The editor will load source from your connected workspace." /></div>
      <footer className="editor-footer"><span>Ready</span><span>UTF-8</span><span>Backend pending</span></footer>
    </section>}

    {showEditor && showTerminal && <ResizeHandle orientation="horizontal" label="Resize terminal panel" onResize={(delta) => setTerminalHeight((height) => Math.max(120, Math.min(480, height + delta)))} style={{ gridColumn: centerColumn, gridRow: 2 }} />}
    {showTerminal && <section className="panel terminal-panel resizable-panel" style={{ gridColumn: centerColumn, gridRow: hasUpperPane ? 3 : 1 }}>
      <header className="panel-header"><div className="panel-heading"><Terminal size={17} className="cyan" /><h2>Terminal</h2></div><div className="panel-actions"><IconButton label="Terminal status" onClick={() => onNotify('Terminal session is not connected yet')}><Play size={14} /></IconButton><IconButton label="Close terminal" onClick={() => onClosePanel('terminal')}><X size={15} /></IconButton></div></header>
      <div className="terminal-content"><EmptyState icon={Terminal} title="Terminal backend not connected" detail="Connect a sandboxed workspace terminal service to run commands." /></div>
      <footer className="terminal-footer"><span>Terminal</span><span>Waiting for backend</span><span>Read only until connected</span></footer>
    </section>}

    {showSidePanel && <ResizeHandle orientation="vertical" label="Resize side panel" style={{ gridColumn: sideColumn - 1, gridRow: '1 / -1' }} onResize={(delta) => setSideWidth((width) => Math.max(240, Math.min(620, width - delta)))} />}
    {showSidePanel && activeSidePanel === 'preview' && <section className="panel preview-panel resizable-panel" style={{ gridColumn: sideColumn, gridRow: '1 / -1' }}>
      <header className="panel-header"><div className="panel-heading"><span className="workspace-status-dot" /><h2>Live Preview</h2></div><div className="panel-actions"><IconButton label="Open preview address" onClick={() => onNotify(previewUrl ? 'Preview service is not embedded yet — URL captured locally' : 'A preview service URL has not been configured')}><ExternalLink size={15} /></IconButton><IconButton label="Close live preview" onClick={() => onClosePanel('preview')}><X size={15} /></IconButton></div></header>
      <div className="preview-controls"><input aria-label="Preview address" placeholder="Preview URL from backend" value={previewUrl} onChange={(event) => onPreviewUrl(event.target.value)} /><IconButton label="Load preview" onClick={() => onNotify(previewUrl ? 'Preview URL saved locally. Connect a preview service to render the app.' : 'Enter a preview URL first')}><Maximize2 size={15} /></IconButton></div>
      <div className="browser-window preview-empty"><EmptyState icon={LayoutDashboard} title="Preview service not connected" detail={previewUrl ? `Captured URL: ${previewUrl}` : 'The preview pane is available. Connect a preview URL through the backend to render your app here.'} /></div>
    </section>}

    {showSidePanel && activeSidePanel === 'github' && <section className="panel github-panel resizable-panel" style={{ gridColumn: sideColumn, gridRow: '1 / -1' }}>
      <header className="panel-header"><div className="panel-heading"><Github size={17} /><h2>GitHub Integration</h2></div><div className="panel-actions"><IconButton label="Close GitHub integration" onClick={() => onClosePanel('github')}><X size={15} /></IconButton></div></header>
      <div className="github-content github-empty-content"><EmptyState icon={Github} title="Repository connection not configured" detail="Connect an OAuth flow through the backend before enabling repository actions." action={<button className="button-outline" onClick={() => onNotify('GitHub OAuth is waiting for backend configuration')}>Connect GitHub</button>} /></div>
    </section>}
  </div>
}

/**
 * New Cyber-Shield shell (sidebar, topbar, responsive layout) from all-dashboards.
 * Renders existing feature views through `renderMain` / section props without duplicating auth.
 */
export default function DashboardShell({
  activeDashboard,
  onSelectDashboard,
  search,
  onSearchChange,
  searchResults = [],
  onSearchSelect,
  notificationsOpen,
  onToggleNotifications,
  notice,
  onMarkNotificationsRead,
  accountOpen,
  onToggleAccount,
  onLogout,
  onNavigateLegacy,
  onOpenModal,
  showToast,
  toast,
  onDismissToast,
  chat,
  chatText,
  setChatText,
  submitChat,
  renderMain,
  renderLegacySection,
}) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWasCollapsed, setSidebarWasCollapsed] = useState(false)
  const [vscodeMode, setVscodeMode] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [openPanels, setOpenPanels] = useState(new Set())
  const [activeSidePanel, setActiveSidePanel] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const openTool = (target) => {
    if (target === 'vscode') {
      if (vscodeMode) {
        setVscodeMode(false)
        setSidebarCollapsed(sidebarWasCollapsed)
      } else {
        setSidebarWasCollapsed(sidebarCollapsed)
        setSidebarCollapsed(true)
        setVscodeMode(true)
        setOpenPanels(new Set(['editor', 'explorer']))
        setActiveSidePanel(null)
      }
      return
    }
    if (target === 'preview' || target === 'github') {
      setActiveSidePanel((current) => current === target ? null : target)
      return
    }
    setOpenPanels((current) => {
      const next = new Set(current)
      if (target === 'explorer') {
        if (next.has('explorer')) next.delete('explorer')
        else next.add('explorer')
        next.add('editor')
      } else if (next.has(target)) next.delete(target)
      else next.add(target)
      return next
    })
  }

  const closePanel = (target) => {
    if (target === 'preview' || target === 'github') {
      setActiveSidePanel((current) => current === target ? null : current)
      return
    }
    setOpenPanels((current) => { const next = new Set(current); next.delete(target); return next })
  }

  const activeTool = (tool) => tool.target === 'preview' || tool.target === 'github'
    ? activeSidePanel === tool.target
    : tool.target === 'vscode' ? vscodeMode : openPanels.has(tool.target)

  const selectDashboard = (dashboard) => {
    onSelectDashboard(dashboard)
    setMobileMenu(false)
    if (vscodeMode) {
      setVscodeMode(false)
      setSidebarCollapsed(sidebarWasCollapsed)
    }
  }

  const handleAiTool = (action) => {
    if (action === 'Create Report') onOpenModal?.('Create Report')
    else if (action === 'Notes & Tasks') onNavigateLegacy?.('Notes & Tasks')
  }

  let mainContent = null
  if (activeDashboard === 'ai') {
    mainContent = <AICommandCenter showToast={showToast} chat={chat} chatText={chatText} setChatText={setChatText} submitChat={submitChat} onOpenTool={handleAiTool} />
  } else if (activeDashboard === 'automation') {
    mainContent = <AutomationHub showToast={showToast} onCreateWorkflow={() => onOpenModal?.('Automate')} />
  } else if (activeDashboard === 'main') {
    mainContent = <div className="legacy-dashboard">{renderMain?.()}</div>
  } else if (activeDashboard === 'threat') {
    mainContent = (
      <SectionPlaceholder
        title="Threat Intelligence"
        subtitle="Detection signals, fraud indicators, and threat categories."
        detail="This workspace section uses the new shell. Full threat-feed UI is pending. You can still open existing detection and fraud workflows from your connected Cyber-Shield features."
        imageSrc="/shared/04_Threat_Intelligence_Center.png"
        actions={[
          { label: 'Open Threat Detection', onClick: () => onNavigateLegacy?.('Threat Detection'), primary: true },
          { label: 'Open Fraud Detection', onClick: () => onNavigateLegacy?.('Fraud Detection') },
        ]}
      />
    )
  } else if (activeDashboard === 'security') {
    mainContent = (
      <SectionPlaceholder
        title="Security Testing Lab"
        subtitle="Authorized URL and code assessment workflows."
        detail="Launch existing security and vulnerability scan flows from here. Live scanning services remain subject to your backend configuration."
        imageSrc="/shared/05_Security_Testing_Lab.png"
        actions={[
          { label: 'Security Scan', onClick: () => onNavigateLegacy?.('Security Scan'), primary: true },
          { label: 'Vulnerability Scan', onClick: () => onNavigateLegacy?.('Vulnerability Scan') },
          { label: 'Scan a URL', onClick: () => onOpenModal?.('Scan URL') },
        ]}
      />
    )
  } else if (activeDashboard === 'identity') {
    mainContent = (
      <SectionPlaceholder
        title="Identity & Network"
        subtitle="Access control, zero trust, and privacy posture."
        detail="No dedicated identity/network module is connected yet. This placeholder keeps navigation complete while backend services are configured."
        imageSrc="/shared/06_Identity_and_Network_Security.png"
        actions={[
          { label: 'Open Settings', onClick: () => onNavigateLegacy?.('Settings') },
          { label: 'View Projects', onClick: () => onNavigateLegacy?.('Projects & Files') },
        ]}
      />
    )
  } else if (activeDashboard === 'investigation') {
    mainContent = (
      <SectionPlaceholder
        title="Investigation Center"
        subtitle="Digital forensics records and analytical review."
        detail="Reuse the existing Digital Forensics workspace while the expanded investigation module is built out."
        imageSrc="/shared/07_Investigation_Center.png"
        actions={[
          { label: 'Digital Forensics', onClick: () => onNavigateLegacy?.('Digital Forensics'), primary: true },
          { label: 'View Reports', onClick: () => onNavigateLegacy?.('Reports') },
        ]}
      />
    )
  } else if (activeDashboard === 'defense') {
    mainContent = (
      <SectionPlaceholder
        title="AI Defense & Response"
        subtitle="Guardrails, incident ownership, and response steps."
        detail="Incident Response workflows from the existing app remain available. Autonomous defense agents are not claimed as operational."
        imageSrc="/shared/08_AI_Defense_and_Response.png"
        actions={[
          { label: 'Incident Response', onClick: () => onNavigateLegacy?.('Incident Response'), primary: true },
          { label: 'Ask AI Assistant', onClick: () => selectDashboard('ai') },
        ]}
      />
    )
  } else if (activeDashboard === 'legacy') {
    mainContent = <div className="legacy-dashboard">{renderLegacySection?.()}</div>
  } else {
    mainContent = <>
      {!vscodeMode && (heroVisible ? <section className="hero developer-hero"><div className="hero-copy"><span className="eyebrow"><span className="workspace-status-dot" /> DEVELOPER WORKSPACE</span><h1>Developer Dashboard</h1><p>Code. Build. Test. Deploy. All in one workspace.</p></div><div className="hero-promise">Build secure.<br />Build smarter.<span className="hero-spark">✦</span></div><button className="hero-close" type="button" onClick={() => setHeroVisible(false)} aria-label="Hide dashboard banner" title="Hide banner for more editor space"><X size={16} /></button><div className="hero-bottom-line" /></section> : <div className="hero-restore-row"><button type="button" onClick={() => setHeroVisible(true)}>Show dashboard banner</button></div>)}
      {vscodeMode ? <nav className="vscode-toolbar" aria-label="VS Code workspace"><div><Code2 size={17} /><strong>VS Code Workspace</strong></div><div className="vscode-toolbar-actions"><button type="button" onClick={() => openTool('explorer')}><Folder size={14} />Project Builder</button><button type="button" onClick={() => openTool('terminal')}><Terminal size={14} />Terminal</button><button type="button" onClick={() => openTool('preview')}><LayoutDashboard size={14} />Preview</button><button type="button" onClick={() => openTool('github')}><Github size={14} />GitHub</button><button className="exit-vscode-button" type="button" onClick={() => openTool('vscode')}><X size={14} />Exit View</button></div></nav> : <section className="tool-grid" aria-label="Workspace tools">{tools.map(({ title, caption, icon: Icon, color, target }) => <button key={title} className={`tool-card ${color} ${activeTool({ target }) ? 'tool-active' : ''}`} aria-pressed={activeTool({ target })} onClick={() => openTool(target)}><span className="tool-icon"><Icon size={29} strokeWidth={1.9} /></span><span className="tool-copy"><b>{title}</b><small>{caption}</small></span><ChevronRight size={17} className="tool-chevron" /></button>)}</section>}
      <DeveloperWorkspace openPanels={openPanels} activeSidePanel={activeSidePanel} onNotify={showToast} onClosePanel={closePanel} previewUrl={previewUrl} onPreviewUrl={setPreviewUrl} />
      <footer className="main-footer"><span>CYBER-SHIELD AI <span className="footer-sep">/</span> DEVELOPER WORKSPACE</span><span><span className="workspace-status-dot" /> EDITOR / TERMINAL / GITHUB PENDING</span><span>READY FOR INTEGRATION <Code2 size={12} /></span></footer>
    </>
  }

  return <div className={`app-shell new-shell ${vscodeMode ? 'vscode-mode' : ''}`}>
    <header className="topbar">
      <button className="mobile-menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label="Toggle navigation"><Menu size={21} /></button>
      <div className="brand"><img src="/shared/cyber-shield-logo.png" alt="Cyber-Shield AI" /></div>
      <label className="global-search"><Search size={18} /><input value={search} onChange={onSearchChange} placeholder="Search scans, tasks, projects…" /><kbd>⌘ K</kbd>
        {searchResults.length > 0 && <div className="shell-search-results">{searchResults.map((x, i) => <button key={i} type="button" onClick={() => onSearchSelect?.(x)}><Search size={14} />{x.label}<span>{x.type}</span></button>)}</div>}
      </label>
      <div className="top-actions">
        <div className="notification-wrap">
          <IconButton label="Notifications" onClick={onToggleNotifications}><Bell size={19} />{notice ? <i className="notice-dot-inline" /> : null}</IconButton>
          {notificationsOpen && <div className="notification-popover"><strong>Notifications</strong><p>Weekly scan ready</p><small>Your dashboard data is up to date.</small><button type="button" className="dropdown-action" onClick={onMarkNotificationsRead}>Mark all as read</button></div>}
        </div>
        <span className="top-divider" />
        <div className="profile-wrap">
          <button className="profile" type="button" onClick={onToggleAccount}><span className="avatar"><UserRound size={19} /></span><span className="profile-copy"><b>Shared Workspace</b><small>Signed in</small></span><ChevronDown size={15} /></button>
          {accountOpen && <div className="account-popover">
            <button type="button" onClick={() => onNavigateLegacy?.('Profile')}>Profile</button>
            <button type="button" onClick={() => onNavigateLegacy?.('Settings')}>Settings</button>
            <button type="button" onClick={() => onNavigateLegacy?.('Projects & Files')}>Projects & Files</button>
            <button type="button" onClick={() => onNavigateLegacy?.('Notes & Tasks')}>Notes & Tasks</button>
            <button type="button" onClick={() => onNavigateLegacy?.('Reports')}>Reports</button>
            <button type="button" onClick={onLogout}><LogOut size={15} />Logout</button>
          </div>}
        </div>
      </div>
    </header>

    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
        <div className="sidebar-scroll">
          <div className="sidebar-toggle-row">
            <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <span>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</span>
              {!sidebarCollapsed && <small>Collapse sidebar</small>}
            </button>
          </div>
          <div className="nav-list">{navItems.map(({ title, subtitle, icon: Icon, color, id }) => {
            const active = activeDashboard === id
            return <button key={title} className={`nav-entry ${active ? 'selected' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => selectDashboard(id)}>
              <Icon className={`nav-icon ${color || 'default'}`} size={25} strokeWidth={2.1} />
              <span className="nav-copy"><b>{title}</b><small>{subtitle}</small></span>
              {active && <ChevronRight size={17} className="nav-chevron" />}
            </button>
          })}</div>
          <div className="sidebar-bottom">
            <button className="nav-entry compact" type="button" onClick={() => onNavigateLegacy?.('Settings')}><Settings size={24} className="nav-icon settings-icon" /><span className="nav-copy"><b>Settings</b><small>Preferences & Config</small></span></button>
            <button className="nav-entry compact" type="button" onClick={() => onNavigateLegacy?.('Help & Support')}><CircleHelp size={24} className="nav-icon help-icon" /><span className="nav-copy"><b>Help & Support</b><small>Documentation</small></span></button>
            <button className="plan-card" type="button" onClick={() => showToast?.('Plan information uses your signed-in workspace')}><Crown size={23} fill="currentColor" /><span><b>Plan</b><small>Workspace</small></span><ChevronRight size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">{mainContent}</main>
    </div>
    {toast && <div className="toast"><Check size={15} />{toast}<button onClick={onDismissToast} aria-label="Dismiss"><X size={14} /></button></div>}
  </div>
}

export { navItems }

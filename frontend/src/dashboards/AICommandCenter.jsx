import { useState } from 'react'
import { Activity, Bot, Braces, ChevronRight, CircleAlert, FileSearch, MessageSquare, Network, Send, Shield, ShieldCheck, Sparkles, WandSparkles, Workflow } from 'lucide-react'
import { isApiConfigured } from '../lib/api.js'

const agentModes = [
  { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
  { id: 'autonomous', label: 'Autonomous Agent', icon: Bot },
  { id: 'generative', label: 'Generative AI', icon: WandSparkles },
  { id: 'productivity', label: 'Productivity', icon: Activity },
]

const availableTools = [
  { label: 'Code Explainer', icon: Braces },
  { label: 'Report Generator', icon: FileSearch },
  { label: 'Threat Summarizer', icon: Shield },
  { label: 'Security Assistant', icon: ShieldCheck },
]

function EmptyState({ title, detail }) {
  return <div className="ai-empty-state"><span><CircleAlert size={19} /></span><strong>{title}</strong><p>{detail}</p></div>
}

/**
 * AI Command Center UI from all-dashboards.
 * When chat props are provided, the Assistant mode uses the existing /api/chat flow.
 */
export default function AICommandCenter({
  showToast = () => {},
  chat,
  chatText,
  setChatText,
  submitChat,
  onOpenTool,
}) {
  const [activeMode, setActiveMode] = useState('assistant')
  const [prompt, setPrompt] = useState('')
  const chatConnected = typeof submitChat === 'function'
  const backendStatus = chatConnected
    ? 'Chat API connected · agent modes pending'
    : isApiConfigured()
      ? 'API base URL set · agent endpoints pending'
      : 'Backend not configured · set VITE_API_BASE_URL'
  const requestIntegration = () => showToast('Connect the AI agent API to enable this action')

  const submitPrompt = (event) => {
    event.preventDefault()
    if (activeMode === 'assistant' && chatConnected) {
      const text = (chatText !== undefined ? chatText : prompt).trim()
      if (!text) return
      submitChat(text)
      if (setChatText) setChatText('')
      else setPrompt('')
      return
    }
    if (!prompt.trim()) return
    requestIntegration()
  }

  const inputValue = activeMode === 'assistant' && chatConnected && chatText !== undefined ? chatText : prompt
  const onInputChange = (event) => {
    if (activeMode === 'assistant' && chatConnected && setChatText) setChatText(event.target.value)
    else setPrompt(event.target.value)
  }

  return <div className="ai-command-page">
    <section className="ai-command-hero">
      <div className="ai-hero-copy"><span className="ai-kicker"><Sparkles size={13} /> CYBER-SHIELD INTELLIGENCE</span><h1>AI Command Center</h1><p>Your intelligent cybersecurity assistant and autonomous agents.</p></div>
      <div className="ai-hero-figure" aria-hidden="true"><span className="ai-orbit ai-orbit-one" /><span className="ai-orbit ai-orbit-two" /><span className="ai-helmet"><i /><b /><em /></span></div>
      <div className="ai-hero-promise">Smarter agents.<br />Safer tomorrow.</div>
    </section>

    <nav className="ai-agent-tabs" aria-label="Agent categories">
      {agentModes.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeMode === id ? 'active' : ''} aria-pressed={activeMode === id} onClick={() => setActiveMode(id)}><Icon size={14} />{label}</button>)}
    </nav>

    <div className="ai-command-grid">
      <section className="ai-panel ai-assistant-panel">
        <header className="ai-panel-header"><div><span className="ai-live-indicator" /><h2>{agentModes.find((mode) => mode.id === activeMode)?.label}</h2></div><span className="ai-connection-label">{activeMode === 'assistant' && chatConnected ? 'CHAT CONNECTED' : isApiConfigured() ? 'API CONFIGURED' : 'NOT CONNECTED'}</span></header>
        <div className="ai-assistant-body">
          <div className="ai-agent-identity"><span className="ai-agent-avatar"><Bot size={31} /></span><div><strong>{activeMode === 'assistant' ? 'Kira Assistant' : 'AI Agent'}</strong><p>{activeMode === 'assistant' && chatConnected ? 'Ask about scans, threats, code review, or security workflows.' : 'Connect an agent service to start a secure, context-aware conversation.'}</p></div></div>
          {activeMode === 'assistant' && chatConnected ? (
            <div className="ai-chat-thread">
              {!chat?.length ? (
                <EmptyState title="Start a conversation" detail="Ask about a security concept, scan workflow, or threat indicator." />
              ) : chat.map((x, i) => (
                <div key={i} className={`ai-chat-bubble ${x.from}`}>
                  <b>{x.from === 'you' ? 'You' : 'Assistant'}</b>
                  <p>{x.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No conversation loaded" detail="Assistant replies and conversation history will appear here after the backend is connected." />
          )}
        </div>
        <form className="ai-prompt-form" onSubmit={submitPrompt}><input value={inputValue} onChange={onInputChange} aria-label="Ask the AI assistant" placeholder={activeMode === 'assistant' && chatConnected ? 'Ask about a threat, scan, or security concept…' : 'Ask the connected assistant…'} /><button aria-label="Send prompt" type="submit"><Send size={16} /></button></form>
      </section>

      <div className="ai-right-column">
        <section className="ai-panel ai-tasks-panel">
          <header className="ai-panel-header"><div><Workflow size={15} /><h2>Agent Tasks</h2></div><button className="ai-text-action" type="button" onClick={() => (onOpenTool ? onOpenTool('Notes & Tasks') : requestIntegration())}>View all <ChevronRight size={13} /></button></header>
          <EmptyState title="No agent tasks loaded" detail="Task names, status, and timestamps will be provided by your backend." />
          <div className="ai-task-footer"><span><Network size={12} /> Task service</span><span>Backend pending</span></div>
        </section>

        <section className="ai-panel ai-tools-panel">
          <header className="ai-panel-header"><div><Sparkles size={15} /><h2>AI Tools</h2></div><span className="ai-tools-caption">Connect to enable</span></header>
          <div className="ai-tools-grid">{availableTools.map(({ label, icon: Icon }) => <button type="button" key={label} onClick={() => {
            if (label === 'Report Generator' && onOpenTool) onOpenTool('Create Report')
            else if (label === 'Security Assistant' && chatConnected) setActiveMode('assistant')
            else requestIntegration()
          }}><Icon size={19} /><b>{label}</b><small>{label === 'Report Generator' ? 'Uses reports API' : 'Backend required'}</small></button>)}</div>
        </section>
      </div>
    </div>

    <footer className="ai-command-footer"><span><span className="ai-status-dot" />{backendStatus}</span><span><MessageSquare size={12} /> Agent data will be loaded from the connected backend</span></footer>
  </div>
}

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Database,
  DollarSign,
  Edit2,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const navItems = [
  { id: 'overview',   label: 'Overview',              icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
  { id: 'hrms',       label: 'HRMS',                  icon: Users,           roles: ['admin', 'manager', 'employee'] },
  { id: 'crm',        label: 'CRM',                   icon: Handshake,       roles: ['admin', 'manager', 'employee'] },
  { id: 'erp',        label: 'ERP',                   icon: Package,         roles: ['admin', 'manager', 'employee'] },
  { id: 'finance',    label: 'Finance',               icon: DollarSign,      roles: ['admin', 'manager'] },
  { id: 'projects',   label: 'Project Management',    icon: FolderKanban,    roles: ['admin', 'manager', 'employee'] },
  { id: 'ai',         label: 'AI Copilot',            icon: Bot,             roles: ['admin', 'manager', 'employee'] },
  { id: 'analytics',  label: 'Analytics',             icon: BarChart3,       roles: ['admin', 'manager', 'employee'] },
  { id: 'workflow',   label: 'Workflow Automation',   icon: Workflow,        roles: ['admin', 'manager'] },
]

const titles = {
  overview:  { title: 'Enterprise Overview',       subtitle: 'Real-time view of your organization' },
  hrms:      { title: 'Human Resources',           subtitle: 'People, teams, and employee operations' },
  crm:       { title: 'Customer Relationships',    subtitle: 'Pipeline and revenue opportunities' },
  erp:       { title: 'Inventory Operations',      subtitle: 'Stock levels and reorder tracking' },
  finance:   { title: 'Finance',                   subtitle: 'Transactions, revenue, and expenses' },
  projects:  { title: 'Project Management',        subtitle: 'Delivery progress across active work' },
  ai:        { title: 'AI Copilot',                subtitle: 'Ask questions across your live workspace' },
  analytics: { title: 'Analytics Engine',          subtitle: 'Aggregated performance across modules' },
  workflow:  { title: 'Workflow Automation',        subtitle: 'Automate repeatable business operations' },
}

async function api(path, options = {}) {
  const token = localStorage.getItem('nexus_token')
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }
  return response.json()
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(
    () => localStorage.getItem('nexus_theme') || 'light'
  )
  const [active, setActive] = useState('overview')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('nexus_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!localStorage.getItem('nexus_token')) {
      setLoading(false)
      return
    }
    api('/api/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('nexus_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spin" size={20} /> Loading workspace
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  const visibleNav = navItems.filter(item => item.roles.includes(user.role))

  const logout = () => {
    localStorage.removeItem('nexus_token')
    setUser(null)
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        user={user}
        items={visibleNav}
        onLogout={logout}
      />
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark">N</div>
            <span>Nexus OS</span>
          </div>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{titles[active].title}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search">
              <Search size={16} />
            </button>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={16} />
              <span className="notification-dot" />
            </button>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <div className="avatar">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>{titles[active].title}</h1>
              <p>{titles[active].subtitle}</p>
            </div>
            <div className="heading-status">
              <span className="live-dot" /> Live data{' '}
              <span className="mono">{user.role}</span>
            </div>
          </div>
          <ModuleView module={active} user={user} />
        </div>
      </main>
    </div>
  )
}

function Login({ onLogin }) {
  const [accounts, setAccounts] = useState([])
  const [email, setEmail] = useState('admin@demo.com')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/api/auth/demo-accounts').then(setAccounts).catch(() => setAccounts([]))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('nexus_token', result.access_token)
      onLogin(result.user)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-lockup">
          <div className="brand-mark large">N</div>
          <div>
            <strong>Nexus</strong>
            <span>Enterprise OS</span>
          </div>
        </div>
        <div className="login-copy">
          <h1>Welcome back</h1>
          <p>Sign in to your operations workspace</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && (
            <div className="error-banner">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <button className="btn-primary full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={15} />
          </button>
        </form>
        <div className="demo-box">
          <div className="eyebrow">Demo workspace accounts</div>
          {accounts.map(account => (
            <button key={account.email} onClick={() => setEmail(account.email)}>
              <span>{account.email}</span>
              <span className="badge badge-blue">{account.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Sidebar({ active, setActive, user, items, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup sidebar-brand">
        <div className="brand-mark">N</div>
        <div>
          <strong>Nexus</strong>
          <span>Enterprise OS</span>
        </div>
      </div>
      <div className="workspace-switcher">
        <div className="workspace-icon">A</div>
        <div>
          <strong>Acme Corporation</strong>
          <span>Enterprise workspace</span>
        </div>
        <ChevronRight size={14} />
      </div>
      <nav className="sidebar-nav">
        <div className="eyebrow nav-label">Workspace</div>
        {items.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
            {item.id === 'ai' && <span className="new-pill">AI</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-item">
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <div className="user-card">
          <div className="avatar">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button onClick={onLogout} aria-label="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function ModuleView({ module, user }) {
  if (module === 'overview') return <Overview />
  if (module === 'ai') return <Copilot />
  if (module === 'analytics') return <Analytics />

  const config = {
    hrms: {
      endpoint: '/api/hrms/employees',
      title: 'Employee Directory',
      fields: ['name', 'role', 'department', 'status', 'location', 'joined_date'],
      columns: [
        { key: 'name',       label: 'Name' },
        { key: 'role',       label: 'Role' },
        { key: 'department', label: 'Department' },
        { key: 'location',   label: 'Location' },
        { key: 'status',     label: 'Status' },
      ],
    },
    crm: {
      endpoint: '/api/crm/deals',
      title: 'CRM Pipeline',
      fields: ['company', 'contact', 'value', 'stage', 'probability', 'owner'],
      columns: [
        { key: 'company', label: 'Company' },
        { key: 'contact', label: 'Contact' },
        { key: 'value',   label: 'Value' },
        { key: 'stage',   label: 'Stage' },
        { key: 'owner',   label: 'Owner' },
      ],
    },
    erp: {
      endpoint: '/api/erp/inventory',
      title: 'Inventory',
      fields: ['sku', 'name', 'category', 'stock', 'reorder_threshold', 'price', 'supplier'],
      columns: [
        { key: 'sku',      label: 'SKU' },
        { key: 'name',     label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'stock',    label: 'Stock' },
        { key: 'price',    label: 'Price' },
        { key: 'supplier', label: 'Supplier' },
      ],
    },
    finance: {
      endpoint: '/api/finance/transactions',
      title: 'Transactions Ledger',
      fields: ['description', 'category', 'amount', 'date', 'status'],
      columns: [
        { key: 'description', label: 'Description' },
        { key: 'category',    label: 'Category' },
        { key: 'amount',      label: 'Amount' },
        { key: 'date',        label: 'Date' },
        { key: 'status',      label: 'Status' },
      ],
    },
    projects: {
      endpoint: '/api/projects',
      title: 'Project Portfolio',
      fields: ['name', 'team_size', 'progress', 'status', 'due_date', 'tasks_done', 'tasks_total'],
      columns: [
        { key: 'name',      label: 'Project' },
        { key: 'team_size', label: 'Team' },
        { key: 'progress',  label: 'Progress' },
        { key: 'status',    label: 'Status' },
        { key: 'due_date',  label: 'Due date' },
      ],
    },
    workflow: {
      endpoint: '/api/workflow',
      title: 'Automation Rules',
      fields: ['name', 'trigger', 'run_count', 'success_rate', 'is_active'],
      columns: [
        { key: 'name',         label: 'Workflow' },
        { key: 'trigger',      label: 'Trigger' },
        { key: 'run_count',    label: 'Runs' },
        { key: 'success_rate', label: 'Success' },
        { key: 'is_active',    label: 'Active' },
      ],
    },
  }

  return <DataModule config={config[module]} role={user.role} module={module} />
}

function Overview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api('/api/overview').then(setData).catch(() => {})
  }, [])

  if (!data) return <LoadingPanel />

  const stats = [
    { label: 'Total Revenue',     value: formatMoney(data.stats.revenue),           change: '+12.8%', color: '#6366f1', icon: CircleDollarSign },
    { label: 'Active Employees',  value: data.stats.active_employees.toLocaleString(), change: '+8.2%', color: '#10b981', icon: Users },
    { label: 'Open Deals',        value: data.stats.open_deals,                    change: '+4.6%', color: '#f59e0b', icon: Target },
    { label: 'Active Projects',   value: data.stats.projects,                      change: '+2.4%', color: '#ef4444', icon: FolderKanban },
  ]

  const pipelineColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']

  return (
    <div className="module-stack">
      <div className="stat-grid">
        {stats.map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="chart-grid">
        {/* Revenue vs Expenses chart */}
        <div className="card chart-card">
          <SectionHeader
            title="Revenue vs Expenses"
            subtitle="Last 7 months"
            action={
              <button className="btn-ghost compact">
                View report <ChevronRight size={13} />
              </button>
            }
          />
          <div className="chart-key">
            <span><i className="key-dot indigo" />Revenue</span>
            <span><i className="key-dot green" />Expenses</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.revenue_series}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={v => `$${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={value => formatMoney(value)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#revenue)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#10b981"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* CRM Pipeline chart */}
        <div className="card chart-card pipeline-card">
          <SectionHeader
            title="CRM Pipeline"
            subtitle="Deal value by stage"
            action={
              <button className="icon-button">
                <MoreHorizontal size={16} />
              </button>
            }
          />
          <div className="pipeline-content">
            <ResponsiveContainer width="48%" height={160}>
              <PieChart>
                <Pie
                  data={data.pipeline}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={64}
                  strokeWidth={0}
                >
                  {data.pipeline.map((_, index) => (
                    <Cell key={index} fill={pipelineColors[index % pipelineColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pipeline-list">
              {data.pipeline.map((item, index) => (
                <div className="pipeline-row" key={item.name}>
                  <span>
                    <i
                      className="key-dot"
                      style={{ background: pipelineColors[index % pipelineColors.length] }}
                    />
                    {item.name}
                  </span>
                  <strong>{formatMoney(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card activity-card">
        <SectionHeader title="Recent Activity" subtitle="Across all modules" />
        <div className="activity-list">
          {data.activity.map((item, index) => (
            <div className="activity-row" key={`${item.module}-${index}`}>
              <div className={`activity-icon ${item.tone}`}>
                <Activity size={14} />
              </div>
              <span className="activity-text">{item.text}</span>
              <span className="badge badge-blue">{item.module}</span>
              <span className="activity-time">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DataModule({ config, role, module }) {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const canWrite = role === 'admin' || (role === 'manager' && !['finance'].includes(module))

  const load = () => {
    api(config.endpoint)
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
  }, [config.endpoint])

  const filtered = useMemo(
    () =>
      rows.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      ),
    [rows, search]
  )

  const save = async (payload) => {
    try {
      if (editing?.id) {
        await api(`${config.endpoint}/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await api(config.endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      setEditing(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this record?')) return
    try {
      await api(`${config.endpoint}/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="module-stack">
      {/* Toolbar */}
      <div className="module-toolbar">
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${config.title.toLowerCase()}…`}
          />
        </div>
        <div className="toolbar-actions">
          <button className="btn-ghost">
            <RefreshCw size={13} /> Refresh
          </button>
          {canWrite && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus size={14} /> Add record
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card table-card">
        <SectionHeader title={config.title} subtitle={`${filtered.length} records`} />
        <div className="table-scroll">
          {/* Header row */}
          <div className="data-table table-head">
            {config.columns.map(column => (
              <span key={column.key}>{column.label}</span>
            ))}
            <span />
          </div>
          {/* Data rows */}
          {filtered.map(row => (
            <div className="data-table table-row" key={row.id}>
              {config.columns.map(column => (
                <span key={column.key}>{renderCell(row, column.key)}</span>
              ))}
              <div className="row-actions">
                <button
                  className="icon-button small"
                  onClick={() => setEditing(row)}
                >
                  <Edit2 size={13} />
                </button>
                {canWrite && (
                  <button
                    className="icon-button small danger"
                    onClick={() => remove(row.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!filtered.length && <EmptyState />}
      </div>

      {editing && (
        <RecordModal
          config={config}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {error && (
        <div className="error-banner inline">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function renderCell(row, key) {
  const value = row[key]

  if (key === 'value' || key === 'amount' || key === 'price') {
    return (
      <strong className={Number(value) < 0 ? 'negative' : ''}>
        {formatMoney(Number(value))}
      </strong>
    )
  }

  if (key === 'progress') {
    return (
      <div className="progress-cell">
        <span>{value}%</span>
        <div className="progress-track">
          <i style={{ width: `${value}%` }} />
        </div>
      </div>
    )
  }

  if (key === 'success_rate') return `${value}%`

  if (key === 'is_active') {
    return (
      <span className={`status-toggle ${value ? 'on' : ''}`}>
        <i />
      </span>
    )
  }

  if (key === 'status' || key === 'stage') {
    const isGreen =
      String(value).includes('active') ||
      String(value).includes('Won') ||
      value === 'on-track' ||
      value === 'cleared'
    const isAmber =
      value === 'delayed' || value === 'leave' || value === 'pending'
    const badgeClass = isGreen ? 'badge-green' : isAmber ? 'badge-amber' : 'badge-blue'
    return (
      <span className={`badge ${badgeClass}`}>
        {String(value).replace('-', ' ')}
      </span>
    )
  }

  return <span>{String(value ?? '—')}</span>
}

function RecordModal({ config, initial, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      config.fields.map(field => [
        field,
        initial[field] ?? (field === 'is_active' ? true : ''),
      ])
    )
  )

  const numericFields = [
    'value', 'probability', 'team_size', 'progress',
    'tasks_done', 'tasks_total', 'stock', 'reorder_threshold',
    'price', 'run_count', 'success_rate',
  ]

  const update = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: numericFields.includes(key) ? Number(value) : value,
    }))
  }

  const selectOptions = {
    status:    ['active', 'remote', 'leave'],
    stage:     ['Prospecting', 'Qualified', 'Proposal'],
    is_active: ['true', 'false'],
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div className="eyebrow">Workspace record</div>
            <h2>{initial.id ? 'Edit record' : 'Add record'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="form-grid">
          {config.fields.map(field => (
            <label key={field}>
              {field.replaceAll('_', ' ')}
              {selectOptions[field] ? (
                <select
                  value={form[field]}
                  onChange={e => update(field, e.target.value)}
                >
                  {selectOptions[field].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={form[field]}
                  onChange={e => update(field, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

function Copilot() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)

  const ask = async (event) => {
    event?.preventDefault()
    if (!question.trim()) return
    const current = question.trim()
    setQuestion('')
    setMessages(items => [...items, { role: 'user', text: current }])
    setBusy(true)
    try {
      const result = await api('/api/copilot/ask', {
        method: 'POST',
        body: JSON.stringify({ question: current }),
      })
      setMessages(items => [...items, { role: 'assistant', text: result.response }])
    } catch (e) {
      setMessages(items => [...items, { role: 'assistant', text: e.message }])
    } finally {
      setBusy(false)
    }
  }

  const quickActions = [
    "Summarize today's pipeline",
    'Show active project risks',
    'How many employees are active?',
  ]

  return (
    <div className="copilot-layout">
      <div className="card chat-card">
        <div className="chat-header">
          <div className="copilot-mark">
            <Sparkles size={16} />
          </div>
          <div>
            <strong>Nexus Copilot</strong>
            <span>Connected to live workspace data</span>
          </div>
          <span className="live-pill"><i /> Online</span>
        </div>

        <div className="chat-messages">
          {!messages.length && (
            <div className="chat-empty">
              <div className="copilot-mark large">
                <Sparkles size={20} />
              </div>
              <h2>How can I help today?</h2>
              <p>Ask about revenue, pipeline, people, inventory, or project delivery.</p>
              <div className="quick-actions">
                {quickActions.map(item => (
                  <button key={item} onClick={() => setQuestion(item)}>
                    {item}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={index}>
              <span>{message.text}</span>
            </div>
          ))}
          {busy && (
            <div className="typing">
              <i /><i /><i />
            </div>
          )}
        </div>

        <form className="chat-input" onSubmit={ask}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything about your workspace…"
          />
          <button className="btn-primary" disabled={busy}>
            <Send size={15} />
          </button>
        </form>
      </div>

      <div className="card copilot-side">
        <SectionHeader title="Data sources" subtitle="Live connections" />
        {['HRMS', 'CRM', 'ERP', 'Finance', 'Projects'].map(item => (
          <div className="source-row" key={item}>
            <span className="source-check">
              <CheckCircle2 size={13} />
            </span>
            {item}
            <span>Connected</span>
          </div>
        ))}
        <div className="copilot-note">
          <Zap size={15} />
          <p>Responses are grounded in the records currently saved in your workspace.</p>
        </div>
      </div>
    </div>
  )
}

function Analytics() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api('/api/analytics').then(setData).catch(() => {})
  }, [])

  if (!data) return <LoadingPanel />

  const projectColors = ['#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="chart-grid analytics-grid">
      {/* Employees by Department */}
      <div className="card chart-card">
        <SectionHeader
          title="Employees by Department"
          subtitle="Current headcount distribution"
        />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.employees_by_department}>
            <CartesianGrid vertical={false} stroke="var(--border-soft)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            />
            <Bar dataKey="value" fill="#6366f1" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project Status */}
      <div className="card chart-card">
        <SectionHeader title="Project Status" subtitle="Portfolio health" />
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data.project_status}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={94}
              strokeWidth={0}
            >
              {data.project_status.map((_, index) => (
                <Cell key={index} fill={projectColors[index % projectColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="stat-grid analytics-stats">
        <StatCard
          label="Inventory value"
          value={formatMoney(data.inventory_value)}
          change="Live"
          color="#6366f1"
          icon={Database}
        />
        <StatCard
          label="Pipeline value"
          value={formatMoney(data.deal_value)}
          change="Live"
          color="#10b981"
          icon={TrendingUp}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, change, color, icon: Icon }) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon" style={{ color, background: `${color}16` }}>
          <Icon size={16} />
        </div>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-change">
        <ArrowUpRight size={12} /> {change} <span>vs last period</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <FileText size={20} />
      <span>No records match your search.</span>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="card loading-panel">
      <RefreshCw className="spin" size={18} /> Loading live data…
    </div>
  )
}

export default App

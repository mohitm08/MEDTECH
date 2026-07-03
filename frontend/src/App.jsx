import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  FolderHeart, 
  FilePlus2, 
  LayoutDashboard, 
  Heart, 
  CheckCircle, 
  AlertCircle, 
  Clock3 
} from 'lucide-react';
import PrescriptionScanner from './components/PrescriptionScanner';
import PrescriptionReview from './components/PrescriptionReview';
import MedicationTimeline from './components/MedicationTimeline';
import ReminderSystem from './components/ReminderSystem';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scanResult, setScanResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ total: 0, taken: 0, missed: 0, pending: 0 });
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auth States
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch statistics and history list
  const fetchDashboardStats = async () => {
    if (!token) return;
    try {
      const statsRes = await fetch('http://localhost:5000/api/reminders/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const rxRes = await fetch('http://localhost:5000/api/prescriptions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (rxRes.ok) {
        const rxData = await rxRes.json();
        setPrescriptions(rxData);
        setPrescriptionCount(rxData.length);
      }
    } catch (err) {
      console.error('Error fetching dashboard dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [refreshKey, activeTab, token]);

  const handleScanComplete = (result) => {
    setScanResult(result);
  };

  const handleSaveComplete = () => {
    setScanResult(null);
    setRefreshKey(prev => prev + 1);
    setActiveTab('dashboard');
  };

  const handleCancelScan = () => {
    setScanResult(null);
  };

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin 
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword };

    try {
      const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setStats({ total: 0, taken: 0, missed: 0, pending: 0 });
    setPrescriptions([]);
    setPrescriptionCount(0);
  };

  if (!token) {
    return (
      <div className="auth-container animate-fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Activity size={32} />
            </div>
            <h2>MEDTECH AI</h2>
            <p>{isLogin ? 'Sign in to manage prescriptions & reminders' : 'Create an account to start tracking'}</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {authError && (
              <div className="auth-error">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button className="auth-toggle-btn" onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Background Alerts Polling */}
      <ReminderSystem onReminderTriggered={forceRefresh} token={token} />

      {/* Left Navigation Sidebar */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-icon">
            <Activity size={24} />
          </div>
          <span className="logo-text">MEDTECH AI</span>
        </div>

        <nav style={{ flexGrow: 1 }}>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={20} />
                Dashboard
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'scan' ? 'active' : ''}`}
                onClick={() => setActiveTab('scan')}
              >
                <FilePlus2 size={20} />
                Scan Prescription
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <FolderHeart size={20} />
                Scans History
              </button>
            </li>
          </ul>
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ background: 'var(--primary-glow)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Heart size={18} />
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Active User'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button className="logout-button" style={{ width: '100%' }} onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        
        {/* Top Header Bar */}
        <header className="header-area">
          <div className="header-title">
            {activeTab === 'dashboard' && (
              <>
                <h1>Personal Adherence Dashboard</h1>
                <p>Welcome back! Check your medication schedules and log adherence.</p>
              </>
            )}
            {activeTab === 'scan' && (
              <>
                <h1>Prescription AI Scanner</h1>
                <p>Scan handwritten doctor receipts to automatically configure smart schedules.</p>
              </>
            )}
            {activeTab === 'history' && (
              <>
                <h1>Prescription Archives</h1>
                <p>Browse previously processed and digitized prescription records.</p>
              </>
            )}
          </div>

          <div className="current-time-badge">
            <Clock size={14} style={{ color: 'var(--primary)' }} />
            {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </div>
        </header>

        {/* Dashboard Statistics Row */}
        {activeTab === 'dashboard' && (
          <div className="stats-row">
            <div className="card stat-card">
              <div className="stat-icon primary">
                <Clock3 size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.total}</h3>
                <p>Doses Scheduled</p>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon accent">
                <CheckCircle size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.taken}</h3>
                <p>Doses Taken</p>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon danger">
                <AlertCircle size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.missed}</h3>
                <p>Doses Missed</p>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon warning">
                <FolderHeart size={24} />
              </div>
              <div className="stat-details">
                <h3>{prescriptionCount}</h3>
                <p>Scanned Prescriptions</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Tab 1: Dashboard Panel */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid">
              <div>
                <MedicationTimeline refreshKey={refreshKey} token={token} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card">
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Adherence System Status</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Make sure you enable notification access to trigger alerts even when you are browsing other tabs.
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setActiveTab('scan')}>
                    <FilePlus2 size={16} /> Scan New Prescription
                  </button>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Scanned Archives</h4>
                  {prescriptions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No prescriptions scanned yet.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {prescriptions.slice(0, 3).map((rx) => (
                        <li key={rx._id} style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 500 }}>{rx.patientName || 'Unnamed Patient'}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{rx.medicines?.length} medicines</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Scanner / Review Panel */}
          {activeTab === 'scan' && (
            !scanResult ? (
              <PrescriptionScanner onScanComplete={handleScanComplete} token={token} />
            ) : (
              <PrescriptionReview 
                scanResult={scanResult} 
                onSaveComplete={handleSaveComplete}
                onCancel={handleCancelScan}
                token={token}
              />
            )
          )}

          {/* Tab 3: History List Panel */}
          {activeTab === 'history' && (
            prescriptions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                <FolderHeart size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3>No scanned prescriptions</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Your uploaded prescription sheets will appear here once parsed.
                </p>
              </div>
            ) : (
              <div className="history-grid">
                {prescriptions.map((rx) => (
                  <div key={rx._id} className="card">
                    <div className="history-card-header">
                      <div>
                        <h4 style={{ fontSize: '1.15rem' }}>{rx.patientName || 'Unnamed Patient'}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Scanned on {new Date(rx.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <img 
                      src={`http://localhost:5000${rx.imageUrl}`} 
                      alt="Scanned prescription" 
                      className="history-image-thumb" 
                    />

                    <div className="history-meds-list">
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        Extracted Treatment Plan:
                      </div>
                      {rx.medicines.map((med, i) => (
                        <div key={i} className="history-med-item">
                          <span>{med.name} ({med.dosage})</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {med.timesPerDay}x/day for {med.daysCount} days
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </main>
    </div>
  );
}

export default App;

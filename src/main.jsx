import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import './styles.css';
import './app.css';

window.React = React;
window.ReactDOM = { createRoot, createPortal };
window.supabase = { createClient };
Object.assign(window, {
  useState: React.useState,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useReducer: React.useReducer,
  useRef: React.useRef,
  useCallback: React.useCallback,
});

async function loadLegacyModules() {
  await import('./i18n.js');
  await import('./data.js');
  await import('./supabase-config.js');
  const ExcelJSModule = await import('exceljs');
  window.ExcelJS = ExcelJSModule.default || ExcelJSModule;
  await import('./excel-storage.js');
  await import('./crypto-vault.js');
  await import('./supabase-storage.js');
  await import('../tweaks-panel.jsx');
  await import('./app-shared.jsx');
  await import('./app-shell.jsx');
  await import('./app-dashboard.jsx');
  await import('./app-transactions.jsx');
  await import('./app-accounts-budgets.jsx');
  await import('./app-goals.jsx');
  await import('./app-reports.jsx');
  await import('./app-settings.jsx');
}

await loadLegacyModules();

const { useState, useEffect, useMemo, useReducer, useRef } = React;

    // Reducer for app state
    function appReducer(state, action) {
      switch (action.type) {
        case 'SET_STATE':
          return {
            ...state,
            ...action.state,
          };
        case 'RESET_STATE':
          return action.state || window.FinTrackExcel.resetState();
        case 'ADD_TX': {
          const txs = [action.tx, ...state.transactions];
          let accounts = state.accounts;
          if (action.tx.type === 'income') {
            accounts = accounts.map((a) => a.id === action.tx.account ? { ...a, balance: a.balance + action.tx.amount } : a);
          } else if (action.tx.type === 'expense') {
            accounts = accounts.map((a) => a.id === action.tx.account ? { ...a, balance: a.balance - action.tx.amount } : a);
          } else if (action.tx.type === 'transfer') {
            accounts = accounts.map((a) => {
              if (a.id === action.tx.account) return { ...a, balance: a.balance - action.tx.amount };
              if (a.id === action.tx.toAccount) return { ...a, balance: a.balance + action.tx.amount };
              return a;
            });
          }
          return { ...state, transactions: txs, accounts };
        }
        case 'DEL_TX': {
          const tx = state.transactions.find((x) => x.id === action.id);
          if (!tx) return state;
          let accounts = state.accounts;
          if (tx.type === 'income') {
            accounts = accounts.map((a) => a.id === tx.account ? { ...a, balance: a.balance - tx.amount } : a);
          } else if (tx.type === 'expense') {
            accounts = accounts.map((a) => a.id === tx.account ? { ...a, balance: a.balance + tx.amount } : a);
          } else if (tx.type === 'transfer') {
            accounts = accounts.map((a) => {
              if (a.id === tx.account) return { ...a, balance: a.balance + tx.amount };
              if (a.id === tx.toAccount) return { ...a, balance: a.balance - tx.amount };
              return a;
            });
          }
          return { ...state, transactions: state.transactions.filter((x) => x.id !== action.id), accounts };
        }
        case 'ADD_ACCOUNT':
          return { ...state, accounts: [...state.accounts, action.account] };
        case 'DEL_ACCOUNT': {
          const txs = state.transactions.filter(
            (tx) => tx.account !== action.id && tx.toAccount !== action.id
          );
          const accounts = state.accounts.filter((a) => a.id !== action.id);
          return { ...state, accounts, transactions: txs };
        }
        case 'ADD_BUDGET':
          return { ...state, budgets: [...state.budgets, action.budget] };
        case 'DEL_BUDGET':
          return { ...state, budgets: state.budgets.filter((b) => b.id !== action.id) };
        case 'ADD_CATEGORY':
          return { ...state, categories: [...state.categories, action.category] };
        case 'ADD_GOAL':
          return { ...state, goals: [...state.goals, action.goal] };
        case 'DEL_GOAL':
          return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
        case 'CONTRIBUTE_GOAL': {
          // bump saved amount, mark milestones, deduct from source account
          const goals = state.goals.map((g) => {
            if (g.id !== action.goalId) return g;
            const newSaved = g.saved + action.amount;
            const newMilestones = g.milestones.map((m) => ({
              ...m,
              hit: m.hit || (newSaved / g.target) * 100 >= m.pct,
            }));
            return { ...g, saved: newSaved, milestones: newMilestones };
          });
          const accounts = state.accounts.map((a) =>
            a.id === action.fromAccount ? { ...a, balance: a.balance - action.amount } : a
          );
          // also log as transfer transaction for audit trail
          const goal = state.goals.find((g) => g.id === action.goalId);
          const tx = {
            id: 't' + Date.now(),
            type: 'transfer',
            amount: action.amount,
            category: 'transfer',
            account: action.fromAccount,
            toAccount: null,
            date: new Date().toISOString(),
            description: (goal ? `Setoran tujuan: ${goal.name}` : 'Setoran tujuan'),
            tags: ['goal'],
          };
          return { ...state, goals, accounts, transactions: [tx, ...state.transactions] };
        }
        default:
          return state;
      }
    }

    // Tweak defaults
    const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      "dark": false,
      "density": "compact",
      "sidebar": "full",
      "chartStyle": "area",
      "accent": "#EC4899"
    }/*EDITMODE-END*/;

    function emptyPrivateState() {
      return {
        transactions: [],
        accounts: [],
        categories: JSON.parse(JSON.stringify(window.FT_DATA.categories || [])),
        budgets: [],
        upcoming: [],
        goals: [],
      };
    }

    function profileInitials(name, email) {
      const source = String(name || email?.split('@')?.[0] || 'FinTrack User').trim();
      return source
        .split(/[\s._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'FT';
    }

    function applySessionProfile(session) {
      if (!session?.user?.email) return null;
      const email = session.user.email;
      const handle = email.split('@')[0] || 'user';
      const pretty = handle
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'FinTrack User';
      window.FT_DATA.user = {
        ...(window.FT_DATA.user || {}),
        name: pretty,
        handle,
        email,
        avatar: window.FT_DATA.user?.avatar || profileInitials(pretty, email),
        joined: session.user.created_at || window.FT_DATA.user?.joined || new Date().toISOString(),
      };
      return window.FT_DATA.user;
    }

    function readProfileSettings(settingsKey, fallbackProfile) {
      try {
        const stored = JSON.parse(localStorage.getItem(settingsKey) || 'null');
        if (stored) return stored;
      } catch (_) {}

      if (settingsKey !== 'ft_settings') {
        try {
          const legacy = JSON.parse(localStorage.getItem('ft_settings') || 'null');
          if (legacy?.email && legacy.email === fallbackProfile?.email) return legacy;
        } catch (_) {}
      }
      return null;
    }

    // App root
    function App() {
      // app state (reducer-managed; seeded from FT_DATA)
      const [state, dispatch] = useReducer(appReducer, null, () => ({
        ...window.FinTrackExcel.getState(),
      }));

      // tweaks
      const [tw, setTw] = useTweaks(TWEAK_DEFAULTS);

      // language (persisted)
      const [lang, setLang] = useState(() => localStorage.getItem('ft_lang') || 'id');
      useEffect(() => {
        localStorage.setItem('ft_lang', lang);
        document.documentElement.lang = lang;
      }, [lang]);
      const t = useI18n(lang);
      const supabaseMode = !!window.FinTrackSupabase?.isEnabled?.();
      const [session, setSession] = useState(null);
      const [authReady, setAuthReady] = useState(!supabaseMode);
      const [recoveryMode, setRecoveryMode] = useState(false);
      const [vaultStatus, setVaultStatus] = useState(supabaseMode ? 'checking' : 'unlocked');
      const [vaultRecoveryCode, setVaultRecoveryCode] = useState('');
      const [profile, setProfile] = useState(() => ({ ...(window.FT_DATA.user || {}) }));
      const profileSettingsKey = supabaseMode && session?.user?.id ? `ft_settings_${session.user.id}` : 'ft_settings';

      // root settings state (synchronised across views)
      const [settings, setSettings] = useState(() => {
        if (window.loadSettings) {
          return window.loadSettings(profileSettingsKey, window.FT_DATA.user || {});
        }
        return {};
      });

      const handleSetTw = (key, value) => {
        setTw(key, value);
        if (key === 'dark' || key === 'density') {
          const sKey = key === 'dark' ? 'theme' : 'density';
          const sVal = key === 'dark' ? (value ? 'dark' : 'light') : value;
          setSettings((prev) => {
            const next = { ...prev, [sKey]: sVal };
            localStorage.setItem(profileSettingsKey, JSON.stringify(next));
            return next;
          });
        }
      };

      const handleSetLang = (newLang) => {
        setLang(newLang);
        setSettings((prev) => {
          const next = { ...prev, lang: newLang };
          localStorage.setItem(profileSettingsKey, JSON.stringify(next));
          return next;
        });
      };

      const handleSettingsChange = (nextSettings) => {
        setSettings(nextSettings);
        localStorage.setItem(profileSettingsKey, JSON.stringify(nextSettings));
      };

      const handleUpdateSetting = (key, value) => {
        setSettings((prev) => {
          const next = { ...prev, [key]: value };
          localStorage.setItem(profileSettingsKey, JSON.stringify(next));
          return next;
        });
      };
      const syncProfile = (nextProfile = {}) => {
        const merged = {
          ...(window.FT_DATA.user || {}),
          ...nextProfile,
        };
        merged.avatar = nextProfile.avatar || merged.avatar || profileInitials(merged.name, merged.email);
        window.FT_DATA.user = merged;
        setProfile({ ...merged });
      };

      // Auth and onboarding
      const params = new URLSearchParams(location.search);
      const forceOnboard = params.get('onboard') === '1';
      // For demo purposes default to logged-in unless they explicitly land
      // on the onboarding entry point (or have logged out previously).
      const [authed, setAuthed] = useState(() => {
        if (forceOnboard) return false;
        const stored = localStorage.getItem('ft_authed');
        if (stored === '0') return false;
        return true;
      });
      useEffect(() => {
        if (authed) localStorage.setItem('ft_authed', '1');
      }, [authed]);
      useEffect(() => {
        if (!supabaseMode) return;
        let alive = true;
        window.FinTrackSupabase.getSession()
          .then((activeSession) => {
            if (!alive) return;
            const nextProfile = applySessionProfile(activeSession);
            if (nextProfile) setProfile({ ...nextProfile });
            setSession(activeSession);
            setAuthReady(true);
            setVaultStatus(activeSession ? 'checking' : 'signed-out');
          })
          .catch((err) => {
            console.error(err);
            if (alive) setAuthReady(true);
          });
        return window.FinTrackSupabase.onAuthStateChange((event, activeSession) => {
          const nextProfile = applySessionProfile(activeSession);
          if (nextProfile) setProfile({ ...nextProfile });
          setSession(activeSession);
          setAuthReady(true);
          if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
          if (event === 'SIGNED_OUT') {
            setVaultStatus('signed-out');
            setVaultRecoveryCode('');
          }
        });
      }, [supabaseMode]);

      useEffect(() => {
        const storedProfile = readProfileSettings(profileSettingsKey, window.FT_DATA.user || {});
        syncProfile(storedProfile || {});

        if (window.loadSettings) {
          const s = window.loadSettings(profileSettingsKey, storedProfile || window.FT_DATA.user || {});
          setSettings(s);
          if (s) {
            if (s.lang && s.lang !== lang) {
              setLang(s.lang);
            }
            if (s.theme !== undefined) {
              const isDark = s.theme === 'dark';
              if (tw.dark !== isDark) {
                setTw('dark', isDark);
              }
            }
            if (s.density && s.density !== tw.density) {
              setTw('density', s.density);
            }
          }
        }
      }, [profileSettingsKey]);

      useEffect(() => {
        if (state?.categories) {
          window.FT_DATA.categories = state.categories;
        }
      }, [state?.categories]);

      // route
      const [route, setRoute] = useState(() => localStorage.getItem('ft_route') || 'dashboard');
      useEffect(() => { localStorage.setItem('ft_route', route); }, [route]);

      useEffect(() => {
        if (!supabaseMode) {
          window.FinTrackExcel.saveState(state);
          return;
        }
        if (session && vaultStatus === 'unlocked') {
          window.FinTrackSupabase.saveState(state);
        }
      }, [state, supabaseMode, session?.user?.id, vaultStatus]);
      useEffect(() => {
        if (!supabaseMode || !session) return;
        let alive = true;
        setVaultStatus('checking');
        setVaultRecoveryCode('');
        window.FinTrackSupabase.hasVault()
          .then((exists) => {
            if (!alive) return;
            setVaultStatus(exists ? 'locked' : 'new');
          })
          .catch((err) => {
            console.error(err);
            if (!alive) return;
            setVaultStatus('locked');
            ToastBus.push(lang === 'id' ? 'Gagal mengecek vault Supabase' : 'Failed to check Supabase vault');
          });
        return () => { alive = false; };
      }, [supabaseMode, session?.user?.id]);

      const [search, setSearch] = useState('');

      // QuickAdd modal
      const [qaOpen, setQaOpen] = useState(false);
      const [qaInitialType, setQaInitialType] = useState('expense');

      const openAdd = (type) => { setQaInitialType(type); setQaOpen(true); };
      const onSave = (tx) => {
        dispatch({ type: 'ADD_TX', tx });
        ToastBus.push(t('transactions.txAdded'));
      };

      const onExportExcel = async (fileName) => {
        try {
          await window.FinTrackExcel.exportWorkbook(state, { fileName });
          ToastBus.push(lang === 'id' ? 'File Excel data pribadi dibuat' : 'Private Excel file created');
        } catch (err) {
          if (err && err.name === 'AbortError') return;
          ToastBus.push(lang === 'id' ? 'Export Excel gagal' : 'Excel export failed');
          console.error(err);
        }
      };

      const onExportCsv = () => {
        try {
          window.FinTrackExcel.exportTransactionsCsv(state);
          ToastBus.push(lang === 'id' ? 'CSV transaksi dibuat' : 'Transactions CSV created');
        } catch (err) {
          ToastBus.push(lang === 'id' ? 'Export CSV gagal' : 'CSV export failed');
          console.error(err);
        }
      };

      const onImportExcel = async () => {
        try {
          const imported = await window.FinTrackExcel.requestImport();
          dispatch({ type: 'SET_STATE', state: imported });
          ToastBus.push(lang === 'id' ? 'Data Excel berhasil dimuat' : 'Excel data imported');
        } catch (err) {
          if (err && err.message !== 'No file selected') {
            ToastBus.push(lang === 'id' ? 'Import Excel gagal' : 'Excel import failed');
            console.error(err);
          }
        }
      };

      const onResetPrivateData = () => {
        dispatch({ type: 'RESET_STATE', state: supabaseMode ? emptyPrivateState() : undefined });
      };

      const createVault = async (vaultPassword) => {
        const seed = emptyPrivateState();
        const result = await window.FinTrackSupabase.createVault(vaultPassword, seed);
        dispatch({ type: 'SET_STATE', state: result.state });
        setVaultRecoveryCode(result.recoveryCode);
        setVaultStatus('recovery');
        ToastBus.push(lang === 'id' ? 'Vault terenkripsi dibuat' : 'Encrypted vault created');
      };

      const unlockVault = async (vaultPassword) => {
        const loaded = await window.FinTrackSupabase.unlockVault(vaultPassword, emptyPrivateState());
        dispatch({ type: 'SET_STATE', state: loaded });
        setVaultRecoveryCode('');
        setVaultStatus('unlocked');
        ToastBus.push(lang === 'id' ? 'Vault terbuka' : 'Vault unlocked');
      };

      const recoverVault = async (recoveryCode, newVaultPassword) => {
        const loaded = await window.FinTrackSupabase.recoverVault(recoveryCode, newVaultPassword, emptyPrivateState());
        dispatch({ type: 'SET_STATE', state: loaded });
        setVaultRecoveryCode('');
        setVaultStatus('unlocked');
        ToastBus.push(lang === 'id' ? 'Vault dipulihkan, password vault baru aktif' : 'Vault recovered, new vault password active');
      };

      const onLogout = async () => {
        if (supabaseMode) {
          await window.FinTrackSupabase.signOut();
          setSession(null);
          setVaultStatus('signed-out');
          setVaultRecoveryCode('');
          return;
        }
        localStorage.setItem('ft_authed', '0');
        setAuthed(false);
      };

      // Apply theme, density, and accent
      useEffect(() => {
        document.documentElement.setAttribute('data-theme', tw.dark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-density', tw.density);
        if (tw.accent && tw.accent !== '#2563EB') {
          document.documentElement.style.setProperty('--ft-action', tw.accent);
        } else {
          document.documentElement.style.removeProperty('--ft-action');
        }
      }, [tw.dark, tw.density, tw.accent]);

      if (!authReady) {
        return (
          <>
            <LoadingGate lang={lang} />
            <ToastHost />
          </>
        );
      }

      if (supabaseMode && recoveryMode) {
        return (
          <>
            <SupabaseAuth lang={lang} mode="recovery"
                          onDone={() => { setRecoveryMode(false); setVaultStatus('checking'); setRoute('dashboard'); }} />
            <ToastHost />
          </>
        );
      }

      if (supabaseMode && !session) {
        return (
          <>
            <SupabaseAuth lang={lang}
                          onDone={(activeSession) => { setSession(activeSession); setVaultStatus('checking'); setRoute('dashboard'); }} />
            <ToastHost />
          </>
        );
      }

      if (supabaseMode && vaultStatus === 'checking') {
        return (
          <>
            <LoadingGate lang={lang} label={lang === 'id' ? 'Mengecek vault terenkripsi...' : 'Checking encrypted vault...'} />
            <ToastHost />
          </>
        );
      }

      if (supabaseMode && vaultStatus !== 'unlocked') {
        return (
          <>
            <VaultGate lang={lang}
                       status={vaultStatus}
                       recoveryCode={vaultRecoveryCode}
                       onCreate={createVault}
                       onUnlock={unlockVault}
                       onRecover={recoverVault}
                       onContinue={() => { setVaultRecoveryCode(''); setVaultStatus('unlocked'); }}
                       onLogout={onLogout} />
            <ToastHost />
          </>
        );
      }

      // Onboarding
      if (!supabaseMode && !authed) {
        return (
          <>
            <Onboarding lang={lang} t={t}
                        initialMode={forceOnboard ? 'signup' : 'signin'}
                        onDone={() => { localStorage.setItem('ft_authed', '1'); setAuthed(true); setRoute('dashboard'); history.replaceState({}, '', 'app.html'); }} />
            <FinTrackTweaks tw={tw} setTw={setTw} lang={lang} />
            <ToastHost />
          </>
        );
      }

      // Route to page
      const titleMap = {
        dashboard: t('nav.dashboard'),
        transactions: t('nav.transactions'),
        accounts: t('nav.accounts'),
        budgets: t('nav.budgets'),
        goals: t('nav.goals'),
        reports: t('nav.reports'),
        settings: t('nav.settings'),
      };

      return (
        <>
          <div className="ft-app" data-sb={tw.sidebar}>
            <Sidebar route={route} setRoute={setRoute}
                     lang={lang} t={t}
                     onQuickAdd={() => openAdd('expense')}
                     sbMode={tw.sidebar}
                     setSbMode={(v) => setTw('sidebar', v)}
                     profile={profile} />

            <main className="ft-main">
              <Topbar title={titleMap[route] || 'FinTrack'}
                      search={search} setSearch={setSearch}
                      lang={lang} onToggleLang={() => handleSetLang(lang === 'id' ? 'en' : 'id')}
                      onLogout={onLogout}
                      state={state} onNavigate={setRoute}
                      t={t} />
              <div className="ft-page">
                {route === 'dashboard' && (
                  <Dashboard state={state} lang={lang} t={t}
                             chartStyle={tw.chartStyle}
                             onAddTx={openAdd}
                             onNavigate={setRoute} />
                )}
                {route === 'transactions' && (
                  <Transactions state={state} dispatch={dispatch}
                                lang={lang} t={t}
                                search={search}
                                onOpenAdd={openAdd} />
                )}
                {route === 'accounts' && (
                  <Accounts state={state} dispatch={dispatch} lang={lang} t={t} />
                )}
                {route === 'budgets' && (
                  <Budgets state={state} dispatch={dispatch} lang={lang} t={t} />
                )}
                {route === 'goals' && (
                  <Goals state={state} dispatch={dispatch} lang={lang} t={t} />
                )}
                {route === 'reports' && (
                  <Reports state={state} lang={lang} t={t} chartStyle={tw.chartStyle}
                           onExportExcel={onExportExcel}
                           onExportCsv={onExportCsv}
                           settings={settings}
                           onUpdateSetting={handleUpdateSetting} />
                )}
                {route === 'settings' && (
                  <Settings lang={lang} t={t}
                            state={state}
                            supabaseMode={supabaseMode}
                            profile={profile}
                            settingsKey={profileSettingsKey}
                            onProfileChange={syncProfile}
                            setLang={handleSetLang}
                            tw={tw} setTw={handleSetTw}
                            onLogout={onLogout}
                            onExportExcel={onExportExcel}
                            onImportExcel={onImportExcel}
                            onResetPrivateData={onResetPrivateData}
                            settings={settings}
                            onSettingsChange={handleSettingsChange} />
                )}
              </div>
            </main>
          </div>

          <MobileNav route={route} setRoute={setRoute} t={t}
                     onQuickAdd={() => openAdd('expense')} />

          <QuickAddTx open={qaOpen} onClose={() => setQaOpen(false)}
                      onSave={onSave} initialType={qaInitialType}
                      lang={lang} t={t}
                      accounts={state.accounts} categories={state.categories}
                      dispatch={dispatch} />

          <FinTrackTweaks tw={tw} setTw={setTw} lang={lang} />
          <ToastHost />
        </>
      );
    }

    // ComingSoon placeholder for goals, reports, and settings
    function LoadingGate({ lang, label }) {
      return (
        <div className="ob-wrap">
          <div className="ob-card ft-pop" style={{ maxWidth: 440 }}>
            <Logo size={38} />
            <div style={{ marginTop: 28, fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}>
              {label || (lang === 'id' ? 'Menyiapkan dashboard...' : 'Preparing dashboard...')}
            </div>
            <div style={{ marginTop: 12, height: 8, background: 'var(--ft-bg)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '46%', height: '100%', background: 'var(--ft-action)', borderRadius: 999 }} />
            </div>
          </div>
        </div>
      );
    }

    function AuthLeftPanel({ eyebrow, title, note }) {
      return (
        <div className="ob-left">
          <div className="ob-left-content">
            <div className="ob-left-brand"><Logo /></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="ft-pill" style={{ background: 'rgba(255,255,255,.15)', color: 'white', alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DFFB6E', display: 'inline-block', marginRight: 6 }} />
                {eyebrow}
              </div>
              <h1 className="ob-left-headline">{title}</h1>
              <p className="ob-left-sub">{note}</p>
            </div>
            <div className="ob-left-card">
              <div style={{ fontSize: 12, opacity: .8 }}>Total Saldo · Mock</div>
              <div style={{ fontFamily: 'var(--ft-font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>Rp 70.685.000</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <span className="ft-pill" style={{ background: 'rgba(223,251,110,.2)', color: '#DFFB6E', fontWeight: 600 }}>↗ +47jt</span>
                <span className="ft-pill" style={{ background: 'rgba(255,255,255,.12)', color: 'white', fontWeight: 600 }}>↘ −12jt</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function SupabaseAuth({ lang, mode = 'signin', onDone }) {
      const [authMode, setAuthMode] = useState(mode);
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [confirm, setConfirm] = useState('');
      const [remember, setRemember] = useState(true);
      const [busy, setBusy] = useState(false);
      const [notice, setNotice] = useState('');
      const [error, setError] = useState('');

      const clearMode = (next) => {
        setError('');
        setNotice('');
        setAuthMode(next);
      };

      const submit = async () => {
        setBusy(true);
        setError('');
        setNotice('');
        try {
          if (authMode === 'recovery') {
            if (!password || password.length < 8) throw new Error(lang === 'id' ? 'Password minimal 8 karakter' : 'Password must be at least 8 characters');
            if (password !== confirm) throw new Error(lang === 'id' ? 'Konfirmasi password tidak sama' : 'Password confirmation does not match');
            await window.FinTrackSupabase.updatePassword(password);
            ToastBus.push(lang === 'id' ? 'Password diperbarui' : 'Password updated');
            onDone && onDone();
            return;
          }
          if (authMode === 'reset') {
            if (!email) throw new Error(lang === 'id' ? 'Email wajib diisi' : 'Email is required');
            await window.FinTrackSupabase.sendPasswordReset(email);
            setNotice(lang === 'id' ? 'Link reset dikirim. Cek email kamu.' : 'Reset link sent. Check your email.');
            return;
          }
          if (!email) throw new Error(lang === 'id' ? 'Email wajib diisi' : 'Email is required');
          if (!password || password.length < 8) throw new Error(lang === 'id' ? 'Password minimal 8 karakter' : 'Password must be at least 8 characters');
          if (authMode === 'signup') {
            if (password !== confirm) throw new Error(lang === 'id' ? 'Konfirmasi password tidak sama' : 'Password confirmation does not match');
            const activeSession = await window.FinTrackSupabase.signUp(email, password);
            if (activeSession) {
              ToastBus.push(lang === 'id' ? 'Akun dibuat' : 'Account created');
              onDone && onDone(activeSession);
            } else {
              setNotice(lang === 'id' ? 'Akun dibuat. Cek email untuk token/link konfirmasi Supabase.' : 'Account created. Check your email for the Supabase confirmation token/link.');
            }
            return;
          }
          const activeSession = await window.FinTrackSupabase.signIn(email, password);
          ToastBus.push(lang === 'id' ? 'Login berhasil' : 'Signed in');
          onDone && onDone(activeSession);
        } catch (err) {
          setError(err.message || (lang === 'id' ? 'Gagal login' : 'Sign in failed'));
        } finally {
          setBusy(false);
        }
      };

      const title = authMode === 'recovery'
        ? (lang === 'id' ? 'Buat password baru' : 'Create new password')
        : authMode === 'reset'
          ? (lang === 'id' ? 'Reset password' : 'Reset password')
          : authMode === 'signup'
            ? (lang === 'id' ? 'Buat akun FinTrack' : 'Create a FinTrack account')
            : (lang === 'id' ? 'Masuk ke FinTrack' : 'Sign in to FinTrack');
      const subtitle = authMode === 'recovery'
        ? (lang === 'id' ? 'Token recovery dari email Supabase sudah aktif.' : 'Your Supabase recovery token is active.')
        : authMode === 'reset'
          ? (lang === 'id' ? 'Kami akan mengirim link reset password ke email akunmu.' : 'We will send a password reset link to your account email.')
          : authMode === 'signup'
            ? (lang === 'id' ? 'Buat akun dulu, lalu kunci data finansialmu dengan vault pribadi.' : 'Create your account, then lock finance data with a private vault.')
            : (lang === 'id' ? 'Senang melihatmu kembali.' : 'Good to see you again.');
      const leftTitle = authMode === 'signup'
        ? (lang === 'id' ? 'Mulai kelola uangmu dengan rapi' : 'Start managing your money cleanly')
        : authMode === 'reset' || authMode === 'recovery'
          ? (lang === 'id' ? 'Akunmu tetap aman' : 'Keep your account safe')
          : (lang === 'id' ? 'Senang melihatmu kembali' : 'Good to see you again');
      const leftNote = authMode === 'signup'
        ? (lang === 'id' ? 'Buat akun publik multi-user, lalu data keuangan tetap dikunci di vault terenkripsi.' : 'Create a public multi-user account while finance data stays locked in an encrypted vault.')
        : authMode === 'reset' || authMode === 'recovery'
          ? (lang === 'id' ? 'Reset hanya mengubah password akun. Isi vault tetap perlu password vault atau recovery code.' : 'Reset only changes the account password. Vault data still needs a vault password or recovery code.')
          : (lang === 'id' ? 'Masuk untuk lihat update keuanganmu hari ini.' : "Sign in to see today's finance updates.");

      const isCentered = authMode === 'reset' || authMode === 'recovery';
      return (
        <div className="ob-shell" data-centered={isCentered ? "true" : "false"}>
          {!isCentered && (
            <AuthLeftPanel
              eyebrow={authMode === 'signup' ? (lang === 'id' ? 'Selamat datang di FinTrack' : 'Welcome to FinTrack') : (lang === 'id' ? 'Masuk ke FinTrack' : 'Sign in to FinTrack')}
              title={leftTitle}
              note={leftNote}
            />
          )}
          <div className="ob-right">
            <div className="ob-form">
              {authMode === 'signup' && (
                <button className="ft-link" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}
                        onClick={() => clearMode('signin')}>
                  <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
                  {lang === 'id' ? 'Masuk' : 'Sign in'}
                </button>
              )}
              {authMode === 'reset' && (
                <button className="ft-link" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}
                        onClick={() => clearMode('signin')}>
                  <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
                  {lang === 'id' ? 'Kembali ke login' : 'Back to sign in'}
                </button>
              )}

              <h2 className="ob-form-title">{title}</h2>
              <p className="ob-form-sub">{subtitle}</p>

              {authMode !== 'recovery' && (
                <div className="ob-field-group">
                  <label className="ft-label">Email</label>
                  <input className="ft-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="andi@studiowiyono.id" autoFocus />
                </div>
              )}

              {authMode !== 'reset' && (
                <div className="ob-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label className="ft-label">Password</label>
                    {authMode === 'signin' && (
                      <button className="ft-link" style={{ fontSize: 12.5 }} type="button" onClick={() => clearMode('reset')}>
                        {lang === 'id' ? 'Lupa password?' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <input className="ft-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
                  {authMode === 'signup' && (
                    <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 6, fontWeight: 600 }}>
                      {lang === 'id' ? 'Minimal 8 karakter, dengan angka' : 'At least 8 characters with a number'}
                    </div>
                  )}
                </div>
              )}

              {(authMode === 'recovery' || authMode === 'signup') && (
                <div className="ob-field-group">
                  <label className="ft-label">{lang === 'id' ? 'Konfirmasi password' : 'Confirm password'}</label>
                  <input className="ft-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="********" />
                </div>
              )}

              {authMode === 'signin' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ft-text-2)', fontWeight: 600, marginTop: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--ft-action)' }} />
                  {lang === 'id' ? 'Ingat saya' : 'Remember me'}
                </label>
              )}

              {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--ft-danger-soft)', color: 'var(--ft-danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
              {notice && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--ft-success-soft)', color: 'var(--ft-success)', fontSize: 13, fontWeight: 600 }}>{notice}</div>}

              <button className="ft-btn" data-variant="primary" data-size="lg" style={{ width: '100%', marginTop: 24 }} disabled={busy} onClick={submit}>
                {busy
                  ? (lang === 'id' ? 'Memproses...' : 'Working...')
                  : authMode === 'reset'
                    ? (lang === 'id' ? 'Kirim link reset' : 'Send reset link')
                  : authMode === 'recovery'
                    ? (lang === 'id' ? 'Simpan password baru' : 'Save new password')
                    : authMode === 'signup'
                      ? (lang === 'id' ? 'Berikutnya' : 'Next')
                    : (lang === 'id' ? 'Masuk ke akunku' : 'Sign in to my account')}
                {authMode === 'signin' && <Icon name="arrowRight" size={16} />}
                {authMode === 'signup' && <Icon name="arrowRight" size={16} />}
                {authMode === 'reset' && <Icon name="arrowRight" size={16} />}
              </button>

              {authMode === 'signin' && (
                <div style={{ marginTop: 22, fontSize: 13.5, color: 'var(--ft-text-2)', textAlign: 'center' }}>
                  {lang === 'id' ? 'Belum punya akun?' : "Don't have an account?"}{' '}
                  <button className="ft-link" type="button" onClick={() => clearMode('signup')}>
                    {lang === 'id' ? 'Buat akun' : 'Create account'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    function VaultGate({ lang, status, recoveryCode, onCreate, onUnlock, onRecover, onContinue, onLogout }) {
      const [mode, setMode] = useState(status === 'new' ? 'create' : 'unlock');
      const [password, setPassword] = useState('');
      const [confirm, setConfirm] = useState('');
      const [savedRecovery, setSavedRecovery] = useState(false);
      const [recoveryInput, setRecoveryInput] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');

      useEffect(() => {
        setMode(status === 'new' ? 'create' : 'unlock');
      }, [status]);

      const submit = async () => {
        setBusy(true);
        setError('');
        try {
          if (mode === 'create') {
            if (!password || password.length < 8) throw new Error(lang === 'id' ? 'Password vault minimal 8 karakter' : 'Vault password must be at least 8 characters');
            if (password !== confirm) throw new Error(lang === 'id' ? 'Konfirmasi password vault tidak sama' : 'Vault password confirmation does not match');
            await onCreate(password);
            return;
          }
          if (mode === 'recover') {
            if (!recoveryInput) throw new Error(lang === 'id' ? 'Recovery code wajib diisi' : 'Recovery code is required');
            if (!newPassword || newPassword.length < 8) throw new Error(lang === 'id' ? 'Password vault baru minimal 8 karakter' : 'New vault password must be at least 8 characters');
            await onRecover(recoveryInput, newPassword);
            return;
          }
          if (!password) throw new Error(lang === 'id' ? 'Password vault wajib diisi' : 'Vault password is required');
          await onUnlock(password);
        } catch (err) {
          setError(err.message || (lang === 'id' ? 'Gagal membuka vault' : 'Failed to open vault'));
        } finally {
          setBusy(false);
        }
      };

      const copyRecovery = async () => {
        try {
          await navigator.clipboard.writeText(recoveryCode);
          ToastBus.push(lang === 'id' ? 'Recovery code disalin' : 'Recovery code copied');
        } catch (_) {
          ToastBus.push(lang === 'id' ? 'Salin manual recovery code ini' : 'Copy this recovery code manually');
        }
      };

      const leftEyebrow = lang === 'id' ? 'Private Vault' : 'Private Vault';
      const leftTitleText = recoveryCode
        ? (lang === 'id' ? 'Vault Berhasil Dibuat' : 'Vault Created Successfully')
        : mode === 'create'
          ? (lang === 'id' ? 'Buat vault data' : 'Create data vault')
          : mode === 'recover'
            ? (lang === 'id' ? 'Pulihkan vault' : 'Recover vault')
            : (lang === 'id' ? 'Buka vault data' : 'Unlock data vault');
      const leftNoteText = recoveryCode
        ? (lang === 'id' ? 'Simpan recovery code ini dengan aman. Code ini digunakan jika Anda lupa password vault.' : 'Save this recovery code safely. This code is used if you forget your vault password.')
        : (lang === 'id'
          ? 'Password akun hanya untuk login. Password vault ini mengunci isi transaksi, akun, budget, dan goals.'
          : 'Your account password signs you in. This vault password locks transactions, accounts, budgets, and goals.');

      return (
        <div className="ob-shell">
          <AuthLeftPanel eyebrow={leftEyebrow} title={leftTitleText} note={leftNoteText} />
          <div className="ob-right">
            <div className="ob-form">
              {mode === 'recover' && !recoveryCode && (
                <button className="ft-link" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}
                        onClick={() => { setError(''); setMode('unlock'); }}>
                  <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
                  {lang === 'id' ? 'Kembali ke vault password' : 'Back to vault password'}
                </button>
              )}

              <h2 className="ob-form-title">
                {mode === 'create'
                  ? (lang === 'id' ? 'Buat vault data' : 'Create data vault')
                  : mode === 'recover'
                    ? (lang === 'id' ? 'Pulihkan vault' : 'Recover vault')
                    : (lang === 'id' ? 'Buka vault data' : 'Unlock data vault')}
              </h2>
              <p className="ob-form-sub">
                {lang === 'id'
                  ? 'Password akun hanya untuk login. Password vault ini mengunci isi transaksi, akun, budget, dan goals.'
                  : 'Your account password signs you in. This vault password locks transactions, accounts, budgets, and goals.'}
              </p>

              {recoveryCode ? (
                <div style={{ marginTop: 22, padding: 16, borderRadius: 14, background: 'var(--ft-success-soft)', border: '1px solid rgba(5, 150, 105, .18)' }}>
                  <div style={{ color: 'var(--ft-success)', fontWeight: 800, fontSize: 13 }}>
                    {lang === 'id' ? 'Simpan recovery code ini sekarang' : 'Save this recovery code now'}
                  </div>
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: 'var(--ft-card)', fontFamily: 'var(--ft-font-mono)', fontSize: 14, fontWeight: 700, letterSpacing: 0, wordBreak: 'break-word' }}>
                    {recoveryCode}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="ft-btn" data-variant="ghost" data-size="sm" onClick={copyRecovery}>
                      <Icon name="copy" size={14} strokeWidth={2.5} />
                      {lang === 'id' ? 'Salin' : 'Copy'}
                    </button>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--ft-text-2)', fontWeight: 700 }}>
                      <input type="checkbox" checked={savedRecovery} onChange={(e) => setSavedRecovery(e.target.checked)} />
                      {lang === 'id' ? 'Sudah saya simpan' : 'I saved it'}
                    </label>
                  </div>
                  <button className="ft-btn" data-variant="primary" data-size="lg" style={{ width: '100%', marginTop: 14 }}
                          disabled={!savedRecovery}
                          onClick={onContinue}>
                    {lang === 'id' ? 'Lanjut ke dashboard' : 'Continue to dashboard'}
                  </button>
                </div>
              ) : (
                <>
                  {mode !== 'recover' && (
                    <>
                      <div className="ob-field-group" style={{ marginTop: 24 }}>
                        <label className="ft-label">{lang === 'id' ? 'Password vault' : 'Vault password'}</label>
                        <input className="ft-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" autoFocus />
                      </div>
                      {mode === 'create' && (
                        <div className="ob-field-group">
                          <label className="ft-label">{lang === 'id' ? 'Konfirmasi password vault' : 'Confirm vault password'}</label>
                          <input className="ft-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Minimal 8 karakter" />
                        </div>
                      )}
                    </>
                  )}

                  {mode === 'recover' && (
                    <>
                      <div className="ob-field-group" style={{ marginTop: 24 }}>
                        <label className="ft-label">Recovery code</label>
                        <input className="ft-input" value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autoFocus />
                      </div>
                      <div className="ob-field-group">
                        <label className="ft-label">{lang === 'id' ? 'Password vault baru' : 'New vault password'}</label>
                        <input className="ft-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter" />
                      </div>
                    </>
                  )}

                  {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--ft-danger-soft)', color: 'var(--ft-danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

                  <button className="ft-btn" data-variant="primary" data-size="lg" style={{ width: '100%', marginTop: 20 }}
                          disabled={busy}
                          onClick={submit}>
                    {busy
                      ? (lang === 'id' ? 'Memproses...' : 'Working...')
                      : mode === 'create'
                        ? (lang === 'id' ? 'Buat vault' : 'Create vault')
                        : mode === 'recover'
                          ? (lang === 'id' ? 'Pulihkan vault' : 'Recover vault')
                          : (lang === 'id' ? 'Buka vault' : 'Unlock vault')}
                  </button>

                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    {status !== 'new' && mode !== 'recover' && (
                      <button className="ft-link" style={{ fontSize: 13 }} onClick={() => { setError(''); setMode('recover'); }}>
                        {lang === 'id' ? 'Pakai recovery code' : 'Use recovery code'}
                      </button>
                    )}
                    <button className="ft-link" style={{ fontSize: 13, marginLeft: 'auto' }} onClick={onLogout}>
                      {lang === 'id' ? 'Keluar akun' : 'Sign out'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    function ComingSoon({ name, lang }) {
      return (
        <div className="ft-card" style={{
          padding: 60, textAlign: 'center', maxWidth: 520, margin: '60px auto',
          background: 'linear-gradient(135deg, #FEFCE8, #FEF3C7)', border: 0,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>Soon</div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px', color: '#0F1419' }}>
            {name}
          </h2>
          <p style={{ color: '#0F1419', opacity: .7, margin: 0 }}>
            {lang === 'id' ? 'Modul ini ada di roadmap Fase 2-3. Klik kategori lain di sidebar.' : 'In our Phase 2-3 roadmap. Click another tab in the sidebar.'}
          </p>
        </div>
      );
    }

    // Tweaks panel
    function FinTrackTweaks({ tw, setTw, lang }) {
      return (
        <TweaksPanel title="Tweaks">
          <TweakSection label={lang === 'id' ? 'Tema' : 'Theme'} />
          <TweakToggle label={lang === 'id' ? 'Mode gelap' : 'Dark mode'}
                       value={tw.dark} onChange={(v) => setTw('dark', v)} />
          <TweakColor label={lang === 'id' ? 'Aksen' : 'Accent'}
                      value={tw.accent}
                      options={['#2563EB', '#059669', '#D97706', '#EC4899', '#7C3AED']}
                      onChange={(v) => setTw('accent', v)} />

          <TweakSection label={lang === 'id' ? 'Layout' : 'Layout'} />
          <TweakRadio label={lang === 'id' ? 'Density' : 'Density'}
                      value={tw.density}
                      options={['compact', 'regular', 'comfy']}
                      onChange={(v) => setTw('density', v)} />
          <TweakRadio label="Sidebar"
                      value={tw.sidebar}
                      options={[{ value: 'full', label: 'Full' }, { value: 'icon', label: 'Icon' }]}
                      onChange={(v) => setTw('sidebar', v)} />

          <TweakSection label={lang === 'id' ? 'Grafik' : 'Charts'} />
          <TweakRadio label={lang === 'id' ? 'Gaya grafik' : 'Chart style'}
                      value={tw.chartStyle}
                      options={[{ value: 'line', label: 'Line' }, { value: 'area', label: 'Area' }, { value: 'bar', label: 'Bar' }]}
                      onChange={(v) => setTw('chartStyle', v)} />
        </TweaksPanel>
      );
    }

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

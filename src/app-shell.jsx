// FinTrack — sidebar + topbar shell, and Onboarding flow.

const { useState: useStateShell, useEffect: useEffectShell, useMemo: useMemoShell } = React;

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ route, setRoute, lang, t, onQuickAdd, sbMode, setSbMode, profile }) {
  const items = [
  { id: 'dashboard', icon: 'home', label: t('nav.dashboard') },
  { id: 'transactions', icon: 'list', label: t('nav.transactions') },
  { id: 'accounts', icon: 'wallet', label: t('nav.accounts') },
  { id: 'budgets', icon: 'pie', label: t('nav.budgets') },
  { id: 'goals', icon: 'goal', label: t('nav.goals') },
  { id: 'reports', icon: 'report', label: t('nav.reports') }];

  const collapsed = sbMode === 'icon';
  const toggleSb = () => setSbMode && setSbMode(collapsed ? 'full' : 'icon');
  const activeProfile = profile || window.FT_DATA.user || {};
  return (
    <aside className="ft-sb" data-comment-anchor="c2ebf249e3-aside-17-5">
      <button className="ft-sb-toggle"
              type="button"
              onClick={toggleSb}
              aria-label={collapsed ? (lang === 'id' ? 'Perluas menu' : 'Expand menu') : (lang === 'id' ? 'Ciutkan menu' : 'Collapse menu')}
              title={collapsed ? (lang === 'id' ? 'Perluas' : 'Expand') : (lang === 'id' ? 'Ciutkan' : 'Collapse')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
             style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s ease' }}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="ft-sb-brand">
        <Logo collapsed={collapsed} />
      </div>

      <div>
        <div className="ft-sb-section-label">Menu</div>
        <nav className="ft-sb-nav">
          {items.map((it) =>
          <button key={it.id} className="ft-sb-item"
          data-active={route === it.id}
          onClick={() => setRoute(it.id)}
          title={collapsed ? it.label : undefined}>
              <Icon name={it.icon} size={19} />
              <span className="ft-sb-item-label">{it.label}</span>
            </button>
          )}
        </nav>
      </div>

      <button className="ft-sb-item" onClick={onQuickAdd}
      style={{ background: '#DFFB6E', color: '#0F1419', justifyContent: 'center', margin: '0 0' }}>
        <Icon name="plus" size={19} strokeWidth={2.5} />
        {!collapsed && <span className="ft-sb-item-label" style={{ flex: 'initial' }}>{t('sidebar.addTx')}</span>}
      </button>

      <div className="ft-sb-spacer" data-comment-anchor="57188f4f20-div-46-7" />

      <button className="ft-sb-profile" onClick={() => setRoute('settings')}>
        <div className="ft-avatar">
          {activeProfile.avatar && (activeProfile.avatar.startsWith('http') || activeProfile.avatar.startsWith('data:image')) ? (
            <img src={activeProfile.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            activeProfile.avatar || 'FT'
          )}
        </div>
        <div className="ft-sb-profile-text">
          <div className="ft-sb-profile-name">{activeProfile.name || 'FinTrack User'}</div>
          <div className="ft-sb-profile-mail" data-comment-anchor="f697ac8b52-div-58-11">{activeProfile.email || ''}</div>
        </div>
      </button>
    </aside>);

}

// ── Topbar ──────────────────────────────────────────────────────────────────
function Topbar({ title, search, setSearch, lang, onToggleLang, onLogout, t, state, onNavigate }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {return JSON.parse(localStorage.getItem('ft_read_notifs') || '[]');}
    catch {return [];}
  });
  const wrapRef = useRef(null);

  // Outside-click closes the popover.
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onKey = (e) => {if (e.key === 'Escape') setNotifOpen(false);};
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  // Build the live notification list from current state — budget alerts,
  // upcoming bills, recent client payments.
  const notifs = useMemo(() => {
    if (!state) return [];
    const out = [];
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Spend per category this month
    const spendByCat = {};
    state.transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      if (new Date(tx.date).getTime() < startMonth) return;
      spendByCat[tx.category] = (spendByCat[tx.category] || 0) + tx.amount;
    });

    // Budget alerts
    state.budgets.forEach((b) => {
      const spent = spendByCat[b.category] || 0;
      const ratio = spent / b.limit;
      const cat = getCategory(b.category);
      if (ratio >= 1) {
        out.push({
          id: 'b-' + b.id, route: 'budgets',
          tone: 'danger', priority: 1,
          color: cat.color,
          emoji: cat.icon,
          textId: lang === 'id' ?
          `Anggaran <b>${cat.label}</b> melebihi batas (${Math.round(ratio * 100)}%)` :
          `<b>${cat.labelEn}</b> budget exceeded (${Math.round(ratio * 100)}%)`,
          metaId: lang === 'id' ? 'Bulan ini' : 'This month'
        });
      } else if (ratio >= 0.75) {
        out.push({
          id: 'b-' + b.id, route: 'budgets',
          tone: 'warning', priority: 2,
          color: cat.color,
          emoji: cat.icon,
          textId: lang === 'id' ?
          `Anggaran <b>${cat.label}</b> sudah ${Math.round(ratio * 100)}% terpakai` :
          `<b>${cat.labelEn}</b> budget at ${Math.round(ratio * 100)}%`,
          metaId: lang === 'id' ? 'Hampir habis' : 'Almost out'
        });
      }
    });

    // Upcoming bills (≤ 7 days)
    state.upcoming.filter((u) => u.dueIn <= 7).forEach((u) => {
      out.push({
        id: 'u-' + u.id, route: 'dashboard',
        tone: 'info', priority: u.dueIn <= 3 ? 1 : 3,
        color: '#0EA5E9',
        emoji: '📅',
        textId: lang === 'id' ?
        `<b>${u.title}</b> jatuh tempo dalam ${u.dueIn} hari` :
        `<b>${u.title}</b> due in ${u.dueIn} days`,
        metaId: formatIDR(u.amount, { compact: true })
      });
    });

    // Recent income (last 2 days)
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    state.transactions.
    filter((tx) => tx.type === 'income' && now - new Date(tx.date) <= twoDays).
    slice(0, 2).
    forEach((tx) => {
      out.push({
        id: 'i-' + tx.id, route: 'transactions',
        tone: 'success', priority: 4,
        color: '#059669',
        emoji: '↗',
        textId: lang === 'id' ?
        `Pemasukan diterima: <b>${tx.description}</b>` :
        `Income received: <b>${tx.description}</b>`,
        metaId: '+' + formatIDR(tx.amount, { compact: true }) + ' · ' + formatRelativeDate(tx.date, lang)
      });
    });

    out.sort((a, b) => a.priority - b.priority);
    return out;
  }, [state, lang]);

  const unreadCount = notifs.filter((n) => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const all = notifs.map((n) => n.id);
    setReadIds(all);
    localStorage.setItem('ft_read_notifs', JSON.stringify(all));
  };
  const handleClick = (n) => {
    if (!readIds.includes(n.id)) {
      const next = [...readIds, n.id];
      setReadIds(next);
      localStorage.setItem('ft_read_notifs', JSON.stringify(next));
    }
    setNotifOpen(false);
    if (onNavigate && n.route) onNavigate(n.route);
  };

  return (
    <div className="ft-tb">
      <div className="ft-tb-title">{title}</div>
      <div className="ft-tb-search">
        <Icon name="search" size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search') + '…'} />
      </div>
      <button className="ft-tb-icon-btn" onClick={onToggleLang} title="Bahasa / Language"
      style={{ width: 'auto', padding: '0 14px', borderRadius: 999, gap: 6, fontWeight: 700, fontSize: 13 }}>
        {lang.toUpperCase()}
      </button>

      <div className="ft-notif-wrap" ref={wrapRef}>
        <button className="ft-tb-icon-btn"
        aria-label="Notifications"
        aria-expanded={notifOpen}
        onClick={() => setNotifOpen((o) => !o)}>
          <Icon name="bell" size={19} />
          {unreadCount > 0 && <span className="ft-tb-dot" />}
        </button>

        {notifOpen &&
        <div className="ft-notif-pop" role="dialog" aria-label="Notifications">
            <div className="ft-notif-head">
              <div>
                <div className="ft-notif-title">
                  {lang === 'id' ? 'Notifikasi' : 'Notifications'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 2, fontWeight: 600 }}>
                  {unreadCount > 0 ?
                lang === 'id' ? `${unreadCount} belum dibaca` : `${unreadCount} unread` :
                lang === 'id' ? 'Semua sudah dibaca' : 'All caught up'}
                </div>
              </div>
              {unreadCount > 0 &&
            <button className="ft-notif-mark" onClick={markAllRead}>
                  {lang === 'id' ? 'Tandai dibaca' : 'Mark all read'}
                </button>
            }
            </div>

            <div className="ft-notif-list">
              {notifs.length === 0 &&
            <div className="ft-notif-empty">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                  {lang === 'id' ? 'Tidak ada notifikasi baru' : 'Nothing new right now'}
                </div>
            }
              {notifs.map((n) =>
            <div key={n.id} className="ft-notif-item"
            data-unread={!readIds.includes(n.id)}
            onClick={() => handleClick(n)}>
                  <div className="ft-notif-icon" style={{ background: n.color }}>{n.emoji}</div>
                  <div className="ft-notif-body">
                    <div className="ft-notif-text" dangerouslySetInnerHTML={{ __html: n.textId }} />
                    <div className="ft-notif-meta">{n.metaId}</div>
                  </div>
                </div>
            )}
            </div>

            {notifs.length > 0 &&
          <div className="ft-notif-foot">
                <button onClick={() => {setNotifOpen(false);onNavigate && onNavigate('transactions');}}>
                  {lang === 'id' ? 'Lihat semua aktivitas →' : 'See all activity →'}
                </button>
              </div>
          }
          </div>
        }
      </div>

      <button className="ft-tb-icon-btn" onClick={onLogout} aria-label="Sign out">
        <Icon name="logout" size={18} />
      </button>
    </div>);

}

// ── Onboarding / Login flow ─────────────────────────────────────────────────
function Onboarding({ onDone, lang, t, initialMode = 'signin' }) {
  // mode: 'signin' (default) | 'signup' (multi-step) | 'forgot' | 'forgot-sent'
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: 'andi@studiowiyono.id',
    password: '',
    name: 'Andi',
    profession: 'freelancer',
    goal: 'goalReport',
    accountType: 'bank',
    accountName: 'BCA Tahapan',
    accountBalance: '42500000',
    remember: true,
  });
  const [errors, setErrors] = useState({});
  const [forgotEmail, setForgotEmail] = useState('');

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (mode === 'signin') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = lang === 'id' ? 'Email tidak valid' : 'Invalid email';
      if (!form.password) e.password = lang === 'id' ? 'Password wajib diisi' : 'Password required';
    } else if (mode === 'signup' && step === 0) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = lang === 'id' ? 'Email tidak valid' : 'Invalid email';
      if (form.password.length < 8 || !/\d/.test(form.password))
        e.password = lang === 'id' ? 'Min 8 karakter + angka' : 'Min 8 chars + a digit';
    } else if (mode === 'signup' && step === 2) {
      if (!form.accountName.trim()) e.accountName = lang === 'id' ? 'Nama wajib diisi' : 'Required';
      if (!form.accountBalance) e.accountBalance = lang === 'id' ? 'Saldo wajib diisi' : 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validate()) return;
    if (mode === 'signin') { onDone(); return; }
    if (mode === 'signup' && step === 3) onDone();
    else setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  // —— Forgot password handlers
  const submitForgot = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forgotEmail)) {
      setErrors({ forgotEmail: lang === 'id' ? 'Email tidak valid' : 'Invalid email' });
      return;
    }
    setErrors({});
    setMode('forgot-sent');
  };

  const stepCount = 4;
  const stepTitleKey = ['step1Title', 'step2Title', 'step3Title', 'step4Title'][step];
  const stepSubKey  = ['step1Sub',   'step2Sub',   'step3Sub',   'step4Sub']  [step];

  // —— Left-panel content varies by mode
  const leftEyebrow = mode === 'signup' ? t('onboarding.welcomeEyebrow') : t('onboarding.signInTitle');
  const leftTitle   = mode === 'signup' ? t('onboarding.welcomeTitle')   : t('onboarding.welcomeSigninTitle');
  const leftNote    = mode === 'signup' ? t('onboarding.welcomeNote')    : t('onboarding.welcomeSigninNote');

  const isCentered = mode === 'forgot' || mode === 'forgot-sent';
  return (
    <div className="ob-shell" data-centered={isCentered ? "true" : "false"}>
      {!isCentered && (
        <div className="ob-left">
          <div className="ob-left-content">
            <div className="ob-left-brand">
              <Logo />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="ft-pill" style={{ background: 'rgba(255,255,255,.15)', color: 'white', alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DFFB6E', display: 'inline-block', marginRight: 6 }} />
                {leftEyebrow}
              </div>
              <h1 className="ob-left-headline">{leftTitle}</h1>
              <p className="ob-left-sub">{leftNote}</p>

              {mode === 'signup' && (
                <>
                  <div className="ob-steps-strip">
                    {Array.from({ length: stepCount }).map((_, i) => (
                      <div key={i} className="ob-step-pip" data-active={i === step} data-done={i < step} />
                    ))}
                  </div>
                  <div className="ob-step-titles">
                    <span>{step + 1}/{stepCount} • {t(`onboarding.${stepTitleKey}`)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Decorative preview card */}
            <div className="ob-left-card">
              <div style={{ fontSize: 12, opacity: .8 }}>Total Saldo · Mock</div>
              <div style={{ fontFamily: 'var(--ft-font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>
                Rp 70.685.000
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <span className="ft-pill" style={{ background: 'rgba(223,251,110,.2)', color: '#DFFB6E', fontWeight: 600 }}>↗ +47jt</span>
                <span className="ft-pill" style={{ background: 'rgba(255,255,255,.12)', color: 'white', fontWeight: 600 }}>↘ −12jt</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="ob-right">
        <div className="ob-form">
          {/* —— SIGN IN —— */}
          {mode === 'signin' && (
            <>
              <h2 className="ob-form-title">{t('onboarding.signInTitle')}</h2>
              <p className="ob-form-sub">{t('onboarding.signInSub')}</p>

              <div className="ob-field-group">
                <label className="ft-label">{t('onboarding.emailLabel')}</label>
                <input className="ft-input" type="email"
                       value={form.email} onChange={(e) => update('email', e.target.value)}
                       aria-invalid={!!errors.email}
                       placeholder="andi@studiowiyono.id" />
                {errors.email && <div style={{ color: 'var(--ft-danger)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.email}</div>}
              </div>
              <div className="ob-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="ft-label">{t('onboarding.passwordLabel')}</label>
                  <button className="ft-link" style={{ fontSize: 12.5 }} type="button"
                          onClick={() => { setForgotEmail(form.email); setMode('forgot'); setErrors({}); }}>
                    {t('onboarding.forgot')}
                  </button>
                </div>
                <input className="ft-input" type="password"
                       value={form.password} onChange={(e) => update('password', e.target.value)}
                       aria-invalid={!!errors.password}
                       placeholder="••••••••" />
                {errors.password && <div style={{ color: 'var(--ft-danger)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.password}</div>}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ft-text-2)', fontWeight: 600, marginTop: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.remember} onChange={(e) => update('remember', e.target.checked)}
                       style={{ width: 16, height: 16, accentColor: 'var(--ft-action)' }} />
                {t('onboarding.rememberMe')}
              </label>

              <div className="ob-actions">
                <button className="ft-btn" data-variant="primary" data-size="lg" onClick={goNext} style={{ flex: 1 }}>
                  {t('onboarding.signInCta')}
                  <Icon name="arrowRight" size={16} />
                </button>
              </div>

              <div style={{ marginTop: 22, fontSize: 13.5, color: 'var(--ft-text-2)', textAlign: 'center' }}>
                {t('onboarding.noAccount')}{' '}
                <button className="ft-link" type="button" onClick={() => { setMode('signup'); setStep(0); setErrors({}); }}>
                  {t('onboarding.createAccount')}
                </button>
              </div>
            </>
          )}

          {/* —— FORGOT PASSWORD —— */}
          {mode === 'forgot' && (
            <>
              <button className="ft-link" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}
                      onClick={() => { setMode('signin'); setErrors({}); }}>
                <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
                {t('onboarding.forgotBack')}
              </button>
              <h2 className="ob-form-title">{t('onboarding.forgotTitle')}</h2>
              <p className="ob-form-sub">{t('onboarding.forgotSub')}</p>

              <div className="ob-field-group">
                <label className="ft-label">{t('onboarding.emailLabel')}</label>
                <input className="ft-input" type="email"
                       value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                       aria-invalid={!!errors.forgotEmail}
                       placeholder="andi@studiowiyono.id" autoFocus />
                {errors.forgotEmail && <div style={{ color: 'var(--ft-danger)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.forgotEmail}</div>}
              </div>

              <div className="ob-actions">
                <button className="ft-btn" data-variant="primary" data-size="lg" onClick={submitForgot} style={{ flex: 1 }}>
                  {t('onboarding.forgotCta')}
                  <Icon name="arrowRight" size={16} />
                </button>
              </div>
            </>
          )}

          {/* —— FORGOT PASSWORD SENT —— */}
          {mode === 'forgot-sent' && (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--ft-success-soft)', color: 'var(--ft-success)',
                display: 'grid', placeItems: 'center', margin: '0 0 20px', fontSize: 32,
              }}>
                ✉️
              </div>
              <h2 className="ob-form-title">{t('onboarding.forgotSentTitle')}</h2>
              <p className="ob-form-sub" style={{ marginBottom: 8 }}>{t('onboarding.forgotSentSub')}</p>
              <div style={{
                padding: '14px 16px',
                background: 'var(--ft-bg)',
                borderRadius: 14,
                fontFamily: 'var(--ft-font-mono)',
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 16,
                wordBreak: 'break-all',
              }}>
                {forgotEmail}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ft-text-3)', lineHeight: 1.5, margin: 0 }}>
                {t('onboarding.forgotSentNote')}
              </p>

              <div className="ob-actions" style={{ flexDirection: 'column', gap: 10 }}>
                <button className="ft-btn" data-variant="primary" data-size="lg"
                        onClick={() => { setMode('signin'); setErrors({}); }}
                        style={{ width: '100%' }}>
                  {t('onboarding.forgotBack')}
                </button>
                <button className="ft-btn" data-variant="ghost" data-size="lg"
                        onClick={() => ToastBus.push(lang === 'id' ? 'Email dikirim ulang' : 'Email resent')}
                        style={{ width: '100%' }}>
                  {t('onboarding.forgotResend')}
                </button>
              </div>
            </>
          )}

          {/* —— SIGN UP MULTISTEP —— */}
          {mode === 'signup' && (
            <>
              <button className="ft-link" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}
                      onClick={() => { setMode('signin'); setStep(0); setErrors({}); }}>
                <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
                {t('onboarding.signIn')}
              </button>

              <h2 className="ob-form-title">{t(`onboarding.${stepTitleKey}`)}</h2>
              <p className="ob-form-sub">{t(`onboarding.${stepSubKey}`)}</p>

              {/* Step 0 — credentials */}
              {step === 0 && (
                <>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.emailLabel')}</label>
                    <input className="ft-input" type="email"
                           value={form.email} onChange={(e) => update('email', e.target.value)}
                           aria-invalid={!!errors.email}
                           placeholder="andi@studiowiyono.id" />
                    {errors.email && <div style={{ color: 'var(--ft-danger)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.email}</div>}
                  </div>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.passwordLabel')}</label>
                    <input className="ft-input" type="password"
                           value={form.password} onChange={(e) => update('password', e.target.value)}
                           aria-invalid={!!errors.password}
                           placeholder="••••••••" />
                    <div style={{ fontSize: 12, color: errors.password ? 'var(--ft-danger)' : 'var(--ft-text-3)', marginTop: 6, fontWeight: 600 }}>
                      {errors.password || t('onboarding.passwordHint')}
                    </div>
                  </div>
                </>
              )}

              {/* Step 1 — profession */}
              {step === 1 && (
                <>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.nameLabel')}</label>
                    <input className="ft-input" type="text" value={form.name} onChange={(e) => update('name', e.target.value)} />
                  </div>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.profession')}</label>
                    <div className="ob-choice-grid">
                      {[['freelancer','🎨'],['family','🏡'],['business','🏪'],['finance','📊']].map(([id, e]) => (
                        <div key={id} className="ob-choice" data-active={form.profession === id} onClick={() => update('profession', id)}>
                          <div className="ob-choice-emoji">{e}</div>
                          <div className="ob-choice-text">{t(`onboarding.profession${id.charAt(0).toUpperCase() + id.slice(1)}`)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.goal')}</label>
                    <div className="ob-choice-grid">
                      {[['goalTrack','🔍'],['goalSave','💰'],['goalBusiness','🧾'],['goalReport','📋']].map(([id, e]) => (
                        <div key={id} className="ob-choice" data-active={form.goal === id} onClick={() => update('goal', id)}>
                          <div className="ob-choice-emoji">{e}</div>
                          <div className="ob-choice-text">{t(`onboarding.${id}`)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2 — first account */}
              {step === 2 && (
                <>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.accountType')}</label>
                    <div className="ob-choice-grid">
                      {[['bank','🏦', t('accounts.typeBank')],['cash','💵', t('accounts.typeCash')],['card','💳', t('accounts.typeCard')],['invest','📈', t('accounts.typeInvest')]].map(([id, e, lbl]) => (
                        <div key={id} className="ob-choice" data-active={form.accountType === id} onClick={() => update('accountType', id)}>
                          <div className="ob-choice-emoji">{e}</div>
                          <div className="ob-choice-text">{lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.accountName')}</label>
                    <input className="ft-input" value={form.accountName} onChange={(e) => update('accountName', e.target.value)}
                           aria-invalid={!!errors.accountName} placeholder="BCA Tahapan / Dompet Tunai" />
                    {errors.accountName && <div style={{ color: 'var(--ft-danger)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.accountName}</div>}
                  </div>
                  <div className="ob-field-group">
                    <label className="ft-label">{t('onboarding.accountBalance')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ padding: '0 14px', height: 44, background: 'var(--ft-bg)', borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 700 }}>Rp</div>
                      <input className="ft-input" inputMode="numeric" value={form.accountBalance}
                             onChange={(e) => update('accountBalance', e.target.value.replace(/\D/g, ''))}
                             aria-invalid={!!errors.accountBalance} />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3 — budget intro */}
              {step === 3 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {[
                      { id: 'food', emoji: '🍜', label: t('transactions.typeExpense') + ' · Food', amount: 2_500_000 },
                      { id: 'transport', emoji: '🚕', label: 'Transport', amount: 1_200_000 },
                      { id: 'fun', emoji: '🎬', label: 'Hiburan', amount: 800_000 },
                      { id: 'software', emoji: '💻', label: 'Software', amount: 1_000_000 },
                    ].map((b) => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--ft-bg)', borderRadius: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ft-surface)', display: 'grid', placeItems: 'center', fontSize: 18 }}>{b.emoji}</div>
                        <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{b.label}</div>
                        <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 16 }}>
                          {formatIDR(b.amount, { compact: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ft-text-3)', textAlign: 'center', marginBottom: 0 }}>
                    {lang === 'id' ? 'Disarankan berdasarkan profesimu — bisa diubah nanti.' : "Suggested for your profession — edit anytime."}
                  </p>
                </>
              )}

              <div className="ob-actions">
                {step > 0 && (
                  <button className="ft-btn" data-variant="ghost" data-size="lg" onClick={goBack}>
                    <Icon name="arrowRight" size={16} style={{ transform: 'rotate(180deg)' }} />
                    <span>{t('common.back')}</span>
                  </button>
                )}
                <button className="ft-btn" data-variant="primary" data-size="lg" onClick={goNext} style={{ flex: 1 }}>
                  {step === 3 ? t('onboarding.finishCta') : t('common.next')}
                  {step !== 3 && <Icon name="arrowRight" size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, Onboarding, MobileNav });

// ── Mobile bottom nav (shown below 720px via CSS) ───────────────────────────
function MobileNav({ route, setRoute, t, onQuickAdd }) {
  const items = [
  { id: 'dashboard', icon: 'home', label: t('nav.dashboard') },
  { id: 'transactions', icon: 'list', label: t('nav.transactions') },
  { id: 'budgets', icon: 'pie', label: t('nav.budgets') },
  { id: 'reports', icon: 'report', label: t('nav.reports') }];

  return (
    <nav className="ft-mobile-nav">
      {items.slice(0, 2).map((it) =>
      <button key={it.id} data-active={route === it.id} onClick={() => setRoute(it.id)}>
          <Icon name={it.icon} size={20} />
          <span>{it.label}</span>
        </button>
      )}
      <button data-fab="true" onClick={onQuickAdd} aria-label="Quick add">
        <Icon name="plus" size={22} strokeWidth={2.5} />
      </button>
      {items.slice(2).map((it) =>
      <button key={it.id} data-active={route === it.id} onClick={() => setRoute(it.id)}>
          <Icon name={it.icon} size={20} />
          <span>{it.label}</span>
        </button>
      )}
    </nav>);

}

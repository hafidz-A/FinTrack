// FinTrack — Goals (savings tracking) + Reports (analytics).

// ── Goals ──────────────────────────────────────────────────────────────────
function Goals({ state, dispatch, lang, t }) {
  const { goals, accounts } = state;
  const [addOpen, setAddOpen] = useState(false);
  const [contribTarget, setContribTarget] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribFrom, setContribFrom] = useState(accounts[0]?.id);
  const [delGoal, setDelGoal] = useState(null);

  // Add form
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gDeadline, setGDeadline] = useState('');
  const [gMonthly, setGMonthly] = useState('');
  const [gEmoji, setGEmoji] = useState('🎯');
  const [gColor, setGColor] = useState('#2563EB');
  const [gPriority, setGPriority] = useState('medium');
  const [simulation, setSimulation] = useState('');

  const EMOJI_PICKER = ['🎯', '🏖️', '🏡', '💻', '🚗', '🛡️', '💍', '🎓', '👶', '✈️', '📷', '🎮'];
  const COLOR_PICKER = ['#2563EB', '#059669', '#EC4899', '#F59E0B', '#7C3AED', '#0F172A', '#0EA5E9', '#DC2626'];

  // computed totals
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  const submitAdd = () => {
    const target = Number(gTarget.replace(/\D/g, ''));
    const monthly = Number(gMonthly.replace(/\D/g, '') || 0);
    if (!gName.trim() || !target) return;
    dispatch({
      type: 'ADD_GOAL',
      goal: {
        id: 'g-' + Date.now(),
        name: gName, emoji: gEmoji, color: gColor,
        target, saved: 0,
        deadline: gDeadline ? new Date(gDeadline).toISOString() : new Date(Date.now() + 365 * 86400000).toISOString(),
        monthlyContrib: monthly,
        account: accounts[0]?.id,
        priority: gPriority,
        milestones: [
          { pct: 25, hit: false, label: '25%' },
          { pct: 50, hit: false, label: '50%' },
          { pct: 75, hit: false, label: '75%' },
          { pct: 100, hit: false, label: '100%' },
        ],
      },
    });
    setGName(''); setGTarget(''); setGDeadline(''); setGMonthly('');
    setAddOpen(false);
    ToastBus.push(lang === 'id' ? 'Tujuan dibuat' : 'Goal created');
  };

  const submitContrib = () => {
    const amt = Number(contribAmount.replace(/\D/g, ''));
    if (!amt) return;
    dispatch({ type: 'CONTRIBUTE_GOAL', goalId: contribTarget.id, amount: amt, fromAccount: contribFrom });
    setContribAmount('');
    setContribTarget(null);
    ToastBus.push(lang === 'id' ? `+${formatIDR(amt, { compact: true })} ke ${contribTarget.name}` : `+${formatIDR(amt, { compact: true })} to ${contribTarget.name}`);
  };

  // Simulation calc: months to reach target at given monthly contrib
  const simMonths = (g, monthly) => {
    if (!monthly || monthly <= 0) return null;
    const remaining = g.target - g.saved;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / monthly);
  };

  return (
    <div className="ft-fade-up">
      {/* HERO */}
      <div className="gl-hero">
        <div className="gl-hero-grid">
          <div>
            <div style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>{t('goals.totalSaved')}</div>
            <div className="gl-hero-num">{formatIDR(totalSaved, { compact: true })}</div>
            <div style={{ fontSize: 13, opacity: .8 }}>
              {lang === 'id' ? 'dari' : 'of'} {formatIDR(totalTarget, { compact: true })} {t('goals.totalTarget').toLowerCase()}
            </div>
            <div className="gl-hero-bar">
              <div style={{ width: Math.min(100, (totalSaved / totalTarget) * 100) + '%' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>{lang === 'id' ? 'Tujuan aktif' : 'Active goals'}</div>
            <div className="gl-hero-num">{goals.length}</div>
            <div style={{ fontSize: 13, opacity: .8 }}>
              {goals.filter((g) => g.saved >= g.target).length} {lang === 'id' ? 'tercapai' : 'reached'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>{lang === 'id' ? 'Setoran rutin' : 'Monthly contributions'}</div>
            <div className="gl-hero-num" style={{ color: '#DFFB6E' }}>
              {formatIDR(goals.reduce((s, g) => s + (g.monthlyContrib || 0), 0), { compact: true })}
            </div>
            <div style={{ fontSize: 13, opacity: .8 }}>{lang === 'id' ? 'per bulan total' : 'across all goals'}</div>
          </div>
        </div>
      </div>

      <div className="tx-page-head">
        <div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('goals.title')}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ft-text-2)', marginTop: 4 }}>{t('goals.sub')}</div>
        </div>
        <button className="ft-btn" data-variant="primary" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={16} strokeWidth={2.5} />
          {t('goals.newGoal')}
        </button>
      </div>

      <div className="gl-grid">
        {goals.map((g) => {
          const pct = Math.min(100, (g.saved / g.target) * 100);
          const remaining = Math.max(0, g.target - g.saved);
          const months = simMonths(g, g.monthlyContrib);
          const deadline = new Date(g.deadline);
          const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / 86400000));
          const monthsLeft = Math.max(1, Math.round(daysLeft / 30));
          const onPace = months !== null && months <= monthsLeft;
          const priorityColors = {
            high: { bg: 'var(--ft-danger-soft)', fg: 'var(--ft-danger)' },
            medium: { bg: 'var(--ft-warning-soft)', fg: 'var(--ft-warning)' },
            low: { bg: 'var(--ft-bg)', fg: 'var(--ft-text-2)' },
          };
          const pc = priorityColors[g.priority] || priorityColors.medium;

          return (
            <div key={g.id} className="gl-card">
              <div className="gl-card-stripe" style={{ background: g.color }} />
              <div className="gl-card-priority" style={{ background: pc.bg, color: pc.fg }}>
                {t('goals.priority' + g.priority.charAt(0).toUpperCase() + g.priority.slice(1))}
              </div>
              <div className="gl-card-head">
                <div className="gl-card-emoji" style={{ background: g.color }}>{g.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gl-card-title">{g.name}</div>
                  <div className="gl-card-deadline">
                    {deadline.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {daysLeft > 60 ? `${monthsLeft} ${t('goals.monthsLeft')}` : `${daysLeft} ${t('goals.daysLeft')}`}
                  </div>
                </div>
              </div>

              <div className="gl-card-amounts">
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--ft-text-3)', fontWeight: 600 }}>{t('goals.saved')}</div>
                  <div className="gl-card-saved" style={{ color: g.color }}>{formatIDR(g.saved, { compact: true })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ft-text-3)', fontWeight: 600 }}>{t('goals.target')}</div>
                  <div className="gl-card-target">{formatIDR(g.target, { compact: true })}</div>
                </div>
              </div>

              <div className="gl-card-bar">
                <div style={{ width: pct + '%', background: g.color }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 14, color: g.color }}>
                  {Math.round(pct)}%
                </span>
                <span className="gl-card-eta" style={{
                  background: onPace ? 'var(--ft-success-soft)' : 'var(--ft-warning-soft)',
                  color: onPace ? 'var(--ft-success)' : 'var(--ft-warning)',
                }}>
                  {onPace ? '✓' : '⚠'}
                  {onPace ? t('goals.onPace') : t('goals.behind')}
                </span>
              </div>

              {/* Milestones */}
              <div className="gl-card-milestones">
                {g.milestones.map((m, i) => (
                  <div key={i} className="gl-milestone" data-hit={pct >= m.pct}>
                    {m.label}
                  </div>
                ))}
              </div>

              <button className="ft-btn" data-variant="ghost" data-size="sm"
                      style={{ width: '100%', marginTop: 16 }}
                      onClick={() => { setContribTarget(g); setContribAmount(''); }}>
                <Icon name="plus" size={14} strokeWidth={2.5} />
                {t('goals.contribute')}
              </button>

              <button className="bd-card-del" type="button"
                      aria-label={lang === 'id' ? 'Hapus tujuan' : 'Delete goal'}
                      style={{ left: 12, right: 'auto' }}
                      onClick={(e) => { e.stopPropagation(); setDelGoal(g); }}>
                <Icon name="close" size={14} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}

        <button className="acc-add-card" style={{ height: 'auto', padding: 36 }} onClick={() => setAddOpen(true)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" size={28} strokeWidth={2.5} />
            <span>{t('goals.newGoal')}</span>
          </div>
        </button>
      </div>

      {/* Add goal modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)}
             title={t('goals.newGoalTitle')}
             sub={lang === 'id' ? 'Bermimpilah besar — kami yang hitung.' : "Dream big — we'll do the math."}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" onClick={submitAdd}>{t('common.save')}</button>
               </>
             }>
        <div className="ob-field-group">
          <label className="ft-label">{t('goals.goalName')}</label>
          <input className="ft-input" value={gName} onChange={(e) => setGName(e.target.value)}
                 placeholder={lang === 'id' ? 'Liburan ke Bali, MacBook baru, …' : 'Bali trip, new laptop, …'} />
        </div>
        <div className="qa-row-2">
          <div>
            <label className="ft-label">{t('goals.target')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '0 14px', height: 44, background: 'var(--ft-bg)', borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 700 }}>Rp</div>
              <input className="ft-input" inputMode="numeric"
                     value={gTarget ? Number(gTarget.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                     onChange={(e) => setGTarget(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div>
            <label className="ft-label">{t('goals.deadline')}</label>
            <input className="ft-input" type="date" value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} />
          </div>
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{t('goals.monthlyContrib')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: '0 14px', height: 44, background: 'var(--ft-bg)', borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 700 }}>Rp</div>
            <input className="ft-input" inputMode="numeric"
                   value={gMonthly ? Number(gMonthly.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                   onChange={(e) => setGMonthly(e.target.value.replace(/\D/g, ''))} />
          </div>
          {(() => {
            const target = Number(gTarget.replace(/\D/g, ''));
            const monthly = Number(gMonthly.replace(/\D/g, ''));
            if (!target || !monthly) return null;
            const months = Math.ceil(target / monthly);
            const eta = new Date();
            eta.setMonth(eta.getMonth() + months);
            return (
              <div style={{ marginTop: 10, padding: 12, background: 'var(--ft-action-soft)', borderRadius: 12, fontSize: 13, color: 'var(--ft-action)', fontWeight: 600 }}>
                💡 {t('goals.simulation')}: {months} {t('goals.monthsLeft')} → {eta.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' })}
              </div>
            );
          })()}
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{lang === 'id' ? 'Emoji & warna' : 'Emoji & color'}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {EMOJI_PICKER.map((e) => (
              <button key={e}
                      onClick={() => setGEmoji(e)}
                      style={{
                        width: 40, height: 40, fontSize: 22,
                        border: gEmoji === e ? '2px solid var(--ft-action)' : '2px solid var(--ft-border)',
                        borderRadius: 10, background: gEmoji === e ? 'var(--ft-action-soft)' : 'var(--ft-surface)',
                        cursor: 'pointer',
                      }}>{e}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_PICKER.map((c) => (
              <button key={c}
                      onClick={() => setGColor(c)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: c,
                        border: gColor === c ? '3px solid var(--ft-text)' : '3px solid transparent',
                        cursor: 'pointer',
                      }} />
            ))}
          </div>
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{t('goals.priority')}</label>
          <div className="qa-types" style={{ marginBottom: 0 }}>
            {['high', 'medium', 'low'].map((p) => (
              <button key={p} className="qa-type-btn"
                      data-active={gPriority === p}
                      data-type={p === 'high' ? 'expense' : p === 'medium' ? 'transfer' : 'income'}
                      onClick={() => setGPriority(p)}>
                {t('goals.priority' + p.charAt(0).toUpperCase() + p.slice(1))}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Contribute modal */}
      <Modal open={!!contribTarget} onClose={() => setContribTarget(null)}
             title={t('goals.contributeTitle')}
             sub={contribTarget?.name}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setContribTarget(null)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" onClick={submitContrib}>{t('common.save')}</button>
               </>
             }>
        {contribTarget && (
          <>
            <div className="qa-big-input">
              <span className="qa-big-input-prefix">Rp</span>
              <input inputMode="numeric" placeholder="0"
                     value={contribAmount ? Number(contribAmount.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                     onChange={(e) => setContribAmount(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <div className="ob-field-group">
              <label className="ft-label">{t('goals.fromAccount')}</label>
              <select className="ft-input" value={contribFrom} onChange={(e) => setContribFrom(e.target.value)}>
                {accounts.filter((a) => a.balance > 0).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({formatIDR(a.balance, { compact: true })})</option>
                ))}
              </select>
            </div>
            <div style={{
              padding: 16, background: 'var(--ft-bg)', borderRadius: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{lang === 'id' ? 'Setelah setoran ini' : 'After this contribution'}</div>
                <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, marginTop: 4 }}>
                  {formatIDR(contribTarget.saved + Number(contribAmount.replace(/\D/g, '') || 0), { compact: true })}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 24, color: contribTarget.color }}>
                {Math.min(100, Math.round(((contribTarget.saved + Number(contribAmount.replace(/\D/g, '') || 0)) / contribTarget.target) * 100))}%
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Delete goal confirmation */}
      <Modal open={!!delGoal} onClose={() => setDelGoal(null)}
             title={lang === 'id' ? 'Hapus tujuan?' : 'Delete goal?'}
             sub={lang === 'id' ? 'Tujuan akan dihapus. Setoran yang sudah masuk ke akun tetap di sana.' : "Goal will be removed. Funds already in your account stay there."}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setDelGoal(null)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }}
                         onClick={() => {
                           dispatch({ type: 'DEL_GOAL', id: delGoal.id });
                           ToastBus.push(lang === 'id' ? 'Tujuan dihapus' : 'Goal deleted');
                           setDelGoal(null);
                         }}>
                   <Icon name="close" size={14} strokeWidth={2.5} />
                   {t('common.delete')}
                 </button>
               </>
             }>
        {delGoal && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--ft-bg)', borderRadius: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: delGoal.color, display: 'grid', placeItems: 'center', fontSize: 24, color: 'white' }}>{delGoal.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--ft-font-display)' }}>{delGoal.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ft-text-3)', fontWeight: 600 }}>
                {formatIDR(delGoal.saved, { compact: true })} / {formatIDR(delGoal.target, { compact: true })}
                {' · '}
                {Math.round((delGoal.saved / delGoal.target) * 100)}%
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

Object.assign(window, { Goals });

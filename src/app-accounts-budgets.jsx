// FinTrack — Accounts & Wallets module + Budgets module.

// ── Accounts ────────────────────────────────────────────────────────────────
function Accounts({ state, dispatch, lang, t }) {
  const { accounts, transactions } = state;
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [archived, setArchived] = useState([]);
  // Two-step destructive delete state.
  const [deleting, setDeleting] = useState(null);
  const [delConfirmText, setDelConfirmText] = useState('');

  // Add form
  const [aType, setAType] = useState('bank');
  const [aName, setAName] = useState('');
  const [aBal, setABal] = useState('');
  const [aColor, setAColor] = useState(['#1E3A5F', '#2563EB']);

  const COLOR_PRESETS = [
    ['#1E3A5F', '#2563EB'],
    ['#F97316', '#EAB308'],
    ['#059669', '#10B981'],
    ['#7C3AED', '#A855F7'],
    ['#DC2626', '#F43F5E'],
    ['#0F172A', '#334155'],
  ];

  const totalAssets = accounts.filter((a) => a.balance > 0 && !archived.includes(a.id)).reduce((s, a) => s + a.balance, 0);
  const totalLiabs  = Math.abs(accounts.filter((a) => a.balance < 0 && !archived.includes(a.id)).reduce((s, a) => s + a.balance, 0));

  const submitAdd = () => {
    if (!aName.trim()) return;
    const newA = {
      id: 'acc-' + Date.now(),
      name: aName,
      type: aType,
      currency: 'IDR',
      balance: Number(aBal.replace(/\D/g, '') || 0),
      colorA: aColor[0],
      colorB: aColor[1],
      number: '•• ' + Math.floor(1000 + Math.random() * 8999),
      icon: aName.charAt(0).toUpperCase(),
    };
    dispatch({ type: 'ADD_ACCOUNT', account: newA });
    setAName(''); setABal('');
    setAddOpen(false);
    ToastBus.push(lang === 'id' ? 'Akun ditambahkan' : 'Account added');
  };

  // Transfer modal state
  const [tFrom, setTFrom] = useState(accounts[0]?.id);
  const [tTo, setTTo]     = useState(accounts[1]?.id);
  const [tAmt, setTAmt]   = useState('');

  const submitTransfer = () => {
    const amt = Number(tAmt.replace(/\D/g, ''));
    if (!amt || tFrom === tTo) return;
    dispatch({
      type: 'ADD_TX',
      tx: {
        id: 't' + Date.now(),
        type: 'transfer',
        amount: amt,
        category: 'transfer',
        account: tFrom,
        toAccount: tTo,
        date: new Date().toISOString(),
        description: lang === 'id' ? `Transfer ke ${getAccount(tTo, accounts).name}` : `Transfer to ${getAccount(tTo, accounts).name}`,
        tags: ['manual'],
      },
    });
    setTAmt('');
    setTransferOpen(false);
    ToastBus.push(t('transactions.txAdded'));
  };

  return (
    <div className="ft-fade-up">
      <div className="acc-totals">
        <div className="ft-card">
          <div style={{ fontSize: 13, color: 'var(--ft-text-2)', fontWeight: 600 }}>{t('accounts.totalAssets')}</div>
          <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--ft-success)', marginTop: 8 }}>
            +{formatIDR(totalAssets, { compact: true })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 4 }}>
            {accounts.filter((a) => a.balance > 0 && !archived.includes(a.id)).length} {lang === 'id' ? 'akun aktif' : 'active accounts'}
          </div>
        </div>
        <div className="ft-card">
          <div style={{ fontSize: 13, color: 'var(--ft-text-2)', fontWeight: 600 }}>{t('accounts.totalLiabilities')}</div>
          <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--ft-danger)', marginTop: 8 }}>
            −{formatIDR(totalLiabs, { compact: true })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 4 }}>
            {accounts.filter((a) => a.balance < 0 && !archived.includes(a.id)).length} {lang === 'id' ? 'kartu/pinjaman' : 'cards/loans'}
          </div>
        </div>
        <div className="ft-card" style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563EB)', color: 'white', border: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>{t('accounts.netPosition')}</div>
          <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', marginTop: 8 }}>
            {formatIDR(totalAssets - totalLiabs, { compact: true })}
          </div>
          <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>
            {lang === 'id' ? 'Posisi keuanganmu' : 'Your net position'}
          </div>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(223,251,110,.3), transparent 65%)', borderRadius: '50%' }} />
        </div>
      </div>

      <div className="tx-page-head">
        <div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('accounts.title')}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ft-text-2)', marginTop: 4 }}>
            {lang === 'id' ? 'Semua dompetmu dalam satu tempat' : 'All your wallets in one place'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ft-btn" data-variant="ghost" onClick={() => setTransferOpen(true)}>
            <Icon name="swap" size={16} strokeWidth={2.5} />
            {t('accounts.transferBetween')}
          </button>
          <button className="ft-btn" data-variant="primary" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={16} strokeWidth={2.5} />
            {t('accounts.addAccount')}
          </button>
        </div>
      </div>

      <div className="acc-grid">
        {accounts.filter((a) => !archived.includes(a.id)).map((a) => {
          const lastTx = transactions.find((tx) => tx.account === a.id);
          return (
            <div key={a.id} className="acc-card"
                 style={{ background: `linear-gradient(135deg, ${a.colorA}, ${a.colorB})` }}
                 onClick={() => setEditing(a)}>
              <div className="acc-card-head">
                <div>
                  <div className="acc-card-name">{a.name}</div>
                  <div className="acc-card-num">{a.number}</div>
                </div>
                <div className="acc-card-icon">{a.icon}</div>
              </div>
              <div>
                <div className="acc-card-bal-label">{t('accounts.type')}: {t('accounts.type' + a.type.charAt(0).toUpperCase() + a.type.slice(1))}</div>
                <div className="acc-card-bal">{formatIDR(a.balance, { compact: false })}</div>
              </div>
              <div className="acc-card-foot">
                <span>{t('accounts.lastSync')}: {lastTx ? formatRelativeDate(lastTx.date, lang) : '—'}</span>
                <span>{a.currency}</span>
              </div>
            </div>
          );
        })}

        <button className="acc-add-card" onClick={() => setAddOpen(true)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" size={28} strokeWidth={2.5} />
            <span>{t('accounts.addAccount')}</span>
          </div>
        </button>
      </div>

      {archived.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <h3 className="dash-section-title">{t('accounts.archived')}</h3>
          <div className="acc-grid">
            {accounts.filter((a) => archived.includes(a.id)).map((a) => (
              <div key={a.id} className="acc-card" style={{ background: '#94a3b8', opacity: .6 }}>
                <div className="acc-card-head">
                  <div>
                    <div className="acc-card-name">{a.name}</div>
                    <div className="acc-card-num">{a.number}</div>
                  </div>
                  <div className="acc-card-icon">{a.icon}</div>
                </div>
                <button className="ft-btn" data-variant="ghost" data-size="sm" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,.18)', border: 0, color: 'white' }}
                        onClick={() => setArchived(archived.filter((id) => id !== a.id))}>
                  {t('accounts.restore')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add account modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)}
             title={t('accounts.addAccountTitle')}
             sub={lang === 'id' ? 'Bisa diubah kapan saja' : 'Edit anytime'}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" onClick={submitAdd}>{t('common.save')}</button>
               </>
             }>
        <div className="ob-field-group">
          <label className="ft-label">{t('accounts.type')}</label>
          <div className="ob-choice-grid">
            {[['bank','🏦','typeBank'],['cash','💵','typeCash'],['card','💳','typeCard'],['invest','📈','typeInvest']].map(([id,e,key]) => (
              <div key={id} className="ob-choice" data-active={aType === id} onClick={() => setAType(id)}>
                <div className="ob-choice-emoji">{e}</div>
                <div className="ob-choice-text">{t('accounts.' + key)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{t('onboarding.accountName')}</label>
          <input className="ft-input" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="BCA, GoPay, …" />
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{t('onboarding.accountBalance')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: '0 14px', height: 44, background: 'var(--ft-bg)', borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 700 }}>Rp</div>
            <input className="ft-input" inputMode="numeric"
                   value={aBal ? Number(aBal.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                   onChange={(e) => setABal(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{lang === 'id' ? 'Warna kartu' : 'Card color'}</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((preset, i) => (
              <button key={i}
                      onClick={() => setAColor(preset)}
                      style={{
                        width: 56, height: 38,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${preset[0]}, ${preset[1]})`,
                        border: aColor[0] === preset[0] ? '3px solid var(--ft-action)' : '3px solid transparent',
                        cursor: 'pointer',
                      }} />
            ))}
          </div>
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)}
             title={t('accounts.transferBetween')}
             sub={lang === 'id' ? 'Tercatat otomatis di kedua sisi' : 'Logged on both sides automatically'}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setTransferOpen(false)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" onClick={submitTransfer}>{t('common.save')}</button>
               </>
             }>
        <div className="qa-big-input">
          <span className="qa-big-input-prefix">Rp</span>
          <input inputMode="numeric" placeholder="0"
                 value={tAmt ? Number(tAmt.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                 onChange={(e) => setTAmt(e.target.value.replace(/\D/g, ''))} autoFocus />
        </div>
        <div className="qa-row-2">
          <div>
            <label className="ft-label">{lang === 'id' ? 'Dari' : 'From'}</label>
            <select className="ft-input" value={tFrom} onChange={(e) => setTFrom(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="ft-label">{lang === 'id' ? 'Ke' : 'To'}</label>
            <select className="ft-input" value={tTo} onChange={(e) => setTTo(e.target.value)}>
              {accounts.filter((a) => a.id !== tFrom).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit account modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
             title={editing?.name}
             sub={lang === 'id' ? 'Detail akun' : 'Account details'}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost"
                         style={{ color: 'var(--ft-danger)', marginRight: 'auto' }}
                         onClick={() => { setDeleting(editing); setDelConfirmText(''); setEditing(null); }}>
                   <Icon name="close" size={14} strokeWidth={2.5} />
                   {t('accounts.delete')}
                 </button>
                 <button className="ft-btn" data-variant="ghost"
                         onClick={() => { setArchived([...archived, editing.id]); setEditing(null); ToastBus.push(t('accounts.archived')); }}>
                   {t('accounts.archive')}
                 </button>
                 <button className="ft-btn" data-variant="primary" onClick={() => setEditing(null)}>{t('common.done')}</button>
               </>
             }>
        {editing && (
          <>
            <div className="acc-card" style={{
              background: `linear-gradient(135deg, ${editing.colorA}, ${editing.colorB})`,
              height: 'auto', marginBottom: 24,
            }}>
              <div className="acc-card-head">
                <div>
                  <div className="acc-card-name">{editing.name}</div>
                  <div className="acc-card-num">{editing.number}</div>
                </div>
                <div className="acc-card-icon">{editing.icon}</div>
              </div>
              <div style={{ marginTop: 18 }}>
                <div className="acc-card-bal-label">{t('dashboard.totalBalance')}</div>
                <div className="acc-card-bal">{formatIDR(editing.balance)}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ft-text-2)', fontWeight: 600, marginBottom: 8 }}>
              {lang === 'id' ? 'Transaksi terbaru' : 'Recent transactions'}
            </div>
            {transactions.filter((tx) => tx.account === editing.id || tx.toAccount === editing.id).slice(0, 4).map((tx) => {
              const cat = getCategory(tx.category);
              return (
                <div key={tx.id} className="tx-row" style={{ borderBottom: '1px solid var(--ft-border)' }}>
                  <div className="tx-icon" style={{ background: cat.color + '22', color: cat.color, width: 36, height: 36 }}>{cat.icon}</div>
                  <div className="tx-body">
                    <div className="tx-title">{tx.description}</div>
                    <div className="tx-meta">{formatRelativeDate(tx.date, lang)}</div>
                  </div>
                  <div className="tx-amt" style={{ color: tx.type === 'income' ? 'var(--ft-success)' : 'var(--ft-text)' }}>
                    {tx.type === 'income' ? '+' : '−'}{formatIDR(tx.amount, { compact: true })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Modal>

      {/* Delete account confirmation modal — destructive, requires typing the name */}
      <Modal open={!!deleting} onClose={() => { setDeleting(null); setDelConfirmText(''); }}
             title={t('accounts.deleteTitle')}
             sub={t('accounts.deleteWarning')}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost"
                         onClick={() => { setDeleting(null); setDelConfirmText(''); }}>
                   {t('common.cancel')}
                 </button>
                 <button className="ft-btn" data-variant="primary"
                         style={{ background: 'var(--ft-danger)' }}
                         disabled={delConfirmText !== deleting?.name}
                         onClick={() => {
                           dispatch({ type: 'DEL_ACCOUNT', id: deleting.id });
                           ToastBus.push(t('accounts.deleted'));
                           setDeleting(null);
                           setDelConfirmText('');
                         }}>
                   <Icon name="close" size={14} strokeWidth={2.5} />
                   {t('accounts.delete')}
                 </button>
               </>
             }>
        {deleting && (() => {
          const linkedTx = transactions.filter((tx) => tx.account === deleting.id || tx.toAccount === deleting.id);
          return (
            <>
              {/* preview card */}
              <div className="acc-card" style={{
                background: `linear-gradient(135deg, ${deleting.colorA}, ${deleting.colorB})`,
                height: 'auto', marginBottom: 20, padding: 18,
              }}>
                <div className="acc-card-head">
                  <div>
                    <div className="acc-card-name">{deleting.name}</div>
                    <div className="acc-card-num">{deleting.number}</div>
                  </div>
                  <div className="acc-card-icon">{deleting.icon}</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="acc-card-bal-label">{t('dashboard.totalBalance')}</div>
                  <div className="acc-card-bal" style={{ fontSize: 24 }}>{formatIDR(deleting.balance)}</div>
                </div>
              </div>

              {/* impact summary */}
              <div style={{
                padding: 16,
                background: 'var(--ft-danger-soft)',
                borderRadius: 14,
                marginBottom: 18,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <Icon name="warning" size={18} color="var(--ft-danger)" />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ft-danger)', fontSize: 13.5 }}>
                    {t('accounts.deleteWillRemove')}
                  </div>
                  {linkedTx.length > 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--ft-danger)', opacity: .85, marginTop: 4 }}>
                      <b style={{ fontFamily: 'var(--ft-font-display)', fontSize: 14 }}>{linkedTx.length}</b>{' '}
                      {t('accounts.deleteTxCount')}
                    </div>
                  )}
                </div>
              </div>

              {/* typed confirmation */}
              <div className="ob-field-group">
                <label className="ft-label">{t('accounts.deleteConfirmType')}</label>
                <input className="ft-input"
                       placeholder={deleting.name}
                       value={delConfirmText}
                       onChange={(e) => setDelConfirmText(e.target.value)}
                       autoFocus />
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
function Budgets({ state, dispatch, lang, t }) {
  const { budgets, transactions, categories } = state;
  const [addOpen, setAddOpen] = useState(false);
  const [tmpl, setTmpl] = useState('custom');
  const [bCat, setBCat] = useState('food');
  const [bLimit, setBLimit] = useState('');
  const [bPeriod, setBPeriod] = useState('monthly');
  const [delBudget, setDelBudget] = useState(null);

  // current month spent per category
  const spendByCat = useMemo(() => {
    const map = {};
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      if (new Date(tx.date).getTime() < startMonth) return;
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    });
    return map;
  }, [transactions]);

  const totalAllocated = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spendByCat[b.category] || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const onTrack = budgets.filter((b) => (spendByCat[b.category] || 0) / b.limit < 0.75).length;
  const warning = budgets.filter((b) => {
    const r = (spendByCat[b.category] || 0) / b.limit;
    return r >= 0.75 && r < 1;
  }).length;
  const over = budgets.filter((b) => (spendByCat[b.category] || 0) > b.limit).length;

  const submitAdd = () => {
    const limit = Number(bLimit.replace(/\D/g, ''));
    if (!limit) return;
    dispatch({ type: 'ADD_BUDGET', budget: { id: 'b' + Date.now(), category: bCat, limit, period: bPeriod } });
    setBLimit('');
    setAddOpen(false);
    ToastBus.push(lang === 'id' ? 'Anggaran dibuat' : 'Budget created');
  };

  // current day of month for projection marker
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  return (
    <div className="ft-fade-up">
      {/* hero card */}
      <div className="bd-allocated">
        <div className="bd-allocated-label">{t('budgets.allocateTotal')}</div>
        <div className="bd-allocated-num">{formatIDR(totalAllocated, { compact: true })}</div>
        <div className="bd-allocated-grid">
          <div>
            <div className="bd-allocated-stat-label">{t('budgets.spent')}</div>
            <div className="bd-allocated-stat-num">{formatIDR(totalSpent, { compact: true })}</div>
          </div>
          <div>
            <div className="bd-allocated-stat-label">{t('budgets.remaining')}</div>
            <div className="bd-allocated-stat-num" style={{ color: '#DFFB6E' }}>{formatIDR(totalRemaining, { compact: true })}</div>
          </div>
          <div>
            <div className="bd-allocated-stat-label">{t('budgets.onTrack')}</div>
            <div className="bd-allocated-stat-num">{onTrack}</div>
          </div>
          <div>
            <div className="bd-allocated-stat-label">{t('budgets.overBudget')}</div>
            <div className="bd-allocated-stat-num" style={{ color: '#F87171' }}>{over}</div>
          </div>
        </div>
      </div>

      <div className="tx-page-head">
        <div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('budgets.title')}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ft-text-2)', marginTop: 4 }}>
            {t('budgets.sub')}
          </div>
        </div>
        <button className="ft-btn" data-variant="primary" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={16} strokeWidth={2.5} />
          {t('budgets.newBudget')}
        </button>
      </div>

      <div className="bd-grid">
        {budgets.map((b) => {
          const cat = getCategory(b.category);
          const spent = spendByCat[b.category] || 0;
          const pct = (spent / b.limit) * 100;
          const tone = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'success';
          const barColor = tone === 'danger' ? 'var(--ft-danger)' : tone === 'warning' ? 'var(--ft-warning)' : cat.color;
          // project month-end
          const projected = (spent / Math.max(dayOfMonth, 1)) * daysInMonth;
          return (
            <div key={b.id} className="ft-card bd-card" style={{ position: 'relative' }}>
              <button className="bd-card-del" type="button"
                      aria-label={lang === 'id' ? 'Hapus anggaran' : 'Delete budget'}
                      onClick={() => setDelBudget(b)}>
                <Icon name="close" size={14} strokeWidth={2.5} />
              </button>
              <div className="bd-card-head">
                <div className="bd-card-icon" style={{ background: cat.color }}>{cat.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="bd-card-name">{lang === 'id' ? cat.label : cat.labelEn}</div>
                  <div className="bd-card-period">{lang === 'id' ? 'Bulanan' : 'Monthly'} · {formatIDR(b.limit, { compact: true })}</div>
                </div>
                <span className="bd-status-pill" data-tone={tone}>
                  {tone === 'danger' ? t('budgets.overBudget') : tone === 'warning' ? t('budgets.warning') : t('budgets.onTrack')}
                </span>
              </div>
              <div className="bd-bar-wrap">
                <div className="bd-bar-fill" style={{ width: Math.min(100, pct) + '%', background: barColor }} />
                <div className="bd-bar-marker" style={{ left: `${monthProgress * 100}%` }} title={lang === 'id' ? 'Hari ini' : 'Today'} />
              </div>
              <div className="bd-card-row">
                <span>{t('budgets.spent')}</span>
                <span>{formatIDR(spent, { compact: true })}</span>
              </div>
              <div className="bd-card-row">
                <span>{t('budgets.remaining')}</span>
                <span style={{ color: spent > b.limit ? 'var(--ft-danger)' : 'inherit' }}>
                  {formatIDR(b.limit - spent, { compact: true })}
                </span>
              </div>
              <div className="bd-card-row" style={{ borderTop: '1px solid var(--ft-border)', paddingTop: 12, marginTop: 12 }}>
                <span>{t('budgets.projected')}</span>
                <span style={{ color: projected > b.limit ? 'var(--ft-warning)' : 'var(--ft-success)' }}>
                  {formatIDR(projected, { compact: true })}
                </span>
              </div>
            </div>
          );
        })}

        <button className="acc-add-card" style={{ height: 'auto', padding: 32 }} onClick={() => setAddOpen(true)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" size={28} strokeWidth={2.5} />
            <span>{t('budgets.newBudget')}</span>
          </div>
        </button>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}
             title={t('budgets.newBudgetTitle')}
             sub={lang === 'id' ? 'Pakai template atau buat sendiri' : 'Use a template or roll your own'}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" onClick={submitAdd}>{t('common.save')}</button>
               </>
             }>
        <div className="ob-field-group">
          <label className="ft-label">{t('budgets.template')}</label>
          <div className="ob-choice-grid">
            {[
              ['custom',   '✏️', t('budgets.templateCustom')],
              ['5030',     '📐', t('budgets.template5030')],
              ['envelope', '✉️', t('budgets.templateEnvelope')],
            ].map(([id, e, lbl]) => (
              <div key={id} className="ob-choice" data-active={tmpl === id} onClick={() => setTmpl(id)}>
                <div className="ob-choice-emoji">{e}</div>
                <div className="ob-choice-text">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ob-field-group">
          <label className="ft-label">{t('budgets.categoryFor')}</label>
          <div className="qa-cats">
            {categories.filter((c) => c.id !== 'income' && c.id !== 'transfer').map((c) => (
              <button key={c.id} className="qa-cat"
                      data-active={bCat === c.id}
                      onClick={() => setBCat(c.id)}>
                <span className="qa-cat-emoji">{c.icon}</span>
                <span className="qa-cat-label">{lang === 'id' ? c.label : c.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="qa-row-2">
          <div>
            <label className="ft-label">{t('budgets.limit')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '0 14px', height: 44, background: 'var(--ft-bg)', borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 700 }}>Rp</div>
              <input className="ft-input" inputMode="numeric"
                     value={bLimit ? Number(bLimit.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                     onChange={(e) => setBLimit(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div>
            <label className="ft-label">{t('budgets.period')}</label>
            <select className="ft-input" value={bPeriod} onChange={(e) => setBPeriod(e.target.value)}>
              <option value="monthly">{t('budgets.periodMonthly')}</option>
              <option value="weekly">{t('budgets.periodWeekly')}</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete budget confirmation */}
      <Modal open={!!delBudget} onClose={() => setDelBudget(null)}
             title={lang === 'id' ? 'Hapus anggaran?' : 'Delete budget?'}
             sub={lang === 'id' ? 'Anggaran akan dihapus permanen. Transaksi tidak terpengaruh.' : "Budget will be removed. Transactions are kept."}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setDelBudget(null)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }}
                         onClick={() => {
                           dispatch({ type: 'DEL_BUDGET', id: delBudget.id });
                           ToastBus.push(lang === 'id' ? 'Anggaran dihapus' : 'Budget deleted');
                           setDelBudget(null);
                         }}>
                   <Icon name="close" size={14} strokeWidth={2.5} />
                   {t('common.delete')}
                 </button>
               </>
             }>
        {delBudget && (() => {
          const cat = getCategory(delBudget.category);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--ft-bg)', borderRadius: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: cat.color, display: 'grid', placeItems: 'center', fontSize: 19, color: 'white' }}>{cat.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--ft-font-display)' }}>{lang === 'id' ? cat.label : cat.labelEn}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ft-text-3)', fontWeight: 600 }}>{lang === 'id' ? 'Batas' : 'Limit'}: {formatIDR(delBudget.limit, { compact: true })} / {lang === 'id' ? 'bulan' : 'month'}</div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

Object.assign(window, { Accounts, Budgets });

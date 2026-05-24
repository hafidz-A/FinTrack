// FinTrack — Transactions module + QuickAddTx modal.

function Transactions({ state, dispatch, lang, t, search, onOpenAdd }) {
  const { transactions, accounts, categories } = state;
  const [filter, setFilter] = useState('all'); // all | income | expense | transfer
  const [catFilter, setCatFilter] = useState(null);

  // search + filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (catFilter && tx.category !== catFilter) return false;
      if (q && !tx.description.toLowerCase().includes(q) &&
          !(tx.tags || []).some((tag) => tag.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [transactions, search, filter, catFilter]);

  // group by day
  const grouped = useMemo(() => {
    const out = {};
    filtered.forEach((tx) => {
      const d = new Date(tx.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      (out[key] = out[key] || []).push(tx);
    });
    return Object.entries(out).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // month totals
  const monthStats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let income = 0, expense = 0;
    transactions.forEach((tx) => {
      const d = new Date(tx.date).getTime();
      if (d < startMonth) return;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    });
    return { income, expense, net: income - expense, count: transactions.filter((tx) => new Date(tx.date).getTime() >= startMonth).length };
  }, [transactions]);

  const [delTarget, setDelTarget] = useState(null);

  const onDelete = () => {
    dispatch({ type: 'DEL_TX', id: delTarget.id });
    ToastBus.push(t('transactions.txDeleted'));
    setDelTarget(null);
  };

  return (
    <div className="ft-fade-up">
      {/* summary row */}
      <div className="tx-summary-row">
        <div className="ft-card tx-summary">
          <div className="tx-summary-label">
            <Icon name="arrowDownLeft" size={16} color="var(--ft-success)" />
            {t('dashboard.income')} · {t('common.thisMonth')}
          </div>
          <div className="tx-summary-num" style={{ color: 'var(--ft-success)' }}>
            +{formatIDR(monthStats.income, { compact: true })}
          </div>
          <div className="tx-summary-delta">{monthStats.count} {lang === 'id' ? 'transaksi' : 'transactions'}</div>
        </div>
        <div className="ft-card tx-summary">
          <div className="tx-summary-label">
            <Icon name="arrowUpRight" size={16} color="var(--ft-danger)" />
            {t('dashboard.expense')} · {t('common.thisMonth')}
          </div>
          <div className="tx-summary-num">
            −{formatIDR(monthStats.expense, { compact: true })}
          </div>
          <div className="tx-summary-delta">{lang === 'id' ? 'Rata-rata' : 'Avg'} {formatIDR(monthStats.expense / Math.max(new Date().getDate(), 1), { compact: true })}/{lang === 'id' ? 'hari' : 'day'}</div>
        </div>
        <div className="ft-card tx-summary" style={{
          background: 'linear-gradient(135deg, #1E3A5F, #2563EB)', color: 'white', border: 0, position: 'relative', overflow: 'hidden',
        }}>
          <div className="tx-summary-label" style={{ color: 'rgba(255,255,255,.8)' }}>
            <Icon name="trending" size={16} />
            {t('transactions.net')} · {t('common.thisMonth')}
          </div>
          <div className="tx-summary-num">
            {formatIDR(monthStats.net, { compact: true, sign: true })}
          </div>
          <div className="tx-summary-delta" style={{ color: '#DFFB6E' }}>
            ▲ {monthStats.income > 0 ? Math.round((monthStats.net / monthStats.income) * 100) : 0}% {lang === 'id' ? 'savings rate' : 'savings rate'}
          </div>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(223,251,110,.3), transparent 65%)',
            borderRadius: '50%',
          }} />
        </div>
      </div>

      <div className="tx-page-head">
        <div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('transactions.title')}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ft-text-2)', marginTop: 4 }}>
            {filtered.length} {lang === 'id' ? 'hasil' : 'results'}
          </div>
        </div>
        <button className="ft-btn" data-variant="primary" onClick={() => onOpenAdd('expense')}>
          <Icon name="plus" size={16} strokeWidth={2.5} />
          {t('transactions.newTransaction')}
        </button>
      </div>

      {/* filters */}
      <div className="tx-filters">
        {[
          ['all', t('transactions.filterAll')],
          ['income', t('transactions.typeIncome')],
          ['expense', t('transactions.typeExpense')],
          ['transfer', t('transactions.typeTransfer')],
        ].map(([id, lbl]) => (
          <button key={id} className="tx-chip" data-active={filter === id} onClick={() => setFilter(id)}>
            {lbl}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--ft-border)', margin: '0 4px' }} />
        <button className="tx-chip" data-active={!catFilter} onClick={() => setCatFilter(null)}>
          {lang === 'id' ? 'Semua kategori' : 'All categories'}
        </button>
        {categories.filter((c) => c.id !== 'income' && c.id !== 'transfer').slice(0, 6).map((c) => (
          <button key={c.id} className="tx-chip" data-active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>
            <span>{c.icon}</span>
            <span>{lang === 'id' ? c.label : c.labelEn}</span>
          </button>
        ))}
      </div>

      {/* table */}
      <div className="tx-table">
        <div className="tx-table-row" data-head="true">
          <span></span>
          <span>{t('transactions.description')}</span>
          <span className="col-date">{t('transactions.date')}</span>
          <span>{t('transactions.category')}</span>
          <span style={{ textAlign: 'right' }}>{t('transactions.amount')}</span>
          <span className="col-menu"></span>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ft-text-2)' }}>
            <Icon name="search" size={32} />
            <div style={{ marginTop: 12, fontWeight: 600 }}>{t('transactions.noResults')}</div>
          </div>
        )}
        {grouped.map(([dayKey, txs]) => (
          <React.Fragment key={dayKey}>
            <div className="tx-day-divider">
              {(() => {
                const d = new Date(dayKey);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const dayDiff = Math.floor((today - d) / 86400000);
                if (dayDiff === 0) return t('common.today');
                if (dayDiff === 1) return t('common.yesterday');
                return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
              })()}
              {' · '}
              <span style={{ color: 'var(--ft-text-2)' }}>
                {(() => {
                  const sum = txs.reduce((acc, tx) => acc + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0), 0);
                  return formatIDR(sum, { sign: true, compact: true });
                })()}
              </span>
            </div>
            {txs.map((tx) => {
              const cat = getCategory(tx.category);
              const acc = getAccount(tx.account, accounts);
              const toAcc = tx.toAccount ? getAccount(tx.toAccount, accounts) : null;
              return (
                <div key={tx.id} className="tx-table-row">
                  <div className="tx-table-icon" style={{ background: cat.color }}>
                    {cat.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tx-table-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.description}
                    </div>
                    <div className="tx-table-desc">
                      {acc?.name}{toAcc ? ` → ${toAcc.name}` : ''}
                      {(tx.tags || []).slice(0, 2).map((tag, i) => (
                        <span key={i} style={{
                          marginLeft: 6,
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: 'var(--ft-bg)',
                          color: 'var(--ft-text-2)',
                          fontSize: 10.5,
                          fontWeight: 600,
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="col-date" style={{ fontSize: 13, color: 'var(--ft-text-2)' }}>
                    {new Date(tx.date).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <span className="ft-pill" style={{ background: cat.color + '22', color: cat.color }}>
                      {lang === 'id' ? cat.label : cat.labelEn}
                    </span>
                  </div>
                  <div className="tx-table-amt" style={{
                    color: tx.type === 'income' ? 'var(--ft-success)' :
                           tx.type === 'expense' ? 'var(--ft-text)' :
                           'var(--ft-text-2)',
                  }}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                    {formatIDR(tx.amount, { compact: true })}
                  </div>
                  <button className="tx-table-menu col-menu" onClick={() => setDelTarget(tx)} aria-label={lang === 'id' ? 'Hapus transaksi' : 'Delete transaction'} title={lang === 'id' ? 'Hapus' : 'Delete'}>
                    <Icon name="trash" size={15} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)}
             title={t('transactions.askDelete')} sub={t('transactions.cantUndo')}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setDelTarget(null)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }} onClick={onDelete}>
                   {t('common.delete')}
                 </button>
               </>
             }>
        {delTarget && (
          <div style={{ background: 'var(--ft-bg)', padding: 16, borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="tx-table-icon" style={{ background: getCategory(delTarget.category).color }}>{getCategory(delTarget.category).icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{delTarget.description}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ft-text-3)' }}>{formatRelativeDate(delTarget.date, lang)}</div>
            </div>
            <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700 }}>
              {delTarget.type === 'income' ? '+' : '−'}{formatIDR(delTarget.amount, { compact: true })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── QuickAddTx Modal ────────────────────────────────────────────────────────
function QuickAddTx({ open, onClose, onSave, initialType = 'expense', lang, t, accounts, categories }) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [account, setAccount] = useState(accounts[0]?.id);
  const [toAccount, setToAccount] = useState(accounts[1]?.id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState('none');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setType(initialType);
      setAmount(''); setDescription(''); setError('');
      setCategory(initialType === 'income' ? 'income' : initialType === 'transfer' ? 'transfer' : 'food');
    }
  }, [open, initialType]);

  const submit = () => {
    const amt = Number(amount.replace(/\D/g, ''));
    if (!amt || amt <= 0) { setError(lang === 'id' ? 'Nominal wajib diisi' : 'Amount is required'); return; }
    if (!description.trim()) { setError(lang === 'id' ? 'Deskripsi wajib diisi' : 'Description required'); return; }
    onSave({
      id: 't' + Date.now(),
      type,
      amount: amt,
      category: type === 'transfer' ? 'transfer' : category,
      account,
      toAccount: type === 'transfer' ? toAccount : undefined,
      date: new Date(date + 'T' + new Date().toTimeString().slice(0,5)).toISOString(),
      description,
      tags: recurring !== 'none' ? ['recurring'] : [],
    });
    onClose();
  };

  const availCats = categories.filter((c) =>
    type === 'income' ? c.id === 'income' :
    type === 'transfer' ? c.id === 'transfer' :
    c.id !== 'income' && c.id !== 'transfer'
  );

  return (
    <Modal open={open} onClose={onClose}
           title={t('transactions.newTransaction')}
           sub={lang === 'id' ? 'Catat dalam < 30 detik' : 'Log it in under 30 seconds'}
           size="md"
           footer={
             <>
               <button className="ft-btn" data-variant="ghost" onClick={onClose}>{t('common.cancel')}</button>
               <button className="ft-btn" data-variant="primary" onClick={submit}>
                 <Icon name="check" size={16} strokeWidth={2.5} />
                 {t('transactions.saveTx')}
               </button>
             </>
           }>
      {/* type segmented */}
      <div className="qa-types">
        {['expense', 'income', 'transfer'].map((typ) => (
          <button key={typ} className="qa-type-btn"
                  data-active={type === typ} data-type={typ}
                  onClick={() => { setType(typ); setCategory(typ === 'income' ? 'income' : typ === 'transfer' ? 'transfer' : 'food'); }}>
            <Icon name={typ === 'income' ? 'arrowDownLeft' : typ === 'expense' ? 'arrowUpRight' : 'swap'} size={14} strokeWidth={2.5} />
            {t(`transactions.type${typ.charAt(0).toUpperCase() + typ.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* big amount input */}
      <div className="qa-big-input">
        <span className="qa-big-input-prefix">Rp</span>
        <input inputMode="numeric" placeholder="0"
               value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
               onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
               autoFocus />
      </div>

      {/* category picker */}
      {type !== 'transfer' && (
        <>
          <div className="ft-label">{t('transactions.category')}</div>
          <div className="qa-cats">
            {availCats.map((c) => (
              <button key={c.id} className="qa-cat"
                      data-active={category === c.id}
                      onClick={() => setCategory(c.id)}>
                <span className="qa-cat-emoji">{c.icon}</span>
                <span className="qa-cat-label">{lang === 'id' ? c.label : c.labelEn}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* row 2 — account, date */}
      <div className="qa-row-2">
        <div>
          <label className="ft-label">{type === 'transfer' ? (lang === 'id' ? 'Dari akun' : 'From account') : t('transactions.account')}</label>
          <select className="ft-input" value={account} onChange={(e) => setAccount(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {type === 'transfer' ? (
          <div>
            <label className="ft-label">{lang === 'id' ? 'Ke akun' : 'To account'}</label>
            <select className="ft-input" value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
              {accounts.filter((a) => a.id !== account).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="ft-label">{t('transactions.date')}</label>
            <input type="date" className="ft-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}
      </div>

      <div>
        <label className="ft-label">{t('transactions.description')}</label>
        <input className="ft-input" placeholder={lang === 'id' ? 'Sate Khas Senayan…' : 'Lunch at Senayan…'}
               value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--ft-text-2)', fontWeight: 600 }}>{t('transactions.recurring')}:</span>
        {['none', 'weekly', 'monthly'].map((r) => (
          <button key={r} className="tx-chip" data-active={recurring === r} onClick={() => setRecurring(r)}>
            {r === 'none' ? t('transactions.recurringNone') :
             r === 'weekly' ? t('transactions.recurringWeekly') :
             t('transactions.recurringMonthly')}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--ft-danger-soft)', color: 'var(--ft-danger)', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { Transactions, QuickAddTx });

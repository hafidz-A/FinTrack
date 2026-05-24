// FinTrack — Reports & Analytics module.
// Tabs: Profit & Loss · Cashflow · Category · Month-over-month comparison.

const INDO_HOLIDAYS_2026 = {
  "2026-01-01": { labelId: "Tahun Baru Masehi", labelEn: "New Year's Day", type: "national" },
  "2026-01-16": { labelId: "Isra Mi'raj", labelEn: "Isra Mi'raj", type: "national" },
  "2026-02-16": { labelId: "Cuti Bersama Imlek", labelEn: "Chinese New Year Collective Leave", type: "cuti" },
  "2026-02-17": { labelId: "Tahun Baru Imlek", labelEn: "Chinese New Year", type: "national" },
  "2026-03-18": { labelId: "Cuti Bersama Nyepi", labelEn: "Nyepi Collective Leave", type: "cuti" },
  "2026-03-19": { labelId: "Hari Raya Nyepi", labelEn: "Hari Raya Nyepi", type: "national" },
  "2026-03-20": { labelId: "Cuti Bersama Nyepi", labelEn: "Nyepi Collective Leave", type: "cuti" },
  "2026-03-21": { labelId: "Hari Raya Idul Fitri", labelEn: "Idul Fitri Day 1", type: "national" },
  "2026-03-22": { labelId: "Hari Raya Idul Fitri", labelEn: "Idul Fitri Day 2", type: "national" },
  "2026-03-23": { labelId: "Cuti Bersama Idul Fitri", labelEn: "Idul Fitri Collective Leave", type: "cuti" },
  "2026-03-24": { labelId: "Cuti Bersama Idul Fitri", labelEn: "Idul Fitri Collective Leave", type: "cuti" },
  "2026-04-03": { labelId: "Wafat Yesus Kristus", labelEn: "Good Friday", type: "national" },
  "2026-04-05": { labelId: "Kebangkitan Yesus Kristus (Paskah)", labelEn: "Easter Sunday", type: "national" },
  "2026-05-01": { labelId: "Hari Buruh Internasional", labelEn: "Labour Day", type: "national" },
  "2026-05-14": { labelId: "Kenaikan Yesus Kristus", labelEn: "Ascension Day of Jesus", type: "national" },
  "2026-05-15": { labelId: "Cuti Bersama Kenaikan Yesus", labelEn: "Ascension Collective Leave", type: "cuti" },
  "2026-05-27": { labelId: "Hari Raya Idul Adha", labelEn: "Idul Adha", type: "national" },
  "2026-05-28": { labelId: "Cuti Bersama Idul Adha", labelEn: "Idul Adha Collective Leave", type: "cuti" },
  "2026-05-31": { labelId: "Hari Raya Waisak", labelEn: "Waisak Day", type: "national" },
  "2026-06-01": { labelId: "Hari Lahir Pancasila", labelEn: "Pancasila Day", type: "national" },
  "2026-06-16": { labelId: "Tahun Baru Islam", labelEn: "Islamic New Year", type: "national" },
  "2026-08-17": { labelId: "Hari Kemerdekaan RI", labelEn: "Independence Day", type: "national" },
  "2026-08-25": { labelId: "Maulid Nabi Muhammad SAW", labelEn: "Mawlid", type: "national" },
  "2026-12-24": { labelId: "Cuti Bersama Natal", labelEn: "Christmas Collective Leave", type: "cuti" },
  "2026-12-25": { labelId: "Hari Raya Natal", labelEn: "Christmas Day", type: "national" }
};

const getActualPayday = (year, month, targetDay, includeCuti, exceptionMode) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const actualTargetDay = Math.min(targetDay, lastDay);
  let current = new Date(year, month, actualTargetDay);

  const checkIfHoliday = (d) => {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true; // weekend
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const hol = INDO_HOLIDAYS_2026[key];
    if (hol) {
      if (hol.type === 'national') return true;
      if (includeCuti && hol.type === 'cuti') return true;
    }
    return false;
  };

  let loops = 0;
  while (checkIfHoliday(current) && loops < 30) {
    if (exceptionMode === 'before') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    loops++;
  }
  return current;
};

function Reports({ state, lang, t, chartStyle, onExportExcel, onExportCsv, settings = {}, onUpdateSetting }) {
  const { transactions, categories } = state;
  const [period, setPeriod] = useState('month'); // month | last | 3m | 6m | year
  const [tab, setTab] = useState('pl'); // pl | cashflow | category | comparison | calendar

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDayTxs, setSelectedDayTxs] = useState(null);

  // Compute date range for the active period
  const range = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    if (period === 'month') start.setDate(1);
    else if (period === 'last') {
      start.setMonth(start.getMonth() - 1, 1);
      now.setDate(0);
    }
    else if (period === '3m') start.setMonth(start.getMonth() - 3);
    else if (period === '6m') start.setMonth(start.getMonth() - 6);
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1);
    return { start, end: now };
  }, [period]);

  // Filtered transactions
  const filtered = useMemo(() =>
    transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= range.start && d <= range.end;
    }),
    [transactions, range]
  );

  // Aggregates
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    filtered.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      if (tx.type === 'expense') expense += tx.amount;
    });
    return { income, expense, net: income - expense };
  }, [filtered]);

  const byCategory = useMemo(() => {
    const m = {};
    filtered.forEach((tx) => {
      if (tx.type !== 'expense') return;
      m[tx.category] = (m[tx.category] || 0) + tx.amount;
    });
    return Object.entries(m)
      .map(([id, amt]) => ({ category: getCategory(id), amount: amt }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const incomeByCategory = useMemo(() => {
    const m = {};
    filtered.forEach((tx) => {
      if (tx.type !== 'income') return;
      m[tx.category] = (m[tx.category] || 0) + tx.amount;
    });
    return Object.entries(m)
      .map(([id, amt]) => ({ category: getCategory(id), amount: amt }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  // Month-over-month: last 6 months
  const monthBuckets = useMemo(() => {
    const out = [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 5; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      let income = 0, expense = 0;
      transactions.forEach((tx) => {
        const d = new Date(tx.date);
        if (d < dStart || d >= dEnd) return;
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expense += tx.amount;
      });
      out.push({
        label: dStart.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'short' }),
        income, expense,
      });
    }
    return out;
  }, [transactions, lang]);

  // Daily cashflow for chart over the active period
  const cashflowData = useMemo(() => {
    const days = Math.ceil((range.end - range.start) / 86400000) + 1;
    const limited = Math.min(days, 90);
    const stepMs = (range.end - range.start) / Math.max(limited - 1, 1);
    const arr = Array.from({ length: limited }).map((_, i) => ({
      day: new Date(range.start.getTime() + i * stepMs),
      income: 0, expense: 0,
    }));
    filtered.forEach((tx) => {
      const d = new Date(tx.date);
      const idx = Math.min(limited - 1, Math.floor((d - range.start) / stepMs));
      if (idx < 0) return;
      if (tx.type === 'income') arr[idx].income += tx.amount;
      if (tx.type === 'expense') arr[idx].expense += tx.amount;
    });
    return arr;
  }, [filtered, range]);

  const totalExp = totals.expense || 1;
  const savingsRate = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : 0;
  const dayCount = Math.max(1, Math.ceil((range.end - range.start) / 86400000));

  const periodLabel = {
    month: t('reports.periodMonth'),
    last: t('reports.periodLast'),
    '3m': t('reports.period3m'),
    '6m': t('reports.period6m'),
    year: t('reports.periodYear'),
  };

  // Calendar logic parameters
  const calIncludeCuti = settings.calendarIncludeCuti !== false;
  const calPayday = settings.calendarPayday ?? 25;
  const calPaydayException = settings.calendarPaydayException ?? 'before';

  const actualPaydayDate = useMemo(() => {
    return getActualPayday(currentYear, currentMonth, calPayday, calIncludeCuti, calPaydayException);
  }, [currentYear, currentMonth, calPayday, calIncludeCuti, calPaydayException]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getMonthName = (m, l) => {
    const idNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const enNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return l === 'id' ? idNames[m] : enNames[m];
  };

  const gridCells = useMemo(() => {
    const cells = [];
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const checkIfHoliday = (d) => {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const hol = INDO_HOLIDAYS_2026[key];
      if (hol) {
        if (hol.type === 'national') return true;
        if (calIncludeCuti && hol.type === 'cuti') return true;
      }
      return false;
    };

    const getHoliday = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const hol = INDO_HOLIDAYS_2026[key];
      if (hol) {
        if (hol.type === 'national') return hol;
        if (calIncludeCuti && hol.type === 'cuti') return hol;
      }
      return null;
    };

    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevDaysInMonth - i;
      const cellDate = new Date(currentYear, currentMonth - 1, day);
      cells.push({
        day,
        isCurrentMonth: false,
        date: cellDate,
        isHoliday: checkIfHoliday(cellDate),
        holidayInfo: getHoliday(cellDate),
        income: 0,
        expense: 0,
        txList: []
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(currentYear, currentMonth, i);
      const isActualPayday = cellDate.getFullYear() === actualPaydayDate.getFullYear() &&
                             cellDate.getMonth() === actualPaydayDate.getMonth() &&
                             cellDate.getDate() === actualPaydayDate.getDate();

      const dayTxs = transactions.filter((tx) => {
        const txD = new Date(tx.date);
        return txD.getFullYear() === currentYear &&
               txD.getMonth() === currentMonth &&
               txD.getDate() === i;
      });

      const dayInc = dayTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
      const dayExp = dayTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

      cells.push({
        day: i,
        isCurrentMonth: true,
        date: cellDate,
        isHoliday: checkIfHoliday(cellDate),
        holidayInfo: getHoliday(cellDate),
        isActualPayday,
        income: dayInc,
        expense: dayExp,
        txList: dayTxs
      });
    }

    // Next month days
    const totalCells = cells.length;
    const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      const cellDate = new Date(currentYear, currentMonth + 1, i);
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: cellDate,
        isHoliday: checkIfHoliday(cellDate),
        holidayInfo: getHoliday(cellDate),
        income: 0,
        expense: 0,
        txList: []
      });
    }

    return cells;
  }, [currentYear, currentMonth, actualPaydayDate, transactions, calIncludeCuti]);

  return (
    <div className="ft-fade-up">
      <div className="rp-head">
        <div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('reports.title')}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ft-text-2)', marginTop: 4 }}>{t('reports.sub')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ft-btn" data-variant="ghost" data-size="sm"
                  onClick={onExportCsv}>
            <Icon name="download" size={14} strokeWidth={2.5} />
            {t('reports.exportCSV')}
          </button>
          <button className="ft-btn" data-variant="ghost" data-size="sm"
                  onClick={() => onExportExcel && onExportExcel()}>
            <Icon name="download" size={14} strokeWidth={2.5} />
            {t('reports.exportExcel')}
          </button>
          <button className="ft-btn" data-variant="primary" data-size="sm"
                  onClick={() => ToastBus.push(lang === 'id' ? 'PDF diunduh' : 'PDF downloaded')}>
            <Icon name="download" size={14} strokeWidth={2.5} />
            {t('reports.exportPDF')}
          </button>
        </div>
      </div>

      {/* Period chips */}
      {tab !== 'calendar' && (
        <div className="rp-period-row">
          {[
            ['month', t('reports.periodMonth')],
            ['last', t('reports.periodLast')],
            ['3m', t('reports.period3m')],
            ['6m', t('reports.period6m')],
            ['year', t('reports.periodYear')],
          ].map(([id, lbl]) => (
            <button key={id} className="tx-chip" data-active={period === id} onClick={() => setPeriod(id)}>
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      {tab !== 'calendar' && (
        <div className="rp-summary">
          <div className="rp-summary-card">
            <div className="rp-summary-label">
              <Icon name="arrowDownLeft" size={14} color="var(--ft-success)" />
              {t('reports.totalIncome')}
            </div>
            <div className="rp-summary-num" style={{ color: 'var(--ft-success)' }}>
              +{formatIDR(totals.income, { compact: true })}
            </div>
            <div className="rp-summary-delta" style={{ color: 'var(--ft-text-3)' }}>{periodLabel[period]}</div>
          </div>
          <div className="rp-summary-card">
            <div className="rp-summary-label">
              <Icon name="arrowUpRight" size={14} color="var(--ft-danger)" />
              {t('reports.totalExpense')}
            </div>
            <div className="rp-summary-num">−{formatIDR(totals.expense, { compact: true })}</div>
            <div className="rp-summary-delta" style={{ color: 'var(--ft-text-3)' }}>
              {t('reports.avgPerDay')}: {formatIDR(totals.expense / dayCount, { compact: true })}
            </div>
          </div>
          <div className="rp-summary-card">
            <div className="rp-summary-label">
              <Icon name="trending" size={14} color="var(--ft-action)" />
              {t('reports.netIncome')}
            </div>
            <div className="rp-summary-num" style={{ color: totals.net >= 0 ? 'var(--ft-success)' : 'var(--ft-danger)' }}>
              {formatIDR(totals.net, { compact: true, sign: true })}
            </div>
            <div className="rp-summary-delta" style={{ color: 'var(--ft-text-3)' }}>
              {byCategory[0]?.category ? `${t('reports.topCategory')}: ${lang === 'id' ? byCategory[0].category.label : byCategory[0].category.labelEn}` : '—'}
            </div>
          </div>
          <div className="rp-summary-card" data-tone="primary">
            <div className="rp-summary-label">
              <Icon name="sparkles" size={14} color="white" fill="white" />
              {t('reports.savingsRate')}
            </div>
            <div className="rp-summary-num">{savingsRate}%</div>
            <div className="rp-summary-delta" style={{ color: '#DFFB6E' }}>
              {savingsRate >= 20 ? (lang === 'id' ? '✓ Sangat baik' : '✓ Excellent') :
               savingsRate >= 10 ? (lang === 'id' ? 'Cukup baik' : 'Decent') :
               (lang === 'id' ? 'Coba tingkatkan' : 'Could be better')}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tx-filters" style={{ marginBottom: 20 }}>
        {[
          ['pl', t('reports.tabPL')],
          ['cashflow', t('reports.tabCashflow')],
          ['category', t('reports.tabCategory')],
          ['comparison', t('reports.tabComparison')],
          ['calendar', t('reports.tabCalendar')],
        ].map(([id, lbl]) => (
          <button key={id} className="tx-chip" data-active={tab === id} onClick={() => setTab(id)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* P&L tab */}
      {tab === 'pl' && (
        <div className="rp-grid">
          <div className="ft-card rp-card">
            <div className="rp-card-head">
              <div className="rp-card-title">{t('reports.tabPL')}</div>
              <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{periodLabel[period]}</div>
            </div>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--ft-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('dashboard.income')}
            </div>
            {incomeByCategory.length === 0 && (
              <div className="rp-pl-row" data-sub="true">— {t('reports.noData')}</div>
            )}
            {incomeByCategory.map((row, i) => (
              <div key={i} className="rp-pl-row" data-sub="true">
                <span>{lang === 'id' ? row.category.label : row.category.labelEn}</span>
                <span className="rp-pl-amt" style={{ color: 'var(--ft-success)' }}>+{formatIDR(row.amount, { compact: true })}</span>
              </div>
            ))}
            <div className="rp-pl-row">
              <span style={{ fontWeight: 600 }}>{t('reports.totalIncome')}</span>
              <span className="rp-pl-amt" style={{ fontWeight: 700, color: 'var(--ft-success)' }}>
                +{formatIDR(totals.income, { compact: true })}
              </span>
            </div>

            <div style={{ marginTop: 24, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--ft-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('dashboard.expense')}
            </div>
            {byCategory.length === 0 && (
              <div className="rp-pl-row" data-sub="true">— {t('reports.noData')}</div>
            )}
            {byCategory.map((row, i) => (
              <div key={i} className="rp-pl-row" data-sub="true">
                <span>{lang === 'id' ? row.category.label : row.category.labelEn}</span>
                <span className="rp-pl-amt">−{formatIDR(row.amount, { compact: true })}</span>
              </div>
            ))}
            <div className="rp-pl-row">
              <span style={{ fontWeight: 600 }}>{t('reports.totalExpense')}</span>
              <span className="rp-pl-amt" style={{ fontWeight: 700 }}>−{formatIDR(totals.expense, { compact: true })}</span>
            </div>

            <div className="rp-pl-row" data-total="true">
              <span>{t('reports.netIncome')}</span>
              <span className="rp-pl-amt" style={{ color: totals.net >= 0 ? 'var(--ft-success)' : 'var(--ft-danger)' }}>
                {formatIDR(totals.net, { compact: true, sign: true })}
              </span>
            </div>
          </div>

          <div className="ft-card rp-card">
            <div className="rp-card-head">
              <div className="rp-card-title">{t('reports.breakdownTitle')}</div>
            </div>
            <DonutChart data={byCategory} total={totalExp} lang={lang} />
          </div>
        </div>
      )}

      {/* Cashflow tab */}
      {tab === 'cashflow' && (
        <div className="ft-card rp-card">
          <div className="rp-card-head">
            <div className="rp-card-title">{t('reports.tabCashflow')}</div>
            <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{periodLabel[period]}</div>
          </div>
          <CashflowChart data={cashflowData} style={chartStyle || 'area'} lang={lang} />
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ padding: 14, background: 'var(--ft-success-soft)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ft-success)', fontWeight: 700 }}>{t('reports.totalIncome')}</div>
              <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, marginTop: 4, color: 'var(--ft-success)' }}>
                +{formatIDR(totals.income, { compact: true })}
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--ft-action-soft)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ft-action)', fontWeight: 700 }}>{t('reports.totalExpense')}</div>
              <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, marginTop: 4, color: 'var(--ft-action)' }}>
                −{formatIDR(totals.expense, { compact: true })}
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--ft-bg)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ft-text-2)', fontWeight: 700 }}>{t('reports.netIncome')}</div>
              <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, marginTop: 4 }}>
                {formatIDR(totals.net, { compact: true, sign: true })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category tab */}
      {tab === 'category' && (
        <div className="rp-grid">
          <div className="ft-card rp-card">
            <div className="rp-card-head">
              <div className="rp-card-title">{t('reports.breakdownTitle')}</div>
              <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{byCategory.length} {lang === 'id' ? 'kategori' : 'categories'}</div>
            </div>
            {byCategory.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ft-text-3)' }}>{t('reports.noData')}</div>
            )}
            {byCategory.map((row, i) => {
              const pct = (row.amount / totalExp) * 100;
              return (
                <div key={i} className="rp-cat-row">
                  <div className="rp-cat-emoji" style={{ background: row.category.color }}>{row.category.icon}</div>
                  <div className="rp-cat-info">
                    <div className="rp-cat-name">{lang === 'id' ? row.category.label : row.category.labelEn}</div>
                    <div className="rp-cat-bar"><div style={{ width: pct + '%', background: row.category.color }} /></div>
                  </div>
                  <div className="rp-cat-amt">{formatIDR(row.amount, { compact: true })}</div>
                  <div className="rp-cat-pct">{Math.round(pct)}%</div>
                </div>
              );
            })}
          </div>
          <div className="ft-card rp-card">
            <div className="rp-card-head">
              <div className="rp-card-title">{lang === 'id' ? 'Visualisasi' : 'Visualization'}</div>
            </div>
            <DonutChart data={byCategory} total={totalExp} lang={lang} />
          </div>
        </div>
      )}

      {/* Comparison tab */}
      {tab === 'comparison' && (
        <div className="ft-card rp-card">
          <div className="rp-card-head">
            <div className="rp-card-title">{t('reports.monthOverMonth')}</div>
            <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{lang === 'id' ? '6 bulan terakhir' : 'Last 6 months'}</div>
          </div>
          <MoMChart data={monthBuckets} lang={lang} />
        </div>
      )}

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controls & Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="ft-btn" data-variant="ghost" style={{ padding: '8px 12px' }} onClick={prevMonth}>
                <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <span style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 20, minWidth: 150, textAlign: 'center' }}>
                {getMonthName(currentMonth, lang)} {currentYear}
              </span>
              <button type="button" className="ft-btn" data-variant="ghost" style={{ padding: '8px 12px' }} onClick={nextMonth}>
                <Icon name="arrowRight" size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={calIncludeCuti} onChange={(e) => onUpdateSetting && onUpdateSetting('calendarIncludeCuti', e.target.checked)} />
                {lang === 'id' ? 'Sertakan Cuti Bersama' : 'Include Cuti Bersama'}
              </label>
            </div>
          </div>

          {/* Payday Exceptions card */}
          <div className="ft-card" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, background: 'rgba(255,255,255,.02)' }}>
            <div>
              <label className="ft-label" style={{ marginBottom: 6 }}>💰 {lang === 'id' ? 'Tanggal Gajian Target' : 'Target Payday'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="1" max="31" className="ft-input" style={{ width: 80 }} value={calPayday} 
                       onChange={(e) => onUpdateSetting && onUpdateSetting('calendarPayday', Math.max(1, Math.min(31, Number(e.target.value) || 1)))} />
                <span style={{ fontSize: 13, color: 'var(--ft-text-3)', fontWeight: 600 }}>{lang === 'id' ? 'setiap bulan' : 'of the month'}</span>
              </div>
            </div>
            <div>
              <label className="ft-label" style={{ marginBottom: 6 }}>⚙️ {lang === 'id' ? 'Aturan Libur / Tanggal Merah' : 'Holiday Exception Strategy'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ft-btn" data-variant={calPaydayException === 'before' ? 'primary' : 'ghost'} data-size="sm" 
                        onClick={() => onUpdateSetting && onUpdateSetting('calendarPaydayException', 'before')}>
                  {lang === 'id' ? 'Sebelum Libur' : 'Before Holiday'}
                </button>
                <button type="button" className="ft-btn" data-variant={calPaydayException === 'after' ? 'primary' : 'ghost'} data-size="sm" 
                        onClick={() => onUpdateSetting && onUpdateSetting('calendarPaydayException', 'after')}>
                  {lang === 'id' ? 'Setelah Libur' : 'After Holiday'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '10px 14px', background: 'var(--ft-success-soft)', borderRadius: 12, border: '1px solid rgba(16,185,129,.15)', width: '100%' }}>
                <div style={{ fontSize: 11, color: 'var(--ft-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'id' ? 'Transfer Gaji Bulan Ini' : 'Actual Payday This Month'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {formatDateLong(actualPaydayDate.toISOString(), lang)}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{ overflowX: 'auto', background: 'var(--ft-border)', borderRadius: 14, padding: 1 }}>
            <div style={{ minWidth: 700, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--ft-border)' }}>
              {/* Day headers */}
              {['Minggu / Sun', 'Senin / Mon', 'Selasa / Tue', 'Rabu / Wed', 'Kamis / Thu', 'Jumat / Fri', 'Sabtu / Sat'].map((h, i) => (
                <div key={h} style={{ background: 'var(--ft-bg)', padding: '12px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: i === 0 || i === 6 ? 'var(--ft-danger)' : 'var(--ft-text-3)' }}>
                  {h}
                </div>
              ))}
              {/* Cells */}
              {gridCells.map((cell, idx) => {
                const hasTxs = cell.txList.length > 0;
                return (
                  <div key={idx} 
                       onClick={() => cell.isCurrentMonth && hasTxs && setSelectedDayTxs(cell)}
                       style={{
                         background: cell.isCurrentMonth ? 'var(--ft-surface)' : 'var(--ft-bg)',
                         minHeight: 110, padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                         opacity: cell.isCurrentMonth ? 1 : 0.3,
                         cursor: cell.isCurrentMonth && hasTxs ? 'pointer' : 'default',
                         border: cell.isActualPayday ? '2px solid #EAB308' : 'none',
                         boxShadow: cell.isActualPayday ? '0 0 12px rgba(234,179,8,.1) inset' : 'none',
                         position: 'relative',
                       }}
                       className={cell.isCurrentMonth && hasTxs ? 'cal-cell-interactive' : ''}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: cell.isHoliday ? 'var(--ft-danger)' : 'inherit' }}>
                        {cell.day}
                      </span>
                      {cell.isActualPayday && (
                        <span style={{ fontSize: 9, background: '#EAB308', color: '#000', fontWeight: 800, padding: '2px 4px', borderRadius: 4, textTransform: 'uppercase' }}>
                          💰 Gajian
                        </span>
                      )}
                    </div>

                    {cell.holidayInfo && (
                      <div style={{ fontSize: 10, color: 'var(--ft-danger)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4, maxWidth: '100%' }}
                           title={lang === 'id' ? cell.holidayInfo.labelId : cell.holidayInfo.labelEn}>
                        {lang === 'id' ? cell.holidayInfo.labelId : cell.holidayInfo.labelEn}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                      {cell.income > 0 && (
                        <div style={{ fontSize: 10.5, color: 'var(--ft-success)', fontWeight: 700 }}>
                          +{formatIDR(cell.income, { compact: true })}
                        </div>
                      )}
                      {cell.expense > 0 && (
                        <div style={{ fontSize: 10.5, color: 'var(--ft-danger)', fontWeight: 700 }}>
                          −{formatIDR(cell.expense, { compact: true })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day transactions details modal */}
          <Modal open={!!selectedDayTxs} onClose={() => setSelectedDayTxs(null)}
                 title={selectedDayTxs ? formatDateLong(new Date(currentYear, currentMonth, selectedDayTxs.day).toISOString(), lang) : ''}
                 sub={lang === 'id' ? 'Daftar transaksi pada hari ini' : 'Transactions list on this day'}>
            {selectedDayTxs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedDayTxs.txList.map((tx) => {
                  const cat = getCategory(tx.category);
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--ft-border)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.color + '22', color: cat.color, display: 'grid', placeItems: 'center', fontSize: 16 }}>
                        {cat.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{tx.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 2 }}>
                          {getAccount(tx.account, state.accounts)?.name || ''}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: tx.type === 'income' ? 'var(--ft-success)' : 'inherit' }}>
                        {tx.type === 'income' ? '+' : '−'}{formatIDR(tx.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
// ── Donut chart for category breakdown ─────────────────────────────────────
function DonutChart({ data, total, lang }) {
  const r = 70, c = 2 * Math.PI * r;
  const [hoverIdx, setHoverIdx] = useState(null);

  // Precompute each segment's offset so we can reuse for hover ring.
  let cursor = c * 0.25;
  const segments = data.map((row, i) => {
    const pct = row.amount / total;
    const len = c * pct;
    const seg = {
      row, pct, len,
      offset: cursor,
      midAngle: ((cursor + len / 2) / c) * 2 * Math.PI - Math.PI / 2,
    };
    cursor -= len;
    return seg;
  });

  const hoverSeg = hoverIdx != null ? segments[hoverIdx] : null;

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="ft-chart-wrap"
           style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}
           onMouseLeave={() => setHoverIdx(null)}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--ft-bg)" strokeWidth="22"/>
          {segments.map((seg, i) => {
            const isHover = hoverIdx === i;
            const dim = hoverIdx != null && !isHover;
            return (
              <circle key={i} cx="90" cy="90" r={r} fill="none"
                      stroke={seg.row.category.color}
                      strokeWidth={isHover ? 26 : 22}
                      strokeDasharray={`${seg.len} ${c - seg.len}`}
                      strokeDashoffset={seg.offset}
                      opacity={dim ? 0.35 : 1}
                      onMouseEnter={() => setHoverIdx(i)}
                      style={{ cursor: 'pointer', transition: 'stroke-width .15s, opacity .15s' }} />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <div>
            {hoverSeg ? (
              <>
                <div style={{ fontSize: 11, color: 'var(--ft-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {lang === 'id' ? hoverSeg.row.category.label : hoverSeg.row.category.labelEn}
                </div>
                <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', marginTop: 2, color: hoverSeg.row.category.color }}>
                  {formatIDR(hoverSeg.row.amount, { compact: true })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ft-text-3)', fontWeight: 700, marginTop: 1 }}>
                  {Math.round(hoverSeg.pct * 100)}%
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: 'var(--ft-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {lang === 'id' ? 'Total' : 'Total'}
                </div>
                <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', marginTop: 2 }}>
                  {formatIDR(total, { compact: true })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.slice(0, 6).map((row, i) => (
          <div key={i}
               onMouseEnter={() => setHoverIdx(i)}
               onMouseLeave={() => setHoverIdx(null)}
               style={{
                 display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                 padding: '4px 6px',
                 borderRadius: 6,
                 background: hoverIdx === i ? 'var(--ft-bg)' : 'transparent',
                 cursor: 'pointer',
                 transition: 'background .15s',
               }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: row.category.color }} />
            <span style={{ flex: 1 }}>{lang === 'id' ? row.category.label : row.category.labelEn}</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--ft-font-display)' }}>
              {Math.round((row.amount / total) * 100)}%
            </span>
          </div>
        ))}
        {data.length > 6 && (
          <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 4 }}>
            + {data.length - 6} {lang === 'id' ? 'lainnya' : 'more'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Month-over-month bar chart ─────────────────────────────────────────────
function MoMChart({ data, lang = 'id' }) {
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const [hover, setHover] = useState(null); // { idx, key }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((row, i) => {
        const incPct = (row.income / max) * 100;
        const expPct = (row.expense / max) * 100;
        return (
          <div key={i}>
            <div className="rp-mom">
              <div className="rp-mom-month">{row.label}</div>
              <div className="rp-mom-bar">
                <div style={{ width: incPct + '%', background: 'var(--ft-success)' }}
                     onMouseEnter={() => setHover({ idx: i, key: 'income' })}
                     onMouseLeave={() => setHover(null)}
                     title={`${lang === 'id' ? 'Pemasukan' : 'Income'} · ${row.label}: +${formatIDR(row.income, { compact: true })}`}>
                  +{formatIDR(row.income, { compact: true, withCurrency: false })}
                </div>
              </div>
              <div className="rp-mom-bar">
                <div style={{ width: expPct + '%', background: 'var(--ft-action)' }}
                     onMouseEnter={() => setHover({ idx: i, key: 'expense' })}
                     onMouseLeave={() => setHover(null)}
                     title={`${lang === 'id' ? 'Pengeluaran' : 'Expense'} · ${row.label}: −${formatIDR(row.expense, { compact: true })}`}>
                  −{formatIDR(row.expense, { compact: true, withCurrency: false })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {hover && (
        <div style={{
          marginTop: 12, padding: 12,
          background: 'var(--ft-bg)', borderRadius: 12,
          display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: 16,
          alignItems: 'center', fontSize: 13.5,
        }}>
          <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 18 }}>
            {data[hover.idx].label}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ft-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'id' ? 'Pemasukan' : 'Income'}
            </div>
            <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, color: 'var(--ft-success)' }}>
              +{formatIDR(data[hover.idx].income, { compact: true })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ft-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'id' ? 'Pengeluaran' : 'Expense'}
            </div>
            <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, color: 'var(--ft-action)' }}>
              −{formatIDR(data[hover.idx].expense, { compact: true })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ft-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'id' ? 'Bersih' : 'Net'}
            </div>
            <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700,
                          color: (data[hover.idx].income - data[hover.idx].expense) >= 0 ? 'var(--ft-success)' : 'var(--ft-danger)' }}>
              {formatIDR(data[hover.idx].income - data[hover.idx].expense, { compact: true, sign: true })}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12, fontSize: 12.5, color: 'var(--ft-text-2)', fontWeight: 600 }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--ft-success)', marginRight: 6, verticalAlign: 'middle' }}/>Income</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--ft-action)', marginRight: 6, verticalAlign: 'middle' }}/>Expense</span>
      </div>
    </div>
  );
}

Object.assign(window, { Reports, DonutChart, MoMChart });

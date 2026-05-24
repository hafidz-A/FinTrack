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

const SCHEDULE_EMOJIS = ['💰','📱','🏠','💡','🚗','🎓','💳','🛒','🏥','📺','🎮','🍜','✈️','🎵','📦','💼','⚡','🔔','🎁','🏋️'];

function Reports({ state, dispatch, lang, t, chartStyle, onExportExcel, onExportCsv, settings = {}, onUpdateSetting, getNextOccurrence }) {
  const { transactions, categories } = state;
  const scheduledTx = state.scheduledTx || [];
  const [period, setPeriod] = useState('month');
  const [tab, setTab] = useState('pl');

  // Schedule management state
  const [schModalOpen, setSchModalOpen] = useState(false);
  const [schEditing, setSchEditing] = useState(null);
  const [schDelTarget, setSchDelTarget] = useState(null);
  const [schForm, setSchForm] = useState({
    label: '', emoji: '💰', type: 'income', amount: '', category: 'income',
    account: state.accounts[0]?.id || '', description: '', startDate: new Date().toISOString().slice(0,10),
    endDate: '', recType: 'monthly', recInterval: 1, recUnit: 'months', recDayOfMonth: 25,
    respectHolidays: true, holidayException: 'before',
  });

  const openSchAdd = () => {
    setSchEditing(null);
    setSchForm({
      label: '', emoji: '💰', type: 'income', amount: '', category: 'income',
      account: state.accounts[0]?.id || '', description: '', startDate: new Date().toISOString().slice(0,10),
      endDate: '', recType: 'monthly', recInterval: 1, recUnit: 'months', recDayOfMonth: 25,
      respectHolidays: true, holidayException: 'before',
    });
    setSchModalOpen(true);
  };

  const openSchEdit = (sch) => {
    setSchEditing(sch);
    const rec = sch.recurrence || {};
    setSchForm({
      label: sch.label, emoji: sch.emoji || '💰', type: sch.type || 'income',
      amount: sch.amount ? String(sch.amount) : '', category: sch.category || 'income',
      account: sch.account || state.accounts[0]?.id || '',
      description: sch.description || '', startDate: sch.startDate || '',
      endDate: sch.endDate || '',
      recType: rec.type || 'monthly', recInterval: rec.interval || 1,
      recUnit: rec.unit || 'months', recDayOfMonth: rec.dayOfMonth || 25,
      respectHolidays: rec.respectHolidays !== false, holidayException: rec.holidayException || 'before',
    });
    setSchModalOpen(true);
  };

  const saveSch = () => {
    if (!schForm.label.trim()) return;
    const rec = {
      type: schForm.recType, interval: Number(schForm.recInterval) || 1,
      unit: schForm.recUnit, dayOfMonth: Number(schForm.recDayOfMonth) || 1,
      respectHolidays: schForm.respectHolidays, holidayException: schForm.holidayException,
    };
    const data = {
      label: schForm.label, emoji: schForm.emoji, type: schForm.type,
      amount: Number(String(schForm.amount).replace(/\D/g, '')) || 0,
      category: schForm.category, account: schForm.account,
      description: schForm.description || schForm.label,
      startDate: schForm.startDate, endDate: schForm.endDate || null,
      recurrence: rec,
    };
    if (schEditing) {
      dispatch({ type: 'EDIT_SCHEDULED', id: schEditing.id, updates: data });
      ToastBus.push(lang === 'id' ? 'Jadwal diperbarui' : 'Schedule updated');
    } else {
      dispatch({ type: 'ADD_SCHEDULED', scheduled: { id: 'sch_' + Date.now(), ...data, createdAt: new Date().toISOString() } });
      ToastBus.push(lang === 'id' ? 'Jadwal ditambahkan' : 'Schedule added');
    }
    setSchModalOpen(false);
  };

  const deleteSch = () => {
    if (!schDelTarget) return;
    dispatch({ type: 'DEL_SCHEDULED', id: schDelTarget.id });
    ToastBus.push(lang === 'id' ? 'Jadwal dihapus' : 'Schedule deleted');
    setSchDelTarget(null);
  };

  // Helper: describe recurrence in human language
  const describeRec = (sch) => {
    const r = sch.recurrence;
    if (!r || r.type === 'none') return lang === 'id' ? 'Tidak berulang' : 'One-time';
    const iv = r.interval || 1;
    const u = r.unit || r.type;
    const units = { daily: lang === 'id' ? 'hari' : 'day(s)', weekly: lang === 'id' ? 'minggu' : 'week(s)',
      monthly: lang === 'id' ? 'bulan' : 'month(s)', yearly: lang === 'id' ? 'tahun' : 'year(s)',
      days: lang === 'id' ? 'hari' : 'day(s)', weeks: lang === 'id' ? 'minggu' : 'week(s)',
      months: lang === 'id' ? 'bulan' : 'month(s)', years: lang === 'id' ? 'tahun' : 'year(s)' };
    const uLabel = units[u] || u;
    if (iv === 1 && (u === 'monthly' || u === 'months')) return (lang === 'id' ? 'Bulanan, tgl ' : 'Monthly, day ') + (r.dayOfMonth || '1');
    if (iv === 1 && (u === 'weekly' || u === 'weeks')) return lang === 'id' ? 'Mingguan' : 'Weekly';
    if (iv === 1 && (u === 'daily' || u === 'days')) return lang === 'id' ? 'Harian' : 'Daily';
    if (iv === 1 && (u === 'yearly' || u === 'years')) return lang === 'id' ? 'Tahunan' : 'Yearly';
    return (lang === 'id' ? 'Setiap ' : 'Every ') + iv + ' ' + uLabel;
  };

  // Compute scheduled items for current calendar month
  const scheduledForMonth = useMemo(() => {
    if (!getNextOccurrence) return {};
    const map = {}; // dayOfMonth -> ScheduledItem[]
    scheduledTx.forEach((sch) => {
      const rec = sch.recurrence || {};
      // For monthly: check if dayOfMonth falls in this month
      if (rec.type === 'monthly' || (rec.type === 'custom' && rec.unit === 'months')) {
        const start = new Date(sch.startDate + 'T00:00:00');
        const monthStart = new Date(currentYear, currentMonth, 1);
        if (start <= new Date(currentYear, currentMonth + 1, 0)) {
          if (!sch.endDate || new Date(sch.endDate) >= monthStart) {
            const d = Math.min(rec.dayOfMonth || start.getDate(), new Date(currentYear, currentMonth + 1, 0).getDate());
            (map[d] = map[d] || []).push(sch);
          }
        }
      } else {
        // For other recurrence types, check each day
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const ref = new Date(currentYear, currentMonth, day);
          const next = getNextOccurrence(sch, ref);
          if (next && next.getFullYear() === currentYear && next.getMonth() === currentMonth && next.getDate() === day) {
            (map[day] = map[day] || []).push(sch);
          }
        }
      }
    });
    return map;
  }, [scheduledTx, currentYear, currentMonth, getNextOccurrence]);

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
      const dayScheduled = scheduledForMonth[i] || [];

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
        scheduled: dayScheduled,
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
  }, [currentYear, currentMonth, transactions, calIncludeCuti, scheduledForMonth]);

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
          ['schedule', lang === 'id' ? '📅 Jadwal' : '📅 Schedule'],
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

          {/* Scheduled info card */}
          {scheduledTx.length > 0 && (
            <div className="ft-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,.02)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ft-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'id' ? 'Jadwal Aktif' : 'Active Schedules'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {scheduledTx.length} {lang === 'id' ? 'jadwal terdaftar' : 'registered schedules'}
                </div>
              </div>
              <button type="button" className="ft-btn" data-variant="ghost" data-size="sm" onClick={() => setTab('schedule')}>
                {lang === 'id' ? 'Kelola Jadwal' : 'Manage'}
              </button>
            </div>
          )}

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
                const hasSch = (cell.scheduled || []).length > 0;
                return (
                  <div key={idx} 
                       onClick={() => cell.isCurrentMonth && hasTxs && setSelectedDayTxs(cell)}
                       style={{
                         background: cell.isCurrentMonth ? 'var(--ft-surface)' : 'var(--ft-bg)',
                         minHeight: 110, padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                         opacity: cell.isCurrentMonth ? 1 : 0.3,
                         cursor: cell.isCurrentMonth && hasTxs ? 'pointer' : 'default',
                         border: hasSch ? '2px solid #EAB308' : 'none',
                         boxShadow: hasSch ? '0 0 12px rgba(234,179,8,.1) inset' : 'none',
                         position: 'relative',
                       }}
                       className={cell.isCurrentMonth && hasTxs ? 'cal-cell-interactive' : ''}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: cell.isHoliday ? 'var(--ft-danger)' : 'inherit' }}>
                        {cell.day}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                        {(cell.scheduled || []).slice(0, 2).map((sch, si) => (
                          <span key={si} className="cal-sch-badge" data-type={sch.type || 'income'}>
                            {sch.emoji} {sch.label}
                          </span>
                        ))}
                        {(cell.scheduled || []).length > 2 && (
                          <span style={{ fontSize: 8, color: 'var(--ft-text-3)', fontWeight: 700 }}>+{cell.scheduled.length - 2}</span>
                        )}
                      </div>
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

      {/* Schedule tab */}
      {tab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 20, fontWeight: 700, margin: 0 }}>
                {lang === 'id' ? 'Jadwal Transaksi' : 'Scheduled Transactions'}
              </h3>
              <div style={{ fontSize: 13, color: 'var(--ft-text-3)', marginTop: 4, fontWeight: 600 }}>
                {lang === 'id' ? 'Kelola gajian, tagihan, dan pemasukan/pengeluaran berulang' : 'Manage payday, bills, and recurring income/expenses'}
              </div>
            </div>
            <button className="ft-btn" data-variant="primary" onClick={openSchAdd}>
              <Icon name="plus" size={16} strokeWidth={2.5} />
              {lang === 'id' ? 'Tambah Jadwal' : 'Add Schedule'}
            </button>
          </div>

          {scheduledTx.length === 0 ? (
            <div className="sch-empty">
              <div className="sch-empty-icon">📅</div>
              <div className="sch-empty-title">{lang === 'id' ? 'Belum ada jadwal transaksi' : 'No scheduled transactions yet'}</div>
              <div className="sch-empty-hint">{lang === 'id' ? 'Tambah jadwal gajian, tagihan, atau pemasukan berulang lainnya' : 'Add a payday, bill, or other recurring income schedule'}</div>
              <button className="ft-btn" data-variant="primary" style={{ marginTop: 16 }} onClick={openSchAdd}>
                <Icon name="plus" size={16} strokeWidth={2.5} />
                {lang === 'id' ? 'Tambah Jadwal Pertama' : 'Add First Schedule'}
              </button>
            </div>
          ) : (
            <div className="sch-list">
              {scheduledTx.map((sch) => {
                const acc = state.accounts.find(a => a.id === sch.account);
                return (
                  <div key={sch.id} className="sch-item" onClick={() => openSchEdit(sch)}>
                    <div className="sch-emoji">{sch.emoji || '📅'}</div>
                    <div className="sch-info">
                      <div className="sch-info-name">{sch.label}</div>
                      <div className="sch-info-sub">
                        {describeRec(sch)} · {acc?.name || '—'}
                      </div>
                      <div className="sch-info-next">
                        <Icon name="calendar" size={10} />
                        {lang === 'id' ? 'Mulai: ' : 'Start: '}
                        {sch.startDate ? new Date(sch.startDate + 'T00:00:00').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div className="sch-amount" style={{ color: sch.type === 'income' ? 'var(--ft-success)' : 'var(--ft-danger)' }}>
                      {sch.amount > 0 ? ((sch.type === 'income' ? '+' : '−') + formatIDR(sch.amount, { compact: true })) : (lang === 'id' ? 'Isi nanti' : 'Fill later')}
                    </div>
                    <div className="sch-actions" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openSchEdit(sch)} title={lang === 'id' ? 'Edit' : 'Edit'}>
                        <Icon name="settings" size={14} />
                      </button>
                      <button onClick={() => setSchDelTarget(sch)} title={lang === 'id' ? 'Hapus' : 'Delete'}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add/Edit Schedule Modal */}
          <Modal open={schModalOpen} onClose={() => setSchModalOpen(false)}
                 title={schEditing ? (lang === 'id' ? 'Edit Jadwal' : 'Edit Schedule') : (lang === 'id' ? 'Tambah Jadwal' : 'Add Schedule')}
                 sub={lang === 'id' ? 'Atur transaksi berulang otomatis' : 'Set up automatic recurring transactions'}
                 size="md"
                 footer={
                   <>
                     <button className="ft-btn" data-variant="ghost" onClick={() => setSchModalOpen(false)}>{t('common.cancel')}</button>
                     <button className="ft-btn" data-variant="primary" onClick={saveSch}>
                       <Icon name="check" size={16} strokeWidth={2.5} />
                       {lang === 'id' ? 'Simpan Jadwal' : 'Save Schedule'}
                     </button>
                   </>
                 }>
            <div className="sch-form">
              {/* Emoji picker */}
              <div>
                <label className="ft-label">{lang === 'id' ? 'Ikon' : 'Icon'}</label>
                <div className="sch-emoji-picker">
                  {SCHEDULE_EMOJIS.map((e) => (
                    <button key={e} type="button" className="sch-emoji-btn" data-active={schForm.emoji === e}
                            onClick={() => setSchForm(f => ({ ...f, emoji: e }))}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="ft-label">{lang === 'id' ? 'Nama Jadwal' : 'Schedule Name'}</label>
                <input className="ft-input" placeholder={lang === 'id' ? 'cth: Gaji Bulanan, Listrik...' : 'e.g. Monthly Salary, Electricity...'}
                       value={schForm.label} onChange={(e) => setSchForm(f => ({ ...f, label: e.target.value }))} />
              </div>

              {/* Type */}
              <div>
                <label className="ft-label">{lang === 'id' ? 'Tipe' : 'Type'}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="tx-chip" data-active={schForm.type === 'income'}
                          onClick={() => setSchForm(f => ({ ...f, type: 'income', category: 'income' }))}>
                    {t('transactions.typeIncome')}
                  </button>
                  <button type="button" className="tx-chip" data-active={schForm.type === 'expense'}
                          onClick={() => setSchForm(f => ({ ...f, type: 'expense', category: 'food' }))}>
                    {t('transactions.typeExpense')}
                  </button>
                </div>
              </div>

              {/* Amount + Category row */}
              <div className="sch-form-row">
                <div>
                  <label className="ft-label">{lang === 'id' ? 'Nominal (opsional)' : 'Amount (optional)'}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ft-text-3)' }}>Rp</span>
                    <input className="ft-input" inputMode="numeric" placeholder="0"
                           value={schForm.amount ? Number(String(schForm.amount).replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                           onChange={(e) => setSchForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                </div>
                <div>
                  <label className="ft-label">{t('transactions.category')}</label>
                  <select className="ft-input" value={schForm.category}
                          onChange={(e) => setSchForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.filter(c => schForm.type === 'income' ? c.id === 'income' : (c.id !== 'income' && c.id !== 'transfer')).map((c) => (
                      <option key={c.id} value={c.id}>{lang === 'id' ? c.label : c.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account + Start Date row */}
              <div className="sch-form-row">
                <div>
                  <label className="ft-label">{t('transactions.account')}</label>
                  <select className="ft-input" value={schForm.account}
                          onChange={(e) => setSchForm(f => ({ ...f, account: e.target.value }))}>
                    {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ft-label">{lang === 'id' ? 'Mulai dari tanggal' : 'Starting from'}</label>
                  <input type="date" className="ft-input" value={schForm.startDate}
                         onChange={(e) => setSchForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="ft-label">{t('transactions.description')}</label>
                <input className="ft-input" placeholder={lang === 'id' ? 'Deskripsi transaksi...' : 'Transaction description...'}
                       value={schForm.description} onChange={(e) => setSchForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Recurrence */}
              <div>
                <label className="ft-label">{t('transactions.recurring')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {[
                    ['none', lang === 'id' ? 'Tidak berulang' : 'One-time'],
                    ['daily', lang === 'id' ? 'Harian' : 'Daily'],
                    ['weekly', lang === 'id' ? 'Mingguan' : 'Weekly'],
                    ['monthly', lang === 'id' ? 'Bulanan' : 'Monthly'],
                    ['yearly', lang === 'id' ? 'Tahunan' : 'Yearly'],
                    ['custom', 'Custom'],
                  ].map(([id, lbl]) => (
                    <button key={id} type="button" className="tx-chip" data-active={schForm.recType === id}
                            onClick={() => setSchForm(f => ({ ...f, recType: id, recUnit: id === 'custom' ? 'months' : id }))}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {schForm.recType === 'custom' && (
                  <div className="sch-recurrence-row">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'id' ? 'Setiap' : 'Every'}</span>
                    <input type="number" min="1" className="ft-input" value={schForm.recInterval}
                           onChange={(e) => setSchForm(f => ({ ...f, recInterval: Math.max(1, Number(e.target.value) || 1) }))} />
                    <select className="ft-input" style={{ width: 'auto' }} value={schForm.recUnit}
                            onChange={(e) => setSchForm(f => ({ ...f, recUnit: e.target.value }))}>
                      <option value="days">{lang === 'id' ? 'hari' : 'day(s)'}</option>
                      <option value="weeks">{lang === 'id' ? 'minggu' : 'week(s)'}</option>
                      <option value="months">{lang === 'id' ? 'bulan' : 'month(s)'}</option>
                      <option value="years">{lang === 'id' ? 'tahun' : 'year(s)'}</option>
                    </select>
                  </div>
                )}

                {(schForm.recType === 'monthly' || (schForm.recType === 'custom' && schForm.recUnit === 'months')) && (
                  <div className="sch-recurrence-row" style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'id' ? 'Pada tanggal' : 'On day'}</span>
                    <input type="number" min="1" max="31" className="ft-input" value={schForm.recDayOfMonth}
                           onChange={(e) => setSchForm(f => ({ ...f, recDayOfMonth: Math.max(1, Math.min(31, Number(e.target.value) || 1)) }))} />
                  </div>
                )}
              </div>

              {/* Holiday shift */}
              {schForm.recType !== 'none' && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={schForm.respectHolidays}
                           onChange={(e) => setSchForm(f => ({ ...f, respectHolidays: e.target.checked }))} />
                    {lang === 'id' ? 'Geser jika jatuh di hari libur' : 'Shift if falls on holiday'}
                  </label>
                  {schForm.respectHolidays && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className="tx-chip" data-active={schForm.holidayException === 'before'}
                              onClick={() => setSchForm(f => ({ ...f, holidayException: 'before' }))}>
                        {lang === 'id' ? 'Sebelum libur' : 'Before holiday'}
                      </button>
                      <button type="button" className="tx-chip" data-active={schForm.holidayException === 'after'}
                              onClick={() => setSchForm(f => ({ ...f, holidayException: 'after' }))}>
                        {lang === 'id' ? 'Setelah libur' : 'After holiday'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* End date */}
              <div>
                <label className="ft-label">{lang === 'id' ? 'Sampai (opsional)' : 'Until (optional)'}</label>
                <input type="date" className="ft-input" value={schForm.endDate}
                       onChange={(e) => setSchForm(f => ({ ...f, endDate: e.target.value }))}
                       placeholder={lang === 'id' ? 'Selamanya' : 'Forever'} />
                <div style={{ fontSize: 11, color: 'var(--ft-text-3)', marginTop: 4, fontWeight: 600 }}>
                  {!schForm.endDate ? (lang === 'id' ? 'Kosongkan untuk selamanya' : 'Leave empty for forever') : ''}
                </div>
              </div>
            </div>
          </Modal>

          {/* Delete confirmation modal */}
          <Modal open={!!schDelTarget} onClose={() => setSchDelTarget(null)}
                 title={lang === 'id' ? 'Hapus Jadwal?' : 'Delete Schedule?'}
                 sub={lang === 'id' ? 'Jadwal yang dihapus tidak bisa dikembalikan' : 'Deleted schedules cannot be recovered'}
                 footer={
                   <>
                     <button className="ft-btn" data-variant="ghost" onClick={() => setSchDelTarget(null)}>{t('common.cancel')}</button>
                     <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }} onClick={deleteSch}>
                       {lang === 'id' ? 'Hapus' : 'Delete'}
                     </button>
                   </>
                 }>
            {schDelTarget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--ft-bg)', borderRadius: 12 }}>
                <div className="sch-emoji">{schDelTarget.emoji || '📅'}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{schDelTarget.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ft-text-3)' }}>{describeRec(schDelTarget)}</div>
                </div>
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

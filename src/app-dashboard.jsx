// FinTrack — Dashboard module
// Hero balance panel + cashflow chart + recent tx + budget status + insights.

function Dashboard({ state, lang, t, chartStyle, onAddTx, onNavigate }) {
  const { transactions, accounts, budgets, upcoming } = state;
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);

  // ── compute current month totals
  const monthStats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let income = 0, expense = 0, transferOut = 0;
    transactions.forEach((tx) => {
      const d = new Date(tx.date).getTime();
      if (d < startMonth) return;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
      else if (tx.type === 'transfer') transferOut += tx.amount;
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  // Last month for delta
  const lastMonthStats = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    let income = 0, expense = 0;
    transactions.forEach((tx) => {
      const d = new Date(tx.date).getTime();
      if (d < startLast || d >= startThis) return;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    });
    return { income, expense };
  }, [transactions]);

  // Today's spend
  const todaySpend = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return transactions
      .filter((tx) => tx.type === 'expense' && new Date(tx.date) >= today)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // Total balance across accounts (positive minus negative)
  const totalBalance = useMemo(() =>
    accounts.reduce((sum, a) => sum + a.balance, 0), [accounts]);
  const assets = useMemo(() =>
    accounts.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0), [accounts]);
  const liabs = useMemo(() =>
    Math.abs(accounts.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0)), [accounts]);

  // last 30 days bucket for chart
  const chartData = useMemo(() => {
    const days = 30;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const arr = Array.from({ length: days }).map((_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
      return { day: d, income: 0, expense: 0 };
    });
    transactions.forEach((tx) => {
      const d = new Date(tx.date); d.setHours(0, 0, 0, 0);
      const idx = days - 1 - Math.floor((now - d) / 86400000);
      if (idx < 0 || idx >= days) return;
      if (tx.type === 'income') arr[idx].income += tx.amount;
      if (tx.type === 'expense') arr[idx].expense += tx.amount;
    });
    return arr;
  }, [transactions]);

  // Health score: simple heuristic
  const healthScore = useMemo(() => {
    const savingsRate = monthStats.income > 0 ? (monthStats.income - monthStats.expense) / monthStats.income : 0;
    return Math.max(0, Math.min(100, Math.round(60 + savingsRate * 50)));
  }, [monthStats]);

  // ── Synchronized Upcoming Bills Calculation
  const upcomingBills = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-11
    const todayDay = now.getDate();

    return (upcoming || []).map((u) => {
      let dueDay = 15; // default fallback
      if (u.id === 'u1' || u.title.toLowerCase().includes('kos')) {
        dueDay = 28;
      } else if (u.id === 'u2' || u.title.toLowerCase().includes('pajak') || u.title.toLowerCase().includes('pph')) {
        dueDay = 5;
      } else if (u.id === 'u3' || u.title.toLowerCase().includes('domain')) {
        dueDay = 11;
      } else if (u.dueIn !== undefined) {
        const due = new Date(now.getTime() + u.dueIn * 24 * 60 * 60 * 1000);
        dueDay = due.getDate();
      }

      // Check if paid in the current month cycle
      const startOfMonth = new Date(curYear, curMonth, 1).getTime();
      const isPaid = transactions.some((tx) => {
        if (tx.type !== 'expense') return false;
        const txDate = new Date(tx.date);
        if (txDate.getTime() < startOfMonth) return false;

        const matchCat = tx.category === u.category;
        const matchTitle = tx.description.toLowerCase().includes(u.title.split(' ')[0].toLowerCase()) ||
                           u.title.toLowerCase().includes(tx.description.split(' ')[0].toLowerCase());
        return matchCat && matchTitle;
      });

      let targetMonth = curMonth;
      let targetYear = curYear;
      let isOverdue = false;

      if (todayDay > dueDay) {
        if (isPaid) {
          targetMonth += 1;
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
          }
        } else {
          isOverdue = true;
        }
      }

      const dueDate = new Date(targetYear, targetMonth, dueDay);
      const diffTime = dueDate.getTime() - now.getTime();
      const dueInDays = isOverdue ? -(todayDay - dueDay) : Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const monthNamesInd = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthNamesEng = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const targetMonthName = lang === 'id' ? monthNamesInd[targetMonth] : monthNamesEng[targetMonth];

      let formattedTitle = u.title;
      const monthRegex = /(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)/gi;
      if (monthRegex.test(u.title)) {
        formattedTitle = u.title.replace(monthRegex, targetMonthName);
      } else if (!u.title.toLowerCase().includes('tahun') && !u.title.toLowerCase().includes('annual') && !u.title.toLowerCase().includes('estimasi')) {
        formattedTitle = `${u.title} (${targetMonthName})`;
      }

      return {
        ...u,
        title: formattedTitle,
        dueIn: dueInDays,
        isPaid,
        isOverdue,
        dueDate,
      };
    });
  }, [upcoming, transactions, lang]);

  const unpaidBills = useMemo(() => {
    return upcomingBills.filter((b) => !b.isPaid).sort((a, b) => a.dueIn - b.dueIn);
  }, [upcomingBills]);

  const paidBills = useMemo(() => {
    return upcomingBills.filter((b) => b.isPaid);
  }, [upcomingBills]);

  // ── Financial Weather state, label, emoji, colors, and SVG
  const weatherStateInfo = useMemo(() => {
    const thisMonthSavings = monthStats.income - monthStats.expense;
    const lastMonthSavings = lastMonthStats.income - lastMonthStats.expense;

    let desc = '';
    if (lastMonthSavings > 0 && thisMonthSavings > 0) {
      const pct = Math.round(((thisMonthSavings - lastMonthSavings) / lastMonthSavings) * 100);
      if (pct >= 0) {
        desc = lang === 'id' ? `Tabunganmu naik ${pct}% vs bulan lalu` : `Savings up ${pct}% vs last month`;
      } else {
        desc = lang === 'id' ? `Tabunganmu turun ${Math.abs(pct)}% vs bulan lalu` : `Savings down ${Math.abs(pct)}% vs last month`;
      }
    } else if (thisMonthSavings > 0) {
      desc = lang === 'id' ? 'Tabunganmu positif bulan ini!' : 'Savings are positive this month!';
    } else if (thisMonthSavings < 0) {
      desc = lang === 'id' ? 'Pengeluaran melebihi pemasukan bulan ini' : 'Expenses exceed income this month';
    } else {
      desc = lang === 'id' ? 'Belum ada data tabungan bulan ini' : 'No savings data yet this month';
    }

    if (healthScore >= 75) {
      return {
        score: healthScore,
        label: desc,
        state: t('dashboard.weatherSunny'),
        emoji: '☀️ ' + t('dashboard.weatherSunny'),
        color: 'var(--ft-success)',
        bg: 'var(--ft-success-soft)',
        svg: (
          <svg className="dash-weather-illus" viewBox="0 0 140 140" fill="none">
            <circle cx="70" cy="70" r="32" fill="#F59E0B" opacity=".15"/>
            <circle cx="70" cy="70" r="22" fill="#F59E0B"/>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const x1 = 70 + Math.cos(angle) * 30, y1 = 70 + Math.sin(angle) * 30;
              const x2 = 70 + Math.cos(angle) * 42, y2 = 70 + Math.sin(angle) * 42;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"/>;
            })}
          </svg>
        )
      };
    } else if (healthScore >= 50) {
      return {
        score: healthScore,
        label: desc,
        state: t('dashboard.weatherCloudy'),
        emoji: '⛅ ' + t('dashboard.weatherCloudy'),
        color: 'var(--ft-warning)',
        bg: 'var(--ft-warning-soft)',
        svg: (
          <svg className="dash-weather-illus" viewBox="0 0 140 140" fill="none">
            <circle cx="85" cy="55" r="24" fill="#F59E0B" opacity=".15"/>
            <circle cx="85" cy="55" r="16" fill="#F59E0B"/>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const x1 = 85 + Math.cos(angle) * 22, y1 = 55 + Math.sin(angle) * 22;
              const x2 = 85 + Math.cos(angle) * 30, y2 = 55 + Math.sin(angle) * 30;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>;
            })}
            <path d="M45,95 C30,95 25,80 38,72 C32,52 60,45 68,58 C78,48 98,58 92,72 C102,75 102,95 85,95 Z" fill="#94A3B8" opacity=".25"/>
            <path d="M45,90 C33,90 28,77 40,70 C35,52 60,46 67,58 C76,49 94,58 89,71 C98,74 98,90 85,90 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="3" strokeLinejoin="round"/>
          </svg>
        )
      };
    } else {
      return {
        score: healthScore,
        label: desc,
        state: t('dashboard.weatherStormy'),
        emoji: '⛈️ ' + t('dashboard.weatherStormy'),
        color: 'var(--ft-danger)',
        bg: 'var(--ft-danger-soft)',
        svg: (
          <svg className="dash-weather-illus" viewBox="0 0 140 140" fill="none">
            <path d="M45,80 C30,80 25,65 38,57 C32,37 60,30 68,43 C78,33 98,43 92,57 C102,60 102,80 85,80 Z" fill="#475569" opacity=".25"/>
            <path d="M45,75 C33,75 28,62 40,55 C35,37 60,31 67,43 C76,34 94,43 89,56 C98,59 98,75 85,75 Z" fill="#64748B" stroke="#475569" strokeWidth="3" strokeLinejoin="round"/>
            <line x1="45" y1="90" x2="40" y2="105" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="95" x2="55" y2="110" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="75" y1="90" x2="70" y2="105" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="90" y1="95" x2="85" y2="110" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )
      };
    }
  }, [healthScore, monthStats, lastMonthStats, lang, t]);

  // ── Smart Dynamic Heuristic Insights Engine
  const allInsights = useMemo(() => {
    const list = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const startMonth = new Date(curYear, curMonth, 1).getTime();
    const startLastMonth = new Date(curYear, curMonth - 1, 1).getTime();

    const curSpendByCat = {};
    const lastSpendByCat = {};
    let curTotalSpend = 0;
    let lastTotalSpend = 0;

    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date).getTime();
      if (d >= startMonth) {
        curSpendByCat[tx.category] = (curSpendByCat[tx.category] || 0) + tx.amount;
        curTotalSpend += tx.amount;
      } else if (d >= startLastMonth) {
        lastSpendByCat[tx.category] = (lastSpendByCat[tx.category] || 0) + tx.amount;
        lastTotalSpend += tx.amount;
      }
    });

    // 1. Savings prediction (ML style projection)
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    if (dayOfMonth > 0) {
      const dailyBurn = curTotalSpend / dayOfMonth;
      const projectedSpend = dailyBurn * daysInMonth;
      const projectedNet = monthStats.income - projectedSpend;
      if (projectedNet > 0) {
        list.push({
          type: 'projection',
          icon: 'sparkles',
          bg: '#059669',
          text: lang === 'id' 
            ? `Jika pola ini berlanjut, kamu diproyeksikan menyisakan ${formatIDR(projectedNet, { compact: true })} di akhir bulan.`
            : `If this pattern continues, you are projected to save ${formatIDR(projectedNet, { compact: true })} by month end.`,
          actionLabel: lang === 'id' ? 'Atur anggaran tabungan →' : 'Set savings target →',
          actionRoute: 'budgets'
        });
      } else if (projectedNet < 0) {
        list.push({
          type: 'projection',
          icon: 'warning',
          bg: '#D97706',
          text: lang === 'id'
            ? `Pola belanjamu diproyeksikan melebihi pemasukan sebesar ${formatIDR(Math.abs(projectedNet), { compact: true })} di akhir bulan.`
            : `Your spending pattern is projected to exceed income by ${formatIDR(Math.abs(projectedNet), { compact: true })} by month end.`,
          actionLabel: lang === 'id' ? 'Lihat laporan cashflow →' : 'See cashflow report →',
          actionRoute: 'reports'
        });
      }
    }

    // 2. Overspent budgets
    budgets.forEach((b) => {
      const spent = curSpendByCat[b.category] || 0;
      const cat = getCategory(b.category);
      const catLabel = lang === 'id' ? cat.label : cat.labelEn;
      if (spent > b.limit) {
        list.push({
          type: 'budget_over',
          icon: 'warning',
          bg: '#DC2626',
          text: lang === 'id'
            ? `Pengeluaran ${catLabel} melebihi anggaran sebesar ${formatIDR(spent - b.limit, { compact: true })}!`
            : `${catLabel} spend exceeded budget by ${formatIDR(spent - b.limit, { compact: true })}!`,
          actionLabel: lang === 'id' ? 'Sesuaikan anggaran →' : 'Adjust budget →',
          actionRoute: 'budgets'
        });
      } else if (spent > 0.8 * b.limit) {
        list.push({
          type: 'budget_warning',
          icon: 'trending',
          bg: '#D97706',
          text: lang === 'id'
            ? `Anggaran ${catLabel} hampir habis (${Math.round((spent / b.limit) * 100)}% terpakai).`
            : `${catLabel} budget is almost fully used (${Math.round((spent / b.limit) * 100)}%).`,
          actionLabel: lang === 'id' ? 'Detail anggaran →' : 'Budget details →',
          actionRoute: 'budgets'
        });
      }
    });

    // 3. Category spend increase MoM (ML trend style)
    Object.keys(curSpendByCat).forEach((catKey) => {
      const curAmt = curSpendByCat[catKey];
      const lastAmt = lastSpendByCat[catKey] || 0;
      if (lastAmt > 50000 && curAmt > lastAmt * 1.2) {
        const pct = Math.round(((curAmt - lastAmt) / lastAmt) * 100);
        const cat = getCategory(catKey);
        const catLabel = lang === 'id' ? cat.label : cat.labelEn;
        list.push({
          type: 'trend_increase',
          icon: 'trending',
          bg: '#F43F5E',
          text: lang === 'id'
            ? `Pengeluaran kategori ${catLabel} naik ${pct}% dibanding bulan lalu.`
            : `Spending in ${catLabel} increased by ${pct}% vs last month.`,
          actionLabel: lang === 'id' ? `Lihat detail ${catLabel} →` : `See ${catLabel} details →`,
          actionRoute: 'reports'
        });
      }
    });

    // 4. No budget set for major expense category
    let maxUnbudgetedCat = null;
    let maxUnbudgetedAmt = 0;
    Object.keys(curSpendByCat).forEach((catKey) => {
      const budgeted = budgets.some((b) => b.category === catKey);
      if (!budgeted && curSpendByCat[catKey] > maxUnbudgetedAmt) {
        maxUnbudgetedAmt = curSpendByCat[catKey];
        maxUnbudgetedCat = catKey;
      }
    });
    if (maxUnbudgetedCat && maxUnbudgetedAmt > 100000) {
      const cat = getCategory(maxUnbudgetedCat);
      const catLabel = lang === 'id' ? cat.label : cat.labelEn;
      list.push({
        type: 'unbudgeted',
        icon: 'sparkles',
        bg: '#06B6D4',
        text: lang === 'id'
          ? `Kamu membelanjakan ${formatIDR(maxUnbudgetedAmt, { compact: true })} untuk ${catLabel} tanpa anggaran.`
          : `You spent ${formatIDR(maxUnbudgetedAmt, { compact: true })} on ${catLabel} without a set budget.`,
        actionLabel: lang === 'id' ? 'Buat anggaran baru →' : 'Create new budget →',
        actionRoute: 'budgets'
      });
    }

    // 5. Debt / Liability check
    const totalAssets = accounts.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
    const totalLiabs = Math.abs(accounts.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0));
    if (totalAssets > 0 && totalLiabs > 0) {
      const ratio = Math.round((totalLiabs / totalAssets) * 100);
      if (ratio > 30) {
        list.push({
          type: 'debt_ratio',
          icon: 'warning',
          bg: '#E11D48',
          text: lang === 'id'
            ? `Rasio liabilitasmu mencapai ${ratio}% dari total aset. Disarankan batasi utang.`
            : `Your liability ratio is at ${ratio}% of total assets. Consider limiting debt.`,
          actionLabel: lang === 'id' ? 'Lihat rekening →' : 'See accounts →',
          actionRoute: 'accounts'
        });
      }
    }

    // 6. Upcoming bills due in ≤ 3 days
    const criticalBill = upcomingBills.find((u) => !u.isPaid && u.dueIn <= 3);
    if (criticalBill) {
      list.push({
        type: 'bill_alert',
        icon: 'warning',
        bg: '#EA580C',
        text: lang === 'id'
          ? `Tagihan ${criticalBill.title} jatuh tempo dalam ${criticalBill.dueIn} hari!`
          : `Bill ${criticalBill.title} is due in ${criticalBill.dueIn} days!`,
        actionLabel: lang === 'id' ? 'Kirim reminder →' : 'Send reminder →',
        actionType: 'toast',
        toastMsg: lang === 'id' ? `Reminder pembayaran dikirim untuk ${criticalBill.title}` : `Payment reminder sent for ${criticalBill.title}`
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'generic_good',
        icon: 'sparkles',
        bg: '#059669',
        text: lang === 'id' ? 'Kondisi keuanganmu stabil bulan ini. Pertahankan!' : 'Your financial health is stable this month. Keep it up!',
        actionLabel: lang === 'id' ? 'Lihat laporan bulanan →' : 'See monthly report →',
        actionRoute: 'reports'
      });
    }

    return list;
  }, [transactions, budgets, accounts, upcomingBills, lang, t, monthStats]);

  const recent = transactions.slice(0, 5);

  return (
    <div className="ft-fade-up">
      <div className="dash-grid">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(20px * var(--ft-density))' }}>

          {/* HERO */}
          <div className="dash-hero">
            <div className="dash-hero-eyebrow">
              {t('dashboard.' + getGreetingKey())}, {window.FT_DATA.user.name.split(' ')[0]} 👋
            </div>
            <h2 className="dash-hero-title">
              {t('dashboard.youHaveSpent')}{' '}
              <span style={{ color: '#DFFB6E' }}>{formatIDR(todaySpend, { compact: true })}</span>{' '}
              {t('dashboard.todaySoFar')}.
            </h2>

            <div className="dash-hero-balance-label">{t('dashboard.totalBalance')}</div>
            <div className="dash-hero-balance">{formatIDR(totalBalance)}</div>
            {(() => {
              // Compare income MoM instead of net — net can be a tiny number
              // (e.g. when one month barely broke even) which makes percentage
              // changes balloon to nonsense (1600%, etc.).
              const lastInc = lastMonthStats.income;
              const curInc = monthStats.income;
              let label, up;
              if (lastInc < 100_000) {
                // last month effectively zero — show a flat indicator
                up = true;
                label = lang === 'id' ? 'baru bulan ini' : 'new this month';
              } else {
                const pct = Math.round(((curInc - lastInc) / lastInc) * 100);
                up = pct >= 0;
                const capped = Math.min(Math.abs(pct), 999);
                label = `${capped}% ${t('dashboard.vsLastMonth')}`;
              }
              return (
                <div className="dash-hero-delta">
                  <Icon name={up ? "arrowUp" : "arrowDown"} size={14} strokeWidth={2.5} />
                  {label}
                </div>
              );
            })()}

            <div className="dash-hero-row">
              <div className="dash-hero-pill">
                <div className="dash-hero-pill-label">↗ {t('dashboard.income')}</div>
                <div className="dash-hero-pill-num" style={{ color: '#DFFB6E' }}>
                  {formatIDR(monthStats.income, { compact: true })}
                </div>
              </div>
              <div className="dash-hero-pill">
                <div className="dash-hero-pill-label">↘ {t('dashboard.expense')}</div>
                <div className="dash-hero-pill-num">
                  {formatIDR(monthStats.expense, { compact: true })}
                </div>
              </div>
              <div className="dash-hero-pill">
                <div className="dash-hero-pill-label">= {t('dashboard.net')}</div>
                <div className="dash-hero-pill-num">
                  {formatIDR(monthStats.net, { compact: true })}
                </div>
              </div>
            </div>

            <div className="dash-quick-row">
              <button className="dash-quick-btn" data-tone="lime" onClick={() => onAddTx('expense')}>
                <Icon name="plus" size={14} strokeWidth={2.5} />
                {t('dashboard.quickAdd')}
              </button>
              <button className="dash-quick-btn" onClick={() => onAddTx('income')}>
                <Icon name="arrowDownLeft" size={14} strokeWidth={2.5} />
                {t('dashboard.addIncome')}
              </button>
              <button className="dash-quick-btn" onClick={() => onAddTx('transfer')}>
                <Icon name="swap" size={14} strokeWidth={2.5} />
                {t('dashboard.addTransfer')}
              </button>
            </div>
          </div>

          {/* CASHFLOW CHART */}
          <div className="ft-card dash-chart">
            <div className="dash-chart-head">
              <div>
                <div style={{ fontSize: 13, color: 'var(--ft-text-2)', fontWeight: 600, marginBottom: 4 }}>
                  {t('dashboard.cashflow')}
                </div>
                <div className="dash-chart-big">
                  {formatIDR(monthStats.net, { sign: true, compact: true })}
                </div>
              </div>
              <div className="dash-chart-legend">
                <span><span className="dash-chart-legend-dot" style={{ background: 'var(--ft-success)' }}></span>{t('dashboard.income')}</span>
                <span><span className="dash-chart-legend-dot" style={{ background: 'var(--ft-action)' }}></span>{t('dashboard.expense')}</span>
              </div>
            </div>
            <CashflowChart data={chartData} style={chartStyle} lang={lang} />
          </div>

          {/* RECENT TX */}
          <div className="ft-card dash-tx">
            <h3 className="dash-section-title">
              {t('dashboard.recent')}
              <button className="ft-link" style={{ fontSize: 13 }} onClick={() => onNavigate('transactions')}>{t('common.seeAll')} →</button>
            </h3>
            {recent.map((tx) => {
              const cat = getCategory(tx.category);
              const acc = getAccount(tx.account, accounts);
              return (
                <div key={tx.id} className="tx-row">
                  <div className="tx-icon" style={{ background: cat.color + "22", color: cat.color }}>
                    {cat.icon}
                  </div>
                  <div className="tx-body">
                    <div className="tx-title">{tx.description}</div>
                    <div className="tx-meta">{lang === 'id' ? cat.label : cat.labelEn} · {acc?.name} · {formatRelativeDate(tx.date, lang)}</div>
                  </div>
                  <div className="tx-amt"
                       data-income={tx.type === 'income'}
                       data-expense={tx.type === 'expense'}
                       data-transfer={tx.type === 'transfer'}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                    {formatIDR(tx.amount, { compact: true })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(20px * var(--ft-density))' }}>

          {/* HEALTH SCORE */}
          <div className="dash-weather">
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ft-text-3)' }}>
              {t('dashboard.weatherEyebrow')}
            </div>
            <div className="dash-weather-score" style={{ color: weatherStateInfo.color }}>
              {weatherStateInfo.score}<sup>/100</sup>
            </div>
            <div className="dash-weather-label">
              {weatherStateInfo.label}
            </div>
            <div className="dash-weather-state" style={{ background: weatherStateInfo.bg, color: weatherStateInfo.color }}>
              {weatherStateInfo.emoji}
            </div>
            {weatherStateInfo.svg}
          </div>

          {/* NET WORTH */}
          <div className="ft-card">
            <h3 className="dash-section-title">{t('dashboard.netWorth')}</h3>
            <div className="dash-nw-row">
              <NetWorthDonut assets={assets} liabilities={liabs} />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{t('dashboard.assets')}</div>
                  <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ft-success)' }}>
                    +{formatIDR(assets, { compact: true })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>{t('dashboard.liabilities')}</div>
                  <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ft-danger)' }}>
                    −{formatIDR(liabs, { compact: true })}
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--ft-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ft-text-3)', fontWeight: 600 }}>Net</div>
                  <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 26 }}>
                    {formatIDR(assets - liabs, { compact: true })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BUDGET STATUS */}
          <div className="ft-card">
            <h3 className="dash-section-title">
              {t('dashboard.budgetAlerts')}
              <button className="ft-link" style={{ fontSize: 13 }} onClick={() => onNavigate('budgets')}>{t('common.seeAll')} →</button>
            </h3>
            {budgets.slice(0, 4).map((b) => {
              const cat = getCategory(b.category);
              const spent = transactions
                .filter((tx) => tx.type === 'expense' && tx.category === b.category)
                .reduce((sum, tx) => sum + tx.amount, 0);
              const pct = Math.min(100, Math.round((spent / b.limit) * 100));
              const tone = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'success';
              const barColor = tone === 'danger' ? 'var(--ft-danger)' : tone === 'warning' ? 'var(--ft-warning)' : cat.color;
              return (
                <div key={b.id} className="dash-budget-row">
                  <div className="dash-budget-emoji" style={{ background: cat.color }}>{cat.icon}</div>
                  <div className="dash-budget-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div className="dash-budget-name">{lang === 'id' ? cat.label : cat.labelEn}</div>
                      <div style={{ fontSize: 12, color: 'var(--ft-text-3)' }}>
                        {formatIDR(spent, { compact: true })} / {formatIDR(b.limit, { compact: true })}
                      </div>
                    </div>
                    <div className="dash-budget-bar">
                      <div style={{ width: pct + '%', background: barColor }} />
                    </div>
                  </div>
                  <div className="dash-budget-pct" style={{ color: barColor }}>{pct}%</div>
                </div>
              );
            })}
          </div>

          {/* INSIGHTS */}
          <div className="ft-card dash-insights" style={{ background: 'linear-gradient(135deg, #FEFCE8, #FEF3C7)', border: 0 }}>
            <h3 className="dash-section-title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="sparkles" size={18} color="#D97706" fill="#D97706" />
                {t('dashboard.insightsTitle')}
              </span>
            </h3>
            {allInsights.slice(0, 5).map((ins, i) => (
              <div key={i} className="insight">
                <div className="insight-icon" style={{ background: ins.bg }}>
                  <Icon name={ins.icon} size={15} color="white" fill={ins.icon === 'sparkles' ? 'white' : undefined} />
                </div>
                <div className="insight-body" style={{ color: '#0F1419' }}>
                  {ins.text}
                  {ins.actionLabel && (
                    <button className="insight-action" type="button"
                            onClick={() => {
                              if (ins.actionRoute) onNavigate(ins.actionRoute);
                              else if (ins.actionType === 'toast' && ins.toastMsg) ToastBus.push(ins.toastMsg);
                            }}>
                      {ins.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {allInsights.length > 5 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button className="ft-link" style={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}
                        onClick={() => setInsightsModalOpen(true)}>
                  {lang === 'id' ? `+ ${allInsights.length - 5} Insight lainnya` : `+ ${allInsights.length - 5} more insights`} →
                </button>
              </div>
            )}
          </div>

          {/* UPCOMING */}
          <div className="ft-card">
            <h3 className="dash-section-title">{t('dashboard.upcoming')}</h3>
            {unpaidBills.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ft-text-3)', textAlign: 'center', padding: '12px 0' }}>
                🎉 {lang === 'id' ? 'Semua tagihan bulan ini sudah lunas!' : 'All bills for this month paid!'}
              </div>
            )}
            {unpaidBills.map((u) => {
              const cat = getCategory(u.category);
              return (
                <div key={u.id} className="dash-upcoming-row">
                  <div className="dash-upcoming-due" style={{ color: u.dueIn <= 7 ? 'var(--ft-danger)' : 'var(--ft-text-2)' }}>
                    {u.dueIn < 0 ? (
                      <span style={{ color: 'var(--ft-danger)' }}>
                        {lang === 'id' ? 'Terlambat' : 'Overdue'}
                      </span>
                    ) : (
                      <>
                        {u.dueIn}<small>{lang === 'id' ? ' hari' : ' days'}</small>
                      </>
                    )}
                  </div>
                  <div className="dash-budget-emoji" style={{ background: cat.color }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ft-text-3)' }}>{formatIDR(u.amount, { compact: true })}</div>
                  </div>
                </div>
              );
            })}

            {paidBills.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--ft-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ft-text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>
                  {lang === 'id' ? 'Lunas Bulan Ini' : 'Paid This Month'}
                </div>
                {paidBills.map((u) => {
                  const cat = getCategory(u.category);
                  return (
                    <div key={u.id} className="dash-upcoming-row" style={{ opacity: 0.6 }}>
                      <div className="dash-upcoming-due" style={{ color: 'var(--ft-success)' }}>
                        ✓ <small>{lang === 'id' ? 'Lunas' : 'Paid'}</small>
                      </div>
                      <div className="dash-budget-emoji" style={{ background: 'var(--ft-border)' }}>{cat.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ft-text-3)' }}>{formatIDR(u.amount, { compact: true })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* INSIGHTS POPUP MODAL */}
      <Modal open={insightsModalOpen} onClose={() => setInsightsModalOpen(false)}
             title={lang === 'id' ? 'Analisis & Insight Finansial' : 'Financial Insights & Analysis'}
             sub={lang === 'id' ? 'Analisis cerdas berdasarkan aktivitas keuanganmu bulan ini.' : 'Smart insights based on your monthly financial activity.'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {allInsights.map((ins, i) => (
            <div key={i} className="insight" style={{ borderBottom: '1px solid var(--ft-border)', paddingBottom: 12, marginBottom: 0 }}>
              <div className="insight-icon" style={{ background: ins.bg }}>
                <Icon name={ins.icon} size={15} color="white" fill={ins.icon === 'sparkles' ? 'white' : undefined} />
              </div>
              <div className="insight-body" style={{ color: 'var(--ft-text)' }}>
                <div>{ins.text}</div>
                {ins.actionLabel && (
                  <button className="insight-action" type="button"
                          onClick={() => {
                            setInsightsModalOpen(false);
                            if (ins.actionRoute) onNavigate(ins.actionRoute);
                            else if (ins.actionType === 'toast' && ins.toastMsg) ToastBus.push(ins.toastMsg);
                          }}>
                    {ins.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ── Cashflow chart (line | bar | area) ─────────────────────────────────────
function CashflowChart({ data, style, lang = 'id' }) {
  const W = 600, H = 240, P = 28;
  const innerW = W - P * 2, innerH = H - P * 2;
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const xStep = innerW / (data.length - 1 || 1);
  const wrapRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const linePoints = (key) =>
    data.map((d, i) => [P + i * xStep, P + innerH - (d[key] / max) * innerH]);

  const ySteps = 4;

  const renderLine = (key, color) => {
    const pts = linePoints(key);
    const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
    return <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>;
  };

  const renderArea = (key, color) => {
    const pts = linePoints(key);
    const lineD = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
    const fillD = `${lineD} L ${pts[pts.length-1][0]} ${P + innerH} L ${pts[0][0]} ${P + innerH} Z`;
    return (
      <>
        <path d={fillD} fill={color} opacity=".18"/>
        <path d={lineD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    );
  };

  const renderBar = (key, color, offset) => {
    const w = Math.max(2, xStep * 0.35);
    return data.map((d, i) => {
      const h = (d[key] / max) * innerH;
      return <rect key={`${key}-${i}`} x={P + i * xStep - xStep * 0.4 + offset} y={P + innerH - h}
                   width={w} height={h} rx={2} fill={color} opacity={d[key] > 0 ? 1 : 0}/>;
    });
  };

  // Pointer handling: translate clientX to a data index.
  const handleMove = (e) => {
    const el = wrapRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Inner plot area starts at P/W proportion of the width
    const innerLeft = (P / W) * rect.width;
    const innerRight = ((W - P) / W) * rect.width;
    if (x < innerLeft || x > innerRight) { setHoverIdx(null); return; }
    const ratio = (x - innerLeft) / (innerRight - innerLeft);
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1))));
    setHoverIdx(idx);
  };
  const handleLeave = () => setHoverIdx(null);

  const hoverPoint = hoverIdx != null ? data[hoverIdx] : null;
  const hoverX = hoverIdx != null ? P + hoverIdx * xStep : 0;
  const incY  = hoverPoint ? P + innerH - (hoverPoint.income  / max) * innerH : 0;
  const expY  = hoverPoint ? P + innerH - (hoverPoint.expense / max) * innerH : 0;

  // Tooltip position in CSS px — use ratios.
  const tooltipLeft = hoverIdx != null ? (hoverX / W) * 100 : 0;

  const fmtHoverDate = (d) =>
    d ? new Date(d).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="ft-chart-wrap" ref={wrapRef}
         onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <svg className="dash-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {Array.from({ length: ySteps + 1 }).map((_, i) => {
          const y = P + (innerH / ySteps) * i;
          return <line key={i} x1={P} y1={y} x2={P + innerW} y2={y}
                       stroke="var(--ft-border)" strokeDasharray={i === 0 || i === ySteps ? '' : '3 4'} />;
        })}
        {style === 'bar' && (
          <>
            {renderBar('income', '#059669', -xStep * 0.05)}
            {renderBar('expense', '#2563EB', xStep * 0.35)}
          </>
        )}
        {style === 'line' && (
          <>
            {renderLine('income', '#059669')}
            {renderLine('expense', '#2563EB')}
          </>
        )}
        {style === 'area' && (
          <>
            {renderArea('income', '#059669')}
            {renderArea('expense', '#2563EB')}
          </>
        )}
        {/* Hover indicator */}
        {hoverPoint && (
          <>
            <line x1={hoverX} y1={P} x2={hoverX} y2={P + innerH}
                  stroke="var(--ft-text)" strokeOpacity="0.35"
                  strokeDasharray="3 3" strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke" />
            {style !== 'bar' && (
              <>
                <circle cx={hoverX} cy={incY} r="5" fill="white" stroke="#059669" strokeWidth="2.5" />
                <circle cx={hoverX} cy={expY} r="5" fill="white" stroke="#2563EB" strokeWidth="2.5" />
              </>
            )}
          </>
        )}
      </svg>

      {/* Tooltip (positioned in CSS over the wrapper) */}
      {hoverPoint && (
        <div className="ft-chart-tooltip"
             style={{ left: `${tooltipLeft}%` }}
             data-flip={tooltipLeft > 65}>
          <div className="ft-chart-tooltip-date">{fmtHoverDate(hoverPoint.day)}</div>
          <div className="ft-chart-tooltip-row">
            <span><i style={{ background: '#059669' }} />{lang === 'id' ? 'Pemasukan' : 'Income'}</span>
            <b style={{ color: '#059669' }}>+{formatIDR(hoverPoint.income, { compact: true })}</b>
          </div>
          <div className="ft-chart-tooltip-row">
            <span><i style={{ background: '#2563EB' }} />{lang === 'id' ? 'Pengeluaran' : 'Expense'}</span>
            <b>−{formatIDR(hoverPoint.expense, { compact: true })}</b>
          </div>
          <div className="ft-chart-tooltip-net">
            {lang === 'id' ? 'Bersih' : 'Net'}:{' '}
            <b style={{ color: (hoverPoint.income - hoverPoint.expense) >= 0 ? 'var(--ft-success)' : 'var(--ft-danger)' }}>
              {formatIDR(hoverPoint.income - hoverPoint.expense, { compact: true, sign: true })}
            </b>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Net Worth donut ────────────────────────────────────────────────────────
function NetWorthDonut({ assets, liabilities }) {
  const total = assets + liabilities || 1;
  const aPct = assets / total;
  const lPct = liabilities / total;
  const r = 52, c = 2 * Math.PI * r;
  const aLen = c * aPct, lLen = c * lPct;
  return (
    <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--ft-bg)" strokeWidth="14"/>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--ft-success)" strokeWidth="14"
                strokeDasharray={`${aLen} ${c - aLen}`}
                strokeDashoffset={c * 0.25} strokeLinecap="round"
                transform="rotate(0 66 66)"/>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--ft-danger)" strokeWidth="14"
                strokeDasharray={`${lLen} ${c - lLen}`}
                strokeDashoffset={c * 0.25 - aLen}
                strokeLinecap="round"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--ft-font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {Math.round(aPct * 100)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--ft-text-3)', marginTop: 2, fontWeight: 600 }}>aset</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, CashflowChart, NetWorthDonut });

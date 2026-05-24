// FinTrack â€” Settings page.
// 6 sections: Profile Â· Account & Security Â· Notifications Â· Display Â· Subscription Â· Data & Privacy.
// Preferences persist to localStorage; finance records persist locally and can
// be imported/exported as a private Excel workbook.

function Settings({ lang, t, state, supabaseMode = false, setLang, tw, setTw, onLogout, onExportExcel, onImportExcel, onResetPrivateData }) {
  const [section, setSection] = useState(() => localStorage.getItem('ft_set_sec') || 'profile');
  useEffect(() => { localStorage.setItem('ft_set_sec', section); }, [section]);

  // Settings state (persisted)
  const [s, setS] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ft_settings') || 'null');
      if (stored) return stored;
    } catch (_) {}
    return {
      name: 'Andi Wiyono',
      handle: 'andi.w',
      email: 'andi@studiowiyono.id',
      phone: '+62 812 5512 4400',
      bio: 'Designer freelance Â· Jakarta. Lagi belajar misahin keuangan bisnis dan pribadi.',
      twoFA: false,
      notifBudget: true,
      notifUpcoming: true,
      notifDaily: false,
      notifWeekly: true,
      notifGoal: true,
      notifMarketing: false,
      currency: 'IDR',
      dateFormat: 'DD/MM/YYYY',
    };
  });
  useEffect(() => { localStorage.setItem('ft_settings', JSON.stringify(s)); }, [s]);

  const update = (k, v) => {
    setS((prev) => ({ ...prev, [k]: v }));
    ToastBus.push(t('settings.savedNotice'));
  };

  const [delDataOpen, setDelDataOpen] = useState(false);
  const [delAccOpen, setDelAccOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');

  const sections = [
    { id: 'profile',  icon: 'user',     label: t('settings.sectionProfile') },
    { id: 'account',  icon: 'wallet',   label: t('settings.sectionAccount') },
    { id: 'notif',    icon: 'bell',     label: t('settings.sectionNotif') },
    { id: 'display',  icon: 'sun',      label: t('settings.sectionDisplay') },
    { id: 'billing',  icon: 'star',     label: t('settings.sectionBilling') },
    { id: 'data',     icon: 'download', label: t('settings.sectionData') },
    { id: 'danger',   icon: 'warning',  label: t('settings.sectionDanger'), tone: 'danger' },
  ];

  const dataCounts = [
    [lang === 'id' ? 'Transaksi' : 'Transactions', String(state.transactions.length)],
    [lang === 'id' ? 'Akun' : 'Accounts', String(state.accounts.length)],
    [lang === 'id' ? 'Anggaran' : 'Budgets', String(state.budgets.length)],
    [lang === 'id' ? 'Tujuan' : 'Goals', String(state.goals.length)],
  ];

  return (
    <div className="ft-fade-up">
      <div className="tx-page-head">
        <div>
          <h2 style={{ fontFamily: 'var(--ft-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('settings.title')}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ft-text-2)', marginTop: 4 }}>{t('settings.sub')}</div>
        </div>
      </div>

      <div className="set-layout">
        <aside className="set-sidenav">
          <div className="set-sidenav-inner">
            {sections.map((sec) => (
              <button key={sec.id}
                      data-active={section === sec.id}
                      data-tone={sec.tone}
                      onClick={() => setSection(sec.id)}>
                <Icon name={sec.icon} size={17} />
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: '0 14px', fontSize: 11.5, color: 'var(--ft-text-3)', fontWeight: 600 }}>
            {t('settings.versionLabel')} 1.0.0 Â· {lang === 'id' ? 'Build Mei 2026' : 'Build May 2026'}
          </div>
        </aside>

        <div>
          {section === 'profile' && (
            <div className="set-section">
              <div className="set-section-head">
                <div>
                  <div className="set-section-title">{t('settings.sectionProfile')}</div>
                  <div className="set-section-sub">{lang === 'id' ? 'Cara FinTrack mengenalmu.' : 'How FinTrack knows you.'}</div>
                </div>
              </div>

              <div className="set-profile-head">
                <div className="set-avatar-big">AW</div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontFamily: 'var(--ft-font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.name}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ft-text-2)', marginTop: 2 }}>@{s.handle} Â· {s.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 6 }}>
                    {t('settings.memberSince')} {lang === 'id' ? 'Maret 2026' : 'March 2026'}
                  </div>
                </div>
                <div className="set-avatar-actions">
                  <button className="ft-btn" data-variant="ghost" data-size="sm">{t('settings.changeAvatar')}</button>
                </div>
              </div>

              <div className="set-grid-2" style={{ marginTop: 22 }}>
                <div>
                  <label className="ft-label">{t('settings.profileName')}</label>
                  <input className="ft-input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} onBlur={() => ToastBus.push(t('settings.savedNotice'))} />
                </div>
                <div>
                  <label className="ft-label">{t('settings.profileHandle')}</label>
                  <input className="ft-input" value={s.handle} onChange={(e) => setS({ ...s, handle: e.target.value })} onBlur={() => ToastBus.push(t('settings.savedNotice'))} />
                </div>
                <div>
                  <label className="ft-label">{t('settings.profileEmail')}</label>
                  <input className="ft-input" type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} onBlur={() => ToastBus.push(t('settings.savedNotice'))} />
                </div>
                <div>
                  <label className="ft-label">{t('settings.profilePhone')}</label>
                  <input className="ft-input" value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} onBlur={() => ToastBus.push(t('settings.savedNotice'))} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label className="ft-label">{t('settings.profileBio')}</label>
                <textarea className="ft-input" rows="3" style={{ height: 'auto', padding: '12px 14px', resize: 'vertical', fontFamily: 'inherit' }}
                          value={s.bio} onChange={(e) => setS({ ...s, bio: e.target.value })} onBlur={() => ToastBus.push(t('settings.savedNotice'))} />
              </div>
            </div>
          )}

          {section === 'account' && (
            <>
              <div className="set-section">
                <div className="set-section-head">
                  <div>
                    <div className="set-section-title">{t('settings.changePassword')}</div>
                    <div className="set-section-sub">{lang === 'id' ? 'Pastikan password kuat dan unik.' : 'Use a strong, unique password.'}</div>
                  </div>
                </div>
                <div className="set-grid-1">
                  <div>
                    <label className="ft-label">{t('settings.currentPassword')}</label>
                    <input className="ft-input" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
                  </div>
                  <div className="set-grid-2">
                    <div>
                      <label className="ft-label">{t('settings.newPassword')}</label>
                      <input className="ft-input" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
                    </div>
                    <div>
                      <label className="ft-label">{t('settings.confirmPassword')}</label>
                      <input className="ft-input" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="ft-btn" data-variant="primary" onClick={() => ToastBus.push(lang === 'id' ? 'Password diperbarui' : 'Password updated')}>
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="set-section">
                <div className="set-section-head">
                  <div>
                    <div className="set-section-title">{t('settings.twoFA')}</div>
                    <div className="set-section-sub">{t('settings.twoFASub')}</div>
                  </div>
                  <Switch on={s.twoFA} onChange={(v) => update('twoFA', v)} />
                </div>
                {s.twoFA && (
                  <div style={{ padding: 16, background: 'var(--ft-success-soft)', borderRadius: 12, fontSize: 13, color: 'var(--ft-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="check" size={16} strokeWidth={2.5} />
                    {lang === 'id' ? '2FA aktif via aplikasi authenticator.' : '2FA active via authenticator app.'}
                  </div>
                )}
              </div>

              <div className="set-section">
                <div className="set-section-head">
                  <div>
                    <div className="set-section-title">{t('settings.sessions')}</div>
                    <div className="set-section-sub">{lang === 'id' ? 'Perangkat yang sedang login.' : 'Devices currently signed in.'}</div>
                  </div>
                  <button className="ft-btn" data-variant="ghost" data-size="sm" onClick={onLogout}>
                    {t('settings.sessionLogoutAll')}
                  </button>
                </div>

                {[
                  { icon: 'ðŸ’»', name: 'MacBook Pro Â· Chrome', meta: 'Jakarta, ID Â· ' + (lang === 'id' ? 'Sesi ini' : 'This session'), current: true },
                  { icon: 'ðŸ“±', name: 'iPhone 15 Â· FinTrack iOS', meta: 'Jakarta, ID Â· ' + (lang === 'id' ? '2 jam lalu' : '2 hours ago') },
                  { icon: 'ðŸ’»', name: 'Windows PC Â· Edge', meta: 'Bandung, ID Â· ' + (lang === 'id' ? '3 hari lalu' : '3 days ago') },
                ].map((sess, i) => (
                  <div key={i} className="set-session">
                    <div className="set-session-icon">{sess.icon}</div>
                    <div>
                      <div className="set-session-name">{sess.name}</div>
                      <div className="set-session-meta">{sess.meta}</div>
                    </div>
                    {sess.current
                      ? <span className="set-session-badge">{lang === 'id' ? 'Aktif' : 'Active'}</span>
                      : <button className="ft-link" style={{ fontSize: 13 }}>{t('common.logout')}</button>
                    }
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'notif' && (
            <div className="set-section">
              <div className="set-section-head">
                <div>
                  <div className="set-section-title">{t('settings.sectionNotif')}</div>
                  <div className="set-section-sub">{lang === 'id' ? 'Pilih hal yang penting buatmu.' : 'Choose what matters to you.'}</div>
                </div>
              </div>
              {[
                ['notifBudget',    'notifBudgetSub'],
                ['notifUpcoming',  'notifUpcomingSub'],
                ['notifDaily',     'notifDailySub'],
                ['notifWeekly',    'notifWeeklySub'],
                ['notifGoal',      'notifGoalSub'],
                ['notifMarketing', 'notifMarketingSub'],
              ].map(([key, subKey]) => (
                <div key={key} className="set-row">
                  <div className="set-row-text">
                    <div className="set-row-label">{t('settings.' + key)}</div>
                    <div className="set-row-desc">{t('settings.' + subKey)}</div>
                  </div>
                  <Switch on={s[key]} onChange={(v) => update(key, v)} />
                </div>
              ))}
            </div>
          )}

          {section === 'display' && (
            <div className="set-section">
              <div className="set-section-head">
                <div>
                  <div className="set-section-title">{t('settings.sectionDisplay')}</div>
                  <div className="set-section-sub">{lang === 'id' ? 'Sesuaikan tampilan dengan seleramu.' : 'Tune the look to fit you.'}</div>
                </div>
              </div>
              <div className="set-row">
                <div className="set-row-text">
                  <div className="set-row-label">{t('settings.displayTheme')}</div>
                  <div className="set-row-desc">{lang === 'id' ? 'Mode terang atau gelap.' : 'Light or dark.'}</div>
                </div>
                <Seg value={tw.dark ? 'dark' : 'light'}
                     options={[
                       { value: 'light', label: t('settings.displayThemeLight') },
                       { value: 'dark',  label: t('settings.displayThemeDark') },
                     ]}
                     onChange={(v) => setTw('dark', v === 'dark')} />
              </div>
              <div className="set-row">
                <div className="set-row-text">
                  <div className="set-row-label">{t('settings.displayLang')}</div>
                  <div className="set-row-desc">Bahasa Indonesia / English</div>
                </div>
                <Seg value={lang}
                     options={[
                       { value: 'id', label: 'ID' },
                       { value: 'en', label: 'EN' },
                     ]}
                     onChange={setLang} />
              </div>
              <div className="set-row">
                <div className="set-row-text">
                  <div className="set-row-label">{t('settings.displayDensity')}</div>
                  <div className="set-row-desc">{lang === 'id' ? 'Padat, normal, atau lega.' : 'Compact, regular, or comfy.'}</div>
                </div>
                <Seg value={tw.density}
                     options={[
                       { value: 'compact', label: lang === 'id' ? 'Padat' : 'Compact' },
                       { value: 'regular', label: lang === 'id' ? 'Normal' : 'Regular' },
                       { value: 'comfy',   label: lang === 'id' ? 'Lega' : 'Comfy' },
                     ]}
                     onChange={(v) => setTw('density', v)} />
              </div>
              <div className="set-row">
                <div className="set-row-text">
                  <div className="set-row-label">{t('settings.displayCurrency')}</div>
                  <div className="set-row-desc">{lang === 'id' ? 'Mata uang utama tampilan.' : 'Primary display currency.'}</div>
                </div>
                <select className="ft-input" style={{ width: 180 }}
                        value={s.currency} onChange={(e) => update('currency', e.target.value)}>
                  <option value="IDR">IDR Â· Rp</option>
                  <option value="USD">USD Â· $</option>
                  <option value="SGD">SGD Â· S$</option>
                  <option value="EUR">EUR Â· â‚¬</option>
                </select>
              </div>
              <div className="set-row">
                <div className="set-row-text">
                  <div className="set-row-label">{t('settings.displayDateFormat')}</div>
                  <div className="set-row-desc">{lang === 'id' ? 'Format tampilan tanggal.' : 'How dates are formatted.'}</div>
                </div>
                <Seg value={s.dateFormat}
                     options={[
                       { value: 'DD/MM/YYYY', label: 'DD/MM/YY' },
                       { value: 'MM/DD/YYYY', label: 'MM/DD/YY' },
                       { value: 'YYYY-MM-DD', label: 'ISO' },
                     ]}
                     onChange={(v) => update('dateFormat', v)} />
              </div>
            </div>
          )}

          {section === 'billing' && (
            <>
              <div className="set-plan-card">
                <div className="set-plan-tag">{t('settings.planCurrent')}</div>
                <div className="set-plan-name">{t('settings.planFree')}</div>
                <div className="set-plan-sub">
                  {lang === 'id' ? '2 akun, 100 transaksi/bulan, riwayat 3 bulan.' : '2 accounts, 100 tx/month, 3 months of history.'}
                </div>
                <div className="set-plan-features">
                  {[
                    lang === 'id' ? 'Pencatatan manual' : 'Manual entry',
                    lang === 'id' ? 'Laporan dasar' : 'Basic reports',
                    lang === 'id' ? 'Notifikasi anggaran' : 'Budget alerts',
                    lang === 'id' ? '1 mata uang (IDR)' : 'Single currency (IDR)',
                  ].map((f, i) => (
                    <div key={i} className="set-plan-feature">
                      <Icon name="check" size={14} color="#DFFB6E" strokeWidth={2.5} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="set-plan-actions">
                  <button className="ft-btn" data-variant="lime"
                          onClick={() => ToastBus.push(lang === 'id' ? 'Membuka halaman upgradeâ€¦' : 'Opening upgradeâ€¦')}>
                    {t('settings.planUpgrade')} Â· Rp 29rb/bulan
                  </button>
                </div>
              </div>

              <div className="set-section">
                <div className="set-section-head">
                  <div>
                    <div className="set-section-title">{t('settings.paymentMethod')}</div>
                    <div className="set-section-sub">{lang === 'id' ? 'Untuk berlangganan dan pembelian dalam aplikasi.' : 'For subscriptions and in-app purchases.'}</div>
                  </div>
                  <button className="ft-btn" data-variant="ghost" data-size="sm"
                          onClick={() => ToastBus.push(lang === 'id' ? 'Tambah kartu / e-wallet' : 'Add card / e-wallet')}>
                    <Icon name="plus" size={14} strokeWidth={2.5} />
                    {t('settings.addPayment')}
                  </button>
                </div>
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ft-text-3)', fontSize: 13.5 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>ðŸ’³</div>
                  {lang === 'id' ? 'Belum ada metode pembayaran tersimpan.' : 'No payment methods saved yet.'}
                </div>
              </div>
            </>
          )}

          {section === 'data' && (
            <>
              <div className="set-section">
                <div className="set-section-head">
                  <div>
                    <div className="set-section-title">{t('settings.dataExport')}</div>
                    <div className="set-section-sub">
                      {lang === 'id'
                        ? 'Unduh workbook Excel lokal berisi semua transaksi, akun, anggaran, tujuan, kategori, dan pengaturan.'
                        : 'Download a local Excel workbook with every transaction, account, budget, goal, category, and setting.'}
                    </div>
                  </div>
                  <button className="ft-btn" data-variant="primary" data-size="sm"
                          onClick={() => onExportExcel && onExportExcel()}>
                    <Icon name="download" size={14} strokeWidth={2.5} />
                    {lang === 'id' ? 'Download Excel' : 'Download Excel'}
                  </button>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="ft-btn" data-variant="ghost" data-size="sm"
                          onClick={() => onImportExcel && onImportExcel()}>
                    <Icon name="plus" size={14} strokeWidth={2.5} />
                    {lang === 'id' ? 'Import dari Excel' : 'Import from Excel'}
                  </button>
                  <div style={{ fontSize: 12.5, color: 'var(--ft-text-3)', alignSelf: 'center', lineHeight: 1.45 }}>
                    {supabaseMode
                      ? (lang === 'id'
                        ? 'Data finansial tersimpan sebagai vault terenkripsi di Supabase. File Excel ini hanya backup pribadi.'
                        : 'Finance data is stored as an encrypted Supabase vault. This Excel file is only your private backup.')
                      : lang === 'id'
                      ? 'Data tidak dikirim ke server. Simpan file Excel ini sebagai backup pribadi.'
                      : 'Data is not sent to a server. Keep this Excel file as your private backup.'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 18 }}>
                  {dataCounts.map(([lbl, n]) => (
                    <div key={lbl} style={{ padding: 14, background: 'var(--ft-bg)', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 22 }}>{n}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ft-text-3)', fontWeight: 600, marginTop: 2 }}>{lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="set-section set-danger">
                <div className="set-section-head">
                  <div>
                    <div className="set-section-title" style={{ color: 'var(--ft-danger)' }}>{t('settings.dataDelete')}</div>
                    <div className="set-section-sub">{t('settings.dataDeleteSub')}</div>
                  </div>
                  <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }}
                          onClick={() => setDelDataOpen(true)}>
                    {t('settings.dataDeleteBtn')}
                  </button>
                </div>
              </div>
            </>
          )}

          {section === 'danger' && (
            <div className="set-section set-danger">
              <div className="set-section-head">
                <div>
                  <div className="set-section-title" style={{ color: 'var(--ft-danger)' }}>{t('settings.dangerDelete')}</div>
                  <div className="set-section-sub">{t('settings.dangerDeleteSub')}</div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--ft-text-2)', lineHeight: 1.55, marginTop: 0 }}>
                {lang === 'id'
                  ? 'Ini akan menghapus akunmu beserta seluruh transaksi, akun, anggaran, dan tujuan. Kami tidak menyimpan backup setelah penghapusan.'
                  : 'This will delete your account along with all transactions, accounts, budgets, and goals. We do not keep backups after deletion.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }}
                        onClick={() => setDelAccOpen(true)}>
                  {t('settings.dangerDeleteBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wipe data confirm */}
      <Modal open={delDataOpen} onClose={() => { setDelDataOpen(false); setDelConfirm(''); }}
             title={t('settings.dataDelete')}
             sub={t('settings.dataDeleteSub')}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => { setDelDataOpen(false); setDelConfirm(''); }}>
                   {t('common.cancel')}
                 </button>
                 <button className="ft-btn" data-variant="primary"
                         style={{ background: 'var(--ft-danger)', opacity: delConfirm === 'HAPUS' || delConfirm === 'DELETE' ? 1 : 0.4 }}
                         disabled={delConfirm !== 'HAPUS' && delConfirm !== 'DELETE'}
                         onClick={() => {
                           onResetPrivateData && onResetPrivateData();
                           setDelDataOpen(false);
                           setDelConfirm('');
                           ToastBus.push(lang === 'id' ? 'Data pribadi direset' : 'Private data reset');
                         }}>
                   {t('settings.dataDeleteBtn')}
                 </button>
               </>
             }>
        <div style={{ padding: 16, background: 'var(--ft-danger-soft)', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, color: 'var(--ft-danger)', fontWeight: 600, lineHeight: 1.5 }}>
            âš ï¸ {lang === 'id'
              ? 'Tindakan ini akan menghapus semua transaksi, akun, anggaran, dan tujuanmu. Tidak bisa dibatalkan.'
              : 'This will wipe every transaction, account, budget, and goal. It cannot be undone.'}
          </div>
        </div>
        <label className="ft-label">
          {lang === 'id' ? 'Ketik HAPUS untuk konfirmasi' : 'Type DELETE to confirm'}
        </label>
        <input className="ft-input" value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)}
               placeholder={lang === 'id' ? 'HAPUS' : 'DELETE'} />
      </Modal>

      {/* Delete account confirm */}
      <Modal open={delAccOpen} onClose={() => setDelAccOpen(false)}
             title={t('settings.dangerDelete')}
             sub={t('settings.dangerDeleteSub')}
             footer={
               <>
                 <button className="ft-btn" data-variant="ghost" onClick={() => setDelAccOpen(false)}>{t('common.cancel')}</button>
                 <button className="ft-btn" data-variant="primary" style={{ background: 'var(--ft-danger)' }}
                         onClick={() => {
                           setDelAccOpen(false);
                           ToastBus.push(lang === 'id' ? 'Permintaan terkirim. Akun dihapus dalam 30 hari.' : 'Request submitted. Account deleted in 30 days.');
                         }}>
                   {t('settings.dangerDeleteBtn')}
                 </button>
               </>
             }>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ft-text-2)' }}>
          {lang === 'id'
            ? 'Kami akan menghapus akunmu dalam 30 hari. Selama periode tersebut kamu masih bisa membatalkan dengan login kembali.'
            : "We'll delete your account in 30 days. You can cancel during this window by logging back in."}
        </p>
      </Modal>
    </div>
  );
}

// â”€â”€ Tiny stateless components used by Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Switch({ on, onChange }) {
  return (
    <button type="button" className="set-switch"
            role="switch" aria-checked={on}
            onClick={() => onChange(!on)} />
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="set-seg">
      {options.map((opt) => (
        <button key={opt.value} type="button"
                data-active={value === opt.value}
                onClick={() => onChange(opt.value)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { Settings, Switch, Seg });

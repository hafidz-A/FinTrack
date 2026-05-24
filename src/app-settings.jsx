// FinTrack Settings page.
// Profile, account, notifications, display, data, and privacy controls.
// Preferences persist to localStorage; finance records persist locally and can
// be imported/exported as a private Excel workbook.

function cleanText(value) {
  return String(value || '')
    .replace(/\u00C2/g, '')
    .replace(/\uFFFD/g, '')
    .trim();
}

function initialsFromProfile(name, email) {
  const source = cleanText(name) || cleanText(email).split('@')[0] || 'FinTrack User';
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FT';
}

function defaultSettings(profile = {}) {
  const email = cleanText(profile.email);
  const handle = cleanText(profile.handle) || email.split('@')[0] || '';
  return {
    name: cleanText(profile.name) || 'FinTrack User',
    handle,
    email,
    phone: cleanText(profile.phone),
    bio: cleanText(profile.bio),
    avatar: profile.avatar || initialsFromProfile(profile.name, profile.email),
    notifBudget: true,
    notifUpcoming: true,
    notifDaily: false,
    notifWeekly: true,
    notifGoal: true,
    notifMarketing: false,
    currency: 'IDR',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
    lang: 'id',
    density: 'regular',
    calendarIncludeCuti: true,
    calendarPayday: 25,
    calendarPaydayException: 'before',
  };
}

function loadSettings(settingsKey, profile) {
  const base = defaultSettings(profile);
  const keys = [settingsKey || 'ft_settings'];
  if (keys[0] !== 'ft_settings') keys.push('ft_settings');
  for (const key of keys) {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (!stored) continue;
      if (key === 'ft_settings' && settingsKey !== 'ft_settings' && cleanText(stored.email) !== base.email) continue;
      return { ...base, ...stored };
    } catch (_) {}
  }
  return base;
}

function Settings({ lang, t, state, supabaseMode = false, profile = {}, settingsKey = 'ft_settings', onProfileChange, setLang, tw, setTw, onLogout, onExportExcel, onImportExcel, onResetPrivateData, settings, onSettingsChange }) {
  const [section, setSection] = useState(() => localStorage.getItem('ft_set_sec') || 'profile');
  useEffect(() => { localStorage.setItem('ft_set_sec', section); }, [section]);
  useEffect(() => {
    if (section === 'billing') setSection('profile');
  }, [section]);

  // Settings state (synchronized to root App preferences)
  const [s, setS] = useState(() => settings || loadSettings(settingsKey, profile));
  useEffect(() => {
    if (settings) setS(settings);
  }, [settings]);
  useEffect(() => {
    if (onSettingsChange) onSettingsChange(s);
    const nextProfile = {
      name: cleanText(s.name),
      handle: cleanText(s.handle),
      email: cleanText(s.email),
      phone: cleanText(s.phone),
      bio: cleanText(s.bio),
      avatar: s.avatar || initialsFromProfile(s.name, s.email),
      joined: profile.joined || s.joined,
    };
    onProfileChange && onProfileChange(nextProfile);
  }, [s, onSettingsChange]);

  const update = (k, v) => {
    setS((prev) => ({ ...prev, [k]: v }));
    ToastBus.push(t('settings.savedNotice'));
  };

  const [delDataOpen, setDelDataOpen] = useState(false);
  const [delAccOpen, setDelAccOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const emojisList = ['🦊', '🦁', '🐯', '🐼', '🐨', '🐱', '🐶', '🐷', '🐸', '🚀', '💡', '💰', '🎨', '👔', '👩‍💻', '👨‍💻', '🍕', '🍔', '🍦', '🍩', '🚗', '🎮', '🏀', '🎸', '🌟', '🍀'];

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const sStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' }
      });
      setStream(sStream);
      if (videoRef.current) {
        videoRef.current.srcObject = sStream;
      }
    } catch (err) {
      console.error(err);
      ToastBus.push(lang === 'id' ? 'Gagal mengakses kamera' : 'Failed to access camera');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setS((prev) => ({ ...prev, avatar: dataUrl }));
      stopCamera();
      setAvatarPickerOpen(false);
      ToastBus.push(lang === 'id' ? 'Foto profil diperbarui' : 'Profile photo updated');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setS((prev) => ({ ...prev, avatar: event.target.result }));
        setAvatarPickerOpen(false);
        ToastBus.push(lang === 'id' ? 'Foto profil diperbarui' : 'Profile photo updated');
      };
      reader.readAsDataURL(file);
    }
  };

  const closeAvatarPicker = () => {
    stopCamera();
    setAvatarPickerOpen(false);
  };

  const selectEmoji = (emo) => {
    setS((prev) => ({ ...prev, avatar: emo }));
    setAvatarPickerOpen(false);
    ToastBus.push(lang === 'id' ? 'Avatar diperbarui' : 'Avatar updated');
  };

  const removeAvatar = () => {
    setS((prev) => ({ ...prev, avatar: '' }));
    setAvatarPickerOpen(false);
    ToastBus.push(lang === 'id' ? 'Avatar direset' : 'Avatar reset');
  };

  const getJoinedDateStr = () => {
    const rawJoined = profile.joined || s.joined || '2026-03-15T00:00:00.000Z';
    if (rawJoined.includes('T') || !isNaN(Date.parse(rawJoined))) {
      const d = new Date(rawJoined);
      const monthNamesInd = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthNamesEng = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const mName = lang === 'id' ? monthNamesInd[d.getMonth()] : monthNamesEng[d.getMonth()];
      return `${mName} ${d.getFullYear()}`;
    }
    return rawJoined;
  };

  const sections = [
    { id: 'profile',  icon: 'user',     label: t('settings.sectionProfile') },
    { id: 'account',  icon: 'wallet',   label: t('settings.sectionAccount') },
    { id: 'notif',    icon: 'bell',     label: t('settings.sectionNotif') },
    { id: 'display',  icon: 'sun',      label: t('settings.sectionDisplay') },
    { id: 'data',     icon: 'download', label: t('settings.sectionData') },
    { id: 'danger',   icon: 'warning',  label: t('settings.sectionDanger'), tone: 'danger' },
  ];

  const dataCounts = [
    [lang === 'id' ? 'Transaksi' : 'Transactions', String(state.transactions.length)],
    [lang === 'id' ? 'Akun' : 'Accounts', String(state.accounts.length)],
    [lang === 'id' ? 'Anggaran' : 'Budgets', String(state.budgets.length)],
    [lang === 'id' ? 'Tujuan' : 'Goals', String(state.goals.length)],
  ];
  const profileInitials = initialsFromProfile(s.name, s.email);
  const profileMeta = [s.handle ? '@' + cleanText(s.handle) : '', cleanText(s.email)]
    .filter(Boolean)
    .join(' - ');

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
            {t('settings.versionLabel')} 1.0.0 - {lang === 'id' ? 'Build Mei 2026' : 'Build May 2026'}
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
                <div className="set-avatar-big">
                  {s.avatar && (s.avatar.startsWith('http') || s.avatar.startsWith('data:image')) ? (
                    <img src={s.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    s.avatar || profileInitials
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontFamily: 'var(--ft-font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.name}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ft-text-2)', marginTop: 2 }}>{profileMeta}</div>
                  <div style={{ fontSize: 12, color: 'var(--ft-text-3)', marginTop: 6 }}>
                    {t('settings.memberSince')} {getJoinedDateStr()}
                  </div>
                </div>
                <div className="set-avatar-actions">
                  <button className="ft-btn" data-variant="ghost" data-size="sm" onClick={() => setAvatarPickerOpen(true)}>{t('settings.changeAvatar')}</button>
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
                  <input className="ft-input" type="password" placeholder="********" />
                </div>
                <div className="set-grid-2">
                  <div>
                    <label className="ft-label">{t('settings.newPassword')}</label>
                    <input className="ft-input" type="password" placeholder="********" />
                  </div>
                  <div>
                    <label className="ft-label">{t('settings.confirmPassword')}</label>
                    <input className="ft-input" type="password" placeholder="********" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="ft-btn" data-variant="primary" onClick={() => ToastBus.push(lang === 'id' ? 'Password diperbarui' : 'Password updated')}>
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
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
                     onChange={(v) => {
                       setTw('dark', v === 'dark');
                       update('theme', v);
                     }} />
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
                     onChange={(v) => {
                       setLang(v);
                       update('lang', v);
                     }} />
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
                     onChange={(v) => {
                       setTw('density', v);
                       update('density', v);
                     }} />
              </div>
              <div className="set-row">
                <div className="set-row-text">
                  <div className="set-row-label">{t('settings.displayCurrency')}</div>
                  <div className="set-row-desc">{lang === 'id' ? 'Mata uang utama tampilan.' : 'Primary display currency.'}</div>
                </div>
                <select className="ft-input" style={{ width: 180 }}
                        value={s.currency} onChange={(e) => update('currency', e.target.value)}>
                  <option value="IDR">IDR - Rp</option>
                  <option value="USD">USD - $</option>
                  <option value="SGD">SGD - S$</option>
                  <option value="EUR">EUR - EUR</option>
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
            {lang === 'id'
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

      {/* Avatar Picker Modal */}
      <Modal open={avatarPickerOpen} onClose={closeAvatarPicker}
             title={lang === 'id' ? 'Ubah Avatar / Foto Profil' : 'Change Avatar / Profile Photo'}
             sub={lang === 'id' ? 'Pilih emoji default, upload foto Anda, atau ambil foto dengan kamera.' : 'Choose a default emoji, upload your photo, or capture from camera.'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {cameraActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 220, height: 220, borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--ft-action)', background: '#000', position: 'relative' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="ft-btn" data-variant="primary" onClick={takePhoto}>
                  📸 {lang === 'id' ? 'Ambil Foto' : 'Take Photo'}
                </button>
                <button className="ft-btn" data-variant="ghost" onClick={stopCamera}>
                  {lang === 'id' ? 'Kembali' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Emojis selection grid */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ft-text-2)' }}>
                  {lang === 'id' ? 'Pilih dari Emoji' : 'Select an Emoji'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxHeight: 180, overflowY: 'auto', padding: 4, background: 'var(--ft-bg)', borderRadius: 12 }}>
                  {emojisList.map((emo) => (
                    <button key={emo} type="button" className="ft-btn" data-variant="ghost"
                            style={{ height: 44, padding: 0, fontSize: 22, border: 'none', background: 'transparent' }}
                            onClick={() => selectEmoji(emo)}>
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload and camera actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                
                <button className="ft-btn" data-variant="primary" style={{ width: '100%' }}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  📁 {lang === 'id' ? 'Pilih Foto dari File' : 'Upload Photo from File'}
                </button>

                <button className="ft-btn" data-variant="ghost" style={{ width: '100%', gap: 8 }}
                        onClick={startCamera}>
                  📷 {lang === 'id' ? 'Gunakan Kamera' : 'Use Camera'}
                </button>

                {s.avatar && (
                  <button className="ft-btn" data-variant="ghost" style={{ width: '100%', color: 'var(--ft-danger)', borderColor: 'var(--ft-danger)' }}
                          onClick={removeAvatar}>
                    🗑️ {lang === 'id' ? 'Hapus Foto / Reset' : 'Remove Photo / Reset'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

// Tiny stateless components used by Settings.
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

Object.assign(window, { Settings, Switch, Seg, loadSettings, defaultSettings });

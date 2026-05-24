// Shared app utilities: i18n hook, formatters, icons, UI primitives.
// Exposed on window for consumption by all module scripts.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ── i18n hook ───────────────────────────────────────────────────────────────
function useI18n(lang) {
  return useCallback((path) => {
    const parts = path.split('.');
    let v = window.FT_I18N[lang];
    for (const p of parts) v = v?.[p];
    return v ?? path;
  }, [lang]);
}

// ── formatters ──────────────────────────────────────────────────────────────
function formatIDR(amount, opts = {}) {
  const { compact = false, sign = false, withCurrency = true } = opts;
  const abs = Math.abs(amount);
  let body;
  if (compact && abs >= 1_000_000_000) {
    body = (abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 1 : 2) + "M";
  } else if (compact && abs >= 1_000_000) {
    body = (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2) + "jt";
  } else if (compact && abs >= 1_000) {
    body = (abs / 1_000).toFixed(0) + "rb";
  } else {
    body = new Intl.NumberFormat('id-ID').format(Math.round(abs));
  }
  const prefix = withCurrency ? "Rp\u00a0" : "";
  if (sign && amount > 0) return "+" + prefix + body;
  if (amount < 0) return "−" + prefix + body;
  return prefix + body;
}

function formatRelativeDate(iso, lang = 'id') {
  const d = new Date(iso);
  const now = new Date();
  const dayDiff = Math.floor((now - d) / (24 * 3600 * 1000));
  if (dayDiff < 0) {
    const abs = Math.abs(dayDiff);
    if (abs === 0) return lang === 'id' ? 'hari ini' : 'today';
    return lang === 'id' ? `dalam ${abs} hari` : `in ${abs}d`;
  }
  if (dayDiff === 0) {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return (lang === 'id' ? 'Hari ini' : 'Today') + ` · ${h}:${m}`;
  }
  if (dayDiff === 1) return lang === 'id' ? 'Kemarin' : 'Yesterday';
  if (dayDiff < 7) return lang === 'id' ? `${dayDiff} hari lalu` : `${dayDiff}d ago`;
  return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short' });
}

function formatDateLong(iso, lang = 'id') {
  return new Date(iso).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Icon ────────────────────────────────────────────────────────────────────
const ICONS = {
  home: 'M3 12L12 3l9 9M5 10v10h14V10',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  wallet: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-2.5M3 7l13-3v4M3 7h13.5M17 14h.01',
  budget: 'M12 2v20M2 12h20M5 5l14 14M19 5L5 19',
  pie: 'M12 2a10 10 0 1010 10h-10z M12 2v10h10A10 10 0 0012 2z',
  goal: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  report: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z M14 2v6h6 M16 13H8 M16 17H8',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9 M13.7 21a2 2 0 01-3.4 0',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M5 12l7 7 7-7',
  arrowDownLeft: 'M17 7L7 17M17 17H7V7',
  arrowUpRight: 'M7 17L17 7M7 7h10v10',
  swap: 'M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4',
  close: 'M18 6L6 18M6 6l18 18',
  copy: 'M8 8h10a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10a2 2 0 012-2z M4 16H3a1 1 0 01-1-1V4a2 2 0 012-2h11a1 1 0 011 1v1',
  trash: 'M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2',
  check: 'M5 12l5 5L20 7',
  filter: 'M3 6h18M7 12h10M11 18h2',
  calendar: 'M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z M16 2v4M8 2v4M3 10h18',
  sparkles: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z',
  trending: 'M22 7l-9 9-5-5L2 17 M16 7h6v6',
  warning: 'M12 9v4M12 17h.01 M10.3 3.3L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.3a2 2 0 00-3.4 0z',
  card: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M3 10h18',
  bank: 'M3 21h18M5 10V21 M9 10V21 M15 10V21 M19 10V21 M2 10l10-7 10 7',
  cash: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M12 14a2 2 0 100-4 2 2 0 000 4z M6 8h.01 M18 16h.01',
  invest: 'M3 17l6-6 4 4 8-8 M14 7h7v7',
  receipt: 'M19 21l-2-2-2 2-2-2-2 2-2-2-2 2V5a2 2 0 012-2h10a2 2 0 012 2v16z M9 7h6M9 11h6M9 15h4',
  star: 'M12 2l3.1 6.3 7 1-5 4.8 1.2 6.9L12 17.8 5.7 21l1.2-6.9-5-4.8 7-1L12 2z',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  dot: 'M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
};

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2, fill = "none", style }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
         stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={path} />
    </svg>
  );
}

// ── Category helpers ────────────────────────────────────────────────────────
function getCategory(id) {
  return window.FT_DATA.categories.find((c) => c.id === id) || window.FT_DATA.categories[0];
}
function getAccount(id, accounts) {
  return (accounts || window.FT_DATA.accounts).find((a) => a.id === id);
}

// ── Toast manager ───────────────────────────────────────────────────────────
const ToastBus = {
  listeners: [],
  push(msg) { this.listeners.forEach((fn) => fn(msg)); },
  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((f) => f !== fn); }; }
};
function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => ToastBus.on((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }), []);
  return (
    <div className="ft-toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="ft-toast">
          <Icon name="check" size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, sub, children, size = "md", footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 420, md: 540, lg: 720 };
  // Portal to <body> so the modal escapes any ancestor that creates a
  // containing block (transformed page wrappers, animation containers, etc).
  // Without this, position: fixed inside .ft-fade-up was being constrained
  // to that element and the modal rendered off-screen.
  return ReactDOM.createPortal(
    <div className="ft-modal-backdrop" onClick={onClose}>
      <div className="ft-modal ft-pop" onClick={(e) => e.stopPropagation()}
           style={{ maxWidth: widths[size] }} role="dialog" aria-modal="true">
        <div className="ft-modal-head">
          <div>
            <div className="ft-modal-title">{title}</div>
            {sub && <div className="ft-modal-sub">{sub}</div>}
          </div>
          <button className="ft-modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="ft-modal-body">{children}</div>
        {footer && <div className="ft-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ── Logo ────────────────────────────────────────────────────────────────────
function Logo({ size = 32, collapsed = false }) {
  return (
    <div className="ft-logo-wrap" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span className="ft-logo-mark" style={{
        width: size, height: size,
        background: 'var(--ft-logo-bg, var(--ft-primary))',
        color: 'white',
        borderRadius: size * 0.32,
        display: 'grid', placeItems: 'center',
        boxShadow: '0 6px 16px rgba(30,58,95,.35)',
        position: 'relative', overflow: 'hidden',
        flexShrink: 0,
      }}>
        <span style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.4), transparent 60%)' }} />
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <path d="M2 11.5L5.5 8L8 10L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="13" cy="5" r="1.5" fill="#DFFB6E"/>
        </svg>
      </span>
      {!collapsed && (
        <span className="ft-logo-text" style={{ fontFamily: 'var(--ft-font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>
          FinTrack
        </span>
      )}
    </div>
  );
}

// ── AddCustomCategoryModal ──────────────────────────────────────────────────
function AddCustomCategoryModal({ open, onClose, onSave, lang, t }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏷️');
  const [color, setColor] = useState('#3B82F6');
  const [emojiOpen, setEmojiOpen] = useState(false);

  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E', '#64748B'];
  const emojis = ['🍽️', '☕', '🚕', '🛍️', '🧾', '🏥', '🎬', '📚', '💻', '📊', '💸', '✈️', '🐶', '🏠', '🎁', '💈', '🎨', '👔', '🧗', '🍔', '🍺', '🚗', '🩺', '🏫', '🛒', '⚡', '📶'];

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: 'cat_' + Date.now(),
      label: name,
      labelEn: name,
      icon: emoji,
      color: color,
    });
    setName('');
    setEmoji('🏷️');
    setColor('#3B82F6');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}
           title={lang === 'id' ? 'Tambah Kategori Kustom' : 'Add Custom Category'}
           sub={lang === 'id' ? 'Buat kategori transaksi & anggaran baru' : 'Create a new category for cashflow & budgets'}
           footer={
             <>
               <button className="ft-btn" data-variant="ghost" onClick={onClose}>{t('common.cancel')}</button>
               <button className="ft-btn" data-variant="primary" onClick={submit}>{t('common.save')}</button>
             </>
           }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button type="button" className="ft-btn" data-variant="ghost" 
                    style={{ width: 64, height: 64, fontSize: 32, padding: 0, borderRadius: 16, background: color + '22', border: `2px dashed ${color}`, color: color, display: 'grid', placeItems: 'center' }}
                    onClick={() => setEmojiOpen(!emojiOpen)}>
              {emoji}
            </button>
            {emojiOpen && (
              <div className="ft-pop" style={{ position: 'absolute', top: 74, left: 0, zIndex: 100, width: 220, padding: 10, background: 'var(--ft-surface)', border: '1px solid var(--ft-border)', borderRadius: 12, boxShadow: 'var(--ft-shadow-lg)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {emojis.map((e) => (
                    <button key={e} type="button" className="ft-btn" data-variant="ghost" style={{ padding: 0, height: 32, fontSize: 18 }}
                            onClick={() => { setEmoji(e); setEmojiOpen(false); }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label className="ft-label">{lang === 'id' ? 'Nama Kategori' : 'Category Name'}</label>
            <input className="ft-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === 'id' ? 'Kopi, Hobi, Peliharaan...' : 'Coffee, Hobby, Pets...'} />
          </div>
        </div>
        <div>
          <label className="ft-label">{lang === 'id' ? 'Warna Representasi' : 'Category Color'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {colors.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? '3px solid var(--ft-action)' : '3px solid transparent', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Greeting (time-aware) ───────────────────────────────────────────────────
function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 11) return 'goodMorning';
  if (h < 17) return 'goodAfternoon';
  return 'goodEvening';
}

Object.assign(window, {
  useI18n, formatIDR, formatRelativeDate, formatDateLong,
  Icon, ICONS, getCategory, getAccount,
  ToastBus, ToastHost, Modal, Logo, AddCustomCategoryModal, getGreetingKey,
});

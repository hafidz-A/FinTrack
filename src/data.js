// Andi the Freelancer's seed data.
// Realistic month of transactions: client retainers, project payments,
// software subs, food, transport, savings to tax account.

(function () {
  const DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = (offset, h = 9) => {
    const x = new Date(today.getTime() - offset * DAY);
    x.setHours(h, Math.floor(Math.random() * 60), 0, 0);
    return x.toISOString();
  };

  const ACCOUNTS = [
    {
      id: "bca",
      name: "BCA Tahapan",
      type: "bank",
      currency: "IDR",
      balance: 42_580_000,
      colorA: "#1E3A5F",
      colorB: "#2563EB",
      number: "•• 4421",
      icon: "B",
    },
    {
      id: "jago",
      name: "Bank Jago",
      type: "bank",
      currency: "IDR",
      balance: 8_240_000,
      colorA: "#F97316",
      colorB: "#EAB308",
      number: "•• 9018",
      icon: "J",
    },
    {
      id: "gopay",
      name: "GoPay",
      type: "cash",
      currency: "IDR",
      balance: 1_185_000,
      colorA: "#059669",
      colorB: "#10B981",
      number: "•• 7732",
      icon: "G",
    },
    {
      id: "tax-savings",
      name: "Tabungan Pajak",
      type: "bank",
      currency: "IDR",
      balance: 22_100_000,
      colorA: "#7C3AED",
      colorB: "#A855F7",
      number: "•• 0042",
      icon: "T",
    },
    {
      id: "credit",
      name: "Jenius Visa",
      type: "card",
      currency: "IDR",
      balance: -3_420_000,
      colorA: "#0F172A",
      colorB: "#334155",
      number: "•• 2287",
      icon: "V",
    },
  ];

  const CATEGORIES = [
    { id: "income", label: "Pemasukan", labelEn: "Income", color: "#059669", icon: "↗" },
    { id: "food", label: "Makanan & Minum", labelEn: "Food & Drink", color: "#F59E0B", icon: "🍜" },
    { id: "transport", label: "Transport", labelEn: "Transport", color: "#3B82F6", icon: "🚕" },
    { id: "shopping", label: "Belanja", labelEn: "Shopping", color: "#EC4899", icon: "🛍" },
    { id: "bills", label: "Tagihan", labelEn: "Bills", color: "#6366F1", icon: "🧾" },
    { id: "health", label: "Kesehatan", labelEn: "Health", color: "#10B981", icon: "🏥" },
    { id: "fun", label: "Hiburan", labelEn: "Entertainment", color: "#8B5CF6", icon: "🎬" },
    { id: "education", label: "Pendidikan", labelEn: "Education", color: "#0EA5E9", icon: "📚" },
    { id: "software", label: "Software & Tools", labelEn: "Software & Tools", color: "#0891B2", icon: "💻" },
    { id: "tax", label: "Pajak & Keuangan", labelEn: "Tax & Finance", color: "#F43F5E", icon: "📊" },
    { id: "transfer", label: "Transfer", labelEn: "Transfer", color: "#64748B", icon: "⇄" },
  ];

  // Transactions over the last ~32 days
  const TX = [
    // recent
    { id: "t1", type: "expense", amount: 78_000, category: "food", account: "gopay", date: d(0, 12), description: "Sate Khas Senayan", tags: ["lunch"] },
    { id: "t2", type: "expense", amount: 45_000, category: "transport", account: "gopay", date: d(0, 9), description: "GoCar ke Plaza Senayan", tags: [] },
    { id: "t3", type: "income", amount: 8_500_000, category: "income", account: "bca", date: d(1, 11), description: "Loka Studio · Brand identity (Milestone 2)", tags: ["client", "design"] },
    { id: "t4", type: "expense", amount: 350_000, category: "software", account: "credit", date: d(1, 8), description: "Figma · Professional plan", tags: ["recurring", "tools"] },
    { id: "t5", type: "expense", amount: 125_000, category: "food", account: "gopay", date: d(2, 19), description: "Makan malam · Kopi Tuku", tags: [] },
    { id: "t6", type: "expense", amount: 890_000, category: "shopping", account: "credit", date: d(2, 14), description: "Uniqlo · 2x kemeja kerja", tags: [] },
    { id: "t7", type: "expense", amount: 65_000, category: "transport", account: "gopay", date: d(3, 17), description: "GoRide pulang dari coworking", tags: [] },
    { id: "t8", type: "expense", amount: 1_280_000, category: "bills", account: "bca", date: d(3, 10), description: "Listrik PLN · Agustus", tags: ["recurring"] },
    { id: "t9", type: "income", amount: 12_000_000, category: "income", account: "bca", date: d(4, 15), description: "Acme Corp · Retainer Mei", tags: ["client", "retainer"] },
    { id: "t10", type: "transfer", amount: 2_400_000, category: "transfer", account: "bca", toAccount: "tax-savings", date: d(4, 16), description: "Sisihkan pajak 20% dari retainer", tags: ["auto"] },
    { id: "t11", type: "expense", amount: 220_000, category: "food", account: "gopay", date: d(5, 13), description: "Grocery · TokoPedia + Sayurbox", tags: [] },
    { id: "t12", type: "expense", amount: 89_000, category: "fun", account: "credit", date: d(5, 21), description: "Netflix · Premium", tags: ["recurring"] },
    { id: "t13", type: "expense", amount: 145_000, category: "fun", account: "credit", date: d(6, 20), description: "Spotify Family", tags: ["recurring", "shared"] },
    { id: "t14", type: "expense", amount: 320_000, category: "transport", account: "bca", date: d(7, 9), description: "Bensin Pertamax", tags: [] },
    { id: "t15", type: "expense", amount: 95_000, category: "food", account: "gopay", date: d(7, 12), description: "Coffee meeting · Tuku Cikini", tags: ["client"] },
    { id: "t16", type: "expense", amount: 540_000, category: "software", account: "credit", date: d(8, 11), description: "Notion AI · 6 bulan", tags: ["tools"] },
    { id: "t17", type: "income", amount: 4_200_000, category: "income", account: "jago", date: d(9, 14), description: "Freelance writing · Tech Magazine", tags: ["writing"] },
    { id: "t18", type: "expense", amount: 1_100_000, category: "shopping", account: "bca", date: d(10, 16), description: "Sepatu Onitsuka", tags: [] },
    { id: "t19", type: "expense", amount: 78_000, category: "food", account: "gopay", date: d(11, 12), description: "Nasi Padang Sederhana", tags: [] },
    { id: "t20", type: "expense", amount: 425_000, category: "health", account: "bca", date: d(12, 10), description: "Cek gigi rutin · Audy Dental", tags: [] },
    { id: "t21", type: "expense", amount: 880_000, category: "bills", account: "bca", date: d(13, 8), description: "Internet Indihome", tags: ["recurring"] },
    { id: "t22", type: "income", amount: 6_500_000, category: "income", account: "bca", date: d(14, 13), description: "Loka Studio · Brand identity (Milestone 1)", tags: ["client", "design"] },
    { id: "t23", type: "transfer", amount: 1_300_000, category: "transfer", account: "bca", toAccount: "tax-savings", date: d(14, 14), description: "Sisihkan pajak", tags: ["auto"] },
    { id: "t24", type: "expense", amount: 165_000, category: "food", account: "gopay", date: d(15, 19), description: "Sushi Tei dengan teman", tags: [] },
    { id: "t25", type: "expense", amount: 750_000, category: "education", account: "credit", date: d(16, 22), description: "Workshop Type design · Sandika Type", tags: ["pro-dev"] },
    { id: "t26", type: "expense", amount: 245_000, category: "transport", account: "gopay", date: d(17, 8), description: "Grab dari/ke kantor klien", tags: [] },
    { id: "t27", type: "expense", amount: 1_540_000, category: "shopping", account: "credit", date: d(18, 15), description: "iPad case + Apple Pencil tip", tags: ["work"] },
    { id: "t28", type: "expense", amount: 85_000, category: "food", account: "gopay", date: d(19, 13), description: "Lunch di coworking", tags: [] },
    { id: "t29", type: "income", amount: 12_000_000, category: "income", account: "bca", date: d(20, 11), description: "Acme Corp · Retainer April", tags: ["client", "retainer"] },
    { id: "t30", type: "expense", amount: 220_000, category: "fun", account: "credit", date: d(21, 20), description: "Bioskop · Plaza Indonesia XXI", tags: [] },
    { id: "t31", type: "expense", amount: 195_000, category: "transport", account: "gopay", date: d(22, 8), description: "GoCar PP airport", tags: [] },
    { id: "t32", type: "expense", amount: 480_000, category: "food", account: "credit", date: d(23, 19), description: "Dinner birthday teman", tags: [] },
    { id: "t33", type: "expense", amount: 350_000, category: "software", account: "credit", date: d(24, 10), description: "Figma · Professional plan", tags: ["recurring"] },
    { id: "t34", type: "expense", amount: 89_000, category: "fun", account: "credit", date: d(25, 21), description: "Netflix · Premium", tags: ["recurring"] },
    { id: "t35", type: "expense", amount: 145_000, category: "food", account: "gopay", date: d(26, 12), description: "Brunch · Common Grounds", tags: [] },
    { id: "t36", type: "income", amount: 3_800_000, category: "income", account: "jago", date: d(27, 14), description: "Freelance · UI audit untuk Wisma", tags: ["client"] },
    { id: "t37", type: "expense", amount: 1_050_000, category: "bills", account: "bca", date: d(28, 9), description: "Sewa kos Juni", tags: ["recurring"] },
    { id: "t38", type: "expense", amount: 240_000, category: "shopping", account: "gopay", date: d(29, 16), description: "Daily essentials di Indomaret", tags: [] },
    { id: "t39", type: "expense", amount: 78_000, category: "food", account: "gopay", date: d(30, 13), description: "Lunch · Burgreens", tags: [] },
  ];

  const BUDGETS = [
    { id: "b1", category: "food", limit: 2_500_000, period: "monthly" },
    { id: "b2", category: "transport", limit: 1_200_000, period: "monthly" },
    { id: "b3", category: "shopping", limit: 2_000_000, period: "monthly" },
    { id: "b4", category: "fun", limit: 800_000, period: "monthly" },
    { id: "b5", category: "software", limit: 1_000_000, period: "monthly" },
    { id: "b6", category: "bills", limit: 3_500_000, period: "monthly" },
  ];

  const UPCOMING = [
    { id: "u1", title: "Sewa kos Juli", amount: 1_050_000, dueIn: 4, category: "bills" },
    { id: "u2", title: "Pajak PPh tahunan (estimasi)", amount: 3_200_000, dueIn: 12, category: "tax" },
    { id: "u3", title: "Renewal domain andiwiyono.id", amount: 195_000, dueIn: 18, category: "software" },
  ];

  const GOALS = [
    {
      id: "g1",
      name: "Dana Darurat 6 Bulan",
      emoji: "🛡️",
      color: "#059669",
      target: 60_000_000,
      saved: 38_400_000,
      deadline: new Date(today.getTime() + 220 * DAY).toISOString(),
      monthlyContrib: 3_000_000,
      account: "jago",
      priority: "high",
      milestones: [
        { pct: 25, hit: true, label: "Mulai" },
        { pct: 50, hit: true, label: "Setengah jalan" },
        { pct: 75, hit: false, label: "Hampir sampai" },
        { pct: 100, hit: false, label: "Tercapai" },
      ],
    },
    {
      id: "g2",
      name: "Liburan ke Jepang",
      emoji: "🗾",
      color: "#EC4899",
      target: 35_000_000,
      saved: 12_500_000,
      deadline: new Date(today.getTime() + 320 * DAY).toISOString(),
      monthlyContrib: 2_000_000,
      account: "jago",
      priority: "medium",
      milestones: [
        { pct: 25, hit: true, label: "Tiket" },
        { pct: 50, hit: false, label: "Hotel" },
        { pct: 75, hit: false, label: "Aktivitas" },
        { pct: 100, hit: false, label: "Berangkat!" },
      ],
    },
    {
      id: "g3",
      name: "MacBook Pro Baru",
      emoji: "💻",
      color: "#0F172A",
      target: 45_000_000,
      saved: 8_200_000,
      deadline: new Date(today.getTime() + 180 * DAY).toISOString(),
      monthlyContrib: 4_500_000,
      account: "bca",
      priority: "low",
      milestones: [
        { pct: 25, hit: false, label: "Setoran 1" },
        { pct: 50, hit: false, label: "Setoran 2" },
        { pct: 75, hit: false, label: "Setoran 3" },
        { pct: 100, hit: false, label: "Beli" },
      ],
    },
    {
      id: "g4",
      name: "DP Rumah",
      emoji: "🏡",
      color: "#7C3AED",
      target: 250_000_000,
      saved: 22_100_000,
      deadline: new Date(today.getTime() + 920 * DAY).toISOString(),
      monthlyContrib: 8_000_000,
      account: "tax-savings",
      priority: "high",
      milestones: [
        { pct: 25, hit: false, label: "62.5jt" },
        { pct: 50, hit: false, label: "125jt" },
        { pct: 75, hit: false, label: "187.5jt" },
        { pct: 100, hit: false, label: "Akad!" },
      ],
    },
  ];

  window.FT_DATA = {
    accounts: ACCOUNTS,
    categories: CATEGORIES,
    transactions: TX,
    budgets: BUDGETS,
    upcoming: UPCOMING,
    goals: GOALS,
    user: {
      name: "Andi Wiyono",
      handle: "andi.w",
      email: "andi@studiowiyono.id",
      profession: "freelancer",
      joined: "Maret 2026",
      avatar: "AW",
    },
  };
})();

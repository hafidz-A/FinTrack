// Local Excel import/export helpers for FinTrack.
// Workbook work happens in the browser; Supabase mode still stores encrypted vault data.
(function () {
  const SNAPSHOT_KEY = "ft_private_snapshot_v1";
  const SETTINGS_KEY = "ft_settings";

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const defaults = () => ({
    transactions: clone(window.FT_DATA.transactions || []),
    accounts: clone(window.FT_DATA.accounts || []),
    categories: clone(window.FT_DATA.categories || []),
    budgets: clone(window.FT_DATA.budgets || []),
    upcoming: clone(window.FT_DATA.upcoming || []),
    goals: clone(window.FT_DATA.goals || []),
  });

  const num = (value, fallback = 0) => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const text = (value, fallback = "") =>
    value === null || value === undefined ? fallback : String(value);

  const parseDate = (value) => {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const parseTags = (value) => text(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const parseMilestones = (value) => {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(text(value, "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  };

  function requireExcel() {
    if (!window.ExcelJS) throw new Error("Excel library is not loaded");
    return window.ExcelJS;
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function getState() {
    try {
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      if (stored && Array.isArray(stored.transactions) && Array.isArray(stored.accounts)) {
        return { ...defaults(), ...stored };
      }
    } catch (_) {}
    return defaults();
  }

  function saveState(state) {
    const snapshot = {
      transactions: state.transactions || [],
      accounts: state.accounts || [],
      categories: state.categories || [],
      budgets: state.budgets || [],
      upcoming: state.upcoming || [],
      goals: state.goals || [],
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  function resetState() {
    localStorage.removeItem(SNAPSHOT_KEY);
    return defaults();
  }

  function sheetRows(state) {
    return {
      Transactions: (state.transactions || []).map((tx) => ({
        id: tx.id,
        type: tx.type,
        date: tx.date,
        amount: tx.amount,
        category: tx.category,
        account: tx.account,
        toAccount: tx.toAccount || "",
        description: tx.description || "",
        tags: (tx.tags || []).join(", "),
      })),
      Accounts: (state.accounts || []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency || "IDR",
        balance: a.balance,
        colorA: a.colorA,
        colorB: a.colorB,
        number: a.number || "",
        icon: a.icon || "",
      })),
      Budgets: (state.budgets || []).map((b) => ({
        id: b.id,
        category: b.category,
        limit: b.limit,
        period: b.period || "monthly",
      })),
      Goals: (state.goals || []).map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji || "",
        color: g.color || "#2563EB",
        target: g.target,
        saved: g.saved,
        deadline: g.deadline,
        monthlyContrib: g.monthlyContrib || 0,
        account: g.account || "",
        priority: g.priority || "medium",
        milestones: JSON.stringify(g.milestones || []),
      })),
      Upcoming: (state.upcoming || []).map((u) => ({
        id: u.id,
        title: u.title,
        amount: u.amount,
        dueIn: u.dueIn,
        category: u.category,
      })),
      Categories: (state.categories || []).map((c) => ({
        id: c.id,
        label: c.label,
        labelEn: c.labelEn,
        color: c.color,
        icon: c.icon,
      })),
      Settings: Object.entries(getSettings()).map(([key, value]) => ({
        key,
        value: typeof value === "object" ? JSON.stringify(value) : value,
      })),
    };
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function saveBlob(blob, fileName) {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: "Excel Workbook",
          accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
          },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
    downloadBlob(blob, fileName);
  }

  function addSheet(workbook, name, data) {
    const worksheet = workbook.addWorksheet(name);
    const keys = data.length ? Object.keys(data[0]) : ["id"];
    worksheet.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.max(12, key.length + 4),
    }));
    data.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  async function exportWorkbook(state, options = {}) {
    const ExcelJS = requireExcel();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FinTrack";
    workbook.created = new Date();
    Object.entries(sheetRows(state)).forEach(([name, data]) => addSheet(workbook, name, data));
    const bytes = await workbook.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = options.fileName || `fintrack-private-data-${stamp}.xlsx`;
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await saveBlob(blob, fileName);
  }

  function csvEscape(value) {
    const body = text(value);
    return /[",\n\r]/.test(body) ? `"${body.replace(/"/g, '""')}"` : body;
  }

  function exportTransactionsCsv(state, options = {}) {
    const rows = sheetRows(state).Transactions;
    const keys = rows.length ? Object.keys(rows[0]) : ["id"];
    const csv = [
      keys.map(csvEscape).join(","),
      ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, options.fileName || `fintrack-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function cellValue(cell) {
    const value = cell.value;
    if (value && typeof value === "object") {
      if (value.text) return value.text;
      if (value.result !== undefined) return value.result;
      if (value.richText) return value.richText.map((part) => part.text).join("");
      if (value.hyperlink && value.text) return value.text;
    }
    return value;
  }

  function rows(workbook, sheetName) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return [];
    const headers = [];
    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      const values = row.values.slice(1).map((_, index) => cellValue(row.getCell(index + 1)));
      if (rowNumber === 1) {
        values.forEach((value) => headers.push(text(value).trim()));
        return;
      }
      const item = {};
      headers.forEach((header, index) => {
        if (header) item[header] = values[index] ?? "";
      });
      if (Object.values(item).some((value) => value !== "")) data.push(item);
    });
    return data;
  }

  function importStateFromWorkbook(workbook) {
    const base = defaults();
    const accounts = rows(workbook, "Accounts").map((a, i) => ({
      id: text(a.id, `acc-${i + 1}`),
      name: text(a.name, "Account"),
      type: text(a.type, "bank"),
      currency: text(a.currency, "IDR"),
      balance: num(a.balance),
      colorA: text(a.colorA, "#1E3A5F"),
      colorB: text(a.colorB, "#2563EB"),
      number: text(a.number),
      icon: text(a.icon, text(a.name, "A").charAt(0).toUpperCase()),
    }));
    const categories = rows(workbook, "Categories").map((c, i) => ({
      id: text(c.id, `cat-${i + 1}`),
      label: text(c.label, text(c.id, "Kategori")),
      labelEn: text(c.labelEn, text(c.label, "Category")),
      color: text(c.color, "#2563EB"),
      icon: text(c.icon, ""),
    }));
    const transactions = rows(workbook, "Transactions").map((tx, i) => ({
      id: text(tx.id, `t-${Date.now()}-${i}`),
      type: text(tx.type, "expense"),
      amount: num(tx.amount),
      category: text(tx.category, "food"),
      account: text(tx.account, accounts[0]?.id || base.accounts[0]?.id || ""),
      toAccount: text(tx.toAccount) || null,
      date: parseDate(tx.date),
      description: text(tx.description, "Imported transaction"),
      tags: parseTags(tx.tags),
    }));
    const budgets = rows(workbook, "Budgets").map((b, i) => ({
      id: text(b.id, `b-${i + 1}`),
      category: text(b.category, "food"),
      limit: num(b.limit),
      period: text(b.period, "monthly"),
    }));
    const goals = rows(workbook, "Goals").map((g, i) => ({
      id: text(g.id, `g-${i + 1}`),
      name: text(g.name, "Goal"),
      emoji: text(g.emoji, ""),
      color: text(g.color, "#2563EB"),
      target: num(g.target),
      saved: num(g.saved),
      deadline: parseDate(g.deadline),
      monthlyContrib: num(g.monthlyContrib),
      account: text(g.account, accounts[0]?.id || ""),
      priority: text(g.priority, "medium"),
      milestones: parseMilestones(g.milestones),
    }));
    const upcoming = rows(workbook, "Upcoming").map((u, i) => ({
      id: text(u.id, `u-${i + 1}`),
      title: text(u.title, "Upcoming"),
      amount: num(u.amount),
      dueIn: num(u.dueIn),
      category: text(u.category, "bills"),
    }));
    const settingsRows = rows(workbook, "Settings");
    if (settingsRows.length) {
      const settings = {};
      settingsRows.forEach((row) => {
        const key = text(row.key);
        if (!key) return;
        const raw = row.value;
        try {
          settings[key] = typeof raw === "string" && /^[\[{]/.test(raw.trim()) ? JSON.parse(raw) : raw;
        } catch (_) {
          settings[key] = raw;
        }
      });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    return {
      transactions: transactions.length ? transactions : base.transactions,
      accounts: accounts.length ? accounts : base.accounts,
      categories: categories.length ? categories : base.categories,
      budgets: budgets.length ? budgets : base.budgets,
      upcoming: upcoming.length ? upcoming : base.upcoming,
      goals: goals.length ? goals : base.goals,
    };
  }

  async function importWorkbookFile(file) {
    const ExcelJS = requireExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    return importStateFromWorkbook(workbook);
  }

  function requestImport() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx,.xls";
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return reject(new Error("No file selected"));
        importWorkbookFile(file).then(resolve, reject);
      };
      input.click();
    });
  }

  Object.assign(window, {
    FinTrackExcel: {
      getState,
      saveState,
      resetState,
      exportWorkbook,
      exportTransactionsCsv,
      importWorkbookFile,
      requestImport,
      sheetRows,
      SNAPSHOT_KEY,
    },
  });
})();

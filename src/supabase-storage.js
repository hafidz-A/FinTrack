// Supabase-backed encrypted storage for the deploy build.
// Auth uses Supabase; finance data is encrypted in the browser before upload.
(function () {
  const TABLE = "moneyflow_vaults";
  const SAVE_DELAY = 700;

  let client = null;
  let saveTimer = null;
  let lastSavedJson = "";
  let unlockedMasterKey = null;
  let unlockedUserId = null;

  function getConfig() {
    const cfg = window.FT_SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey) return null;
    if (cfg.url.includes("your-project-ref") || cfg.anonKey.includes("your-")) return null;
    return cfg;
  }

  function getClient() {
    if (client) return client;
    const cfg = getConfig();
    if (!cfg || !window.supabase) return null;
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return client;
  }

  function cleanState(state) {
    return {
      transactions: state.transactions || [],
      accounts: state.accounts || [],
      categories: state.categories || [],
      budgets: state.budgets || [],
      upcoming: state.upcoming || [],
      goals: state.goals || [],
    };
  }

  function requireCrypto() {
    if (!window.FinTrackCryptoVault) {
      throw new Error("Crypto vault module is not loaded");
    }
    return window.FinTrackCryptoVault;
  }

  function isEnabled() {
    return !!getClient();
  }

  function isVaultUnlocked() {
    return !!unlockedMasterKey && !!unlockedUserId;
  }

  function lockVault() {
    unlockedMasterKey = null;
    unlockedUserId = null;
    lastSavedJson = "";
    clearTimeout(saveTimer);
  }

  async function getSession() {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  }

  async function signUp(email, password) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase config is missing");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    return data.session || null;
  }

  async function signIn(email, password) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase config is missing");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    const supabase = getClient();
    lockVault();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function sendPasswordReset(email) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase config is missing");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const supabase = getClient();
    if (!supabase) throw new Error("Supabase config is missing");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async function getVaultRow() {
    const supabase = getClient();
    const session = await getSession();
    if (!supabase || !session) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function hasVault() {
    return !!(await getVaultRow());
  }

  async function createVault(vaultPassword, initialState) {
    const supabase = getClient();
    const session = await getSession();
    const cryptoVault = requireCrypto();
    if (!supabase || !session) throw new Error("You need to sign in first");
    if (!vaultPassword || vaultPassword.length < 8) {
      throw new Error("Vault password must be at least 8 characters");
    }

    const state = cleanState(initialState);
    const recoveryCode = cryptoVault.makeRecoveryCode();
    const built = await cryptoVault.buildVaultRecord({
      userId: session.user.id,
      state,
      vaultPassword,
      recoveryCode,
    });

    const { error } = await supabase.from(TABLE).upsert(built.record);
    if (error) throw error;

    unlockedMasterKey = built.masterKey;
    unlockedUserId = session.user.id;
    lastSavedJson = JSON.stringify(state);
    return { state, recoveryCode };
  }

  async function unlockVault(vaultPassword, fallbackState) {
    const session = await getSession();
    const cryptoVault = requireCrypto();
    const row = await getVaultRow();
    if (!session || !row) throw new Error("Vault not found");
    const masterKey = await cryptoVault.unlockWithPassword(row, vaultPassword);
    const loaded = { ...fallbackState, ...(await cryptoVault.decryptJson(row, masterKey)) };
    unlockedMasterKey = masterKey;
    unlockedUserId = session.user.id;
    lastSavedJson = JSON.stringify(cleanState(loaded));
    return loaded;
  }

  async function recoverVault(recoveryCode, newVaultPassword, fallbackState) {
    const supabase = getClient();
    const session = await getSession();
    const cryptoVault = requireCrypto();
    const row = await getVaultRow();
    if (!supabase || !session || !row) throw new Error("Vault not found");
    if (!newVaultPassword || newVaultPassword.length < 8) {
      throw new Error("New vault password must be at least 8 characters");
    }

    const masterKey = await cryptoVault.unlockWithRecovery(row, recoveryCode);
    const loaded = { ...fallbackState, ...(await cryptoVault.decryptJson(row, masterKey)) };
    const rotated = await cryptoVault.rotatePassword(row, masterKey, newVaultPassword);
    const { error } = await supabase
      .from(TABLE)
      .update(rotated)
      .eq("user_id", session.user.id);
    if (error) throw error;

    unlockedMasterKey = masterKey;
    unlockedUserId = session.user.id;
    lastSavedJson = JSON.stringify(cleanState(loaded));
    return loaded;
  }

  async function saveState(state, options = {}) {
    const supabase = getClient();
    const session = await getSession();
    const cryptoVault = requireCrypto();
    if (!supabase || !session || !isVaultUnlocked()) return;
    if (session.user.id !== unlockedUserId) return;

    const snapshot = cleanState(state);
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJson) return;

    const write = async () => {
      const encrypted = await cryptoVault.encryptJson(snapshot, unlockedMasterKey);
      const { error } = await supabase
        .from(TABLE)
        .update({
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        })
        .eq("user_id", session.user.id);
      if (error) throw error;
      lastSavedJson = json;
    };

    if (options.immediate) {
      await write();
      return;
    }

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      write().catch((err) => {
        console.error("Encrypted autosave failed", err);
        ToastBus?.push?.("Autosave vault gagal");
      });
    }, SAVE_DELAY);
  }

  function onAuthStateChange(callback) {
    const supabase = getClient();
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") lockVault();
      callback(event, session);
    });
    return () => data.subscription.unsubscribe();
  }

  Object.assign(window, {
    FinTrackSupabase: {
      isEnabled,
      getClient,
      getSession,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      hasVault,
      createVault,
      unlockVault,
      recoverVault,
      lockVault,
      isVaultUnlocked,
      saveState,
      onAuthStateChange,
    },
  });
})();

// ===== StorageKernel.js (KANINI PERSISTENCE KERNEL v1 SAFE STORE) =====

const StorageKernel = (() => {

  const ROOT_KEY = "kanini_shop_db";
  const DB_VERSION = "1.0.0";

  // ===============================
  // DEFAULT SCHEMA
  // ===============================
  const DEFAULT_DB = {
    _version: DB_VERSION,

    products: [],
    sales: [],
    movements: [],

    settings: {
      currency: "KES",
      businessName: "Kanini Shop"
    }
  };

  // ===============================
  // DEEP CLONE SAFE
  // ===============================
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ===============================
  // SCHEMA VALIDATION
  // ===============================
  function isValidDB(db) {

    if (!db || typeof db !== "object") return false;

    if (!db.products || !db.sales || !db.movements) return false;

    return true;
  }

  // ===============================
  // MIGRATION / REPAIR
  // ===============================
  function repair(db) {

    const base = clone(DEFAULT_DB);

    return {
      _version: DB_VERSION,

      products: db.products || base.products,
      sales: db.sales || base.sales,
      movements: db.movements || base.movements,

      settings: {
        ...base.settings,
        ...(db.settings || {})
      }
    };
  }

  // ===============================
  // LOAD DB (SAFE HYDRATION)
  // ===============================
  function getDB() {

    const raw = localStorage.getItem(ROOT_KEY);

    if (!raw) {
      const fresh = clone(DEFAULT_DB);
      localStorage.setItem(ROOT_KEY, JSON.stringify(fresh));
      return clone(fresh);
    }

    try {
      const parsed = JSON.parse(raw);

      if (!isValidDB(parsed)) {
        console.warn("[StorageKernel] Corrupt DB detected → repairing");
        const fixed = repair(parsed);
        write(fixed);
        return clone(fixed);
      }

      // version hook (future migrations)
      if (parsed._version !== DB_VERSION) {
        console.warn("[StorageKernel] Version mismatch → repairing");
        const migrated = repair(parsed);
        write(migrated);
        return clone(migrated);
      }

      return parsed;

    } catch (e) {
      console.error("[StorageKernel] Fatal parse error → resetting DB");
      const fresh = clone(DEFAULT_DB);
      localStorage.setItem(ROOT_KEY, JSON.stringify(fresh));
      return clone(fresh);
    }
  }

  // ===============================
  // WRITE (SAFE GUARDED)
  // ===============================
  function write(db) {

    if (!isValidDB(db)) {
      throw new Error("[StorageKernel] Attempted to write invalid DB structure");
    }

    const safe = {
      _version: DB_VERSION,
      ...clone(db)
    };

    localStorage.setItem(ROOT_KEY, JSON.stringify(safe));
  }

  // ===============================
  // CLEAR DB
  // ===============================
  function clear() {
    const fresh = clone(DEFAULT_DB);
    localStorage.setItem(ROOT_KEY, JSON.stringify(fresh));
    return clone(fresh);
  }

  // ===============================
  // EXPORT
  // ===============================
  function exportDB() {
    return JSON.stringify(getDB(), null, 2);
  }

  // ===============================
  // IMPORT (SAFE VALIDATION)
  // ===============================
  function importDB(json) {

    try {
      const parsed = JSON.parse(json);

      if (!isValidDB(parsed)) {
        console.error("[StorageKernel] Import rejected: invalid schema");
        return false;
      }

      write(parsed);
      return true;

    } catch (e) {
      console.error("[StorageKernel] Import failed: invalid JSON");
      return false;
    }
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    getDB,
    write,
    clear,
    exportDB,
    importDB
  };

})();

window.StorageKernel = StorageKernel;
export const storage = {
  readJson(key, fallbackValue = null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallbackValue;
      }

      return JSON.parse(raw);
    } catch (_error) {
      return fallbackValue;
    }
  },

  writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  },

  readString(key, fallbackValue = "") {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ?? fallbackValue;
    } catch (_error) {
      return fallbackValue;
    }
  },

  writeString(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
      return true;
    } catch (_error) {
      return false;
    }
  },

  remove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (_error) {
      return false;
    }
  },
};

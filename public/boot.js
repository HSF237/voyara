// Runs before the app bundle so the first paint already has the right theme,
// language and text direction. Keep in sync with src/store/settings.ts.
(function () {
  try {
    var raw = localStorage.getItem('voyara.settings');
    var saved = raw ? JSON.parse(raw) : {};
    var s = saved.state || {};
    // Light is the default. Before settings v2, "system" was only ever a default.
    var theme = s.theme || 'light';
    if (theme === 'system' && (saved.version || 0) < 2) theme = 'light';
    var dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    if (s.language) {
      root.lang = s.language;
      root.dir = s.language === 'ar' ? 'rtl' : 'ltr';
    }
  } catch (_) {
    /* first visit or storage blocked: defaults apply */
  }
})();

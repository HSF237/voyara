// Runs before the app bundle so the first paint already has the right theme,
// language and text direction. Keep in sync with src/store/settings.ts.
(function () {
  try {
    var raw = localStorage.getItem('voyara.settings');
    var s = raw ? JSON.parse(raw).state || {} : {};
    var theme = s.theme || 'system';
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

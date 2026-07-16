const CONFIG = {
  // Helper functions to get/set settings in LocalStorage
  get MOCK_MODE() {
    const val = localStorage.getItem('cfg_mock_mode');
    return false; // Forced to always be false
  },
  set MOCK_MODE(val) {
    localStorage.setItem('cfg_mock_mode', val);
  },

  get API_URL() {
    return localStorage.getItem('cfg_api_url') || 'https://script.google.com/macros/s/AKfycbyaZZrCQtMX9zNjl7KKKS_ne86m5q4_Ma534x6knNbZ9xsWik7DJRtwaF0KzbWU0KUtxQ/exec';
  },
  set API_URL(val) {
    localStorage.setItem('cfg_api_url', val);
  },

  get API_KEY() {
    return '3e9fB2YcALL8458a1fd92ab9d1c772e6bcda';
  },

  get WA_TEMPLATE() {
    return localStorage.getItem('cfg_wa_template') || 'gimana kak? apakah sudah sesuai? atau bagai mana ya kak?';
  },
  set WA_TEMPLATE(val) {
    localStorage.setItem('cfg_wa_template', val);
  },

  get REMINDER_INTERVAL() {
    // default is 5 hours (in milliseconds)
    return parseInt(localStorage.getItem('cfg_reminder_interval')) || (5 * 60 * 60 * 1000);
  },
  set REMINDER_INTERVAL(val) {
    localStorage.setItem('cfg_reminder_interval', val);
  },

  get NOTIF_SILENT() {
    return localStorage.getItem('cfg_notif_silent') === 'true';
  },
  set NOTIF_SILENT(val) {
    localStorage.setItem('cfg_notif_silent', val);
  },

  get NOTIF_VIBRATE() {
    const val = localStorage.getItem('cfg_notif_vibrate');
    return val === null ? true : val === 'true';
  },
  set NOTIF_VIBRATE(val) {
    localStorage.setItem('cfg_notif_vibrate', val);
  },

  get NOTIF_STYLE() {
    return localStorage.getItem('cfg_notif_style') || 'casual';
  },
  set NOTIF_STYLE(val) {
    localStorage.setItem('cfg_notif_style', val);
  },

  get TOAST_POSITION() {
    return localStorage.getItem('cfg_toast_position') || 'top-right';
  },
  set TOAST_POSITION(val) {
    localStorage.setItem('cfg_toast_position', val);
  },

  get TOAST_DURATION() {
    return parseInt(localStorage.getItem('cfg_toast_duration')) || 4000;
  },
  set TOAST_DURATION(val) {
    localStorage.setItem('cfg_toast_duration', val);
  },

  get LANG() {
    return localStorage.getItem('cfg_lang') || 'id';
  },
  set LANG(val) {
    localStorage.setItem('cfg_lang', val);
  }
};

// Hide Global Loader when page loaded
window.addEventListener('load', () => {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.classList.add('opacity-0');
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 500); // Wait for the transition to finish
  }
});

const CONFIG = {
  MOCK_MODE: true, // Ubah ke false untuk menghubungkan ke Google Sheets API secara langsung
  API_URL: 'https://script.google.com/macros/s/AKfycbyaZZrCQtMX9zNjl7KKKS_ne86m5q4_Ma534x6knNbZ9xsWik7DJRtwaF0KzbWU0KUtxQ/exec',
  API_KEY: '3e9fB2YcALL8458a1fd92ab9d1c772e6bcda',
  WA_TEMPLATE: 'gimana kak? apakah sudah sesuai? atau bagai mana ya kak?',
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



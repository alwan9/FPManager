// Logika Autentikasi Admin Sederhana
const Auth = {
  // Cek apakah admin sudah login
  checkLogin: () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const isLoginPage = window.location.pathname.endsWith('login.html');

    if (!isLoggedIn && !isLoginPage) {
      // Jika belum login dan tidak di halaman login, redirect ke login.html
      window.location.href = 'login.html';
    } else if (isLoggedIn && isLoginPage) {
      // Jika sudah login tapi mengakses halaman login, redirect ke dashboard
      window.location.href = 'index.html';
    }
  },

  // Proses Login
  login: (password) => {
    if (password === CONFIG.ADMIN_PASS) {
      localStorage.setItem('isLoggedIn', 'true');
      return { success: true };
    }
    return { success: false, message: 'Password admin salah!' };
  },

  // Proses Logout
  logout: () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
  }
};

// Jalankan pengecekan rute saat script dimuat
document.addEventListener('DOMContentLoaded', () => {
  Auth.checkLogin();
});

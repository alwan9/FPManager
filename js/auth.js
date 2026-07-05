const Auth = {
  login: async (password) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "login");
      body.append("password", password);
      body.append("apiKey", CONFIG.API_KEY);
      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await res.json();
      if (result.success) {
        sessionStorage.setItem("token", result.token);
      }
      return result;
    } catch (err) {
      console.error(err);
      return {
        success: false,
        message: "Tidak dapat terhubung ke server."
      };
    }
  },
  checkLogin: () => {
    const token = sessionStorage.getItem("token");
    const isLoginPage =
      window.location.pathname.endsWith("login.html");
    if (!token && !isLoginPage) {
      window.location.href = "login.html";
    }
    if (token && isLoginPage) {
      window.location.href = "index.html";
    }
  },
  logout: async () => {
    try {
      const body = new URLSearchParams();
      body.append("action", "logout");
      body.append("token", sessionStorage.getItem("token"));
      body.append("apiKey", CONFIG.API_KEY);
      await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
    } catch (e) {
      console.log(e);
    }
    sessionStorage.removeItem("token");
    window.location.href = "login.html";
  }
};
document.addEventListener("DOMContentLoaded", () => {
  Auth.checkLogin();
});


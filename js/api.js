// Helper Unauthorized
const handleUnauthorized = (result) => {
  if (result.message === "Error: Unauthorized") {
    sessionStorage.removeItem("token");
    window.location.href = "login.html";
    return true;
  }
  return false;
};
// Wrapper API Helper
const API = {
  // Ambil token login
  getToken: () => {
    return sessionStorage.getItem("token");
  },
  // Ambil semua data proyek
  getProyek: async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getProyek&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
      );
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (!result.success) {
        console.error("API ERROR :", result.message);
        return [];
      }
      console.table(result.data);
      return result.data;
    } catch (error) {
      console.error("FETCH ERROR :", error);
      return [];
    }
  },
  addProyek: async (proyekData) => {
    try {
      console.table(proyekData);
      const body = new URLSearchParams();
      body.append("action", "addProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("data", JSON.stringify(proyekData));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: error.message
      };
    }
  },
  // Edit Proyek
  updateProyek: async (id, proyekData) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "updateProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("id", id);
      body.append("data", JSON.stringify(proyekData));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      return await response.json();
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },
  // Hapus Proyek
  deleteProyek: async (id) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "deleteProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("id", id);
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      if (!response.ok) {
        throw new Error("HTTP Error");
      }
      const result = await response.json();
      if (handleUnauthorized(result)) return result;
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },
  // Ambil semua data keuangan
  getKeuangan: async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getKeuangan&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
      );
      if (!response.ok) {
        throw new Error("HTTP Error");
      }
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (!result.success) {
        console.error("API ERROR :", result.message);
        return [];
      }
      return result.data;
    } catch (error) {
      console.error("FETCH ERROR :", error);
      return [];
    }
  },
  // Tambah Transaksi Keuangan
  addKeuangan: async (transaksiData) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "addKeuangan");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("data", JSON.stringify(transaksiData));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      return await response.json();
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },

  // ===========================
  // GENERATE AI
  // ===========================
  generateAI: async (data) => {

    try {

      const body = new URLSearchParams();

      body.append("action", "generateAI");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("data", JSON.stringify(data));

      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });

      const result = await response.json();

      if (handleUnauthorized(result)) return result;

      return result;

    } catch (error) {

      console.error(error);

      return {
        success: false,
        message: "Gagal menghubungi AI."
      };

    }
  }
};




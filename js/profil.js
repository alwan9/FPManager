// User Profile Logic (profil.js)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && typeof Auth.checkLogin === 'function') {
    Auth.checkLogin();
  }

  loadProfileData();

  // Attach submit listeners
  const infoForm = document.getElementById('profileInfoForm');
  if (infoForm) {
    infoForm.addEventListener('submit', handleSaveProfileInfo);
  }
});

// Load User Data into Profile UI
function loadProfileData() {
  const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const username = user.username || 'user';
  const name = user.name || user.username || 'Pengguna';
  const role = (user.role || 'service').toLowerCase();
  const roleDisplay = role.replace('_', ' ').toUpperCase();
  const email = user.email || (username + '@fpmanager.com');
  const phone = user.phone || user.wa || '';
  const avatar = user.avatar || '';

  // Update Hero Section
  const displayNameEl = document.getElementById('profileDisplayName');
  if (displayNameEl) displayNameEl.textContent = name;

  const usernameTextEl = document.getElementById('profileUsernameText');
  if (usernameTextEl) usernameTextEl.textContent = '@' + username;

  const roleBadgeEl = document.getElementById('profileRoleBadge');
  if (roleBadgeEl) roleBadgeEl.textContent = roleDisplay;

  const avatarEl = document.getElementById('profileAvatarLarge');
  if (avatarEl) {
    if (avatar) {
      avatarEl.innerHTML = `<img src="${sanitizeUrl(avatar)}" class="w-full h-full rounded-full object-cover">`;
    } else {
      avatarEl.textContent = (name || 'A').charAt(0).toUpperCase();
    }
  }

  // Populate Form Fields
  const uInput = document.getElementById('profUsername');
  if (uInput) uInput.value = username;

  const rInput = document.getElementById('profRole');
  if (rInput) rInput.value = roleDisplay;

  const nInput = document.getElementById('profName');
  if (nInput) nInput.value = name;

  const eInput = document.getElementById('profEmail');
  if (eInput) eInput.value = email;

  const pInput = document.getElementById('profPhone');
  if (pInput) pInput.value = phone;

  const aInput = document.getElementById('profAvatarUrl');
  if (aInput) aInput.value = avatar;

  // Render Session Browser Info
  const browserEl = document.getElementById('sessionBrowser');
  if (browserEl) {
    const ua = navigator.userAgent;
    let browserName = "Browser Web";
    if (ua.includes("Chrome")) browserName = "Google Chrome";
    else if (ua.includes("Firefox")) browserName = "Mozilla Firefox";
    else if (ua.includes("Safari")) browserName = "Apple Safari";
    else if (ua.includes("Edg")) browserName = "Microsoft Edge";
    browserEl.textContent = browserName;
  }
}

// Handle Avatar File Upload with Image Resizing
function handleAvatarFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Harap pilih file gambar valid!');
    else if (typeof showToast === 'function') showToast('Harap pilih file gambar valid!', 'error');
    return;
  }

  // Limit file size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Ukuran foto maksimal adalah 5MB!');
    else if (typeof showToast === 'function') showToast('Ukuran foto maksimal adalah 5MB!', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      // Resize image to max 250x250 for lightweight Data URL
      const canvas = document.createElement('canvas');
      const maxDim = 250;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const avatarEl = document.getElementById('profileAvatarLarge');
      if (avatarEl) {
        avatarEl.innerHTML = `<img src="${resizedDataUrl}" class="w-full h-full rounded-full object-cover">`;
      }

      const aInput = document.getElementById('profAvatarUrl');
      if (aInput) aInput.value = resizedDataUrl;

      if (typeof Toast !== 'undefined') Toast.success('Foto Dipilih', 'Klik "Simpan Perubahan" untuk menyimpan profil.');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

// Handle Save Profile Info
async function handleSaveProfileInfo(e) {
  e.preventDefault();

  const name = document.getElementById('profName').value.trim();
  const email = document.getElementById('profEmail').value.trim();
  const rawPhone = document.getElementById('profPhone').value.trim();
  let cleanPhone = rawPhone.replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (cleanPhone && !cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }
  const phone = cleanPhone;
  const avatar = document.getElementById('profAvatarUrl') ? document.getElementById('profAvatarUrl').value.trim() : '';

  if (!name) {
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Nama lengkap tidak boleh kosong!');
    else if (typeof showToast === 'function') showToast('Nama lengkap tidak boleh kosong!', 'error');
    return;
  }

  const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const origBtnText = submitBtn ? submitBtn.innerHTML : 'Simpan Perubahan';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan ke Spreadsheet...';
  }

  let finalAvatar = avatar;
  if (avatar.startsWith('data:image/')) {
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Mengunggah foto ke Google Drive...';
    }
    try {
      const ext = avatar.split(';')[0].split('/')[1] || 'jpg';
      const uploadRes = await API.uploadFile(`avatar-${user.id || 'usr'}.${ext}`, `image/${ext}`, avatar);
      if (uploadRes && uploadRes.success && uploadRes.url) {
        finalAvatar = uploadRes.url;
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;
        }
        const errMsg = (uploadRes && uploadRes.message) ? uploadRes.message : 'Gagal mengunggah foto ke Google Drive.';
        if (typeof Toast !== 'undefined') Toast.error('Upload Gagal', errMsg);
        else alert(errMsg);
        return;
      }
    } catch (uploadErr) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnText;
      }
      if (typeof Toast !== 'undefined') Toast.error('Upload Error', 'Terjadi kesalahan saat mengunggah foto.');
      return;
    }
  }

  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan ke Spreadsheet...';
  }

  try {
    let res = { success: false, message: 'Gagal menghubungkan ke Spreadsheet' };
    if (typeof API !== 'undefined' && typeof API.updateUser === 'function' && user.id) {
      res = await API.updateUser(user.id, { name, email, phone, avatar: finalAvatar });
    } else if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
      const body = new URLSearchParams();
      body.append('action', 'updateUser');
      body.append('id', user.id || 'USR-001');
      body.append('userId', user.id || 'USR-001');
      body.append('role', user.role || 'service');
      body.append('token', typeof Auth !== 'undefined' && Auth.getToken ? Auth.getToken() : '');
      body.append('data', JSON.stringify({ name, email, phone, avatar: finalAvatar }));
      body.append('apiKey', CONFIG.API_KEY);
      const response = await fetch(CONFIG.API_URL, { method: 'POST', body });
      res = await response.json();
    }

    if (res && res.success) {
      // Sync local user object only after successful spreadsheet write
      user.name = name;
      user.email = email;
      user.phone = phone;
      user.avatar = finalAvatar;

      sessionStorage.setItem('user', JSON.stringify(user));
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      loadProfileData();
      if (typeof Auth !== 'undefined' && typeof Auth.applyMenuPermissions === 'function') Auth.applyMenuPermissions();

      if (typeof Toast !== 'undefined') {
        Toast.success('Profil Diperbarui', 'Data profil berhasil disimpan langsung di Spreadsheet.');
      } else if (typeof showToast === 'function') {
        showToast('Data profil berhasil disimpan di Spreadsheet!', 'success');
      } else {
        alert('Data profil berhasil disimpan di Spreadsheet!');
      }
    } else {
      const errMsg = (res && res.message) ? res.message : 'Gagal menyimpan data ke Spreadsheet.';
      if (typeof Toast !== 'undefined') Toast.error('Gagal', errMsg);
      else alert(errMsg);
    }
  } catch (err) {
    console.error('API sync exception:', err);
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Terjadi kesalahan koneksi saat menyimpan ke Spreadsheet.');
    else alert('Terjadi kesalahan koneksi saat menyimpan ke Spreadsheet.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  }
}


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
  const phone = user.phone || user.wa || user.nowa || '';
  const avatar = user.avatar || user.url_profile || user.urlprofile || user.foto || user.photo || user.avatar_url || user.avatarUrl || user.urlProfile || user.Url_profile || '';

  // Update Hero Section
  const displayNameEl = document.getElementById('profileDisplayName');
  if (displayNameEl) displayNameEl.textContent = name;

  const usernameTextEl = document.getElementById('profileUsernameText');
  if (usernameTextEl) usernameTextEl.textContent = '@' + username;

  const roleBadgeEl = document.getElementById('profileRoleBadge');
  if (roleBadgeEl) roleBadgeEl.textContent = roleDisplay;

  const avatarEl = document.getElementById('profileAvatarLarge');
  if (avatarEl) {
    const formatted = (typeof Auth !== 'undefined' && typeof Auth.formatAvatarUrl === 'function') ? Auth.formatAvatarUrl(avatar) : avatar;
    const initial = (name || 'A').charAt(0).toUpperCase();
    if (formatted) {
      avatarEl.innerHTML = `<img src="${sanitizeUrl(formatted)}" alt="${initial}" class="w-full h-full rounded-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full rounded-full flex items-center justify-center font-bold text-4xl text-white\\'>${initial}</div>'">`;
    } else {
      avatarEl.textContent = initial;
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
  if (aInput) {
    aInput.value = avatar;
    aInput.oninput = () => {
      const liveVal = aInput.value.trim();
      const liveFormatted = (typeof Auth !== 'undefined' && typeof Auth.formatAvatarUrl === 'function') ? Auth.formatAvatarUrl(liveVal) : liveVal;
      const initial = (nInput && nInput.value.trim() ? nInput.value.trim() : name || 'A').charAt(0).toUpperCase();
      if (avatarEl) {
        if (liveFormatted) {
          avatarEl.innerHTML = `<img src="${sanitizeUrl(liveFormatted)}" alt="${initial}" class="w-full h-full rounded-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full rounded-full flex items-center justify-center font-bold text-4xl text-white\\'>${initial}</div>'">`;
        } else {
          avatarEl.textContent = initial;
        }
      }
    };
  }

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

// =================================================================
// SISTEM ATUR POSISI & ZOOM FOTO PROFIL (PAN & ZOOM CROPPER)
// =================================================================
let cropState = {
  img: null,
  userZoom: 1.0,
  minZoom: 1.0,
  maxZoom: 3.5,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  pinchDist: null,
  pinchZoomStart: 1.0,
  isListenersAttached: false
};

function initCropEventListeners() {
  if (cropState.isListenersAttached) return;
  cropState.isListenersAttached = true;

  const canvas = document.getElementById('cropCanvas');
  const wrapper = document.getElementById('cropCanvasWrapper');
  const slider = document.getElementById('cropZoomSlider');
  const btnZoomIn = document.getElementById('btnCropZoomIn');
  const btnZoomOut = document.getElementById('btnCropZoomOut');
  const btnRotate = document.getElementById('btnCropRotate');
  const btnReset = document.getElementById('btnCropReset');
  const modal = document.getElementById('photoCropModal');

  if (!canvas || !wrapper) return;

  // 1. Mouse Dragging
  wrapper.addEventListener('mousedown', (e) => {
    if (!cropState.img) return;
    cropState.isDragging = true;
    cropState.startX = e.clientX - cropState.offsetX;
    cropState.startY = e.clientY - cropState.offsetY;
    wrapper.classList.remove('cursor-grab');
    wrapper.classList.add('cursor-grabbing');
  });

  window.addEventListener('mousemove', (e) => {
    if (!cropState.isDragging) return;
    cropState.offsetX = e.clientX - cropState.startX;
    cropState.offsetY = e.clientY - cropState.startY;
    renderCropCanvas();
  });

  window.addEventListener('mouseup', () => {
    if (cropState.isDragging) {
      cropState.isDragging = false;
      if (wrapper) {
        wrapper.classList.remove('cursor-grabbing');
        wrapper.classList.add('cursor-grab');
      }
    }
  });

  // 2. Mouse Wheel Zoom
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!cropState.img) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setCropZoom(cropState.userZoom + delta);
  }, { passive: false });

  // 3. Touch Gestures (Mobile Pan & Pinch-to-Zoom)
  wrapper.addEventListener('touchstart', (e) => {
    if (!cropState.img) return;
    if (e.touches.length === 1) {
      cropState.isDragging = true;
      cropState.startX = e.touches[0].clientX - cropState.offsetX;
      cropState.startY = e.touches[0].clientY - cropState.offsetY;
    } else if (e.touches.length === 2) {
      cropState.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      cropState.pinchDist = Math.hypot(dx, dy);
      cropState.pinchZoomStart = cropState.userZoom;
    }
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    if (!cropState.img) return;
    if (e.touches.length === 1 && cropState.isDragging) {
      e.preventDefault();
      cropState.offsetX = e.touches[0].clientX - cropState.startX;
      cropState.offsetY = e.touches[0].clientY - cropState.startY;
      renderCropCanvas();
    } else if (e.touches.length === 2 && cropState.pinchDist) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      if (cropState.pinchDist > 0) {
        const ratio = currentDist / cropState.pinchDist;
        setCropZoom(cropState.pinchZoomStart * ratio);
      }
    }
  }, { passive: false });

  wrapper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      cropState.pinchDist = null;
    }
    if (e.touches.length === 0) {
      cropState.isDragging = false;
    }
  });

  // 4. Zoom Slider
  if (slider) {
    slider.addEventListener('input', (e) => {
      setCropZoom(parseFloat(e.target.value));
    });
  }

  // 5. Zoom In/Out Buttons
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      setCropZoom(cropState.userZoom + 0.15);
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      setCropZoom(cropState.userZoom - 0.15);
    });
  }

  // 6. Rotate Button
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      cropState.rotation = (cropState.rotation + 90) % 360;
      renderCropCanvas();
    });
  }

  // 7. Reset Button
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetCropState();
    });
  }

  // 8. Close on Click Outside or Escape
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePhotoAdjuster();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closePhotoAdjuster();
    }
  });
}

function setCropZoom(newZoom) {
  const clamped = Math.max(cropState.minZoom, Math.min(cropState.maxZoom, parseFloat(newZoom) || 1.0));
  cropState.userZoom = Math.round(clamped * 100) / 100;
  const slider = document.getElementById('cropZoomSlider');
  if (slider) slider.value = cropState.userZoom;
  const zoomText = document.getElementById('cropZoomValueText');
  if (zoomText) zoomText.textContent = cropState.userZoom.toFixed(1) + 'x';
  renderCropCanvas();
}

function resetCropState() {
  cropState.userZoom = 1.0;
  cropState.offsetX = 0;
  cropState.offsetY = 0;
  cropState.rotation = 0;
  setCropZoom(1.0);
}

function nudgeCrop(dx, dy) {
  cropState.offsetX += dx;
  cropState.offsetY += dy;
  renderCropCanvas();
}

function renderCropCanvas() {
  const canvas = document.getElementById('cropCanvas');
  if (!canvas || !cropState.img) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width; // 280
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42; // ~118px radius

  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, size, size);

  const img = cropState.img;
  const minDim = Math.min(img.width, img.height);
  const baseScale = (radius * 2) / minDim;
  const totalScale = baseScale * cropState.userZoom;

  const drawW = img.width * totalScale;
  const drawH = img.height * totalScale;

  // Draw image with translation, rotation and zoom
  ctx.save();
  ctx.translate(cx + cropState.offsetX, cy + cropState.offsetY);
  if (cropState.rotation !== 0) {
    ctx.rotate((cropState.rotation * Math.PI) / 180);
  }
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Draw Darkened Overlay outside the circle
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(9, 9, 11, 0.65)';
  ctx.fill();

  // Draw Circular Guide Border
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#6366f1'; // Indigo ring
  ctx.stroke();

  // Subtle Rule-of-Thirds Grid inside the circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  const third = (radius * 2) / 3;
  ctx.beginPath();
  // Vertical grid lines
  ctx.moveTo(cx - third / 2, cy - radius);
  ctx.lineTo(cx - third / 2, cy + radius);
  ctx.moveTo(cx + third / 2, cy - radius);
  ctx.lineTo(cx + third / 2, cy + radius);
  // Horizontal grid lines
  ctx.moveTo(cx - radius, cy - third / 2);
  ctx.lineTo(cx + radius, cy - third / 2);
  ctx.moveTo(cx - radius, cy + third / 2);
  ctx.lineTo(cx + radius, cy + third / 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function applyPhotoCrop() {
  if (!cropState.img) return;

  const canvas = document.getElementById('cropCanvas');
  const size = canvas ? canvas.width : 280;
  const radius = size * 0.42;

  const exportSize = 360; // High resolution square avatar
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportSize;
  exportCanvas.height = exportSize;
  const expCtx = exportCanvas.getContext('2d');

  const expScale = exportSize / (radius * 2);
  const expCenter = exportSize / 2;

  const img = cropState.img;
  const minDim = Math.min(img.width, img.height);
  const baseScale = (radius * 2) / minDim;
  const totalScale = baseScale * cropState.userZoom;

  const expDrawW = img.width * totalScale * expScale;
  const expDrawH = img.height * totalScale * expScale;

  expCtx.save();
  expCtx.translate(expCenter + (cropState.offsetX * expScale), expCenter + (cropState.offsetY * expScale));
  if (cropState.rotation !== 0) {
    expCtx.rotate((cropState.rotation * Math.PI) / 180);
  }
  expCtx.drawImage(img, -expDrawW / 2, -expDrawH / 2, expDrawW, expDrawH);
  expCtx.restore();

  const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.88);

  // Update UI avatar preview
  const avatarEl = document.getElementById('profileAvatarLarge');
  if (avatarEl) {
    avatarEl.innerHTML = `<img src="${croppedDataUrl}" class="w-full h-full rounded-full object-cover">`;
  }

  // Update form input field
  const aInput = document.getElementById('profAvatarUrl');
  if (aInput) {
    aInput.value = croppedDataUrl;
  }

  closePhotoAdjuster();

  if (typeof Toast !== 'undefined') {
    Toast.success('Foto Disesuaikan', 'Klik "Simpan Perubahan" untuk menyimpan ke database.');
  } else if (typeof showToast === 'function') {
    showToast('Foto disesuaikan! Klik Simpan Perubahan untuk menyimpan.', 'success');
  }
}

function openPhotoAdjusterWithImage(img) {
  initCropEventListeners();
  cropState.img = img;
  resetCropState();

  const modal = document.getElementById('photoCropModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const canvas = document.getElementById('cropCanvas');
    if (canvas) {
      canvas.width = 280;
      canvas.height = 280;
    }
    renderCropCanvas();
  }
}

function closePhotoAdjuster() {
  const modal = document.getElementById('photoCropModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function openPhotoAdjuster() {
  initCropEventListeners();
  if (cropState.img) {
    const modal = document.getElementById('photoCropModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      renderCropCanvas();
    }
    return;
  }

  // Try to load current avatar
  const aInput = document.getElementById('profAvatarUrl');
  const avatarEl = document.getElementById('profileAvatarLarge');
  let currentSrc = (aInput && aInput.value.trim()) ? aInput.value.trim() : '';
  if (!currentSrc && avatarEl) {
    const imgTag = avatarEl.querySelector('img');
    if (imgTag && imgTag.src) currentSrc = imgTag.src;
  }

  if (currentSrc) {
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      openPhotoAdjusterWithImage(tempImg);
    };
    tempImg.onerror = () => {
      if (typeof Toast !== 'undefined') {
        Toast.info('Pilih Foto', 'Silakan pilih foto dari perangkat Anda untuk mengatur posisi & zoom.');
      }
      document.getElementById('avatarFileInput').click();
    };
    tempImg.src = currentSrc;
  } else {
    if (typeof Toast !== 'undefined') {
      Toast.info('Pilih Foto', 'Harap pilih foto terlebih dahulu.');
    }
    document.getElementById('avatarFileInput').click();
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

  // Limit file size to 8MB
  if (file.size > 8 * 1024 * 1024) {
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Ukuran foto maksimal adalah 8MB!');
    else if (typeof showToast === 'function') showToast('Ukuran foto maksimal adalah 8MB!', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      openPhotoAdjusterWithImage(img);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);

  e.target.value = '';
}

window.openPhotoAdjuster = openPhotoAdjuster;
window.closePhotoAdjuster = closePhotoAdjuster;
window.applyPhotoCrop = applyPhotoCrop;
window.nudgeCrop = nudgeCrop;
window.handleAvatarFileSelect = handleAvatarFileSelect;

// Handle Save Profile Info
let isProfileSubmitting = false;
async function handleSaveProfileInfo(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (isProfileSubmitting || (submitBtn && submitBtn.disabled)) return;

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

  isProfileSubmitting = true;
  const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');

  const origBtnText = submitBtn ? submitBtn.innerHTML : 'Simpan Perubahan';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan ke Spreadsheet...';
  }

  let finalAvatar = avatar;
  if (avatar.startsWith('data:image/')) {
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Mengunggah foto ke Google Drive...';
    }
    try {
      const ext = avatar.split(';')[0].split('/')[1] || 'jpg';
      const folderId = (typeof CONFIG !== 'undefined' && CONFIG.PROFILE_FOLDER_ID) ? CONFIG.PROFILE_FOLDER_ID : '1ps66jVi9PYmw8a9BWV_tgyBjYsiKnKXE';
      const uploadRes = await API.uploadFile(`avatar-${user.id || 'usr'}.${ext}`, `image/${ext}`, avatar, { isProfile: true, folderId });
      if (uploadRes && uploadRes.success && uploadRes.url) {
        finalAvatar = uploadRes.url;
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
          submitBtn.innerHTML = origBtnText;
        }
        isProfileSubmitting = false;
        const errMsg = (uploadRes && uploadRes.message) ? uploadRes.message : 'Gagal mengunggah foto ke Google Drive.';
        if (typeof Toast !== 'undefined') Toast.error('Upload Gagal', errMsg);
        else if (typeof showToast === 'function') showToast({ title: 'Upload Gagal', message: errMsg, type: 'error' });
        return;
      }
    } catch (uploadErr) {
      isProfileSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
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
      }
    } else {
      const errMsg = (res && res.message) ? res.message : 'Gagal menyimpan data ke Spreadsheet.';
      if (typeof Toast !== 'undefined') Toast.error('Gagal', errMsg);
      else if (typeof showToast === 'function') showToast({ title: 'Gagal', message: errMsg, type: 'error' });
    }
  } catch (err) {
    console.error('API sync exception:', err);
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Terjadi kesalahan koneksi saat menyimpan ke Spreadsheet.');
    else if (typeof showToast === 'function') showToast({ title: 'Error', message: 'Terjadi kesalahan koneksi saat menyimpan ke Spreadsheet.', type: 'error' });
  } finally {
    isProfileSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      submitBtn.innerHTML = origBtnText;
    }
  }
}


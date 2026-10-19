/**
 * FPManager - Modern Toast & Dynamic Island Notification System
 * Specifically crafted for iPhone 15 / 15 Plus / 15 Pro & Dynamic Island devices,
 * with adaptive fallback for desktop and other mobile environments.
 */
const Toast = (() => {

    let activeIsland = null;
    let islandTimeout = null;

    // Helper: Shorten common long phrases for compact mobile & pill displays
    function shortenToastForMobile(text) {
        if (!text || typeof text !== 'string') return text;
        let s = text.trim();

        const phraseMap = [
            [/berhasil disimpan langsung di Spreadsheet/gi, 'berhasil disimpan'],
            [/disimpan langsung di Spreadsheet/gi, 'disimpan'],
            [/langsung di Spreadsheet/gi, ''],
            [/ke clipboard/gi, ''],
            [/di laci notifikasi perangkat Anda/gi, 'di perangkat Anda'],
            [/Silakan periksa laci notifikasi perangkat Anda\.?/gi, 'Periksa notifikasi perangkat.'],
            [/telah dihapus dari history/gi, 'berhasil dihapus'],
            [/telah dihapus dari sistem/gi, 'berhasil dihapus'],
            [/berhasil di-drop dan dimuat/gi, 'berhasil dimuat'],
            [/berhasil dimasukkan ke catatan/gi, 'masuk catatan'],
            [/otomatis dimasukkan ke catatan/gi, 'masuk catatan'],
            [/otomatis diterapkan/gi, 'diterapkan'],
            [/resmi berhasil diunduh/gi, 'berhasil diunduh'],
            [/berhasil diunduh ke perangkat/gi, 'berhasil diunduh'],
            [/Terjadi kesalahan saat memproses/gi, 'Gagal memproses'],
            [/Terjadi kesalahan saat mengekspor/gi, 'Gagal ekspor'],
            [/Terjadi kesalahan saat memuat/gi, 'Gagal memuat'],
            [/Terjadi kesalahan saat menyimpan/gi, 'Gagal menyimpan'],
            [/Terjadi kesalahan saat/gi, 'Gagal'],
            [/Harap masukkan file gambar valid/gi, 'Format gambar tidak valid'],
            [/Harap berikan izin notifikasi terlebih dahulu/gi, 'Perlu izin notifikasi'],
            [/Browser Anda tidak mendukung notifikasi push/gi, 'Browser tidak dukung notifikasi'],
            [/Browser menolak akses clipboard\.?/gi, 'Akses clipboard ditolak.'],
            [/Anda sekarang dapat menerima notifikasi pengingat deadline\.?/gi, 'Notifikasi deadline aktif.'],
            [/Silakan periksa kembali/gi, 'Periksa kembali'],
            [/Harap periksa kembali/gi, 'Periksa kembali'],
            [/Harap masukkan/gi, 'Masukkan'],
            [/Harap isi/gi, 'Isi'],
            [/Harap pilih/gi, 'Pilih'],
            [/recorded successfully/gi, 'saved'],
            [/deleted successfully/gi, 'deleted'],
            [/updated successfully/gi, 'updated'],
            [/copied to clipboard/gi, 'copied'],
            [/downloaded successfully/gi, 'downloaded'],
            [/An error occurred while compiling/gi, 'Failed compiling'],
            [/An error occurred while exporting/gi, 'Failed export'],
            [/An error occurred while/gi, 'Failed']
        ];

        phraseMap.forEach(([regex, replacement]) => {
            s = s.replace(regex, replacement);
        });

        return s.replace(/\s+/g, ' ')
            .replace(/\s+([.,!?])/g, '$1')
            .replace(/\(\s+/g, '(')
            .replace(/\s+\)/g, ')')
            .trim();
    }

    // Detect if current device is iPhone 15/15 Plus/15 Pro/15 Pro Max or newer Dynamic Island device
    function isIPhone15OrDynamicIslandDevice() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

        const ua = navigator.userAgent || '';
        const isIOS = /iPhone|iPad|iPod/.test(ua) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (!isIOS) return false;

        const screenW = (window.screen ? window.screen.width : window.innerWidth) || 0;
        const screenH = (window.screen ? window.screen.height : window.innerHeight) || 0;
        const minDim = Math.min(screenW, screenH);
        const maxDim = Math.max(screenW, screenH);

        // Exact physical points for Dynamic Island Apple devices:
        // - iPhone 14 Pro, iPhone 15, iPhone 15 Pro, iPhone 16: 393 x 852
        // - iPhone 14 Pro Max, iPhone 15 Plus, iPhone 15 Pro Max, iPhone 16 Plus: 430 x 932
        // - iPhone 16 Pro: 402 x 874
        // - iPhone 16 Pro Max: 440 x 956
        const isDynamicIslandSize = (
            (minDim === 393 && maxDim === 852) ||
            (minDim === 430 && maxDim === 932) ||
            (minDim === 402 && maxDim === 874) ||
            (minDim === 440 && maxDim === 956)
        );

        // Also check via safe-area-inset-top (Dynamic Island models have >= 50px top inset in PWA standalone)
        let hasDynamicIslandInset = false;
        try {
            const testEl = document.createElement('div');
            testEl.style.cssText = 'position:fixed;top:0;left:0;height:env(safe-area-inset-top, 0px);visibility:hidden;pointer-events:none;';
            document.body.appendChild(testEl);
            hasDynamicIslandInset = (testEl.offsetHeight >= 50);
            if (testEl.parentNode) testEl.parentNode.removeChild(testEl);
        } catch (e) {}

        return isDynamicIslandSize || hasDynamicIslandInset;
    }

    // Check user preference or automatically enable Dynamic Island on iPhone 15+ and mobile
    function shouldUseDynamicIsland() {
        const pref = (typeof CONFIG !== 'undefined' && CONFIG.TOAST_STYLE) ? CONFIG.TOAST_STYLE : 'auto';
        if (pref === 'dynamic-island') return true;
        if (pref === 'classic') return false;

        // In 'auto' mode:
        // 1. Always activate on detected iPhone 15+ / Dynamic Island hardware
        if (isIPhone15OrDynamicIslandDevice()) return true;

        // 2. Default to Dynamic Island on mobile viewports (< 768px) for a stunning modern feel
        if (typeof window !== 'undefined' && window.innerWidth < 768) return true;

        return false;
    }

    // Trigger subtle tactile haptic vibration if supported
    function triggerHaptic(type) {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                if (type === 'error') {
                    navigator.vibrate([20, 50, 20]);
                } else if (type === 'warning') {
                    navigator.vibrate([15, 30, 15]);
                } else {
                    navigator.vibrate([12, 35, 15]);
                }
            } catch (e) {
                // Ignore vibration restrictions
            }
        }
    }

    // Palette & icons configuration for both Classic and Dynamic Island
    const typeConfigs = {
        success: {
            color: "#30D158",
            bgClassic: "#16a34a",
            icon: "fa-circle-check",
            badgeClass: "di-badge-success"
        },
        error: {
            color: "#FF453A",
            bgClassic: "#dc2626",
            icon: "fa-circle-xmark",
            badgeClass: "di-badge-error"
        },
        warning: {
            color: "#FF9F0A",
            bgClassic: "#d97706",
            icon: "fa-triangle-exclamation",
            badgeClass: "di-badge-warning"
        },
        info: {
            color: "#0A84FF",
            bgClassic: "#2563eb",
            icon: "fa-circle-info",
            badgeClass: "di-badge-info"
        }
    };

    /**
     * Show Apple Dynamic Island Notification
     */
    function showDynamicIsland(title, message, type = "success") {
        const cfg = typeConfigs[type] || typeConfigs.info;
        const duration = (typeof CONFIG !== 'undefined' && CONFIG.TOAST_DURATION) 
            ? Math.max(CONFIG.TOAST_DURATION, 1600) 
            : 2600;

        const finalTitle = shortenToastForMobile(title) || "Pemberitahuan";
        const finalMessage = message ? shortenToastForMobile(message) : "";

        // Container setup
        let container = document.getElementById("dynamic-island-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "dynamic-island-container";
            document.body.appendChild(container);
        }

        const isStandalone = (typeof window !== 'undefined') &&
            (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

        if (isStandalone && isIPhone15OrDynamicIslandDevice()) {
            container.classList.add('standalone-island');
        } else {
            container.classList.remove('standalone-island');
        }

        // Haptic pulse
        triggerHaptic(type);

        // 1. If an island is ALREADY active on screen: morph it in place seamlessly!
        if (activeIsland && activeIsland.isConnected) {
            if (islandTimeout) clearTimeout(islandTimeout);

            const badge = activeIsland.querySelector('.di-icon-badge');
            if (badge) {
                badge.className = `di-icon-badge ${cfg.badgeClass}`;
                badge.innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;
            }

            const titleEl = activeIsland.querySelector('.di-title');
            if (titleEl) titleEl.textContent = finalTitle;

            const msgEl = activeIsland.querySelector('.di-message');
            if (msgEl) {
                if (finalMessage) {
                    msgEl.textContent = finalMessage;
                    msgEl.style.display = 'block';
                } else {
                    msgEl.style.display = 'none';
                }
            } else if (finalMessage) {
                const body = activeIsland.querySelector('.di-body');
                if (body) {
                    const newMsg = document.createElement('div');
                    newMsg.className = 'di-message';
                    newMsg.textContent = finalMessage;
                    body.appendChild(newMsg);
                }
            }

            // Update waveform color
            activeIsland.querySelectorAll('.di-wave-bar').forEach(bar => {
                bar.style.backgroundColor = cfg.color;
            });

            // Reset and restart circular timer bar
            const timerBar = activeIsland.querySelector('.di-timer-bar');
            if (timerBar) {
                timerBar.style.stroke = cfg.color;
                timerBar.style.transition = 'none';
                timerBar.style.strokeDashoffset = '0';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        timerBar.style.transition = `stroke-dashoffset ${duration}ms linear`;
                        timerBar.style.strokeDashoffset = '62.83';
                    });
                });
            }

            // Trigger quick morph jiggle
            activeIsland.classList.remove('di-morph-jiggle');
            void activeIsland.offsetWidth;
            activeIsland.classList.add('di-morph-jiggle');

            // Schedule dismiss
            islandTimeout = setTimeout(() => dismissIsland(activeIsland), duration);
            return;
        }

        // 2. Create brand-new Dynamic Island pill
        const island = document.createElement("div");
        island.id = "dynamic-island-pill";
        island.className = "dynamic-island di-enter";
        island.setAttribute("role", "alert");
        island.setAttribute("aria-live", "assertive");

        island.innerHTML = `
            <div class="di-inner">
                <div class="di-icon-badge ${cfg.badgeClass}">
                    <i class="fa-solid ${cfg.icon}"></i>
                </div>
                <div class="di-body">
                    <div class="di-title">${finalTitle}</div>
                    ${finalMessage ? `<div class="di-message">${finalMessage}</div>` : ''}
                </div>
                <div class="di-trailing">
                    <div class="di-wave-box" title="Aktivitas FPManager">
                        <span class="di-wave-bar" style="background:${cfg.color}"></span>
                        <span class="di-wave-bar" style="background:${cfg.color}"></span>
                        <span class="di-wave-bar" style="background:${cfg.color}"></span>
                    </div>
                    <svg class="di-timer-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="di-timer-bg" cx="12" cy="12" r="10"></circle>
                        <circle class="di-timer-bar" cx="12" cy="12" r="10" style="stroke:${cfg.color}"></circle>
                    </svg>
                    <button type="button" class="di-close-btn" aria-label="Tutup Notifikasi">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(island);
        activeIsland = island;

        // Dismiss helper with exit animation
        function dismissIsland(targetIsland) {
            if (!targetIsland || !targetIsland.isConnected) return;
            if (targetIsland.classList.contains('di-exit')) return;

            targetIsland.classList.remove('di-enter', 'di-morph-jiggle');
            targetIsland.classList.add('di-exit');

            setTimeout(() => {
                if (targetIsland && targetIsland.parentNode) {
                    targetIsland.parentNode.removeChild(targetIsland);
                }
                if (activeIsland === targetIsland) {
                    activeIsland = null;
                }
            }, 350);
        }

        // Tap on close button
        const closeBtn = island.querySelector('.di-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (islandTimeout) clearTimeout(islandTimeout);
                dismissIsland(island);
            });
        }

        // Tap anywhere on island to dismiss
        island.addEventListener('click', () => {
            if (islandTimeout) clearTimeout(islandTimeout);
            dismissIsland(island);
        });

        // Swipe Up to Dismiss Gesture (Native iOS physics)
        let touchStartY = 0;
        let isTouching = false;

        island.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length === 1) {
                touchStartY = e.touches[0].clientY;
                isTouching = true;
            }
        }, { passive: true });

        island.addEventListener('touchmove', (e) => {
            if (!isTouching || !e.touches || e.touches.length !== 1) return;
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - touchStartY;
            if (deltaY < 0) {
                // Dragging upwards
                const progress = Math.min(Math.abs(deltaY) / 100, 1);
                island.style.transform = `translateY(${deltaY * 0.7}px) scale(${1 - progress * 0.15})`;
                island.style.opacity = `${1 - progress * 0.6}`;
            }
        }, { passive: true });

        island.addEventListener('touchend', (e) => {
            if (!isTouching) return;
            isTouching = false;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchEndY - touchStartY;
            if (deltaY < -20) {
                // Quick swipe up registered -> dismiss immediately
                if (islandTimeout) clearTimeout(islandTimeout);
                dismissIsland(island);
            } else {
                // Snap back
                island.style.transform = '';
                island.style.opacity = '';
            }
        }, { passive: true });

        // Start circular SVG timer animation
        const timerBar = island.querySelector('.di-timer-bar');
        if (timerBar) {
            timerBar.style.strokeDasharray = '62.83';
            timerBar.style.strokeDashoffset = '0';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    timerBar.style.transition = `stroke-dashoffset ${duration}ms linear`;
                    timerBar.style.strokeDashoffset = '62.83';
                });
            });
        }

        // Auto dismiss timer
        if (islandTimeout) clearTimeout(islandTimeout);
        islandTimeout = setTimeout(() => dismissIsland(island), duration);
    }

    /**
     * Show Classic Floating Box Toast
     */
    function showClassicToast(title, message, type = "success") {
        let container = document.getElementById("toast-container");

        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.style.zIndex = "999999";
            document.body.appendChild(container);
        }

        const pos = (typeof CONFIG !== 'undefined' && CONFIG.TOAST_POSITION) ? CONFIG.TOAST_POSITION : 'top-right';
        let posClasses = "fixed z-[999999] flex flex-col gap-4";
        if (pos === 'top-left') {
            posClasses += " top-6 left-6";
        } else if (pos === 'bottom-right') {
            posClasses += " bottom-6 right-6";
        } else if (pos === 'bottom-left') {
            posClasses += " bottom-6 left-6";
        } else if (pos === 'top-center') {
            posClasses += " top-6 left-1/2 -translate-x-1/2";
        } else {
            posClasses += " top-6 right-6";
        }
        container.className = posClasses;

        const duration = (typeof CONFIG !== 'undefined' && CONFIG.TOAST_DURATION) ? CONFIG.TOAST_DURATION : 1000;
        const c = typeConfigs[type] || typeConfigs.info;

        const isMobile = (typeof window !== 'undefined' && window.innerWidth < 768);
        const finalTitle = isMobile ? shortenToastForMobile(title) : title;
        const finalMessage = isMobile ? shortenToastForMobile(message) : message;

        const toast = document.createElement("div");
        toast.className =
            "custom-toast toast-hidden w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden transform transition-all duration-300";

        toast.innerHTML = `
            <div style="z-index: 999;" class="toast-inner p-5">
                <div class="flex justify-between items-start">
                    <div class="flex items-center">
                        <div
                            class="toast-icon-container w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] max-w-[2.5rem] max-h-[2.5rem] aspect-square rounded-full flex items-center justify-center text-white mr-4 shrink-0"
                            style="background:${c.bgClassic}">
                            <i class="fa-solid ${c.icon}"></i>
                        </div>
                        <div>
                            <h3 class="toast-title font-bold text-zinc-800">
                                ${finalTitle}
                            </h3>
                            ${finalMessage ? `
                            <p class="toast-message text-sm text-zinc-500 mt-1">
                                ${finalMessage}
                            </p>` : ''}
                        </div>
                    </div>
                    <button class="close close-btn text-zinc-400 hover:text-black ml-4">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div class="h-1 bg-zinc-100">
                <div
                    class="progress h-full"
                    style="
                        background:${c.bgClassic};
                        width:100%;
                        transition:width ${duration}ms linear;
                    ">
                </div>
            </div>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove("toast-hidden");
            toast.classList.add("toast-visible");
        });

        setTimeout(() => {
            const prog = toast.querySelector(".progress");
            if (prog) prog.style.width = "0%";
        }, 100);

        function removeToast() {
            toast.classList.remove("toast-visible");
            toast.classList.add("toast-hidden");

            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }

        const closeBtn = toast.querySelector(".close");
        if (closeBtn) closeBtn.onclick = removeToast;

        setTimeout(removeToast, duration);
    }

    /**
     * Master show function with automatic routing
     */
    function show(title, message, type = "success") {
        if (shouldUseDynamicIsland()) {
            showDynamicIsland(title, message, type);
        } else {
            showClassicToast(title, message, type);
        }
    }

    return {
        show(title, message, type) {
            show(title, message, type);
        },

        success(title, message) {
            show(title, message, "success");
        },

        error(title, message) {
            show(title, message, "error");
        },

        warning(title, message) {
            show(title, message, "warning");
        },

        info(title, message) {
            show(title, message, "info");
        },

        // Explicit Dynamic Island trigger
        dynamicIsland(title, message, type = "success") {
            showDynamicIsland(title, message, type);
        },

        // Explicit Classic Toast trigger
        classic(title, message, type = "success") {
            showClassicToast(title, message, type);
        },

        // Helper to check device capability
        isDynamicIslandSupported() {
            return isIPhone15OrDynamicIslandDevice();
        },

        // Programmatic dismiss
        dismiss() {
            if (activeIsland && activeIsland.isConnected) {
                activeIsland.classList.add('di-exit');
                setTimeout(() => {
                    if (activeIsland && activeIsland.parentNode) activeIsland.parentNode.removeChild(activeIsland);
                    activeIsland = null;
                }, 350);
            }
        }
    };

})();

/**
 * Universal Global Function showToast
 */
function showToast(opt, type = "info") {
    let title = "";
    let message = "";
    let toastType = type;

    if (opt && typeof opt === "object" && !Array.isArray(opt)) {
        title = opt.title || "";
        message = opt.message || "";
        toastType = opt.type || "info";
    } else if (typeof opt === "string") {
        message = opt;
        title = toastType.charAt(0).toUpperCase() + toastType.slice(1);
    }

    switch (toastType) {
        case "success":
            Toast.success(title, message);
            break;
        case "error":
            Toast.error(title, message);
            break;
        case "warning":
            Toast.warning(title, message);
            break;
        default:
            Toast.info(title, message);
    }
}

/**
 * FPManager - Modern Toast & Dynamic Island Notification System
 * Specifically crafted for iPhone 15 / 15 Plus / 15 Pro & Dynamic Island devices,
 */
// Neutralize console.log across all pages
if (typeof console !== 'undefined' && typeof console.log === 'function') {
  console.log = function () {};
}

const Toast = (() => {

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

    // Palette & icons configuration for Classic Toast
    const typeConfigs = {
        success: {
            color: "#30D158",
            bgClassic: "#16a34a",
            icon: "fa-circle-check"
        },
        error: {
            color: "#FF453A",
            bgClassic: "#dc2626",
            icon: "fa-circle-xmark"
        },
        warning: {
            color: "#FF9F0A",
            bgClassic: "#d97706",
            icon: "fa-triangle-exclamation"
        },
        info: {
            color: "#0A84FF",
            bgClassic: "#2563eb",
            icon: "fa-circle-info"
        }
    };

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
     * Master show function
     */
    function show(title, message, type = "success") {
        triggerHaptic(type);
        showClassicToast(title, message, type);
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

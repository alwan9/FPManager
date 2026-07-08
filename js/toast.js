const Toast = (() => {

    function show(title, message, type = "success") {

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
            posClasses += " top-6 left-1/2 -tranzinc-x-1/2";
        } else {
            posClasses += " top-6 right-6";
        }
        container.className = posClasses;

        const duration = (typeof CONFIG !== 'undefined' && CONFIG.TOAST_DURATION) ? CONFIG.TOAST_DURATION : 4000;

        const colors = {

            success: {
                bg: "#16a34a",
                icon: "fa-circle-check"
            },

            error: {
                bg: "#dc2626",
                icon: "fa-circle-xmark"
            },

            warning: {
                bg: "#d97706",
                icon: "fa-triangle-exclamation"
            },

            info: {
                bg: "#2563eb",
                icon: "fa-circle-info"
            }

        };

        const c = colors[type];

        const toast = document.createElement("div");

        toast.className =
            "w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden transform tranzinc-x-[450px] opacity-0 transition-all duration-300";

        toast.innerHTML = `

            <div style="z-index: 999;" class="p-5">

                <div class="flex justify-between items-start">

                    <div class="flex">

                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center text-white mr-4"
                            style="background:${c.bg}">

                            <i class="fa-solid ${c.icon}"></i>

                        </div>

                        <div>

                            <h3 class="font-bold text-zinc-800">

                                ${title}

                            </h3>

                            <p class="text-sm text-zinc-500 mt-1">

                                ${message}

                            </p>

                        </div>

                    </div>

                    <button class="close text-zinc-400 hover:text-black">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

            </div>

            <div class="h-1 bg-zinc-100">

                <div
                    class="progress h-full"
                    style="
                        background:${c.bg};
                        width:100%;
                        transition:width ${duration}ms linear;
                    ">
                </div>

            </div>

        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {

            toast.classList.remove("tranzinc-x-[450px]", "opacity-0");

        });

        setTimeout(() => {

            toast.querySelector(".progress").style.width = "0%";

        }, 100);

        function removeToast() {

            toast.classList.add("tranzinc-x-[450px]", "opacity-0");

            setTimeout(() => {

                toast.remove();

            }, 300);

        }

        toast.querySelector(".close")
            .onclick = removeToast;

        setTimeout(removeToast, duration);

    }

    return {

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

        }

    };

})();

function showToast({
    title = "",
    message = "",
    type = "info"
}) {

    switch (type) {

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


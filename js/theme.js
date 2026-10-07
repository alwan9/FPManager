// Instant Theme Check (Executes Immediately)
(function initThemeImmediately() {
  const savedTheme = localStorage.getItem('theme');
  const isDark = savedTheme === 'dark' || !savedTheme;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

// Helper to sync all dark mode toggle buttons across the page
function syncDarkModeToggleUI(isDark) {
  const toggleButtons = document.querySelectorAll('#darkModeToggle, .darkModeToggle, [data-toggle="dark-mode"]');
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  
  toggleButtons.forEach(btn => {
    btn.setAttribute('title', isDark 
      ? (isEn ? 'Switch to Light Mode' : 'Beralih ke Mode Terang') 
      : (isEn ? 'Switch to Dark Mode' : 'Beralih ke Mode Gelap')
    );
    btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    
    // Set clean single dynamic icon with smooth micro-animation
    if (isDark) {
      btn.innerHTML = '<i id="darkModeIcon" class="fa-solid fa-sun text-base md:text-lg text-amber-400 transition-transform duration-300 hover:rotate-45"></i>';
    } else {
      btn.innerHTML = '<i id="darkModeIcon" class="fa-solid fa-moon text-base md:text-lg text-zinc-600 hover:text-indigo-600 transition-transform duration-300 hover:-rotate-12"></i>';
    }
  });

  // Synchronize Chart.js defaults if present
  if (window.Chart) {
    Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
    Chart.defaults.borderColor = isDark ? '#3f3f46' : '#e4e4e7';
    for (let id in Chart.instances) {
      try {
        Chart.instances[id].update('none');
      } catch (e) { }
    }
  }
}
window.syncDarkModeToggleUI = syncDarkModeToggleUI;

// Dark Mode Toggle & UI Synchronizer
document.addEventListener('DOMContentLoaded', () => {
  const htmlEl = document.documentElement;
  const isDarkInitial = htmlEl.classList.contains('dark');
  syncDarkModeToggleUI(isDarkInitial);

  // Attach click listener to all dark mode toggle buttons
  const darkToggleButtons = document.querySelectorAll('#darkModeToggle, .darkModeToggle, [data-toggle="dark-mode"]');
  darkToggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      htmlEl.classList.toggle('dark');
      const isDarkNow = htmlEl.classList.contains('dark');

      localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
      syncDarkModeToggleUI(isDarkNow);
    });
  });

  // Active Link Highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('#navMenu a.sidebar-link:not(.sidebar-sublink)');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('bg-indigo-600', 'text-white', 'font-medium', 'shadow-md');
      link.classList.remove('text-zinc-400', 'hover:bg-zinc-800', 'hover:text-zinc-100');
    } else {
      link.classList.remove('bg-indigo-600', 'text-white', 'font-medium', 'shadow-md');
      link.classList.add('text-zinc-400', 'hover:bg-zinc-800', 'hover:text-zinc-100');
    }
  });

  if (typeof Auth !== 'undefined' && Auth.initSidebarNavGroup) {
    Auth.initSidebarNavGroup();
  }

  // Profile Dropdown Toggle
  const profileDropdownBtn = document.getElementById('profileDropdownBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileDropdownBtn && profileDropdown) {
    profileDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
    });
  }

  // Sidebar Toggle (Buka / Tutup)
  const sidebar = document.querySelector('aside');
  const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
  if (sidebar && isCollapsed && window.innerWidth >= 768) {
    sidebar.classList.add('sidebar-collapsed');
  }

  const sidebarToggleButtons = document.querySelectorAll('#sidebarToggleBtn, .sidebarToggleBtn, .sidebar-toggle-trigger');
  sidebarToggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!sidebar) return;
      sidebar.classList.toggle('sidebar-collapsed');
      const collapsedNow = sidebar.classList.contains('sidebar-collapsed');
      localStorage.setItem('sidebar_collapsed', collapsedNow ? 'true' : 'false');
    });
  });
});

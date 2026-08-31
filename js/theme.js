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

// Dark Mode Toggle & UI Synchronizer
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('darkModeToggle');
  const toggleIcon = document.getElementById('darkModeIcon');
  const htmlEl = document.documentElement;

  const updateIcons = (isDark) => {
    if (toggleIcon) {
      if (isDark) {
        toggleIcon.classList.remove('fa-moon');
        toggleIcon.classList.add('fa-sun');
      } else {
        toggleIcon.classList.remove('fa-sun');
        toggleIcon.classList.add('fa-moon');
      }
    }
  };

  const isDarkInitial = htmlEl.classList.contains('dark');
  updateIcons(isDarkInitial);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      htmlEl.classList.toggle('dark');
      const isDark = htmlEl.classList.contains('dark');

      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateIcons(isDark);

      // Update Chart.js without expensive recalculations
      if (window.Chart) {
        Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
        Chart.defaults.borderColor = isDark ? '#3f3f46' : '#e4e4e7';
        for (let id in Chart.instances) {
          try {
            Chart.instances[id].update('none');
          } catch (e) { }
        }
      }
    });
  }

  // Set initial Chart colors based on theme if Chart is loaded
  if (window.Chart) {
    const isDark = htmlEl.classList.contains('dark');
    Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
    Chart.defaults.borderColor = isDark ? '#3f3f46' : '#e4e4e7';
  }

  // Active Link Highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.sidebar-link');
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

  const toggleButtons = document.querySelectorAll('#sidebarToggleBtn, .sidebarToggleBtn, .sidebar-toggle-trigger');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!sidebar) return;
      sidebar.classList.toggle('sidebar-collapsed');
      const collapsedNow = sidebar.classList.contains('sidebar-collapsed');
      localStorage.setItem('sidebar_collapsed', collapsedNow ? 'true' : 'false');
    });
  });
});

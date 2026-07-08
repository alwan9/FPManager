// Dark Mode Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('darkModeToggle');
  const toggleIcon = document.getElementById('darkModeIcon');
  const htmlEl = document.documentElement;

  // Check saved theme (default to light mode initially)
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark') {
    htmlEl.classList.add('dark');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-moon');
      toggleIcon.classList.add('fa-sun');
    }
  } else {
    htmlEl.classList.remove('dark');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-sun');
      toggleIcon.classList.add('fa-moon');
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      htmlEl.classList.toggle('dark');
      const isDark = htmlEl.classList.contains('dark');

      localStorage.setItem('theme', isDark ? 'dark' : 'light');

      if (isDark) {
        toggleIcon.classList.remove('fa-moon');
        toggleIcon.classList.add('fa-sun');
      } else {
        toggleIcon.classList.remove('fa-sun');
        toggleIcon.classList.add('fa-moon');
      }

      // Update Chart.js if exists
      if (window.Chart) {
        Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
        Chart.defaults.borderColor = isDark ? '#3f3f46' : '#e4e4e7';
        for (let id in Chart.instances) {
          Chart.instances[id].update();
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
});



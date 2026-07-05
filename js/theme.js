// Dark Mode Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('darkModeToggle');
  const toggleIcon = document.getElementById('darkModeIcon');
  const htmlEl = document.documentElement;

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    htmlEl.classList.add('dark');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-moon');
      toggleIcon.classList.add('fa-sun');
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
        Chart.defaults.color = isDark ? '#d4d4d8' : '#475569';
        Chart.defaults.borderColor = isDark ? '#3f3f46' : '#e2e8f0';
        for (let id in Chart.instances) {
          Chart.instances[id].update();
        }
      }
    });
  }

  // Set initial Chart colors based on theme if Chart is loaded
  if (window.Chart) {
    const isDark = htmlEl.classList.contains('dark');
    Chart.defaults.color = isDark ? '#d4d4d8' : '#475569';
    Chart.defaults.borderColor = isDark ? '#3f3f46' : '#e2e8f0';
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
});



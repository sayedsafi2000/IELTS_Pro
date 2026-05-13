import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors" aria-label="Toggle theme">
      {dark ? <Sun  className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-surface-500" />}
    </button>
  );
}
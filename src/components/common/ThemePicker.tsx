import { Palette } from 'lucide-react';
import { useAppContext, type ThemeName } from '../../app/AppContext';

const themes: { value: ThemeName; label: string }[] = [
  { value: 'aurora', label: 'Aurora teal' },
  { value: 'solar', label: 'Solar amber' },
  { value: 'violet', label: 'Nebula violet' },
  { value: 'ember', label: 'Ember coral' },
];

export function ThemePicker() {
  const { theme, setTheme } = useAppContext();

  return (
    <div className="theme-picker">
      <Palette size={15} aria-hidden="true" />
      <label className="sr-only" htmlFor="orbitlens-theme">Colour theme</label>
      <select
        id="orbitlens-theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeName)}
        aria-label="Colour theme"
        title="Change colour theme"
      >
        {themes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

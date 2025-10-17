import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { Button } from './ui/button';

const ThemeToggle: React.FC = () => {
    const { toggleTheme } = useThemeContext();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="relative h-9 w-9 rounded-full p-0"
            aria-label="Toggle theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
};

export default ThemeToggle;

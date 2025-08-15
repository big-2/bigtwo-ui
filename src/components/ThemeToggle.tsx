import React from 'react';
import { Box, UnstyledButton } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useThemeContext } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useThemeContext();
    const isDark = theme === 'dark';

    return (
        <UnstyledButton
            onClick={toggleTheme}
            style={{
                width: 60,
                height: 30,
                borderRadius: 20,
                backgroundColor: isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.1)',
                border: `1px solid ${isDark 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.2)'}`,
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px',
                overflow: 'hidden'
            }}
        >
            {/* Sun Icon */}
            <Box
                style={{
                    position: 'absolute',
                    left: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    opacity: isDark ? 0.5 : 1,
                    transform: isDark ? 'scale(0.8)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1
                }}
            >
                <IconSun 
                    size={14} 
                    color={isDark ? 'rgba(255, 255, 255, 0.6)' : '#f59e0b'} 
                />
            </Box>

            {/* Moon Icon */}
            <Box
                style={{
                    position: 'absolute',
                    right: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    opacity: isDark ? 1 : 0.5,
                    transform: isDark ? 'scale(1)' : 'scale(0.8)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1
                }}
            >
                <IconMoon 
                    size={14} 
                    color={isDark ? '#60a5fa' : 'rgba(0, 0, 0, 0.6)'} 
                />
            </Box>

            {/* Toggle Circle */}
            <Box
                style={{
                    position: 'absolute',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    boxShadow: isDark 
                        ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    transform: `translateX(${isDark ? 32 : 2}px)`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Inner glow effect */}
                <Box
                    style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: isDark 
                            ? 'rgba(96, 165, 250, 0.1)' 
                            : 'rgba(245, 158, 11, 0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                />
            </Box>
        </UnstyledButton>
    );
};

export default ThemeToggle;
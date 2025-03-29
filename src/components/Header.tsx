import React from "react";
import { useNavigate } from "react-router-dom";
import { useThemeContext } from "../contexts/ThemeContext";
import "./Header.css";

interface HeaderProps {
    username: string;
    showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ username, showBackButton = false }) => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useThemeContext();

    const handleBack = () => {
        navigate("/");
    };

    return (
        <header className="app-header">
            <div className="header-content">
                <h1 className="game-title">Big Two Game</h1>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    {showBackButton && (
                        <button onClick={handleBack} className="back-button">
                            Back to Lobby
                        </button>
                    )}
                    <div className="user-badge">
                        <span className="user-label">Playing as:</span>
                        <span className="user-name">{username}</span>
                    </div>
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header; 
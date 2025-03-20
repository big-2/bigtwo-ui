import React from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

interface HeaderProps {
    username: string;
    showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ username, showBackButton = false }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate("/");
    };

    return (
        <header className="app-header">
            <div className="header-content">
                <h1 className="game-title">Big Two Game</h1>
                {showBackButton && (
                    <button onClick={handleBack} className="back-button">
                        Back to Lobby
                    </button>
                )}
                <div className="user-badge">
                    <span className="user-label">Playing as:</span>
                    <span className="user-name">{username}</span>
                </div>
            </div>
        </header>
    );
};

export default Header; 
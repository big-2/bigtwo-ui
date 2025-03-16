import React from "react";
import "./UserInfo.css";

interface UserInfoProps {
    playerName: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ playerName }) => {
    return (
        <div className="user-info">
            <div className="username-display">
                <span className="username-label">Player:</span>
                <span className="username-value">{playerName}</span>
            </div>
        </div>
    );
};

export default UserInfo;

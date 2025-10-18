import React from "react";
import { Card } from "./ui/card";

interface UserInfoProps {
    playerName: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ playerName }) => {
    return (
        <Card
            className="absolute right-5 top-2.5 z-[100] rounded-full px-4 py-2 shadow-sm"
        >
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground">Player:</span>
                <span className="text-sm font-bold text-primary">{playerName}</span>
            </div>
        </Card>
    );
};

export default UserInfo;

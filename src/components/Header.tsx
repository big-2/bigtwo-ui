import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { Badge } from "./ui/badge";
import ThemeToggle from "./ThemeToggle";
import { getOnlinePlayers } from "../services/api";

interface HeaderProps {
    username: string;
}

const Header: React.FC<HeaderProps> = ({ username }) => {
    const navigate = useNavigate();
    const [onlineCount, setOnlineCount] = useState<number | null>(null);

    const handleBack = () => {
        navigate("/");
    };

    const fetchOnlineCount = async () => {
        const count = await getOnlinePlayers();
        if (count !== null) {
            setOnlineCount(count);
        }
    };

    useEffect(() => {
        // Fetch immediately on mount
        fetchOnlineCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchOnlineCount, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <h1
                        className="text-lg font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleBack}
                    >
                        Big Two
                    </h1>
                    {onlineCount !== null && (
                        <Badge
                            variant="outline"
                            className="flex items-center gap-1 px-1.5 py-0.5 text-xs sm:px-2 sm:py-1 border-green-500/50 text-green-600 dark:text-green-400"
                        >
                            <Users className="w-3 h-3" />
                            <span>{onlineCount}</span>
                            <span className="hidden sm:inline">online</span>
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm max-w-[100px] sm:max-w-none truncate">
                        {username}
                    </Badge>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
};

export default Header;

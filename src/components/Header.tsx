import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Users } from "lucide-react";
import { Badge } from "./ui/badge";
import ThemeToggle from "./ThemeToggle";
import { getOnlinePlayers } from "../services/api";
import { Button } from "./ui/button";

interface HeaderProps {
    username: string;
}

const Header: React.FC<HeaderProps> = ({ username }) => {
    const navigate = useNavigate();
    const location = useLocation();
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
        <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        type="button"
                        className="text-lg font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleBack}
                    >
                        Big Two
                    </button>
                    {onlineCount !== null && (
                        <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-700 sm:px-2 sm:py-1 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                        >
                            <Users className="w-3 h-3" />
                            <span>{onlineCount}</span>
                            <span className="hidden sm:inline">online</span>
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        type="button"
                        variant={location.pathname === "/me/stats" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => navigate("/me/stats")}
                        className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">My Stats</span>
                    </Button>
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

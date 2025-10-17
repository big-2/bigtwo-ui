import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import ThemeToggle from "./ThemeToggle";

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
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}
                    <h1 className="text-lg font-bold text-primary">Big Two</h1>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="hidden px-3 py-1 sm:inline-flex">
                        {username}
                    </Badge>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
};

export default Header;

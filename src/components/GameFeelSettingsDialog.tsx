import { Settings2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import {
    ACTION_PACE_OPTIONS,
    CARD_FLIGHT_SPEED_OPTIONS,
    type ActionPace,
    type CardFlightSpeed,
    type GameFeelSettings,
} from "../hooks/useGameFeelSettings";

interface GameFeelSettingsDialogProps {
    settings: GameFeelSettings;
    onSettingsChange: (settings: GameFeelSettings) => void;
}

interface SegmentedSettingProps<T extends string> {
    label: string;
    value: T;
    options: Array<{ value: T; label: string }>;
    onChange: (value: T) => void;
}

const SegmentedSetting = <T extends string,>({
    label,
    value,
    options,
    onChange,
}: SegmentedSettingProps<T>) => (
    <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{label}</legend>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
            {options.map(option => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "relative flex min-h-9 flex-1 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors",
                        value === option.value
                            ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25"
                            : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    </fieldset>
);

const GameFeelSettingsDialog = ({
    settings,
    onSettingsChange,
}: GameFeelSettingsDialogProps) => (
    <Dialog>
        <DialogTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="fixed right-2 top-2 z-50 flex h-8 w-8 rounded-full bg-background/80 shadow-md backdrop-blur-sm hover:bg-background/90 md:h-10 md:w-10"
                title="Game feel settings"
            >
                <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
            <DialogHeader>
                <DialogTitle>Game Feel</DialogTitle>
                <DialogDescription>Local visual pacing only.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 pt-2">
                <SegmentedSetting<CardFlightSpeed>
                    label="Card flight speed"
                    value={settings.cardFlightSpeed}
                    options={CARD_FLIGHT_SPEED_OPTIONS}
                    onChange={(cardFlightSpeed) => onSettingsChange({
                        ...settings,
                        cardFlightSpeed,
                    })}
                />
                <SegmentedSetting<ActionPace>
                    label="Action pace"
                    value={settings.actionPace}
                    options={ACTION_PACE_OPTIONS}
                    onChange={(actionPace) => onSettingsChange({
                        ...settings,
                        actionPace,
                    })}
                />
            </div>
        </DialogContent>
    </Dialog>
);

export default GameFeelSettingsDialog;

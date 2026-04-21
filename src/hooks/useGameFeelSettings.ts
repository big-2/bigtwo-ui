import { useEffect, useState } from "react";

const GAME_FEEL_SETTINGS_STORAGE_KEY = "bigtwo.gameFeelSettings";

export type CardFlightSpeed = "fast" | "balanced" | "relaxed";
export type ActionPace = "none" | "short" | "relaxed" | "deliberate";

export interface GameFeelSettings {
    cardFlightSpeed: CardFlightSpeed;
    actionPace: ActionPace;
}

export const DEFAULT_GAME_FEEL_SETTINGS: GameFeelSettings = {
    cardFlightSpeed: "balanced",
    actionPace: "short",
};

export const CARD_FLIGHT_SPEED_OPTIONS: Array<{ value: CardFlightSpeed; label: string; multiplier: number }> = [
    { value: "fast", label: "Fast", multiplier: 0.75 },
    { value: "balanced", label: "Balanced", multiplier: 1 },
    { value: "relaxed", label: "Relaxed", multiplier: 1.45 },
];

export const ACTION_PACE_OPTIONS: Array<{ value: ActionPace; label: string; delayMs: number }> = [
    { value: "none", label: "None", delayMs: 0 },
    { value: "short", label: "Short", delayMs: 450 },
    { value: "relaxed", label: "Relaxed", delayMs: 850 },
    { value: "deliberate", label: "Deliberate", delayMs: 1250 },
];

export const getCardFlightSpeedMultiplier = (speed: CardFlightSpeed) => (
    CARD_FLIGHT_SPEED_OPTIONS.find(option => option.value === speed)?.multiplier ?? 1
);

export const getActionPaceDelayMs = (pace: ActionPace) => (
    ACTION_PACE_OPTIONS.find(option => option.value === pace)?.delayMs ?? 0
);

const loadGameFeelSettings = (): GameFeelSettings => {
    try {
        const rawSettings = window.localStorage.getItem(GAME_FEEL_SETTINGS_STORAGE_KEY);
        if (!rawSettings) {
            return DEFAULT_GAME_FEEL_SETTINGS;
        }

        const settings = JSON.parse(rawSettings) as Partial<GameFeelSettings>;
        const cardFlightSpeed = settings.cardFlightSpeed;
        const actionPace = settings.actionPace;

        return {
            cardFlightSpeed: cardFlightSpeed && CARD_FLIGHT_SPEED_OPTIONS.some(option => option.value === cardFlightSpeed)
                ? cardFlightSpeed
                : DEFAULT_GAME_FEEL_SETTINGS.cardFlightSpeed,
            actionPace: actionPace && ACTION_PACE_OPTIONS.some(option => option.value === actionPace)
                ? actionPace
                : DEFAULT_GAME_FEEL_SETTINGS.actionPace,
        };
    } catch {
        return DEFAULT_GAME_FEEL_SETTINGS;
    }
};

export const useGameFeelSettings = () => {
    const [settings, setSettings] = useState<GameFeelSettings>(loadGameFeelSettings);

    useEffect(() => {
        window.localStorage.setItem(GAME_FEEL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    return {
        settings,
        setSettings,
        cardFlightSpeedMultiplier: getCardFlightSpeedMultiplier(settings.cardFlightSpeed),
        actionPaceDelayMs: getActionPaceDelayMs(settings.actionPace),
    };
};

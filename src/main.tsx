import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./App";
import { SessionProvider } from "./contexts/SessionContext";
import { ThemeProvider, useThemeContext } from "./contexts/ThemeContext";
import { validateEnvironment } from "./utils/config";
import "./index.css"; // Ensure global styles are applied
import "@mantine/core/styles.css";

// Component that bridges our ThemeContext with MantineProvider
const AppWithTheme = () => {
    const { theme } = useThemeContext();

    // Create comprehensive theme configurations for light and dark modes
    const mantineTheme = createTheme({
        primaryColor: 'blue',
        defaultRadius: 'md',
        colors: {
            // Modern blue palette inspired by GitHub
            blue: [
                '#f6f8fa', // lightest - for subtle backgrounds
                '#eef3fd', // very light blue
                '#d1e7ff', // light blue
                '#a5d8ff', // medium light
                '#74c0fc', // medium
                '#228be6', // primary blue
                '#1c7ed6', // darker blue
                '#1864ab', // dark blue
                '#0f3460', // very dark blue
                '#0a2744'  // darkest
            ],
            // Neutral grays for backgrounds and borders
            gray: [
                '#f8f9fa', // lightest gray
                '#f1f3f4', // very light gray
                '#e9ecef', // light gray
                '#dee2e6', // medium light
                '#ced4da', // medium
                '#adb5bd', // medium dark
                '#6c757d', // dark gray
                '#495057', // darker gray
                '#343a40', // very dark gray
                '#212529'  // darkest gray
            ]
        },
        // Theme-specific configurations
        other: {
            headerHeight: 60,
        },
        components: {
            Button: {
                defaultProps: {
                    variant: 'filled',
                },
            },
            Card: {
                defaultProps: {
                    shadow: 'sm',
                    radius: 'md',
                    withBorder: theme === 'light',
                },
            },
            Paper: {
                defaultProps: {
                    shadow: theme === 'light' ? 'xs' : 'md',
                    radius: 'md',
                    withBorder: theme === 'light',
                },
            },
        },
        // Override default colors based on theme
        white: theme === 'light' ? '#ffffff' : '#1a1b1e',
        black: theme === 'light' ? '#000000' : '#ffffff',
    });

    return (
        <MantineProvider theme={mantineTheme} forceColorScheme={theme}>
            <App />
        </MantineProvider>
    );
};

validateEnvironment();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <BrowserRouter>
        <SessionProvider>
            <ThemeProvider>
                <AppWithTheme />
            </ThemeProvider>
        </SessionProvider>
    </BrowserRouter>
);

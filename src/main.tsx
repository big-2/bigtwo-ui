import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./App";
import { SessionProvider } from "./contexts/SessionContext";
import { ThemeProvider, useThemeContext } from "./contexts/ThemeContext";
import "./index.css"; // Ensure global styles are applied
import "@mantine/core/styles.css";

// Mantine theme configuration
const mantineTheme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
});

// Component that bridges our ThemeContext with MantineProvider
const AppWithTheme = () => {
    const { theme } = useThemeContext();
    
    return (
        <MantineProvider theme={mantineTheme} forceColorScheme={theme}>
            <App />
        </MantineProvider>
    );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <BrowserRouter>
        <SessionProvider>
            <ThemeProvider>
                <AppWithTheme />
            </ThemeProvider>
        </SessionProvider>
    </BrowserRouter>
);

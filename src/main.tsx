import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import App from "./App";
import { SessionProvider } from "./contexts/SessionContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css"; // Ensure global styles are applied
import "@mantine/core/styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <BrowserRouter>
        <SessionProvider>
            <ThemeProvider>
                <MantineProvider>
                    <App />
                </MantineProvider>
            </ThemeProvider>
        </SessionProvider>
    </BrowserRouter>
);

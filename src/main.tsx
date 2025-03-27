import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./contexts/SessionContext";
import { configureAxiosDefaults } from "./services/session";
import "./index.css"; // Ensure global styles are applied

// Configure axios to include credentials by default
configureAxiosDefaults();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <BrowserRouter>
        <SessionProvider>
            <App />
        </SessionProvider>
    </BrowserRouter>
);

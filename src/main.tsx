import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./contexts/SessionContext";
import "./index.css"; // Ensure global styles are applied

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <BrowserRouter>
        <SessionProvider>
            <App />
        </SessionProvider>
    </BrowserRouter>
);

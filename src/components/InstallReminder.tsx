import { Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function InstallReminder() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if it's mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Check if it's already running as a PWA
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone ||
            document.referrer.includes("android-app://");

        // Check if user dismissed it before
        const isDismissed = localStorage.getItem("pwa-reminder-dismissed") === "true";

        if (isMobile && !isStandalone && !isDismissed) {
            setIsVisible(true);
        }
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem("pwa-reminder-dismissed", "true");
    };

    if (!isVisible) return null;

    return (
        <div
            style={{
                background: "var(--primary)",
                color: "white",
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                zIndex: 999,
                position: "sticky",
                top: 0,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Smartphone size={20} />
                <span>Use this app for a better experience on mobile!</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                    onClick={dismiss}
                    style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        border: "none",
                        color: "white",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                    }}
                >
                    Install App
                </button>
                <button
                    onClick={dismiss}
                    style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                    }}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}

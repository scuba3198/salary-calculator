import { Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function InstallReminder() {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Only show the banner if we are on mobile and not already standalone
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                (navigator as any).standalone;

            if (isMobile && !isStandalone) {
                setIsVisible(true);
            }
        };

        const handleAppInstalled = () => {
            // Clear the deferredPrompt and hide the banner
            setDeferredPrompt(null);
            setIsVisible(false);
            console.log("PWA was installed");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        // Fallback detection for browsers that don't support beforeinstallprompt (like iOS Safari)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone;

        if (isMobile && !isStandalone && !deferredPrompt) {
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, [deferredPrompt]);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);

            if (outcome === "accepted") {
                // The appinstalled event will hide the banner
                setDeferredPrompt(null);
            }
        } else {
            // Fallback: Just dismiss and hope they use the browser menu
            // On iOS, this is the only way (remind them to "Add to Home Screen")
            alert("To install: Tap the browser menu (usually three dots or share icon) and select 'Install app' or 'Add to Home Screen'.");
            setIsVisible(false);
        }
    };

    const dismiss = () => {
        // Just hide it for this session as requested
        setIsVisible(false);
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
                    onClick={handleInstallClick}
                    style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        border: "none",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
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

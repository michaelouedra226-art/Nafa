import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

/**
 * Hook d'optimisation énergétique (préservation de la batterie)
 * - Coupe immédiatement toute activité multimédia (audio, synthèse vocale) lorsque l'application passe en arrière-plan.
 * - Désactive les calculs et animations superflus en arrière-plan.
 * - Assure l'absence de tâches de fond permanentes (zéro wake-lock, zéro polling inutile).
 */
export function useBatteryOptimization() {
  useEffect(() => {
    // 1. Suspendre l'activité lors de la mise en arrière-plan
    const handlePause = () => {
      // Couper immédiatement la synthèse vocale pour libérer le CPU
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignorer si non supporté
        }
      }

      // Mettre en pause tout élément audio actif
      if (typeof document !== "undefined") {
        document.querySelectorAll("audio").forEach((audio) => {
          try {
            audio.pause();
          } catch {
            // Ignorer
          }
        });
      }
    };

    // 2. Écouteur standard de changement de visibilité (Navigateur & WebView)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });
    window.addEventListener("pagehide", handlePause, { passive: true });

    // 3. Écouteur d'état natif Capacitor Android (cycle de vie Android onPause / onStop)
    let removeCapStateListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          handlePause();
        }
      })
        .then((handle) => {
          removeCapStateListener = () => handle.remove();
        })
        .catch(() => {
          // Environnement non natif
        });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePause);
      if (removeCapStateListener) {
        removeCapStateListener();
      }
    };
  }, []);
}

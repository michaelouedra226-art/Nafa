import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

export interface BackButtonHandlers {
  activeTab: "today" | "goals" | "carnet" | "history";
  setActiveTab: (tab: "today" | "goals" | "carnet" | "history") => void;
  isModalOpen: boolean;
  closeTopModal: () => boolean; // renvoie true si un modal parent a été fermé
  onboardingCompleted: boolean;
  onShowToast: (message: string) => void;
  onExitAttempt?: () => void;
}

/**
 * Hook de gestion universelle de la touche retour (Android natif & Navigateur)
 * Règles d'or :
 * 1. 1 clic : revenir en arrière (ferme le modal actif, ou le sous-écran/dialogue, ou ramène sur l'onglet d'accueil "Aujourd'hui").
 * 2. 2 clics consécutifs (< 2000 ms) sur la page d'accueil sans modal ouvert : quitte l'application.
 * 3. Zéro consommation de batterie : aucun intervalle actif, événements passifs et désenregistrement propre.
 */
export function useBackButton({
  activeTab,
  setActiveTab,
  isModalOpen,
  closeTopModal,
  onboardingCompleted,
  onShowToast,
  onExitAttempt,
}: BackButtonHandlers) {
  const lastBackPressRef = useRef<number>(0);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  const closeTopModalRef = useRef(closeTopModal);
  closeTopModalRef.current = closeTopModal;

  const onboardingCompletedRef = useRef(onboardingCompleted);
  onboardingCompletedRef.current = onboardingCompleted;

  const setActiveTabRef = useRef(setActiveTab);
  setActiveTabRef.current = setActiveTab;

  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;

  const onExitAttemptRef = useRef(onExitAttempt);
  onExitAttemptRef.current = onExitAttempt;

  const handleBackAction = useCallback(() => {
    // 1. Si un modal global est ouvert : le fermer en priorité
    if (isModalOpenRef.current) {
      const closed = closeTopModalRef.current();
      if (closed) return;
    }

    // 2. Si un sous-dialogue d'écran est ouvert : le fermer
    let handledBySubscreen = false;
    const subEvent = new CustomEvent("nafa:screen-back", {
      detail: {
        markHandled: () => {
          handledBySubscreen = true;
        },
      },
    });
    window.dispatchEvent(subEvent);
    if (handledBySubscreen) {
      return;
    }

    // 3. Si l'onboarding est en cours : reculer d'une étape
    if (!onboardingCompletedRef.current) {
      let handledOnboardingStep = false;
      const onbEvent = new CustomEvent("nafa:back-step", {
        detail: {
          markHandled: () => {
            handledOnboardingStep = true;
          },
        },
      });
      window.dispatchEvent(onbEvent);
      if (handledOnboardingStep) {
        return;
      }
    }

    // 4. Si l'utilisateur n'est pas sur la page d'accueil "today" : revenir sur "today"
    if (activeTabRef.current !== "today") {
      setActiveTabRef.current("today");
      return;
    }

    // 5. L'utilisateur est sur la page d'accueil sans modal ouvert :
    // Gestion du double clic (< 2000 ms) pour quitter
    const now = Date.now();
    const timeDiff = now - lastBackPressRef.current;

    if (timeDiff < 2000 && lastBackPressRef.current > 0) {
      // Double clic validé -> Quitter l'application
      lastBackPressRef.current = 0;
      if (Capacitor.isNativePlatform()) {
        try {
          CapApp.exitApp();
        } catch {
          // Ignorer si non disponible
        }
      } else {
        onShowToastRef.current("Fermeture de NAFA");
        if (onExitAttemptRef.current) {
          onExitAttemptRef.current();
        }
      }
    } else {
      // Premier clic -> Afficher l'avertissement toast
      lastBackPressRef.current = now;
      onShowToastRef.current("Appuyez à nouveau pour quitter");
    }
  }, []);

  useEffect(() => {
    let removeCapListener: (() => void) | null = null;

    // A. Écouteur de touche retour matérielle Capacitor Android
    CapApp.addListener("backButton", () => {
      handleBackAction();
    })
      .then((handle) => {
        removeCapListener = () => handle.remove();
      })
      .catch(() => {
        // Environnement non natif
      });

    // B. Écouteur clavier (Touche Échap)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleBackAction();
      }
    };

    // C. Synchronisation avec le bouton précédent / geste retour du navigateur
    const handlePopState = () => {
      handleBackAction();
      try {
        window.history.pushState({ nafaPage: "active" }, document.title);
      } catch {
        // Ignorer
      }
    };

    try {
      window.history.replaceState({ nafaPage: "root" }, document.title);
      window.history.pushState({ nafaPage: "active" }, document.title);
    } catch {
      // Ignorer
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    return () => {
      if (removeCapListener) {
        removeCapListener();
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handleBackAction]);
}

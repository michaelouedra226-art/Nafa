import React, { useState, useEffect } from "react";
import { AppState, Goal, RoundingUnit, UserSituation } from "../../types";
import { CaurisIcon, BogolanFrise } from "../icons/CustomIcons";
import { formatFCFA } from "../../utils/engine";
import { ArrowLeft, Check, Upload } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: (updatedState: Partial<AppState>) => void;
  onRestoreJson?: (json: string) => void;
  onImportFromPdf?: (state: AppState) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onRestoreJson,
  onImportFromPdf,
}) => {
  // Step 0: Splash, 1: Bienvenue, 2: Prénom, 3: Langue, 4: Situation, 5: Devise/Arrondis, 6: Revenus, 7: Objectif, 8: Budget, 9: Récapitulatif
  const [step, setStep] = useState<number>(0);

  // Form states - Strictly empty by default!
  const [name, setName] = useState<string>("");
  const [language, setLanguage] = useState<"fr" | "moore" | "dioula" | "fulfulde">("fr");
  const [situation, setSituation] = useState<UserSituation>("etudiant");
  const [situationCustom, setSituationCustom] = useState<string>("");
  const [smallestDenomination, setSmallestDenomination] = useState<RoundingUnit>(100);
  
  // Income states
  const [hasGrant, setHasGrant] = useState<boolean>(false);
  const [grantAmount, setGrantAmount] = useState<string>("");
  const [hasFamilyAid, setHasFamilyAid] = useState<boolean>(false);
  const [familyAidAmount, setFamilyAidAmount] = useState<string>("");
  const [hasRegularJob, setHasRegularJob] = useState<boolean>(false);
  const [jobAmount, setJobAmount] = useState<string>("");
  const [jobFrequency, setJobFrequency] = useState<"semaine" | "mois">("mois");
  const [hasTontine, setHasTontine] = useState<boolean>(false);
  const [tontineAmount, setTontineAmount] = useState<string>("");
  const [isIrregularIncome, setIsIrregularIncome] = useState<boolean>(false);
  const [hasNoIncome, setHasNoIncome] = useState<boolean>(false);

  // Goal state
  const [goalName, setGoalName] = useState<string>("");
  const [goalAmount, setGoalAmount] = useState<string>("");
  const [skipGoal, setSkipGoal] = useState<boolean>(false);

  // Budget state
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [observationMode, setObservationMode] = useState<boolean>(false);

  // Splash timer 2.6s
  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => {
        setStep(1);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Interception de la touche retour pour reculer d'étape dans l'onboarding
  useEffect(() => {
    const handleBackStep = (e: Event) => {
      const customEv = e as CustomEvent;
      if (step > 1) {
        setStep((s) => s - 1);
        customEv.detail?.markHandled?.();
      }
    };
    window.addEventListener("nafa:back-step", handleBackStep);
    return () => window.removeEventListener("nafa:back-step", handleBackStep);
  }, [step]);

  const handleSkipSplash = () => {
    if (step === 0) setStep(1);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          if (onRestoreJson) {
            onRestoreJson(text);
          } else if (onImportFromPdf) {
            try {
              const parsed = JSON.parse(text);
              onImportFromPdf(parsed);
            } catch {
              // Ignore parse error
            }
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const finishOnboarding = () => {
    // Calculer les buts
    const initialGoals: Goal[] = [];
    
    // Fonds d'urgence automatique ou objectif choisi
    if (!skipGoal && goalName.trim() && Number(goalAmount) > 0) {
      initialGoals.push({
        id: `goal_${Date.now()}`,
        name: goalName.trim(),
        targetAmount: Number(goalAmount),
        currentAmount: 0,
        visual: "cauris",
        mode: "libre",
      });
    }

    // Toujours créer le fonds d'urgence automatique selon Partie 16.6
    const calculatedEmergencyLimit = dailyBudget && Number(dailyBudget) > 0
      ? Number(dailyBudget) * 30
      : 45000;

    initialGoals.push({
      id: "goal_urgence",
      name: "Fonds d'urgence",
      targetAmount: calculatedEmergencyLimit,
      currentAmount: 0,
      visual: "calebasse",
      mode: "libre",
      isEmergencyFund: true,
    });

    const parsedDailyBudget = observationMode ? undefined : (dailyBudget ? Number(dailyBudget) : undefined);

    onComplete({
      profile: {
        name: name.trim() || "Ami",
        situation,
        situationCustom: situation === "autre" ? situationCustom : undefined,
        language,
        currency: "FCFA",
        smallestDenomination,
        roundUpSavingsEnabled: true,
        incomeSources: {
          hasGrant,
          grantAmount: grantAmount ? Number(grantAmount) : undefined,
          hasFamilyAid,
          familyAidAmount: familyAidAmount ? Number(familyAidAmount) : undefined,
          hasRegularJob,
          jobAmount: jobAmount ? Number(jobAmount) : undefined,
          jobFrequency,
          hasTontine,
          tontineContribution: tontineAmount ? Number(tontineAmount) : undefined,
          isIrregularIncome,
          hasNoIncome,
        },
        dailyBudgetTarget: parsedDailyBudget,
        observationMode,
        observationStartTimestamp: observationMode ? Date.now() : undefined,
        pocketBalance: undefined,
        lastOpenedTimestamp: Date.now(),
        darkMode: false,
        privateMode: false,
        pinCodeEnabled: false,
        onboardingCompleted: true,
      },
      goals: initialGoals,
    });
  };

  // -------------------------------------------------------------
  // Écran 0.1 : Splash
  // -------------------------------------------------------------
  if (step === 0) {
    return (
      <div
        onClick={handleSkipSplash}
        className="fixed inset-0 z-50 bg-[#FAF6EF] flex flex-col items-center justify-center p-6 cursor-pointer select-none"
      >
        <div className="flex flex-col items-center animate-fade-in text-center max-w-sm">
          {/* Cauris central avec traits bogolan */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border border-[#E8DDC9] flex items-center justify-center bg-[#FAF6EF]">
              <CaurisIcon size={44} color="#B5541F" filled />
            </div>
          </div>

          {/* Trois points horizontaux or sahélien */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9922E]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9922E]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9922E]" />
          </div>

          {/* Mot NAFA */}
          <h1 className="font-fraunces text-4xl font-bold tracking-wider text-[#B5541F] mb-3">
            NAFA
          </h1>

          {/* Signature */}
          <p className="text-xs text-[#8A8884] tracking-wide">
            Chaque franc compte. Chaque pas rapproche.
          </p>

          <span className="mt-8 text-[11px] text-[#8A8884]/60">
            Touche l'écran pour continuer
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.2 : Bienvenue
  // -------------------------------------------------------------
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-12">
          <div className="mb-8">
            <CaurisIcon size={32} color="#B5541F" />
          </div>

          <h1 className="font-fraunces text-3xl font-medium tracking-tight mb-4 text-[#1F1A15]">
            Bienvenue.
          </h1>

          <p className="text-base text-[#55534F] leading-relaxed mb-6">
            Je suis NAFA. Je vais t'aider à savoir où va ton argent, et à en garder pour ce qui compte vraiment pour toi.
          </p>

          <div className="bg-[#E8DDC9]/30 rounded-[14px] p-4 border border-[#E8DDC9]/60 text-xs text-[#55534F] space-y-2">
            <div className="flex items-center gap-2 text-[#4A6B3F] font-medium">
              <Check className="w-4 h-4" /> Aucune donnée inventée, jamais.
            </div>
            <div className="flex items-center gap-2 text-[#4A6B3F] font-medium">
              <Check className="w-4 h-4" /> 100% hors ligne, tes finances restent sur ton téléphone.
            </div>
          </div>
        </div>

        <div className="pb-8 space-y-4">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium shadow-sm active:scale-[0.98] transition-transform"
          >
            Commencer
          </button>

          <div className="text-center">
            <label className="text-xs text-[#8A8884] hover:text-[#1F1A15] cursor-pointer inline-flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurer une sauvegarde</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJsonUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.3 : Prénom
  // -------------------------------------------------------------
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-3">
            Comment veux-tu que je t'appelle ?
          </h2>

          <p className="text-sm text-[#8A8884] mb-8">
            Ton prénom ou le surnom sous lequel tu te reconnais.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              maxLength={20}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prénom (ex: Awa, Seydou...)"
              className="w-full bg-[#FAF6EF] border-b-2 border-[#B5541F] px-1 py-3 text-2xl font-fraunces focus:outline-none placeholder:text-[#8A8884]/40"
            />
            <p className="text-xs text-[#8A8884]">
              Ce nom restera sur ton téléphone. Je ne l'envoie nulle part.
            </p>
          </div>
        </div>

        <div className="pb-8">
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(3)}
            className="w-full py-4 bg-[#B5541F] disabled:opacity-40 text-[#FAF6EF] rounded-full text-base font-medium transition-all"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.4 : Langue
  // -------------------------------------------------------------
  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-2">
            Dans quelle langue veux-tu que je te parle ?
          </h2>
          <p className="text-sm text-[#8A8884] mb-6">
            Choisis la langue d'interface.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              className={`w-full p-4 rounded-[14px] border text-left flex items-center justify-between transition-all ${
                language === "fr"
                  ? "border-[#B5541F] bg-[#FAF6EF] shadow-sm ring-1 ring-[#B5541F]"
                  : "border-[#E8DDC9] bg-[#FAF6EF]"
              }`}
            >
              <span className="font-medium text-[#1F1A15]">Français</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#4A6B3F]/10 text-[#4A6B3F] font-medium">
                Disponible
              </span>
            </button>

            <div className="w-full p-4 rounded-[14px] border border-[#E8DDC9]/50 bg-[#E8DDC9]/20 text-left flex items-center justify-between opacity-60">
              <span className="text-[#8A8884]">Mooré</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DDC9] text-[#8A8884]">
                bientôt
              </span>
            </div>

            <div className="w-full p-4 rounded-[14px] border border-[#E8DDC9]/50 bg-[#E8DDC9]/20 text-left flex items-center justify-between opacity-60">
              <span className="text-[#8A8884]">Dioula</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DDC9] text-[#8A8884]">
                bientôt
              </span>
            </div>

            <div className="w-full p-4 rounded-[14px] border border-[#E8DDC9]/50 bg-[#E8DDC9]/20 text-left flex items-center justify-between opacity-60">
              <span className="text-[#8A8884]">Fulfuldé</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DDC9] text-[#8A8884]">
                bientôt
              </span>
            </div>
          </div>
        </div>

        <div className="pb-8">
          <button
            type="button"
            onClick={() => setStep(4)}
            className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.5 : Situation
  // -------------------------------------------------------------
  if (step === 4) {
    const situations: { id: UserSituation; label: string; icon: string }[] = [
      { id: "etudiant", label: "Étudiant(e)", icon: "🎓" },
      { id: "apprenti", label: "Apprenti(e) / en formation", icon: "💼" },
      { id: "sans_activite", label: "Sans activité rémunérée pour l'instant", icon: "🏠" },
      { id: "autre", label: "Autre — je décris", icon: "✍️" },
    ];

    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-2">
            Aujourd'hui, tu es...
          </h2>
          <p className="text-sm text-[#8A8884] mb-6">
            Pour adapter le ton et les suggestions.
          </p>

          <div className="space-y-3">
            {situations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSituation(item.id)}
                className={`w-full p-4 rounded-[14px] border text-left flex items-center gap-3 transition-all ${
                  situation === item.id
                    ? "border-[#B5541F] bg-[#FAF6EF] ring-1 ring-[#B5541F]"
                    : "border-[#E8DDC9] bg-[#FAF6EF]"
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}

            {situation === "autre" && (
              <input
                type="text"
                value={situationCustom}
                onChange={(e) => setSituationCustom(e.target.value)}
                placeholder="Précise ta situation..."
                className="w-full mt-2 p-3 text-sm bg-white rounded-[14px] border border-[#B5541F] focus:outline-none"
              />
            )}
          </div>
        </div>

        <div className="pb-8">
          <button
            type="button"
            onClick={() => setStep(5)}
            className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.6 : Devise et Arrondis
  // -------------------------------------------------------------
  if (step === 5) {
    const denominations: RoundingUnit[] = [25, 50, 100, 500];

    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(4)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-2">
            On parle en FCFA ?
          </h2>
          <p className="text-sm text-[#55534F] mb-6">
            Le franc est roi. Tout est en FCFA (XOF).
          </p>

          <div className="mb-6 p-4 rounded-[14px] bg-[#E8DDC9]/40 border border-[#E8DDC9]">
            <span className="text-sm font-semibold text-[#1F1A15]">FCFA (XOF)</span>
            <p className="text-xs text-[#8A8884] mt-0.5">Monnaie ouest-africaine</p>
          </div>

          <h3 className="text-sm font-medium text-[#1F1A15] mb-2">
            Quel est ton plus petit billet ou pièce habituel ?
          </h3>
          <p className="text-xs text-[#8A8884] mb-4">
            Tous les arrondis proposés respecteront ce choix.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {denominations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSmallestDenomination(d)}
                className={`p-3.5 rounded-[14px] border text-center transition-all ${
                  smallestDenomination === d
                    ? "border-[#B5541F] bg-[#FAF6EF] ring-1 ring-[#B5541F] font-bold text-[#B5541F]"
                    : "border-[#E8DDC9] bg-[#FAF6EF] text-[#55534F]"
                }`}
              >
                <div className="text-lg font-fraunces">{d} F</div>
                {d === 100 && (
                  <span className="text-[10px] text-[#8A8884] block mt-0.5">par défaut</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="pb-8">
          <button
            type="button"
            onClick={() => setStep(6)}
            className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.7 : Revenus
  // -------------------------------------------------------------
  if (step === 6) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(5)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-2">
            Comment ton argent arrive-t-il ?
          </h2>
          <p className="text-sm text-[#8A8884] mb-6">
            Coche ce qui s'applique (aucun n'est obligatoire).
          </p>

          <div className="space-y-3">
            {/* Bourse */}
            <div className="p-3.5 rounded-[14px] border border-[#E8DDC9] bg-[#FAF6EF]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasGrant}
                  onChange={(e) => setHasGrant(e.target.checked)}
                  className="rounded text-[#B5541F] w-4 h-4"
                />
                <span className="text-sm font-medium">Bourse mensuelle</span>
              </label>
              {hasGrant && (
                <div className="mt-3 pl-7">
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="Montant approximatif (ex: 25000)"
                    className="w-full p-2 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Aide familiale */}
            <div className="p-3.5 rounded-[14px] border border-[#E8DDC9] bg-[#FAF6EF]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFamilyAid}
                  onChange={(e) => setHasFamilyAid(e.target.checked)}
                  className="rounded text-[#B5541F] w-4 h-4"
                />
                <span className="text-sm font-medium">Aide familiale régulière</span>
              </label>
              {hasFamilyAid && (
                <div className="mt-3 pl-7">
                  <input
                    type="number"
                    value={familyAidAmount}
                    onChange={(e) => setFamilyAidAmount(e.target.value)}
                    placeholder="Montant mensuel moyen (ex: 15000)"
                    className="w-full p-2 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Petit job */}
            <div className="p-3.5 rounded-[14px] border border-[#E8DDC9] bg-[#FAF6EF]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRegularJob}
                  onChange={(e) => setHasRegularJob(e.target.checked)}
                  className="rounded text-[#B5541F] w-4 h-4"
                />
                <span className="text-sm font-medium">Petit job régulier</span>
              </label>
              {hasRegularJob && (
                <div className="mt-3 pl-7 flex gap-2">
                  <input
                    type="number"
                    value={jobAmount}
                    onChange={(e) => setJobAmount(e.target.value)}
                    placeholder="Montant (ex: 20000)"
                    className="flex-1 p-2 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
                  />
                  <select
                    value={jobFrequency}
                    onChange={(e) => setJobFrequency(e.target.value as any)}
                    className="p-2 text-sm bg-white rounded-lg border border-[#E8DDC9]"
                  >
                    <option value="mois">/ mois</option>
                    <option value="semaine">/ sem.</option>
                  </select>
                </div>
              )}
            </div>

            {/* Tontine */}
            <div className="p-3.5 rounded-[14px] border border-[#E8DDC9] bg-[#FAF6EF]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTontine}
                  onChange={(e) => setHasTontine(e.target.checked)}
                  className="rounded text-[#B5541F] w-4 h-4"
                />
                <span className="text-sm font-medium">Tontine</span>
              </label>
              {hasTontine && (
                <div className="mt-3 pl-7">
                  <input
                    type="number"
                    value={tontineAmount}
                    onChange={(e) => setTontineAmount(e.target.value)}
                    placeholder="Cotisation habituelle (ex: 5000)"
                    className="w-full p-2 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Argent irrégulier */}
            <div className="p-3.5 rounded-[14px] border border-[#E8DDC9] bg-[#FAF6EF]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIrregularIncome}
                  onChange={(e) => setIsIrregularIncome(e.target.checked)}
                  className="rounded text-[#B5541F] w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium block">Argent irrégulier</span>
                  <span className="text-xs text-[#8A8884]">
                    Active le moteur lissant les revenus variables
                  </span>
                </div>
              </label>
            </div>

            {/* Aucun revenu */}
            <div className="p-3.5 rounded-[14px] border border-[#E8DDC9] bg-[#FAF6EF]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasNoIncome}
                  onChange={(e) => setHasNoIncome(e.target.checked)}
                  className="rounded text-[#B5541F] w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium block">Aucun revenu pour l'instant</span>
                  <span className="text-xs text-[#8A8884]">
                    Mode découverte sans alarme imposée
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="pb-8">
          <button
            type="button"
            onClick={() => setStep(7)}
            className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.8 : Objectif prioritaire
  // -------------------------------------------------------------
  if (step === 7) {
    const suggestions = [
      { name: "Ordinateur", icon: "💻", defaultAmount: 180000 },
      { name: "Téléphone", icon: "📱", defaultAmount: 75000 },
      { name: "Fonds transport", icon: "🚌", defaultAmount: 20000 },
      { name: "Frais de scolarité", icon: "📚", defaultAmount: 50000 },
      { name: "Moto", icon: "🏍️", defaultAmount: 450000 },
      { name: "Fonds d'urgence", icon: "🧘", defaultAmount: 30000 },
    ];

    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(6)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-2">
            Qu'est-ce qui compte le plus pour toi en ce moment ?
          </h2>
          <p className="text-sm text-[#8A8884] mb-5">
            Ce projet donnera du sens à chaque franc épargné.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {suggestions.map((sug) => (
              <button
                key={sug.name}
                type="button"
                onClick={() => {
                  setGoalName(sug.name);
                  setGoalAmount(sug.defaultAmount.toString());
                  setSkipGoal(false);
                }}
                className={`p-3 rounded-[14px] border text-left flex items-center gap-2 transition-all ${
                  goalName === sug.name
                    ? "border-[#B5541F] bg-[#FAF6EF] ring-1 ring-[#B5541F]"
                    : "border-[#E8DDC9] bg-[#FAF6EF]"
                }`}
              >
                <span className="text-xl">{sug.icon}</span>
                <span className="text-xs font-medium truncate">{sug.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3 bg-[#E8DDC9]/20 p-4 rounded-[14px] border border-[#E8DDC9]">
            <div>
              <label className="text-xs text-[#8A8884] block mb-1">Nom du projet</label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => {
                  setGoalName(e.target.value);
                  setSkipGoal(false);
                }}
                placeholder="Ex: Mon ordinateur"
                className="w-full p-2.5 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#8A8884] block mb-1">Montant visé (FCFA)</label>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => {
                  setGoalAmount(e.target.value);
                  setSkipGoal(false);
                }}
                placeholder="Ex: 180000"
                className="w-full p-2.5 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setSkipGoal(true);
                setGoalName("");
                setGoalAmount("");
                setStep(8);
              }}
              className="text-xs text-[#8A8884] underline"
            >
              Je ne sais pas encore (NAFA créera un fonds d'urgence souple)
            </button>
          </div>
        </div>

        <div className="pb-8">
          <button
            type="button"
            onClick={() => setStep(8)}
            className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.9 : Budget quotidien
  // -------------------------------------------------------------
  if (step === 8) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setStep(7)}
            className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h2 className="font-fraunces text-2xl font-medium mb-2">
            Combien penses-tu pouvoir dépenser par jour ?
          </h2>
          <p className="text-sm text-[#8A8884] mb-6">
            Sans te mettre en danger. Tu pourras changer quand tu veux.
          </p>

          <div className="mb-6">
            <div className="relative">
              <input
                type="number"
                value={dailyBudget}
                onChange={(e) => {
                  setDailyBudget(e.target.value);
                  setObservationMode(false);
                }}
                placeholder="0"
                className="w-full bg-transparent border-b-2 border-[#B5541F] py-3 text-4xl font-fraunces tab-num text-[#1F1A15] focus:outline-none"
              />
              <span className="absolute right-0 bottom-3 text-sm text-[#8A8884]">
                FCFA / jour
              </span>
            </div>
            <p className="text-xs text-[#8A8884] mt-2">
              Beaucoup d'étudiants visent 1 500 à 2 500 F par jour.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              disabled={!dailyBudget || Number(dailyBudget) <= 0}
              onClick={() => {
                setObservationMode(false);
                setStep(9);
              }}
              className="w-full py-3.5 bg-[#B5541F] disabled:opacity-30 text-[#FAF6EF] rounded-full text-sm font-medium"
            >
              J'ai une idée → Valider ce chiffre
            </button>

            <button
              type="button"
              onClick={() => {
                setObservationMode(true);
                setDailyBudget("");
                setStep(9);
              }}
              className="w-full py-3.5 bg-[#FAF6EF] border border-[#E8DDC9] text-[#55534F] rounded-full text-xs font-medium hover:bg-[#E8DDC9]/30"
            >
              Je ne sais pas encore → Mode observation 14 jours
            </button>
          </div>
        </div>

        <div className="pb-8">
          <p className="text-center text-[11px] text-[#8A8884]">
            NAFA n'impose jamais de chiffre sans ton accord.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Écran 0.10 : Récapitulatif
  // -------------------------------------------------------------
  const monthlyTotalEstimate =
    (hasGrant ? Number(grantAmount || 0) : 0) +
    (hasFamilyAid ? Number(familyAidAmount || 0) : 0) +
    (hasRegularJob ? Number(jobAmount || 0) : 0);

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#1F1A15] flex flex-col justify-between p-6 max-w-md mx-auto">
      <div className="pt-6">
        <button
          type="button"
          onClick={() => setStep(8)}
          className="text-[#8A8884] hover:text-[#1F1A15] mb-6 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Modifier
        </button>

        <h2 className="font-fraunces text-2xl font-medium mb-1">
          Tout est prêt, {name || "Ami"}.
        </h2>
        <p className="text-sm text-[#8A8884] mb-6">
          Voici le cadre de ton carnet NAFA.
        </p>

        {/* Carte récapitulative sobre */}
        <div className="bg-[#FAF6EF] rounded-[14px] border border-[#E8DDC9] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8DDC9]/60 pb-3">
            <div>
              <h3 className="font-fraunces text-xl font-semibold text-[#1F1A15]">{name}</h3>
              <p className="text-xs text-[#8A8884] capitalize">
                {situation} · FCFA · arrondis à {smallestDenomination} F
              </p>
            </div>
            <CaurisIcon size={28} color="#C9922E" filled />
          </div>

          <div className="space-y-2 text-xs text-[#55534F]">
            <div className="flex justify-between">
              <span className="text-[#8A8884]">Revenus prévus :</span>
              <span className="font-medium text-[#1F1A15]">
                {monthlyTotalEstimate > 0
                  ? `≈ ${formatFCFA(monthlyTotalEstimate)} / mois`
                  : isIrregularIncome
                  ? "Revenus variables"
                  : "Aucun revenu déclaré"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8A8884]">Objectif prioritaire :</span>
              <span className="font-medium text-[#1F1A15]">
                {goalName.trim() && Number(goalAmount) > 0
                  ? `${goalName} (${formatFCFA(Number(goalAmount))})`
                  : "Fonds d'urgence"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8A8884]">Budget quotidien :</span>
              <span className="font-medium text-[#B5541F]">
                {observationMode
                  ? "Observation (14 jours)"
                  : dailyBudget
                  ? `${formatFCFA(Number(dailyBudget))} / jour`
                  : "À définir"}
              </span>
            </div>
          </div>

          <BogolanFrise color="#C9922E" height={6} className="opacity-70 my-2" />

          <p className="text-[11px] text-[#8A8884] italic">
            "Chaque franc compte. Chaque pas rapproche."
          </p>
        </div>
      </div>

      <div className="pb-8 space-y-3">
        <button
          type="button"
          onClick={finishOnboarding}
          className="w-full py-4 bg-[#B5541F] text-[#FAF6EF] rounded-full text-base font-medium shadow-sm active:scale-[0.98] transition-transform"
        >
          C'est bon, on y va
        </button>

        <button
          type="button"
          onClick={() => setStep(2)}
          className="w-full py-2.5 text-xs text-[#8A8884] hover:text-[#1F1A15]"
        >
          Modifier quelque chose
        </button>
      </div>
    </div>
  );
};

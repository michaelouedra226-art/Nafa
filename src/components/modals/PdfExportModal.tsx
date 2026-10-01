import React, { useEffect, useRef, useState } from "react";
import { AppState } from "../../types";
import { generateNafaPdf, PdfGenerationOptions, PdfExportResult } from "../../utils/pdfGenerator";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface PdfExportModalProps {
  state: AppState;
  onClose: () => void;
}

type DocumentType = PdfGenerationOptions["docType"];
type ExportStep = 1 | 2 | 3;

const DOCUMENTS: Array<{
  id: DocumentType;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  pale: string;
}> = [
  {
    id: "rapport",
    title: "Rapport budgétaire",
    shortTitle: "Rapport de budget",
    description: "Revenus, dépenses, objectifs et relevé détaillé selon tes options.",
    icon: FileText,
    accent: "text-[#B5541F]",
    pale: "bg-[#B5541F]/10",
  },
  {
    id: "bourse_parents",
    title: "Synthèse à partager",
    shortTitle: "Synthèse budgétaire",
    description: "Une page avec les principaux chiffres de la période choisie.",
    icon: ShieldCheck,
    accent: "text-[#4A6B3F]",
    pale: "bg-[#4A6B3F]/10",
  },
  {
    id: "attestation",
    title: "Relevé personnel d’épargne",
    shortTitle: "Relevé d’épargne",
    description: "Tes objectifs d’épargne, les montants atteints et le solde enregistré.",
    icon: Award,
    accent: "text-[#9A6A12]",
    pale: "bg-[#C9922E]/15",
  },
];

const STEPS: Array<{ id: ExportStep; label: string }> = [
  { id: 1, label: "Document" },
  { id: 2, label: "Options" },
  { id: 3, label: "Aperçu" },
];

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ state, onClose }) => {
  const [step, setStep] = useState<ExportStep>(1);
  const [docType, setDocType] = useState<DocumentType>("rapport");
  const [period, setPeriod] = useState<"this_month" | "all">("this_month");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeGoals, setIncludeGoals] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState<PdfExportResult | null>(null);
  const [exportResult, setExportResult] = useState<PdfExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const exportUrlRef = useRef<string | null>(null);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const dateLabel = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const userName = state.profile.name?.trim() || "Nom non renseigné";
  const selectedDocument = DOCUMENTS.find((document) => document.id === docType) ?? DOCUMENTS[0];
  const periodLabel = period === "this_month" ? monthLabel : "Historique complet";

  const sourceTimestamps = state.transactions?.length
    ? state.transactions.map((transaction) => transaction.timestamp)
    : [
        ...state.incomes.map((income) => income.timestamp),
        ...state.expenses.map((expense) => expense.timestamp),
        ...state.expenses
          .filter((expense) => (expense.roundUpSaved || 0) > 0)
          .map((expense) => expense.timestamp),
      ];
  const operationCount = sourceTimestamps.filter((timestamp) => {
    if (period === "all") return true;
    const date = new Date(timestamp);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  const clearGeneratedFiles = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    previewUrlRef.current = null;
    exportUrlRef.current = null;
    setPreviewResult(null);
    setExportResult(null);
    setErrorMessage(null);
  };

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
  }, []);

  const getGenerationOptions = (): PdfGenerationOptions => ({
    docType,
    period,
    includeDetails: docType === "rapport" && includeDetails,
    includeGoals: docType === "rapport" && includeGoals,
  });

  const handlePreview = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const result = await generateNafaPdf(state, getGenerationOptions(), "preview");
      previewUrlRef.current = result.blobUrl;
      setPreviewResult(result);
    } catch {
      setErrorMessage("Impossible de préparer l’aperçu. Vérifie l’espace disponible puis réessaie.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const result = await generateNafaPdf(state, getGenerationOptions());
      exportUrlRef.current = result.blobUrl;
      setExportResult(result);
    } catch {
      setErrorMessage("Le PDF n’a pas pu être créé. Réessaie dans un instant.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPdf = () => {
    if (!exportResult?.blobUrl) return;
    const link = document.createElement("a");
    link.href = exportResult.blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  const selectDocument = (next: DocumentType) => {
    if (next !== docType) clearGeneratedFiles();
    setDocType(next);
  };

  const changePeriod = (next: "this_month" | "all") => {
    if (next !== period) clearGeneratedFiles();
    setPeriod(next);
  };

  const changeIncludeDetails = (next: boolean) => {
    if (next !== includeDetails) clearGeneratedFiles();
    setIncludeDetails(next);
  };

  const changeIncludeGoals = (next: boolean) => {
    if (next !== includeGoals) clearGeneratedFiles();
    setIncludeGoals(next);
  };

  const goToStep = (next: ExportStep) => {
    setErrorMessage(null);
    setStep(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isGenerating) onClose();
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-export-title"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[#E8DDC9] bg-[#FAF6EF] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#E8DDC9] bg-white px-5 pb-4 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B5541F]/10 text-[#B5541F]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="pdf-export-title" className="font-fraunces text-lg font-bold leading-tight text-[#1F1A15]">
                  Préparer un PDF
                </h2>
                <p className="mt-0.5 text-xs text-[#6E6A64]">Choisis le contenu, vérifie-le, puis crée ton document.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              aria-label="Fermer l’export PDF"
              className="rounded-full p-2 text-[#6E6A64] transition hover:bg-[#FAF6EF] hover:text-[#1F1A15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <ol aria-label="Étapes de création du PDF" className="mt-5 grid grid-cols-3 gap-2">
            {STEPS.map((item) => {
              const complete = step > item.id;
              const active = step === item.id;
              return (
                <li key={item.id} aria-current={active ? "step" : undefined} className="min-w-0">
                  <div className={`mb-2 h-1 rounded-full ${complete || active ? "bg-[#B5541F]" : "bg-[#E8DDC9]"}`} />
                  <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${active ? "text-[#1F1A15]" : "text-[#8A8884]"}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${complete || active ? "bg-[#B5541F] text-white" : "bg-[#EEEAE3] text-[#6E6A64]"}`}>
                      {complete ? <Check className="h-3 w-3" /> : item.id}
                    </span>
                    {item.label}
                  </div>
                </li>
              );
            })}
          </ol>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A15]">Quel document veux-tu préparer ?</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6E6A64]">Les documents reflètent les opérations enregistrées dans ton carnet.</p>
              </div>
              <div className="space-y-2.5">
                {DOCUMENTS.map((document) => {
                  const Icon = document.icon;
                  const selected = docType === document.id;
                  return (
                    <button
                      key={document.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectDocument(document.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] ${selected ? "border-[#B5541F] bg-white shadow-sm" : "border-[#E8DDC9] bg-white/50 hover:bg-white"}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${document.pale} ${document.accent}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#1F1A15]">{document.title}</span>
                          {selected && <Check className={`h-4 w-4 shrink-0 ${document.accent}`} aria-hidden="true" />}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[#6E6A64]">{document.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A15]">Définis la période et le niveau de détail</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6E6A64]">Ces choix déterminent les opérations qui apparaîtront dans le document.</p>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#45413C]">
                  <CalendarDays className="h-4 w-4 text-[#B5541F]" /> Période des opérations
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["this_month", monthLabel],
                    ["all", "Tout l’historique"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={period === value}
                      onClick={() => changePeriod(value)}
                      className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] ${period === value ? "border-[#1F1A15] bg-[#1F1A15] text-white" : "border-[#E8DDC9] bg-white text-[#45413C] hover:border-[#B5541F]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {docType === "rapport" && (
                <fieldset className="space-y-3 rounded-2xl border border-[#E8DDC9] bg-white/70 p-4">
                  <legend className="px-1 text-xs font-semibold text-[#45413C]">Contenu du rapport</legend>
                  <label className="flex cursor-pointer items-start gap-3 text-xs text-[#45413C]">
                    <input
                      type="checkbox"
                      checked={includeGoals}
                      onChange={(event) => changeIncludeGoals(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#C8BBA6] accent-[#B5541F] focus:ring-[#B5541F]"
                    />
                    <span><strong className="font-semibold text-[#1F1A15]">Détail des objectifs</strong><span className="mt-0.5 block text-[#6E6A64]">Progression de l’épargne et objectifs en cours.</span></span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-xs text-[#45413C]">
                    <input
                      type="checkbox"
                      checked={includeDetails}
                      onChange={(event) => changeIncludeDetails(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#C8BBA6] accent-[#B5541F] focus:ring-[#B5541F]"
                    />
                    <span><strong className="font-semibold text-[#1F1A15]">Relevé ligne par ligne</strong><span className="mt-0.5 block text-[#6E6A64]">Ajoute les mouvements détaillés après la synthèse.</span></span>
                  </label>
                </fieldset>
              )}

              {docType !== "rapport" && (
                <div className="flex gap-3 rounded-2xl border border-[#E8DDC9] bg-white/70 p-4 text-xs leading-relaxed text-[#5D594F]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4A6B3F]" />
                  <p>Le PDF est préparé sur cet appareil. Tu choisis ensuite toi-même où l’enregistrer ou le partager.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A15]">Vérifie le contenu avant de créer le PDF</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6E6A64]">Voici un aperçu des informations et de la période qui seront utilisées.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="min-h-[215px] rounded-2xl border border-[#E8DDC9] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#EEEAE3] pb-3">
                    <span className="font-fraunces text-lg font-bold tracking-wide text-[#B5541F]">NAFA</span>
                    <span className="rounded-full bg-[#FAF6EF] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#6E6A64]">PDF · A4</span>
                  </div>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8884]">{selectedDocument.shortTitle}</p>
                  <h4 className="mt-1 font-fraunces text-base font-bold leading-snug text-[#1F1A15]">{userName}</h4>
                  <p className="mt-1 text-[11px] text-[#6E6A64]">{periodLabel} · créé le {dateLabel}</p>
                  <div className="my-4 h-px bg-[#E8DDC9]" />
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1F1A15]">
                    <FileText className="h-4 w-4 text-[#B5541F]" /> {operationCount} {operationCount === 1 ? "opération" : "opérations"}
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-[#6E6A64]">Les soldes et objectifs indiqués correspondent à l’état enregistré à la date de création.</p>
                </div>

                <div className="space-y-3 rounded-2xl border border-[#E8DDC9] bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B5541F]/10 text-[#B5541F]"><CalendarDays className="h-4 w-4" /></span>
                    <div><p className="text-xs font-semibold text-[#1F1A15]">Période</p><p className="mt-0.5 text-xs text-[#6E6A64]">{periodLabel}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4A6B3F]/10 text-[#4A6B3F]"><FileText className="h-4 w-4" /></span>
                    <div><p className="text-xs font-semibold text-[#1F1A15]">Opérations</p><p className="mt-0.5 text-xs text-[#6E6A64]">{operationCount} {operationCount === 1 ? "ligne trouvée" : "lignes trouvées"} pour cette période.</p></div>
                  </div>
                  {docType === "rapport" && (
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C9922E]/15 text-[#9A6A12]"><Award className="h-4 w-4" /></span>
                      <div><p className="text-xs font-semibold text-[#1F1A15]">Éléments inclus</p><p className="mt-0.5 text-xs leading-relaxed text-[#6E6A64]">{[includeGoals && "objectifs", includeDetails && "relevé détaillé"].filter(Boolean).join(" · ") || "synthèse uniquement"}</p></div>
                    </div>
                  )}
                  <p className="border-t border-[#E8DDC9] pt-3 text-[11px] leading-relaxed text-[#6E6A64]">Ce document reprend les données saisies dans NAFA. Il est informatif et n’est ni audité ni certifié par un tiers.</p>
                </div>
              </div>

              {previewResult && !previewResult.isNative && (
                <div className="overflow-hidden rounded-2xl border border-[#E8DDC9] bg-white">
                  <div className="flex items-center gap-2 border-b border-[#E8DDC9] px-4 py-2 text-xs font-semibold text-[#45413C]">
                    <CheckCircle2 className="h-4 w-4 text-[#4A6B3F]" /> Aperçu réel du PDF
                  </div>
                  <iframe title={`Aperçu du PDF : ${selectedDocument.title}`} src={previewResult.blobUrl} className="h-[420px] w-full bg-[#F0EEE9]" />
                </div>
              )}
              {previewResult?.isNative && (
                <p className="rounded-xl bg-[#EEEAE3] px-3 py-2 text-[11px] leading-relaxed text-[#5D594F]">L’aperçu intégré n’est pas disponible dans ce lecteur mobile. Tu pourras ouvrir le PDF après sa création et son partage.</p>
              )}

              {exportResult && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#4A6B3F]/25 bg-[#4A6B3F]/10 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4A6B3F]" />
                    <div><p className="text-sm font-semibold text-[#31502B]">PDF prêt</p><p className="mt-0.5 max-w-[220px] truncate text-[11px] text-[#5D594F]">{exportResult.fileName}</p></div>
                  </div>
                  <button type="button" onClick={handleOpenPdf} className="inline-flex items-center gap-2 rounded-xl bg-[#4A6B3F] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3E5C35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6B3F] focus-visible:ring-offset-2">
                    <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-[#B5541F]/25 bg-[#B5541F]/10 px-3 py-2 text-xs leading-relaxed text-[#8F3B0E]">{errorMessage}</p>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E8DDC9] bg-white px-5 py-4 sm:px-7">
          <div>
            {step === 1 ? (
              <button type="button" onClick={onClose} disabled={isGenerating} className="rounded-xl px-3 py-2.5 text-xs font-semibold text-[#6E6A64] transition hover:bg-[#FAF6EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F]">Annuler</button>
            ) : (
              <button type="button" onClick={() => goToStep((step - 1) as ExportStep)} disabled={isGenerating} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#45413C] transition hover:bg-[#FAF6EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] disabled:opacity-50">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
            )}
          </div>

          {step < 3 ? (
            <button type="button" onClick={() => goToStep((step + 1) as ExportStep)} className="inline-flex items-center gap-2 rounded-xl bg-[#B5541F] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#A04514] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] focus-visible:ring-offset-2">
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          ) : !previewResult ? (
            <button type="button" onClick={handlePreview} disabled={isGenerating} className="inline-flex items-center gap-2 rounded-xl bg-[#B5541F] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#A04514] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
              {isGenerating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FileText className="h-4 w-4" />}
              {isGenerating ? "Préparation…" : "Créer l’aperçu PDF"}
            </button>
          ) : (
            <button type="button" onClick={handleExport} disabled={isGenerating || Boolean(exportResult)} className="inline-flex items-center gap-2 rounded-xl bg-[#B5541F] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#A04514] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5541F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {isGenerating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Download className="h-4 w-4" />}
              {isGenerating ? "Création…" : exportResult ? "PDF créé" : "Générer le PDF"}
            </button>
          )}
        </footer>
      </motion.section>
    </div>
  );
};

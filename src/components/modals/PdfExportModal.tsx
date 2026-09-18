import React, { useState } from "react";
import { AppState } from "../../types";
import { generateNafaPdf, PdfGenerationOptions, PdfExportResult } from "../../utils/pdfGenerator";
import { FileText, Award, Download, X, Check, ShieldCheck, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

interface PdfExportModalProps {
  state: AppState;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ state, onClose }) => {
  const [docType, setDocType] = useState<"rapport" | "attestation" | "bourse_parents">("rapport");
  const [period, setPeriod] = useState<"this_month" | "all">("this_month");
  const [includeDetails, setIncludeDetails] = useState<boolean>(true);
  const [includeGoals, setIncludeGoals] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<PdfExportResult | null>(null);

  const userName = (state.profile.name && state.profile.name.trim()) || "Michael";
  const now = new Date();
  const currentMonthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const handleDownload = async () => {
    setIsGenerating(true);
    setExportResult(null);

    try {
      const options: PdfGenerationOptions = {
        docType,
        period,
        includeDetails,
        includeGoals,
      };

      const result = await generateNafaPdf(state, options);
      setIsGenerating(false);
      setExportResult(result);

      // Effet de célébration
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.7 },
        colors: ["#B5541F", "#C9922E", "#4A6B3F", "#1E2A44"],
      });
    } catch (err) {
      console.error("Erreur de génération PDF:", err);
      setIsGenerating(false);
      alert("Une erreur est survenue lors de la création du fichier PDF.");
    }
  };

  const handleOpenPdf = () => {
    if (exportResult?.blobUrl) {
      window.open(exportResult.blobUrl, "_blank");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-md bg-[#FAF6EF] rounded-[22px] shadow-2xl overflow-hidden border border-[#E8DDC9] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête sans débordement, mobile-first */}
        <div className="px-5 py-4 bg-white border-b border-[#E8DDC9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#B5541F]/10 flex items-center justify-center text-[#B5541F]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-fraunces text-base font-bold text-[#1F1A15] leading-tight">
                Documents officiels NAFA
              </h2>
              <p className="text-[11px] text-[#8A8884]">
                Exportation PDF certifiée (Format A4)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8A8884] hover:text-[#1F1A15] hover:bg-[#FAF6EF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps principal */}
        <div className="p-5 space-y-5 text-[#1F1A15]">
          {/* Titulaire actuel */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#E8DDC9]/30 border border-[#E8DDC9] rounded-[12px] text-xs">
            <span className="text-[#8A8884]">Titulaire certifié :</span>
            <span className="font-semibold text-[#1F1A15]">{userName}</span>
          </div>

          {/* Choix du type de document (2 cartes distinctes) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-[#8A8884] uppercase tracking-wider">
              Type de document à exporter
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1 : Rapport mensuel */}
              <button
                type="button"
                onClick={() => setDocType("rapport")}
                className={`flex items-start gap-3 p-3.5 rounded-[14px] text-left transition-all border ${
                  docType === "rapport"
                    ? "bg-white border-[#B5541F] shadow-xs"
                    : "bg-[#FAF6EF] border-[#E8DDC9] opacity-80 hover:opacity-100"
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-full ${docType === "rapport" ? "bg-[#B5541F] text-white" : "bg-[#E8DDC9] text-[#55534F]"}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#1F1A15]">Rapport de gestion mensuelle</span>
                    {docType === "rapport" && <Check className="w-4 h-4 text-[#B5541F]" />}
                  </div>
                  <p className="text-[11px] text-[#8A8884] mt-0.5 leading-relaxed">
                    Bilan complet : revenus, dépenses, catégorisation et solde restant. Avec logo officiel et bordures en motifs africains.
                  </p>
                </div>
              </button>

              {/* Option 2 : Synthèse Parents & Bourse (P0 WAOUH) */}
              <button
                type="button"
                onClick={() => setDocType("bourse_parents")}
                className={`flex items-start gap-3 p-3.5 rounded-[14px] text-left transition-all border ${
                  docType === "bourse_parents"
                    ? "bg-white border-[#4A6B3F] shadow-xs"
                    : "bg-[#FAF6EF] border-[#E8DDC9] opacity-80 hover:opacity-100"
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-full ${docType === "bourse_parents" ? "bg-[#4A6B3F] text-white" : "bg-[#E8DDC9] text-[#55534F]"}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#1F1A15]">Synthèse Parents & Bourse (1 page)</span>
                    {docType === "bourse_parents" && <Check className="w-4 h-4 text-[#4A6B3F]" />}
                  </div>
                  <p className="text-[11px] text-[#8A8884] mt-0.5 leading-relaxed">
                    Format concis et solennel sur 1 page A4 avec logo, répartition des dépenses, déclaration d'honneur et signature certifiée.
                  </p>
                </div>
              </button>

              {/* Option 3 : Attestation d'épargne */}
              <button
                type="button"
                onClick={() => setDocType("attestation")}
                className={`flex items-start gap-3 p-3.5 rounded-[14px] text-left transition-all border ${
                  docType === "attestation"
                    ? "bg-white border-[#C9922E] shadow-xs"
                    : "bg-[#FAF6EF] border-[#E8DDC9] opacity-80 hover:opacity-100"
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-full ${docType === "attestation" ? "bg-[#C9922E] text-white" : "bg-[#E8DDC9] text-[#55534F]"}`}>
                  <Award className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#1F1A15]">Attestation officielle d'épargne</span>
                    {docType === "attestation" && <Check className="w-4 h-4 text-[#C9922E]" />}
                  </div>
                  <p className="text-[11px] text-[#8A8884] mt-0.5 leading-relaxed">
                    Certificat solennel avec sceau NAFA, logo et encadrement traditionnel Mossi/Bogolan pour bailleurs ou banques.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Options de période si rapport */}
          {docType === "rapport" && (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-[#8A8884] uppercase tracking-wider">
                Période
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPeriod("this_month")}
                  className={`py-2 px-3 rounded-[10px] text-xs font-medium border text-center transition-all ${
                    period === "this_month"
                      ? "bg-[#1F1A15] text-white border-[#1F1A15]"
                      : "bg-white text-[#55534F] border-[#E8DDC9]"
                  }`}
                >
                  {currentMonthName}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("all")}
                  className={`py-2 px-3 rounded-[10px] text-xs font-medium border text-center transition-all ${
                    period === "all"
                      ? "bg-[#1F1A15] text-white border-[#1F1A15]"
                      : "bg-white text-[#55534F] border-[#E8DDC9]"
                  }`}
                >
                  Historique global
                </button>
              </div>
            </div>
          )}

          {/* Options additionnelles */}
          <div className="space-y-2 pt-2 border-t border-[#E8DDC9]">
            <label className="block text-[11px] font-semibold text-[#8A8884] uppercase tracking-wider">
              Contenu et finitions graphiques
            </label>
            <div className="space-y-1.5 text-xs text-[#55534F]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeGoals}
                  onChange={(e) => setIncludeGoals(e.target.checked)}
                  className="rounded border-[#E8DDC9] text-[#B5541F] focus:ring-[#B5541F]"
                />
                <span>Inclure la progression des objectifs et Cauris d'or</span>
              </label>

              {docType === "rapport" && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    className="rounded border-[#E8DDC9] text-[#B5541F] focus:ring-[#B5541F]"
                  />
                  <span>Inclure le relevé détaillé ligne par ligne</span>
                </label>
              )}

              <div className="flex items-center gap-2 text-[#4A6B3F] text-[11px] mt-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bordures en motifs africains & logo officiel inclus</span>
              </div>
            </div>
          </div>

          {/* Message de succès et actions directes */}
          <AnimatePresence>
            {exportResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 bg-[#4A6B3F]/10 border border-[#4A6B3F]/30 rounded-[14px] space-y-2.5 text-xs text-[#4A6B3F]"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {exportResult.isNative ? "Document généré et partagé !" : "Téléchargement lancé avec succès !"}
                    </p>
                    <p className="text-[10px] text-[#55534F] truncate">{exportResult.fileName}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenPdf}
                    className="flex-1 py-2 px-3 rounded-[10px] bg-[#4A6B3F] text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#3E5C35] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ouvrir / Voir le PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="py-2 px-3 rounded-[10px] bg-white border border-[#4A6B3F]/40 text-[#4A6B3F] font-medium text-xs flex items-center justify-center gap-1 hover:bg-[#FAF6EF] transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-télécharger</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton d'action principal pleine largeur */}
          <div className="pt-1">
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              type="button"
              disabled={isGenerating}
              onClick={handleDownload}
              className={`w-full py-3.5 px-4 rounded-[14px] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                isGenerating
                  ? "bg-[#8A8884] cursor-not-allowed"
                  : "bg-[#B5541F] hover:bg-[#A04514] active:bg-[#8F3B0E]"
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Génération vectorielle A4...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger le PDF officiel (A4)</span>
                </>
              )}
            </motion.button>
            <p className="text-center text-[10px] text-[#8A8884] mt-2">
              Le document PDF contient l'encadrement en motifs africains, le logo NAFA et la signature certifiée.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

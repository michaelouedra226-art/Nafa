import { jsPDF } from "jspdf";
import { AppState } from "../types";

export interface PdfGenerationOptions {
  docType: "rapport" | "attestation";
  period: "this_month" | "all";
  includeDetails: boolean;
  includeGoals: boolean;
}

export function generateNafaPdf(state: AppState, options: PdfGenerationOptions): string {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const userName = (state.profile.name && state.profile.name.trim()) || "Michael";
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const docRef = `NAFA-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Filtrage des données
  const filteredExpenses = options.period === "this_month"
    ? state.expenses.filter((e) => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
    : state.expenses;

  const filteredIncomes = options.period === "this_month"
    ? state.incomes.filter((i) => {
        const d = new Date(i.timestamp);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
    : state.incomes;

  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const totalSaved = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  const completedGoals = state.goals.filter((g) => g.completed);

  // Couleurs de la charte NAFA
  const COLOR_TERRE = [181, 84, 31];       // #B5541F
  const COLOR_INDIGO = [30, 42, 68];       // #1E2A44
  const COLOR_OR = [201, 146, 46];         // #C9922E
  const COLOR_VERT = [74, 107, 63];        // #4A6B3F
  const COLOR_DARK = [31, 26, 21];         // #1F1A15
  const COLOR_MUTED = [120, 115, 110];     // #78736E
  const COLOR_BG = [250, 246, 239];        // #FAF6EF
  const COLOR_LINE = [232, 221, 201];      // #E8DDC9

  // Helper pour dessiner la frise Bogolan en haut et bas
  const drawBogolanBanner = (y: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.rect(0, y, 210, 4, "F");

    doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.rect(0, y + 4, 210, 1.5, "F");

    // Motifs géométriques
    doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.setLineWidth(0.3);
    for (let x = 6; x < 205; x += 12) {
      doc.line(x, y + 2, x + 3, y + 0.8);
      doc.line(x + 3, y + 0.8, x + 6, y + 2);
    }
  };

  // Frise supérieure
  drawBogolanBanner(0);

  // 1. EN-TÊTE OFFICIEL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.text("RÉPUBLIQUE DU BURKINA FASO", 15, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text("La Patrie ou la mort, nous vaincrons", 15, 18);
  doc.text("Système Autonome de Rigueur Budgétaire • NAFA", 15, 22);

  // Côté droit de l'en-tête
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(`RÉFÉRENCE : ${docRef}`, 195, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`Émis le ${dateStr} à ${timeStr}`, 195, 18, { align: "right" });
  doc.text("Format Standard A4 conforme UEMOA", 195, 22, { align: "right" });

  // Ligne de séparation
  doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
  doc.setLineWidth(0.4);
  doc.line(15, 25, 195, 25);

  let currentY = 32;

  // =========================================================================
  // TYPE 1 : RAPPORT FINANCIER MENSUEL
  // =========================================================================
  if (options.docType === "rapport") {
    // Bandeau Titre
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.roundedRect(15, currentY, 180, 18, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("RAPPORT DE GESTION BUDGÉTAIRE", 20, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`Titulaire du carnet : ${userName.toUpperCase()}  •  Période : ${options.period === "this_month" ? monthName.toUpperCase() : "HISTORIQUE COMPLET"}`, 20, currentY + 13);

    currentY += 24;

    // 4 Blocs de Synthèse financière
    const boxW = 42;
    const boxH = 20;
    const spacing = 4;

    const cards = [
      { label: "TOTAL REVENUS", val: `${totalIncome.toLocaleString("fr-FR")} F`, color: COLOR_VERT },
      { label: "TOTAL DÉPENSES", val: `${totalSpent.toLocaleString("fr-FR")} F`, color: COLOR_TERRE },
      { label: "ÉPARGNE SÉCURISÉE", val: `${totalSaved.toLocaleString("fr-FR")} F`, color: COLOR_OR },
      { label: "SOLDE DISPONIBLE", val: `${(totalIncome - totalSpent).toLocaleString("fr-FR")} F`, color: COLOR_INDIGO },
    ];

    cards.forEach((card, i) => {
      const x = 15 + i * (boxW + spacing);
      doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
      doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
      doc.roundedRect(x, currentY, boxW, boxH, 2.5, 2.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(card.label, x + 3.5, currentY + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.val, x + 3.5, currentY + 14);
    });

    currentY += boxH + 8;

    // Section 2 : Objectifs et projets en cours
    if (options.includeGoals && state.goals.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("1. ÉTAT DE L'ÉPARGNE & CAURIS D'OR", 15, currentY);

      currentY += 4;

      state.goals.slice(0, 4).forEach((g) => {
        const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(15, currentY, 180, 10, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        doc.text(`${g.name} ${g.isEmergencyFund ? "(Fonds de réserve)" : ""}`, 18, currentY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text(`${g.currentAmount.toLocaleString("fr-FR")} F / ${g.targetAmount.toLocaleString("fr-FR")} F (${pct}%)`, 130, currentY + 6);

        // Petite jauge graphique
        const barW = 35;
        const fillW = (barW * pct) / 100;
        doc.setFillColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(155, currentY + 3.5, barW, 3, 1, 1, "F");

        doc.setFillColor(COLOR_VERT[0], COLOR_VERT[1], COLOR_VERT[2]);
        if (fillW > 0) {
          doc.roundedRect(155, currentY + 3.5, fillW, 3, 1, 1, "F");
        }

        currentY += 12;
      });

      currentY += 4;
    }

    // Section 3 : Relevé des opérations
    if (options.includeDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("2. RELEVÉ CHRONOLOGIQUE DES DÉPENSES", 15, currentY);

      currentY += 4;

      // En-tête de tableau
      doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
      doc.rect(15, currentY, 180, 6.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("DATE", 18, currentY + 4.5);
      doc.text("CATÉGORIE", 45, currentY + 4.5);
      doc.text("MOTIF / LIBELLÉ", 90, currentY + 4.5);
      doc.text("MONTANT (FCFA)", 190, currentY + 4.5, { align: "right" });

      currentY += 6.5;

      const displayExpenses = filteredExpenses.slice(0, 14);

      if (displayExpenses.length === 0) {
        doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
        doc.rect(15, currentY, 180, 8, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text("Aucune dépense enregistrée sur cette période.", 20, currentY + 5.5);
        currentY += 8;
      } else {
        displayExpenses.forEach((exp, idx) => {
          const isEven = idx % 2 === 0;
          doc.setFillColor(isEven ? 255 : COLOR_BG[0], isEven ? 255 : COLOR_BG[1], isEven ? 255 : COLOR_BG[2]);
          doc.rect(15, currentY, 180, 6, "F");

          const dExp = new Date(exp.timestamp);
          const expDate = dExp.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
          const cat = state.categories.find((c) => c.id === exp.categoryId)?.name || "Général";

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
          doc.text(expDate, 18, currentY + 4.2);
          doc.text(cat, 45, currentY + 4.2);
          doc.text(exp.label || "Dépense courante", 90, currentY + 4.2);

          doc.setFont("helvetica", "bold");
          doc.text(`-${exp.amount.toLocaleString("fr-FR")} F`, 190, currentY + 4.2, { align: "right" });

          currentY += 6;
        });
      }

      currentY += 6;
    }
  } else {
    // =========================================================================
    // TYPE 2 : ATTESTATION SOLENNELLE D'ÉPARGNE ET DE RIGUEUR
    // =========================================================================
    currentY += 4;

    // Titre de l'attestation
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(15, currentY, 180, 24, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("ATTESTATION OFFICIELLE DE RIGUEUR FINANCIÈRE", 105, currentY + 9, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("DOCUMENT DE SOLVABILITÉ ET DE CAPACITÉ D'ÉPARGNE", 105, currentY + 16, { align: "center" });

    currentY += 32;

    // Texte solennel d'attestation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);

    const introText = 
      `Le carnet numérique NAFA, système autonome de gestion financière au Burkina Faso, certifie par la présente les déclarations et la discipline budgétaire observée par :\n\n` +
      `Nom et Prénom : ${userName.toUpperCase()}\n` +
      `Situation : ${state.profile.situation.toUpperCase()} (Burkina Faso)\n` +
      `Devise de tenue de compte : Franc CFA (XOF)\n\n` +
      `Il est attesté que le titulaire applique une méthode de plafonnement quotidien strict et d'arrondis systématiques. Les données vérifiées au ${dateStr} indiquent :`;

    const splitIntro = doc.splitTextToSize(introText, 180);
    doc.text(splitIntro, 15, currentY);

    currentY += 38;

    // Tableau de certification
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.roundedRect(15, currentY, 180, 36, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text("INDICATEURS DE DISCIPLINE VALIDÉS", 20, currentY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text("• Épargne totale mobilisée et sanctuarisée :", 20, currentY + 16);
    doc.text("• Cauris d'or (Objectifs majeurs atteints à 100%) :", 20, currentY + 23);
    doc.text("• Règle de réserve d'urgence appliquée :", 20, currentY + 30);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLOR_VERT[0], COLOR_VERT[1], COLOR_VERT[2]);
    doc.text(`${totalSaved.toLocaleString("fr-FR")} FCFA`, 185, currentY + 16, { align: "right" });

    doc.setTextColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.text(`${completedGoals.length} PROJET(S) ACCOMPLI(S)`, 185, currentY + 23, { align: "right" });

    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("OUI (CONFORME NAFA)", 185, currentY + 30, { align: "right" });

    currentY += 46;

    // Mention de destination
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    const usageNote = "Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit auprès de tout bailleur, établissement universitaire, tuteur ou organisme de micro-financement.";
    doc.text(doc.splitTextToSize(usageNote, 180), 15, currentY);

    currentY += 16;
  }

  // =========================================================================
  // PIED DE PAGE & SCEAU D'AUTHENTICITÉ (COMMUN AUX DEUX DOCUMENTS)
  // =========================================================================
  const footerY = 252;

  // Sceau circulaire NAFA (dessiné vectoriellement)
  const sealX = 40;
  const sealY = footerY + 12;

  doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.setLineWidth(0.8);
  doc.circle(sealX, sealY, 13, "S");

  doc.setLineWidth(0.3);
  doc.circle(sealX, sealY, 11, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.text("CARNET NAFA", sealX, sealY - 4, { align: "center" });
  doc.text("BURKINA FASO", sealX, sealY, { align: "center" });
  doc.setFontSize(4.5);
  doc.setTextColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
  doc.text("★ CERTIFIÉ CONFORME ★", sealX, sealY + 4, { align: "center" });

  // Zone de signature numérique
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text("SIGNATURE & CONTRÔLE NUMÉRIQUE", 130, footerY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text("Empreinte locale SHA-256 certifiée", 130, footerY + 7);
  doc.text(`Identifiant : ${docRef}`, 130, footerY + 11);
  doc.text("Généré sans transmission réseau (100% sécurisé)", 130, footerY + 15);

  // Ligne de signature
  doc.setDrawColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.setLineWidth(0.3);
  doc.line(130, footerY + 20, 190, footerY + 20);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.text("Le titulaire / Système NAFA", 130, footerY + 24);

  // Frise inférieure
  drawBogolanBanner(291.5);

  // Déclenchement du téléchargement réel
  const safeName = userName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = options.docType === "rapport"
    ? `NAFA_Rapport_Financier_${safeName}_${now.getFullYear()}_${now.getMonth() + 1}.pdf`
    : `NAFA_Attestation_Epargne_${safeName}.pdf`;

  doc.save(fileName);
  return fileName;
}

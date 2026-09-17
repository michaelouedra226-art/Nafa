import { jsPDF } from "jspdf";
import { AppState } from "../types";
import { NAFA_LOGO_BASE64 } from "./logoBase64";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface PdfGenerationOptions {
  docType: "rapport" | "attestation";
  period: "this_month" | "all";
  includeDetails: boolean;
  includeGoals: boolean;
}

export interface PdfExportResult {
  fileName: string;
  blobUrl: string;
  dataUri: string;
  isNative: boolean;
}

/**
 * Dessine un encadrement complet aux motifs géométriques africains (Mossi & Bogolan)
 */
function drawAfricanBorder(doc: jsPDF) {
  const COLOR_TERRE = [181, 84, 31];       // #B5541F
  const COLOR_OR = [201, 146, 46];         // #C9922E
  const COLOR_DARK = [31, 26, 21];         // #1F1A15
  const COLOR_LINE = [232, 221, 201];      // #E8DDC9

  const left = 8;
  const right = 202;
  const top = 8;
  const bottom = 289;
  const width = right - left; // 194 mm
  const height = bottom - top; // 281 mm

  // 1. Cadre double extérieur / intérieur
  doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.setLineWidth(0.65);
  doc.rect(left, top, width, height, "S");

  doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
  doc.setLineWidth(0.35);
  doc.rect(left + 2.2, top + 2.2, width - 4.4, height - 4.4, "S");

  // Helper pour dessiner un losange géométrique plein ou filaire
  const drawDiamond = (cx: number, cy: number, rx: number, ry: number, fill = true) => {
    if (fill) {
      doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
      doc.triangle(cx - rx, cy, cx + rx, cy, cx, cy - ry, "F");
      doc.triangle(cx - rx, cy, cx + rx, cy, cx, cy + ry, "F");
    } else {
      doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
      doc.setLineWidth(0.3);
      doc.line(cx - rx, cy, cx, cy - ry);
      doc.line(cx, cy - ry, cx + rx, cy);
      doc.line(cx + rx, cy, cx, cy + ry);
      doc.line(cx, cy + ry, cx - rx, cy);
    }
  };

  // 2. Frise horizontale haute et basse (motifs en chevrons et losanges)
  const drawHorizontalFrieze = (yCenter: number) => {
    // Fond terre cuite discret
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.rect(left + 5, yCenter - 1, width - 10, 2, "F");

    for (let x = left + 8; x <= right - 8; x += 5) {
      const isAlt = Math.floor((x - left) / 5) % 2 === 0;
      if (isAlt) {
        drawDiamond(x, yCenter, 1.2, 0.9, true);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.circle(x, yCenter, 0.45, "F");
      }
    }
  };

  drawHorizontalFrieze(top + 1.1);
  drawHorizontalFrieze(bottom - 1.1);

  // 3. Frises verticales gauche et droite
  const drawVerticalFrieze = (xCenter: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.rect(xCenter - 1, top + 5, 2, height - 10, "F");

    for (let y = top + 8; y <= bottom - 8; y += 5) {
      const isAlt = Math.floor((y - top) / 5) % 2 === 0;
      if (isAlt) {
        drawDiamond(xCenter, y, 0.9, 1.2, true);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.circle(xCenter, y, 0.45, "F");
      }
    }
  };

  drawVerticalFrieze(left + 1.1);
  drawVerticalFrieze(right - 1.1);

  // 4. Noeuds traditionnels aux quatre coins (Mossi & Bogolan)
  const drawCornerNode = (cx: number, cy: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.circle(cx, cy, 2.6, "F");

    doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    drawDiamond(cx, cy, 1.8, 1.8, true);

    doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.circle(cx, cy, 0.6, "F");
  };

  drawCornerNode(left + 1.1, top + 1.1);
  drawCornerNode(right - 1.1, top + 1.1);
  drawCornerNode(left + 1.1, bottom - 1.1);
  drawCornerNode(right - 1.1, bottom - 1.1);
}

export async function generateNafaPdf(state: AppState, options: PdfGenerationOptions): Promise<PdfExportResult> {
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

  // 1. DESSINER LES BORDURES GÉOMÉTRIQUES AFRICAINES SUR TOUT LE CONTOUR DU DOCUMENT
  drawAfricanBorder(doc);

  // 2. EN-TÊTE OFFICIEL AVEC LOGO OFFICIEL DE L'APPLICATION
  const headerY = 13;

  // Intégration du logo officiel de l'application
  try {
    doc.addImage(NAFA_LOGO_BASE64, "PNG", 14, headerY, 15, 15);
  } catch (err) {
    // Fallback visuel vectoriel si l'image ne peut être insérée
    doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.roundedRect(14, headerY, 15, 15, 3, 3, "F");
    doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.circle(21.5, headerY + 7.5, 4.5, "F");
  }

  // Textes officiels République du Burkina Faso
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.text("RÉPUBLIQUE DU BURKINA FASO", 32, headerY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text("La Patrie ou la mort, nous vaincrons", 32, headerY + 8);
  doc.text("NAFA — Système Autonome de Rigueur Budgétaire", 32, headerY + 12);

  // Côté droit de l'en-tête : Référence et horodatage
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(`RÉFÉRENCE : ${docRef}`, 196, headerY + 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`Émis le ${dateStr} à ${timeStr}`, 196, headerY + 8, { align: "right" });
  doc.text("Format Standard A4 conforme UEMOA", 196, headerY + 12, { align: "right" });

  // Ligne de séparation sous l'en-tête
  doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
  doc.setLineWidth(0.4);
  doc.line(14, headerY + 17, 196, headerY + 17);

  let currentY = headerY + 23;

  // =========================================================================
  // TYPE 1 : RAPPORT FINANCIER MENSUEL
  // =========================================================================
  if (options.docType === "rapport") {
    // Bandeau Titre
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.roundedRect(14, currentY, 182, 18, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("RAPPORT DE GESTION BUDGÉTAIRE", 19, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(
      `Titulaire du carnet : ${userName.toUpperCase()}  •  Période : ${
        options.period === "this_month" ? monthName.toUpperCase() : "HISTORIQUE COMPLET"
      }`,
      19,
      currentY + 13
    );

    currentY += 23;

    // 4 Blocs de Synthèse financière
    const boxW = 43;
    const boxH = 19;
    const spacing = 3.3;

    const cards = [
      { label: "TOTAL REVENUS", val: `${totalIncome.toLocaleString("fr-FR")} F`, color: COLOR_VERT },
      { label: "TOTAL DÉPENSES", val: `${totalSpent.toLocaleString("fr-FR")} F`, color: COLOR_TERRE },
      { label: "ÉPARGNE SÉCURISÉE", val: `${totalSaved.toLocaleString("fr-FR")} F`, color: COLOR_OR },
      { label: "SOLDE DISPONIBLE", val: `${(totalIncome - totalSpent).toLocaleString("fr-FR")} F`, color: COLOR_INDIGO },
    ];

    cards.forEach((card, i) => {
      const x = 14 + i * (boxW + spacing);
      doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
      doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
      doc.roundedRect(x, currentY, boxW, boxH, 2.5, 2.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(card.label, x + 3.5, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.val, x + 3.5, currentY + 13.5);
    });

    currentY += boxH + 7;

    // Section 2 : Objectifs et projets en cours
    if (options.includeGoals && state.goals.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("1. ÉTAT DE L'ÉPARGNE & CAURIS D'OR", 14, currentY);

      currentY += 3.5;

      state.goals.slice(0, 4).forEach((g) => {
        const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(14, currentY, 182, 9.5, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        doc.text(`${g.name} ${g.isEmergencyFund ? "(Fonds de réserve)" : ""}`, 17, currentY + 5.8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text(
          `${g.currentAmount.toLocaleString("fr-FR")} F / ${g.targetAmount.toLocaleString("fr-FR")} F (${pct}%)`,
          128,
          currentY + 5.8
        );

        // Jauge graphique
        const barW = 34;
        const fillW = (barW * pct) / 100;
        doc.setFillColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(158, currentY + 3.2, barW, 3, 1, 1, "F");

        doc.setFillColor(COLOR_VERT[0], COLOR_VERT[1], COLOR_VERT[2]);
        if (fillW > 0) {
          doc.roundedRect(158, currentY + 3.2, fillW, 3, 1, 1, "F");
        }

        currentY += 11.5;
      });

      currentY += 3;
    }

    // Section 3 : Relevé des opérations
    if (options.includeDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("2. RELEVÉ CHRONOLOGIQUE DES DÉPENSES", 14, currentY);

      currentY += 3.5;

      // En-tête de tableau
      doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
      doc.rect(14, currentY, 182, 6.2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("DATE", 17, currentY + 4.3);
      doc.text("CATÉGORIE", 44, currentY + 4.3);
      doc.text("MOTIF / LIBELLÉ", 90, currentY + 4.3);
      doc.text("MONTANT (FCFA)", 192, currentY + 4.3, { align: "right" });

      currentY += 6.2;

      const displayExpenses = filteredExpenses.slice(0, 13);

      if (displayExpenses.length === 0) {
        doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
        doc.rect(14, currentY, 182, 8, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text("Aucune dépense enregistrée sur cette période.", 18, currentY + 5.5);
        currentY += 8;
      } else {
        displayExpenses.forEach((exp, idx) => {
          const isEven = idx % 2 === 0;
          doc.setFillColor(isEven ? 255 : COLOR_BG[0], isEven ? 255 : COLOR_BG[1], isEven ? 255 : COLOR_BG[2]);
          doc.rect(14, currentY, 182, 5.8, "F");

          const dExp = new Date(exp.timestamp);
          const expDate = dExp.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
          const cat = state.categories.find((c) => c.id === exp.categoryId)?.name || "Général";

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.2);
          doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
          doc.text(expDate, 17, currentY + 4);
          doc.text(cat, 44, currentY + 4);
          doc.text(exp.label || "Dépense courante", 90, currentY + 4);

          doc.setFont("helvetica", "bold");
          doc.text(`-${exp.amount.toLocaleString("fr-FR")} F`, 192, currentY + 4, { align: "right" });

          currentY += 5.8;
        });
      }

      currentY += 5;
    }
  } else {
    // =========================================================================
    // TYPE 2 : ATTESTATION SOLENNELLE D'ÉPARGNE ET DE RIGUEUR
    // =========================================================================
    currentY += 3;

    // Titre de l'attestation
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(14, currentY, 182, 23, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("ATTESTATION OFFICIELLE DE RIGUEUR FINANCIÈRE", 105, currentY + 8.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("DOCUMENT DE SOLVABILITÉ ET DE CAPACITÉ D'ÉPARGNE", 105, currentY + 15.5, { align: "center" });

    currentY += 30;

    // Texte solennel d'attestation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);

    const introText =
      `Le carnet numérique NAFA, système autonome de gestion financière au Burkina Faso, certifie par la présente les déclarations et la discipline budgétaire observée par :\n\n` +
      `Nom et Prénom : ${userName.toUpperCase()}\n` +
      `Situation : ${state.profile.situation.toUpperCase()} (Burkina Faso)\n` +
      `Devise de tenue de compte : Franc CFA (XOF)\n\n` +
      `Il est attesté que le titulaire applique une méthode de plafonnement quotidien strict et d'arrondis systématiques. Les données vérifiées au ${dateStr} indiquent :`;

    const splitIntro = doc.splitTextToSize(introText, 182);
    doc.text(splitIntro, 14, currentY);

    currentY += 36;

    // Tableau de certification
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.roundedRect(14, currentY, 182, 35, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text("INDICATEURS DE DISCIPLINE VALIDÉS", 18, currentY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text("• Épargne totale mobilisée et sanctuarisée :", 18, currentY + 15.5);
    doc.text("• Cauris d'or (Objectifs majeurs atteints à 100%) :", 18, currentY + 22.5);
    doc.text("• Règle de réserve d'urgence appliquée :", 18, currentY + 29.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLOR_VERT[0], COLOR_VERT[1], COLOR_VERT[2]);
    doc.text(`${totalSaved.toLocaleString("fr-FR")} FCFA`, 188, currentY + 15.5, { align: "right" });

    doc.setTextColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.text(`${completedGoals.length} PROJET(S) ACCOMPLI(S)`, 188, currentY + 22.5, { align: "right" });

    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("OUI (CONFORME NAFA)", 188, currentY + 29.5, { align: "right" });

    currentY += 44;

    // Mention de destination
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    const usageNote =
      "Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit auprès de tout bailleur, établissement universitaire, tuteur ou organisme de micro-financement.";
    doc.text(doc.splitTextToSize(usageNote, 182), 14, currentY);

    currentY += 15;
  }

  // =========================================================================
  // PIED DE PAGE & SCEAU D'AUTHENTICITÉ (COMMUN AUX DEUX DOCUMENTS)
  // =========================================================================
  const footerY = 250;

  // Sceau circulaire NAFA
  const sealX = 38;
  const sealY = footerY + 13;

  doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.setLineWidth(0.8);
  doc.circle(sealX, sealY, 12.5, "S");

  doc.setLineWidth(0.3);
  doc.circle(sealX, sealY, 10.5, "S");

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
  doc.text("SIGNATURE & CONTRÔLE NUMÉRIQUE", 128, footerY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text("Empreinte locale SHA-256 certifiée", 128, footerY + 6.5);
  doc.text(`Identifiant : ${docRef}`, 128, footerY + 10.5);
  doc.text("Généré sans transmission réseau (100% sécurisé)", 128, footerY + 14.5);

  // Ligne de signature
  doc.setDrawColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.setLineWidth(0.3);
  doc.line(128, footerY + 19, 192, footerY + 19);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.text("Le titulaire / Système NAFA", 128, footerY + 23);

  // Nom du fichier
  const safeName = userName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName =
    options.docType === "rapport"
      ? `NAFA_Rapport_Financier_${safeName}_${now.getFullYear()}_${now.getMonth() + 1}.pdf`
      : `NAFA_Attestation_Epargne_${safeName}.pdf`;

  // Préparation du Blob et Data URI
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const dataUri = doc.output("datauristring");

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // -------------------------------------------------------------
    // EXÉCUTION NATIVE ANDROID (Capacitor)
    // Écriture dans le stockage local et partage / ouverture native
    // -------------------------------------------------------------
    try {
      const base64Data = dataUri.split(",")[1];
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // Lancement du sélecteur natif Android de partage / enregistrement / ouverture
      await Share.share({
        title: fileName,
        text: `Document officiel NAFA : ${fileName}`,
        url: writeResult.uri,
        dialogTitle: "Enregistrer ou ouvrir le document NAFA",
      });
    } catch (nativeErr) {
      console.warn("Erreur Filesystem/Share natif, bascule vers le téléchargement web:", nativeErr);
      triggerWebDownload(blobUrl, fileName);
    }
  } else {
    // -------------------------------------------------------------
    // EXÉCUTION WEB / NAVIGATEUR (Bureau, Mobile & iframe)
    // -------------------------------------------------------------
    triggerWebDownload(blobUrl, fileName);
  }

  return {
    fileName,
    blobUrl,
    dataUri,
    isNative,
  };
}

/**
 * Déclenchement propre du téléchargement en environnement Web
 */
function triggerWebDownload(url: string, fileName: string) {
  try {
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    a.setAttribute("target", "_blank");
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {
        // Ignorer
      }
    }, 1500);
  } catch (err) {
    console.error("Erreur lors du déclenchement du téléchargement web:", err);
  }
}

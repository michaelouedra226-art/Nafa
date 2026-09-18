import { jsPDF } from "jspdf";
import { AppState, Transaction } from "../types";
import { NAFA_LOGO_BASE64 } from "./logoBase64";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface PdfGenerationOptions {
  docType: "rapport" | "attestation" | "bourse_parents";
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
 * Formatage obligatoire des montants pour le PDF
 * Aucun caractère cassé, espacement millier régulier
 */
export function formatAmountPDF(amount: number): string {
  return (
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " F"
  );
}

// Charte chromatique officielle NAFA pour le PDF
const COLOR_TERRE = [181, 84, 31]; // #B5541F
const COLOR_INDIGO = [30, 42, 68]; // #1E2A44
const COLOR_OR = [201, 146, 46]; // #C9922E
const COLOR_VERT = [74, 107, 63]; // #4A6B3F
const COLOR_DARK = [31, 26, 21]; // #1F1A15
const COLOR_MUTED = [138, 136, 132]; // #8A8884
const COLOR_BG = [250, 246, 239]; // #FAF6EF
const COLOR_LINE = [232, 221, 201]; // #E8DDC9

/**
 * Dessine un encadrement complet aux motifs géométriques africains raffinés (Mossi & Bogolan)
 */
function drawAfricanBorder(doc: jsPDF) {
  const left = 8;
  const right = 202;
  const top = 8;
  const bottom = 289;
  const width = right - left; // 194 mm
  const height = bottom - top; // 281 mm

  // 1. Cadre double extérieur (Terre cuite) / intérieur (Or sahélien)
  doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.setLineWidth(0.65);
  doc.rect(left, top, width, height, "S");

  doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
  doc.setLineWidth(0.35);
  doc.rect(left + 2.2, top + 2.2, width - 4.4, height - 4.4, "S");

  // Helper pour dessiner un losange géométrique
  const drawDiamond = (cx: number, cy: number, rx: number, ry: number) => {
    doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.triangle(cx - rx, cy, cx + rx, cy, cx, cy - ry, "F");
    doc.triangle(cx - rx, cy, cx + rx, cy, cx, cy + ry, "F");
  };

  // 2. Frise horizontale haute et basse (motifs alternés losanges et points)
  const drawHorizontalFrieze = (yCenter: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.rect(left + 5, yCenter - 0.75, width - 10, 1.5, "F");

    for (let x = left + 8; x <= right - 8; x += 5) {
      const isAlt = Math.floor((x - left) / 5) % 2 === 0;
      if (isAlt) {
        drawDiamond(x, yCenter, 1.1, 0.8);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.circle(x, yCenter, 0.4, "F");
      }
    }
  };

  drawHorizontalFrieze(top + 1.1);
  drawHorizontalFrieze(bottom - 1.1);

  // 3. Frises verticales gauche et droite
  const drawVerticalFrieze = (xCenter: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.rect(xCenter - 0.75, top + 5, 1.5, height - 10, "F");

    for (let y = top + 8; y <= bottom - 8; y += 5) {
      const isAlt = Math.floor((y - top) / 5) % 2 === 0;
      if (isAlt) {
        drawDiamond(xCenter, y, 0.8, 1.1);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.circle(xCenter, y, 0.4, "F");
      }
    }
  };

  drawVerticalFrieze(left + 1.1);
  drawVerticalFrieze(right - 1.1);

  // 4. Nœuds raffinés aux quatre coins (Cercle + losange + point)
  const drawCornerNode = (cx: number, cy: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.circle(cx, cy, 2.5, "F");

    doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    drawDiamond(cx, cy, 1.6, 1.6);

    doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.circle(cx, cy, 0.55, "F");
  };

  drawCornerNode(left + 1.1, top + 1.1);
  drawCornerNode(right - 1.1, top + 1.1);
  drawCornerNode(left + 1.1, bottom - 1.1);
  drawCornerNode(right - 1.1, bottom - 1.1);
}

/**
 * Dessine une frise décorative sous un titre
 */
function drawTitleSubFrieze(doc: jsPDF, x: number, y: number, w: number) {
  doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
  doc.setLineWidth(0.4);
  doc.line(x, y, x + w, y);

  // 3 petits losanges centraux
  const midX = x + w / 2;
  const drawMiniDiamond = (cx: number) => {
    doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.triangle(cx - 1.2, y, cx + 1.2, y, cx, y - 0.9, "F");
    doc.triangle(cx - 1.2, y, cx + 1.2, y, cx, y + 0.9, "F");
  };
  drawMiniDiamond(midX - 5);
  drawMiniDiamond(midX);
  drawMiniDiamond(midX + 5);
}

/**
 * Dessine le sceau officiel et la zone de signature
 */
function drawSignatureBlock(doc: jsPDF, state: AppState, yPos: number, docRef: string, userName: string) {
  const sealX = 36;
  const sealY = yPos + 12;

  // Sceau circulaire NAFA
  doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.setLineWidth(0.7);
  doc.circle(sealX, sealY, 12, "S");

  doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
  doc.setLineWidth(0.3);
  doc.circle(sealX, sealY, 10, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
  doc.text("CARNET NAFA", sealX, sealY - 4, { align: "center" });
  doc.text("BURKINA FASO", sealX, sealY, { align: "center" });
  doc.setFontSize(4.5);
  doc.setTextColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
  doc.text("★ CERTIFIÉ CONFORME ★", sealX, sealY + 4, { align: "center" });

  // Zone de signature numérique (Droite)
  const sigX = 120;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text("SIGNATURE & CONTRÔLE NUMÉRIQUE", sigX, yPos + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text("Signature électronique — Document généré par NAFA", sigX, yPos + 6);
  doc.text(`Identifiant : ${docRef}`, sigX, yPos + 10);

  // Ligne de signature
  doc.setDrawColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.setLineWidth(0.3);
  doc.line(sigX, yPos + 19, 194, yPos + 19);

  // Signature manuscrite si présente dans le profil
  if (state.profile.signatureBase64) {
    try {
      doc.addImage(state.profile.signatureBase64, "PNG", sigX + 10, yPos + 7, 42, 11);
    } catch {
      // Ignorer si échec image
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text(`Signé par : ${userName.toUpperCase()}`, sigX + 2, yPos + 16);
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  const dateSigStr = state.profile.signatureDate
    ? `Signé le ${new Date(state.profile.signatureDate).toLocaleDateString("fr-FR")}`
    : `Signé le ${new Date().toLocaleDateString("fr-FR")}`;
  doc.text(dateSigStr, sigX, yPos + 23);
}

/**
 * Dessine l'en-tête officiel du document
 */
function drawPageHeader(
  doc: jsPDF,
  docRef: string,
  dateStr: string,
  timeStr: string,
  pageNo: number,
  isFirstPage = true
) {
  const headerY = 13;

  if (isFirstPage) {
    // Logo officiel
    try {
      doc.addImage(NAFA_LOGO_BASE64, "PNG", 14, headerY, 15, 15);
    } catch {
      doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.roundedRect(14, headerY, 15, 15, 3, 3, "F");
      doc.setFillColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
      doc.circle(21.5, headerY + 7.5, 4.5, "F");
    }

    // Textes officiels
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("RÉPUBLIQUE DU BURKINA FASO", 32, headerY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text("La Patrie ou la mort, nous vaincrons", 32, headerY + 8);
    doc.text("NAFA — Système Autonome de Rigueur Budgétaire", 32, headerY + 12);

    // Côté droit
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`RÉFÉRENCE : ${docRef}`, 196, headerY + 4, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(`Émis le ${dateStr} à ${timeStr}`, 196, headerY + 8, { align: "right" });
    doc.text("Format Standard A4 conforme UEMOA", 196, headerY + 12, { align: "right" });

    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.setLineWidth(0.4);
    doc.line(14, headerY + 17, 196, headerY + 17);
  } else {
    // En-tête compact sur les pages suivantes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("NAFA — RELEVÉ CHRONOLOGIQUE DES FLUX", 14, headerY + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(`Réf : ${docRef}  •  Page ${pageNo}`, 196, headerY + 2, { align: "right" });

    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.setLineWidth(0.3);
    doc.line(14, headerY + 5, 196, headerY + 5);
  }
}

/**
 * Dessine le pied de page normalisé sur chaque page
 */
function drawPageFooter(doc: jsPDF, pageNo: number, totalPages: number, docRef: string, isTruncated = false) {
  const footerY = 281;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`Réf : ${docRef}`, 14, footerY);

  doc.setFont("helvetica", "bold");
  doc.text("Généré par NAFA — Chaque franc compte", 105, footerY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.text(`Page ${pageNo} / ${totalPages}`, 196, footerY, { align: "right" });

  if (isTruncated && pageNo === totalPages) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.text("Historique complet disponible dans l'application NAFA", 105, footerY - 4, { align: "center" });
  }
}

/**
 * Générateur principal de documents PDF A4
 */
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
  const docRef = `NAFA-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  // Extraction unifiée des transactions
  let rawTransactions = state.transactions || [];
  if (rawTransactions.length === 0) {
    // Reconstitution si aucune transaction unifiée stockée
    const reconstituted: Transaction[] = [];
    state.incomes.forEach((inc) => {
      reconstituted.push({
        id: `tx_inc_${inc.id}`,
        type: "income",
        amount: inc.amount,
        direction: "in",
        label: inc.label || "Revenu",
        timestamp: inc.timestamp,
      });
    });
    state.expenses.forEach((exp) => {
      reconstituted.push({
        id: `tx_exp_${exp.id}`,
        type: "expense",
        amount: exp.amount,
        direction: "out",
        categoryId: exp.categoryId,
        label: exp.label,
        timestamp: exp.timestamp,
      });
      if (exp.roundUpSaved && exp.roundUpSaved > 0) {
        reconstituted.push({
          id: `tx_rup_${exp.id}`,
          type: "round_up",
          amount: exp.roundUpSaved,
          direction: "out",
          goalId: exp.targetGoalId,
          label: "Arrondi d'épargne",
          timestamp: exp.timestamp,
        });
      }
    });
    rawTransactions = reconstituted;
  }

  // Filtrage selon la période
  const transactions =
    options.period === "this_month"
      ? rawTransactions.filter((t) => {
          const d = new Date(t.timestamp);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
      : rawTransactions;

  // Tri chronologique antéchronologique (plus récent en premier)
  const sortedTx = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  // Calcul des métriques de synthèse
  const totalIncome = sortedTx
    .filter((t) => t.type === "income" || (t.type === "balance_adjustment" && t.direction === "in"))
    .reduce((s, t) => s + t.amount, 0);

  const totalSpent = sortedTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const totalSaved = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  const currentSolde =
    state.profile.pocketBalance !== undefined ? state.profile.pocketBalance : totalIncome - totalSpent;
  const completedGoals = state.goals.filter((g) => g.completed);

  // Groupement des transactions par jour
  const dayGroups: { dateKey: string; dateTitle: string; items: Transaction[]; dayTotal: number }[] = [];
  sortedTx.forEach((tx) => {
    const d = new Date(tx.timestamp);
    const dateKey = d.toISOString().slice(0, 10);
    const dateTitle = d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    let group = dayGroups.find((g) => g.dateKey === dateKey);
    if (!group) {
      group = { dateKey, dateTitle, items: [], dayTotal: 0 };
      dayGroups.push(group);
    }
    group.items.push(tx);
    if (tx.type === "expense") {
      group.dayTotal += tx.amount;
    }
  });

  // Calcul du nombre de pages selon la stratégie intelligente
  const txCount = sortedTx.length;
  let isTruncated = false;
  let detailPagesCount = 0;

  if (options.docType === "attestation" || options.docType === "bourse_parents") {
    // Tient strictement sur 1 page A4 impeccable
    detailPagesCount = 0;
  } else if (!options.includeDetails || txCount === 0) {
    detailPagesCount = 0;
  } else if (txCount <= 8) {
    detailPagesCount = 0; // Tient sur la page 1 (mode compact)
  } else if (txCount <= 25) {
    detailPagesCount = 1; // 2 pages total
  } else if (txCount <= 60) {
    detailPagesCount = 2; // 3 pages total
  } else {
    // > 60 : Top 40 sur 2 pages supplémentaires + mention tronquée
    detailPagesCount = 2;
    isTruncated = true;
  }

  const totalPages = 1 + detailPagesCount;

  // =========================================================================
  // PAGE 1 : SYNTHÈSE & DÉCISION
  // =========================================================================
  drawAfricanBorder(doc);
  drawPageHeader(doc, docRef, dateStr, timeStr, 1, true);

  let currentY = 36;

  if (options.docType === "rapport") {
    // Titre principal
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.roundedRect(14, currentY, 182, 17, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("RAPPORT DE GESTION BUDGÉTAIRE", 19, currentY + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(
      `Titulaire du carnet : ${userName.toUpperCase()}  •  Période : ${
        options.period === "this_month" ? monthName.toUpperCase() : "HISTORIQUE GLOBAL"
      }`,
      19,
      currentY + 12.5
    );

    drawTitleSubFrieze(doc, 19, currentY + 14.5, 172);

    currentY += 22;

    // 4 Blocs de synthèse financière (montants avec formatAmountPDF)
    const boxW = 43;
    const boxH = 18;
    const spacing = 3.3;

    const cards = [
      { label: "TOTAL REVENUS", val: formatAmountPDF(totalIncome), color: COLOR_VERT },
      { label: "TOTAL DÉPENSES", val: formatAmountPDF(totalSpent), color: COLOR_TERRE },
      { label: "ÉPARGNE SÉCURISÉE", val: formatAmountPDF(totalSaved), color: COLOR_OR },
      { label: "SOLDE DISPONIBLE", val: formatAmountPDF(currentSolde), color: COLOR_INDIGO },
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
      doc.setFontSize(9.5);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.val, x + 3.5, currentY + 13);
    });

    currentY += boxH + 6;

    // Section Objectifs et projets en cours
    if (options.includeGoals && state.goals.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("1. ÉTAT DE L'ÉPARGNE & OBJECTIFS (CAURIS D'OR)", 14, currentY);

      currentY += 3.5;

      state.goals.slice(0, 4).forEach((g) => {
        const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(14, currentY, 182, 8.5, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        doc.text(`${g.name} ${g.isEmergencyFund ? "(Fonds de réserve)" : ""}`, 17, currentY + 5.2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text(
          `${formatAmountPDF(g.currentAmount)} / ${formatAmountPDF(g.targetAmount)} (${pct}%)`,
          126,
          currentY + 5.2
        );

        // Jauge
        const barW = 34;
        const fillW = (barW * pct) / 100;
        doc.setFillColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(158, currentY + 2.8, barW, 2.8, 1, 1, "F");

        doc.setFillColor(COLOR_VERT[0], COLOR_VERT[1], COLOR_VERT[2]);
        if (fillW > 0) {
          doc.roundedRect(158, currentY + 2.8, fillW, 2.8, 1, 1, "F");
        }

        currentY += 10;
      });

      currentY += 2;
    }

    // Répartition par catégorie (si dépenses existantes)
    if (totalSpent > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("2. RÉPARTITION DES DÉPENSES PAR CATÉGORIE", 14, currentY);

      currentY += 3.5;

      const catTotals: { [key: string]: number } = {};
      sortedTx
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const catId = t.categoryId || "autre";
          catTotals[catId] = (catTotals[catId] || 0) + t.amount;
        });

      const catList = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

      const catColW = 43;
      catList.forEach(([catId, amount], idx) => {
        const x = 14 + idx * (catColW + spacing);
        const catObj = state.categories.find((c) => c.id === catId);
        const catName = catObj ? catObj.name : "Divers";
        const catPct = Math.round((amount / totalSpent) * 100);

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
        doc.roundedRect(x, currentY, catColW, 11, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        doc.text(catName, x + 3, currentY + 4.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text(`${formatAmountPDF(amount)} (${catPct}%)`, x + 3, currentY + 8.5);
      });

      currentY += 16;
    }

    // Gestion de l'historique sur la Page 1 (Si 0 ou petit volume <= 8)
    if (txCount === 0) {
      // État vide élégant selon le cahier des charges
      doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
      doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
      doc.roundedRect(14, currentY, 182, 32, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
      doc.text("AUCUNE OPÉRATION ENREGISTRÉE SUR CETTE PÉRIODE", 105, currentY + 11, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text("Commence à noter tes dépenses et tes versements dans NAFA.", 105, currentY + 19, { align: "center" });
      doc.text("Ce rapport se remplira automatiquement.", 105, currentY + 25, { align: "center" });

      currentY += 38;
    } else if (txCount <= 8) {
      // Affichage compact sur la page 1
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text("3. RELEVÉ DES OPÉRATIONS (SYNTHÈSE COMPACTE)", 14, currentY);

      currentY += 3.5;

      // En-tête tableau compact
      doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
      doc.rect(14, currentY, 182, 5.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("DATE", 17, currentY + 3.8);
      doc.text("TYPE / CATÉGORIE", 46, currentY + 3.8);
      doc.text("LIBELLÉ / AFFECTATION", 95, currentY + 3.8);
      doc.text("MONTANT", 192, currentY + 3.8, { align: "right" });

      currentY += 5.5;

      sortedTx.forEach((tx, idx) => {
        const isEven = idx % 2 === 0;
        doc.setFillColor(isEven ? 255 : COLOR_BG[0], isEven ? 255 : COLOR_BG[1], isEven ? 255 : COLOR_BG[2]);
        doc.rect(14, currentY, 182, 5.2, "F");

        const d = new Date(tx.timestamp);
        const dateFormatted = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        doc.text(dateFormatted, 17, currentY + 3.6);

        let typeLabel = "Dépense";
        let amountColor = COLOR_TERRE;
        let sign = "-";

        if (tx.type === "income") {
          typeLabel = "Revenu";
          amountColor = COLOR_VERT;
          sign = "+";
        } else if (tx.type === "goal_deposit") {
          typeLabel = "Versement Projet";
          amountColor = COLOR_OR;
          sign = "→";
        } else if (tx.type === "round_up") {
          typeLabel = "Arrondi Épargne";
          amountColor = COLOR_OR;
          sign = "+";
        } else if (tx.type === "balance_adjustment") {
          typeLabel = "Ajustement Solde";
          amountColor = COLOR_INDIGO;
          sign = tx.direction === "in" ? "+" : "-";
        }

        doc.text(typeLabel, 46, currentY + 3.6);
        doc.text(tx.label || "Opération courante", 95, currentY + 3.6);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(amountColor[0], amountColor[1], amountColor[2]);
        doc.text(`${sign}${formatAmountPDF(tx.amount)}`, 192, currentY + 3.6, { align: "right" });

        currentY += 5.2;
      });

      currentY += 4;
    }

    // Si document d'une seule page, le sceau et signature sont en bas de page 1
    if (totalPages === 1) {
      drawSignatureBlock(doc, state, 246, docRef, userName);
    }
  } else if (options.docType === "bourse_parents") {
    // =========================================================================
    // TYPE 3 : SYNTHÈSE PARENTS / BOURSE (Strictement 1 Page A4)
    // =========================================================================
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(14, currentY, 182, 20, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("BILAN DE GESTION DU PÉCULE — PARENTS & BOURSE", 105, currentY + 7, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("JUSTIFICATIF OFFICIEL DE RIGUEUR ET DE GESTION MENSUELLE", 105, currentY + 13, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(
      `Titulaire : ${userName.toUpperCase()}   •   Période examinée : ${monthName.toUpperCase()}`,
      105,
      currentY + 17.5,
      { align: "center" }
    );

    drawTitleSubFrieze(doc, 25, currentY + 19, 160);

    currentY += 26;

    // 4 Blocs principaux consolidés
    const boxW = 43;
    const boxH = 19;
    const spacing = 3.3;

    const cards = [
      { label: "RESSOURCES ALLOUÉES", val: formatAmountPDF(totalIncome), color: COLOR_VERT },
      { label: "DÉPENSES DU MOIS", val: formatAmountPDF(totalSpent), color: COLOR_TERRE },
      { label: "ÉPARGNE PRÉSERVÉE", val: formatAmountPDF(totalSaved), color: COLOR_OR },
      { label: "SOLDE EN POCHE ACTUEL", val: formatAmountPDF(currentSolde), color: COLOR_INDIGO },
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
      doc.setFontSize(9.5);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.val, x + 3.5, currentY + 13.5);
    });

    currentY += boxH + 8;

    // Répartition des dépenses par grand pôle de vie
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text("RÉPARTITION DES DÉPENSES PAR PÔLE DE VIE", 14, currentY);

    currentY += 4;

    const catTotals: { [id: string]: number } = {};
    sortedTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const catId = t.categoryId || "cat_autres";
        catTotals[catId] = (catTotals[catId] || 0) + t.amount;
      });

    state.categories.slice(0, 5).forEach((cat) => {
      const spent = catTotals[cat.id] || 0;
      const pct = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
      doc.roundedRect(14, currentY, 182, 8, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text(cat.name, 19, currentY + 5);

      // Barre de progression
      const barX = 75;
      const barW = 60;
      doc.setFillColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
      doc.roundedRect(barX, currentY + 2.5, barW, 3, 1.5, 1.5, "F");

      if (pct > 0) {
        doc.setFillColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
        doc.roundedRect(barX, currentY + 2.5, (barW * Math.min(100, pct)) / 100, 3, 1.5, 1.5, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(`${pct}%`, 140, currentY + 5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
      doc.text(formatAmountPDF(spent), 192, currentY + 5, { align: "right" });

      currentY += 10;
    });

    currentY += 4;

    // Déclaration sur l'honneur signée
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.roundedRect(14, currentY, 182, 22, 2.5, 2.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("ENGAGEMENT SUR L'HONNEUR DU BÉNÉFICIAIRE :", 19, currentY + 6);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    const honorText = `« Je soussigné(e), ${userName}, certifie sur l'honneur l'exactitude des comptes présentés ci-dessus. Ce récapitulatif démontre la bonne utilisation des fonds mis à disposition pour le mois de ${monthName}, l'absence de gaspillage et la préservation d'une réserve de précaution. »`;
    doc.text(doc.splitTextToSize(honorText, 172), 19, currentY + 11.5);

    drawSignatureBlock(doc, state, 246, docRef, userName);
  } else {
    // =========================================================================
    // TYPE 2 : ATTESTATION SOLENNELLE D'ÉPARGNE ET DE RIGUEUR
    // =========================================================================
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(14, currentY, 182, 22, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("ATTESTATION OFFICIELLE DE RIGUEUR FINANCIÈRE", 105, currentY + 8, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text("DOCUMENT DE SOLVABILITÉ ET DE CAPACITÉ D'ÉPARGNE", 105, currentY + 15, { align: "center" });

    drawTitleSubFrieze(doc, 25, currentY + 18, 160);

    currentY += 28;

    // Texte solennel d'attestation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);

    const introText =
      `Le carnet numérique NAFA, système autonome de gestion financière au Burkina Faso, certifie par la présente les déclarations et la discipline budgétaire observée par :\n\n` +
      `Nom et Prénom : ${userName.toUpperCase()}\n` +
      `Situation déclarée : ${state.profile.situation.toUpperCase()} (Burkina Faso)\n` +
      `Devise de référence : Franc CFA (XOF)\n\n` +
      `Il est formellement attesté que le titulaire applique une méthode de plafonnement quotidien strict et d'arrondis systématiques. Les données de clôture au ${dateStr} indiquent :`;

    const splitIntro = doc.splitTextToSize(introText, 182);
    doc.text(splitIntro, 14, currentY);

    currentY += 35;

    // Tableau de certification
    doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.roundedRect(14, currentY, 182, 42, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text("INDICATEURS DE DISCIPLINE ET DE SOLVABILITÉ VALIDÉS", 18, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text("• Épargne totale mobilisée et sanctuarisée :", 18, currentY + 15);
    doc.text("• Cauris d'or (Objectifs majeurs atteints à 100%) :", 18, currentY + 22);
    doc.text("• Règle de réserve d'urgence appliquée :", 18, currentY + 29);
    doc.text("• Solde disponible sous contrôle actif :", 18, currentY + 36);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLOR_VERT[0], COLOR_VERT[1], COLOR_VERT[2]);
    doc.text(formatAmountPDF(totalSaved), 188, currentY + 15, { align: "right" });

    doc.setTextColor(COLOR_OR[0], COLOR_OR[1], COLOR_OR[2]);
    doc.text(`${completedGoals.length} PROJET(S) ACCOMPLI(S)`, 188, currentY + 22, { align: "right" });

    doc.setTextColor(COLOR_INDIGO[0], COLOR_INDIGO[1], COLOR_INDIGO[2]);
    doc.text("OUI (CONFORME NAFA)", 188, currentY + 29, { align: "right" });

    doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
    doc.text(formatAmountPDF(currentSolde), 188, currentY + 36, { align: "right" });

    currentY += 50;

    // Mention de destination
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    const usageNote =
      "Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit auprès de tout bailleur, établissement universitaire, tuteur ou organisme de micro-financement.";
    doc.text(doc.splitTextToSize(usageNote, 182), 14, currentY);

    drawSignatureBlock(doc, state, 246, docRef, userName);
  }

  // Pied de page Page 1
  drawPageFooter(doc, 1, totalPages, docRef, isTruncated);

  // =========================================================================
  // PAGES SUIVANTES : RELEVÉ CHRONOLOGIQUE GROUPÉ PAR JOUR
  // =========================================================================
  if (detailPagesCount > 0) {
    let currentPageNo = 2;
    let maxTxPerDetailPage = 22;
    let transactionsToPrint = sortedTx;

    if (isTruncated) {
      transactionsToPrint = sortedTx.slice(0, 44);
    }

    // Regroupement par jour pour l'affichage paginé
    let renderedTxCount = 0;

    doc.addPage();
    drawAfricanBorder(doc);
    drawPageHeader(doc, docRef, dateStr, timeStr, currentPageNo, false);

    let detailY = 25;

    dayGroups.forEach((group) => {
      // Filtrer les transactions du groupe qui sont dans la sélection à imprimer
      const groupTxs = group.items.filter((t) => transactionsToPrint.includes(t));
      if (groupTxs.length === 0) return;

      // Vérifier si assez d'espace pour le titre du jour + au moins 1 ligne
      if (detailY > 250) {
        drawPageFooter(doc, currentPageNo, totalPages, docRef, isTruncated);
        currentPageNo++;
        doc.addPage();
        drawAfricanBorder(doc);
        drawPageHeader(doc, docRef, dateStr, timeStr, currentPageNo, false);
        detailY = 25;
      }

      // Bandeau de groupe de jour
      doc.setFillColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
      doc.rect(14, detailY, 182, 5.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text(group.dateTitle.toUpperCase(), 17, detailY + 3.8);

      if (group.dayTotal > 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(COLOR_TERRE[0], COLOR_TERRE[1], COLOR_TERRE[2]);
        doc.text(`TOTAL JOUR : ${formatAmountPDF(group.dayTotal)}`, 192, detailY + 3.8, { align: "right" });
      }

      detailY += 5.5;

      // Lignes d'opérations du jour
      groupTxs.forEach((tx, idx) => {
        if (detailY > 260) {
          drawPageFooter(doc, currentPageNo, totalPages, docRef, isTruncated);
          currentPageNo++;
          doc.addPage();
          drawAfricanBorder(doc);
          drawPageHeader(doc, docRef, dateStr, timeStr, currentPageNo, false);
          detailY = 25;
        }

        const isEven = idx % 2 === 0;
        doc.setFillColor(isEven ? 255 : COLOR_BG[0], isEven ? 255 : COLOR_BG[1], isEven ? 255 : COLOR_BG[2]);
        doc.rect(14, detailY, 182, 5.2, "F");

        const d = new Date(tx.timestamp);
        const timeFormatted = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text(timeFormatted, 17, detailY + 3.6);

        let typeLabel = "Dépense";
        let amountColor = COLOR_TERRE;
        let sign = "-";

        if (tx.type === "income") {
          typeLabel = "Revenu";
          amountColor = COLOR_VERT;
          sign = "+";
        } else if (tx.type === "goal_deposit") {
          const targetGoal = state.goals.find((g) => g.id === tx.goalId);
          typeLabel = targetGoal ? `Projet : ${targetGoal.name}` : "Versement Projet";
          amountColor = COLOR_OR;
          sign = "→";
        } else if (tx.type === "round_up") {
          typeLabel = "Arrondi Épargne";
          amountColor = COLOR_OR;
          sign = "+";
        } else if (tx.type === "balance_adjustment") {
          typeLabel = "Ajustement";
          amountColor = COLOR_INDIGO;
          sign = tx.direction === "in" ? "+" : "-";
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(amountColor[0], amountColor[1], amountColor[2]);
        doc.text(typeLabel, 34, detailY + 3.6);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        const cleanLabel = tx.label || "Opération courante";
        doc.text(cleanLabel.length > 40 ? cleanLabel.slice(0, 38) + "..." : cleanLabel, 86, detailY + 3.6);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(amountColor[0], amountColor[1], amountColor[2]);
        doc.text(`${sign}${formatAmountPDF(tx.amount)}`, 192, detailY + 3.6, { align: "right" });

        detailY += 5.2;
        renderedTxCount++;
      });

      detailY += 3;
    });

    // Signature sur la dernière page
    if (detailY <= 240) {
      drawSignatureBlock(doc, state, 246, docRef, userName);
    }

    drawPageFooter(doc, currentPageNo, totalPages, docRef, isTruncated);
  }

  // Finalisation du fichier
  const safeName = userName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName =
    options.docType === "rapport"
      ? `NAFA_Rapport_Financier_${safeName}_${now.getFullYear()}_${now.getMonth() + 1}.pdf`
      : `NAFA_Attestation_Epargne_${safeName}.pdf`;

  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const dataUri = doc.output("datauristring");

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const base64Data = dataUri.split(",")[1];
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      await Share.share({
        title: "Document officiel NAFA",
        text: `Voici mon document financier officiel généré par le carnet NAFA (${fileName}).`,
        url: writeResult.uri,
        dialogTitle: "Partager le document NAFA",
      });
    } catch (nativeErr) {
      console.warn("Partage natif non disponible, fallback navigateur:", nativeErr);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.click();
    }
  } else {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.click();
  }

  return {
    fileName,
    blobUrl,
    dataUri,
    isNative,
  };
}

/**
 * Charte chromatique et constantes stylistiques NAFA
 * Palette inspirée du terroir et de l'artisanat du Burkina Faso
 */

export const THEME_COLORS = {
  // Teintes primaires et identitaires
  terreCuite: "#B5541F", // Action principale, dépenses, énergie
  orSahelien: "#C9922E", // Épargne, cauris, arrondis, accomplissement
  feuilleBaobab: "#4A6B3F", // Revenus, croissance, validé, succès
  indigoBogolan: "#1E2A44", // Fonds de réserve, structure, sérénité
  roseKola: "#A8453F", // Alertes, suppression, imprévus

  // Neutres chauds
  fondChaud: "#FAF6EF", // Fond principal
  fondBlancCasse: "#F5EFEB", // Fond secondaire
  bordure: "#E8DDC9", // Lignes et séparateurs
  blanc: "#FFFFFF",

  // Typographie & contraste
  texteSombre: "#1F1A15", // Titres, montants forts
  texteIntermediaire: "#55534F", // Corps de texte
  texteAttenue: "#8A8884", // Sous-titres, dates, labels discrets
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS;

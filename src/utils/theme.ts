/**
 * Charte graphique et couleurs centralisées NAFA
 * Inspirée des teintes traditionnelles sahéliennes et burkinabè
 */

export const NAFA_THEME = {
  colors: {
    // Teintes identitaires principales
    terreCuite: "#B5541F",       // Action primaire, dépenses, terre du Faso
    orSahelien: "#C9922E",       // Épargne, cauris d'or, succès
    feuilleBaobab: "#4A6B3F",    // Revenus, croissance, équilibre
    indigoBogolan: "#1E2A44",    // Rigueur, solennité, titres
    roseKola: "#A8453F",         // Alertes, imprévus, avertissements
    
    // Neutres chaleureux
    fondChaud: "#FAF6EF",        // Arrière-plan doux papier sahélien
    fondCarte: "#FFFFFF",        // Cartes et surfaces
    bordure: "#E8DDC9",          // Lignes de séparation et cadres doux
    texteSombre: "#1F1A15",      // Texte principal à fort contraste
    texteMuted: "#8A8884",       // Texte secondaire et métadonnées
    texteLeger: "#55534F",       // Texte tertiaire
  },
  pdfColors: {
    terre: [181, 84, 31] as [number, number, number],
    or: [201, 146, 46] as [number, number, number],
    vert: [74, 107, 63] as [number, number, number],
    indigo: [30, 42, 68] as [number, number, number],
    rose: [168, 69, 63] as [number, number, number],
    dark: [31, 26, 21] as [number, number, number],
    muted: [138, 136, 132] as [number, number, number],
    bg: [250, 246, 239] as [number, number, number],
    line: [232, 221, 201] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  },
} as const;

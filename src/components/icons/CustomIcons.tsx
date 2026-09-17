import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Cauris : coquillage ovale d'Afrique de l'Ouest fendu au centre
 */
export const CaurisIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 24,
  color = "currentColor",
  filled = false,
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${className}`}
      {...props}
    >
      {/* Coque ovale externe */}
      <ellipse cx="12" cy="12" rx="7.5" ry="9.5" />
      {/* Fente centrale avec crans dentelés traditionnels */}
      <path
        d="M12 5.5 C10.5 7.5, 10.2 10, 10.5 12 C10.8 14, 11 16.5, 12 18.5"
        strokeWidth={1.5}
      />
      <path
        d="M12 5.5 C13.5 7.5, 13.8 10, 13.5 12 C13.2 14, 13 16.5, 12 18.5"
        strokeWidth={1.5}
      />
      {/* Crans horizontaux du cauris */}
      <line x1="10.8" y1="9" x2="13.2" y2="9" strokeWidth={1.2} />
      <line x1="10.5" y1="12" x2="13.5" y2="12" strokeWidth={1.2} />
      <line x1="10.8" y1="15" x2="13.2" y2="15" strokeWidth={1.2} />
    </svg>
  );
};

/**
 * Soleil-Cauris : Navigation Aujourd'hui
 */
export const SoleilCaurisIcon: React.FC<IconProps & { active?: boolean }> = ({
  size = 24,
  color = "currentColor",
  active = false,
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-all duration-300 ${active ? "scale-105" : ""} ${className}`}
      {...props}
    >
      {/* Rayons solaires fins */}
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="4.9" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7" x2="19.1" y2="4.9" />
      {/* Centre cauris */}
      <ellipse cx="12" cy="12" rx="4.5" ry="6" fill={active ? "#C9922E22" : "none"} />
      <path d="M12 7.5 C11.2 9, 11.2 11, 12 12.5 C12.8 14, 12.8 15, 12 16.5" strokeWidth={1.3} />
    </svg>
  );
};

/**
 * Calebasse : Navigation Objectifs
 */
export const CalebasseIcon: React.FC<IconProps & { active?: boolean; filledPercent?: number }> = ({
  size = 24,
  color = "currentColor",
  active = false,
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Silhouette calebasse à double bulbe */}
      <path d="M10 3 H14 V5 C14 7, 16 8, 16 10 C16 11.5, 14.5 12.5, 13.5 13 C16.5 14, 18.5 17, 18.5 19.5 C18.5 21, 15.5 22, 12 22 C8.5 22, 5.5 21, 5.5 19.5 C5.5 17, 7.5 14, 10.5 13 C9.5 12.5, 8 11.5, 8 10 C8 8, 10 7, 10 5 Z" />
      {active && (
        <path
          d="M7 19.5 C7 17.5, 9 15.5, 12 15.5 C15 15.5, 17 17.5, 17 19.5"
          fill="#C9922E"
          stroke="none"
          opacity={0.7}
        />
      )}
      <line x1="10" y1="3" x2="14" y2="3" strokeWidth={2} />
    </svg>
  );
};

/**
 * Grenier à mil : Navigation Budget
 */
export const GrenierIcon: React.FC<IconProps & { active?: boolean }> = ({
  size = 24,
  color = "currentColor",
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Toit en chaume conique */}
      <path d="M12 2.5 L3.5 9 L20.5 9 Z" />
      {/* Corps cylindrique en terre séchée */}
      <path d="M6 9 V17 C6 18.5, 8.5 19.5, 12 19.5 C15.5 19.5, 18 18.5, 18 17 V9" />
      {/* Pilotis en bois */}
      <line x1="7" y1="19.5" x2="6" y2="22.5" />
      <line x1="12" y1="19.5" x2="12" y2="22.5" />
      <line x1="17" y1="19.5" x2="18" y2="22.5" />
      {/* Trappe d'aération */}
      <rect x="10.5" y="12" width="3" height="3.5" rx="0.5" strokeWidth={1.2} />
    </svg>
  );
};

/**
 * Carnet relié : Navigation Carnet
 */
export const CarnetIcon: React.FC<IconProps & { active?: boolean }> = ({
  size = 24,
  color = "currentColor",
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Couverture carnet */}
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      {/* Reliure latérale */}
      <line x1="8.5" y1="3.5" x2="8.5" y2="20.5" strokeDasharray="1.5 1.5" />
      {/* Lignes de compte */}
      <line x1="11.5" y1="8" x2="16.5" y2="8" strokeWidth={1.2} />
      <line x1="11.5" y1="12" x2="16.5" y2="12" strokeWidth={1.2} />
      <line x1="11.5" y1="16" x2="15" y2="16" strokeWidth={1.2} />
    </svg>
  );
};

/**
 * Baobab stylisé : Progression d'objectif
 */
export const BaobabIcon: React.FC<IconProps & { stage?: 1 | 2 | 3 | 4 }> = ({
  size = 24,
  color = "currentColor",
  stage = 4,
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {stage === 1 && (
        <>
          {/* Graine & jeune pousse */}
          <ellipse cx="12" cy="19" rx="3" ry="2" fill={color} fillOpacity={0.2} />
          <path d="M12 18 V12 C12 10, 14 9, 15 10" />
          <circle cx="15" cy="10" r="1.5" fill={color} />
        </>
      )}
      {stage === 2 && (
        <>
          {/* Jeune baobab */}
          <path d="M10 20 C10.5 17, 11 14, 11 12 C10 10, 8 9, 7 8" />
          <path d="M14 20 C13.5 17, 13 14, 13 12 C14 10, 16 9, 17 8" />
          <path d="M12 12 V7" />
          <circle cx="7" cy="8" r="1.5" fill={color} />
          <circle cx="17" cy="8" r="1.5" fill={color} />
          <circle cx="12" cy="6" r="1.8" fill={color} />
        </>
      )}
      {stage >= 3 && (
        <>
          {/* Tronc massif emblématique du baobab */}
          <path d="M8 21 C8.5 16, 9.5 13, 10 10 C8.5 9, 6.5 8, 5 6" />
          <path d="M16 21 C15.5 16, 14.5 13, 14 10 C15.5 9, 17.5 8, 19 6" />
          <path d="M12 10 V5" />
          <path d="M10 8 L7 4" />
          <path d="M14 8 L17 4" />
          {/* Canopée dense avec fruits si stage 4 */}
          <ellipse cx="12" cy="5" rx="7" ry="3.5" fill={color} fillOpacity={0.15} />
          {stage === 4 && (
            <>
              <circle cx="9" cy="6" r="1.2" fill="#C9922E" />
              <circle cx="15" cy="6" r="1.2" fill="#C9922E" />
              <circle cx="12" cy="4" r="1.2" fill="#C9922E" />
            </>
          )}
        </>
      )}
    </svg>
  );
};

/**
 * Balai traditionnel : Action Supprimer
 */
export const BalaiIcon: React.FC<IconProps> = ({
  size = 20,
  color = "currentColor",
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <line x1="18" y1="4" x2="12" y2="12" />
      <path d="M12 12 L7 17 C6 18.5, 7.5 20.5, 10 20.5 C12.5 20.5, 14 18.5, 13 17 Z" />
      <line x1="8" y1="17" x2="12" y2="17" strokeWidth={1.2} />
    </svg>
  );
};

/**
 * Crayon artisanal : Action Modifier
 */
export const CrayonIcon: React.FC<IconProps> = ({
  size = 20,
  color = "currentColor",
  className = "",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
};

/**
 * Frise géométrique Bogolan / Mossi
 */
export const BogolanFrise: React.FC<{ className?: string; color?: string; height?: number }> = ({
  className = "",
  color = "#C9922E",
  height = 8,
}) => {
  return (
    <div
      className={`w-full overflow-hidden shrink-0 ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height={height}
        viewBox="0 0 400 12"
        preserveAspectRatio="repeat"
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      >
        <pattern id="bogolan-pattern" width="40" height="12" patternUnits="userSpaceOnUse">
          {/* Losange central */}
          <path d="M20 2 L26 6 L20 10 L14 6 Z" />
          <circle cx="20" cy="6" r="1" fill={color} />
          {/* Traits verticaux & zigzags d'accompagnement */}
          <line x1="4" y1="2" x2="4" y2="10" />
          <line x1="7" y1="2" x2="7" y2="10" />
          <line x1="33" y1="2" x2="33" y2="10" />
          <line x1="36" y1="2" x2="36" y2="10" />
        </pattern>
        <rect width="100%" height="12" fill="url(#bogolan-pattern)" />
      </svg>
    </div>
  );
};

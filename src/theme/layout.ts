/** Screens read this to cap their content width and stay centered on wide
 * viewports (iPad) instead of stretching full-bleed CTAs edge to edge —
 * below this width (e.g. any iPhone) it has no effect. */
export const layout = {
  maxContentWidth: 560,
} as const;

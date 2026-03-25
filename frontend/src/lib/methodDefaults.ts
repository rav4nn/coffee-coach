/** Default brew parameters per method, sourced from James Hoffmann recipes. */

export interface MethodDefaults {
  coffeeGrams: number;
  waterMl: number | null;
  waterTempC: number | null;
  grindSize: string;
  brewTime: string; // mm:ss
}

export const HOFFMANN_DEFAULTS: Record<string, MethodDefaults> = {
  v60: { coffeeGrams: 15, waterMl: 250, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:00" },
  chemex: { coffeeGrams: 30, waterMl: 500, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "04:10" },
  aeropress: { coffeeGrams: 11, waterMl: 200, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:25" },
  french_press: { coffeeGrams: 30, waterMl: 500, waterTempC: 95, grindSize: "Medium-Coarse", brewTime: "10:00" },
  moka_pot: { coffeeGrams: 20, waterMl: null, waterTempC: 100, grindSize: "Medium-Fine", brewTime: "05:00" },
  cold_brew: { coffeeGrams: 80, waterMl: 640, waterTempC: null, grindSize: "Coarse", brewTime: "18:00" },
  south_indian_filter: { coffeeGrams: 18, waterMl: 100, waterTempC: 96, grindSize: "Medium-Fine", brewTime: "10:00" },
  // Pour-over sub-devices fall back to V60 defaults
  kalita_wave: { coffeeGrams: 15, waterMl: 250, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:00" },
  clever_dripper: { coffeeGrams: 15, waterMl: 250, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:00" },
  hario_switch: { coffeeGrams: 15, waterMl: 250, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:00" },
  wilfa_pour_over: { coffeeGrams: 15, waterMl: 250, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:00" },
  origami_dripper: { coffeeGrams: 15, waterMl: 250, waterTempC: 95, grindSize: "Medium-Fine", brewTime: "03:00" },
};

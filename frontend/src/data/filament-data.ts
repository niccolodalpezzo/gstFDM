export interface BrandSpec {
  materials: string[]
  defaultTare: number
  spoolType: string
}

export const FILAMENT_DB: Record<string, BrandSpec> = {
  "Bambu Lab":  { materials: ["PLA", "PETG", "ABS", "ASA", "TPU", "PC", "PA-CF", "PET-CF"],          defaultTare: 250, spoolType: "Plastic Reusable" },
  "Prusament":  { materials: ["PLA", "PETG", "ASA", "PC Blend", "PVB", "PA11-CF"],                   defaultTare: 200, spoolType: "Plastic/Hexagon" },
  "Polymaker":  { materials: ["PLA", "PETG", "ABS", "ASA", "TPU", "PC", "PA"],                       defaultTare: 140, spoolType: "Cardboard" },
  "eSUN":       { materials: ["PLA+", "PETG", "ABS", "ASA", "TPU", "PA-CF"],                         defaultTare: 160, spoolType: "Cardboard" },
  "Sunlu":      { materials: ["PLA", "PETG", "ABS", "TPU", "ASA"],                                   defaultTare: 140, spoolType: "Plastic/Cardboard mix" },
  "Hatchbox":   { materials: ["PLA", "PETG", "ABS", "TPU"],                                          defaultTare: 225, spoolType: "Plastic" },
  "Creality":   { materials: ["PLA (Hyper)", "PETG", "ABS", "TPU", "CR-Carbon"],                     defaultTare: 140, spoolType: "Plastic" },
  "Anycubic":   { materials: ["PLA", "High-Speed PLA", "PETG", "ABS", "TPU"],                        defaultTare: 130, spoolType: "Cardboard" },
}

export const BRAND_NAMES = Object.keys(FILAMENT_DB)

export function getMaterialsForBrand(brand: string): string[] {
  return FILAMENT_DB[brand]?.materials ?? []
}

export function getDefaultTare(brand: string): number {
  return FILAMENT_DB[brand]?.defaultTare ?? 0
}

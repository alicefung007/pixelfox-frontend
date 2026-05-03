export type PaletteSwatch = {
  label: string
  color: string
}

export type PaletteDefinition = {
  id: string
  name: string
  i18nKey?: string
  swatches: PaletteSwatch[]
}

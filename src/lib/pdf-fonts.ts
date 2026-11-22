// Fonte dos PDFs gerados no servidor (react-pdf). A Manrope é a mesma das
// telas; os .ttf estáticos ficam em src/assets/fonts (licença OFL junto) e
// entram no build pelo outputFileTracingIncludes do next.config.ts.
import path from "node:path"

import { Font } from "@react-pdf/renderer"

export const PDF_FONT_FAMILY = "Manrope"

// Manrope tem números proporcionais por padrão; "tnum" deixa todos da mesma
// largura, para as colunas de valores alinharem casa por casa.
export const tabularNumbers = { fontFeatureSettings: ["tnum"] }

const fontsDir = path.join(process.cwd(), "src", "assets", "fonts")

Font.register({
  family: PDF_FONT_FAMILY,
  fonts: [
    { src: path.join(fontsDir, "Manrope-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "Manrope-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontsDir, "Manrope-Bold.ttf"), fontWeight: 700 },
  ],
})

// Sem hifenização: nome de cliente e descrição quebram na palavra inteira.
Font.registerHyphenationCallback((word) => [word])

import { Context } from 'hono'
import { errorResponse } from '../../../utils/response'
import { PDFDocument, PDFPage } from 'pdf-lib'
import * as QRCode from 'qrcode'
import { customAlphabet } from 'nanoid'

const generateUniqueID = customAlphabet('1234567890abcdef', 12)

export const generateCards = async (c: Context) => {
  try {
    const body = await c.req.json()
    const { jumlah } = body

    if (!jumlah || typeof jumlah !== 'number' || jumlah < 1) {
      return c.json(errorResponse('Jumlah kartu tidak valid'), 400)
    }

    const pdfDoc = await PDFDocument.create()

    // Load template JPG dari file
    // const templateBytes = await Bun.file(`${__dirname}/card_depan.jpg`).arrayBuffer()
    // const templateImage = await pdfDoc.embedJpg(templateBytes)

    const templateDepanBytes = await Bun.file(`${__dirname}/card_depan.jpg`).arrayBuffer()
    const templateBelakangBytes = await Bun.file(`${__dirname}/card_belakang.jpg`).arrayBuffer()

    const templateDepan = await pdfDoc.embedJpg(templateDepanBytes)
    const templateBelakang = await pdfDoc.embedJpg(templateBelakangBytes)

    // Ukuran kartu dunia nyata (8.56 cm x 5.4 cm) dalam points
    const CARD_WIDTH = 5.4 * 28.3465 // ≈ 153.07 pt
    const CARD_HEIGHT = 8.56 * 28.3465 // ≈ 242.6 pt

    const PAGE_WIDTH = 841.89 // Lebar A4
    const PAGE_HEIGHT = 595.28 // Tinggi A4 (landscape A4)

    const MARGIN_X = 20
    const MARGIN_Y = 20

    const COLUMNS_PER_ROW = 2
    const ROWS_PER_PAGE = 2
    const CARDS_PER_PAGE = ROWS_PER_PAGE * COLUMNS_PER_ROW

    let page: PDFPage | undefined = undefined

    for (let i = 0; i < jumlah; i++) {
      if (i % CARDS_PER_PAGE === 0) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      }

      const indexInPage = i % CARDS_PER_PAGE
      const row = Math.floor(indexInPage / COLUMNS_PER_ROW)
      const col = indexInPage % COLUMNS_PER_ROW

      const xLeft = MARGIN_X + col * (2 * CARD_WIDTH + MARGIN_X)
      const xRight = xLeft + CARD_WIDTH
      const y = PAGE_HEIGHT - ((row + 1) * (CARD_HEIGHT + MARGIN_Y))

      const uniqueID = generateUniqueID()
      const qrText = `${uniqueID}`

      const qrDataUrl = await QRCode.toDataURL(qrText)
      const qrImage = await pdfDoc.embedPng(qrDataUrl)

      // SISI DEPAN
      page!.drawImage(templateDepan, {
        x: xLeft,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      })

      page!.drawImage(qrImage, {
        x: xLeft + 50,
        y: y + 88,
        width: 57,
        height: 57,
      })

      // SISI BELAKANG (tanpa QR)
      page!.drawImage(templateBelakang, {
        x: xRight,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      })
    }

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="kartu-qrcode.pdf"',
      }
    })
  } catch (err) {
    console.error(err)
    return c.json(errorResponse('Terjadi kesalahan saat generate kartu'), 500)
  }
}

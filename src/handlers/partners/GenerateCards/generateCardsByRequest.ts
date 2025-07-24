import { Context } from 'hono'
import { errorResponse, successResponse } from '../../../utils/response'
import { db } from '../../../db/client'
import { PDFDocument, PDFPage } from 'pdf-lib'
import * as QRCode from 'qrcode'
import { customAlphabet } from 'nanoid'

const generateUniqueID = customAlphabet('1234567890abcdef', 12)

export const generateCardsByRequest = async (c: Context) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { id_request } = body

    if (!id_request) {
      return c.json(errorResponse('ID request diperlukan'), 400)
    }

    const conn = await db.getConnection()
    try {
      const [rows]: any = await conn.query(
        `SELECT * FROM kartu_requests WHERE id = ? AND id_user = ? LIMIT 1`,
        [id_request, user.id]
      )

      if (!rows.length) {
        return c.json(errorResponse('Request tidak ditemukan'), 404)
      }

      const request = rows[0]

      if (request.status === 'terdownload') {
        return c.json(errorResponse('Kartu sudah pernah digenerate dan diunduh'), 403)
      }

      if (request.status !== 'disetujui') {
        return c.json(errorResponse('Request belum disetujui oleh admin'), 403)
      }

      const jumlah = request.jumlah_kartu

      const pdfDoc = await PDFDocument.create()

      const templateDepanBytes = await Bun.file(`${__dirname}/card_depan.jpg`).arrayBuffer()
      const templateBelakangBytes = await Bun.file(`${__dirname}/card_belakang.jpg`).arrayBuffer()

      const templateDepan = await pdfDoc.embedJpg(templateDepanBytes)
      const templateBelakang = await pdfDoc.embedJpg(templateBelakangBytes)

      const CARD_WIDTH = 5.4 * 28.3465
      const CARD_HEIGHT = 8.56 * 28.3465
      const PAGE_WIDTH = 935.43
      const PAGE_HEIGHT = 595.28
      const MARGIN_X = 4
      const MARGIN_Y = 4

      const COLUMNS_PER_ROW = 3
      const ROWS_PER_PAGE = 2
      const CARDS_PER_PAGE = COLUMNS_PER_ROW * ROWS_PER_PAGE

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
        const qrDataUrl = await QRCode.toDataURL(uniqueID)
        const qrImage = await pdfDoc.embedPng(qrDataUrl)

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

        page!.drawImage(templateBelakang, {
          x: xRight,
          y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        })
      }

      const pdfBytes = await pdfDoc.save()

      await conn.query(`UPDATE kartu_requests SET status = 'terdownload' WHERE id = ?`, [id_request])

      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="kartu-${id_request}.pdf"`
        }
      })
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error('ERROR:', err)
    return c.json(errorResponse('Terjadi kesalahan saat generate kartu'), 500)
  }
}

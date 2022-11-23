import type { WebSocket } from 'uWebSockets.js'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { ImageModel } from '../../../../Models/Image'
import { CONTROLLERS } from '../../Handlers/dark-side'
const isBase64 = require('is-base64')

/**
 * Контроллер для загрузки изображения из БД. Возвращает base64 запись изображения
 *
 * @param params - ["id"]
 */
export async function load_image(socket: WebSocket, params: unknown[]) {
  let ID = params[0]
  if (typeof ID != 'string')
    throw new TechnicalError('image id', TechnicalCause.INVALID_FORMAT)

  let image = await ImageModel.findById(ID)
  if (!image) throw new TechnicalError('image', TechnicalCause.NOT_EXIST)
  return image.buffer.toString('base64')
}
CONTROLLERS.set('load_image', load_image)

/**
 * Контроллер для выгрузки изображения в БД. Возвращает ID записанного изображения
 *
 * @param params - ["base64 Image"]
 */
export async function upload_image(socket: WebSocket, params: unknown[]) {
  if (typeof params[0] != 'string' || !isBase64(params[0]))
    throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)

  let buffer = Buffer.from(params[0], 'base64')
  return (await ImageModel.create({ buffer, mimeType: 'image/png' }))._id
}
CONTROLLERS.set('upload_image', upload_image)

import type { WebSocket } from 'uWebSockets.js'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { ImageModel } from '../../../../Models/Image'
import { CONTROLLERS } from '../../Handlers/dark-side'

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
 * @param params - ["buffer"]
 */
export async function upload_image(socket: WebSocket, params: unknown[]) {
  let buffer = params[0]
  if (!(buffer instanceof Buffer))
    throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)

  return (await ImageModel.create({ buffer, mimeType: 'image/png' }))._id
}
CONTROLLERS.set('upload_image', load_image)

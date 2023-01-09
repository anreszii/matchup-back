import * as https from 'https'
import { stringify } from 'querystring'

interface IResponseObject {
  id: string
  title: string
  url_viewer: string
  url: string
  display_url: string
  size: number
  time: string
  expiration: string
  image: {
    filename: string
    name: string
    mime: string
    extension: string
    url: string
  }
  thumb: {
    filename: string
    name: string
    mime: string
    extension: string
    url: string
  }
  medium?: {
    filename: string
    name: string
    mime: string
    extension: string
    url: string
  }
  delete_url: string
}

interface IOptionObject {
  apiKey: string
  imagePath?: string
  name?: string
  expiration?: number
  base64string?: string
  imageUrl?: string
  cheveretoHost?: string
  customPayload?: Record<string, unknown>
}

interface IPostParams extends IOptionObject {
  image: string
}

export const postToImgbb = (params: IPostParams) =>
  new Promise<IResponseObject>((resolve, reject) => {
    const { apiKey, image, name = null, expiration = null } = { ...params }

    // query string & payload structures are different for imgBB & chevereto-free
    let query = `/1/upload?key=${apiKey}`
    const payload = stringify({
      image,
    })

    if (name) query += `&name=${encodeURIComponent(name)}`
    if (expiration) query += `&expiration=${expiration}`

    const options = {
      hostname: 'api.imgbb.com',
      method: 'POST',
      timeout: 5000,
      path: query,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': payload.length,
      },
    }

    const req = https
      .request(options, (res: any) => {
        let response = ''

        res.on('data', (d: string) => {
          response += d
        })

        res.on('end', () => {
          try {
            if (JSON.parse(response).error) {
              const error = {
                message: 'imgBB API returned an error',
                imgbbApiResponse: JSON.parse(response),
              }
              reject(new Error(JSON.stringify(error, null, 4)))
            } else {
              const output = JSON.parse(response).data
              resolve(output)
            }
          } catch (e) {
            reject(e)
          }
        })
      })

      .on('error', (err: any) => {
        reject(new Error(err))
      })

    req.write(payload)

    return req.end()
  })

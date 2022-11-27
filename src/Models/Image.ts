import { getModelForClass, prop, ReturnModelType } from '@typegoose/typegoose'

export class Image {
  @prop({ required: true })
  display_url!: string
  @prop({ required: true })
  delete_url!: string

  static async erase(this: ReturnModelType<typeof Image>, ID?: string) {
    if (!ID) return false
    return this.findById(ID).then(async (document) => {
      if (!document) return false
      return fetch(document.delete_url)
        .then((response) => {
          if (!response.ok) return false

          document.delete()
          return true
        })
        .catch((e) => {
          console.error(e)
          return false
        })
    })
  }
}

export const ImageModel = getModelForClass(Image)

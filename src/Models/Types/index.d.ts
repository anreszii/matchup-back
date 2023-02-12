import { DocumentType } from '@typegoose/typegoose'

export type DocumentsArrayPromise<T> = Promise<DocumentType<T>[]>
export type DocumentPromise<T> = Promise<DocumentType<T>[]>

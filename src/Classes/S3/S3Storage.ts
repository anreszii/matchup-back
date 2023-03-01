import {
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsCommand,
  PutObjectCommand,
  PutObjectRequest,
  S3Client,
} from '@aws-sdk/client-s3'
import { v4 as uuid } from 'uuid'

export class S3Storage {
  private _client: S3Client
  private _defaultBucket = '20dedb32-20f03057-47ef-48f3-993e-e68518aa77ec'
  constructor(public Region: string) {
    this._client = new S3Client({
      endpoint: 'https://s3.timeweb.com',
      region: Region,
    })
  }

  getCustomObject(Key: string) {
    return this._client.send(
      new GetObjectCommand({ ...this.mainBucketParams, Key }),
    )
  }

  upload(
    Body: PutObjectRequest['Body'] | string | Uint8Array | Buffer,
    type: 'file' | 'image' = 'image',
  ) {
    let Key = uuid()
    if (type == 'image') Key += '.jpg'

    return this._client
      .send(new PutObjectCommand({ ...this.mainBucketParams, Key, Body }))
      .then(() => `https://s3.timeweb.com/${this._defaultBucket}/${Key}`)
  }

  get buckets() {
    return this._client.send(new ListBucketsCommand({}))
  }

  get objects() {
    return this._client.send(new ListObjectsCommand(this.mainBucketParams))
  }

  private get mainBucketParams() {
    return { Bucket: this._defaultBucket }
  }
}

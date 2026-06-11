// lib/mongodb.ts
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGODB_URI!
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect() // <-- IMPORTANT
}
const clientPromise: Promise<MongoClient> = global._mongoClientPromise

export default clientPromise

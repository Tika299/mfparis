import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const data = await req.json()
  const msg = await payload.create({ collection: 'messages', data })
  return Response.json(msg)
}

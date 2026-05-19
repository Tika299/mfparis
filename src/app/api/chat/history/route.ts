import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sid = searchParams.get('sid')
  const payload = await getPayload({ config: configPromise })
  const history = await payload.find({
    collection: 'messages',
    where: { sessionId: { equals: sid } },
    sort: 'createdAt',
  })
  return Response.json(history.docs)
}

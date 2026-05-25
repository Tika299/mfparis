import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const payload = await getPayload({ config: configPromise })
        const { action, username, password, name } = await req.json()

        if (action === 'register') {
            const newUser = await payload.create({
                collection: 'chat-profiles' as any,
                data: {
                    name,
                    username,
                    password,
                    email: `${username}@chat.mfparis.vn` // Email ảo để thỏa mãn hệ thống Auth
                } as any,
            })
            return NextResponse.json({ success: true, user: newUser })
        }

        if (action === 'login') {
            const result = await payload.login({
                collection: 'chat-profiles' as any,
                data: { username, password },
            })
            return NextResponse.json({ success: true, user: result.user })
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
}
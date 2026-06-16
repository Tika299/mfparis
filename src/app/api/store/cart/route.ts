import config from '@payload-config'
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
    getPayload,
    type Where,
} from 'payload'

const GUEST_CART_COOKIE = 'mf_guest_cart_id'

const MAX_QUANTITY_PER_ITEM = 99

function parsePositiveInteger(
    value: unknown,
): number | null {
    const parsedValue =
        typeof value === 'string' &&
            value.trim().length > 0
            ? Number(value)
            : value

    if (
        typeof parsedValue !== 'number' ||
        !Number.isInteger(parsedValue) ||
        parsedValue <= 0
    ) {
        return null
    }

    return parsedValue
}

function parseQuantity(
    value: unknown,
): number | null {
    const quantity = parsePositiveInteger(value)

    if (
        quantity === null ||
        quantity > MAX_QUANTITY_PER_ITEM
    ) {
        return null
    }

    return quantity
}

function parseVariantId(
    value: unknown,
): string | undefined {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return undefined
    }

    const variantId = String(value).trim()

    return variantId.length > 0
        ? variantId
        : undefined
}

type AddCartItemBody = {
    productId?: unknown
    variantId?: unknown
    quantity?: unknown
}

async function getContext() {
    const payload = await getPayload({
        config,
    })

    const cookieStore = await cookies()

    const currentGuestId =
        cookieStore.get(
            GUEST_CART_COOKIE,
        )?.value

    const guestId =
        currentGuestId ?? randomUUID()

    return {
        payload,
        guestId,
        shouldSetGuestCookie: !currentGuestId,
    }
}

function ownerWhere(
    guestId: string,
): Where {
    return {
        guestId: {
            equals: guestId,
        },
    }
}

async function findActiveCart(
    payload: Awaited<
        ReturnType<typeof getPayload>
    >,
    guestId: string,
) {
    const result = await payload.find({
        collection: 'carts',
        depth: 0,
        limit: 1,
        sort: '-updatedAt',
        overrideAccess: true,
        where: {
            and: [
                ownerWhere(guestId),
                {
                    status: {
                        equals: 'active',
                    },
                },
            ],
        },
    })

    return result.docs[0] ?? null
}

export async function GET() {
    const {
        payload,
        guestId,
        shouldSetGuestCookie,
    } = await getContext()

    let cart = await findActiveCart(
        payload,
        guestId,
    )

    if (!cart) {
        cart = await payload.create({
            collection: 'carts',
            depth: 0,
            overrideAccess: true,
            data: {
                user: null,
                guestId,
                status: 'active',
                items: [],
            },
        })
    }

    const response = NextResponse.json({
        cart,
    })

    if (shouldSetGuestCookie) {
        response.cookies.set(
            GUEST_CART_COOKIE,
            guestId,
            {
                httpOnly: true,
                sameSite: 'lax',
                secure:
                    process.env.NODE_ENV ===
                    'production',
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
            },
        )
    }

    return response
}

export async function POST(
    request: Request,
) {
    const body =
        (await request.json()) as AddCartItemBody

    const productId =
        parsePositiveInteger(body.productId)

    const quantity =
        parseQuantity(body.quantity)

    const variantId =
        parseVariantId(body.variantId)

    if (productId === null) {
        return NextResponse.json(
            {
                message:
                    'productId phải là số nguyên lớn hơn 0.',
            },
            {
                status: 400,
            },
        )
    }

    if (quantity === null) {
        return NextResponse.json(
            {
                message:
                    `quantity phải là số nguyên từ 1 đến ${MAX_QUANTITY_PER_ITEM}.`,
            },
            {
                status: 400,
            },
        )
    }

    const {
        payload,
        guestId,
        shouldSetGuestCookie,
    } = await getContext()

    let cart = await findActiveCart(
        payload,
        guestId,
    )

    if (!cart) {
        cart = await payload.create({
            collection: 'carts',
            overrideAccess: true,
            data: {
                user: null,
                guestId,
                status: 'active',
                items: [],
            },
        })
    }

    const currentItems =
        Array.isArray(cart.items)
            ? cart.items
            : []

    const updatedCart = await payload.update({
        collection: 'carts',
        id: cart.id,
        depth: 0,
        overrideAccess: true,
        data: {
            items: [
                ...currentItems,
                {
                    product: productId,
                    variantId,
                    quantity,
                },
            ],
        },
    })

    const response = NextResponse.json({
        cart: updatedCart,
    })

    if (shouldSetGuestCookie) {
        response.cookies.set(
            GUEST_CART_COOKIE,
            guestId,
            {
                httpOnly: true,
                sameSite: 'lax',
                secure:
                    process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
            },
        )
    }

    return response
}
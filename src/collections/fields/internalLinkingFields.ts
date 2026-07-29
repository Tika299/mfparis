import type { Field } from 'payload'

export const internalLinkingFields: Field = {
    name: 'internalLinking',
    type: 'group',
    label: 'Internal Linking',
    admin: {
        position: 'sidebar',
    },
    fields: [
        {
            name: 'disableAutoLinks',
            type: 'checkbox',
            label: 'Tắt auto internal link cho nội dung này',
            defaultValue: false,
        },
        {
            name: 'maxLinksOverride',
            type: 'number',
            label: 'Giới hạn link riêng',
            min: 0,
            max: 30,
        },
        {
            name: 'excludeKeywords',
            type: 'array',
            label: 'Keyword không được chèn trong nội dung này',
            fields: [
                {
                    name: 'keyword',
                    type: 'text',
                    required: true,
                    label: 'Keyword',
                },
            ],
        },
    ],
}
import { parseDocument, DomUtils } from 'htmlparser2'
import { Element } from 'domhandler'
import serialize from 'dom-serializer'

export function wrapBlogTables(html: string): string {
    if (!/<table\b/i.test(html)) return html

    const document = parseDocument(html)
    const tables = DomUtils.findAll(
        (element) => element.name === 'table',
        document.children,
    )

    for (const table of tables) {
        const parent = table.parent
        const classes = parent instanceof Element
            ? (parent.attribs.class ?? '').split(/\s+/)
            : []

        if (
            parent instanceof Element &&
            classes.some((name) =>
                ['blog-table-scroll', 'wp-block-table'].includes(name),
            )
        ) {
            parent.attribs.tabindex = '0'
            parent.attribs.role = 'region'
            parent.attribs['aria-label'] ||= 'Bảng thông tin'
            continue
        }

        const wrapper = new Element('div', {
            class: 'blog-table-scroll',
            tabindex: '0',
            role: 'region',
            'aria-label': 'Bảng thông tin',
        })

        DomUtils.replaceElement(table, wrapper)
        DomUtils.appendChild(wrapper, table)
    }

    return serialize(document)
}
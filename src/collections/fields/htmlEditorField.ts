import type { Field } from 'payload'

type HtmlEditorFieldOptions = {
  name: string
  label: string
  description?: string
  required?: boolean
  rows?: number
}

export function htmlEditorField({
  name,
  label,
  description,
  required = false,
  rows = 30,
}: HtmlEditorFieldOptions): Field {
  return {
    name,
    type: 'textarea',
    required,
    label,
    admin: {
      rows,
      description:
        description ||
        'Nội dung HTML. Co the soan truc quan hoac chinh truc tiep ma HTML.',
      components: {
        Field: {
          path: '@/components/Admin/TinyMCEHtmlEditor#TinyMCEHtmlEditor',
        },
      },
    },
  }
}

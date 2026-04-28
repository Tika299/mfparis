import { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  fields: [
    {
      name: 'festivalBanner',
      type: 'group',
      label: 'Banner Ngày Lễ',
      fields: [
        { name: 'active', type: 'checkbox', label: 'Bật Banner lễ hội' },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'link', type: 'text' },
        { name: 'endDate', type: 'date', label: 'Ngày kết thúc lễ' },
      ],
    },
    {
      name: 'header',
      type: 'group',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media' },
        {
          name: 'menu',
          type: 'array',
          fields: [
            { name: 'label', type: 'text' },
            { name: 'link', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        { name: 'hotline', type: 'text' },
        { name: 'address', type: 'textarea' },
        { name: 'facebookUrl', type: 'text' },
      ],
    },
  ],
}

import { describe, expect, it } from 'vitest'

import {
  countInternalLinkWords,
  dedupeInternalLinkSkips,
  getInternalLinkContextExcerpt,
  getInternalLinkDensityIssueFlags,
  getInternalLinkInsertionIssueFlags,
  getInternalLinkSkipIssueFlags,
  shouldStoreInternalLinkSkip,
} from '@/lib/internal-links/scanUtils'

describe('Tiện ích quét internal link', () => {
  it('đếm từ sau khi nội dung đã được chuyển thành plain text', () => {
    expect(countInternalLinkWords('Nước hoa  chính hãng\n tại Paris')).toBe(6)
    expect(countInternalLinkWords('   ')).toBe(0)
  })

  it('tạo đoạn ngữ cảnh quanh anchor', () => {
    const text =
      'Mở đầu rất dài để kiểm tra đoạn cắt. Gucci Flora là lựa chọn phù hợp cho mùa hè. Phần cuối.'
    const excerpt = getInternalLinkContextExcerpt(text, 'Gucci Flora', 60)

    expect(excerpt).toContain('Gucci Flora')
    expect(excerpt.length).toBeLessThanOrEqual(62)
  })

  it('không lưu self-link khi keyword không thực sự có trong nội dung', () => {
    expect(
      shouldStoreInternalLinkSkip(
        { keyword: 'Gucci Flora', reason: 'self_link' },
        'Nội dung không nhắc đến sản phẩm đó.',
      ),
    ).toBe(false)

    expect(
      shouldStoreInternalLinkSkip(
        { keyword: 'Gucci Flora', reason: 'self_link' },
        'Bài viết có nhắc GUCCI FLORA Eau de Parfum.',
      ),
    ).toBe(true)
  })

  it('không tính diagnostic hệ thống thành candidate link', () => {
    expect(
      shouldStoreInternalLinkSkip({ reason: 'empty_html' }, ''),
    ).toBe(false)
    expect(
      shouldStoreInternalLinkSkip({ reason: 'no_rules' }, 'Nội dung bình thường'),
    ).toBe(false)
  })

  it('loại cảnh báo giả và gộp diagnostic trùng nhau', () => {
    const skipped = dedupeInternalLinkSkips(
      [
        {
          keyword: 'Montblanc',
          reason: 'max_anchor_reached',
          ruleId: 12,
          targetUrl: '/brands/montblanc/',
          textPreview: 'Đoạn này không chứa thương hiệu cần tìm.',
        },
        {
          keyword: 'Montblanc',
          reason: 'max_anchor_reached',
          ruleId: 12,
          targetUrl: '/brands/montblanc/',
          textPreview: 'Montblanc Legend phù hợp môi trường văn phòng.',
        },
        {
          keyword: 'Montblanc',
          reason: 'max_anchor_reached',
          ruleId: 12,
          targetUrl: '/brands/montblanc/',
          textPreview: 'Một lựa chọn khác là Montblanc Explorer.',
        },
      ],
      'Montblanc xuất hiện trong nội dung.',
    )

    expect(skipped).toHaveLength(1)
    expect(skipped[0]?.textPreview).toContain('Montblanc Legend')
  })

  it('gắn cờ cho lý do bỏ qua cần người quản trị xem lại', () => {
    expect(
      getInternalLinkSkipIssueFlags({ reason: 'max_links_reached' }),
    ).toEqual(['skipped_max_links_reached'])
    expect(getInternalLinkSkipIssueFlags({ reason: 'heading' })).toEqual([])
  })

  it('gắn cờ anchor và URL đích bị lặp', () => {
    const flags = getInternalLinkInsertionIssueFlags(
      {
        keyword: 'Gucci Flora',
        anchorText: 'Gucci Flora',
        targetUrl: '/products/gucci-flora',
      },
      new Map([['/products/gucci-flora', 2]]),
      new Map([['gucciflora', 2]]),
    )

    expect(flags).toEqual(['duplicate_target', 'duplicate_anchor'])
  })

  it('chỉ cảnh báo mật độ khi vượt ngưỡng cấu hình', () => {
    expect(getInternalLinkDensityIssueFlags(4, 1_000, 0.5)).toEqual([])
    expect(getInternalLinkDensityIssueFlags(6, 1_000, 0.5)).toEqual([
      'high_link_density',
    ])
    expect(getInternalLinkDensityIssueFlags(50, 1_000, 0)).toEqual([])
  })
})

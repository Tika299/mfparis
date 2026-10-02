import { describe, expect, it } from 'vitest'

import {
  countInternalLinkWords,
  getInternalLinkContextExcerpt,
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
})

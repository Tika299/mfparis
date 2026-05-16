/** @type {import('tailwindcss').Config} */
export default {
  // ... các cấu hình khác
  plugins: [require('@tailwindcss/typography')],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%', // Cho phép nội dung tràn rộng
            color: '#374151', // Màu xám đậm sang trọng
            h2: {
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: '700',
              color: '#16423C', // Màu xanh đặc trưng của bạn
            },
            h3: {
              fontFamily: 'var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: '800',
            },
            p: {
              lineHeight: '1.8',
              marginBottom: '1.5em',
            },
            img: {
              borderRadius: '1.5rem', // Bo tròn ảnh trong mô tả
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', // Đổ bóng cho ảnh
            },
          },
        },
      },
    },
  },
}

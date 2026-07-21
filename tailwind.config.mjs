/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/components/Admin/**/*.{js,ts,jsx,tsx}', // THÊM DÒNG NÀY để Tailwind không bỏ sót
  ],
  plugins: [require('@tailwindcss/typography')],
  theme: {
    extend: {
      primary: {
        DEFAULT: '#b72828',
        foreground: '#ffffff',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%', // Cho phép nội dung tràn rộng
            color: '#374151', // Màu xám đậm sang trọng
            h2: {
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              fontWeight: '700',
              color: '#000000', // Màu xanh đặc trưng của bạn
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

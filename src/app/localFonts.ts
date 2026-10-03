import localFont from 'next/font/local'

export const beVietnam = localFont({
  src: [
    {
      path: './fonts/BeVietnamPro-Regular.ttf',
      style: 'normal',
      weight: '400',
    },
    {
      path: './fonts/BeVietnamPro-SemiBold.ttf',
      style: 'normal',
      weight: '600',
    },
    {
      path: './fonts/BeVietnamPro-Bold.ttf',
      style: 'normal',
      weight: '700',
    },
  ],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
  preload: false,
  variable: '--font-be-vietnam',
})

export const playfair = localFont({
  src: './fonts/PlayfairDisplay-Variable.ttf',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
  preload: false,
  variable: '--font-playfair',
  weight: '400 900',
})

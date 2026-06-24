/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  variable: '--font-playfair',
  display: 'swap',
})

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    <div className={`${beVietnam.variable} ${playfair.variable} payload-admin-fonts`}>
      {children}
    </div>
  </RootLayout>
)

export default Layout
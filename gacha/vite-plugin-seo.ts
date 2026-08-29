import fs from 'node:fs'
import path from 'node:path'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import {
  crawlableNoscriptHtml,
  jsonLdGraph,
  llmsTxt,
  robotsTxt,
  sitemapXml,
} from './src/lib/seo-document'
import { SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE } from './src/lib/faq-content'

function writePublicBotFiles(rootDir: string) {
  const publicDir = path.join(rootDir, 'public')
  fs.mkdirSync(publicDir, { recursive: true })
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt())
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml())
  fs.writeFileSync(path.join(publicDir, 'llms.txt'), llmsTxt())
}

function seoHeadTags(): HtmlTagDescriptor[] {
  const origin = SITE_ORIGIN
  const title = SITE_TITLE
  const description = SITE_DESCRIPTION
  const canonical = `${origin}/`
  const ogImage = `${origin}/logo.svg`

  return [
    {
      tag: 'meta',
      attrs: { name: 'description', content: description },
      injectTo: 'head',
    },
    {
      tag: 'link',
      attrs: { rel: 'canonical', href: canonical },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { name: 'robots', content: 'index, follow' },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { property: 'og:type', content: 'website' },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { property: 'og:site_name', content: title },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { property: 'og:title', content: title },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { property: 'og:description', content: description },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { property: 'og:url', content: canonical },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { property: 'og:image', content: ogImage },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { name: 'twitter:card', content: 'summary' },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { name: 'twitter:title', content: title },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { name: 'twitter:description', content: description },
      injectTo: 'head',
    },
    {
      tag: 'meta',
      attrs: { name: 'twitter:image', content: ogImage },
      injectTo: 'head',
    },
    {
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      children: JSON.stringify(jsonLdGraph()),
      injectTo: 'head',
    },
  ]
}

export function seoPlugin(): Plugin {
  let rootDir = process.cwd()

  return {
    name: 'gacha-seo',
    configResolved(config) {
      rootDir = config.root
      writePublicBotFiles(rootDir)
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const withRoot = html.includes('<div id="root"></div>')
          ? html.replace(
              '<div id="root"></div>',
              `<div id="root"></div>\n  ${crawlableNoscriptHtml()}`
            )
          : html
        return {
          html: withRoot,
          tags: seoHeadTags(),
        }
      },
    },
  }
}

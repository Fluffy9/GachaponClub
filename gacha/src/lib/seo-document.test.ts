import { describe, expect, it } from 'vitest'
import { EVM_MACHINE_ADDRESS } from './constants'
import { FAQ_TEXT_ITEMS, SITE_DESCRIPTION, SITE_TITLE } from './faq-content'
import {
  crawlableNoscriptHtml,
  crawlableRootHtml,
  escapeHtml,
  jsonLdGraph,
  llmsTxt,
  robotsTxt,
  sitemapXml,
} from './seo-document'

describe('seo documents', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml('a <b> & "c"')).toBe('a &lt;b&gt; &amp; &quot;c&quot;')
  })

  it('puts the product story and FAQ in crawlable HTML', () => {
    const html = crawlableRootHtml()
    expect(html).toContain(`<h1>${SITE_TITLE}</h1>`)
    expect(html).toContain(SITE_DESCRIPTION)
    expect(html).toContain('How do I open a capsule?')
    expect(html).toContain(EVM_MACHINE_ADDRESS)
    expect(html).toContain(FAQ_TEXT_ITEMS[0]!.answer)
  })

  it('wraps that copy in noscript so JS clients never paint it', () => {
    const html = crawlableNoscriptHtml()
    expect(html.startsWith('<noscript>')).toBe(true)
    expect(html.endsWith('</noscript>')).toBe(true)
    expect(html).toContain(`<h1>${SITE_TITLE}</h1>`)
  })

  it('emits FAQPage JSON-LD with every Q&A', () => {
    const graph = jsonLdGraph() as {
      '@graph': Array<{ '@type': string; mainEntity?: Array<{ name: string }> }>
    }
    const faq = graph['@graph'].find((node) => node['@type'] === 'FAQPage')
    expect(faq?.mainEntity?.map((item) => item.name)).toEqual([
      ...FAQ_TEXT_ITEMS.map((item) => item.question),
      'Contract addresses?',
    ])
  })

  it('exposes robots, sitemap, and llms.txt for non-JS clients', () => {
    expect(robotsTxt()).toContain('Disallow: /admin')
    expect(robotsTxt()).toContain('https://gachapon.club/sitemap.xml')
    expect(sitemapXml()).toContain('https://gachapon.club/</loc>')
    expect(llmsTxt()).toContain(SITE_DESCRIPTION)
    expect(llmsTxt()).toContain(EVM_MACHINE_ADDRESS)
    expect(llmsTxt()).toContain('Chainlink VRF')
  })
})

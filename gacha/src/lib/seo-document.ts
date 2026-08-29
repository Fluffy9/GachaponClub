import {
  allFaqPlainItems,
  CONTRACT_LINKS,
  FAQ_TEXT_ITEMS,
  SITE_DESCRIPTION,
  SITE_ORIGIN,
  SITE_TITLE,
} from './faq-content'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function contractsHtml(): string {
  const chains = ['Base', 'Sui'] as const
  return chains
    .map((chain) => {
      const rows = CONTRACT_LINKS.filter((link) => link.chain === chain)
        .map(
          (link) =>
            `<p><strong>${escapeHtml(link.label)}:</strong> <a href="${escapeHtml(link.href)}">${escapeHtml(link.address)}</a></p>`
        )
        .join('')
      return `<h3>${chain}</h3>${rows}`
    })
    .join('')
}

export function crawlableRootHtml(): string {
  const faqHtml = FAQ_TEXT_ITEMS.map(
    (item) =>
      `<section><h2>${escapeHtml(item.question)}</h2><p>${escapeHtml(item.answer)}</p></section>`
  ).join('')

  return [
    `<h1>${escapeHtml(SITE_TITLE)}</h1>`,
    `<p>${escapeHtml(SITE_DESCRIPTION)}</p>`,
    '<p>Buy a common, rare, or epic capsule on Base, donate an approved NFT for a matching-tier ticket, then open it. The machine snapshots that bag and asks Chainlink VRF for a random prize. Donations for that tier pause until the draw finishes.</p>',
    faqHtml,
    `<section><h2>Contract addresses?</h2>${contractsHtml()}</section>`,
  ].join('')
}

/** Bots that skip JS still get the FAQ. JS browsers never paint `<noscript>`. */
export function crawlableNoscriptHtml(): string {
  return `<noscript>${crawlableRootHtml()}</noscript>`
}

export function jsonLdGraph(): Record<string, unknown> {
  const faqEntities = allFaqPlainItems().map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  }))

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: SITE_TITLE,
        url: `${SITE_ORIGIN}/`,
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_ORIGIN}/#app`,
        name: SITE_TITLE,
        url: `${SITE_ORIGIN}/`,
        description: SITE_DESCRIPTION,
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_ORIGIN}/#faq`,
        url: `${SITE_ORIGIN}/`,
        mainEntity: faqEntities,
      },
    ],
  }
}

export function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    '',
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n')
}

export function sitemapXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_ORIGIN}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
}

export function llmsTxt(): string {
  const faq = allFaqPlainItems()
    .map((item) => `### ${item.question}\n\n${item.answer}`)
    .join('\n\n')

  const contracts = CONTRACT_LINKS.map(
    (link) => `- ${link.chain} ${link.label}: ${link.address} — ${link.href}`
  ).join('\n')

  return `# ${SITE_TITLE}

> ${SITE_DESCRIPTION}

Gachapon Club is a web app. Humans use the JavaScript client to connect a wallet, buy capsules, donate NFTs, and open draws. This file is the static project card for language models and other non-JS clients.

## Site

- Home: ${SITE_ORIGIN}/
- llms.txt: ${SITE_ORIGIN}/llms.txt
- Capsule metadata: ${SITE_ORIGIN}/api/rarity/{id}.json

## How it works

- Tiers: Common (light blue), Rare (pink), Epic (pastel gold). Each tier is its own ERC-1155 capsule collection (token id 0).
- Buy a capsule for that tier, or donate an approved NFT into that bag to receive one capsule of the same tier.
- Opening a capsule burns it, snapshots the prize bag, and requests Chainlink VRF. That bag does not accept donations until the draw finishes.
- A capsule is an equal chance of any prize currently in that bag. The operator can reprice capsules and add or remove prizes. This is a hot-wallet machine, not a timelocked vault.
- Live machine is on Base. A Sui deployment also exists.

## Contracts

${contracts}

## FAQ

${faq}
`
}

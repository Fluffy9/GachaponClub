import {
  BASE_EXPLORER_URL,
  EVM_MACHINE_ADDRESS,
  EVM_NFT_ADDRESSES,
  EXPLORER_URL,
  SUI_CONTRACT_ADDRESS,
  SUI_MACHINE_ID,
} from './constants'

export const SITE_ORIGIN = 'https://gachapon.club'
export const SITE_TITLE = 'Gachapon Club'
export const SITE_DESCRIPTION =
  'Gachapon Club is an NFT capsule machine on Base. Buy common, rare, or epic capsules, donate approved NFTs for a ticket of the same tier, and open a capsule for a Chainlink VRF prize draw.'

export type FaqTextItem = {
  question: string
  answer: string
}

export const FAQ_TEXT_ITEMS: FaqTextItem[] = [
  {
    question: 'What is Gachapon Club?',
    answer:
      'Gachapon Club is the most degen DeFi NFT launchpad disguised as a capsule toy simulator. You can check out our codebase on the verified contract address and our roadmap and documentation on Notion.',
  },
  {
    question: 'How do the different capsule types work?',
    answer:
      'As of right now, there are 3 capsules: Common (light blue), Rare (pink), and Epic (pastel gold). Select the capsule and complete the purchase to receive a Gachapon Club Capsule NFT. Each tier allows you to win rarer and more valuable NFT collectibles.',
  },
  {
    question: 'Can I sell my capsule?',
    answer:
      'Yes. Capsule NFTs are 1155 semi-fungible tokens so a liquidity pool can be created for them.',
  },
  {
    question: 'Can I donate my NFT?',
    answer:
      'Yes, if the NFT is in an approved collection for a particular tier. You will receive one capsule of that same tier.',
  },
  {
    question: 'How do I open a capsule?',
    answer:
      'After purchasing your capsule, click on it inside your inventory to open it! Be certain that you want to open it, as this cannot be undone. When you open, you will receive a random prize from the tier of the capsule you opened. New donations are not accepted until the draw finishes.',
  },
  {
    question: 'How do prize tiers work? (Technically)',
    answer:
      'Each capsule tier (common, rare, epic at this time) has a number of NFT collections that are possible prizes. The machine will randomly select one of the NFTs in the tier to be the prize.',
  },
]

export const CONTRACTS_QUESTION = 'Contract addresses?'

export type ContractLink = {
  chain: 'Base' | 'Sui'
  label: string
  address: string
  href: string
}

export const CONTRACT_LINKS: ContractLink[] = [
  {
    chain: 'Base',
    label: 'Machine',
    address: EVM_MACHINE_ADDRESS,
    href: `${BASE_EXPLORER_URL}/address/${EVM_MACHINE_ADDRESS}`,
  },
  {
    chain: 'Base',
    label: 'Common capsule',
    address: EVM_NFT_ADDRESSES.COMMON,
    href: `${BASE_EXPLORER_URL}/address/${EVM_NFT_ADDRESSES.COMMON}`,
  },
  {
    chain: 'Base',
    label: 'Rare capsule',
    address: EVM_NFT_ADDRESSES.RARE,
    href: `${BASE_EXPLORER_URL}/address/${EVM_NFT_ADDRESSES.RARE}`,
  },
  {
    chain: 'Base',
    label: 'Epic capsule',
    address: EVM_NFT_ADDRESSES.EPIC,
    href: `${BASE_EXPLORER_URL}/address/${EVM_NFT_ADDRESSES.EPIC}`,
  },
  {
    chain: 'Sui',
    label: 'Package',
    address: SUI_CONTRACT_ADDRESS,
    href: `${EXPLORER_URL}package/${SUI_CONTRACT_ADDRESS}`,
  },
  {
    chain: 'Sui',
    label: 'Machine',
    address: SUI_MACHINE_ID,
    href: `${EXPLORER_URL}object/${SUI_MACHINE_ID}`,
  },
]

export function contractsAnswerPlain(): string {
  return CONTRACT_LINKS.map(
    (link) => `${link.chain} ${link.label}: ${link.address} (${link.href})`
  ).join(' ')
}

export function allFaqPlainItems(): FaqTextItem[] {
  return [
    ...FAQ_TEXT_ITEMS,
    { question: CONTRACTS_QUESTION, answer: contractsAnswerPlain() },
  ]
}

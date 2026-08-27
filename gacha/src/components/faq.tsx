"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BASE_EXPLORER_URL,
  EVM_MACHINE_ADDRESS,
  EVM_NFT_ADDRESSES,
  EXPLORER_URL,
  SUI_CONTRACT_ADDRESS,
  SUI_MACHINE_ID,
} from "../lib/constants"

interface FAQItem {
  question: string
  answer: ReactNode
}

function AddressRow({
  label,
  address,
  href,
}: {
  label: string
  address: string
  href: string
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <span className="shrink-0 font-bold">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-[#c4121a] underline decoration-[#c4121a]/40 underline-offset-2 hover:decoration-[#c4121a] dark:text-rose-300 dark:decoration-rose-300/40 dark:hover:decoration-rose-300"
      >
        {address}
      </a>
    </div>
  )
}

const faqItems: FAQItem[] = [
  {
    question: "What is Gachapon Club?",
    answer:
      "Gachapon Club is the most degen DeFi NFT launchpad disguised as a capsule toy simulator 😁",
  },
  {
    question: "How do the different capsule types work?",
    answer:
      "As of right now, there are 3 capsules: Common (light blue), Rare (pink), and Epic (pastel gold). Select the capsule and complete the purchase to receive a Gachapon Club Capsule NFT. Each tier allows you to win rarer and more valuable NFT collectibles.",
  },
  {
    question: "Can I sell my capsule?",
    answer: "Yes, please do sell and trade amongst your friends.",
  },
  {
    question: "Can I donate my NFT?",
    answer: "Admin-approved collections can be donated into one or more bags. When you donate, you pick the bag. You receive one capsule of that same tier. A bag cannot take donations while someone is in the middle of opening a capsule of that tier — wait a moment for VRF, or just buy a capsule if you only want the ticket. The operator can pull prizes from a bag at any time — this is a hot-wallet machine, not a timelocked vault.",
  },
  {
    question: "How do I open a capsule?",
    answer:
      "After purchasing your capsule, click on it inside your inventory to open it! Be certain that you want to open it, as this cannot be undone. When you open, the machine freezes the prizes that are in that bag at that moment and asks Chainlink VRF for a random index among those. That bag will not accept new donations until the draw finishes.",
  },
  {
    question: "How do prize tiers work? (Technically)",
    answer: "Each capsule tier (common, rare, epic at this time) has a number of NFT collections that are possible prizes. The machine will randomly select one of the NFTs in the tier to be the prize.",
  },
  {
    question: "Tokenomics / Technical implications?",
    answer: "The capsule prize is chosen when you open it, from the prizes sitting in that bag at that moment. Holding an unopened capsule still lets you wait for a donation before you open. Once a draw is in flight, that bag will not accept donations. Because of this, the value of a capsule can be roughly described as a probability based on the smart contract's (machine) holdings, what is within its prize tier, and how many capsules of this type are in the wild. This does dictate a mathematically provable floor price for capsule NFTs. An economist or admin may increase or decrease capsule prices based on market factors. There is also some very interesting price action that may occur based on what people THINK will be donated and when. For example, if someone plans to donate a Blue Chip NFT worth a million dollars to the machine, it suddenly makes mathematical sense to buy capsules now and use them after it's donated. In a way, it can also serve as an index to invest in the NFTs on a particular chain.",
  },
  {
    question: "Long term goal?",
    answer: "Longer term, I see this project becoming owned and run by a DAO that is stewarding the Machine holdings. As it collects more and more NFTs, it becomes important to think about what value those NFTs can bring while they sit in the Machine. Implementing functionality such as flash loans would allow the DAO to play an active, positive role in governance in the various NFT communities we hold.",
  },
  {
    question: "Contract addresses?",
    answer: (
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="mb-1 font-bold">Base</p>
          <AddressRow
            label="Machine"
            address={EVM_MACHINE_ADDRESS}
            href={`${BASE_EXPLORER_URL}/address/${EVM_MACHINE_ADDRESS}`}
          />
          <AddressRow
            label="Common capsule"
            address={EVM_NFT_ADDRESSES.COMMON}
            href={`${BASE_EXPLORER_URL}/address/${EVM_NFT_ADDRESSES.COMMON}`}
          />
          <AddressRow
            label="Rare capsule"
            address={EVM_NFT_ADDRESSES.RARE}
            href={`${BASE_EXPLORER_URL}/address/${EVM_NFT_ADDRESSES.RARE}`}
          />
          <AddressRow
            label="Epic capsule"
            address={EVM_NFT_ADDRESSES.EPIC}
            href={`${BASE_EXPLORER_URL}/address/${EVM_NFT_ADDRESSES.EPIC}`}
          />
        </div>
        <div className="space-y-1">
          <p className="mb-1 font-bold">Sui</p>
          <AddressRow
            label="Package"
            address={SUI_CONTRACT_ADDRESS}
            href={`${EXPLORER_URL}package/${SUI_CONTRACT_ADDRESS}`}
          />
          <AddressRow
            label="Machine"
            address={SUI_MACHINE_ID}
            href={`${EXPLORER_URL}object/${SUI_MACHINE_ID}`}
          />
        </div>
      </div>
    ),
  },
]

function WarningMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M12 2.4 22.4 21.2H1.6L12 2.4Z"
        fill="#ffe500"
        className="dark:fill-[#c9b000]"
        stroke="#111"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.2v5.4"
        stroke="#111"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
      <circle cx="12" cy="17.4" r="1" fill="#111" />
    </svg>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-labelledby="faq-heading"
      className="rounded-md border-[2.5px] border-neutral-900 bg-white p-[3px] shadow-[2px_2px_0_0_rgba(0,0,0,0.12)] dark:border-neutral-500 dark:bg-gray-900 dark:shadow-[2px_2px_0_0_rgba(0,0,0,0.45)]"
    >
      <div className="overflow-hidden rounded-[2px] border border-neutral-900 dark:border-neutral-500">
        <header className="flex items-center justify-center gap-2 border-b border-neutral-900 bg-[#ffe500] px-3 py-1.5 dark:border-neutral-600 dark:bg-[#c9b000]">
          <WarningMark />
          <h2 id="faq-heading" className="faq-panel-title">
            Frequently Asked Questions
          </h2>
        </header>
        <div className="faq-panel-body bg-white px-3 py-2 text-[13px] leading-[1.55] text-neutral-900 dark:bg-gray-800 dark:text-neutral-100">
          {faqItems.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div key={faq.question} className="border-b border-neutral-900/15 last:border-b-0 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-2 rounded-none bg-transparent px-1 py-2 text-left text-neutral-900 hover:bg-transparent dark:text-neutral-100"
                >
                  <span
                    className="mt-[0.45em] h-[0.55em] w-[0.55em] shrink-0 rounded-full bg-[#e31c23]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 font-bold">{faq.question}</span>
                  <motion.svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </motion.svg>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-2.5 pl-[1.05rem] pr-1">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}

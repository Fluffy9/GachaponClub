"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CONTRACT_LINKS,
  CONTRACTS_QUESTION,
  FAQ_TEXT_ITEMS,
} from "../lib/faq-content"

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
  ...FAQ_TEXT_ITEMS.map((item) => ({
    question: item.question,
    answer: item.answer,
  })),
  {
    question: CONTRACTS_QUESTION,
    answer: (
      <div className="space-y-3">
        {(['Base', 'Sui'] as const).map((chain) => (
          <div key={chain} className="space-y-1">
            <p className="mb-1 font-bold">{chain}</p>
            {CONTRACT_LINKS.filter((link) => link.chain === chain).map((link) => (
              <AddressRow
                key={`${link.chain}-${link.label}`}
                label={link.label}
                address={link.address}
                href={link.href}
              />
            ))}
          </div>
        ))}
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
            Information
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

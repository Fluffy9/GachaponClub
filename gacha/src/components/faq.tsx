"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface FAQItem {
  question: string
  answer: string
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
    answer: "Any NFT is (theoretically) capable of being donated to the machine but only admin approved NFT collections are allowed to be donated. By donating, you will receive a capsule of the same tier.",
  },
  {
    question: "How do I open a capsule?",
    answer:
      "After purchasing your capsule, click on it inside your inventory to open it! Be certain that you want to open it, as this cannot be undone. As a technical side note, the NFT you will receive is determined by the smart contract (machine) at the time of opening, so you can only win items that exist in the machine at that point.",
  },
  {
    question: "How do prize tiers work? (Technically)",
    answer: "Each capsule tier (common, rare, epic at this time) has a number of NFT collections that are possible prizes. The machine will randomly select one of the NFTs in the tier to be the prize.",
  },
  {
    question: "Tokenomics / Technical implications?",
    answer: "The capsule prize is decided upon redemption. Because of this, the value of a capsule can be roughly described as a probability based on the smart contract's (machine) holdings, what is within its prize tier, and how many capsules of this type are in the wild. This does dictate a mathematically provable floor price for capsule NFTs. The admin may also decide to increase or decrease the price of capsules in the smart contract based on market factors. There is also some very interesting price action that may occur based on what people THINK will be donated and when. For example, if someone plans to donate a Blue Chip NFT worth a million dollars to the machine, it suddenly makes mathematical sense to buy capsules now and use them after it's donated. In a way, it can also serve as an index to invest in the NFTs on a particular chain.",
  },
  {
    question: "Long term goal?",
    answer: "Longer term, I see this project becoming owned and run by a DAO that is stewarding the Machine holdings. As it collects more and more NFTs, it becomes important to think about what value those NFTs can bring while they sit in the Machine. Implementing functionality such as flash loans would allow the DAO to play an active, positive role in governance in the various NFT communities we hold.",
  }
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {faqItems.map((faq, index) => (
        <motion.div
          key={index}
          variants={item}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 shadow-md border border-[#b480e4]/30 dark:border-[#b480e4]/20"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full text-left flex justify-between items-center"
          >
            <span className="font-medium text-[#b480e4] dark:text-[#c99df0] pixel-text">{faq.question}</span>
            <motion.svg
              className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]"
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="mt-2 text-gray-700 dark:text-gray-300 font-mono">{faq.answer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </motion.div>
  )
}

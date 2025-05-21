import React from 'react';

interface PriceTagProps {
  price: string;
}

export function PriceTag({ price }: PriceTagProps) {
  return (
    <div className="badge text-[#b480e4] dark:text-[#c99df0]">
      <span className="badge-text pixel-text">{price}</span>
    </div>
  );
}

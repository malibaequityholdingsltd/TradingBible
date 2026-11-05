// TradingBible Coin currency mark — U+E000 from the TradingBible Coin font.
// This is a text character, not the full logo. Inherits color/size.
import React from 'react';

export function TbcSign({ className = '', title = 'TBC' }) {
  return (
    <span className={`tbc-sign ${className}`} title={title} aria-label="TBC">
      <span className="tbc-symbol" aria-hidden>&#xE000;</span>
    </span>
  );
}

export function TbcMoney({ amount = 0, className = '', maximumFractionDigits = 2 }) {
  const n = Number(amount) || 0;
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <TbcSign />
      <span className="font-mono">
        {n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits })}
      </span>
    </span>
  );
}

export default TbcSign;

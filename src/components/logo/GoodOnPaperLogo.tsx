import { useState } from 'react';

export function GoodOnPaperLogo() {
  const [hovered, setHovered] = useState(false);

  const hidden = `inline-flex overflow-hidden transition-all duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] ${hovered ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'
    }`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex text-4xl font-bold tracking-tight cursor-pointer select-none whitespace-pre [@media(hover:hover)]:w-60"
      aria-label='Good On Paper'
    >
      <span>G</span>
      <span className={hidden}>ood on </span>
      <span>P</span>
      <span className={hidden}>aper</span>
    </div>
  );
}

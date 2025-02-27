import { memo } from 'react';

export interface MagicTitleProps {
  children: string;
}

const MagicTitle = memo(function MagicTitle({ children }: MagicTitleProps) {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-emerald-300 bg-clip-text text-6xl leading-tight font-extrabold text-transparent">
      {children}
    </span>
  );
});

export default MagicTitle;

import { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}

export default function GlassCard({ children, className = '', hover = false, style }: GlassCardProps) {
  const classes = ['glass-panel', hover ? 'hover-effect' : '', className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}


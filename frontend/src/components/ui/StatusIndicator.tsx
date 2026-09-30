import { twMerge } from 'tailwind-merge';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'loading';
  label?: string;
}

export default function StatusIndicator({ status, label }: StatusIndicatorProps) {
  let bgColor = 'var(--text-muted)';
  let animation = '';

  if (status === 'online') {
    bgColor = 'var(--accent-success)';
    animation = 'pulse 2s infinite';
  } else if (status === 'loading') {
    bgColor = 'var(--accent-warning)';
    animation = 'pulse 1s infinite';
  } else if (status === 'offline') {
    bgColor = 'var(--text-muted)';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: bgColor,
          animation,
          flexShrink: 0,
        }}
      />
      {label && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

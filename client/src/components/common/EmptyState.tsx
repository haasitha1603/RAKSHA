import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'map' | 'guardians' | 'phone' | 'reports' | 'history' | 'search';
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'map',
  actionLabel,
  onAction,
  actionHref,
}) => {
  const renderIllustration = () => {
    switch (icon) {
      case 'guardians':
        return (
          <svg className="w-24 h-24 text-primary/40 mx-auto" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
            <circle cx="36" cy="40" r="12" stroke="currentColor" strokeWidth="4" />
            <circle cx="64" cy="40" r="12" stroke="currentColor" strokeWidth="4" />
            <path d="M20 75 C20 60 32 56 36 56 C40 56 46 62 50 62 C54 62 60 56 64 56 C68 56 80 60 80 75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-24 h-24 text-primary/40 mx-auto" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
            <rect x="34" y="24" width="32" height="52" rx="6" stroke="currentColor" strokeWidth="4" />
            <line x1="44" y1="30" x2="56" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="68" r="3" fill="currentColor" />
          </svg>
        );
      case 'reports':
        return (
          <svg className="w-24 h-24 text-primary/40 mx-auto" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
            <path d="M50 25 L75 70 H25 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <line x1="50" y1="42" x2="50" y2="54" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="62" r="2.5" fill="currentColor" />
          </svg>
        );
      default:
        return (
          <svg className="w-24 h-24 text-primary/40 mx-auto" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
            <path d="M30 40 L50 25 L70 40 V75 H30 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="50" cy="52" r="8" stroke="currentColor" strokeWidth="3" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-card bg-surface/50 border border-dashed border-border my-4">
      {renderIllustration()}
      <h3 className="mt-4 text-base font-bold text-text">{title}</h3>
      <p className="mt-1 text-sm text-text-muted max-w-sm">{description}</p>
      {(actionLabel && (onAction || actionHref)) && (
        <div className="mt-5">
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary-hover transition-colors"
            >
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary-hover transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

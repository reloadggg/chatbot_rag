import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

const cx = (className?: string) =>
  className ? `h-4 w-4 ${className}` : 'h-4 w-4';

export const ChatBubbleIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const BookIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <path d="M7 4h6l4 4v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    <path d="M13 4v4h4" />
  </svg>
);

export const ProvidersIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <rect x="5" y="7" width="14" height="10" rx="2" />
    <path d="M9 11h6M9 15h6" />
    <path d="M8 4v3m4-3v3m4-3v3M8 17v3m4-3v3m4-3v3" />
  </svg>
);

export const UserIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <path d="M5 20a7 7 0 0114 0" />
    <circle cx="12" cy="9" r="4" />
  </svg>
);

export const LockIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M9 11V8a3 3 0 016 0v3" />
  </svg>
);

export const LogoutIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <path d="M14 5h3a2 2 0 012 2v10a2 2 0 01-2 2h-3" />
    <path d="M4 12h11" />
    <path d="M7 9l-3 3 3 3" />
  </svg>
);

export const InfoIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(className)}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

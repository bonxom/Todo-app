import { useId, type SVGProps } from "react";

type OrbitProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export default function Orbit({ title, ...props }: OrbitProps) {
  const id = useId();
  const ringGrad = `${id}-ringGrad`;
  const orbitGrad = `${id}-orbitGrad`;
  const cyanGrad = `${id}-cyanGrad`;
  const glow = `${id}-glow`;
  const softGlow = `${id}-softGlow`;
  const titleId = `${id}-title`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 371 302"
      width={371}
      height={302}
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title && <title id={titleId}>{title}</title>}
      <defs>
        <linearGradient id={ringGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f6d9f" />
          <stop offset="100%" stopColor="#245d8c" />
        </linearGradient>
        <linearGradient id={orbitGrad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5153c7" />
          <stop offset="100%" stopColor="#4e5cc8" />
        </linearGradient>
        <linearGradient id={cyanGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#27c9de" />
          <stop offset="100%" stopColor="#17b9d1" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="#31d9ef" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#31d9ef" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#31d9ef" stopOpacity="0" />
        </radialGradient>
        <filter id={softGlow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <circle
        cx="188"
        cy="173"
        r="48"
        fill={`url(#${glow})`}
        filter={`url(#${softGlow})`}
      />
      <path
        d="M244 83 A90 90 0 1 0 286 128"
        fill="none"
        stroke={`url(#${ringGrad})`}
        strokeWidth="23"
        strokeLinecap="butt"
      />
      <path
        d="M293 112 C329 110 345 115 340 133 C333 159 283 190 218 215 C151 241 87 252 61 244 C43 238 48 219 86 197"
        fill="none"
        stroke={`url(#${orbitGrad})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="267" cy="103" r="21" fill={`url(#${cyanGrad})`} />
      <path
        d="M160 171 L181 192 L224 151"
        fill="none"
        stroke={`url(#${cyanGrad})`}
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

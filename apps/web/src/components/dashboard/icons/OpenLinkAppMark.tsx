type OpenLinkAppMarkProps = {
  size?: number
}

/** Top-left product mark — neutral; brand orange stays elsewhere as a rare accent. */
export default function OpenLinkAppMark({ size = 36 }: OpenLinkAppMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
    >
      <rect
        width="40"
        height="40"
        rx="11"
        fill="#161616"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1"
      />
      <path
        fill="#fafafa"
        fillRule="evenodd"
        d="M14 20.2a5.2 5.2 0 0 1 5.2-5.2h1.8V12H19.2A7.2 7.2 0 0 0 12 19.2 7.2 7.2 0 0 0 19.2 26.4h1.8v-2.9H19.2a5.2 5.2 0 0 1-5.2-5.3Zm11.8-7.1h1.8A7.2 7.2 0 0 1 34 20.2 7.2 7.2 0 0 1 26.8 27.3H25v2.9h1.8A10 10 0 0 0 37 20.2 10 10 0 0 0 27 10.1h-1.8v3Z"
      />
    </svg>
  )
}

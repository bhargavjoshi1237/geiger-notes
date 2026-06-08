import React from "react";

const LOGO_STRIPES = [
  "M427.054 1.17427C431.046 1.15338 464.984 0.670938 466.079 1.40804C466.298 4.01125 464.421 3.92073 463.267 6.18971C450.436 31.3381 435.978 55.3181 422.003 79.8289L339.669 223C327.843 243.287 317.065 263.871 304.413 283.952L285.161 283.494C273.521 283.311 254.97 282.561 244.096 284C255.18 269.451 265.622 246.845 275.646 231.004C280.056 224.033 284.971 216.613 289.146 209.596C302.879 186.047 316.389 162.368 329.675 138.564C346.203 109.513 363.065 80.653 380.256 51.9898C390.11 35.4483 398.71 17.3651 409.366 1.55774C415.08 1.29513 421.301 1.29165 427.054 1.17427Z",
  "M218.309 1.31216L224 1.15608L193.641 50.3271L170.178 91.0997L136.561 149.51L124.008 172.428L103.37 206.726L77.2097 251.035L57.3197 283.677L6.18221 283.433L0 284.156L22.4687 244.331L54.6016 189.816L75.3213 152.467L94.3273 119.376L144.096 31L161 1.15608L218.309 1.31216Z",
  "M344.758 0L345.096 0.735049C326.643 33.9528 307.753 66.9251 288.428 99.6433C284.236 106.683 278.484 114.061 274.613 121.064C265.581 137.399 256.332 153.496 247.097 169.697L208.592 236.882C199.377 253.009 192.444 267.92 180.666 282.525C163.285 284.093 142.445 282.6 123.432 284L123.098 283.728C123.005 282.163 127.788 276.233 129.062 273.917C135.826 261.605 142.61 249.297 149.637 237.134L240.526 79.7429C249.025 64.9272 257.723 50.1984 266.187 35.3414C268.992 30.4177 277.596 15 285.096 0.735052C305.596 0.735046 325.596 0.735049 344.131 0.1168L344.758 0Z",
];

const STRIPE_REELS = [
  {
    path: LOGO_STRIPES[1],
    vector: { x: -240, y: 405 },
  },
  {
    path: LOGO_STRIPES[2],
    vector: { x: 240, y: -405 },
  },
  {
    path: LOGO_STRIPES[0],
    vector: { x: 240, y: -405 },
  },
];

const REEL_DURATION = "2.65s";
const REEL_MIDPOINT = "0.3585";
const REEL_HOLD_START = "0.7170";

const RollingLogo = () => {
  const maskId = React.useId();

  return (
    <svg
      width="467"
      height="285"
      viewBox="0 0 467 285"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-28 w-28 opacity-[0.08]"
    >
      <defs>
        <clipPath id={maskId}>
          <rect width="467" height="285" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${maskId})`}>
        {STRIPE_REELS.map(({ path, vector }, index) => {
          return (
            <g key={index} className="rolling-logo-stripe">
              <animateTransform
                className="rolling-logo-motion"
                attributeName="transform"
                type="translate"
                values={`0 0; ${vector.x} ${vector.y}; ${vector.x * 2} ${vector.y * 2}; ${vector.x * 2} ${vector.y * 2}`}
                keyTimes={`0; ${REEL_MIDPOINT}; ${REEL_HOLD_START}; 1`}
                dur={REEL_DURATION}
                repeatCount="indefinite"
              />
              <path d={path} fill="white" />
              <path
                d={path}
                fill="white"
                transform={`translate(${-vector.x} ${-vector.y})`}
              />
              <path
                d={path}
                fill="white"
                transform={`translate(${-vector.x * 2} ${-vector.y * 2})`}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const CanvasSkeleton = () => {
  return (
    <div className="flex-1 relative h-full w-full bg-transparent overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#999 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="absolute inset-0 flex items-center -mt-20 justify-center pointer-events-none">
        <RollingLogo />
      </div>

      <div className="absolute bottom-10 right-10 flex items-center gap-2 text-zinc-500 text-sm font-medium animate-pulse">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
        Loading Canvas...
      </div>
    </div>
  );
};

export default CanvasSkeleton;

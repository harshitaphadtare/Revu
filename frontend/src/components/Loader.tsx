export function Loader() {
  return (
    <div className="loader-wrapper">
      <svg 
        aria-label="loader being flipped clockwise and circled by three white curves fading in and out" 
        role="img" 
        height="56px" 
        width="56px" 
        viewBox="0 0 56 56" 
        className="loader"
      >
        <clipPath id="sand-mound-top">
          <path d="M 14.613 13.087 C 15.814 12.059 19.3 8.039 20.3 6.539 C 21.5 4.789 21.5 2.039 21.5 2.039 L 3 2.039 C 3 2.039 3 4.789 4.2 6.539 C 5.2 8.039 8.686 12.059 9.887 13.087 C 11 14.039 12.25 14.039 12.25 14.039 C 12.25 14.039 13.5 14.039 14.613 13.087 Z" className="loader__sand-mound-top" />
        </clipPath>
        <clipPath id="sand-mound-bottom">
          <path d="M 14.613 20.452 C 15.814 21.48 19.3 25.5 20.3 27 C 21.5 28.75 21.5 31.5 21.5 31.5 L 3 31.5 C 3 31.5 3 28.75 4.2 27 C 5.2 25.5 8.686 21.48 9.887 20.452 C 11 19.5 12.25 19.5 12.25 19.5 C 12.25 19.5 13.5 19.5 14.613 20.452 Z" className="loader__sand-mound-bottom" />
        </clipPath>
        <g transform="translate(2,2)">
          <g transform="rotate(-90,26,26)" strokeLinecap="round" strokeDashoffset="153.94" strokeDasharray="153.94 153.94" stroke="currentColor" fill="none">
            <circle transform="rotate(0,26,26)" r="24.5" cy={26} cx={26} strokeWidth="2.5" className="loader__motion-thick" />
            <circle transform="rotate(90,26,26)" r="24.5" cy={26} cx={26} strokeWidth="1.75" className="loader__motion-medium" />
            <circle transform="rotate(180,26,26)" r="24.5" cy={26} cx={26} strokeWidth={1} className="loader__motion-thin" />
          </g>
          <g transform="translate(13.75,9.25)" className="loader__model">
            <path d="M 1.5 2 L 23 2 C 23 2 22.5 8.5 19 12 C 16 15.5 13.5 13.5 13.5 16.75 C 13.5 20 16 18 19 21.5 C 22.5 25 23 31.5 23 31.5 L 1.5 31.5 C 1.5 31.5 2 25 5.5 21.5 C 8.5 18 11 20 11 16.75 C 11 13.5 8.5 15.5 5.5 12 C 2 8.5 1.5 2 1.5 2 Z" fill="hsl(243, 75%, 75%)" />
            <g strokeLinecap="round" stroke="hsl(243, 85%, 85%)">
              <line y2="20.75" x2={12} y1="15.75" x1={12} strokeDasharray="0.25 33.75" strokeWidth={1} className="loader__sand-grain-left" />
              <line y2="21.75" x2="12.5" y1="16.75" x1="12.5" strokeDasharray="0.25 33.75" strokeWidth={1} className="loader__sand-grain-right" />
              <line y2="31.5" x2="12.25" y1={18} x1="12.25" strokeDasharray="0.5 107.5" strokeWidth={1} className="loader__sand-drop" />
              <line y2="31.5" x2="12.25" y1="14.75" x1="12.25" strokeDasharray="54 54" strokeWidth="1.5" className="loader__sand-fill" />
              <line y2="31.5" x2={12} y1={16} x1={12} strokeDasharray="1 107" strokeWidth={1} stroke="hsl(243, 80%, 70%)" className="loader__sand-line-left" />
              <line y2="31.5" x2="12.5" y1={16} x1="12.5" strokeDasharray="12 96" strokeWidth={1} stroke="hsl(243, 80%, 70%)" className="loader__sand-line-right" />
              <g strokeWidth={0} fill="hsl(243, 85%, 85%)">
                <path d="M 12.25 15 L 15.392 13.486 C 21.737 11.168 22.5 2 22.5 2 L 2 2.013 C 2 2.013 2.753 11.046 9.009 13.438 L 12.25 15 Z" clipPath="url(#sand-mound-top)" />
                <path d="M 12.25 18.5 L 15.392 20.014 C 21.737 22.332 22.5 31.5 22.5 31.5 L 2 31.487 C 2 31.487 2.753 22.454 9.009 20.062 Z" clipPath="url(#sand-mound-bottom)" />
              </g>
            </g>
            <g strokeWidth={2} strokeLinecap="round" opacity="0.7" fill="none">
              <path d="M 19.437 3.421 C 19.437 3.421 19.671 6.454 17.914 8.846 C 16.157 11.238 14.5 11.5 14.5 11.5" stroke="hsl(0,0%,100%)" className="loader__glare-top" />
              <path transform="rotate(180,12.25,16.75)" d="M 19.437 3.421 C 19.437 3.421 19.671 6.454 17.914 8.846 C 16.157 11.238 14.5 11.5 14.5 11.5" stroke="hsla(0,0%,100%,0)" className="loader__glare-bottom" />
            </g>
            <rect height={2} width="24.5" fill="hsl(243, 75%, 59%)" />
            <rect height={1} width="19.5" y="0.5" x="2.5" ry="0.5" rx="0.5" fill="hsl(243, 75%, 65%)" />
            <rect height={2} width="24.5" y="31.5" fill="hsl(243, 75%, 59%)" />
            <rect height={1} width="19.5" y={32} x="2.5" ry="0.5" rx="0.5" fill="hsl(243, 75%, 65%)" />
          </g>
        </g>
      </svg>

      <style>{`
        .loader-wrapper {
          --dur: 2s;
        }
        
        .loader {
          display: block;
          margin: auto;
          width: 14em;
          height: auto;
          color: hsl(243, 75%, 90%);
        }
        
        .loader__glare-top,
        .loader__glare-bottom,
        .loader__model,
        .loader__motion-thick,
        .loader__motion-medium,
        .loader__motion-thin,
        .loader__sand-drop,
        .loader__sand-fill,
        .loader__sand-grain-left,
        .loader__sand-grain-right,
        .loader__sand-line-left,
        .loader__sand-line-right,
        .loader__sand-mound-top,
        .loader__sand-mound-bottom {
          animation-duration: var(--dur);
          animation-timing-function: cubic-bezier(0.83, 0, 0.17, 1);
          animation-iteration-count: infinite;
        }
        
        .loader__glare-top {
          animation-name: glare-top;
        }
        .loader__glare-bottom {
          animation-name: glare-bottom;
        }
        .loader__model {
          animation-name: loader-flip;
          transform-origin: 12.25px 16.75px;
        }
        .loader__motion-thick,
        .loader__motion-medium,
        .loader__motion-thin {
          transform-origin: 26px 26px;
        }
        .loader__motion-thick {
          animation-name: motion-thick;
        }
        .loader__motion-medium {
          animation-name: motion-medium;
        }
        .loader__motion-thin {
          animation-name: motion-thin;
        }
        .loader__sand-drop {
          animation-name: sand-drop;
        }
        .loader__sand-fill {
          animation-name: sand-fill;
        }
        .loader__sand-grain-left {
          animation-name: sand-grain-left;
        }
        .loader__sand-grain-right {
          animation-name: sand-grain-right;
        }
        .loader__sand-line-left {
          animation-name: sand-line-left;
        }
        .loader__sand-line-right {
          animation-name: sand-line-right;
        }
        .loader__sand-mound-top {
          animation-name: sand-mound-top;
        }
        .loader__sand-mound-bottom {
          animation-name: sand-mound-bottom;
          transform-origin: 12.25px 31.5px;
        }

        @keyframes loader-flip {
          from {
            transform: translate(13.75px, 9.25px) rotate(-180deg);
          }
          24%,
          to {
            transform: translate(13.75px, 9.25px) rotate(0);
          }
        }
        @keyframes glare-top {
          from {
            stroke: rgba(255, 255, 255, 0);
          }
          24%,
          to {
            stroke: white;
          }
        }
        @keyframes glare-bottom {
          from {
            stroke: white;
          }
          24%,
          to {
            stroke: rgba(255, 255, 255, 0);
          }
        }
        @keyframes motion-thick {
          from {
            animation-timing-function: cubic-bezier(0.33, 0, 0.67, 0);
            stroke: rgba(99, 102, 241, 0);
            stroke-dashoffset: 153.94;
            transform: rotate(0.67turn);
          }
          20% {
            animation-timing-function: cubic-bezier(0.33, 1, 0.67, 1);
            stroke: rgb(99, 102, 241);
            stroke-dashoffset: 141.11;
            transform: rotate(1turn);
          }
          40%,
          to {
            stroke: rgba(99, 102, 241, 0);
            stroke-dashoffset: 153.94;
            transform: rotate(1.33turn);
          }
        }
        @keyframes motion-medium {
          from,
          8% {
            animation-timing-function: cubic-bezier(0.33, 0, 0.67, 0);
            stroke: rgba(147, 150, 245, 0);
            stroke-dashoffset: 153.94;
            transform: rotate(0.5turn);
          }
          20% {
            animation-timing-function: cubic-bezier(0.33, 1, 0.67, 1);
            stroke: rgb(147, 150, 245);
            stroke-dashoffset: 147.53;
            transform: rotate(0.83turn);
          }
          32%,
          to {
            stroke: rgba(147, 150, 245, 0);
            stroke-dashoffset: 153.94;
            transform: rotate(1.17turn);
          }
        }
        @keyframes motion-thin {
          from,
          4% {
            animation-timing-function: cubic-bezier(0.33, 0, 0.67, 0);
            stroke: rgba(129, 133, 243, 0);
            stroke-dashoffset: 153.94;
            transform: rotate(0.33turn);
          }
          24% {
            animation-timing-function: cubic-bezier(0.33, 1, 0.67, 1);
            stroke: rgb(129, 133, 243);
            stroke-dashoffset: 134.7;
            transform: rotate(0.67turn);
          }
          44%,
          to {
            stroke: rgba(129, 133, 243, 0);
            stroke-dashoffset: 153.94;
            transform: rotate(1turn);
          }
        }
        @keyframes sand-drop {
          from,
          10% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            stroke-dashoffset: 1;
          }
          70%,
          to {
            stroke-dashoffset: -107;
          }
        }
        @keyframes sand-fill {
          from,
          10% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            stroke-dashoffset: 55;
          }
          70%,
          to {
            stroke-dashoffset: -54;
          }
        }
        @keyframes sand-grain-left {
          from,
          10% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            stroke-dashoffset: 29;
          }
          70%,
          to {
            stroke-dashoffset: -22;
          }
        }
        @keyframes sand-grain-right {
          from,
          10% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            stroke-dashoffset: 27;
          }
          70%,
          to {
            stroke-dashoffset: -24;
          }
        }
        @keyframes sand-line-left {
          from,
          10% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            stroke-dashoffset: 53;
          }
          70%,
          to {
            stroke-dashoffset: -55;
          }
        }
        @keyframes sand-line-right {
          from,
          10% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            stroke-dashoffset: 14;
          }
          70%,
          to {
            stroke-dashoffset: -24.5;
          }
        }
        @keyframes sand-mound-top {
          from,
          10% {
            animation-timing-function: linear;
            transform: translate(0, 0);
          }
          15% {
            animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0);
            transform: translate(0, 1.5px);
          }
          51%,
          to {
            transform: translate(0, 13px);
          }
        }
        @keyframes sand-mound-bottom {
          from,
          31% {
            animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1);
            transform: scale(1, 0);
          }
          56%,
          to {
            transform: scale(1, 1);
          }
        }
      `}</style>
    </div>
  );
}

const ORBIT_BODY_PATH =
  'M154.446 0.37392C135.575 -0.988292 116.621 1.37971 98.665 7.34273C80.7094 13.3057 64.1041 22.747 49.7972 35.1274C35.4903 47.5079 23.762 62.585 15.2819 79.498C6.80188 96.4111 1.73613 114.829 0.37392 133.7C-0.988292 152.57 1.37971 171.525 7.34273 189.48C13.3057 207.436 22.747 224.041 35.1274 238.348C47.5079 252.655 62.585 264.383 79.498 272.863C96.4111 281.343 114.829 286.409 133.7 287.771C171.813 290.522 209.459 278.02 238.355 253.015C267.251 228.01 285.03 192.55 287.781 154.436C290.532 116.323 278.03 78.6771 253.024 49.7813C228.019 20.8855 192.559 3.10644 154.446 0.35533V0.37392Z';

const ORBIT_GLOW_PATH =
  'M37.6856 118.739C37.6856 118.739 12.864 215.632 96.8521 272.12C167.872 319.902 239.602 221.788 186.21 171.728C149.585 137.45 148.674 111.796 146.343 78.3867C142.645 25.3162 66.7116 0.692728 37.6856 118.766V118.739Z';

function OrbitBody() {
  return (
    <div className="absolute inset-[57.69%_49.35%_-57.05%_-48.72%]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 288.155 288.146">
        <g filter="url(#orina-orbit-inner-shadow)">
          <path d={ORBIT_BODY_PATH} fill="url(#orina-orbit-body-green)" />
          <path d={ORBIT_BODY_PATH} fill="url(#orina-orbit-body-rim)" />
        </g>
        <defs>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="288.146" id="orina-orbit-inner-shadow" width="288.155" x="0" y="0">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset />
            <feGaussianBlur stdDeviation="13.5" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.917667 0 0 0 0 0.683333 0 0 0 0 1 0 0 0 0.44 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow" />
          </filter>
          <radialGradient cx="0" cy="0" gradientTransform="translate(-9.13308 22.401) rotate(44.18) scale(414.137 414.137)" gradientUnits="userSpaceOnUse" id="orina-orbit-body-green" r="1">
            <stop offset="0.63" stopColor="#00DF81" />
            <stop offset="1" stopColor="white" />
          </radialGradient>
          <radialGradient cx="0" cy="0" gradientTransform="translate(280.884 190.896) rotate(-159.42) scale(331.003 331.003)" gradientUnits="userSpaceOnUse" id="orina-orbit-body-rim" r="1">
            <stop stopColor="#00DF81" />
            <stop offset="0.74" stopColor="#022221" />
            <stop offset="0.94" stopColor="#2CC295" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

function OrbitGlow() {
  return (
    <div className="relative size-full">
      <div className="absolute inset-[-13.67%_-20.09%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 239.033 319.149">
          <g filter="url(#orina-orbit-foreground-blur)" opacity="0.15">
            <path d={ORBIT_GLOW_PATH} fill="url(#orina-orbit-glow-gradient)" />
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="319.149" id="orina-orbit-foreground-blur" width="239.033" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="17.13" />
            </filter>
            <radialGradient cx="0" cy="0" gradientTransform="matrix(-7.50093 172.864 -144.169 -7.17136 148.572 89.8577)" gradientUnits="userSpaceOnUse" id="orina-orbit-glow-gradient" r="1">
              <stop stopColor="#2CC295" />
              <stop offset="1" stopColor="#00DF81" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export function OrinaOrbit() {
  return (
    <div className="relative size-full" aria-hidden="true">
      <OrbitBody />
      <div className="absolute flex inset-[35.9%_24.77%_-39.05%_-26.92%] items-center justify-center">
        <div className="flex-none h-[250.629px] rotate-[136.47deg] w-[170.513px]">
          <OrbitGlow />
        </div>
      </div>
    </div>
  );
}

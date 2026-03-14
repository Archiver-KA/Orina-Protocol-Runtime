import svgPaths from "./svg-zhihzkjx2q";

function Moon() {
  return (
    <div className="absolute left-[56px] size-[14px] top-[11px]" data-name="Moon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Moon">
          <path d={svgPaths.p3283c680} id="Vector" stroke="var(--stroke-0, #3B3B3B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Span() {
  return (
    <div className="absolute h-[18px] left-[78px] top-[9px] w-[27.021px]" data-name="span">
      <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[18px] left-[14.5px] not-italic text-[#3b3b3b] text-[12px] text-center top-[0.33px] whitespace-nowrap">Dark</p>
    </div>
  );
}

function Div() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.12)] h-[20px] left-[12px] rounded-[44739200px] top-[8px] w-[36px]" data-name="div">
      <div aria-hidden="true" className="absolute border-[1.333px] border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none rounded-[44739200px]" />
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.06)] border-[1.333px] border-[rgba(255,255,255,0.12)] border-solid h-[38.667px] left-0 rounded-[44739200px] top-0 w-[119.688px]" data-name="button">
      <Moon />
      <Span />
      <Div />
    </div>
  );
}

export default function Frame() {
  return (
    <div className="relative size-full">
      <Button />
    </div>
  );
}
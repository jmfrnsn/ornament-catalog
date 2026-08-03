"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Indicator = {
  y: number;
  height: number;
  visible: boolean;
};

type SlidingHighlightContextValue = {
  setActiveRow: (element: HTMLElement | null) => void;
};

const SlidingHighlightContext =
  createContext<SlidingHighlightContextValue | null>(null);

const ScrambleRowContext = createContext(false);

export function ScrambleTextProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <ScrambleRowContext.Provider value={active}>
      {children}
    </ScrambleRowContext.Provider>
  );
}

export function useScrambleRowActive(): boolean {
  return useContext(ScrambleRowContext);
}

function useSlidingHighlightContext(): SlidingHighlightContextValue {
  const context = useContext(SlidingHighlightContext);
  if (!context) {
    throw new Error(
      "SlidingHighlightRow must be used within SlidingHighlightList",
    );
  }
  return context;
}

/** Activate the sliding highlight from a custom row (link, button, etc.). */
export function useSlidingHighlight(): SlidingHighlightContextValue {
  return useSlidingHighlightContext();
}

function getRowOffset(list: HTMLElement, row: HTMLElement): Indicator {
  const listRect = list.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();

  return {
    y: rowRect.top - listRect.top,
    height: rowRect.height,
    visible: true,
  };
}

type SlidingHighlightListProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Background utility for the sliding bar (default Contents highlight). */
  highlightClassName?: string;
  /** Fires when the pointer leaves the list and the bar hides. */
  onHoverEnd?: () => void;
};

export function SlidingHighlightList({
  children,
  className = "",
  style,
  highlightClassName = "bg-highlight",
  onHoverEnd,
}: SlidingHighlightListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const activeRowRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState<Indicator>({
    y: 0,
    height: 0,
    visible: false,
  });

  const syncIndicator = useCallback(() => {
    const list = listRef.current;
    const row = activeRowRef.current;
    if (!list || !row) return;
    setIndicator(getRowOffset(list, row));
  }, []);

  const setActiveRow = useCallback((element: HTMLElement | null) => {
    activeRowRef.current = element;
    const list = listRef.current;

    if (!element || !list) {
      setIndicator((previous) => ({ ...previous, visible: false }));
      return;
    }

    setIndicator(getRowOffset(list, element));
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new ResizeObserver(syncIndicator);
    observer.observe(list);

    return () => observer.disconnect();
  }, [syncIndicator]);

  const handleMouseLeave = (event: React.MouseEvent<HTMLOListElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && listRef.current?.contains(next)) return;
    activeRowRef.current = null;
    setIndicator((previous) => ({ ...previous, visible: false }));
    onHoverEnd?.();
  };

  return (
    <SlidingHighlightContext.Provider value={{ setActiveRow }}>
      <ol
        ref={listRef}
        className={`relative ${className}`.trim()}
        style={style}
        onMouseLeave={handleMouseLeave}
      >
        <div
          aria-hidden="true"
          className={`sliding-row-highlight pointer-events-none absolute inset-x-0 z-0 ${highlightClassName}`.trim()}
          style={{
            transform: `translate3d(0, ${indicator.y}px, 0)`,
            height: indicator.height,
            opacity: indicator.visible ? 1 : 0,
          }}
        />
        {children}
      </ol>
    </SlidingHighlightContext.Provider>
  );
}

type SlidingHighlightRowProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onActivate?: () => void;
};

export function SlidingHighlightRow({
  href,
  children,
  className = "",
  style,
  onActivate,
}: SlidingHighlightRowProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { setActiveRow } = useSlidingHighlightContext();
  const [scrambleActive, setScrambleActive] = useState(false);

  const activate = () => {
    setActiveRow(linkRef.current);
    setScrambleActive(true);
    onActivate?.();
  };

  const deactivate = () => setScrambleActive(false);

  return (
    <li>
      <ScrambleTextProvider active={scrambleActive}>
        <Link
          ref={linkRef}
          href={href}
          className={`relative z-[1] flex w-full origin-center flex-nowrap items-center gap-2 transition-transform duration-150 ease-out active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:gap-3 ${className}`.trim()}
          style={style}
          onMouseEnter={activate}
          onMouseLeave={deactivate}
          onFocus={activate}
          onBlur={deactivate}
        >
          {children}
        </Link>
      </ScrambleTextProvider>
    </li>
  );
}

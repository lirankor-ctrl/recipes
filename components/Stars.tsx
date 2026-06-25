"use client";

interface StarsProps {
  value: number; // 0..5
  onChange?: (v: number) => void; // when provided, becomes interactive
  size?: number;
}

export default function Stars({ value, onChange, size = 18 }: StarsProps) {
  const interactive = Boolean(onChange);
  return (
    <div className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Star = (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "var(--primary)" : "none"}
            stroke="var(--primary)"
            strokeWidth="1.6"
            aria-hidden
          >
            <path
              d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z"
              strokeLinejoin="round"
            />
          </svg>
        );
        if (!interactive) return <span key={n}>{Star}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n === value ? 0 : n)}
            className="p-0.5"
            aria-label={`דירוג ${n}`}
          >
            {Star}
          </button>
        );
      })}
    </div>
  );
}

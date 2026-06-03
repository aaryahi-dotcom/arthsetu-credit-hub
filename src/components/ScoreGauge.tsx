import { useEffect, useState } from "react";
import { animate } from "motion/react";
import { BAND_LABELS, type ScoreBand } from "@/lib/scoring";

interface Props {
  score: number;
  band?: string;
  size?: number;
}

const MIN = 300;
const MAX = 900;

function bandColor(score: number): string {
  if (score >= 740) return "oklch(0.74 0.15 165)"; // teal-green
  if (score >= 670) return "oklch(0.78 0.13 192)"; // teal
  if (score >= 580) return "oklch(0.8 0.14 80)"; // amber
  return "oklch(0.62 0.21 18)"; // red
}

export function ScoreGauge({ score, band, size = 240 }: Props) {
  const [display, setDisplay] = useState(MIN);

  useEffect(() => {
    const controls = animate(MIN, score, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [score]);

  const stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270deg arc starting at 135deg
  const startAngle = 135;
  const sweep = 270;
  const pct = Math.min(1, Math.max(0, (display - MIN) / (MAX - MIN)));
  const circumference = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circumference;
  const color = bandColor(display);

  const describeArc = () => {
    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const sx = cx + r * Math.cos(rad(startAngle));
    const sy = cy + r * Math.sin(rad(startAngle));
    const ex = cx + r * Math.cos(rad(startAngle + sweep));
    const ey = cy + r * Math.sin(rad(startAngle + sweep));
    return `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;
  };

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <path
          d={describeArc()}
          fill="none"
          stroke="oklch(0.3 0.03 244 / 0.5)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={describeArc()}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLen * pct} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 10px ${color})`, transition: "stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-bold text-foreground">
          {Math.round(display)}
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {band ? BAND_LABELS[band as ScoreBand] ?? band : "ArthSetu Score"}
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground/70">300–900</span>
      </div>
    </div>
  );
}

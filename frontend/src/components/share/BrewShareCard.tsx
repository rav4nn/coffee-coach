import type { FreestyleBrewEntry } from "@/lib/brewHistoryStore";

const BG = "#1a0f00";
const PRIMARY = "#f49d25";
const TEXT = "#f6efe4";
const MUTED = "#94a3b8";
const BORDER = "rgba(244,157,37,0.2)";
const CARD_BG = "rgba(244,157,37,0.06)";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function methodDisplayName(method: string): string {
  const names: Record<string, string> = {
    v60: "V60",
    chemex: "Chemex",
    kalita_wave: "Kalita Wave",
    clever_dripper: "Clever Dripper",
    hario_switch: "Hario Switch",
    pour_over: "Pour Over",
    aeropress: "Aeropress",
    french_press: "French Press",
    moka_pot: "Moka Pot",
    cold_brew: "Cold Brew",
    south_indian_filter: "South Indian Filter",
    wilfa_pour_over: "Wilfa Pour Over",
    origami_dripper: "Origami Dripper",
  };
  return (
    names[method] ??
    method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface BrewShareCardProps {
  entry: FreestyleBrewEntry;
  beanName?: string | null;
}

export function BrewShareCard({ entry, beanName }: BrewShareCardProps) {
  const ratio =
    entry.coffeeGrams > 0
      ? `1:${Math.round(entry.waterMl / entry.coffeeGrams)}`
      : null;

  const grindDisplay = entry.grinderClicks
    ? `${entry.grindSize} · ${entry.grinderClicks} clicks`
    : entry.grindSize;

  const params = [
    { label: "Dose", value: `${entry.coffeeGrams}g` },
    { label: "Water", value: `${entry.waterMl}ml` },
    ...(entry.waterTempC ? [{ label: "Temp", value: `${entry.waterTempC}°C` }] : []),
    { label: "Grind", value: entry.grindSize },
  ];

  return (
    <div
      style={{
        width: 390,
        backgroundColor: BG,
        fontFamily: FONT,
        padding: "20px 20px 0 20px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <p
            style={{
              color: PRIMARY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Coffee Coach
          </p>
          <p
            style={{
              color: TEXT,
              fontSize: 18,
              fontWeight: 800,
              marginTop: 3,
              lineHeight: 1.2,
            }}
          >
            My Brew
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/coach/img3_hero_thumbs_up.png"
          alt="Coach Kapi"
          width={56}
          height={56}
          crossOrigin="anonymous"
          style={{ objectFit: "contain", display: "block" }}
        />
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, backgroundColor: BORDER, marginBottom: 16 }} />

      {/* ── Method badge ── */}
      {entry.methodId && (
        <p
          style={{
            display: "inline-block",
            color: PRIMARY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            backgroundColor: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            padding: "3px 10px",
            marginBottom: 10,
          }}
        >
          {methodDisplayName(entry.methodId)}
        </p>
      )}

      {/* ── Bean name ── */}
      {beanName && (
        <p
          style={{
            color: TEXT,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: 14,
          }}
        >
          {beanName}
        </p>
      )}

      {/* ── Params grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${params.length}, 1fr)`,
          gap: 8,
          marginTop: beanName ? 0 : 10,
        }}
      >
        {params.map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "8px 4px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: MUTED,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </p>
            <p
              style={{
                color: TEXT,
                fontSize: 12,
                fontWeight: 700,
                marginTop: 3,
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Brew time + ratio + clicks row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 10,
          flexWrap: "wrap" as const,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ color: MUTED, fontSize: 11 }}>Brew Time</p>
          <p style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>
            {entry.brewTime}
          </p>
        </div>
        {ratio && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ color: MUTED, fontSize: 11 }}>Ratio</p>
            <p style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>
              {ratio}
            </p>
          </div>
        )}
        {entry.grinderClicks && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ color: MUTED, fontSize: 11 }}>Grind</p>
            <p style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>
              {grindDisplay}
            </p>
          </div>
        )}
        {entry.grinderName && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ color: MUTED, fontSize: 11 }}>Grinder</p>
            <p style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>
              {entry.grinderName}
            </p>
          </div>
        )}
      </div>

      {/* ── Rating ── */}
      {entry.rating != null && (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: PRIMARY, fontSize: 18 }}>★</span>
          <p style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>
            {entry.rating}
            <span style={{ color: MUTED, fontSize: 11, fontWeight: 400 }}>
              /10
            </span>
          </p>
        </div>
      )}

      {/* ── Coaching feedback ── */}
      {entry.coachingFeedback && (
        <div
          style={{
            marginTop: 14,
            backgroundColor: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <p
            style={{
              color: PRIMARY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Coach Says
          </p>
          <p style={{ color: TEXT, fontSize: 12, lineHeight: 1.55 }}>
            {entry.coachingFeedback}
          </p>
        </div>
      )}

      {/* ── Tasting notes ── */}
      {entry.tastingNotes && entry.tastingNotes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p
            style={{
              color: PRIMARY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Tasting Notes
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {entry.tastingNotes.map((note) => (
              <span
                key={note}
                style={{
                  color: PRIMARY,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 20,
                  padding: "3px 10px",
                }}
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div
        style={{
          marginTop: 20,
          borderTop: `1px solid ${BORDER}`,
          paddingTop: 12,
          paddingBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <p style={{ color: MUTED, fontSize: 12 }}>coffeecoach.app</p>
      </div>
    </div>
  );
}

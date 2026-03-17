import type { GuidedRecipe } from "@/lib/api";

const BG = "#1a0f00";
const PRIMARY = "#f49d25";
const TEXT = "#f6efe4";
const MUTED = "#94a3b8";
const BORDER = "rgba(244,157,37,0.2)";
const CARD_BG = "rgba(244,157,37,0.06)";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

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

interface RecipeShareCardProps {
  recipe: GuidedRecipe;
}

export function RecipeShareCard({ recipe }: RecipeShareCardProps) {
  const brewTime = formatSeconds(recipe.brew_time_seconds);
  const ratio =
    recipe.coffee_g > 0
      ? `1:${Math.round(recipe.water_ml / recipe.coffee_g)}`
      : null;

  const params = [
    { label: "Coffee", value: `${recipe.coffee_g}g` },
    { label: "Water", value: `${recipe.water_ml}ml` },
    { label: "Temp", value: `${recipe.water_temp_c}°C` },
    { label: "Grind", value: recipe.grind_size },
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
            Coach Kapi&apos;s Guide
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
        {methodDisplayName(recipe.method)}
      </p>

      {/* ── Title + author ── */}
      <p
        style={{
          color: TEXT,
          fontSize: 19,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {recipe.title}
      </p>
      <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
        by {recipe.author}
      </p>

      {/* ── Params grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginTop: 16,
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
                fontSize: 13,
                fontWeight: 700,
                marginTop: 3,
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Brew time + ratio row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ color: MUTED, fontSize: 11 }}>Brew Time</p>
          <p style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>
            {brewTime}
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
      </div>

      {/* ── Steps ── */}
      {recipe.steps && recipe.steps.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <p
            style={{
              color: PRIMARY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Steps
          </p>
          <div
            style={{
              backgroundColor: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            {recipe.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: i < recipe.steps!.length - 1 ? 8 : 0,
                }}
              >
                <span
                  style={{
                    color: PRIMARY,
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 20,
                    paddingTop: 1,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ flex: 1 }}>
                  {step.time_seconds > 0 && (
                    <span
                      style={{
                        color: PRIMARY,
                        fontSize: 10,
                        fontWeight: 700,
                        marginRight: 4,
                      }}
                    >
                      {formatSeconds(step.time_seconds)}
                    </span>
                  )}
                  <span
                    style={{ color: TEXT, fontSize: 12, lineHeight: 1.45 }}
                  >
                    {step.instruction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expected flavour ── */}
      {recipe.expected_flavour && (
        <div style={{ marginTop: 16 }}>
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
            Expected Taste
          </p>
          <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
            Acidity: {recipe.expected_flavour.acidity}{"  ·  "}
            Sweetness: {recipe.expected_flavour.sweetness}{"  ·  "}
            Body: {recipe.expected_flavour.body}{"  ·  "}
            Bitterness: {recipe.expected_flavour.bitterness}
          </p>
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

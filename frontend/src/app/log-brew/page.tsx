"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import {
  getBrewMethodsApi,
  getUserBeansApi,
  getUserPreferencesApi,
  type ApiUserBean,
  type BrewMethodApi,
} from "@/lib/api";
import { useBeansStore } from "@/lib/beansStore";
import { useLogBrewStore } from "@/lib/logBrewStore";
import { usePreferencesStore } from "@/lib/preferencesStore";

type MethodCardId =
  | "pour_over"
  | "aeropress"
  | "french_press"
  | "moka_pot"
  | "cold_brew"
  | "south_indian_filter";

const SUPPORTED_METHODS: MethodCardId[] = [
  "pour_over",
  "aeropress",
  "french_press",
  "moka_pot",
  "cold_brew",
  "south_indian_filter",
];

const POUR_OVER_DEVICE_ALLOWLIST = new Set([
  "v60",
  "chemex",
  "kalita_wave",
  "clever_dripper",
  "hario_switch",
  "wilfa_pour_over",
  "origami_dripper",
]);

const METHOD_ICON: Record<MethodCardId, string> = {
  pour_over: "water_drop",
  aeropress: "compress",
  french_press: "coffee_maker",
  moka_pot: "soup_kitchen",
  cold_brew: "ac_unit",
  south_indian_filter: "filter_alt",
};

const METHOD_LABEL: Record<MethodCardId, string> = {
  pour_over: "Pour Over",
  aeropress: "AeroPress",
  french_press: "French Press",
  moka_pot: "Moka Pot",
  cold_brew: "Cold Brew",
  south_indian_filter: "Filter Kaapi",
};

const METHOD_IMAGE: Record<MethodCardId, string> = {
  pour_over: "/coach/img1_pour_over.png",
  aeropress: "/coach/img1_aeropress.png",
  french_press: "/coach/img1_french_press.png",
  moka_pot: "/coach/img1_moka_pot.png",
  cold_brew: "/coach/img1_cold_brew.png",
  south_indian_filter: "/coach/img1_filter_kaapi.png",
};

function formatRoastDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LogBrewPage() {
  const router = useRouter();
  const setStepOneSelection = useLogBrewStore((state) => state.setStepOneSelection);
  const setLastUsed = usePreferencesStore((state) => state.setLastUsed);
  const setLocalLastUsed = usePreferencesStore((state) => state.setLocalLastUsed);
  const storedLastBean = usePreferencesStore((state) => state.last_used_bean_id);
  const storedLastMethod = usePreferencesStore((state) => state.last_used_brew_method);
  const persistedBeans = useBeansStore((state) => state.userBeans);

  const [beans, setBeans] = useState<ApiUserBean[]>([]);
  const [methods, setMethods] = useState<BrewMethodApi[]>([]);
  const [pourOverDevices, setPourOverDevices] = useState<BrewMethodApi[]>([]);
  const [selectedBeanId, setSelectedBeanId] = useState<string>("");
  const [selectedMethodId, setSelectedMethodId] = useState<MethodCardId | "">("");
  const [selectedPourOverDeviceId, setSelectedPourOverDeviceId] = useState<string>("");
  const [beanDropdownOpen, setBeanDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hasBeans = beans.length > 0;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [beansResponseRaw, methodsResponse, pourOverResponse, preferencesResponse] =
          await Promise.all([
            getUserBeansApi(),
            getBrewMethodsApi(),
            getBrewMethodsApi("pour_over"),
            getUserPreferencesApi().catch(() => ({
              last_used_bean_id: storedLastBean,
              last_used_brew_method: storedLastMethod,
            })),
          ]);

        if (!mounted) return;

        const beansResponse =
          beansResponseRaw.length > 0
            ? beansResponseRaw
            : persistedBeans.map((bean) => ({
                id: bean.id,
                coffee_id: bean.coffeeId ?? "",
                name: bean.beanName,
                roaster: bean.roaster,
                roast_date: bean.roastDate,
                is_pre_ground: bean.isPreGround,
                bag_weight_grams: bean.bagWeightGrams ?? null,
                remaining_grams: bean.remainingGrams ?? null,
              }));

        setBeans(beansResponse);
        setMethods(methodsResponse);
        setPourOverDevices(
          pourOverResponse.filter((item) => POUR_OVER_DEVICE_ALLOWLIST.has(item.method_id)),
        );

        if (
          preferencesResponse.last_used_bean_id ||
          preferencesResponse.last_used_brew_method
        ) {
          setLocalLastUsed(
            preferencesResponse.last_used_bean_id ?? null,
            preferencesResponse.last_used_brew_method ?? null,
          );
        }

        if (beansResponse.length === 1) {
          setSelectedBeanId(beansResponse[0].id);
        } else if (beansResponse.length > 1) {
          const hasLastBean = beansResponse.some(
            (bean) => bean.id === preferencesResponse.last_used_bean_id,
          );
          if (hasLastBean && preferencesResponse.last_used_bean_id) {
            setSelectedBeanId(preferencesResponse.last_used_bean_id);
          }
        }

        const hasLastMethod = SUPPORTED_METHODS.includes(
          (preferencesResponse.last_used_brew_method as MethodCardId | null) ?? "aeropress",
        );
        if (hasLastMethod && preferencesResponse.last_used_brew_method) {
          setSelectedMethodId(preferencesResponse.last_used_brew_method as MethodCardId);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [persistedBeans, setLocalLastUsed, storedLastBean, storedLastMethod]);

  const visibleMethodCards = useMemo(() => {
    const standalone = methods.filter(
      (method) =>
        method.parent_method === null &&
        method.method_id !== "espresso" &&
        SUPPORTED_METHODS.includes(method.method_id as MethodCardId),
    );
    const hasPourOverFamily = methods.some((method) => method.parent_method === "pour_over");

    const cards: Array<{ method_id: MethodCardId; display_name: string }> = [];
    if (hasPourOverFamily) cards.push({ method_id: "pour_over", display_name: "Pour Over" });
    standalone.forEach((method) => {
      cards.push({
        method_id: method.method_id as MethodCardId,
        display_name: method.display_name,
      });
    });
    return cards.filter((card) => SUPPORTED_METHODS.includes(card.method_id)).slice(0, 6);
  }, [methods]);

  const selectedBean = beans.find((bean) => bean.id === selectedBeanId);

  const stalenessWarnings = useMemo(() => {
    if (!selectedBean) return [];
    const warnings: string[] = [];
    if (selectedBean.roast_date) {
      const days = Math.floor((Date.now() - new Date(selectedBean.roast_date).getTime()) / 86_400_000);
      if (days > 45) {
        warnings.push(`This bean was roasted ${days} days ago and may be past peak freshness.`);
      }
    }
    return warnings;
  }, [selectedBean]);

  const isPourOver = selectedMethodId === "pour_over";
  const canContinue =
    Boolean(selectedBeanId) &&
    Boolean(selectedMethodId) &&
    (!isPourOver || Boolean(selectedPourOverDeviceId));

  function handleNext() {
    if (!canContinue) return;
    const finalMethod = isPourOver ? selectedPourOverDeviceId : selectedMethodId;
    setStepOneSelection({
      beanId: selectedBeanId,
      methodId: finalMethod,
      pourOverDeviceId: isPourOver ? selectedPourOverDeviceId : null,
    });
    setLastUsed(selectedBeanId, selectedMethodId || finalMethod);
    router.push("/log-brew/step-2");
  }

  return (
    <main
      className="relative overflow-y-auto px-4 pb-56"
      style={{ scrollPaddingBottom: "88px" }}
    >
      {/* Ambient glow blobs */}
      <div className="fixed top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <CompactFlowHeader
        title="Log a New Brew"
        onBack={() => router.push("/")}
        progressCount={3}
        currentStep={1}
        showProgress
      />

      {/* Bean Selection */}
      <section className="mb-8 mt-3">
        {isLoading ? (
          <div className="h-[60px] rounded-xl bg-primary/5 border border-primary/20 animate-pulse" />
        ) : null}
        <div className={`relative ${isLoading ? "hidden" : ""}`}>
          <button
            type="button"
            onClick={() => setBeanDropdownOpen((v) => !v)}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">eco</span>
              <div className="text-left">
                {selectedBean ? (
                  <>
                    <p className="font-normal text-slate-100">
                      {selectedBean.roaster} — {selectedBean.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedBean.is_pre_ground ? "Ground" : "Whole Bean"}
                      {selectedBean.roast_date
                        ? ` • Roasted ${formatRoastDate(selectedBean.roast_date)}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">Select a saved bean</p>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">expand_more</span>
          </button>

          {beanDropdownOpen && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-primary/20 bg-[#2a1d11] shadow-xl overflow-hidden">
              {beans.length ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-primary/10">
                  {beans.map((bean) => (
                    <button
                      key={bean.id}
                      type="button"
                      onClick={() => {
                        setSelectedBeanId(bean.id);
                        setBeanDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        selectedBeanId === bean.id
                          ? "bg-primary/20"
                          : "hover:bg-primary/10"
                      }`}
                    >
                      <p className="text-sm font-normal text-slate-100">
                        {bean.roaster} — {bean.name}
                      </p>
                      {bean.roast_date && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Roasted {formatRoastDate(bean.roast_date)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-slate-500">No beans saved.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Staleness warning */}
      {stalenessWarnings.length > 0 && (
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex gap-2.5">
          <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">warning</span>
          <div className="flex flex-col gap-1">
            {stalenessWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300 leading-relaxed">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Brew Method Grid */}
      <section className="mb-8">
        {isLoading ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-primary/5 border border-white/5 animate-pulse overflow-hidden">
                <div className="aspect-[4/5]" />
              </div>
            ))}
          </div>
        ) : null}
        <div className={`mt-4 grid grid-cols-3 gap-3 ${isLoading ? "hidden" : ""}`}>
          {visibleMethodCards.map((method) => {
            const active = selectedMethodId === method.method_id;
            return (
              <button
                key={method.method_id}
                type="button"
                onClick={() => {
                  setSelectedMethodId(method.method_id);
                  if (method.method_id !== "pour_over") {
                    setSelectedPourOverDeviceId("");
                  } else {
                    setTimeout(() => {
                      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                    }, 150);
                  }
                }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-white/5 hover:border-primary/30"
                }`}
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={METHOD_IMAGE[method.method_id]}
                    alt={METHOD_LABEL[method.method_id]}
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                  {active && <div className="absolute inset-0 bg-primary/25" />}
                </div>
                <div className="absolute bottom-0 inset-x-0 py-1.5 bg-background-dark/80 backdrop-blur-sm">
                  <span className="block text-center text-[10px] font-normal uppercase leading-tight text-slate-100">
                    {METHOD_LABEL[method.method_id]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Validation hint */}
      {hasBeans && !selectedMethodId && !isLoading && (
        <p className="text-xs text-slate-500 text-center -mt-4 mb-4">Select a brew method above to continue</p>
      )}

      {/* Pour Over Device Selection (conditional) */}
      <section
        className={`mb-8 transition-all duration-300 ease-out overflow-hidden ${
          isPourOver ? "max-h-64 opacity-100" : "max-h-0 opacity-0 mb-0"
        }`}
      >
        <p className="mb-3 text-sm font-normal text-slate-400">Select Device</p>
        <div className="flex flex-wrap gap-2">
          {pourOverDevices.map((device) => {
            const active = selectedPourOverDeviceId === device.method_id;
            return (
              <button
                key={device.method_id}
                type="button"
                onClick={() => setSelectedPourOverDeviceId(device.method_id)}
                className={`rounded-full border px-4 py-2 text-sm font-normal transition-colors ${
                  active
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-white/5 border-white/10 text-slate-400 hover:border-primary/30"
                }`}
              >
                {device.display_name}
              </button>
            );
          })}
        </div>
      </section>

      {/* No beans overlay */}
      {!hasBeans && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background-dark/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-2xl border border-primary/20 bg-[#2a1d11] p-6 text-center shadow-2xl">
            <div className="flex justify-center mb-4">
              <img
                src="/coach/coffee_coach_whispering.png"
                alt="Coach Kapi whispering"
                width={130}
                height={130}
                style={{ mixBlendMode: "screen" }}
              />
            </div>
            <h2 className="mb-2 text-xl font-normal text-slate-100">
              One quick step first.
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              Add your first bag of beans and Coach Kapi can start coaching your brews right away.
            </p>
            <Link
              href="/my-beans"
              className="block w-full rounded-xl bg-primary py-3 text-center font-normal text-background-dark hover:scale-[1.01] transition-transform"
            >
              Go to My Beans
            </Link>
          </div>
        </div>
      )}

      {/* Floating Next Step button */}
      <div className="fixed bottom-36 left-0 right-0 z-30 px-4 max-w-phone mx-auto">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canContinue || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-normal text-background-dark shadow-xl shadow-primary/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next Step
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <main className="relative px-6 pb-36 overflow-y-auto">
      {/* Ambient glow blobs */}
      <div className="fixed top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Step indicator */}
      <div className="pt-8 pb-4 flex justify-center">
        <div className="flex gap-1">
          <div className="h-1.5 w-12 rounded-full bg-primary" />
          <div className="h-1.5 w-12 rounded-full bg-primary/20" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-slate-100 mt-4 mb-8">Log a New Brew</h1>

      {/* Bean Selection */}
      <section className="mb-8">
        <p className="text-sm font-medium text-slate-400 mb-3">Bean Selection</p>
        <div className="relative">
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
                    <p className="font-semibold text-slate-100">
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
                      <p className="text-sm font-semibold text-slate-100">
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

      {/* Brew Method Grid */}
      <section className="mb-8">
        <p className="text-sm font-medium text-slate-400 mb-4">Brew Method</p>
        <div className="grid grid-cols-3 gap-3">
          {visibleMethodCards.map((method) => {
            const active = selectedMethodId === method.method_id;
            return (
              <button
                key={method.method_id}
                type="button"
                onClick={() => {
                  setSelectedMethodId(method.method_id);
                  if (method.method_id !== "pour_over") setSelectedPourOverDeviceId("");
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  active
                    ? "bg-primary border-primary text-background-dark"
                    : "bg-primary/5 border-white/5 text-slate-300 hover:border-primary/30"
                }`}
              >
                <span className="material-symbols-outlined text-3xl mb-2">
                  {METHOD_ICON[method.method_id]}
                </span>
                <span className="text-[10px] font-bold uppercase text-center leading-tight">
                  {METHOD_LABEL[method.method_id]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Pour Over Device Selection (conditional) */}
      <section
        className={`mb-8 transition-all duration-300 ease-out overflow-hidden ${
          isPourOver ? "max-h-64 opacity-100" : "max-h-0 opacity-0 mb-0"
        }`}
      >
        <p className="text-sm font-medium text-slate-400 mb-3">Select Device</p>
        <div className="flex flex-wrap gap-2">
          {pourOverDevices.map((device) => {
            const active = selectedPourOverDeviceId === device.method_id;
            return (
              <button
                key={device.method_id}
                type="button"
                onClick={() => setSelectedPourOverDeviceId(device.method_id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
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

      {/* Next Step button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canContinue || isLoading}
        className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
      >
        Next Step
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>

      {/* No beans overlay */}
      {!hasBeans && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background-dark/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-2xl border border-primary/20 bg-[#2a1d11] p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-primary/60">coffee</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              Add your beans first
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              You need at least one saved bean before logging a brew session.
            </p>
            <Link
              href="/my-beans"
              className="block w-full bg-primary text-background-dark font-bold py-3 rounded-xl text-center hover:scale-[1.01] transition-transform"
            >
              Go to My Beans
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

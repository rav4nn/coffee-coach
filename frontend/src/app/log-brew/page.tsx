"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Droplets, FlaskConical, GlassWater, Hexagon, Snowflake, Triangle } from "lucide-react";

import { Button } from "@/components/ui/button";
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
const POUR_OVER_DEVICE_ALLOWLIST = new Set(["v60", "chemex", "kalita_wave", "clever_dripper"]);

const ICON_MAP: Record<MethodCardId, ComponentType<{ className?: string }>> = {
  pour_over: ({ className }) => <Triangle className={className} />,
  aeropress: ({ className }) => <FlaskConical className={className} />,
  french_press: ({ className }) => <GlassWater className={className} />,
  moka_pot: ({ className }) => <Hexagon className={className} />,
  cold_brew: ({ className }) => <Snowflake className={className} />,
  south_indian_filter: ({ className }) => <Droplets className={className} />,
};

function displayMethodName(method: MethodCardId) {
  switch (method) {
    case "pour_over":
      return "Pour Over";
    case "aeropress":
      return "AeroPress";
    case "french_press":
      return "French Press";
    case "moka_pot":
      return "Moka Pot";
    case "cold_brew":
      return "Cold Brew";
    case "south_indian_filter":
      return "South Indian Filter";
    default:
      return method;
  }
}

function formatRoastDate(value: string | null) {
  if (!value) {
    return "";
  }

  return `Roast Date: ${new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
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
        const [beansResponseRaw, methodsResponse, pourOverResponse, preferencesResponse] = await Promise.all([
          getUserBeansApi(),
          getBrewMethodsApi(),
          getBrewMethodsApi("pour_over"),
          getUserPreferencesApi().catch(() => ({
            last_used_bean_id: storedLastBean,
            last_used_brew_method: storedLastMethod,
          })),
        ]);

        if (!mounted) {
          return;
        }

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
        setPourOverDevices(pourOverResponse.filter((item) => POUR_OVER_DEVICE_ALLOWLIST.has(item.method_id)));

        if (preferencesResponse.last_used_bean_id || preferencesResponse.last_used_brew_method) {
          setLocalLastUsed(
            preferencesResponse.last_used_bean_id ?? null,
            preferencesResponse.last_used_brew_method ?? null,
          );
        }

        if (beansResponse.length === 1) {
          setSelectedBeanId(beansResponse[0].id);
        } else if (beansResponse.length > 1) {
          const hasLastBean = beansResponse.some((bean) => bean.id === preferencesResponse.last_used_bean_id);
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
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
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
    if (hasPourOverFamily) {
      cards.push({ method_id: "pour_over", display_name: "Pour Over" });
    }
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
    Boolean(selectedBeanId) && Boolean(selectedMethodId) && (!isPourOver || Boolean(selectedPourOverDeviceId));

  function handleNext() {
    if (!canContinue) {
      return;
    }

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
    <section className="relative space-y-5">
      <div className="rounded-2xl border border-mocha/10 bg-steam px-4 py-3 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-mocha/75">Step 1 of 2</p>
        <div className="mt-2 flex gap-1">
          <span className="h-1.5 w-7 rounded-full bg-mocha" />
          <span className="h-1.5 w-7 rounded-full bg-mocha/20" />
        </div>
      </div>

      <div>
        <h1 className="font-serif text-4xl font-bold text-espresso">Log a New Brew</h1>
        <p className="mt-1 text-sm text-mocha/80">Select your bean and brewing method to start the session.</p>
      </div>

      <div className="space-y-3 rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
        <p className="text-sm font-semibold text-espresso">Bean Selection</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setBeanDropdownOpen((value) => !value)}
            className="flex h-12 w-full items-center justify-between rounded-xl border border-mocha/20 bg-cream px-3 text-left"
          >
            <span className="text-sm text-espresso">
              {selectedBean ? `${selectedBean.roaster} - ${selectedBean.name}` : "Select a saved bean"}
            </span>
            <ChevronDown className="h-4 w-4 text-mocha/80" />
          </button>
          {beanDropdownOpen ? (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-mocha/15 bg-steam p-2 shadow-xl">
              {beans.length ? (
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {beans.map((bean) => (
                    <button
                      key={bean.id}
                      type="button"
                      onClick={() => {
                        setSelectedBeanId(bean.id);
                        setBeanDropdownOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left ${
                        selectedBeanId === bean.id ? "bg-latte/70" : "hover:bg-latte/40"
                      }`}
                    >
                      <p className="text-sm font-medium text-espresso">
                        {bean.roaster} - {bean.name}
                      </p>
                      {bean.roast_date ? (
                        <p className="text-xs text-mocha/65">{formatRoastDate(bean.roast_date)}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-2 text-sm text-mocha/70">No beans found.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
        <p className="text-sm font-semibold text-espresso">Brew Method</p>
        <div className="grid grid-cols-3 gap-2">
          {visibleMethodCards.map((method) => {
            const Icon = ICON_MAP[method.method_id];
            const active = selectedMethodId === method.method_id;
            return (
              <button
                key={method.method_id}
                type="button"
                onClick={() => {
                  setSelectedMethodId(method.method_id);
                  if (method.method_id !== "pour_over") {
                    setSelectedPourOverDeviceId("");
                  }
                }}
                className={`flex min-h-[92px] flex-col items-center justify-center rounded-lg border px-2 py-3 text-center ${
                  active ? "border-mocha bg-latte/70" : "border-mocha/15 bg-stone-100"
                }`}
              >
                <Icon className="h-8 w-8 text-charcoal" />
                <span className="mt-2 text-xs font-medium text-espresso">{displayMethodName(method.method_id)}</span>
              </button>
            );
          })}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isPourOver ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pt-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-mocha/70">Choose Device</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pourOverDevices.map((device) => (
                <button
                  key={device.method_id}
                  type="button"
                  onClick={() => setSelectedPourOverDeviceId(device.method_id)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selectedPourOverDeviceId === device.method_id
                      ? "border-mocha bg-latte/70 text-espresso"
                      : "border-mocha/20 bg-cream text-mocha"
                  }`}
                >
                  {device.display_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button className="h-12 w-full text-base" disabled={!canContinue || isLoading} onClick={handleNext}>
        Next
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {!hasBeans && !isLoading ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/45 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-mocha/10 bg-steam p-6 text-center shadow-2xl">
            <h2 className="font-serif text-2xl font-bold text-espresso">Add your beans first to start logging brews</h2>
            <p className="mt-2 text-sm text-mocha/75">You need at least one saved bean before logging a brew session.</p>
            <Button asChild className="mt-5 w-full">
              <Link href="/my-beans">Go to My Beans</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

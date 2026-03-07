"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bean, CalendarDays, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SearchableCombobox } from "@/components/SearchableCombobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { getCatalogBeansByRoaster, getCatalogRoasters } from "@/lib/api";
import { useBeansStore } from "@/lib/beansStore";
import type { CatalogBean } from "@/lib/types";

const addBeanSchema = z.object({
  roaster: z.string().min(1, "Roaster is required"),
  coffeeId: z.string().min(1, "Bean name is required"),
  roastDate: z.string().optional(),
  isPreGround: z.boolean().default(false),
});

type AddBeanFormValues = z.infer<typeof addBeanSchema>;

function formatRoastDate(date: string | null) {
  if (!date) {
    return "Unknown";
  }

  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyBeansPage() {
  const { userBeans, fetchBeans, addBean, deleteBean, isLoading } = useBeansStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [roasters, setRoasters] = useState<string[]>([]);
  const [catalogBeans, setCatalogBeans] = useState<CatalogBean[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const form = useForm<AddBeanFormValues>({
    resolver: zodResolver(addBeanSchema),
    defaultValues: {
      roaster: "",
      coffeeId: "",
      roastDate: "",
      isPreGround: false,
    },
  });

  const selectedRoaster = form.watch("roaster");
  const selectedCoffeeId = form.watch("coffeeId");
  const isPreGround = form.watch("isPreGround");

  const roasterOptions = useMemo(
    () => roasters.map((roaster) => ({ label: roaster, value: roaster })),
    [roasters],
  );
  const beanOptions = useMemo(
    () =>
      catalogBeans.map((bean) => ({
        label: bean.name,
        value: bean.coffee_id,
      })),
    [catalogBeans],
  );

  useEffect(() => {
    fetchBeans();
  }, [fetchBeans]);

  useEffect(() => {
    getCatalogRoasters()
      .then((data) => setRoasters(data))
      .catch(() => setRoasters([]));
  }, []);

  useEffect(() => {
    if (!selectedRoaster) {
      setCatalogBeans([]);
      form.setValue("coffeeId", "");
      return;
    }

    setCatalogLoading(true);
    getCatalogBeansByRoaster(selectedRoaster)
      .then((data) => {
        setCatalogBeans(data);
      })
      .catch(() => setCatalogBeans([]))
      .finally(() => setCatalogLoading(false));
  }, [selectedRoaster, form]);

  async function onSubmit(values: AddBeanFormValues) {
    const selectedBean = catalogBeans.find((bean) => bean.coffee_id === values.coffeeId);
    if (!selectedBean) {
      return;
    }

    await addBean({
      coffee_id: values.coffeeId,
      roast_date: values.roastDate?.trim() ? values.roastDate : null,
      is_pre_ground: values.isPreGround,
      name: selectedBean.name,
      roaster: selectedBean.roaster,
    });

    form.reset({
      roaster: "",
      coffeeId: "",
      roastDate: "",
      isPreGround: false,
    });
    setCatalogBeans([]);
    setSheetOpen(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">My Beans</p>
          <h1 className="font-serif text-4xl font-bold leading-tight text-espresso">Manage your coffees</h1>
          <p className="mt-1 text-sm text-mocha/80">
            Add beans from the Indian catalog and reuse them in your brew flow.
          </p>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-11 w-11 rounded-full shadow-card" aria-label="Add beans">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add Beans</SheetTitle>
              <SheetDescription>Choose a roaster, pick a bean, and optionally add roast details.</SheetDescription>
            </SheetHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <SearchableCombobox
                label="Roaster"
                placeholder="Select a roaster"
                searchPlaceholder="Search roasters..."
                value={selectedRoaster}
                onChange={(value) => {
                  form.setValue("roaster", value, { shouldValidate: true });
                }}
                options={roasterOptions}
              />
              {form.formState.errors.roaster ? (
                <p className="text-xs text-red-700">{form.formState.errors.roaster.message}</p>
              ) : null}

              <SearchableCombobox
                label="Bean Name"
                placeholder={selectedRoaster ? "Select a bean" : "Pick roaster first"}
                searchPlaceholder="Search beans..."
                value={selectedCoffeeId}
                onChange={(value) => {
                  form.setValue("coffeeId", value, { shouldValidate: true });
                }}
                options={beanOptions}
                disabled={!selectedRoaster || catalogLoading}
              />
              {form.formState.errors.coffeeId ? (
                <p className="text-xs text-red-700">{form.formState.errors.coffeeId.message}</p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="roast-date">Roast Date (Optional)</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-mocha/70" />
                  <input
                    id="roast-date"
                    type="date"
                    {...form.register("roastDate")}
                    className="h-10 w-full rounded-xl border border-mocha/20 bg-steam pl-10 pr-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
                  />
                </div>
                <p className="text-xs text-mocha/70">
                  Adding the roast date helps us dial in freshness for better taste.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-mocha/10 bg-cream px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-espresso">Pre-ground</p>
                  <p className="text-xs text-mocha/70">Leave off for whole bean.</p>
                </div>
                <Switch
                  checked={isPreGround}
                  onCheckedChange={(checked) => form.setValue("isPreGround", checked, { shouldValidate: true })}
                />
              </div>

              <Button className="mt-2 w-full" type="submit" disabled={form.formState.isSubmitting}>
                Save Bean
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? <p className="text-sm text-mocha/80">Loading your beans...</p> : null}

      {!userBeans.length && !isLoading ? (
        <div className="rounded-[2rem] border border-mocha/10 bg-steam p-6 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-latte/70">
            <Bean className="h-7 w-7 text-mocha" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-espresso">You haven&apos;t added any beans yet</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-mocha/75">
            Add your first bag so the brew flow can start with bean-first selection.
          </p>
          <Button className="mt-5" onClick={() => setSheetOpen(true)}>
            Add Your First Beans
          </Button>
        </div>
      ) : null}

      {userBeans.length ? (
        <div className="space-y-3">
          {userBeans.map((bean) => (
            <article
              key={bean.id}
              className="rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-mocha/70">{bean.roaster}</p>
                  <h3 className="font-serif text-xl font-semibold text-espresso">{bean.beanName}</h3>
                  <p className="mt-1 text-sm text-mocha/80">Roast Date: {formatRoastDate(bean.roastDate)}</p>
                  {bean.isPreGround ? (
                    <span className="mt-2 inline-flex rounded-full bg-mocha px-2.5 py-1 text-xs font-medium text-cream">
                      Pre-ground
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-mocha/80"
                  aria-label={`Delete ${bean.beanName}`}
                  onClick={() => deleteBean(bean.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

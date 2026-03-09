"use client";

import { useSession } from "next-auth/react";

import { GreetingSection } from "@/components/GreetingSection";
import { QuickActions } from "@/components/QuickActions";
import { BrewList } from "@/components/BrewList";
import { CoachTip } from "@/components/CoachTip";

const mockBrews: never[] = [];

const mockTip =
  "Try increasing your water temperature to 94°C for lighter roasts to unlock more floral notes.";

export default function Home() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Brewer";

  return (
    <main className="overflow-y-auto pb-28">
      <GreetingSection greetingLabel="Hello" userName={`Brewmaster ${firstName}`} />
      <QuickActions />
      <BrewList brews={mockBrews} />
      <CoachTip tip={mockTip} />
    </main>
  );
}

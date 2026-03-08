import { GreetingSection } from "@/components/GreetingSection";
import { QuickActions } from "@/components/QuickActions";
import { BrewList } from "@/components/BrewList";
import { CoachTip } from "@/components/CoachTip";

// Style reference — uncomment to preview brew card layout:
// const mockBrews = [
//   { id: 1, name: "Ethiopian Yirgacheffe", method: "V60 • 1:16 Ratio • 3:15m", rating: 4, timeAgo: "2h ago", icon: "coffee" },
//   { id: 2, name: "Cold Brew Concentrate", method: "Immersion • 18h Steep", rating: 5, timeAgo: "Yesterday", icon: "water_drop" },
// ];
const mockBrews: never[] = [];

const mockTip =
  "Try increasing your water temperature to 94°C for lighter roasts to unlock more floral notes.";

export default function Home() {
  return (
    <main className="overflow-y-auto pb-28">
      <GreetingSection greetingLabel="Good Morning" userName="Brewmaster Jack" />
      <QuickActions />
      <BrewList brews={mockBrews} />
      <CoachTip tip={mockTip} />
    </main>
  );
}

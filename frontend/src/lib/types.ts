export type BrewMethod =
  | "aeropress"
  | "cold_brew"
  | "french_press"
  | "moka_pot"
  | "pour_over"
  | "south_indian_filter";

export type UserBean = {
  id: string;
  coffeeId?: string;
  roaster: string;
  beanName: string;
  roastDate: string | null;
  isPreGround: boolean;
  imageUrl: string | null;
  bagWeightGrams: number | null;
  remainingGrams: number | null;
};

export type RecipeSummary = {
  id: string;
  title: string;
  method: BrewMethod;
};

export type CatalogBean = {
  coffee_id: string;
  name: string;
  roaster: string;
};

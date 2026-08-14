import type { Macros } from "../types";

/**
 * Basis for a food's macro values:
 *  - "100g"  : macros are per 100 grams (weighable solids)
 *  - "100ml" : macros are per 100 millilitres (liquids)
 *  - "item"  : macros are per single item (egg, banana, slice)
 */
export type FoodBasis = "100g" | "100ml" | "item";

export interface FoodDef extends Macros {
  /** Canonical display name. */
  name: string;
  /** Lower-case keywords/aliases used for matching. */
  aliases: string[];
  basis: FoodBasis;
  /** Approx grams (or ml) in one item — used to convert weights <-> items. */
  gramsPerItem?: number;
  /** Default amount used when the user gives no quantity. */
  defaultQty?: number;
}

/**
 * Sensible standard nutritional values for common foods.
 * All values are estimates and clearly labelled as such in the UI.
 */
export const FOODS: FoodDef[] = [
  // ---- Eggs & breakfast ----
  { name: "Egg", aliases: ["egg", "eggs", "whole egg"], basis: "item", gramsPerItem: 50, defaultQty: 1, calories: 72, protein: 6.3, carbs: 0.4, fat: 5 },
  { name: "Egg white", aliases: ["egg white", "egg whites"], basis: "item", gramsPerItem: 33, defaultQty: 1, calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1 },
  { name: "Omelette", aliases: ["omelette", "omelet"], basis: "item", gramsPerItem: 120, defaultQty: 1, calories: 154, protein: 11, carbs: 1, fat: 12 },
  { name: "Oats", aliases: ["oats", "oatmeal", "porridge", "rolled oats"], basis: "100g", defaultQty: 60, calories: 389, protein: 13, carbs: 66, fat: 7 },
  { name: "Greek yogurt", aliases: ["greek yogurt", "greek yoghurt", "yogurt", "yoghurt"], basis: "100g", defaultQty: 170, calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: "Bacon", aliases: ["bacon", "rashers", "rasher"], basis: "item", gramsPerItem: 20, defaultQty: 2, calories: 92, protein: 6, carbs: 0.2, fat: 7 },
  { name: "Pancake", aliases: ["pancake", "pancakes"], basis: "item", gramsPerItem: 40, defaultQty: 2, calories: 90, protein: 2.5, carbs: 14, fat: 2.5 },
  { name: "Cereal", aliases: ["cereal", "corn flakes", "cornflakes"], basis: "100g", defaultQty: 40, calories: 378, protein: 7, carbs: 84, fat: 1 },

  // ---- Poultry, meat, fish ----
  { name: "Chicken breast", aliases: ["chicken breast", "chicken breasts", "chicken", "grilled chicken"], basis: "100g", defaultQty: 150, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Chicken thigh", aliases: ["chicken thigh", "chicken thighs"], basis: "100g", defaultQty: 150, calories: 209, protein: 26, carbs: 0, fat: 11 },
  { name: "Steak", aliases: ["steak", "sirloin", "ribeye", "beef steak"], basis: "100g", defaultQty: 200, calories: 271, protein: 25, carbs: 0, fat: 19 },
  { name: "Beef mince", aliases: ["beef mince", "ground beef", "minced beef", "mince"], basis: "100g", defaultQty: 150, calories: 250, protein: 26, carbs: 0, fat: 15 },
  { name: "Pork chop", aliases: ["pork chop", "pork chops", "pork"], basis: "100g", defaultQty: 150, calories: 231, protein: 26, carbs: 0, fat: 14 },
  { name: "Turkey breast", aliases: ["turkey breast", "turkey"], basis: "100g", defaultQty: 150, calories: 135, protein: 30, carbs: 0, fat: 1 },
  { name: "Salmon", aliases: ["salmon", "salmon fillet"], basis: "100g", defaultQty: 150, calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Tuna", aliases: ["tuna", "canned tuna", "tuna steak"], basis: "100g", defaultQty: 100, calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "White fish", aliases: ["white fish", "cod", "haddock", "tilapia"], basis: "100g", defaultQty: 150, calories: 105, protein: 23, carbs: 0, fat: 1 },
  { name: "Prawns", aliases: ["prawns", "shrimp"], basis: "100g", defaultQty: 100, calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { name: "Sausage", aliases: ["sausage", "sausages"], basis: "item", gramsPerItem: 60, defaultQty: 2, calories: 174, protein: 9, carbs: 3, fat: 14 },
  { name: "Ham", aliases: ["ham", "sliced ham"], basis: "100g", defaultQty: 50, calories: 145, protein: 21, carbs: 1.5, fat: 6 },
  { name: "Bacon medallion", aliases: ["bacon medallion", "bacon medallions"], basis: "item", gramsPerItem: 25, defaultQty: 3, calories: 33, protein: 5, carbs: 0.1, fat: 1.4 },

  // ---- Carbs & grains ----
  { name: "Cooked rice", aliases: ["cooked rice", "white rice", "rice", "boiled rice", "basmati"], basis: "100g", defaultQty: 200, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Brown rice", aliases: ["brown rice", "wholegrain rice"], basis: "100g", defaultQty: 200, calories: 123, protein: 2.7, carbs: 26, fat: 1 },
  { name: "Pasta", aliases: ["pasta", "spaghetti", "penne", "cooked pasta"], basis: "100g", defaultQty: 200, calories: 158, protein: 6, carbs: 31, fat: 0.9 },
  { name: "Potato", aliases: ["potato", "potatoes", "boiled potato", "mashed potato", "mash"], basis: "100g", defaultQty: 200, calories: 87, protein: 2, carbs: 20, fat: 0.1 },
  { name: "Sweet potato", aliases: ["sweet potato", "sweet potatoes"], basis: "100g", defaultQty: 200, calories: 90, protein: 2, carbs: 21, fat: 0.1 },
  { name: "Chips", aliases: ["chips", "fries", "french fries"], basis: "100g", defaultQty: 150, calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  { name: "Bread", aliases: ["bread", "toast", "slice of bread", "sliced bread"], basis: "item", gramsPerItem: 40, defaultQty: 2, calories: 99, protein: 3.6, carbs: 18, fat: 1.2 },
  { name: "Bagel", aliases: ["bagel", "bagels"], basis: "item", gramsPerItem: 90, defaultQty: 1, calories: 245, protein: 10, carbs: 48, fat: 1.5 },
  { name: "Wrap", aliases: ["wrap", "tortilla", "tortillas"], basis: "item", gramsPerItem: 60, defaultQty: 1, calories: 190, protein: 5, carbs: 32, fat: 4.5 },
  { name: "Quinoa", aliases: ["quinoa"], basis: "100g", defaultQty: 150, calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: "Couscous", aliases: ["couscous"], basis: "100g", defaultQty: 150, calories: 112, protein: 3.8, carbs: 23, fat: 0.2 },
  { name: "Noodles", aliases: ["noodles", "egg noodles", "rice noodles"], basis: "100g", defaultQty: 200, calories: 138, protein: 4.5, carbs: 25, fat: 2 },

  // ---- Fruit & veg ----
  { name: "Banana", aliases: ["banana", "bananas"], basis: "item", gramsPerItem: 118, defaultQty: 1, calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Apple", aliases: ["apple", "apples"], basis: "item", gramsPerItem: 182, defaultQty: 1, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Blueberries", aliases: ["blueberries", "blueberry"], basis: "100g", defaultQty: 100, calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { name: "Strawberries", aliases: ["strawberries", "strawberry"], basis: "100g", defaultQty: 100, calories: 32, protein: 0.7, carbs: 8, fat: 0.3 },
  { name: "Avocado", aliases: ["avocado", "avocados"], basis: "item", gramsPerItem: 150, defaultQty: 1, calories: 240, protein: 3, carbs: 12, fat: 22 },
  { name: "Orange", aliases: ["orange", "oranges"], basis: "item", gramsPerItem: 140, defaultQty: 1, calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { name: "Broccoli", aliases: ["broccoli"], basis: "100g", defaultQty: 100, calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Mixed vegetables", aliases: ["vegetables", "veggies", "veg", "mixed veg", "salad", "greens"], basis: "100g", defaultQty: 100, calories: 45, protein: 2.5, carbs: 8, fat: 0.4 },
  { name: "Spinach", aliases: ["spinach"], basis: "100g", defaultQty: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Tomato", aliases: ["tomato", "tomatoes"], basis: "item", gramsPerItem: 120, defaultQty: 1, calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2 },
  { name: "Carrot", aliases: ["carrot", "carrots"], basis: "item", gramsPerItem: 60, defaultQty: 1, calories: 25, protein: 0.6, carbs: 6, fat: 0.1 },

  // ---- Dairy & drinks ----
  { name: "Milk", aliases: ["milk", "whole milk", "semi skimmed milk", "dairy milk"], basis: "100ml", defaultQty: 200, calories: 50, protein: 3.4, carbs: 4.8, fat: 1.8 },
  { name: "Skimmed milk", aliases: ["skimmed milk", "skim milk", "fat free milk"], basis: "100ml", defaultQty: 200, calories: 35, protein: 3.4, carbs: 5, fat: 0.1 },
  { name: "Almond milk", aliases: ["almond milk"], basis: "100ml", defaultQty: 200, calories: 15, protein: 0.5, carbs: 0.6, fat: 1.1 },
  { name: "Cheese", aliases: ["cheese", "cheddar", "cheddar cheese"], basis: "100g", defaultQty: 30, calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  { name: "Cottage cheese", aliases: ["cottage cheese"], basis: "100g", defaultQty: 100, calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  { name: "Butter", aliases: ["butter"], basis: "100g", defaultQty: 10, calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { name: "Water", aliases: ["water", "lemon water", "sparkling water"], basis: "100ml", defaultQty: 250, calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Orange juice", aliases: ["orange juice", "oj"], basis: "100ml", defaultQty: 200, calories: 45, protein: 0.7, carbs: 10, fat: 0.2 },
  { name: "Coffee", aliases: ["coffee", "black coffee", "americano"], basis: "100ml", defaultQty: 250, calories: 2, protein: 0.1, carbs: 0, fat: 0 },
  { name: "Latte", aliases: ["latte", "cappuccino", "flat white"], basis: "item", gramsPerItem: 250, defaultQty: 1, calories: 120, protein: 6, carbs: 10, fat: 6 },
  { name: "Cola", aliases: ["cola", "coke", "pepsi", "soda", "soft drink"], basis: "100ml", defaultQty: 330, calories: 42, protein: 0, carbs: 10.6, fat: 0 },
  { name: "Diet cola", aliases: ["diet coke", "coke zero", "diet cola", "zero cola"], basis: "100ml", defaultQty: 330, calories: 0.4, protein: 0, carbs: 0, fat: 0 },
  { name: "Beer", aliases: ["beer", "lager", "pint"], basis: "100ml", defaultQty: 330, calories: 43, protein: 0.5, carbs: 3.6, fat: 0 },

  // ---- Protein supplements & snacks ----
  { name: "Protein shake", aliases: ["protein shake", "protein powder", "whey", "whey protein", "protein scoop"], basis: "item", gramsPerItem: 30, defaultQty: 1, calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { name: "Protein bar", aliases: ["protein bar", "protein bars"], basis: "item", gramsPerItem: 60, defaultQty: 1, calories: 210, protein: 20, carbs: 21, fat: 7 },
  { name: "Peanut butter", aliases: ["peanut butter", "pb"], basis: "100g", defaultQty: 30, calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Almonds", aliases: ["almonds", "almond"], basis: "100g", defaultQty: 30, calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Mixed nuts", aliases: ["mixed nuts", "nuts", "cashews", "walnuts"], basis: "100g", defaultQty: 30, calories: 607, protein: 20, carbs: 21, fat: 54 },
  { name: "Rice cake", aliases: ["rice cake", "rice cakes"], basis: "item", gramsPerItem: 9, defaultQty: 2, calories: 35, protein: 0.7, carbs: 7.3, fat: 0.3 },
  { name: "Chocolate", aliases: ["chocolate", "milk chocolate", "chocolate bar"], basis: "100g", defaultQty: 40, calories: 535, protein: 7.6, carbs: 59, fat: 30 },
  { name: "Crisps", aliases: ["crisps", "potato chips", "chips packet"], basis: "item", gramsPerItem: 30, defaultQty: 1, calories: 158, protein: 2, carbs: 15, fat: 10 },
  { name: "Biscuit", aliases: ["biscuit", "biscuits", "cookie", "cookies"], basis: "item", gramsPerItem: 15, defaultQty: 2, calories: 71, protein: 1, carbs: 10, fat: 3 },
  { name: "Hummus", aliases: ["hummus", "houmous"], basis: "100g", defaultQty: 50, calories: 166, protein: 8, carbs: 14, fat: 10 },

  // ---- Legumes, meals, fats ----
  { name: "Baked beans", aliases: ["baked beans", "beans"], basis: "100g", defaultQty: 200, calories: 94, protein: 5, carbs: 15, fat: 0.5 },
  { name: "Lentils", aliases: ["lentils", "dal", "daal"], basis: "100g", defaultQty: 150, calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Chickpeas", aliases: ["chickpeas", "garbanzo"], basis: "100g", defaultQty: 150, calories: 164, protein: 9, carbs: 27, fat: 2.6 },
  { name: "Tofu", aliases: ["tofu"], basis: "100g", defaultQty: 150, calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: "Olive oil", aliases: ["olive oil", "oil"], basis: "item", gramsPerItem: 14, defaultQty: 1, calories: 119, protein: 0, carbs: 0, fat: 13.5 },
  { name: "Pizza", aliases: ["pizza", "pizza slice"], basis: "item", gramsPerItem: 107, defaultQty: 2, calories: 285, protein: 12, carbs: 36, fat: 10 },
  { name: "Burger", aliases: ["burger", "hamburger", "cheeseburger"], basis: "item", gramsPerItem: 200, defaultQty: 1, calories: 540, protein: 30, carbs: 40, fat: 27 },
  { name: "Sushi roll", aliases: ["sushi", "sushi roll", "maki"], basis: "item", gramsPerItem: 30, defaultQty: 6, calories: 45, protein: 1.5, carbs: 8, fat: 0.6 },
  { name: "Curry", aliases: ["curry", "chicken curry", "tikka masala"], basis: "100g", defaultQty: 350, calories: 150, protein: 9, carbs: 8, fat: 9 },
  { name: "Soup", aliases: ["soup"], basis: "100ml", defaultQty: 300, calories: 45, protein: 2, carbs: 6, fat: 1.5 },
];

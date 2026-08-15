import type { Macros } from "../types";

/**
 * Maps the on-device image classifier's labels (ImageNet-1k, as returned by
 * MobileNet) to a food estimate. The classifier recognises iconic single
 * dishes/ingredients; everything is a rough estimate the user confirms.
 */
export interface PhotoFood {
  /** lower-case substrings to match against a predicted label */
  keywords: string[];
  name: string;
  per100g: Macros;
  /** a sensible default portion in grams */
  servingG: number;
}

export const PHOTO_FOODS: PhotoFood[] = [
  { keywords: ["pizza"], name: "Pizza", per100g: { calories: 266, protein: 11, carbs: 33, fat: 10 }, servingG: 250 },
  { keywords: ["cheeseburger", "hamburger", "burger"], name: "Burger", per100g: { calories: 250, protein: 15, carbs: 19, fat: 13 }, servingG: 220 },
  { keywords: ["hotdog", "hot dog", "red hot"], name: "Hot dog", per100g: { calories: 290, protein: 10, carbs: 22, fat: 18 }, servingG: 110 },
  { keywords: ["banana"], name: "Banana", per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, servingG: 120 },
  { keywords: ["orange"], name: "Orange", per100g: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 }, servingG: 140 },
  { keywords: ["granny smith", "apple"], name: "Apple", per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 }, servingG: 180 },
  { keywords: ["strawberr"], name: "Strawberries", per100g: { calories: 32, protein: 0.7, carbs: 8, fat: 0.3 }, servingG: 100 },
  { keywords: ["pineapple"], name: "Pineapple", per100g: { calories: 50, protein: 0.5, carbs: 13, fat: 0.1 }, servingG: 150 },
  { keywords: ["lemon"], name: "Lemon", per100g: { calories: 29, protein: 1.1, carbs: 9, fat: 0.3 }, servingG: 60 },
  { keywords: ["fig"], name: "Figs", per100g: { calories: 74, protein: 0.8, carbs: 19, fat: 0.3 }, servingG: 100 },
  { keywords: ["pomegranate"], name: "Pomegranate", per100g: { calories: 83, protein: 1.7, carbs: 19, fat: 1.2 }, servingG: 150 },
  { keywords: ["broccoli"], name: "Broccoli", per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 }, servingG: 100 },
  { keywords: ["cauliflower"], name: "Cauliflower", per100g: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3 }, servingG: 100 },
  { keywords: ["cucumber", "cuke"], name: "Cucumber", per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 }, servingG: 100 },
  { keywords: ["bell pepper", "capsicum"], name: "Bell pepper", per100g: { calories: 31, protein: 1, carbs: 6, fat: 0.3 }, servingG: 120 },
  { keywords: ["mushroom"], name: "Mushrooms", per100g: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 }, servingG: 100 },
  { keywords: ["corn", "ear"], name: "Corn", per100g: { calories: 96, protein: 3.4, carbs: 21, fat: 1.5 }, servingG: 100 },
  { keywords: ["cardoon", "artichoke"], name: "Artichoke", per100g: { calories: 47, protein: 3.3, carbs: 11, fat: 0.2 }, servingG: 120 },
  { keywords: ["bagel", "beigel"], name: "Bagel", per100g: { calories: 250, protein: 10, carbs: 48, fat: 1.5 }, servingG: 90 },
  { keywords: ["pretzel"], name: "Pretzel", per100g: { calories: 380, protein: 10, carbs: 80, fat: 3 }, servingG: 50 },
  { keywords: ["french loaf", "baguette", "loaf"], name: "Bread", per100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2 }, servingG: 60 },
  { keywords: ["dough"], name: "Dough / pastry", per100g: { calories: 300, protein: 8, carbs: 50, fat: 8 }, servingG: 80 },
  { keywords: ["guacamole"], name: "Guacamole", per100g: { calories: 155, protein: 2, carbs: 9, fat: 14 }, servingG: 100 },
  { keywords: ["burrito"], name: "Burrito", per100g: { calories: 210, protein: 8, carbs: 28, fat: 7 }, servingG: 250 },
  { keywords: ["mashed potato"], name: "Mashed potato", per100g: { calories: 88, protein: 2, carbs: 17, fat: 1.5 }, servingG: 200 },
  { keywords: ["meat loaf", "meatloaf"], name: "Meatloaf", per100g: { calories: 240, protein: 16, carbs: 10, fat: 15 }, servingG: 200 },
  { keywords: ["carbonara", "spaghetti", "pasta"], name: "Pasta", per100g: { calories: 160, protein: 6, carbs: 22, fat: 4 }, servingG: 300 },
  { keywords: ["ice cream", "icecream", "ice lolly", "lolly"], name: "Ice cream", per100g: { calories: 207, protein: 3.5, carbs: 24, fat: 11 }, servingG: 100 },
  { keywords: ["trifle"], name: "Dessert", per100g: { calories: 190, protein: 3, carbs: 28, fat: 8 }, servingG: 120 },
  { keywords: ["chocolate"], name: "Chocolate", per100g: { calories: 535, protein: 8, carbs: 59, fat: 30 }, servingG: 40 },
  { keywords: ["espresso", "coffee", "cup"], name: "Coffee", per100g: { calories: 2, protein: 0.1, carbs: 0, fat: 0 }, servingG: 250 },
  { keywords: ["red wine", "wine"], name: "Wine", per100g: { calories: 85, protein: 0.1, carbs: 2.6, fat: 0 }, servingG: 150 },
  { keywords: ["beer", "ale"], name: "Beer", per100g: { calories: 43, protein: 0.5, carbs: 3.6, fat: 0 }, servingG: 330 },
  { keywords: ["consomme", "soup", "hot pot", "hotpot"], name: "Soup", per100g: { calories: 45, protein: 2.5, carbs: 6, fat: 1.5 }, servingG: 300 },
  { keywords: ["burrito", "taco"], name: "Taco", per100g: { calories: 220, protein: 9, carbs: 20, fat: 11 }, servingG: 150 },
];

// Pre-built JSON of ~80 Paris quartiers + landmarks with lat/lng.
// Bounding box: Paris + first ring (48.78–48.95 N, 2.20–2.50 E).

export interface Quartier {
  name: string;
  lat: number;
  lng: number;
  arr?: string; // arrondissement / commune
}

export const PARIS_BOUNDS: [[number, number], [number, number]] = [
  [48.78, 2.20],
  [48.95, 2.50],
];

export const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

export const QUARTIERS: Quartier[] = [
  { name: "Le Marais", lat: 48.857, lng: 2.358, arr: "3e/4e" },
  { name: "Bastille", lat: 48.853, lng: 2.369, arr: "11e" },
  { name: "République", lat: 48.867, lng: 2.363, arr: "11e" },
  { name: "Belleville", lat: 48.872, lng: 2.378, arr: "20e" },
  { name: "Ménilmontant", lat: 48.866, lng: 2.387, arr: "20e" },
  { name: "Père-Lachaise", lat: 48.861, lng: 2.394, arr: "20e" },
  { name: "Pigalle", lat: 48.882, lng: 2.337, arr: "9e/18e" },
  { name: "Montmartre", lat: 48.886, lng: 2.343, arr: "18e" },
  { name: "Sacré-Cœur", lat: 48.887, lng: 2.343, arr: "18e" },
  { name: "Abbesses", lat: 48.884, lng: 2.338, arr: "18e" },
  { name: "Barbès", lat: 48.884, lng: 2.349, arr: "18e" },
  { name: "Goutte d'Or", lat: 48.886, lng: 2.353, arr: "18e" },
  { name: "Stalingrad", lat: 48.884, lng: 2.366, arr: "10e/19e" },
  { name: "Canal Saint-Martin", lat: 48.874, lng: 2.366, arr: "10e" },
  { name: "Jaurès", lat: 48.882, lng: 2.371, arr: "19e" },
  { name: "Strasbourg–Saint-Denis", lat: 48.870, lng: 2.353, arr: "10e" },
  { name: "Châtelet", lat: 48.858, lng: 2.347, arr: "1er" },
  { name: "Les Halles", lat: 48.862, lng: 2.345, arr: "1er" },
  { name: "Louvre", lat: 48.860, lng: 2.337, arr: "1er" },
  { name: "Palais-Royal", lat: 48.863, lng: 2.337, arr: "1er" },
  { name: "Opéra", lat: 48.871, lng: 2.331, arr: "9e" },
  { name: "Madeleine", lat: 48.870, lng: 2.324, arr: "8e" },
  { name: "Concorde", lat: 48.866, lng: 2.321, arr: "8e" },
  { name: "Champs-Élysées", lat: 48.870, lng: 2.307, arr: "8e" },
  { name: "Étoile / Arc de Triomphe", lat: 48.874, lng: 2.295, arr: "8e/17e" },
  { name: "Trocadéro", lat: 48.862, lng: 2.288, arr: "16e" },
  { name: "Tour Eiffel", lat: 48.858, lng: 2.295, arr: "7e" },
  { name: "Invalides", lat: 48.857, lng: 2.313, arr: "7e" },
  { name: "Saint-Germain-des-Prés", lat: 48.854, lng: 2.334, arr: "6e" },
  { name: "Odéon", lat: 48.852, lng: 2.339, arr: "6e" },
  { name: "Saint-Michel", lat: 48.853, lng: 2.343, arr: "5e/6e" },
  { name: "Quartier Latin", lat: 48.849, lng: 2.346, arr: "5e" },
  { name: "Sorbonne", lat: 48.848, lng: 2.343, arr: "5e" },
  { name: "Panthéon", lat: 48.846, lng: 2.346, arr: "5e" },
  { name: "Mouffetard", lat: 48.842, lng: 2.350, arr: "5e" },
  { name: "Jardin du Luxembourg", lat: 48.846, lng: 2.337, arr: "6e" },
  { name: "Montparnasse", lat: 48.842, lng: 2.321, arr: "14e/15e" },
  { name: "Vavin", lat: 48.842, lng: 2.327, arr: "6e" },
  { name: "Denfert-Rochereau", lat: 48.834, lng: 2.332, arr: "14e" },
  { name: "Alésia", lat: 48.828, lng: 2.327, arr: "14e" },
  { name: "Place d'Italie", lat: 48.831, lng: 2.355, arr: "13e" },
  { name: "Butte-aux-Cailles", lat: 48.826, lng: 2.349, arr: "13e" },
  { name: "Bercy", lat: 48.835, lng: 2.382, arr: "12e" },
  { name: "Gare de Lyon", lat: 48.844, lng: 2.374, arr: "12e" },
  { name: "Nation", lat: 48.848, lng: 2.396, arr: "11e/12e" },
  { name: "Oberkampf", lat: 48.864, lng: 2.376, arr: "11e" },
  { name: "Parmentier", lat: 48.866, lng: 2.371, arr: "11e" },
  { name: "Goncourt", lat: 48.872, lng: 2.371, arr: "10e/11e" },
  { name: "Jourdain", lat: 48.876, lng: 2.388, arr: "19e/20e" },
  { name: "Buttes-Chaumont", lat: 48.880, lng: 2.382, arr: "19e" },
  { name: "Place des Fêtes", lat: 48.876, lng: 2.394, arr: "19e" },
  { name: "La Villette", lat: 48.892, lng: 2.388, arr: "19e" },
  { name: "Batignolles", lat: 48.886, lng: 2.319, arr: "17e" },
  { name: "Place de Clichy", lat: 48.883, lng: 2.327, arr: "9e/18e" },
  { name: "Saint-Lazare", lat: 48.876, lng: 2.325, arr: "8e/9e" },
  { name: "Trinité", lat: 48.876, lng: 2.332, arr: "9e" },
  { name: "Saint-Augustin", lat: 48.875, lng: 2.319, arr: "8e" },
  { name: "Auteuil", lat: 48.847, lng: 2.270, arr: "16e" },
  { name: "Passy", lat: 48.857, lng: 2.275, arr: "16e" },
  { name: "Porte Maillot", lat: 48.879, lng: 2.282, arr: "17e" },
  { name: "Pereire", lat: 48.886, lng: 2.297, arr: "17e" },
  { name: "Plaisance", lat: 48.831, lng: 2.318, arr: "14e" },
  { name: "Vaugirard", lat: 48.838, lng: 2.301, arr: "15e" },
  { name: "Convention", lat: 48.840, lng: 2.295, arr: "15e" },
  { name: "Beaugrenelle", lat: 48.847, lng: 2.282, arr: "15e" },
  { name: "Bir-Hakeim", lat: 48.854, lng: 2.290, arr: "15e" },
  { name: "Javel", lat: 48.847, lng: 2.276, arr: "15e" },
  { name: "Gare d'Austerlitz", lat: 48.842, lng: 2.366, arr: "13e" },
  { name: "Bibliothèque François-Mitterrand", lat: 48.834, lng: 2.376, arr: "13e" },
  { name: "Tolbiac", lat: 48.825, lng: 2.365, arr: "13e" },
  { name: "Olympiades", lat: 48.825, lng: 2.366, arr: "13e" },
  { name: "Cité Universitaire", lat: 48.819, lng: 2.336, arr: "14e" },
  { name: "Bois de Vincennes", lat: 48.835, lng: 2.434, arr: "12e" },
  { name: "Saint-Mandé", lat: 48.844, lng: 2.418 },
  { name: "Montreuil", lat: 48.864, lng: 2.444 },
  { name: "Bagnolet", lat: 48.866, lng: 2.418 },
  { name: "Les Lilas", lat: 48.881, lng: 2.418 },
  { name: "Pantin", lat: 48.894, lng: 2.401 },
  { name: "Aubervilliers", lat: 48.911, lng: 2.385 },
  { name: "Saint-Denis", lat: 48.936, lng: 2.357 },
  { name: "Saint-Ouen", lat: 48.910, lng: 2.333 },
  { name: "Clichy", lat: 48.904, lng: 2.306 },
  { name: "Levallois-Perret", lat: 48.896, lng: 2.288 },
  { name: "Neuilly-sur-Seine", lat: 48.886, lng: 2.270 },
  { name: "Bois de Boulogne", lat: 48.862, lng: 2.249 },
  { name: "Boulogne-Billancourt", lat: 48.835, lng: 2.241 },
  { name: "Issy-les-Moulineaux", lat: 48.823, lng: 2.279 },
  { name: "Vanves", lat: 48.821, lng: 2.291 },
  { name: "Malakoff", lat: 48.819, lng: 2.305 },
  { name: "Montrouge", lat: 48.819, lng: 2.319 },
  { name: "Gentilly", lat: 48.815, lng: 2.347 },
  { name: "Le Kremlin-Bicêtre", lat: 48.812, lng: 2.355 },
  { name: "Ivry-sur-Seine", lat: 48.815, lng: 2.387 },
];

export function searchQuartiers(q: string, limit: number = 8): Quartier[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const starts: Quartier[] = [];
  const contains: Quartier[] = [];
  for (const qu of QUARTIERS) {
    const n = qu.name.toLowerCase();
    if (n.startsWith(s)) starts.push(qu);
    else if (n.includes(s)) contains.push(qu);
  }
  return [...starts, ...contains].slice(0, limit);
}

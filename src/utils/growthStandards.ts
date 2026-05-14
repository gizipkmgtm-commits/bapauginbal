/**
 * WHO Child Growth Standards (simplified for interpolation)
 * Based on Kemenkes 2020 / WHO 2005
 */

interface GrowthDataPoint {
  age: number; // months or cm for weight-for-height
  m: number;   // median
  s: number;   // coefficient of variation
  l: number;   // Box-Cox power
}

// Simplified BB/U (Weight-for-Age) Boys 0-60m
const BBU_BOYS: GrowthDataPoint[] = [
  { age: 0, l: 0.3466, m: 3.3464, s: 0.14602 },
  { age: 6, l: -0.0151, m: 7.8926, s: 0.11718 },
  { age: 12, l: -0.1601, m: 9.6482, s: 0.11054 },
  { age: 24, l: -0.3201, m: 12.152, s: 0.1082 },
  { age: 36, l: -0.3952, m: 14.341, s: 0.1132 },
  { age: 48, l: -0.4411, m: 16.326, s: 0.1205 },
  { age: 60, l: -0.4721, m: 18.303, s: 0.1287 },
];

const BBU_GIRLS: GrowthDataPoint[] = [
  { age: 0, l: 0.4297, m: 3.2322, s: 0.14241 },
  { age: 6, l: 0.0848, m: 7.2843, s: 0.1192 },
  { age: 12, l: -0.063, m: 8.9416, s: 0.115 },
  { age: 24, l: -0.219, m: 11.517, s: 0.116 },
  { age: 36, l: -0.285, m: 13.882, s: 0.125 },
  { age: 48, l: -0.334, m: 16.126, s: 0.136 },
  { age: 60, l: -0.370, m: 18.232, s: 0.148 },
];

/**
 * Z-score calculation using LMS method
 * Z = [((y/M)^L) - 1] / (L * S)
 */
function calculateZScore(y: number, l: number, m: number, s: number): number {
  if (l === 0) return Math.log(y / m) / s;
  return (Math.pow(y / m, l) - 1) / (l * s);
}

function interpolate(age: number, table: GrowthDataPoint[]): GrowthDataPoint {
  if (age <= table[0].age) return table[0];
  if (age >= table[table.length - 1].age) return table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    const p1 = table[i];
    const p2 = table[i + 1];
    if (age >= p1.age && age <= p2.age) {
      const ratio = (age - p1.age) / (p2.age - p1.age);
      return {
        age,
        l: p1.l + ratio * (p2.l - p1.l),
        m: p1.m + ratio * (p2.m - p1.m),
        s: p1.s + ratio * (p2.s - p1.s),
      };
    }
  }
  return table[0];
}

export type StatusCategory = {
  category: string;
  color: string;
  zScore: number;
};

export function getWeightForAgeStatus(weight: number, ageMonths: number, gender: 'male'|'female'): StatusCategory {
  const table = gender === 'male' ? BBU_BOYS : BBU_GIRLS;
  const { l, m, s } = interpolate(ageMonths, table);
  const z = calculateZScore(weight, l, m, s);

  let category = "Normal";
  let color = "bg-green-500";

  if (z < -3) {
    category = "Sangat Kurang (Severely Underweight)";
    color = "bg-red-600";
  } else if (z < -2) {
    category = "Kurang (Underweight)";
    color = "bg-red-400";
  } else if (z > 1) {
    category = "Risiko Berat Badan Lebih";
    color = "bg-yellow-500";
  }

  return { category, color, zScore: z };
}

// simplified TB/U (Height-for-Age)
const TBU_BOYS: GrowthDataPoint[] = [
  { age: 0, l: 1, m: 49.9, s: 0.0379 },
  { age: 12, l: 1, m: 75.7, s: 0.0357 },
  { age: 24, l: 1, m: 87.1, s: 0.0371 },
  { age: 60, l: 1, m: 110.0, s: 0.0416 },
];

const TBU_GIRLS: GrowthDataPoint[] = [
  { age: 0, l: 1, m: 49.1, s: 0.0389 },
  { age: 12, l: 1, m: 74.0, s: 0.0381 },
  { age: 24, l: 1, m: 85.7, s: 0.0396 },
  { age: 60, l: 1, m: 109.4, s: 0.0436 },
];

export function getHeightForAgeStatus(height: number, ageMonths: number, gender: 'male'|'female'): StatusCategory {
  const table = gender === 'male' ? TBU_BOYS : TBU_GIRLS;
  const { l, m, s } = interpolate(ageMonths, table);
  const z = calculateZScore(height, l, m, s);

  let category = "Normal";
  let color = "bg-green-500";

  if (z < -3) {
    category = "Sangat Pendek (Severely Stunted)";
    color = "bg-red-600";
  } else if (z < -2) {
    category = "Pendek (Stunted)";
    color = "bg-red-400";
  } else if (z > 3) {
    category = "Tinggi";
    color = "bg-blue-500";
  }

  return { category, color, zScore: z };
}

// Simplified weight-for-height (BB/TB) 
// This usually uses Height as the X-axis
const BBTB_BOYS: GrowthDataPoint[] = [
  { age: 45, l: -0.3521, m: 2.4, s: 0.0911 },
  { age: 65, l: -0.3521, m: 7.0, s: 0.0822 },
  { age: 85, l: -0.3521, m: 11.5, s: 0.0811 },
  { age: 100, l: -0.3521, m: 15.5, s: 0.0844 },
  { age: 120, l: -0.3521, m: 22.0, s: 0.0955 },
];

const BBTB_GIRLS: GrowthDataPoint[] = [
  { age: 45, l: -0.3521, m: 2.4, s: 0.0944 },
  { age: 65, l: -0.3521, m: 6.8, s: 0.0855 },
  { age: 85, l: -0.3521, m: 11.2, s: 0.0844 },
  { age: 100, l: -0.3521, m: 15.2, s: 0.0899 },
  { age: 120, l: -0.3521, m: 22.5, s: 0.1055 },
];

export function getWeightForHeightStatus(weight: number, height: number, gender: 'male'|'female'): StatusCategory {
  const table = gender === 'male' ? BBTB_BOYS : BBTB_GIRLS;
  const { l, m, s } = interpolate(height, table);
  const z = calculateZScore(weight, l, m, s);

  let category = "Gizi Baik (Normal)";
  let color = "bg-green-500";

  if (z < -3) {
    category = "Gizi Buruk (Severely Wasted)";
    color = "bg-red-600";
  } else if (z < -2) {
    category = "Gizi Kurang (Wasted)";
    color = "bg-red-400";
  } else if (z > 3) {
    category = "Obesitas";
    color = "bg-red-800";
  } else if (z > 2) {
    category = "Gizi Lebih (Overweight)";
    color = "bg-yellow-600";
  } else if (z > 1) {
    category = "Berisiko Gizi Lebih";
    color = "bg-yellow-400";
  }

  return { category, color, zScore: z };
}

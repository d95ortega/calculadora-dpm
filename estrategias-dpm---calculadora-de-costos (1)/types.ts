
export type CustomerType = 'final' | 'publicista';

export interface Product {
  name: string;
  priceFinal: number;
  pricePublisher: number;
  designTime: number;
}

export interface FormData {
  customer_type: CustomerType;
  job_description: string;
  width: number;
  height: number;
  quantity: number;
  production_time: number;
  cutting_hours: number;
  laminate_speed: string;
  installation: number;
  urgency_percentage: number;
  transport: number;
  include_design: boolean;
  ojalete_quantity: number;
  include_tubes: boolean;
  include_sticks: boolean;
  sticks_quantity: number;
  job_image?: string; // Campo para imagen en base64
}

export interface QuoteResult {
  areaCm2: number;
  totalAreaCm2: number;
  totalAreaM2: number;
  rollWidth: number;
  rollAreaCm2: number;
  wasteAreaCm2: number;
  materialCost: number;
  wasteCostFromRoll: number;
  productionCost: number;
  designCost: number;
  cuttingCost: number;
  laminateTotal: number;
  taponCost: number;
  tubeCost: number;
  ojalesCost: number;
  sticksCost: number;
  subtotalBeforeWaste: number;
  wasteCost: number;
  totalBeforeMargin: number;
  urgencyCost: number;
  totalCostsWithUrgency: number;
  costWithMargin: number;
  ivaAmount: number;
  finalPrice: number;
  installation: number;
  transport: number;
  adjustedWidth: number;
  adjustedHeight: number;
}

export interface SavedJob extends FormData {
  id: string;
  finalPrice: number;
  createdAt: string;
  quoteResult: QuoteResult;
}

export interface FormalQuote {
  customerName: string;
  customerPhone: string;
  date: string;
  items: SavedJob[];
}

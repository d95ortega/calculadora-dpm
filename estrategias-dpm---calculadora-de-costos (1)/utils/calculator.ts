
import { FormData, QuoteResult, Product } from '../types';
import { 
  ROLL_WIDTHS,
  DESIGN_COST_BY_MINUTES
} from '../constants';

export const calculateQuote = (data: FormData, params: any, products: Product[]): QuoteResult => {
  const {
    customer_type, job_description, width, height, quantity,
    production_time, cutting_hours, laminate_speed, installation,
    urgency_percentage, transport, include_design, ojalete_quantity,
    include_tubes, include_sticks, sticks_quantity
  } = data;

  const productData = products.find(p => p.name === job_description);
  const designTimeMinutes = productData?.designTime || 0;
  
  const isAnyPendon = job_description.includes('PENDON') || job_description === 'PENDONES' || job_description.includes('BANNER');
  const isPasacalles = job_description === 'PASACALLES';
  const isPendonOjales = job_description === 'PENDON MAS OJALES';
  const isReflectiveVinyl = job_description === 'IMPRESIÓN EN VINILO REFLECTIVO';
  const isMicroperforado = job_description === 'VINILO MICROPERFORADO';
  
  const adjustedWidth = (isAnyPendon || isPasacalles) ? width + 3 : width;
  const adjustedHeight = (isAnyPendon || isPasacalles) ? height + 10 : height;

  const taponCost = (isAnyPendon && include_tubes) ? 800 * quantity : 0;
  const tubeCost = (isAnyPendon && include_tubes) ? adjustedWidth * params.tube_cost_factor * 2 * quantity : 0;
  const ojalesCost = isPendonOjales ? (ojalete_quantity * params.ojal_cost) : 0;
  
  const sticksCost = (isPasacalles && include_sticks) ? sticks_quantity * params.stick_cost * quantity : 0;

  let rollWidth = 0;
  if (isReflectiveVinyl) {
    rollWidth = 60;
  } else if (isMicroperforado) {
    const microRolls = [100, 150];
    for (let w of microRolls) {
      if (adjustedWidth <= w) {
        rollWidth = w;
        break;
      }
    }
    if (rollWidth === 0) rollWidth = adjustedWidth;
  } else {
    for (let w of ROLL_WIDTHS) {
      if (adjustedWidth <= w) {
        rollWidth = w;
        break;
      }
    }
    if (rollWidth === 0) rollWidth = adjustedWidth;
  }

  const areaCm2 = width * height; 
  const totalAreaCm2 = adjustedWidth * adjustedHeight * quantity; 
  const totalAreaM2 = totalAreaCm2 / 10000;
  const rollAreaCm2 = rollWidth * adjustedHeight * quantity;

  // Obtener el costo base desde el producto seleccionado
  let baseCostPerCm2 = params.cost_per_cm2;
  if (productData) {
    baseCostPerCm2 = customer_type === 'final' ? productData.priceFinal : productData.pricePublisher;
  }

  const materialCost = rollAreaCm2 * baseCostPerCm2;
  const laminateRate = parseFloat(laminate_speed) || 0;
  const laminateTotal = totalAreaCm2 * laminateRate;
  
  const productionCost = (production_time / 60) * params.hourly_rate;
  const designCost = include_design && customer_type === 'final' ? (DESIGN_COST_BY_MINUTES[designTimeMinutes] || 0) : 0;
  const cuttingCost = (cutting_hours / 60) * params.hourly_rate;

  const subtotalBeforeWaste = materialCost + productionCost + designCost + cuttingCost + laminateTotal + taponCost + tubeCost + ojalesCost + sticksCost;
  
  const hasWaste = rollAreaCm2 > totalAreaCm2;
  const wasteCost = hasWaste ? subtotalBeforeWaste * params.waste : 0;
  const subtotalAfterWaste = subtotalBeforeWaste + wasteCost;

  const totalBeforeMargin = subtotalAfterWaste + (installation || 0) + (transport || 0);
  const urgencyCost = totalBeforeMargin * (urgency_percentage / 100);
  const totalCostsWithUrgency = totalBeforeMargin + urgencyCost;
  
  let costWithMargin: number;
  let ivaAmount = 0;
  let rawFinalPrice: number;

  if (customer_type === 'final') {
    costWithMargin = totalCostsWithUrgency * (1 + params.profit_margin_final);
    const costAfterMin = Math.max(costWithMargin, params.min_operative);
    ivaAmount = costAfterMin * params.iva;
    rawFinalPrice = costAfterMin + ivaAmount;
  } else {
    costWithMargin = totalCostsWithUrgency * (1 + params.profit_margin_publisher);
    rawFinalPrice = costWithMargin;
  }

  const finalPrice = Math.ceil(rawFinalPrice / 100) * 100;

  const wasteAreaCm2 = Math.max(0, rollAreaCm2 - totalAreaCm2);
  const wasteCostFromRoll = wasteAreaCm2 * params.cost_per_cm2;

  return {
    areaCm2, totalAreaCm2, totalAreaM2, rollWidth, rollAreaCm2, wasteAreaCm2,
    materialCost, wasteCostFromRoll, productionCost, designCost, cuttingCost,
    laminateTotal, taponCost, tubeCost, ojalesCost, sticksCost, subtotalBeforeWaste,
    wasteCost, totalBeforeMargin, urgencyCost, totalCostsWithUrgency,
    costWithMargin, ivaAmount, finalPrice, installation, transport,
    adjustedWidth, adjustedHeight
  };
};

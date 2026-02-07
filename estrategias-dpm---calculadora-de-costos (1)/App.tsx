
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FormData, SavedJob, Product } from './types';
import { calculateQuote } from './utils/calculator';
import { PRODUCT_PRICES_FINAL, PRODUCT_PRICES_PUBLISHER, PRODUCT_DESIGN_TIMES, DEFAULT_PARAMS } from './constants';
import { 
  Calculator, History, Trash2, Save, Info, ArrowRight, Printer, 
  Settings, Sparkles, PieChart as PieChartIcon, CircleDot, ChevronRight,
  Clock, Plus, FileText, User, Phone, X, Download, Share2, MessageCircle,
  Loader2, Package, Search, Edit2, CheckCircle2, Image as ImageIcon, UploadCloud,
  Zap, Check, Layers
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Logo Component - Identidad Estrategias DPM
const Logo: React.FC<{ className?: string, light?: boolean }> = ({ className = "h-12", light = false }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = "logo.png"; 

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!imgError ? (
        <img 
          src={logoUrl} 
          alt="Estrategias DPM - Diseño, Publicidad y Mercadeo" 
          className="h-full w-auto object-contain"
          onError={() => setImgError(true)} 
        />
      ) : (
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="h-full w-auto drop-shadow-sm" fill="none">
            <path d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" fill="#ec3237"/>
            <path d="M35 45L45 55L65 35" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className={`text-xl font-black tracking-tighter ${light ? 'text-white' : 'text-slate-800'}`}>ESTRATEGIAS</span>
            <span className={`text-[8px] font-bold uppercase tracking-[0.05em] mt-0.5 ${light ? 'text-white/80' : 'text-slate-500'}`}>Diseño, Publicidad y Mercadeo</span>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración de costos base
  const [params, setParams] = useState(() => {
    const saved = localStorage.getItem('dpm_params');
    return saved ? JSON.parse(saved) : DEFAULT_PARAMS;
  });

  // Lista de productos dinámica
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('dpm_products');
    if (saved) return JSON.parse(saved);
    
    return Object.keys(PRODUCT_PRICES_FINAL).map(name => ({
      name,
      priceFinal: PRODUCT_PRICES_FINAL[name],
      pricePublisher: PRODUCT_PRICES_PUBLISHER[name] || PRODUCT_PRICES_FINAL[name],
      designTime: PRODUCT_DESIGN_TIMES[name] || 0
    }));
  });

  const [formData, setFormData] = useState<FormData>({
    customer_type: 'final', job_description: '', width: 100, height: 100, quantity: 1,
    production_time: 30, cutting_hours: 0, laminate_speed: '0', installation: 0,
    urgency_percentage: 0, transport: 0, include_design: false, ojalete_quantity: 0,
    include_tubes: true, include_sticks: false, sticks_quantity: 2,
    job_image: undefined
  });

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [quoteJobs, setQuoteJobs] = useState<SavedJob[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'costs' | 'products'>('costs');
  const [productSearch, setProductSearch] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [newProduct, setNewProduct] = useState<Product>({
    name: '', priceFinal: 0, pricePublisher: 0, designTime: 30
  });

  const [editingProductName, setEditingProductName] = useState<string | null>(null);
  const [editProductBuffer, setEditProductBuffer] = useState<Product | null>(null);

  useEffect(() => {
    localStorage.setItem('dpm_params', JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    localStorage.setItem('dpm_products', JSON.stringify(products));
  }, [products]);

  const quote = useMemo(() => calculateQuote(formData, params, products), [formData, params, products]);

  const chartData = useMemo(() => [
    { name: 'Material', value: quote.materialCost },
    { name: 'Producción', value: quote.productionCost },
    { name: 'Diseño', value: quote.designCost },
    { name: 'Otros', value: quote.taponCost + quote.tubeCost + quote.ojalesCost + quote.laminateTotal + quote.cuttingCost + quote.sticksCost },
    { name: 'Merma', value: quote.wasteCost },
    { name: 'Logística', value: quote.installation + quote.transport },
    { name: 'Urgencia', value: quote.urgencyCost },
  ].filter(item => item.value > 0), [quote]);

  const COLORS = ['#ec3237', '#1e293b', '#f59e0b', '#6366f1', '#ec4899', '#71717a', '#dc2626'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({
      ...prev, [id]: type === 'number' ? parseFloat(value as string) || 0 : val
    }));
  };

  const handleToggleDesign = () => {
    setFormData(prev => ({ ...prev, include_design: !prev.include_design }));
  };

  const handleToggleTubes = () => {
    setFormData(prev => ({ ...prev, include_tubes: !prev.include_tubes }));
  };

  const handleUrgencyChange = (percentage: number) => {
    setFormData(prev => ({ ...prev, urgency_percentage: percentage }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, job_image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, job_image: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setParams(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleAddProduct = () => {
    if (!newProduct.name) return;
    setProducts(prev => [...prev, newProduct]);
    setNewProduct({ name: '', priceFinal: 0, pricePublisher: 0, designTime: 30 });
  };

  const handleDeleteProduct = (name: string) => {
    if (window.confirm(`¿Seguro que quieres eliminar "${name}"?`)) {
      setProducts(prev => prev.filter(p => p.name !== name));
    }
  };

  const startEditingProduct = (product: Product) => {
    setEditingProductName(product.name);
    setEditProductBuffer({ ...product });
  };

  const saveProductEdit = () => {
    if (!editProductBuffer || !editingProductName) return;
    setProducts(prev => prev.map(p => p.name === editingProductName ? editProductBuffer : p));
    setEditingProductName(null);
    setEditProductBuffer(null);
  };

  const handleSaveJob = () => {
    if (!formData.job_description) return;
    const newJob: SavedJob = {
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      finalPrice: quote.finalPrice,
      createdAt: new Date().toLocaleString(),
      quoteResult: quote
    };
    setSavedJobs(prev => [newJob, ...prev]);
    // Limpiar imagen después de guardar para el siguiente cálculo
    setFormData(prev => ({ ...prev, job_image: undefined, urgency_percentage: 0 }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addToFormalQuote = (job: SavedJob) => {
    setQuoteJobs(prev => [...prev, job]);
  };

  const removeFromFormalQuote = (index: number) => {
    setQuoteJobs(prev => prev.filter((_, i) => i !== index));
  };

  const generatePdf = async () => {
    if (!quoteJobs.length || isGeneratingPdf) return;
    
    setIsGeneratingPdf(true);
    try {
      // Pequeña espera para asegurar que el DOM esté listo
      await new Promise(r => setTimeout(r, 500));
      
      const element = document.getElementById('quote-document');
      if (!element) throw new Error("Document element not found");
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        // 'onclone' es crucial para modificar el estilo del clon que se va a fotografiar
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('quote-document');
          if (clonedElement) {
            clonedElement.style.opacity = '1';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.left = '0';
            clonedElement.style.position = 'relative';
            clonedElement.style.zIndex = '9999';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_tracking']
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW');
      pdf.save(`Cotizacion_DPM_${customerInfo.name.replace(/\s+/g, '_') || 'Cliente'}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Error al generar PDF. Asegúrate de que todas las imágenes se hayan cargado correctamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const shareWhatsApp = () => {
    const total = quoteJobs.reduce((s, j) => s + j.finalPrice, 0);
    const message = `*Cotización Estrategias DPM*\n\nHola ${customerInfo.name || 'Cliente'},\nAdjuntamos el resumen de tu cotización:\n\n${quoteJobs.map(j => `• ${j.job_description} (${j.width}x${j.height}cm) x${j.quantity}: $${Math.round(j.finalPrice).toLocaleString()}`).join('\n')}\n\n*TOTAL INVERSIÓN: $${Math.round(total).toLocaleString()}*\n\n_Diseño, Publicidad y Mercadeo._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const isAnyPendon = useMemo(() => {
    const desc = formData.job_description.toUpperCase();
    return desc.includes('PENDON') || desc === 'PENDONES' || desc.includes('BANNER');
  }, [formData.job_description]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 overflow-x-hidden">
      {/* Indicador de Generación de PDF */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#ec3237] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-8 h-8 text-[#ec3237]" />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Generando Documento...</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Optimizando artes de Estrategias DPM</p>
        </div>
      )}

      {/* Modal Ajustes */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#ec3237]" /> 
                  PANEL DE CONTROL
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Personaliza tu Calculadora DPM</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
            </div>
            
            <div className="flex border-b border-slate-100 bg-slate-50 px-8">
              <button onClick={() => setSettingsTab('costs')} className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${settingsTab === 'costs' ? 'border-[#ec3237] text-[#ec3237]' : 'border-transparent text-slate-400'}`}>Costos Base</button>
              <button onClick={() => setSettingsTab('products')} className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${settingsTab === 'products' ? 'border-[#ec3237] text-[#ec3237]' : 'border-transparent text-slate-400'}`}>Gestionar Productos</button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {settingsTab === 'costs' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Costo Material (cm²)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" id="cost_per_cm2" value={params.cost_per_cm2} onChange={handleParamChange} step="0.01" className="w-full bg-slate-100 p-3 pl-8 rounded-xl font-mono text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Costo Hora Técnica</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" id="hourly_rate" value={params.hourly_rate} onChange={handleParamChange} className="w-full bg-slate-100 p-3 pl-8 rounded-xl font-mono text-sm" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-[#ec3237]/5 p-6 rounded-[1.5rem] border border-[#ec3237]/10">
                    <h4 className="text-[10px] font-black uppercase text-[#ec3237] mb-4 tracking-tighter flex items-center gap-2">
                      <Plus className="w-3 h-3" /> Añadir Nuevo Producto
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <input type="text" placeholder="Nombre del producto" value={newProduct.name} onChange={e => setNewProduct(prev => ({...prev, name: e.target.value}))} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm" />
                      </div>
                      <div>
                        <input type="number" placeholder="P. Final (cm²)" value={newProduct.priceFinal || ''} onChange={e => setNewProduct(prev => ({...prev, priceFinal: parseFloat(e.target.value) || 0}))} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm" />
                      </div>
                      <div>
                        <input type="number" placeholder="P. Publicista (cm²)" value={newProduct.pricePublisher || ''} onChange={e => setNewProduct(prev => ({...prev, pricePublisher: parseFloat(e.target.value) || 0}))} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm" />
                      </div>
                    </div>
                    <button onClick={handleAddProduct} className="w-full mt-4 bg-[#ec3237] text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-[#ec3237]/20">AÑADIR AL CATÁLOGO</button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" placeholder="Buscar productos..." 
                        value={productSearch} onChange={e => setProductSearch(e.target.value)}
                        className="w-full p-3 pl-10 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      />
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {filteredProducts.map(p => (
                        <div key={p.name} className="flex flex-col p-4 hover:bg-slate-50 group">
                          {editingProductName === p.name ? (
                            <div className="space-y-3">
                              <input 
                                type="text" 
                                value={editProductBuffer?.name || ''} 
                                onChange={e => setEditProductBuffer(prev => prev ? {...prev, name: e.target.value} : null)}
                                className="w-full p-2 bg-white border border-[#ec3237] rounded-lg text-sm font-bold"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="number" 
                                  placeholder="P. Final"
                                  value={editProductBuffer?.priceFinal || ''} 
                                  onChange={e => setEditProductBuffer(prev => prev ? {...prev, priceFinal: parseFloat(e.target.value) || 0} : null)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                                />
                                <input 
                                  type="number" 
                                  placeholder="P. Publ"
                                  value={editProductBuffer?.pricePublisher || ''} 
                                  onChange={e => setEditProductBuffer(prev => prev ? {...prev, pricePublisher: parseFloat(e.target.value) || 0} : null)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={saveProductEdit} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1"><Check className="w-3 h-3"/> Guardar</button>
                                <button onClick={() => setEditingProductName(null)} className="flex-1 bg-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-black uppercase">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">Final: ${p.priceFinal} | Publ: ${p.pricePublisher}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => startEditingProduct(p)} className="p-2 text-slate-400 hover:text-[#ec3237] hover:bg-[#ec3237]/5 rounded-lg transition-all">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteProduct(p.name)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50">
              <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl tracking-widest uppercase text-xs">CERRAR PANEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo className="h-14" />
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSettings(true)} className="group flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-[#ec3237] transition-all">
              <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" /> 
              <span className="hidden sm:inline">Ajustes DPM</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario de Cotización */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200">
            <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-800 italic">
              <Calculator className="w-6 h-6 text-[#ec3237]" /> NUEVA COTIZACIÓN
            </h2>
            <div className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setFormData(prev => ({...prev, customer_type: 'final'}))}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.customer_type === 'final' ? 'bg-white shadow-sm text-[#ec3237]' : 'text-slate-400'}`}
                >
                  Final (+IVA)
                </button>
                <button 
                  onClick={() => setFormData(prev => ({...prev, customer_type: 'publicista'}))}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.customer_type === 'publicista' ? 'bg-white shadow-sm text-[#ec3237]' : 'text-slate-400'}`}
                >
                  Publicista
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Producto / Servicio</label>
                <select id="job_description" value={formData.job_description} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#ec3237] transition-all appearance-none cursor-pointer">
                  <option value="">Seleccionar del catálogo...</option>
                  {products.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer" onClick={handleToggleDesign}>
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-3 h-3 ${formData.include_design ? 'text-[#ec3237]' : 'text-slate-300'}`} />
                    <span className="text-[9px] font-black text-slate-700 uppercase leading-none">Diseño</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 relative ${formData.include_design ? 'bg-[#ec3237]' : 'bg-slate-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${formData.include_design ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-2 transition-all flex items-center justify-center cursor-pointer h-[48px] ${formData.job_image ? 'border-[#ec3237] bg-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  {formData.job_image ? <ImageIcon className="w-4 h-4 text-[#ec3237]" /> : <UploadCloud className="w-4 h-4 text-slate-300" />}
                </div>
              </div>

              {/* OPCIÓN DE TUBOS (Solo para Pendones) */}
              {isAnyPendon && (
                <div className="bg-[#ec3237]/5 p-4 rounded-2xl border border-[#ec3237]/10 flex items-center justify-between group cursor-pointer animate-in zoom-in-95" onClick={handleToggleTubes}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-all ${formData.include_tubes ? 'bg-[#ec3237] text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 uppercase leading-none">Acabado con Tubos</span>
                      <span className="text-[8px] text-slate-400 font-bold mt-1 uppercase">{formData.include_tubes ? 'Tubos Incluidos' : 'Sin Tubos / Solo Lona'}</span>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 relative ${formData.include_tubes ? 'bg-[#ec3237]' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${formData.include_tubes ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              )}

              {/* SELECTOR DE URGENCIA */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-[#ec3237]" /> Prioridad de Entrega
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 20, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleUrgencyChange(pct)}
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                        formData.urgency_percentage === pct 
                        ? 'bg-[#ec3237] text-white border-[#ec3237] shadow-lg shadow-[#ec3237]/20 scale-105' 
                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {pct === 0 ? 'NORMAL' : `+${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ancho (cm)</label>
                  <input type="number" id="width" value={formData.width} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Alto (cm)</label>
                  <input type="number" id="height" value={formData.height} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Cantidad</label>
                  <input type="number" id="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Instalación ($)</label>
                  <input type="number" id="installation" value={formData.installation} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-[#ec3237]" />
                </div>
              </div>

              <button onClick={handleSaveJob} className="w-full mt-4 flex items-center justify-center gap-3 bg-[#ec3237] text-white font-black py-5 rounded-2xl hover:bg-[#d02b30] shadow-xl shadow-[#ec3237]/20 transition-all transform active:scale-[0.98]">
                <Plus className="w-6 h-6" /> CALCULAR Y GUARDAR
              </button>
            </div>
          </section>
        </div>

        {/* Resultados y Gráfico */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-[#ec3237]">
                <PieChartIcon className="w-6 h-6" />
              </div>
            </div>
            
            <span className="text-[10px] font-black text-[#ec3237] uppercase tracking-[0.3em]">Total Inversión</span>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter my-2">
              ${Math.round(quote.finalPrice).toLocaleString()}
            </h2>
            <div className="flex items-center gap-2 mb-8">
              <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Rentabilidad Optimizada</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{formData.customer_type === 'final' ? '+ IVA 19%' : 'Tarifa Publicista'}</span>
            </div>
            
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                    {chartData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black flex items-center gap-2 text-slate-800 uppercase tracking-widest italic">
                <History className="w-5 h-5 text-[#ec3237]" /> HISTORIAL DE CALCULOS
              </h3>
              <span className="bg-[#ec3237] text-white px-3 py-1 rounded-full text-[10px] font-black">{savedJobs.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {savedJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-200">
                  <Package className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No hay registros aún</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {savedJobs.map(job => (
                    <div key={job.id} className="group p-6 hover:bg-[#ec3237]/5 transition-all border-l-4 border-l-transparent hover:border-l-[#ec3237] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {job.job_image && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                            <img src={job.job_image} className="w-full h-full object-cover" alt="miniatura" />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-slate-800 uppercase tracking-tight">{job.job_description}</span>
                            {job.include_design && <Sparkles className="w-3 h-3 text-[#f59e0b]" />}
                            {job.urgency_percentage > 0 && <Zap className="w-3 h-3 text-[#ec3237]" />}
                            {job.include_tubes && (job.job_description.toUpperCase().includes('PENDON') || job.job_description.toUpperCase().includes('BANNER')) && <Layers className="w-3 h-3 text-slate-400" />}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold">{job.width}x{job.height}cm</span>
                            <span className="text-[10px] text-[#ec3237] font-black">x{job.quantity} Unidades</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-sm text-slate-900">${Math.round(job.finalPrice).toLocaleString()}</span>
                        <button onClick={() => addToFormalQuote(job)} className="p-3 bg-slate-50 text-[#ec3237] rounded-2xl hover:bg-[#ec3237] hover:text-white transition-all transform hover:rotate-12">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Generador de PDF */}
        <div className="lg:col-span-3">
          <section className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <FileText className="w-6 h-6 text-[#ec3237]" />
              <h2 className="text-xl font-black text-slate-800 italic">COTIZADOR</h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" placeholder="Nombre del Cliente" value={customerInfo.name} onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold" />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" placeholder="Celular / WhatsApp" value={customerInfo.phone} onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-8 pr-2">
              {quoteJobs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[1.5rem] flex flex-col items-center">
                  <Plus className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-[10px] font-black uppercase text-slate-300 px-6">Añade del historial para cotizar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quoteJobs.map((job, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group animate-in slide-in-from-right-5">
                      <div className="flex items-center gap-2">
                        {job.job_image && <ImageIcon className="w-3 h-3 text-[#ec3237]" />}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 truncate max-w-[120px] uppercase">{job.job_description}</span>
                          <span className="text-[9px] text-[#ec3237] font-black">${Math.round(job.finalPrice).toLocaleString()}</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromFormalQuote(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {quoteJobs.length > 0 && (
              <div className="mb-6 p-5 bg-[#ec3237] rounded-2xl text-white shadow-lg shadow-[#ec3237]/30">
                <span className="text-[9px] font-black uppercase opacity-60">Subtotal Inversión</span>
                <div className="text-2xl font-black">${Math.round(quoteJobs.reduce((s, j) => s + j.finalPrice, 0)).toLocaleString()}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={generatePdf} 
                disabled={quoteJobs.length === 0 || isGeneratingPdf} 
                className="flex items-center justify-center gap-3 bg-slate-900 text-white font-black py-5 rounded-[1.5rem] hover:bg-black shadow-xl shadow-slate-200 disabled:opacity-20 transition-all uppercase text-[10px] tracking-widest"
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
              </button>
              <button 
                onClick={shareWhatsApp} 
                disabled={quoteJobs.length === 0} 
                className="flex items-center justify-center gap-3 bg-green-600 text-white font-black py-5 rounded-[1.5rem] hover:bg-green-700 shadow-xl shadow-green-200 disabled:opacity-20 transition-all uppercase text-[10px] tracking-widest"
              >
                <MessageCircle className="w-4 h-4" /> WHATSAPP
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Render Documento PDF - Visible para captura mediante onclone */}
      <div 
        id="quote-document" 
        className="fixed top-0 bg-white p-12 w-[800px]"
        style={{ left: '-2000px', zIndex: -10, opacity: 0.01 }}
      >
        <div className="flex justify-between items-start mb-16 border-b-2 border-slate-100 pb-12">
          <Logo className="h-24" />
          <div className="text-right text-[12px] text-slate-400 font-bold uppercase tracking-widest">
            <p className="text-slate-900 text-lg font-black tracking-tighter">ESTRATEGIAS DPM</p>
            <p>La Unión, Nariño</p>
            <p className="text-[#ec3237] font-black">{customerInfo.phone || 'Diseño, Publicidad y Mercadeo'}</p>
          </div>
        </div>
        
        <h1 className="text-4xl font-black mb-12 uppercase italic tracking-tighter text-slate-900 border-l-[12px] border-[#ec3237] pl-8">Cotización Formal</h1>
        
        <div className="grid grid-cols-2 gap-12 mb-16">
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
            <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest mb-2">Cliente / Empresa:</p>
            <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{customerInfo.name || 'CLIENTE PARTICULAR'}</p>
          </div>
          <div className="flex flex-col justify-center text-right">
            <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha Documento:</p>
            <p className="text-xl font-black text-slate-900">{new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <table className="w-full mb-16 border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[11px] uppercase font-black tracking-[0.2em]">
              <th className="p-6 text-left rounded-l-2xl">Descripción Detallada</th>
              <th className="p-6 text-center">Cant</th>
              <th className="p-6 text-right rounded-r-2xl">V. Unitario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quoteJobs.map((j, i) => (
              <tr key={i} className="text-sm">
                <td className="p-8">
                  <div className="flex gap-6 items-start">
                    {j.job_image && (
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                        <img src={j.job_image} className="w-full h-full object-cover" alt="miniatura-doc" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-black text-slate-900 uppercase text-lg leading-tight">{j.job_description}</p>
                      <p className="text-[12px] text-slate-400 font-bold mt-2">
                        Especificaciones: {j.width}x{j.height}cm • {j.include_design ? 'Incluye Diseño' : 'Material Cliente'} • {j.urgency_percentage > 0 ? `Entrega Urgente (+${j.urgency_percentage}%)` : 'Entrega Estándar'}
                        {(j.job_description.toUpperCase().includes('PENDON') || j.job_description.toUpperCase().includes('BANNER')) && ` • ${j.include_tubes ? 'Con Tubos' : 'Sin Tubos'}`}
                      </p>
                      {j.job_image && <p className="text-[10px] text-[#ec3237] font-black uppercase mt-2 tracking-widest italic">Borrador / Referencia Adjunta</p>}
                    </div>
                  </div>
                </td>
                <td className="p-8 text-center font-black text-slate-600 text-lg">{j.quantity}</td>
                <td className="p-8 text-right font-black text-[#ec3237] text-xl">${Math.round(j.finalPrice / j.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="p-10 text-right font-black uppercase text-xs tracking-widest text-slate-400">Total Inversión Bruta</td>
              <td className="p-10 text-right text-5xl font-black text-slate-900 tracking-tighter">
                ${Math.round(quoteJobs.reduce((s, j) => s + j.finalPrice, 0)).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="bg-slate-50 p-12 rounded-[3rem] mt-24 border border-slate-100">
          <h4 className="font-black text-[12px] uppercase tracking-[0.2em] text-[#ec3237] mb-8 flex items-center gap-3">
             <Info className="w-5 h-5" /> NOTAS DE SERVICIO
          </h4>
          <ul className="text-[11px] text-slate-500 space-y-4 font-bold uppercase leading-relaxed italic">
            <li className="flex gap-4"><span>▶</span> El valor total incluye los impuestos de ley según régimen del cliente.</li>
            <li className="flex gap-4"><span>▶</span> Los tiempos de entrega inician tras el pago del anticipo (80%) y aprobación de artes.</li>
            <li className="flex gap-4"><span>▶</span> Garantía de calidad DPM en fidelidad de color y acabados profesionales.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;

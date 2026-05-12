/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  MapPin, 
  Calculator, 
  Plus, 
  Trash2, 
  UserPlus, 
  CheckCircle2, 
  Info, 
  Printer, 
  RotateCcw, 
  Building2, 
  Landmark, 
  Wallet, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

type FilerStatus = 'Filer' | 'Late Filer' | 'Non-Filer';
type ResidentialStatus = 'Resident' | 'Non-Resident';
type PropertyCategory = 'Urban' | 'Rural';
type PropertyType = 'Agricultural Land' | 'Residential House' | 'Residential Plot' | 'Commercial Plot' | 'Commercial Building';

interface Person {
  id: string;
  name: string;
  contact: string;
  filerStatus: FilerStatus;
  residentialStatus: ResidentialStatus;
  share: number;
}

interface PropertyDetails {
  category: PropertyCategory;
  type: PropertyType;
  hasBuildingPlan: boolean;
  acre: number | '';
  kanal: number | '';
  marla: number | '';
  sqft: number;
  marlaSize: number;
  dcRatePerUnit: number;
  dcRateUnit: 'Marla' | 'Acre';
  constructionCostPerSqft: number;
  coveredArea: number;
  declaredValue: number;
}

// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- Main Component ---

export default function App() {
  // State
  const [buyers, setBuyers] = useState<Person[]>([
    { id: 'b1', name: 'Buyer 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100 }
  ]);
  const [sellers, setSellers] = useState<Person[]>([
    { id: 's1', name: 'Seller 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100 }
  ]);
  const [property, setProperty] = useState<PropertyDetails>({
    category: 'Urban',
    type: 'Residential House',
    hasBuildingPlan: true,
    acre: '',
    kanal: '',
    marla: 5,
    sqft: 0,
    marlaSize: 272,
    dcRatePerUnit: 500000,
    dcRateUnit: 'Marla',
    constructionCostPerSqft: 2000,
    coveredArea: 1500,
    declaredValue: 0
  });

  const [recipientNumber, setRecipientNumber] = useState('0347-7710338');
  const [senderNumber, setSenderNumber] = useState('0347-7710338');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  
  // Editable Charges
  const [patwariVisitAmount, setPatwariVisitAmount] = useState(8000);
  const [draftingChargesAmount, setDraftingChargesAmount] = useState(10000);
  const [serviceChargesPercent, setServiceChargesPercent] = useState(1);
  const [manualServiceCharges, setManualServiceCharges] = useState<number | null>(null);
  
  const restoreDefaultRecipient = () => setRecipientNumber('0347-7710338');
  const restoreDefaultSender = () => setSenderNumber('0347-7710338');

  // Load from session storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('registry_estimator_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.buyers) setBuyers(parsed.buyers);
        if (parsed.sellers) setSellers(parsed.sellers);
        if (parsed.property) setProperty(prev => ({ ...prev, ...parsed.property }));
        if (parsed.patwariVisitAmount) setPatwariVisitAmount(parsed.patwariVisitAmount);
        if (parsed.draftingChargesAmount) setDraftingChargesAmount(parsed.draftingChargesAmount);
        if (parsed.serviceChargesPercent) setServiceChargesPercent(parsed.serviceChargesPercent);
        if (parsed.manualServiceCharges !== undefined) setManualServiceCharges(parsed.manualServiceCharges);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  // Save to session storage on change
  useEffect(() => {
    localStorage.setItem('registry_estimator_data', JSON.stringify({ 
      buyers, 
      sellers, 
      property,
      patwariVisitAmount,
      draftingChargesAmount,
      serviceChargesPercent,
      manualServiceCharges
    }));
  }, [buyers, sellers, property, patwariVisitAmount, draftingChargesAmount, serviceChargesPercent, manualServiceCharges]);

  // Adjust DC Rate Unit based on property type
  useEffect(() => {
    if (property.type === 'Agricultural Land') {
      setProperty(prev => ({ ...prev, dcRateUnit: 'Acre' }));
    } else {
      setProperty(prev => ({ ...prev, dcRateUnit: 'Marla' }));
    }
  }, [property.type]);

  // Logic: Calculations
  const calculations = useMemo(() => {
    // 1. Total Area Units
    const acreVal = Number(property.acre) || 0;
    const kanalVal = Number(property.kanal) || 0;
    const marlaVal = Number(property.marla) || 0;
    const sqftVal = Number(property.sqft) || 0;
    const marlaSizeVal = Number(property.marlaSize) || 272; // Default to 272 if 0 or NaN
    
    const totalMarla = (acreVal * 160) + (kanalVal * 20) + marlaVal + (sqftVal / marlaSizeVal);
    
    // 2. DC Values
    let dcLandValue = 0;
    const dcRate = Number(property.dcRatePerUnit) || 0;
    if (property.dcRateUnit === 'Acre') {
      dcLandValue = (totalMarla / 160) * dcRate;
    } else {
      dcLandValue = totalMarla * dcRate;
    }
    
    const coveredAreaVal = Number(property.coveredArea) || 0;
    const constCostVal = Number(property.constructionCostPerSqft) || 0;
    const dcConstructionValue = (property.type === 'Residential House' || property.type === 'Commercial Building') ? coveredAreaVal * constCostVal : 0;
    const totalDcValue = (dcLandValue || 0) + (dcConstructionValue || 0);
    
    // 3. Transaction Value (Max of Declared vs DC)
    const declaredValueVal = Number(property.declaredValue) || 0;
    const transactionValue = Math.max(declaredValueVal, totalDcValue || 0);

    // 4. Buyer Detailed Expenses
    const buyerExpenses = buyers.map(buyer => {
      const share = Number(buyer.share) || 0;
      const shareValue = (transactionValue * share) / 100;
      
      // 236K Withholding Tax (Buyer)
      let whtRate = 0;
      if (buyer.residentialStatus === 'Non-Resident') {
        whtRate = 0.015;
      } else {
        if (buyer.filerStatus === 'Filer') whtRate = 0.015;
        else if (buyer.filerStatus === 'Late Filer') whtRate = 0.045;
        else whtRate = 0.105;
      }
      const wht236K = shareValue * whtRate;

      // Stamp Duty (Provincial)
      const stampDutyRate = property.category === 'Urban' ? 0.01 : 0.03;
      const stampDuty = shareValue * stampDutyRate;

      // Municipal Committee Fee (@1%)
      const municipalCommitteeFee = shareValue * 0.01;

      // Fixed/Dynamic Fees (Pro-rated by share)
      const regFee = shareValue < 500000 ? 500 : 1000;
      const borCharges = 100;
      const plraCharges = Math.max(3300, shareValue * 0.001);
      const mutationFee = 300;
      const plraMutationFee = 200;
      
      // Building Plan Surcharge (2% of DC Land Value if No Building Plan)
      const buildingPlanSurcharge = ((property.type === 'Residential House' || property.type === 'Commercial Building') && !property.hasBuildingPlan) ? ((dcLandValue * share / 100) * 0.02) : 0;
 
      // Provincial Government Expenses Sum
      const totalProvincialExpenses = stampDuty + municipalCommitteeFee + regFee + borCharges + mutationFee + plraCharges + plraMutationFee + buildingPlanSurcharge;
 
      // Total Buyer Gov Fees (FBR + Provincial)
      const totalGovFees = wht236K + totalProvincialExpenses;
 
      return {
        ...buyer,
        shareValue,
        wht236K,
        stampDuty,
        municipalCommitteeFee,
        totalProvincialExpenses,
        govFees: {
          regFee,
          borCharges,
          plraCharges,
          mutationFee,
          plraMutationFee,
          buildingPlanSurcharge
        },
        totalGovFees
      };
    });

    // 5. Seller Detailed Expenses
    const sellerExpenses = sellers.map(seller => {
      const share = Number(seller.share) || 0;
      const shareValue = (transactionValue * share) / 100;

      // 236C Withholding Tax (Seller)
      let whtRate = 0;
      if (seller.residentialStatus === 'Non-Resident') {
        whtRate = 0.045; // Filer rate for non-residents
      } else {
        if (seller.filerStatus === 'Filer') whtRate = 0.045;
        else if (seller.filerStatus === 'Late Filer') whtRate = 0.075;
        else whtRate = 0.115;
      }
      const wht236C = shareValue * whtRate;
      
      return {
        ...seller,
        shareValue,
        wht236C
      };
    });

    // 6. Global "Other" Expenses (Standard across transaction)
    const patwariVisit = Number(patwariVisitAmount) || 0;
    const calcAdditionalCharges = transactionValue * (serviceChargesPercent / 100);
    const additionalCharges = manualServiceCharges !== null ? manualServiceCharges : calcAdditionalCharges;
    const draftingCharges = Number(draftingChargesAmount) || 0;
    const totalOtherExpenses = patwariVisit + additionalCharges + draftingCharges;

    // aggregated Provincial components for breakdown
    const provBreakdown = {
      stampDuty: buyerExpenses.reduce((a, b) => a + (b.stampDuty || 0), 0),
      municipalFee: buyerExpenses.reduce((a, b) => a + (b.municipalCommitteeFee || 0), 0),
      regFee: buyerExpenses.reduce((a, b) => a + (b.govFees.regFee || 0), 0),
      borCharges: buyerExpenses.reduce((a, b) => a + (b.govFees.borCharges || 0), 0),
      plraCharges: buyerExpenses.reduce((a, b) => a + (b.govFees.plraCharges || 0), 0),
      mutationFee: buyerExpenses.reduce((a, b) => a + (b.govFees.mutationFee || 0), 0),
      plraMutationFee: buyerExpenses.reduce((a, b) => a + (b.govFees.plraMutationFee || 0), 0),
      buildingPlanSurcharge: buyerExpenses.reduce((a, b) => a + (b.govFees.buildingPlanSurcharge || 0), 0)
    };

    // Totals
    const totalBuyerExpenses = buyerExpenses.reduce((acc, curr) => acc + (curr.totalGovFees || 0), 0);
    const totalSellerExpenses = sellerExpenses.reduce((acc, curr) => acc + (curr.wht236C || 0), 0);
    const grandTotal = (totalBuyerExpenses || 0) + (totalSellerExpenses || 0) + (totalOtherExpenses || 0);

    return {
      dcLandValue: dcLandValue || 0,
      dcConstructionValue: dcConstructionValue || 0,
      totalDcValue: totalDcValue || 0,
      transactionValue: transactionValue || 0,
      buyerExpenses,
      sellerExpenses,
      patwariVisit,
      additionalCharges: additionalCharges || 0,
      draftingCharges,
      totalOtherExpenses: totalOtherExpenses || 0,
      totalBuyerExpenses: totalBuyerExpenses || 0,
      totalSellerExpenses: totalSellerExpenses || 0,
      grandTotal: grandTotal || 0,
      provBreakdown,
      calcAdditionalCharges
    };
  }, [buyers, sellers, property, patwariVisitAmount, draftingChargesAmount, serviceChargesPercent, manualServiceCharges]);

  // Handlers
  const addBuyer = () => {
    const newCount = buyers.length + 1;
    const equalShare = Number((100 / newCount).toFixed(2));
    
    const redistributedBuyers = buyers.map(b => ({ ...b, share: equalShare }));
    
    setBuyers([...redistributedBuyers, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: `Buyer ${newCount}`, 
      contact: '', 
      filerStatus: 'Filer', 
      residentialStatus: 'Resident', 
      share: equalShare 
    }]);
  };

  const removeBuyer = (id: string) => {
    if (buyers.length > 1) {
      const filteredBuyers = buyers.filter(b => b.id !== id);
      const newCount = filteredBuyers.length;
      const equalShare = Number((100 / newCount).toFixed(2));
      
      setBuyers(filteredBuyers.map(b => ({ ...b, share: equalShare })));
    }
  };

  const addSeller = () => {
    const newCount = sellers.length + 1;
    const equalShare = Number((100 / newCount).toFixed(2));
    
    const redistributedSellers = sellers.map(s => ({ ...s, share: equalShare }));

    setSellers([...redistributedSellers, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: `Seller ${newCount}`, 
      contact: '', 
      filerStatus: 'Filer', 
      residentialStatus: 'Resident', 
      share: equalShare 
    }]);
  };

  const removeSeller = (id: string) => {
    if (sellers.length > 1) {
      const filteredSellers = sellers.filter(s => s.id !== id);
      const newCount = filteredSellers.length;
      const equalShare = Number((100 / newCount).toFixed(2));
      
      setSellers(filteredSellers.map(s => ({ ...s, share: equalShare })));
    }
  };

  const resetData = () => {
    if (confirm("Are you sure you want to reset all data?")) {
      setBuyers([{ id: 'b1', name: 'Buyer 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100 }]);
      setSellers([{ id: 's1', name: 'Seller 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100 }]);
      setProperty({
        category: 'Urban',
        type: 'Residential House',
        hasBuildingPlan: true,
        acre: 0,
        kanal: 0,
        marla: 5,
        sqft: 0,
        marlaSize: 272,
        dcRatePerUnit: 500000,
        constructionCostPerSqft: 2000,
        coveredArea: 1500,
        declaredValue: 0
      });
      setPatwariVisitAmount(8000);
      setDraftingChargesAmount(10000);
      setServiceChargesPercent(1);
      setManualServiceCharges(null);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyIndividualSlip = (person: Person) => {
    const isBuyer = buyers.some(b => b.id === person.id);
    let amount = 0;
    if (isBuyer) {
      amount = calculations.buyerExpenses.find(b => b.id === person.id)?.totalGovFees || 0;
    } else {
      const s = calculations.sellerExpenses.find(s => s.id === person.id);
      amount = (s?.wht236C || 0);
    }
    
    const msg = `Dear Mr. / Mrs. ${person.name},\n\nYour individual share for the registry expenses is: *${formatCurrency(amount)}*.\n\nRegards, Wasiqa Expert\nThank you for trusting us.`;
    
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(person.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-lg sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-accent p-2 rounded-lg">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Registry Estimator</h1>
              <p className="text-xs text-slate-400 font-medium opacity-80 uppercase tracking-widest">Estimate Property Registration Expenses in Punjab</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
            <button 
              onClick={resetData}
              className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-md transition-colors text-sm font-medium border border-red-600/20"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </header>

      {/* Print Report Header (Hidden in UI) */}
      <div className="hidden print-only p-12 bg-white">
        <div className="border-b-4 border-primary pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-primary tracking-tighter uppercase">Registry Cost Report</h1>
            <p className="text-slate-500 font-bold tracking-widest text-xs mt-1 uppercase">Professional Financial Document</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">Date: {new Date().toLocaleDateString('en-GB')}</p>
            <p className="text-xs text-slate-500">Report ID: REG-{Math.floor(100000 + Math.random() * 900000)}</p>
          </div>
        </div>

        {/* Property Context */}
        <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Property Particulars</h3>
            <div className="space-y-2">
              <p className="text-sm"><span className="text-slate-500 font-medium">Category:</span> <span className="font-bold text-slate-800">{property.category}</span></p>
              <p className="text-sm"><span className="text-slate-500 font-medium">Type:</span> <span className="font-bold text-slate-800">{property.type}</span></p>
              <p className="text-sm"><span className="text-slate-500 font-medium">Declared Value:</span> <span className="font-bold text-slate-800">{formatCurrency(property.declaredValue)}</span></p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Valuation Analysis</h3>
            <div className="space-y-2">
              <p className="text-sm"><span className="text-slate-500 font-medium">DC Land Value:</span> <span className="font-bold text-slate-800">{formatCurrency(calculations.dcLandValue)}</span></p>
              <p className="text-sm"><span className="text-slate-500 font-medium">Transaction Value:</span> <span className="font-bold text-accent">{formatCurrency(calculations.transactionValue)}</span></p>
              <p className="text-[10px] text-slate-400 italic mt-2">*Calculations applied on maximum of DC vs Declared value.</p>
            </div>
          </div>
        </div>

        {/* Financial Totals */}
        <div className="mb-12">
          <h3 className="text-xs font-black text-slate-900 border-l-4 border-accent pl-2 mb-6 uppercase tracking-widest">Financial Summary</h3>
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-slate-900 text-white p-6 rounded-l-2xl">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Govt Fees</p>
              <p className="text-xl font-bold">{formatCurrency(calculations.totalBuyerExpenses + calculations.totalSellerExpenses)}</p>
            </div>
            <div className="bg-slate-800 text-white p-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Other Charges</p>
              <p className="text-xl font-bold">{formatCurrency(calculations.totalOtherExpenses)}</p>
            </div>
            <div className="bg-accent text-white p-6 rounded-r-2xl">
              <p className="text-[10px] text-white/70 font-bold uppercase mb-1">Grand Total</p>
              <p className="text-2xl font-black">{formatCurrency(calculations.grandTotal)}</p>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="mb-12">
          <h3 className="text-xs font-black text-slate-900 border-l-4 border-accent pl-2 mb-4 uppercase tracking-widest">Detailed Expense Breakdown</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 uppercase text-[10px] font-black text-slate-600">
                <th className="p-3 border border-slate-200">Description</th>
                <th className="p-3 border border-slate-200">Party</th>
                <th className="p-3 border border-slate-200 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="p-3 border border-slate-200">FBR Withholding Tax (236K)</td>
                <td className="p-3 border border-slate-200">Buyer(s)</td>
                <td className="p-3 border border-slate-200 text-right font-medium">{formatCurrency(calculations.buyerExpenses.reduce((a, b) => a + b.wht236K, 0))}</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">FBR Withholding Tax (236C)</td>
                <td className="p-3 border border-slate-200">Seller(s)</td>
                <td className="p-3 border border-slate-200 text-right font-medium">{formatCurrency(calculations.sellerExpenses.reduce((a, b) => a + b.wht236C, 0))}</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Stamp Duty & Provincial Taxes</td>
                <td className="p-3 border border-slate-200">Buyer(s)</td>
                <td className="p-3 border border-slate-200 text-right font-medium">{formatCurrency(calculations.buyerExpenses.reduce((a, b) => a + b.totalProvincialExpenses, 0))}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 border border-slate-200 italic">Legal, Drafting & Services</td>
                <td className="p-3 border border-slate-200 text-xs">-</td>
                <td className="p-3 border border-slate-200 text-right font-medium">{formatCurrency(calculations.totalOtherExpenses)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={2} className="p-4 text-right uppercase text-xs">Final Payable Amount</td>
                <td className="p-4 text-right text-lg">{formatCurrency(calculations.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-20 border-t pt-8 text-center bg-white">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mb-1">Generated by Wasiqa Expert - Registry Estimator</p>
          <p className="text-[8px] text-slate-300">This is a system-generated estimation report and should be verified against the latest FBR and Provincial government schedules.</p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Forms */}
        <div className="lg:col-span-7 space-y-8 no-print">
          
          {/* Section: Buyer Information */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Users className="w-5 h-5 text-accent" />
                <h2>Buyer(s) Information</h2>
              </div>
              <button 
                onClick={addBuyer}
                className="text-xs flex items-center gap-1 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md transition-all font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Buyer
              </button>
            </div>
            <div className="p-4 space-y-6">
              {buyers.map((buyer, index) => (
                <div key={buyer.id} className="relative p-4 rounded-lg bg-slate-50 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                  {buyers.length > 1 && (
                    <button 
                      onClick={() => removeBuyer(buyer.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Name</label>
                      <input 
                        type="text" 
                        value={buyer.name}
                        onChange={(e) => {
                          const newBuyers = [...buyers];
                          newBuyers[index].name = e.target.value;
                          setBuyers(newBuyers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Share (%)</label>
                      <input 
                        type="number" 
                        value={buyer.share}
                        onChange={(e) => {
                          const newBuyers = [...buyers];
                          newBuyers[index].share = Number(e.target.value);
                          setBuyers(newBuyers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Filer Status</label>
                      <select 
                        value={buyer.filerStatus}
                        onChange={(e) => {
                          const newBuyers = [...buyers];
                          newBuyers[index].filerStatus = e.target.value as FilerStatus;
                          setBuyers(newBuyers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="Filer">Filer</option>
                        <option value="Late Filer">Late Filer</option>
                        <option value="Non-Filer">Non-Filer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Residential Status</label>
                      <select 
                        value={buyer.residentialStatus}
                        onChange={(e) => {
                          const newBuyers = [...buyers];
                          newBuyers[index].residentialStatus = e.target.value as ResidentialStatus;
                          setBuyers(newBuyers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="Resident">Resident</option>
                        <option value="Non-Resident">Non-Resident</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Seller Information */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Users className="w-5 h-5 text-accent" />
                <h2>Seller(s) Information</h2>
              </div>
              <button 
                onClick={addSeller}
                className="text-xs flex items-center gap-1 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md transition-all font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Seller
              </button>
            </div>
            <div className="p-4 space-y-6">
              {sellers.map((seller, index) => (
                <div key={seller.id} className="relative p-4 rounded-lg bg-slate-50 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                  {sellers.length > 1 && (
                    <button 
                      onClick={() => removeSeller(seller.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Name</label>
                      <input 
                        type="text" 
                        value={seller.name}
                        onChange={(e) => {
                          const newSellers = [...sellers];
                          newSellers[index].name = e.target.value;
                          setSellers(newSellers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Share (%)</label>
                      <input 
                        type="number" 
                        value={seller.share}
                        onChange={(e) => {
                          const newSellers = [...sellers];
                          newSellers[index].share = Number(e.target.value);
                          setSellers(newSellers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Filer Status</label>
                      <select 
                        value={seller.filerStatus}
                        onChange={(e) => {
                          const newSellers = [...sellers];
                          newSellers[index].filerStatus = e.target.value as FilerStatus;
                          setSellers(newSellers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="Filer">Filer</option>
                        <option value="Late Filer">Late Filer</option>
                        <option value="Non-Filer">Non-Filer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Residential Status</label>
                      <select 
                        value={seller.residentialStatus}
                        onChange={(e) => {
                          const newSellers = [...sellers];
                          newSellers[index].residentialStatus = e.target.value as ResidentialStatus;
                          setSellers(newSellers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="Resident">Resident</option>
                        <option value="Non-Resident">Non-Resident</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Property Details */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <MapPin className="w-5 h-5 text-accent" />
                <h2>Property Details</h2>
              </div>
            </div>
            <div className="p-6 space-y-8">
              {/* Category & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Category</label>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    {['Urban', 'Rural'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setProperty({ ...property, category: cat as PropertyCategory })}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                          property.category === cat 
                            ? 'bg-white text-primary shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Property Type</label>
                  <select 
                    value={property.type}
                    onChange={(e) => setProperty({ ...property, type: e.target.value as PropertyType })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none shadow-sm font-medium"
                  >
                    <option value="Residential House">Residential House</option>
                    <option value="Residential Plot">Residential Plot</option>
                    <option value="Commercial Plot">Commercial Plot</option>
                    <option value="Commercial Building">Commercial Building</option>
                    <option value="Agricultural Land">Agricultural Land</option>
                  </select>
                </div>
              </div>

              {/* Area Inputs */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Area Breakdown</h3>
                  <div className="flex gap-2">
                    <div className="text-[9px] font-bold text-slate-400 px-2 py-0.5 bg-slate-200 rounded text-center">1 Kanal = 20 Marlas</div>
                    <div className="text-[9px] font-bold text-slate-400 px-2 py-0.5 bg-slate-200 rounded text-center">1 Acre = 8 Kanals</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(property.type === 'Agricultural Land') && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Acre</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={property.acre === 0 || property.acre === '' ? '' : property.acre}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              setProperty({ ...property, acre: val === '' ? '' : Number(val) });
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Kanal</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={property.kanal === 0 || property.kanal === '' ? '' : property.kanal}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              setProperty({ ...property, kanal: val === '' ? '' : Number(val) });
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Marla</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={property.marla === 0 || property.marla === '' ? '' : property.marla}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setProperty({ ...property, marla: val === '' ? '' : Number(val) });
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Sqft</label>
                    <input 
                      type="number" 
                      value={property.sqft === 0 ? '' : property.sqft}
                      onChange={(e) => setProperty({ ...property, sqft: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent font-bold placeholder:font-normal"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* DC Values & Cost */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-primary">DC Rate Unit</label>
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                      {(['Marla', 'Acre'] as const).map((unit) => (
                        <button
                          key={unit}
                          onClick={() => setProperty({ ...property, dcRateUnit: unit })}
                          className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold transition-all ${
                            property.dcRateUnit === unit 
                              ? 'bg-white text-primary shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          DC Rate (Per {unit})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">DC Rate (Rs. per {property.dcRateUnit})</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                      <input 
                        type="number" 
                        value={property.dcRatePerUnit === 0 ? '' : property.dcRatePerUnit}
                        onChange={(e) => setProperty({ ...property, dcRatePerUnit: Number(e.target.value) })}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent shadow-sm font-bold"
                      />
                    </div>
                  </div>
                </div>

                {(property.type === 'Residential House' || property.type === 'Commercial Building') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Covered Area (Sqft)</label>
                      <input 
                        type="number" 
                        value={property.coveredArea === 0 ? '' : property.coveredArea}
                        onChange={(e) => setProperty({ ...property, coveredArea: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent shadow-sm font-bold"
                        placeholder="0"
                      />
                    </div>
                    {(property.type === 'Residential House' || property.type === 'Commercial Building') && (
                      <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Building Plan Approved?</label>
                      <div className="flex gap-2">
                        {[true, false].map((val) => (
                          <button
                            key={String(val)}
                            onClick={() => setProperty({ ...property, hasBuildingPlan: val })}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold border transition-all ${
                              property.hasBuildingPlan === val 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {val ? 'Yes' : 'No (2% Fee)'}
                          </button>
                        ))}
                      </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Declared Value */}
              <div className="pt-6 border-t border-slate-100">
                <label className="block text-xs font-black text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                  Market / Declared Transaction Value
                  <div className="h-px bg-slate-100 flex-1"></div>
                </label>
                <div className="relative max-w-md">
                  <span className="absolute left-4 top-3.5 text-accent font-black text-xl">Rs.</span>
                  <input 
                    type="number" 
                    value={property.declaredValue === 0 ? '' : property.declaredValue}
                    onChange={(e) => setProperty({ ...property, declaredValue: Number(e.target.value) })}
                    className="w-full pl-14 pr-4 py-4 bg-accent/5 border-2 border-accent/20 rounded-2xl text-2xl font-black text-primary outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all shadow-inner"
                    placeholder="Enter selling price"
                  />
                  <div className="absolute right-4 top-4">
                    <CheckCircle2 className="w-6 h-6 text-accent opacity-50" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Info className="w-4 h-4 text-slate-400" />
                  <p className="text-[10px] text-slate-400 font-medium">Total DC Value based on inputs: <span className="font-bold text-slate-600">{formatCurrency(calculations.totalDcValue)}</span></p>
                </div>
              </div>

              {/* Marla Size Selection */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Marla Size (Sft per Marla)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[272, 225].map((size) => (
                    <button
                      key={size}
                      onClick={() => setProperty({ ...property, marlaSize: size })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        property.marlaSize === size 
                          ? 'bg-slate-800 text-white border-slate-800' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {size} Sft
                    </button>
                  ))}
                  <div className="relative">
                    <input 
                      type="number" 
                      value={![272, 225].includes(property.marlaSize) ? property.marlaSize : ''}
                      onChange={(e) => setProperty({ ...property, marlaSize: Number(e.target.value) })}
                      placeholder="Custom"
                      className={`w-full h-full px-3 py-2 bg-white border rounded-lg text-xs font-bold outline-none transition-all ${
                        ![272, 225].includes(property.marlaSize)
                          ? 'border-slate-800 ring-1 ring-slate-800' 
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Live Calculation Output */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-primary p-6 text-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest">Grand Total Expenses</h2>
                    <p className="text-4xl font-black mt-1 text-white">
                      {formatCurrency(calculations.grandTotal)}
                    </p>
                  </div>
                  <div className="bg-accent/20 p-2 rounded-xl border border-accent/20">
                    <Calculator className="w-8 h-8 text-accent" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Buyer Share</p>
                    <p className="text-lg font-bold">{formatCurrency(calculations.totalBuyerExpenses)}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Seller Share</p>
                    <p className="text-lg font-bold">{formatCurrency(calculations.totalSellerExpenses)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Breakdown List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100 pb-2">Expense Breakdown</h3>
                  
                  {/* Government Fees Group */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-500 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> FBR Withholding Tax (236K)</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(calculations.buyerExpenses.reduce((a, b) => a + b.wht236K, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-500 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> FBR Withholding Tax (236C)</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(calculations.sellerExpenses.reduce((a, b) => a + b.wht236C, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-500 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Provincial Govt. Expenses</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(calculations.buyerExpenses.reduce((a, b) => a + b.totalProvincialExpenses, 0))}
                      </span>
                    </div>
                    <div className="ml-4 pl-3 border-l border-slate-100 space-y-1.5 pb-2">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Stamp Duty</span>
                        <span>{formatCurrency(calculations.provBreakdown.stampDuty)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Municipal Committee Fee</span>
                        <span>{formatCurrency(calculations.provBreakdown.municipalFee)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Registration Fee</span>
                        <span>{formatCurrency(calculations.provBreakdown.regFee)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>PLRA Service Charges</span>
                        <span>{formatCurrency(calculations.provBreakdown.plraCharges)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>BOR Charges</span>
                        <span>{formatCurrency(calculations.provBreakdown.borCharges)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Mutation Fee</span>
                        <span>{formatCurrency(calculations.provBreakdown.mutationFee)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>PLRA Mutation Fee</span>
                        <span>{formatCurrency(calculations.provBreakdown.plraMutationFee)}</span>
                      </div>
                      {calculations.provBreakdown.buildingPlanSurcharge > 0 && (
                        <div className="flex justify-between text-[11px] text-red-400 font-medium">
                          <span>Building Plan Surcharge (2%)</span>
                          <span>{formatCurrency(calculations.provBreakdown.buildingPlanSurcharge)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Other Expenses Group */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center group">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Drafting & Legal</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rs.</span>
                        <input 
                          type="number"
                          value={draftingChargesAmount === 0 ? '' : draftingChargesAmount}
                          onChange={(e) => setDraftingChargesAmount(Number(e.target.value))}
                          className="w-28 pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-right transition-all group-hover:bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center group">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight italic">EXECUTIVE SERVICE CHARGES ({serviceChargesPercent}%)</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rs.</span>
                        <input 
                          type="number"
                          value={manualServiceCharges === 0 ? '' : (manualServiceCharges ?? Math.round(calculations.calcAdditionalCharges))}
                          onChange={(e) => setManualServiceCharges(Number(e.target.value))}
                          onBlur={() => {
                            if (manualServiceCharges === Math.round(calculations.calcAdditionalCharges)) {
                              setManualServiceCharges(null);
                            }
                          }}
                          className={`w-28 pl-7 pr-2 py-1.5 bg-slate-50 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-right transition-all group-hover:bg-white ${
                            manualServiceCharges !== null ? 'text-accent border-accent/30' : 'text-slate-700 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center group">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Patwari & Visit</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rs.</span>
                        <input 
                          type="number"
                          value={patwariVisitAmount === 0 ? '' : patwariVisitAmount}
                          onChange={(e) => setPatwariVisitAmount(Number(e.target.value))}
                          className="w-28 pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-right transition-all group-hover:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Person Buttons */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-tighter pt-4">Individual Share Slips</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {buyers.map(b => (
                      <button 
                        key={b.id}
                        onClick={() => copyIndividualSlip(b)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                          copiedId === b.id 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-slate-50 border-slate-200 hover:border-accent hover:bg-white active:scale-[0.98]'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{b.name} <span className="text-[10px] text-slate-400 font-bold ml-1">(Buyer)</span></p>
                          <p className={`text-[10px] font-bold mt-0.5 ${copiedId === b.id ? 'text-green-600' : 'text-slate-400'}`}>
                            {copiedId === b.id ? 'Copied to clipboard!' : 'Click to copy slip'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-black transition-colors ${copiedId === b.id ? 'text-green-700' : 'text-primary'}`}>
                            {formatCurrency(calculations.buyerExpenses.find(be => be.id === b.id)?.totalGovFees || 0)}
                          </span>
                          <div className={`p-2 rounded-lg transition-all ${copiedId === b.id ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400 group-hover:bg-accent group-hover:text-white'}`}>
                            {copiedId === b.id ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Copy className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </button>
                    ))}
                    {sellers.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => copyIndividualSlip(s)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                          copiedId === s.id 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-slate-50 border-slate-200 hover:border-accent hover:bg-white active:scale-[0.98]'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{s.name} <span className="text-[10px] text-slate-400 font-bold ml-1">(Seller)</span></p>
                          <p className={`text-[10px] font-bold mt-0.5 ${copiedId === s.id ? 'text-green-600' : 'text-slate-400'}`}>
                            {copiedId === s.id ? 'Copied to clipboard!' : 'Click to copy slip'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-black transition-colors ${copiedId === s.id ? 'text-green-700' : 'text-primary'}`}>
                            {formatCurrency(calculations.sellerExpenses.find(se => se.id === s.id)?.wht236C || 0)}
                          </span>
                          <div className={`p-2 rounded-lg transition-all ${copiedId === s.id ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400 group-hover:bg-accent group-hover:text-white'}`}>
                            {copiedId === s.id ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Copy className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transaction Context */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                  <Info className="w-5 h-5 text-accent" />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  *Calculations are based on the higher of DC Land Value ({formatCurrency(calculations.totalDcValue)}) or Declared Value. Actual costs may vary depending on local sub-registrar policies.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Short Message Report Section */}
      {calculations.transactionValue > 0 && (
        <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 no-print">
          <section className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
            <div className="p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                      <div className="w-2 h-8 bg-accent rounded-full"></div>
                      Short Message Report
                    </h2>
                    <p className="text-slate-400 mt-2 text-lg">Quick-copy summary for easy sharing through SMS or Messenger</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const msg = `Grand Total Expenses: ${formatCurrency(calculations.grandTotal)}\n` +
                                `Buyer Expenses: ${formatCurrency(calculations.totalBuyerExpenses)}\n` +
                                `Seller Expenses: ${formatCurrency(calculations.totalSellerExpenses)}\n\n` +
                                `Regards, Wasiqa Expert\n` +
                                `Thank you for trusting us.`;
                      
                      navigator.clipboard.writeText(msg).then(() => {
                        const btn = document.getElementById('copy-msg-btn');
                        if (btn) {
                          const originalContent = btn.innerHTML;
                          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg> Copied!`;
                          btn.classList.add('bg-green-600', 'border-green-700');
                          btn.classList.remove('bg-accent', 'border-accent-dark');
                          setTimeout(() => {
                            btn.innerHTML = originalContent;
                            btn.classList.remove('bg-green-600', 'border-green-700');
                            btn.classList.add('bg-accent', 'border-accent-dark');
                          }, 2000);
                        }
                      });
                    }}
                    id="copy-msg-btn"
                    className="flex items-center justify-center gap-3 px-8 py-5 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black text-xl transition-all active:scale-[0.98] shadow-xl shadow-accent/20 border-b-4 border-accent-dark"
                  >
                    <Copy className="w-6 h-6" />
                    Copy Message
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 lg:p-10 font-mono shadow-inner group">
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <span className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] md:w-56">Grand Total Expenses:</span>
                      <span className="text-accent text-2xl font-bold">{formatCurrency(calculations.grandTotal)}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <span className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] md:w-56">Buyer Expenses:</span>
                      <span className="text-white text-xl font-bold">{formatCurrency(calculations.totalBuyerExpenses)}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <span className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] md:w-56">Seller Expenses:</span>
                      <span className="text-white text-xl font-bold">{formatCurrency(calculations.totalSellerExpenses)}</span>
                    </div>
                    
                    <div className="pt-8 border-t border-slate-800/50 mt-8">
                      <p className="text-slate-400 text-lg leading-relaxed">Regards, Wasiqa Expert</p>
                      <p className="text-slate-500 text-lg">Thank you for trusting us.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 p-6 text-center text-slate-400 text-xs font-medium no-print">
        <p>© 2026 Registry Expense Estimator | Built for Pakistan's Real Estate Professionals</p>
        <p className="mt-1">Accuracy is our priority. Always verify with official BOR sources.</p>
      </footer>
    </div>
  );
}

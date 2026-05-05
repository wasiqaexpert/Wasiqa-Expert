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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

type FilerStatus = 'Filer' | 'Late Filer' | 'Non-Filer';
type ResidentialStatus = 'Resident' | 'Non-Resident';
type PropertyCategory = 'Urban' | 'Rural';
type PropertyType = 'Agricultural' | 'Residential House' | 'Residential Plot' | 'Commercial';

interface Person {
  id: string;
  name: string;
  contact: string;
  filerStatus: FilerStatus;
  residentialStatus: ResidentialStatus;
  share: number;
  paid7E?: boolean;
}

interface PropertyDetails {
  category: PropertyCategory;
  type: PropertyType;
  hasHousePlan: boolean;
  acre: number;
  kanal: number;
  marla: number;
  sqft: number;
  dcRatePerUnit: number;
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
    { id: 'b1', name: 'Buyer 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100, paid7E: true }
  ]);
  const [sellers, setSellers] = useState<Person[]>([
    { id: 's1', name: 'Seller 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100, paid7E: true }
  ]);
  const [property, setProperty] = useState<PropertyDetails>({
    category: 'Urban',
    type: 'Residential House',
    hasHousePlan: true,
    acre: 0,
    kanal: 0,
    marla: 5,
    sqft: 0,
    dcRatePerUnit: 500000,
    constructionCostPerSqft: 2000,
    coveredArea: 1500,
    declaredValue: 0
  });

  const [recipientNumber, setRecipientNumber] = useState('0301-6565038');
  const [senderNumber, setSenderNumber] = useState('0301-6565038');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  
  const restoreDefaultRecipient = () => setRecipientNumber('0301-6565038');
  const restoreDefaultSender = () => setSenderNumber('0301-6565038');
  const [isCalculated, setIsCalculated] = useState(false);

  // Load from session storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('registry_estimator_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBuyers(parsed.buyers);
        setSellers(parsed.sellers);
        setProperty(parsed.property);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  // Save to session storage on change
  useEffect(() => {
    localStorage.setItem('registry_estimator_data', JSON.stringify({ buyers, sellers, property }));
  }, [buyers, sellers, property]);

  // Logic: Calculations
  const calculations = useMemo(() => {
    // 1. Total Area Units
    const totalMarla = (property.acre * 160) + (property.kanal * 20) + property.marla + (property.sqft / 272.25);
    
    // 2. DC Values
    const dcLandValue = totalMarla * property.dcRatePerUnit;
    const dcConstructionValue = property.type === 'Residential House' ? property.coveredArea * property.constructionCostPerSqft : 0;
    const totalDcValue = dcLandValue + dcConstructionValue;
    
    // 3. Transaction Value (Max of Declared vs DC)
    const transactionValue = Math.max(property.declaredValue, totalDcValue);

    // 4. Buyer Detailed Expenses
    const buyerExpenses = buyers.map(buyer => {
      const shareValue = (transactionValue * buyer.share) / 100;
      
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
      const plraCharges = shareValue <= 3000000 ? 3300 : (3300 + (shareValue * 0.001));
      const borOtherServiceCharges = 100;
      const mutationFee = 300;
      const plraMutationFee = 200;
      
      // House Plan Surcharge (2% if No House Plan)
      const housePlanSurcharge = (property.type === 'Residential House' && !property.hasHousePlan) ? (shareValue * 0.02) : 0;

      // Provincial Government Expenses Sum
      const totalProvincialExpenses = stampDuty + municipalCommitteeFee + regFee + borCharges + borOtherServiceCharges + mutationFee + plraCharges + plraMutationFee + housePlanSurcharge;

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
          borOtherServiceCharges,
          mutationFee,
          plraMutationFee,
          housePlanSurcharge
        },
        totalGovFees
      };
    });

    // 5. Seller Detailed Expenses
    const sellerExpenses = sellers.map(seller => {
      const shareValue = (transactionValue * seller.share) / 100;

      // 236C Withholding Tax (Seller)
      let whtRate = 0;
      if (seller.filerStatus === 'Filer') whtRate = 0.045;
      else if (seller.filerStatus === 'Late Filer') whtRate = 0.075;
      else whtRate = 0.115;
      const wht236C = shareValue * whtRate;

      // 7E Tax
      const tax7ERate = seller.paid7E ? 0 : 0.01;
      const tax7E = shareValue * tax7ERate;
      
      return {
        ...seller,
        shareValue,
        wht236C,
        tax7E
      };
    });

    // 6. Global "Other" Expenses (Standard across transaction)
    const patwariVisit = 4000;
    const additionalCharges = Math.max(5000, transactionValue * 0.01);
    const draftingCharges = transactionValue < 10000000 ? 5000 : 10000;
    const totalOtherExpenses = patwariVisit + additionalCharges + draftingCharges;

    // Totals
    const totalBuyerExpenses = buyerExpenses.reduce((acc, curr) => acc + curr.totalGovFees, 0);
    const totalSellerExpenses = sellerExpenses.reduce((acc, curr) => acc + curr.wht236C + curr.tax7E, 0);
    const grandTotal = totalBuyerExpenses + totalSellerExpenses + totalOtherExpenses;

    return {
      dcLandValue,
      dcConstructionValue,
      totalDcValue,
      transactionValue,
      buyerExpenses,
      sellerExpenses,
      patwariVisit,
      additionalCharges,
      draftingCharges,
      totalOtherExpenses,
      totalBuyerExpenses,
      totalSellerExpenses,
      grandTotal
    };
  }, [buyers, sellers, property]);

  // Handlers
  const addBuyer = () => {
    setBuyers([...buyers, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: `Buyer ${buyers.length + 1}`, 
      contact: '', 
      filerStatus: 'Filer', 
      residentialStatus: 'Resident', 
      share: 0 
    }]);
  };

  const removeBuyer = (id: string) => {
    if (buyers.length > 1) setBuyers(buyers.filter(b => b.id !== id));
  };

  const addSeller = () => {
    setSellers([...sellers, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: `Seller ${sellers.length + 1}`, 
      contact: '', 
      filerStatus: 'Filer', 
      residentialStatus: 'Resident', 
      share: 0 
    }]);
  };

  const removeSeller = (id: string) => {
    if (sellers.length > 1) setSellers(sellers.filter(s => s.id !== id));
  };

  const resetData = () => {
    if (confirm("Are you sure you want to reset all data?")) {
      setBuyers([{ id: 'b1', name: 'Buyer 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100 }]);
      setSellers([{ id: 's1', name: 'Seller 1', contact: '', filerStatus: 'Filer', residentialStatus: 'Resident', share: 100 }]);
      setProperty({
        category: 'Urban',
        type: 'Residential House',
        hasHousePlan: true,
        acre: 0,
        kanal: 0,
        marla: 5,
        sqft: 0,
        dcRatePerUnit: 500000,
        constructionCostPerSqft: 2000,
        coveredArea: 1500,
        declaredValue: 0
      });
    }
  };

  const generateWhatsAppMessage = (type: 'total' | 'individual', person?: Person) => {
    let msg = "";
    if (type === 'total') {
      msg = `*Registry Expense Estimator - Detailed Report*\n\n` +
            `Address: ${property.category} Area\n` +
            `Property: ${property.type}\n` +
            `Transaction Value: ${formatCurrency(calculations.transactionValue)}\n\n` +
            `*Expenses Summary:*\n` +
            `- Govt. Fees: ${formatCurrency(calculations.totalBuyerExpenses + calculations.totalSellerExpenses)}\n` +
            `- Other Charges: ${formatCurrency(calculations.totalOtherExpenses)}\n` +
            `--------------------------\n` +
            `*Grand Total: ${formatCurrency(calculations.grandTotal)}*\n\n` +
            `Regards,\nWasiqa Expert\nContact: ${senderNumber}\nThank you for trusting us.`;
    } else if (person) {
      const isBuyer = buyers.some(b => b.id === person.id);
      const amount = isBuyer 
        ? calculations.buyerExpenses.find(b => b.id === person.id)?.totalGovFees 
        : calculations.sellerExpenses.find(s => s.id === person.id)?.wht236C;
      
      msg = `Dear Mr. ${person.name},\n\nThank you for trusting us with your property documentation. \n\nYour individual share for the registry expenses is: *${formatCurrency(amount || 0)}*.\n\nTotal Transaction Summary:\nTransaction Value: ${formatCurrency(calculations.transactionValue)}\n\nPlease feel free to contact us for further details.\n\nRegards,\nWasiqa Expert\nContact: ${senderNumber}`;
    }
    
    const target = recipientNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${target}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
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
              <h1 className="text-xl font-bold tracking-tight">Registry Expense Estimator</h1>
              <p className="text-xs text-slate-400 font-medium opacity-80 uppercase tracking-widest">Wasiqa Expert Professional Tool</p>
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
              <tr>
                <td className="p-3 border border-slate-200">7E Asset Tax</td>
                <td className="p-3 border border-slate-200">Seller(s)</td>
                <td className="p-3 border border-slate-200 text-right font-medium">{formatCurrency(calculations.sellerExpenses.reduce((a, b) => a + b.tax7E, 0))}</td>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">7E Tax Applicable?</label>
                      <select 
                        value={seller.paid7E ? 'Yes' : 'No'}
                        onChange={(e) => {
                          const newSellers = [...sellers];
                          newSellers[index].paid7E = e.target.value === 'Yes';
                          setSellers(newSellers);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="Yes">Yes (Already Paid)</option>
                        <option value="No">No (Pay Now - 1%)</option>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <div className="flex gap-2">
                    {['Urban', 'Rural'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setProperty({ ...property, category: cat as PropertyCategory })}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-all ${
                          property.category === cat 
                            ? 'bg-accent text-white border-accent shadow-md' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-accent'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Property Type</label>
                  <select 
                    value={property.type}
                    onChange={(e) => setProperty({ ...property, type: e.target.value as PropertyType })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none shadow-sm"
                  >
                    <option value="Residential House">Residential House</option>
                    <option value="Residential Plot">Residential Plot</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Agricultural">Agricultural</option>
                  </select>
                </div>
              </div>

              {/* Area Inputs */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Area Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {property.type === 'Agricultural' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Acre</label>
                        <input 
                          type="number" 
                          value={property.acre}
                          onChange={(e) => setProperty({ ...property, acre: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Kanal</label>
                        <input 
                          type="number" 
                          value={property.kanal}
                          onChange={(e) => setProperty({ ...property, kanal: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Marla</label>
                    <input 
                      type="number" 
                      value={property.marla}
                      onChange={(e) => setProperty({ ...property, marla: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Sqft</label>
                    <input 
                      type="number" 
                      value={property.sqft}
                      onChange={(e) => setProperty({ ...property, sqft: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* DC Values & Cost */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">DC Rate (per Marla)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input 
                      type="number" 
                      value={property.dcRatePerUnit}
                      onChange={(e) => setProperty({ ...property, dcRatePerUnit: Number(e.target.value) })}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent shadow-sm"
                    />
                  </div>
                </div>
                {property.type === 'Residential House' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Covered Area (Sqft)</label>
                      <input 
                        type="number" 
                        value={property.coveredArea}
                        onChange={(e) => setProperty({ ...property, coveredArea: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-accent shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">House Plan Approved?</label>
                      <div className="flex gap-2">
                        {[true, false].map((val) => (
                          <button
                            key={String(val)}
                            onClick={() => setProperty({ ...property, hasHousePlan: val })}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-all ${
                              property.hasHousePlan === val 
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {val ? 'Yes' : 'No (2% Fee)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Declared Value */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-primary mb-2">Market / Declared Transaction Value</label>
                <div className="relative max-w-md">
                  <span className="absolute left-3 top-3 text-accent font-bold">Rs.</span>
                  <input 
                    type="number" 
                    value={property.declaredValue === 0 ? '' : property.declaredValue}
                    onChange={(e) => setProperty({ ...property, declaredValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 bg-accent/5 border-2 border-accent/20 rounded-xl text-lg font-bold text-primary outline-none focus:border-accent focus:ring-0 transition-all shadow-inner"
                    placeholder="Enter selling price"
                  />
                  <div className="absolute right-3 top-3.5">
                    <CheckCircle2 className="w-5 h-5 text-accent opacity-50" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Total DC Value based on inputs: <span className="font-semibold text-slate-600">{formatCurrency(calculations.totalDcValue)}</span></p>
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
                    <div className="flex justify-between text-sm py-1 ml-4 border-l border-slate-100 pl-3">
                      <span className="text-xs text-slate-400">Includes SD, MC Fee, Reg, BOR, PLRA, etc.</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-500 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> 7E Tax (Seller)</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(calculations.sellerExpenses.reduce((a, b) => a + b.tax7E, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Other Expenses Group */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Drafting & Legal</span>
                      <span className="font-medium">{formatCurrency(calculations.draftingCharges)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Service Charges (1%)</span>
                      <span className="font-medium">{formatCurrency(calculations.additionalCharges)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Patwari & Visit</span>
                      <span className="font-medium">{formatCurrency(calculations.patwariVisit)}</span>
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
                        onClick={() => generateWhatsAppMessage('individual', b)}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-green-500 group transition-all"
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-700">{b.name} (Buyer)</p>
                          <p className="text-[10px] text-slate-400">Send slip via WhatsApp</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-primary">
                            {formatCurrency(calculations.buyerExpenses.find(be => be.id === b.id)?.totalGovFees || 0)}
                          </span>
                          <MessageSquare className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all" />
                        </div>
                      </button>
                    ))}
                    {sellers.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => generateWhatsAppMessage('individual', s)}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-green-500 group transition-all"
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-700">{s.name} (Seller)</p>
                          <p className="text-[10px] text-slate-400">Send slip via WhatsApp</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-primary">
                            {formatCurrency(calculations.sellerExpenses.find(se => se.id === s.id)?.wht236C || 0)}
                          </span>
                          <MessageSquare className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all" />
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

      {/* WhatsApp Section - Full Width Bottom */}
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 no-print">
        <section className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-white border border-slate-800">
          <div className="p-8 lg:p-14">
            <div className="flex flex-col lg:flex-row items-center gap-10 mb-12">
              <div className="p-6 bg-green-500 rounded-[2.5rem] shadow-2xl shadow-green-500/20 -rotate-6 transition-transform hover:rotate-0 duration-500">
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
              <div className="text-center lg:text-left space-y-2">
                <h2 className="text-4xl font-black tracking-tighter">WhatsApp Report Sharing</h2>
                <p className="text-slate-400 font-medium text-xl leading-relaxed max-w-2xl">Effortlessly share professional registration cost estimates and individual buyer/seller share slips with your clients directly via WhatsApp.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end bg-slate-800/30 p-6 lg:p-10 rounded-[2rem] border border-slate-700/50 backdrop-blur-sm">
              {/* Step 1: Recipient Number */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recipient No.</label>
                  </div>
                  {recipientNumber !== '0301-6565038' && (
                    <button 
                      onClick={restoreDefaultRecipient}
                      className="text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl text-xl font-bold focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all placeholder:text-slate-800/40 group-hover:border-slate-600"
                    placeholder="e.g. 03001234567"
                  />
                </div>
              </div>

              {/* Step 2: Select Report Type */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Report / Client</label>
                </div>
                <div className="relative group">
                  <select 
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all appearance-none cursor-pointer group-hover:border-slate-600"
                  >
                    <option value="">Full Summary Report</option>
                    <optgroup label="Buyer Share Slips">
                      {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </optgroup>
                    <optgroup label="Seller Share Slips">
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Step 3: Sender Number */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sender Number</label>
                  </div>
                  {senderNumber !== '0301-6565038' && (
                    <button 
                      onClick={restoreDefaultSender}
                      className="text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl text-xl font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all group-hover:border-slate-600"
                  />
                </div>
              </div>

              {/* Step 4: Action Button */}
              <div className="lg:col-span-3">
                <button 
                  onClick={() => {
                    if (selectedPersonId) {
                      const person = [...buyers, ...sellers].find(p => p.id === selectedPersonId);
                      if (person) generateWhatsAppMessage('individual', person);
                    } else {
                      generateWhatsAppMessage('total');
                    }
                  }}
                  disabled={!recipientNumber}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:grayscale text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.97] group"
                >
                  <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Send Report
                </button>
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500 border-t border-slate-800/80 pt-10">
              <div className="flex items-center gap-4 py-2 px-5 bg-white/5 rounded-full border border-white/5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="font-bold opacity-80 uppercase tracking-[0.25em] text-[10px] text-green-500">Professional Report Gateway Active</span>
              </div>
              <p className="italic text-slate-500 text-center md:text-right max-w-md">Your professional report will be automatically encoded and opened in your default WhatsApp application for secure delivery.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 p-6 text-center text-slate-400 text-xs font-medium no-print">
        <p>© 2026 Registry Expense Estimator | Built for Pakistan's Real Estate Professionals</p>
        <p className="mt-1">Accuracy is our priority. Always verify with official BOR sources.</p>
      </footer>
    </div>
  );
}

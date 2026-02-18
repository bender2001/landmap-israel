import { useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator as CalcIcon, TrendingUp, DollarSign, Percent, ArrowDown, Landmark, Table2, PiggyBank, Printer, Share2, Check } from 'lucide-react'
import { roiStages, zoningLabels, ZoningStage } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import { useMetaTags } from '../../hooks/useMetaTags'

const zoningOptions = Object.entries(zoningLabels)

/** Calculate monthly mortgage payment using standard amortization formula */
function calcMonthlyPayment(principal, annualRate, years) {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const r = annualRate / 100 / 12
  const n = years * 12
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

export default function Calculator() {
  const [searchParams] = useSearchParams()

  useMetaTags({
    title: 'מחשבון השקעה בקרקע — חישוב תשואה, מסים ועלויות | LandMap Israel',
    description: 'חשבו תשואה צפויה, היטל השבחה, מס רכישה, CAGR ועלויות מימון להשקעה בקרקע בישראל. סימולציית מימון מלאה.',
    url: `${window.location.origin}/calculator`,
  })

  // Support URL pre-fill from PlotDetail (e.g., /calculator?price=500000&size=2000&zoning=AGRICULTURAL&years=5)
  // This creates a seamless Plot → Calculator flow like Madlan's "חשב תשואה" button
  const [purchasePrice, setPurchasePrice] = useState(() => searchParams.get('price') || '')
  const [plotSize, setPlotSize] = useState(() => searchParams.get('size') || '')
  const [currentZoning, setCurrentZoning] = useState(() => {
    const z = searchParams.get('zoning')
    return z && zoningOptions.some(([k]) => k === z) ? z : 'AGRICULTURAL'
  })
  const [targetZoning, setTargetZoning] = useState('BUILDING_PERMIT')
  const [holdingYears, setHoldingYears] = useState(() => searchParams.get('years') || '5')
  const prefilled = searchParams.get('price') && searchParams.get('size')
  // Financing inputs
  const [downPaymentPct, setDownPaymentPct] = useState('30')
  const [interestRate, setInterestRate] = useState('4.5')
  const [loanYears, setLoanYears] = useState('15')
  const [showFinancing, setShowFinancing] = useState(false)

  const result = useMemo(() => {
    const price = parseFloat(purchasePrice)
    const size = parseFloat(plotSize)
    if (!price || !size || price <= 0 || size <= 0) return null

    const currentIdx = roiStages.findIndex(
      (s) => s.label === zoningLabels[currentZoning] || zoningOptions.findIndex(([k]) => k === currentZoning) === roiStages.indexOf(s)
    )
    const targetIdx = roiStages.findIndex(
      (s) => s.label === zoningLabels[targetZoning] || zoningOptions.findIndex(([k]) => k === targetZoning) === roiStages.indexOf(s)
    )

    // Fallback: use index-based mapping (zoning options and roiStages are same order/length)
    const cIdx = zoningOptions.findIndex(([k]) => k === currentZoning)
    const tIdx = zoningOptions.findIndex(([k]) => k === targetZoning)

    if (cIdx < 0 || tIdx < 0 || tIdx <= cIdx) return null

    const currentPricePerSqm = Math.round(price / size)
    const targetPricePerSqm = roiStages[tIdx]?.pricePerSqM || 0
    const projectedValue = Math.round(targetPricePerSqm * size)
    const roiPercent = Math.round((projectedValue - price) / price * 100)

    // Costs
    const purchaseTax = Math.round(price * 0.06)
    const lawyerFee = Math.round(price * 0.0175)
    const bettermentLevy = Math.round((projectedValue - price) * 0.5)
    const totalCosts = purchaseTax + lawyerFee
    const netProfit = projectedValue - price - totalCosts - bettermentLevy

    // Progress stages
    const stages = roiStages.slice(cIdx, tIdx + 1).map((s, i) => ({
      ...s,
      value: Math.round(s.pricePerSqM * size),
      isCurrent: i === 0,
      isTarget: i === tIdx - cIdx,
    }))

    // Annualized ROI (CAGR) based on holding period
    const years = parseFloat(holdingYears) || 5
    const annualizedRoi = years > 0
      ? Math.round((Math.pow((projectedValue / price), 1 / years) - 1) * 100)
      : 0
    const netAnnualizedRoi = years > 0 && price > 0
      ? Math.round((Math.pow(((price + netProfit) / price), 1 / years) - 1) * 100)
      : 0
    // Monthly cost of holding (opportunity cost at 4% annual)
    const monthlyCost = Math.round((price * 0.04) / 12)

    // Financing calculations
    const dpPct = parseFloat(downPaymentPct) || 30
    const downPayment = Math.round(price * dpPct / 100)
    const loanAmount = price - downPayment
    const rate = parseFloat(interestRate) || 4.5
    const loanDuration = parseInt(loanYears) || 15
    const monthlyPayment = calcMonthlyPayment(loanAmount, rate, loanDuration)
    const totalLoanPayments = monthlyPayment * loanDuration * 12
    const totalInterest = totalLoanPayments - loanAmount

    // Sensitivity analysis: ROI across different holding periods
    const sensitivityYears = [3, 5, 7, 10, 15]
    const sensitivity = sensitivityYears.map(y => {
      const cagr = y > 0 ? Math.round((Math.pow(projectedValue / price, 1 / y) - 1) * 100) : 0
      const netCagr = y > 0 && price > 0 ? Math.round((Math.pow((price + netProfit) / price, 1 / y) - 1) * 100) : 0
      const totalFinancingCost = calcMonthlyPayment(loanAmount, rate, Math.min(loanDuration, y)) * Math.min(loanDuration, y) * 12
      const netWithFinancing = netProfit - (totalFinancingCost - loanAmount)
      return { years: y, cagr, netCagr, netWithFinancing, isSelected: y === years }
    })

    return {
      currentPricePerSqm,
      targetPricePerSqm,
      projectedValue,
      roiPercent,
      purchaseTax,
      lawyerFee,
      bettermentLevy,
      totalCosts,
      netProfit,
      stages,
      annualizedRoi,
      netAnnualizedRoi,
      monthlyCost,
      holdingYears: years,
      // Financing
      downPayment,
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalLoanPayments,
      // Sensitivity
      sensitivity,
    }
  }, [purchasePrice, plotSize, currentZoning, targetZoning, holdingYears, downPaymentPct, interestRate, loanYears])

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />

      <div className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <CalcIcon className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">מחשבון השקעה</h1>
              <p className="text-sm text-slate-400">חשבו תשואה צפויה והוצאות נלוות</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Input form */}
            <div className="lg:col-span-2">
              <div className="glass-panel p-6 space-y-5 sticky top-24">
                <h2 className="text-lg font-bold text-slate-100 mb-1">פרטי העסקה</h2>
                {/* Prefill indicator — shows when calculator was opened from PlotDetail */}
                {prefilled && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gold/8 border border-gold/15 rounded-lg text-[11px] text-gold">
                    <span>✨</span>
                    <span>הנתונים מולאו אוטומטית מפרטי החלקה</span>
                  </div>
                )}

                {/* Purchase price */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">מחיר רכישה (₪)</label>
                  <input
                    type="number"
                    placeholder="2,500,000"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                    dir="ltr"
                  />
                </div>

                {/* Plot size */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">שטח (מ"ר)</label>
                  <input
                    type="number"
                    placeholder="1,000"
                    value={plotSize}
                    onChange={(e) => setPlotSize(e.target.value)}
                    className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                    dir="ltr"
                  />
                </div>

                {/* Current zoning */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">ייעוד נוכחי</label>
                  <select
                    value={currentZoning}
                    onChange={(e) => setCurrentZoning(e.target.value)}
                    className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition"
                  >
                    {zoningOptions.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Target zoning */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">ייעוד יעד</label>
                  <select
                    value={targetZoning}
                    onChange={(e) => setTargetZoning(e.target.value)}
                    className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition"
                  >
                    {zoningOptions.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Holding period */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">תקופת החזקה (שנים)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="5"
                    value={holdingYears}
                    onChange={(e) => setHoldingYears(e.target.value)}
                    className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">משפיע על חישוב תשואה שנתית (CAGR)</p>
                </div>

                {/* Financing toggle */}
                <button
                  onClick={() => setShowFinancing(prev => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-navy-light/40 border border-white/10 rounded-xl text-sm text-slate-300 hover:border-gold/30 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-gold" />
                    סימולציית מימון
                  </span>
                  <ArrowDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showFinancing ? 'rotate-180' : ''}`} />
                </button>

                {showFinancing && (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">הון עצמי (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={downPaymentPct}
                        onChange={(e) => setDownPaymentPct(e.target.value)}
                        className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">ריבית שנתית (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">תקופת הלוואה (שנים)</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={loanYears}
                        onChange={(e) => setLoanYears(e.target.value)}
                        className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3 space-y-4">
              {!result ? (
                <div className="glass-panel p-12 text-center">
                  <CalcIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">הזינו פרטי עסקה כדי לראות את התוצאות</p>
                  <p className="text-xs text-slate-600 mt-2">ודאו שייעוד היעד מתקדם יותר מהייעוד הנוכחי</p>
                </div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="glass-panel p-4 text-center">
                      <div className="text-[10px] text-slate-400 mb-1">מחיר/מ"ר נוכחי</div>
                      <div className="text-lg font-bold text-blue-400">{result.currentPricePerSqm.toLocaleString()} ₪</div>
                    </div>
                    <div className="glass-panel p-4 text-center">
                      <div className="text-[10px] text-slate-400 mb-1">מחיר/מ"ר ביעד</div>
                      <div className="text-lg font-bold text-emerald-400">{result.targetPricePerSqm.toLocaleString()} ₪</div>
                    </div>
                    <div className="glass-panel p-4 text-center">
                      <div className="text-[10px] text-slate-400 mb-1">שווי צפוי</div>
                      <div className="text-lg font-bold text-gold">{formatCurrency(result.projectedValue)}</div>
                    </div>
                    <div className="glass-panel p-4 text-center">
                      <div className="text-[10px] text-slate-400 mb-1">תשואה כוללת</div>
                      <div className="text-lg font-bold text-emerald-400">+{result.roiPercent}%</div>
                    </div>
                    <div className="glass-panel p-4 text-center relative">
                      <div className="text-[10px] text-slate-400 mb-1">תשואה שנתית (CAGR)</div>
                      <div className="text-lg font-bold text-amber-400">+{result.annualizedRoi}%</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">על פני {result.holdingYears} שנים</div>
                    </div>
                    <div className="glass-panel p-4 text-center">
                      <div className="text-[10px] text-slate-400 mb-1">עלות הזדמנות/חודש</div>
                      <div className="text-lg font-bold text-red-400">{formatCurrency(result.monthlyCost)}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">ריבית 4% שנתית</div>
                    </div>
                  </div>

                  {/* Value progression */}
                  <div className="glass-panel p-5">
                    <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gold" />
                      התקדמות ערך לפי שלבי תכנון
                    </h3>
                    <div className="space-y-2">
                      {result.stages.map((stage, i) => {
                        const maxVal = result.stages[result.stages.length - 1].value
                        const barW = maxVal > 0 ? (stage.value / maxVal) * 100 : 0
                        return (
                          <div key={i} className={`flex items-center gap-3 py-1.5 rounded-lg ${stage.isTarget ? 'bg-gold/5 -mx-2 px-2' : stage.isCurrent ? 'bg-blue-500/5 -mx-2 px-2' : ''}`}>
                            <div className="w-[100px] flex-shrink-0 text-[10px] leading-tight text-slate-400">
                              {stage.label}
                            </div>
                            <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${barW}%`,
                                  background: stage.isTarget
                                    ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                    : stage.isCurrent
                                      ? 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                                      : 'rgba(148,163,184,0.2)',
                                }}
                              />
                            </div>
                            <span className={`text-[10px] w-[80px] text-left flex-shrink-0 ${
                              stage.isTarget ? 'text-gold font-bold' : stage.isCurrent ? 'text-blue-400 font-bold' : 'text-slate-500'
                            }`}>
                              {formatCurrency(stage.value)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Costs breakdown */}
                  <div className="glass-panel p-5">
                    <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gold" />
                      פירוט עלויות
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">מס רכישה (6%)</span>
                        <span className="text-slate-300">{formatCurrency(result.purchaseTax)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">שכ"ט עו"ד (~1.75%)</span>
                        <span className="text-slate-300">{formatCurrency(result.lawyerFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">היטל השבחה (50% מהרווח)</span>
                        <span className="text-slate-300">{formatCurrency(result.bettermentLevy)}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">סה"כ עלויות (ללא היטל)</span>
                        <span className="text-gold font-bold">{formatCurrency(result.totalCosts)}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-200 font-bold">רווח נקי משוער</span>
                        <span className={`font-bold text-lg ${result.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(result.netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-400">תשואה נקי שנתית (CAGR)</span>
                        <span className={`font-bold ${result.netAnnualizedRoi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          +{result.netAnnualizedRoi}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financing breakdown */}
                  {showFinancing && result.loanAmount > 0 && (
                    <div className="glass-panel p-5">
                      <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-gold" />
                        סימולציית מימון
                      </h3>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-navy-light/40 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-slate-400 mb-1">הון עצמי</div>
                          <div className="text-base font-bold text-blue-400">{formatCurrency(result.downPayment)}</div>
                        </div>
                        <div className="bg-navy-light/40 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-slate-400 mb-1">סכום הלוואה</div>
                          <div className="text-base font-bold text-slate-200">{formatCurrency(result.loanAmount)}</div>
                        </div>
                        <div className="bg-navy-light/40 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-slate-400 mb-1">החזר חודשי</div>
                          <div className="text-lg font-black text-gold">{formatCurrency(result.monthlyPayment)}</div>
                        </div>
                        <div className="bg-navy-light/40 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-slate-400 mb-1">סה"כ ריבית</div>
                          <div className="text-base font-bold text-red-400">{formatCurrency(result.totalInterest)}</div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                        <span className="text-slate-400">סה"כ החזרים</span>
                        <span className="text-slate-200 font-bold">{formatCurrency(result.totalLoanPayments)}</span>
                      </div>
                    </div>
                  )}

                  {/* Sensitivity analysis */}
                  <div className="glass-panel p-5">
                    <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-gold" />
                      ניתוח רגישות — תשואה לפי תקופת החזקה
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] text-slate-500 border-b border-white/5">
                            <th className="text-right py-2 font-medium">שנים</th>
                            <th className="text-center py-2 font-medium">CAGR ברוטו</th>
                            <th className="text-center py-2 font-medium">CAGR נטו</th>
                            {showFinancing && result.loanAmount > 0 && (
                              <th className="text-center py-2 font-medium">רווח אחרי מימון</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {result.sensitivity.map(row => (
                            <tr
                              key={row.years}
                              className={`border-b border-white/5 ${row.isSelected ? 'bg-gold/5' : ''}`}
                            >
                              <td className={`py-2.5 text-right ${row.isSelected ? 'text-gold font-bold' : 'text-slate-300'}`}>
                                {row.years} שנים {row.isSelected && '←'}
                              </td>
                              <td className="py-2.5 text-center text-emerald-400 font-medium">+{row.cagr}%</td>
                              <td className={`py-2.5 text-center font-medium ${row.netCagr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {row.netCagr >= 0 ? '+' : ''}{row.netCagr}%
                              </td>
                              {showFinancing && result.loanAmount > 0 && (
                                <td className={`py-2.5 text-center font-medium ${row.netWithFinancing >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                  {formatCurrency(row.netWithFinancing)}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[9px] text-slate-600 mt-3">
                      CAGR ברוטו = תשואה שנתית לפני עלויות. CAGR נטו = אחרי מסים, עו"ד והיטל השבחה.
                      {showFinancing && result.loanAmount > 0 && ' רווח אחרי מימון = רווח נקי בניכוי עלויות ריבית.'}
                    </p>
                  </div>

                  {/* Action buttons: Print & Share */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-slate-300 hover:border-gold/30 hover:text-gold transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      הדפס דוח
                    </button>
                    <button
                      onClick={() => {
                        const text = [
                          `📊 דוח השקעה — LandMap Israel`,
                          ``,
                          `💰 מחיר רכישה: ${formatCurrency(parseFloat(purchasePrice))}`,
                          `📐 שטח: ${parseFloat(plotSize).toLocaleString()} מ״ר`,
                          `🏗️ ייעוד: ${zoningLabels[currentZoning]} → ${zoningLabels[targetZoning]}`,
                          `📈 תשואה כוללת: +${result.roiPercent}%`,
                          `📅 CAGR (${result.holdingYears} שנים): +${result.annualizedRoi}%`,
                          `💵 רווח נקי: ${formatCurrency(result.netProfit)}`,
                          ``,
                          `חושב על ${window.location.origin}/calculator`,
                        ].join('\n')
                        navigator.clipboard.writeText(text).catch(() => {})
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 border border-gold/20 rounded-xl text-sm text-gold hover:bg-gold/20 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      שתף תוצאות
                    </button>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-slate-600 text-center">
                    * הנתונים הם הערכות בלבד ואינם מהווים ייעוץ השקעות. יש להתייעץ עם אנשי מקצוע לפני קבלת החלטות.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}

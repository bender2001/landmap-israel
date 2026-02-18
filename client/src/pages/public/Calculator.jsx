import { useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator as CalcIcon, TrendingUp, DollarSign, Percent, ArrowDown, Landmark, Table2, PiggyBank, Printer, Share2, Check, AlertTriangle, Target, Clock } from 'lucide-react'
import { roiStages, zoningLabels, ZoningStage } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'
import { calcTransactionCosts, calcExitCosts, calcAnnualHoldingCosts } from '../../utils/plot'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
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

    // Use centralized cost utilities (consistent with Compare page and sidebar)
    const transaction = calcTransactionCosts(price)
    const exit = calcExitCosts(price, projectedValue)
    const years = parseFloat(holdingYears) || 5
    const holding = calcAnnualHoldingCosts(price, size, currentZoning)
    const totalHoldingCosts = holding.totalAnnual * years

    // Legacy aliases for backward compatibility with existing UI
    const purchaseTax = transaction.purchaseTax
    const lawyerFee = transaction.attorneyFees
    const bettermentLevy = exit.bettermentLevy
    const capitalGainsTax = exit.capitalGains
    const agentCommission = exit.agentCommission
    const totalCosts = transaction.total
    const netProfit = exit.netProfit - totalHoldingCosts

    // Progress stages
    const stages = roiStages.slice(cIdx, tIdx + 1).map((s, i) => ({
      ...s,
      value: Math.round(s.pricePerSqM * size),
      isCurrent: i === 0,
      isTarget: i === tIdx - cIdx,
    }))

    // Annualized ROI (CAGR) based on holding period
    const annualizedRoi = years > 0
      ? Math.round((Math.pow((projectedValue / price), 1 / years) - 1) * 100)
      : 0
    const netAnnualizedRoi = years > 0 && price > 0
      ? Math.round((Math.pow(((price + netProfit) / price), 1 / years) - 1) * 100)
      : 0

    // Break-even analysis — what's the minimum selling price to not lose money?
    // Includes all entry costs, holding costs, and exit cost structure.
    // Investors use this to decide their minimum acceptable offer.
    const breakEvenPrice = (() => {
      // Total sunk costs: purchase + transaction + holding
      const sunk = transaction.totalWithPurchase + totalHoldingCosts
      // At break-even: sale_price - exit_costs(sale_price) = sunk
      // exit_costs = betterment(50% of gain) + capital_gains(25% of taxable) + agent(1%)
      // Simplify: iterate to find break-even (Newton's method approximation)
      let guess = sunk * 1.1 // start slightly above sunk cost
      for (let i = 0; i < 20; i++) {
        const exitAtGuess = calcExitCosts(price, guess)
        const net = guess - price - transaction.total - totalHoldingCosts - exitAtGuess.totalExit
        const target = 0 // break-even = net profit of 0
        const error = net - target
        if (Math.abs(error) < 100) break // close enough (within ₪100)
        // Adjust: if net > 0, guess is too high; if net < 0, guess is too low
        guess -= error * 0.6 // damped correction
      }
      return Math.round(guess)
    })()
    const breakEvenPerSqm = size > 0 ? Math.round(breakEvenPrice / size) : 0

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
      const holdCosts = holding.totalAnnual * y
      const netAfterAll = exit.netProfit - holdCosts
      const netCagr = y > 0 && price > 0 ? Math.round((Math.pow(Math.max(0, (price + netAfterAll)) / price, 1 / y) - 1) * 100) : 0
      const totalFinancingCost = calcMonthlyPayment(loanAmount, rate, Math.min(loanDuration, y)) * Math.min(loanDuration, y) * 12
      const netWithFinancing = netAfterAll - (totalFinancingCost - loanAmount)
      return { years: y, cagr, netCagr, netWithFinancing, holdCosts, isSelected: y === years }
    })

    return {
      currentPricePerSqm,
      targetPricePerSqm,
      projectedValue,
      roiPercent,
      purchaseTax,
      lawyerFee,
      bettermentLevy,
      capitalGainsTax,
      agentCommission,
      totalCosts,
      netProfit,
      stages,
      annualizedRoi,
      netAnnualizedRoi,
      holdingYears: years,
      // Holding costs
      holding,
      totalHoldingCosts,
      // Break-even
      breakEvenPrice,
      breakEvenPerSqm,
      // Transaction detail
      appraiserFee: transaction.appraiserFee,
      registrationFee: transaction.registrationFee,
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
                      <div className="text-[10px] text-slate-400 mb-1">נקודת איזון</div>
                      <div className="text-lg font-bold text-amber-400">{formatCurrency(result.breakEvenPrice)}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">מינימום למכירה</div>
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

                  {/* Costs breakdown — comprehensive P&L like Madlan's investment analysis */}
                  <div className="glass-panel p-5">
                    <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gold" />
                      פירוט עלויות מלא
                    </h3>
                    <div className="space-y-2.5">
                      {/* Entry costs */}
                      <div className="text-[10px] text-gold/70 font-semibold uppercase tracking-wider mb-1">עלויות כניסה</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">מס רכישה (6%)</span>
                        <span className="text-slate-300">{formatCurrency(result.purchaseTax)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">שכ"ט עו"ד (~1.75%)</span>
                        <span className="text-slate-300">{formatCurrency(result.lawyerFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">שמאי</span>
                        <span className="text-slate-300">{formatCurrency(result.appraiserFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">אגרת רישום (טאבו)</span>
                        <span className="text-slate-300">{formatCurrency(result.registrationFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium border-t border-white/5 pt-2">
                        <span className="text-blue-400">סה״כ עלויות כניסה</span>
                        <span className="text-blue-400">{formatCurrency(result.totalCosts)}</span>
                      </div>

                      {/* Holding costs — often overlooked by novice investors */}
                      <div className="h-px bg-white/10 my-2" />
                      <div className="text-[10px] text-gold/70 font-semibold uppercase tracking-wider mb-1">עלויות החזקה שנתיות</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">ארנונה ({result.holding.arnonaPerSqm} ₪/מ״ר)</span>
                        <span className="text-slate-300">{formatCurrency(result.holding.arnona)}/שנה</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">ניהול וגידור</span>
                        <span className="text-slate-300">{formatCurrency(result.holding.management)}/שנה</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-500">
                        <span className="text-slate-500 italic">עלות הזדמנות (8% שנתי)</span>
                        <span className="italic">{formatCurrency(result.holding.opportunityCost)}/שנה</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium border-t border-white/5 pt-2">
                        <span className="text-orange-400">סה״כ {result.holdingYears} שנים (ללא הזדמנות)</span>
                        <span className="text-orange-400">{formatCurrency(result.totalHoldingCosts)}</span>
                      </div>

                      {/* Exit costs */}
                      <div className="h-px bg-white/10 my-2" />
                      <div className="text-[10px] text-gold/70 font-semibold uppercase tracking-wider mb-1">עלויות יציאה</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">היטל השבחה (50% מהרווח)</span>
                        <span className="text-red-400/80">-{formatCurrency(result.bettermentLevy)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">מס שבח (25% מהחייב)</span>
                        <span className="text-red-400/80">-{formatCurrency(result.capitalGainsTax)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">עמלת מתווך (~1%)</span>
                        <span className="text-red-400/80">-{formatCurrency(result.agentCommission)}</span>
                      </div>

                      {/* Bottom line */}
                      <div className="h-px bg-white/10 my-3" />
                      <div className={`rounded-xl p-3 ${result.netProfit >= 0 ? 'bg-emerald-500/8' : 'bg-red-500/8'}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-200 font-bold">✨ רווח נקי (אחרי הכל)</span>
                          <span className={`font-bold text-lg ${result.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(result.netProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">תשואה נקי שנתית (CAGR)</span>
                          <span className={`font-bold ${result.netAnnualizedRoi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {result.netAnnualizedRoi >= 0 ? '+' : ''}{result.netAnnualizedRoi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Break-even analysis — shows minimum selling price to avoid loss.
                      Key negotiation tool: investors know their floor price. */}
                  <div className="glass-panel p-5 border-amber-500/10">
                    <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      ניתוח נקודת איזון
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-navy-light/40 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-slate-400 mb-1">מחיר מכירה מינימלי</div>
                        <div className="text-lg font-bold text-amber-400">{formatCurrency(result.breakEvenPrice)}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">לא להפסיד כסף</div>
                      </div>
                      <div className="bg-navy-light/40 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-slate-400 mb-1">מחיר/מ״ר מינימלי</div>
                        <div className="text-lg font-bold text-amber-400">{result.breakEvenPerSqm.toLocaleString()} ₪</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">vs {result.targetPricePerSqm.toLocaleString()} ₪ צפי</div>
                      </div>
                    </div>
                    <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-red-500/30 to-red-500/5"
                        style={{ width: `${Math.min(100, (result.breakEvenPrice / result.projectedValue) * 100)}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-navy shadow-sm z-10"
                        style={{ right: `calc(${Math.min(96, (result.breakEvenPrice / result.projectedValue) * 100)}% - 5px)` }}
                        title={`נקודת איזון: ${formatCurrency(result.breakEvenPrice)}`}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-navy shadow-sm z-10"
                        style={{ right: 'calc(100% - 10px)' }}
                        title={`שווי צפוי: ${formatCurrency(result.projectedValue)}`}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[9px] text-slate-500">
                      <span>מחיר רכישה</span>
                      <span className="text-amber-400">איזון</span>
                      <span className="text-emerald-400">שווי צפוי</span>
                    </div>
                    {result.breakEvenPrice < result.projectedValue && (
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400/80">
                        <span>✅</span>
                        <span>מרווח ביטחון: {formatCurrency(result.projectedValue - result.breakEvenPrice)} ({Math.round((1 - result.breakEvenPrice / result.projectedValue) * 100)}% מתחת לצפי)</span>
                      </div>
                    )}
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
                            <th className="text-center py-2 font-medium">
                              <span className="flex items-center justify-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                עלות החזקה
                              </span>
                            </th>
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
                              <td className="py-2.5 text-center text-orange-400/70 text-[11px]">
                                {formatCurrency(row.holdCosts)}
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
                      CAGR ברוטו = תשואה שנתית לפני עלויות. CAGR נטו = אחרי כל המסים, עלויות כניסה/יציאה + החזקה שנתית.
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

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}

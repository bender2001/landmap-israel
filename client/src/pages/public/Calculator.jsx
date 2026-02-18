import { useState, useMemo } from 'react'
import { Calculator as CalcIcon, TrendingUp, DollarSign, Percent, ArrowDown } from 'lucide-react'
import { roiStages, zoningLabels, ZoningStage } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'

const zoningOptions = Object.entries(zoningLabels)

export default function Calculator() {
  const [purchasePrice, setPurchasePrice] = useState('')
  const [plotSize, setPlotSize] = useState('')
  const [currentZoning, setCurrentZoning] = useState('AGRICULTURAL')
  const [targetZoning, setTargetZoning] = useState('BUILDING_PERMIT')
  const [holdingYears, setHoldingYears] = useState('5')

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
    }
  }, [purchasePrice, plotSize, currentZoning, targetZoning, holdingYears])

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

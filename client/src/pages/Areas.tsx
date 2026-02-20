import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, MapPin, TrendingUp, Building } from 'lucide-react'
import { t } from '../theme'
import { useAllPlots } from '../hooks'
import { Spinner, Badge } from '../components/UI'
import { fmt, p, roi, calcScore, getGrade } from '../utils'
import type { Plot } from '../types'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`
const Page = styled.div`min-height: 100vh; background: ${t.colors.bg}; padding: 24px;`
const Container = styled.div`max-width: 800px; margin: 0 auto;`
const BackLink = styled(Link)`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${t.colors.textDim}; text-decoration: none; margin-bottom: 20px; &:hover { color: ${t.colors.gold}; }`
const Title = styled.h1`font-size: 24px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 8px;`
const Sub = styled.p`font-size: 14px; color: ${t.colors.textSec}; margin-bottom: 32px;`

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;`
const AreaCard = styled(Link)`
  padding: 20px; border-radius: ${t.radius.lg};
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  text-decoration: none; color: inherit; transition: all ${t.transition};
  animation: ${fadeIn} 0.4s ease both;
  &:hover { border-color: ${t.colors.goldBorder}; box-shadow: ${t.shadow.glow}; transform: translateY(-2px); }
`
const CityName = styled.h2`font-size: 20px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 8px;`
const StatRow = styled.div`display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: ${t.colors.textSec};`

export default function Areas() {
  const { data: plots = [], isLoading } = useAllPlots({})

  const cities = useMemo(() => {
    const map = new Map<string, Plot[]>()
    ;(plots as Plot[]).forEach(pl => {
      const city = pl.city || 'אחר'
      if (!map.has(city)) map.set(city, [])
      map.get(city)!.push(pl)
    })
    return Array.from(map.entries()).map(([city, cityPlots]) => {
      const avgPrice = Math.round(cityPlots.reduce((s, pl) => s + (pl.total_price ?? pl.totalPrice ?? 0), 0) / cityPlots.length)
      const avgRoi = Math.round(cityPlots.reduce((s, pl) => s + roi(pl), 0) / cityPlots.length)
      const available = cityPlots.filter(pl => pl.status === 'AVAILABLE').length
      return { city, count: cityPlots.length, avgPrice, avgRoi, available }
    }).sort((a, b) => b.count - a.count)
  }, [plots])

  return (
    <Page>
      <Container>
        <BackLink to="/"><ArrowRight size={15} /> חזרה למפה</BackLink>
        <Title>📊 סקירת אזורים</Title>
        <Sub>{cities.length} אזורים פעילים עם {(plots as Plot[]).length} חלקות</Sub>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={32} /></div>
        ) : (
          <Grid>
            {cities.map((area, i) => (
              <AreaCard key={area.city} to={`/?city=${encodeURIComponent(area.city)}`} style={{ animationDelay: `${i * 0.05}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <CityName>{area.city}</CityName>
                  <Badge>{area.count} חלקות</Badge>
                </div>
                <StatRow><span>מחיר ממוצע</span><span style={{ fontWeight: 600 }}>{fmt.compact(area.avgPrice)}</span></StatRow>
                <StatRow><span>תשואה ממוצעת</span><span style={{ fontWeight: 600, color: t.colors.success }}>+{area.avgRoi}%</span></StatRow>
                <StatRow><span>זמינות</span><span style={{ fontWeight: 600, color: t.colors.success }}>{area.available} זמינות</span></StatRow>
              </AreaCard>
            ))}
          </Grid>
        )}
      </Container>
    </Page>
  )
}

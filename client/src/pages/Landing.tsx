import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { MapPin, Zap, TrendingUp, ChevronLeft, ChevronDown, Phone, Bell, Smartphone, Briefcase, Star, Shield, FileText, Building2, MessageCircle, HelpCircle, AlertTriangle, Search, ArrowDown, ArrowUpRight, Eye, Flame, Clock, Mail, ArrowLeft } from 'lucide-react'
import { t, fadeInUp, fadeInScale, shimmer, float, gradientShift, sm, md, lg, mobile } from '../theme'
import { PublicLayout } from '../components/Layout'
import { GoldButton, GhostButton, AnimatedCard, CountUpNumber, ScrollToTop } from '../components/UI'
import { SITE_CONFIG, p, roi, fmt, pricePerDunam, calcScore, getGrade, zoningLabels, statusColors, pricePerSqm } from '../utils'
import { useAllPlots, useFeaturedPlots, usePopularPlots, usePlotStats, useInView, usePrefetchPlotsByCity, useRecentlyViewed, usePlotsBatch, useDocumentTitle, useMetaDescription } from '../hooks'
import { preloadRoutes } from '../App'

/* ── extra keyframes ── */
const glow = keyframes`0%,100%{box-shadow:0 0 20px rgba(212,168,75,0.15)}50%{box-shadow:0 0 50px rgba(212,168,75,0.35)}`
const orbFloat = keyframes`0%{transform:translate(0,0) scale(1)}33%{transform:translate(14px,-20px) scale(1.06)}66%{transform:translate(-10px,12px) scale(0.96)}100%{transform:translate(0,0) scale(1)}`
const meshMove = keyframes`0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}`
const particleDrift = keyframes`0%{transform:translateY(0) scale(1);opacity:0.7}50%{opacity:1}100%{transform:translateY(-100vh) scale(0.3);opacity:0}`
const slideInLeft = keyframes`from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}`

/* ── base ── */
const Dark = styled.div`background:${t.bg};color:${t.text};overflow-x:hidden;`

/* ══════ HERO ══════ */
const Hero = styled.section`
  position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:100px 24px 80px;direction:rtl;overflow:hidden;
  background:
    radial-gradient(ellipse 90% 70% at 50% 35%,rgba(212,168,75,0.07),transparent 70%),
    radial-gradient(ellipse 50% 50% at 80% 80%,rgba(212,168,75,0.04),transparent),
    linear-gradient(180deg,${t.bg} 0%,#0d1526 50%,${t.bg} 100%);
`
const MeshBg = styled.div`
  position:absolute;inset:0;opacity:0.03;pointer-events:none;
  background:linear-gradient(45deg,${t.gold},transparent 40%,${t.goldBright},transparent 70%,${t.gold});
  background-size:400% 400%;animation:${meshMove} 15s ease infinite;
`
const Particle = styled.div<{$x:number;$size:number;$dur:number;$delay:number}>`
  position:absolute;bottom:-20px;left:${p=>p.$x}%;
  width:${p=>p.$size}px;height:${p=>p.$size}px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(212,168,75,0.5),transparent 70%);
  animation:${particleDrift} ${p=>p.$dur}s linear ${p=>p.$delay}s infinite;
  @media(prefers-reduced-motion:reduce){animation:none;display:none;}
`
const Orb = styled.div<{$size:number;$top:string;$left:string;$delay:number}>`
  position:absolute;width:${p=>p.$size}px;height:${p=>p.$size}px;border-radius:50%;
  background:radial-gradient(circle,rgba(212,168,75,0.1),transparent 70%);
  top:${p=>p.$top};left:${p=>p.$left};pointer-events:none;
  animation:${orbFloat} ${p=>6+p.$delay}s ease-in-out infinite;animation-delay:${p=>p.$delay}s;
  will-change:transform;
  @media(prefers-reduced-motion:reduce){animation:none;}
`
const HeroContent = styled.div`
  position:relative;z-index:2;text-align:center;max-width:780px;
  display:flex;flex-direction:column;align-items:center;gap:28px;
`
const Headline = styled.h1`
  font-size:clamp(38px,7vw,72px);font-weight:900;line-height:1.1;font-family:${t.font};
  background:linear-gradient(135deg,${t.gold} 0%,${t.goldBright} 35%,#fff 50%,${t.goldBright} 65%,${t.gold} 100%);
  background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:${gradientShift} 5s ease infinite;
`
const Sub = styled.p`
  font-size:clamp(16px,2.5vw,20px);color:${t.textSec};line-height:1.8;max-width:580px;
  animation:${fadeInUp} 0.6s ease-out 0.15s both;
`
const SocialProof = styled.div`
  display:flex;align-items:center;gap:12px;animation:${fadeInUp} 0.6s ease-out 0.25s both;
`
const AvatarStack = styled.div`display:flex;direction:ltr;`
const Avatar = styled.div<{$i:number;$hue:number}>`
  width:36px;height:36px;border-radius:50%;border:2px solid ${t.bg};
  background:linear-gradient(135deg,hsl(${p=>p.$hue},60%,45%),hsl(${p=>p.$hue+30},60%,55%));
  margin-right:${p=>p.$i>0?'-10px':'0'};position:relative;z-index:${p=>5-p.$i};
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;
`
const ProofText = styled.span`font-size:14px;color:${t.textSec};font-weight:500;`
const CTAs = styled.div`
  display:flex;gap:14px;flex-wrap:wrap;justify-content:center;
  animation:${fadeInUp} 0.6s ease-out 0.35s both;
`
const HeroGold = styled(GoldButton).attrs({as:Link})`
  padding:16px 40px;font-size:17px;border-radius:${t.r.full};text-decoration:none !important;
  animation:${glow} 3s ease-in-out infinite;
` as any
const HeroGhost = styled(GhostButton).attrs({as:Link})`
  padding:16px 40px;font-size:17px;border-radius:${t.r.full};text-decoration:none !important;
` as any
const TrustRow = styled.div`
  display:flex;gap:24px;flex-wrap:wrap;justify-content:center;margin-top:8px;
  animation:${fadeInUp} 0.6s ease-out 0.45s both;
`
const TrustBadge = styled.div`
  display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:${t.r.full};
  background:rgba(255,255,255,0.04);border:1px solid ${t.border};font-size:12px;color:${t.textSec};
`

/* ── Hero Search Bar ── */
const HeroSearchWrap = styled.form`
  display:flex;align-items:center;gap:0;width:100%;max-width:520px;position:relative;
  background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.12);border-radius:${t.r.full};
  overflow:visible;transition:all 0.3s;animation:${fadeInUp} 0.6s ease-out 0.3s both;
  &:focus-within{border-color:${t.gold};box-shadow:0 0 0 3px ${t.goldDim},0 8px 32px rgba(0,0,0,0.2);}
`
const HeroSearchInput = styled.input`
  flex:1;padding:16px 20px;background:transparent;border:none;outline:none;
  font-size:16px;font-family:${t.font};color:${t.text};direction:rtl;
  &::placeholder{color:${t.textDim};}
  ${mobile}{padding:14px 16px;font-size:15px;}
`
const HeroSearchBtn = styled.button`
  display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;font-size:15px;font-weight:700;font-family:${t.font};cursor:pointer;
  white-space:nowrap;transition:all ${t.tr};border-radius:0 ${t.r.full} ${t.r.full} 0;
  &:hover{background:linear-gradient(135deg,${t.goldBright},${t.gold});}
  ${mobile}{padding:14px 18px;font-size:14px;gap:6px;}
`
/* ── Hero Search Autocomplete Dropdown ── */
const heroDropIn = keyframes`from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}`
const HeroDropdown = styled.div`
  position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:50;
  background:rgba(17,24,39,0.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.lg};overflow:hidden;
  box-shadow:0 16px 48px rgba(0,0,0,0.5),0 0 0 1px rgba(212,168,75,0.1);
  animation:${heroDropIn} 0.2s ease-out both;
`
const HeroDropGroup = styled.div`
  padding:8px 14px 4px;font-size:10px;font-weight:700;color:${t.textDim};
  letter-spacing:0.5px;text-transform:uppercase;direction:rtl;
`
const HeroDropItem = styled.div<{$focused?:boolean}>`
  display:flex;align-items:center;gap:10px;padding:10px 14px;direction:rtl;
  cursor:pointer;transition:background 0.15s;
  background:${pr=>pr.$focused?t.goldDim:'transparent'};
  &:hover{background:${t.goldDim};}
  &:last-child{border-radius:0 0 ${t.r.lg} ${t.r.lg};}
`
const HeroDropIcon = styled.div<{$hue?:number}>`
  width:36px;height:36px;border-radius:${t.r.md};
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  background:${pr=>pr.$hue!=null?`hsl(${pr.$hue},25%,14%)`:'rgba(212,168,75,0.08)'};
  border:1px solid ${pr=>pr.$hue!=null?`hsl(${pr.$hue},35%,22%)`:t.goldBorder};
  font-size:18px;
`
const HeroDropInfo = styled.div`flex:1;min-width:0;`
const HeroDropName = styled.div`font-size:14px;font-weight:700;color:${t.text};`
const HeroDropMeta = styled.div`font-size:11px;color:${t.textSec};display:flex;gap:8px;margin-top:1px;`
const HeroDropMetaVal = styled.span`font-weight:700;color:${t.goldBright};`

/* ── Live Opportunity Pulse Badge (hero section) ── */
const oppPulse = keyframes`0%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}`
const LiveOppBadge = styled.div`
  display:inline-flex;align-items:center;gap:8px;padding:8px 18px;
  background:rgba(16,185,129,0.08);backdrop-filter:blur(12px);
  border:1px solid rgba(16,185,129,0.25);border-radius:${t.r.full};
  font-size:13px;font-weight:700;color:#10B981;font-family:${t.font};
  animation:${fadeInUp} 0.6s ease-out 0.5s both;
  cursor:pointer;transition:all ${t.tr};
  &:hover{background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.4);transform:translateY(-2px);}
`
const LiveOppDot = styled.span`
  width:8px;height:8px;border-radius:50%;background:#10B981;
  animation:${oppPulse} 2s ease-in-out infinite;flex-shrink:0;
`
const LiveOppCount = styled.span`
  font-size:15px;font-weight:900;color:#34D399;
`

/* ── Scroll Indicator ── */
const scrollBounce = keyframes`0%,100%{transform:translateY(0);opacity:0.6}50%{transform:translateY(10px);opacity:1}`
const ScrollIndicator = styled.div`
  position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:2;
  display:flex;flex-direction:column;align-items:center;gap:6px;
  color:${t.textDim};font-size:12px;font-weight:500;cursor:pointer;
  animation:${scrollBounce} 2s ease-in-out infinite;
  transition:opacity ${t.tr};
  &:hover{color:${t.gold};}
  ${mobile}{bottom:20px;}
`

/* ══════ MARKET TICKER ══════ */
const tickerScroll = keyframes`0%{transform:translateX(100%)}100%{transform:translateX(-100%)}`
const TickerStrip = styled.div`
  width:100%;overflow:hidden;padding:10px 0;
  background:linear-gradient(90deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02),rgba(212,168,75,0.06));
  border-top:1px solid ${t.goldBorder};border-bottom:1px solid ${t.goldBorder};
  direction:rtl;position:relative;
`
const TickerTrack = styled.div<{$dur:number}>`
  display:flex;align-items:center;gap:32px;white-space:nowrap;
  animation:${tickerScroll} ${p=>p.$dur}s linear infinite;
  &:hover{animation-play-state:paused;}
  @media(prefers-reduced-motion:reduce){animation:none;justify-content:center;flex-wrap:wrap;gap:16px;}
`
const TickerItem = styled.span`
  display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;
  color:${t.textSec};font-family:${t.font};flex-shrink:0;
`
const TickerDot = styled.span<{$c:string}>`
  width:6px;height:6px;border-radius:50%;background:${p=>p.$c};flex-shrink:0;
`
const TickerVal = styled.span<{$c?:string}>`
  font-weight:800;color:${pr=>pr.$c||t.goldBright};
`

/* ══════ POPULAR CITIES ══════ */
const CitiesSection = styled.section`
  padding:56px 24px;direction:rtl;position:relative;overflow:hidden;
  background:${t.bg};
  content-visibility:auto;contain-intrinsic-size:auto 420px;
`
const CitiesGrid = styled.div`
  max-width:1060px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:16px;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  ${md}{grid-template-columns:repeat(3,1fr);}
  ${lg}{grid-template-columns:repeat(4,1fr);}
  @media(max-width:380px){grid-template-columns:1fr;}
`
const CityCard = styled(Link)<{$hue:number;$delay:number}>`
  position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;padding:28px 16px;border-radius:${t.r.xl};text-decoration:none!important;
  background:linear-gradient(135deg,hsl(${p=>p.$hue},25%,12%),hsl(${p=>p.$hue},30%,8%));
  border:1px solid hsl(${p=>p.$hue},35%,20%);transition:all 0.35s cubic-bezier(0.32,0.72,0,1);
  overflow:hidden;animation:${fadeInUp} 0.5s ease-out ${p=>p.$delay}s both;
  &::before{content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse at 50% 0%,hsl(${p=>p.$hue},50%,40%,0.15),transparent 70%);
    transition:opacity 0.35s;opacity:0;}
  &:hover{transform:translateY(-6px);border-color:hsl(${p=>p.$hue},50%,35%);
    box-shadow:0 16px 48px hsl(${p=>p.$hue},50%,20%,0.3);}
  &:hover::before{opacity:1;}
`
const CityEmoji = styled.span`font-size:32px;position:relative;z-index:1;`
const CityName = styled.span`font-size:16px;font-weight:700;color:${t.text};position:relative;z-index:1;`
const CityCount = styled.span`font-size:12px;color:${t.textSec};position:relative;z-index:1;`
const CityLiveData = styled.div`
  display:flex;align-items:center;gap:8px;position:relative;z-index:1;
  padding:4px 10px;border-radius:${t.r.full};
  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
`
const CityLiveVal = styled.span`font-size:11px;font-weight:800;color:${t.goldBright};`
const CityLiveLabel = styled.span`font-size:9px;color:${t.textDim};`
const CityLiveItem = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:1px;
`
const CitiesSectionHead = styled.h2`
  text-align:center;font-size:clamp(22px,3.5vw,32px);font-weight:800;color:${t.text};
  margin-bottom:32px;font-family:${t.font};
  & span{color:${t.gold};}
`

/* ══════ FEATURED PLOTS ══════ */
const FeaturedSection = styled.section`
  padding:64px 24px;direction:rtl;position:relative;overflow:hidden;
  background:linear-gradient(180deg,${t.bg},rgba(212,168,75,0.03),${t.bg});
  content-visibility:auto;contain-intrinsic-size:auto 600px;
`
const FeaturedGrid = styled.div`
  max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:20px;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  ${lg}{grid-template-columns:repeat(3,1fr);}
`
const FeaturedCard = styled(Link)<{$delay:number}>`
  position:relative;display:flex;flex-direction:column;gap:0;
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.xl};
  overflow:hidden;text-decoration:none!important;
  transition:all 0.35s cubic-bezier(0.32,0.72,0,1);
  animation:${fadeInUp} 0.5s ease-out ${p=>p.$delay}s both;
  &:hover{border-color:${t.goldBorder};transform:translateY(-6px);
    box-shadow:0 16px 48px rgba(212,168,75,0.15);}
`
const FeaturedHeader = styled.div<{$hue:number}>`
  position:relative;padding:20px 20px 16px;
  background:linear-gradient(135deg,hsl(${p=>p.$hue},25%,12%),hsl(${p=>p.$hue},30%,8%));
  border-bottom:1px solid ${t.border};
`
const FeaturedBadges = styled.div`
  position:absolute;top:12px;left:12px;display:flex;gap:6px;
`
const FeaturedBadge = styled.span<{$bg:string;$c:string}>`
  display:inline-flex;align-items:center;gap:4px;padding:3px 10px;
  background:${pr=>pr.$bg};color:${pr=>pr.$c};
  border-radius:${t.r.full};font-size:10px;font-weight:800;
  backdrop-filter:blur(8px);border:1px solid ${pr=>pr.$c}33;
`
const FeaturedTitle = styled.h3`
  font-size:17px;font-weight:800;color:${t.text};margin:0;
  display:flex;align-items:center;gap:8px;
`
const FeaturedCity = styled.span`
  font-size:13px;color:${t.textSec};display:flex;align-items:center;gap:4px;margin-top:4px;
`
const FeaturedBody = styled.div`padding:16px 20px;display:flex;flex-direction:column;gap:12px;`
const FeaturedPrice = styled.div`
  font-size:24px;font-weight:900;color:${t.gold};font-family:${t.font};
`
const FeaturedMetrics = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
`
const FeaturedMetric = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
`
const FeaturedMetricVal = styled.span<{$c?:string}>`
  font-size:13px;font-weight:800;color:${pr=>pr.$c||t.text};
`
const FeaturedMetricLabel = styled.span`
  font-size:9px;font-weight:600;color:${t.textDim};white-space:nowrap;
`
const FeaturedFooter = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 20px;border-top:1px solid ${t.border};
`
const FeaturedCta = styled.span`
  display:inline-flex;align-items:center;gap:6px;
  font-size:13px;font-weight:700;color:${t.gold};
  transition:gap 0.2s;
  ${FeaturedCard}:hover &{gap:10px;}
`
const FeaturedScore = styled.div<{$c:string}>`
  display:inline-flex;align-items:center;gap:4px;
  padding:4px 12px;border-radius:${t.r.full};
  background:${pr=>pr.$c}18;border:1px solid ${pr=>pr.$c}33;
  font-size:12px;font-weight:800;color:${pr=>pr.$c};
`
const ViewAllBtn = styled(Link)`
  display:flex;align-items:center;justify-content:center;gap:8px;
  margin:32px auto 0;padding:14px 36px;width:fit-content;
  background:transparent;border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  color:${t.gold};font-size:15px;font-weight:700;font-family:${t.font};
  text-decoration:none!important;transition:all ${t.tr};
  &:hover{background:${t.goldDim};border-color:${t.gold};transform:translateY(-2px);box-shadow:${t.sh.glow};}
`

/* ══════ POPULAR / MOST VIEWED (like Yad2's "הכי נצפים") ══════ */
const PopularStrip = styled.section`
  padding:40px 24px 48px;direction:rtl;position:relative;overflow:hidden;
  background:${t.bg};
  content-visibility:auto;contain-intrinsic-size:auto 220px;
`
const PopularScroll = styled.div`
  max-width:1100px;margin:0 auto;display:flex;gap:16px;
  overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;
  &::-webkit-scrollbar{display:none;}
  /* Fade edges for scroll hint */
  mask-image:linear-gradient(to left, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
  -webkit-mask-image:linear-gradient(to left, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
`
const popularCardIn = keyframes`from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}`
const PopularCard = styled(Link)<{$delay:number}>`
  flex-shrink:0;width:260px;scroll-snap-align:start;
  display:flex;flex-direction:column;gap:0;
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};
  text-decoration:none!important;overflow:hidden;
  transition:all 0.3s cubic-bezier(0.32,0.72,0,1);
  animation:${popularCardIn} 0.4s ease-out ${pr=>pr.$delay}s both;
  &:hover{border-color:${t.goldBorder};transform:translateY(-4px);box-shadow:${t.sh.lg};}
  ${mobile}{width:220px;}
`
const PopularCardTop = styled.div`
  display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
  border-bottom:1px solid ${t.border};background:${t.surfaceLight};
`
const PopularCardCity = styled.span`font-size:13px;font-weight:700;color:${t.text};`
const PopularCardViews = styled.span`
  display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;
  padding:2px 8px;border-radius:${t.r.full};
  color:#EF4444;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
`
const PopularCardBody = styled.div`padding:14px 16px;display:flex;flex-direction:column;gap:6px;`
const PopularCardTitle = styled.div`font-size:12px;font-weight:600;color:${t.textSec};`
const PopularCardPrice = styled.div`font-size:18px;font-weight:900;color:${t.gold};`
const PopularCardMeta = styled.div`
  display:flex;align-items:center;gap:10px;font-size:11px;color:${t.textDim};
`
const PopularCardMetaItem = styled.span<{$c?:string}>`
  display:inline-flex;align-items:center;gap:3px;font-weight:600;
  color:${pr=>pr.$c||t.textDim};
`

/* ── Featured Skeleton (loading placeholder) ── */
const skelPulse = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`
const SkelBar = styled.div<{$w?:string;$h?:string}>`
  width:${pr=>pr.$w||'100%'};height:${pr=>pr.$h||'16px'};border-radius:${t.r.sm};
  background:linear-gradient(90deg,${t.surfaceLight} 25%,${t.bg} 50%,${t.surfaceLight} 75%);
  background-size:200% 100%;animation:${skelPulse} 1.5s ease-in-out infinite;
`
const FeaturedSkelCard = styled.div`
  display:flex;flex-direction:column;gap:0;
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.xl};
  overflow:hidden;
`
const FeaturedSkelHeader = styled.div`
  padding:20px 20px 16px;
  background:${t.surfaceLight};border-bottom:1px solid ${t.border};
  display:flex;flex-direction:column;gap:8px;
`
const FeaturedSkelBody = styled.div`
  padding:16px 20px;display:flex;flex-direction:column;gap:12px;
`
const FeaturedSkelMetrics = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
`
const FeaturedSkelMetric = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
`
const FeaturedSkelFooter = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 20px;border-top:1px solid ${t.border};
`

const POPULAR_CITIES = [
  { name: 'חדרה', emoji: '🏗️', hue: 35, count: 'אזור ביקוש' },
  { name: 'נתניה', emoji: '🌊', hue: 200, count: 'קו חוף' },
  { name: 'קיסריה', emoji: '🏛️', hue: 280, count: 'פרימיום' },
  { name: 'הרצליה', emoji: '💎', hue: 340, count: 'השקעה חמה' },
  { name: 'כפר סבא', emoji: '🌳', hue: 140, count: 'שרון' },
  { name: 'רעננה', emoji: '🏠', hue: 45, count: 'ביקוש גבוה' },
  { name: 'תל אביב', emoji: '🌆', hue: 220, count: 'מרכז' },
  { name: 'ירושלים', emoji: '✡️', hue: 50, count: 'בירה' },
]

/* ══════ STATS ══════ */
const StatsStrip = styled.section`
  padding:48px 24px;direction:rtl;position:relative;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border-top:1px solid ${t.goldBorder};border-bottom:1px solid ${t.goldBorder};
  content-visibility:auto;contain-intrinsic-size:auto 200px;
  &::before{content:'';position:absolute;inset:0;
    background:linear-gradient(90deg,transparent,rgba(212,168,75,0.06),transparent);
    background-size:200% 100%;animation:${shimmer} 4s linear infinite;}
`
const StatsGrid = styled.div`
  max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:20px;text-align:center;
  position:relative;z-index:1;
  ${md}{grid-template-columns:repeat(4,1fr);}
  @media(max-width:480px){grid-template-columns:1fr;}
`
const StatItem = styled(AnimatedCard)`display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px;`
const StatNum = styled.div`font-size:36px;font-weight:900;color:${t.goldBright};font-family:${t.font};`
const StatLabel = styled.div`font-size:14px;color:${t.textSec};font-weight:500;`

/* ══════ COMPARISON TABLE ══════ */
const CompareSection = styled.section`
  padding:64px 24px;direction:rtl;position:relative;
  background:linear-gradient(180deg,transparent,rgba(212,168,75,0.02),transparent);
  content-visibility:auto;contain-intrinsic-size:auto 500px;
`
const CompareTable = styled.div`
  max-width:780px;margin:0 auto;border-radius:${t.r.xl};overflow:hidden;
  border:1px solid ${t.border};background:${t.surface};
`
const CompareRow = styled.div<{$header?:boolean;$even?:boolean}>`
  display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:0;
  padding:${pr=>pr.$header?'14px 20px':'12px 20px'};
  background:${pr=>pr.$header?'linear-gradient(135deg,rgba(212,168,75,0.1),rgba(212,168,75,0.04))':pr.$even?'rgba(255,255,255,0.02)':'transparent'};
  border-bottom:1px solid ${t.border};
  &:last-child{border-bottom:none;}
  ${mobile}{grid-template-columns:1.5fr 1fr 1fr 1fr;padding:${pr=>pr.$header?'10px 12px':'8px 12px'};}
`
const CompareLabel = styled.span<{$header?:boolean}>`
  font-size:${pr=>pr.$header?'12px':'13px'};
  font-weight:${pr=>pr.$header?'800':'500'};
  color:${pr=>pr.$header?t.gold:t.textSec};
  letter-spacing:${pr=>pr.$header?'0.5px':'0'};
  text-transform:${pr=>pr.$header?'uppercase':'none'};
  ${mobile}{font-size:${pr=>pr.$header?'10px':'11px'};}
`
const CompareCheck = styled.span<{$yes?:boolean}>`
  font-size:14px;text-align:center;
  ${mobile}{font-size:12px;}
`

const COMPARE_FEATURES = [
  { feature: 'מפה אינטראקטיבית עם גוש/חלקה', us: true, madlan: true, yad2: false },
  { feature: 'ניתוח AI לכל חלקה', us: true, madlan: false, yad2: false },
  { feature: 'ציון השקעה ותשואה צפויה', us: true, madlan: false, yad2: false },
  { feature: 'נתוני ועדות סטטוטוריות', us: true, madlan: true, yad2: false },
  { feature: 'נתוני תקן 22 (שמאות)', us: true, madlan: false, yad2: false },
  { feature: 'מחשבון תשואה מובנה', us: true, madlan: false, yad2: false },
  { feature: 'התראות מחיר בזמן אמת', us: true, madlan: true, yad2: true },
  { feature: 'מיקוד בקרקעות להשקעה', us: true, madlan: false, yad2: false },
]

/* ══════ HOW IT WORKS ══════ */
const HowSection = styled.section`padding:80px 24px;direction:rtl;position:relative;content-visibility:auto;contain-intrinsic-size:auto 500px;`
const SectionHead = styled.h2`
  text-align:center;font-size:clamp(26px,4vw,40px);font-weight:800;color:${t.text};
  margin-bottom:56px;font-family:${t.font};animation:${fadeInUp} 0.5s ease-out both;
`
const StepsRow = styled.div`
  max-width:900px;margin:0 auto;display:flex;align-items:flex-start;justify-content:center;gap:20px;
  position:relative;${mobile}{flex-direction:column;align-items:center;}
`
const StepCard = styled(AnimatedCard)<{$delay:number}>`
  flex:1;max-width:260px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;
  padding:32px 20px;background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.xl};
  transition:all ${t.tr};animation:${slideInLeft} 0.6s ease-out ${p=>p.$delay}s both;
  &:hover{border-color:${t.goldBorder};transform:translateY(-6px);box-shadow:${t.sh.glow};}
`
const StepNum = styled.div`
  width:48px;height:48px;border-radius:50%;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:900;color:${t.bg};font-family:${t.font};
`
const StepIcon = styled.div`
  width:64px;height:64px;border-radius:${t.r.xl};
  background:linear-gradient(135deg,rgba(212,168,75,0.15),rgba(212,168,75,0.04));
  border:1px solid ${t.goldBorder};display:flex;align-items:center;justify-content:center;
  color:${t.gold};animation:${float} 4s ease-in-out infinite;
`
const Connector = styled.div`
  display:flex;align-items:center;padding-top:60px;color:${t.goldBorder};
  ${mobile}{display:none;}
`

/* ══════ FEATURES ══════ */
const Features = styled.section`
  padding:80px 24px;direction:rtl;
  background:linear-gradient(180deg,transparent,rgba(212,168,75,0.02),transparent);
  content-visibility:auto;contain-intrinsic-size:auto 500px;
`
const FeatGrid = styled.div`
  max-width:1060px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:24px;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  ${lg}{grid-template-columns:repeat(3,1fr);}
`
const Card = styled(AnimatedCard)`
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};padding:28px 22px;
  text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;
  transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};transform:translateY(-4px);box-shadow:${t.sh.glow};}
`
const IconWrap = styled.div`
  width:52px;height:52px;border-radius:${t.r.lg};
  background:linear-gradient(135deg,rgba(212,168,75,0.12),rgba(212,168,75,0.04));
  border:1px solid ${t.goldBorder};display:flex;align-items:center;justify-content:center;
  color:${t.gold};animation:${float} 4s ease-in-out infinite;
`
const CardTitle = styled.h3`font-size:17px;font-weight:700;color:${t.text};font-family:${t.font};`
const CardDesc = styled.p`font-size:13px;color:${t.textSec};line-height:1.7;`

/* ══════ TESTIMONIALS ══════ */
const TestSection = styled.section`padding:80px 24px;direction:rtl;content-visibility:auto;contain-intrinsic-size:auto 400px;`
const TestGrid = styled.div`
  max-width:1060px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:24px;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  ${lg}{grid-template-columns:repeat(3,1fr);}
`
const TestCard = styled(AnimatedCard)`
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.xl};padding:28px;
  display:flex;flex-direction:column;gap:16px;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.glow};}
`
const TestHeader = styled.div`display:flex;align-items:center;gap:12px;`
const TestAvatar = styled.div<{$hue:number}>`
  width:44px;height:44px;border-radius:50%;
  background:linear-gradient(135deg,hsl(${p=>p.$hue},55%,40%),hsl(${p=>p.$hue+30},55%,50%));
  display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;
`
const TestName = styled.div`font-size:15px;font-weight:700;color:${t.text};`
const TestCity = styled.div`font-size:12px;color:${t.textDim};`
const TestStars = styled.div`display:flex;gap:2px;color:${t.goldBright};`
const TestQuote = styled.p`font-size:14px;color:${t.textSec};line-height:1.8;font-style:italic;`

/* ══════ WHATSAPP CTA ══════ */
const WaSection = styled.section`
  padding:64px 24px;direction:rtl;text-align:center;
  background:${t.surface};border-top:1px solid ${t.border};border-bottom:1px solid ${t.border};
  content-visibility:auto;contain-intrinsic-size:auto 250px;
`
const WaBtn = styled.a`
  display:inline-flex;align-items:center;gap:10px;padding:16px 40px;border-radius:${t.r.full};
  background:#25D366;color:#fff;font-size:17px;font-weight:700;font-family:${t.font};
  text-decoration:none !important;transition:all ${t.tr};cursor:pointer;
  &:hover{background:#20bd5a;transform:translateY(-2px);box-shadow:0 8px 32px rgba(37,211,102,0.3);}
`
const PhoneLink = styled.a`
  display:inline-flex;align-items:center;gap:6px;color:${t.textSec};font-size:14px;
  text-decoration:none !important;transition:color ${t.tr};margin-top:16px;
  &:hover{color:${t.gold};}
`

/* ══════ FINAL CTA ══════ */
const FinalCTA = styled.section`
  padding:80px 24px;direction:rtl;text-align:center;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(212,168,75,0.1),rgba(212,168,75,0.04));
  border-top:1px solid ${t.goldBorder};
  content-visibility:auto;contain-intrinsic-size:auto 350px;
`
const FinalTitle = styled.h2`
  font-size:clamp(26px,4vw,40px);font-weight:900;color:${t.text};margin-bottom:12px;
  font-family:${t.font};animation:${fadeInScale} 0.5s ease-out both;
`
const FinalSub = styled.p`
  font-size:16px;color:${t.textSec};margin-bottom:32px;
  animation:${fadeInUp} 0.5s ease-out 0.15s both;
`
const FinalBtns = styled.div`
  display:flex;gap:14px;justify-content:center;flex-wrap:wrap;
  animation:${fadeInUp} 0.5s ease-out 0.25s both;
`
const CtaLink = styled(GoldButton).attrs({as:Link})`
  padding:16px 36px;font-size:16px;border-radius:${t.r.full};text-decoration:none !important;
` as any
const CtaGhost = styled(GhostButton).attrs({as:Link})`
  padding:16px 36px;font-size:16px;border-radius:${t.r.full};text-decoration:none !important;
` as any

/* ══════ FAQ ══════ */
const FaqSection = styled.section`
  padding:80px 24px;direction:rtl;position:relative;
  background:${t.bg};
  content-visibility:auto;contain-intrinsic-size:auto 600px;
`
const FaqGrid = styled.div`
  max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:12px;
`
const FaqItem = styled.div<{$open:boolean}>`
  background:${t.surface};border:1px solid ${pr=>pr.$open?t.goldBorder:t.border};
  border-radius:${t.r.lg};overflow:hidden;transition:all 0.35s cubic-bezier(0.32,0.72,0,1);
  &:hover{border-color:${t.goldBorder};}
`
const FaqQ = styled.button`
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  width:100%;padding:18px 22px;background:none;border:none;cursor:pointer;
  font-family:${t.font};font-size:15px;font-weight:700;color:${t.text};
  text-align:right;direction:rtl;transition:color ${t.tr};
  &:hover{color:${t.gold};}
`
const FaqChevron = styled.span<{$open:boolean}>`
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  width:28px;height:28px;border-radius:${t.r.sm};
  background:${pr=>pr.$open?t.goldDim:'transparent'};
  color:${pr=>pr.$open?t.gold:t.textDim};
  transition:all 0.35s cubic-bezier(0.32,0.72,0,1);
  transform:rotate(${pr=>pr.$open?'180deg':'0'});
`
const FaqA = styled.div<{$open:boolean}>`
  max-height:${pr=>pr.$open?'300px':'0'};opacity:${pr=>pr.$open?1:0};
  overflow:hidden;transition:max-height 0.4s cubic-bezier(0.32,0.72,0,1),opacity 0.3s,padding 0.3s;
  padding:${pr=>pr.$open?'0 22px 20px':'0 22px'};
  font-size:14px;color:${t.textSec};line-height:1.8;
`

/* ══════ RECENTLY VIEWED ══════ */
const RecentSection = styled.section`
  padding:48px 24px;direction:rtl;position:relative;
  background:linear-gradient(180deg,${t.bg},rgba(212,168,75,0.02),${t.bg});
  content-visibility:auto;contain-intrinsic-size:auto 350px;
`
const RecentGrid = styled.div`
  max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:14px;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  ${lg}{grid-template-columns:repeat(4,1fr);}
`
const RecentCard = styled(Link)<{$delay:number}>`
  display:flex;align-items:center;gap:14px;padding:16px;
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};
  text-decoration:none!important;transition:all 0.3s cubic-bezier(0.32,0.72,0,1);
  animation:${fadeInUp} 0.4s ease-out ${p=>p.$delay}s both;
  &:hover{border-color:${t.goldBorder};transform:translateY(-4px);box-shadow:0 12px 36px rgba(212,168,75,0.12);}
`
const RecentScoreBubble = styled.div<{$c:string}>`
  width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:${pr=>pr.$c}15;border:2px solid ${pr=>pr.$c}40;flex-shrink:0;
  font-size:14px;font-weight:900;color:${pr=>pr.$c};font-family:${t.font};
`
const RecentInfo = styled.div`flex:1;min-width:0;`
const RecentName = styled.div`font-size:14px;font-weight:700;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const RecentMeta = styled.div`font-size:11px;color:${t.textSec};display:flex;align-items:center;gap:6px;margin-top:3px;`
const RecentPrice = styled.span`font-size:15px;font-weight:800;color:${t.gold};white-space:nowrap;flex-shrink:0;`
const RecentSeeAll = styled(Link)`
  display:flex;align-items:center;justify-content:center;gap:8px;
  margin:24px auto 0;padding:12px 28px;width:fit-content;
  background:transparent;border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  color:${t.gold};font-size:14px;font-weight:700;font-family:${t.font};
  text-decoration:none!important;transition:all ${t.tr};
  &:hover{background:${t.goldDim};border-color:${t.gold};transform:translateY(-2px);}
`

/* ══════ NEWSLETTER SIGNUP ══════ */
const NewsletterSection = styled.section`
  padding:56px 24px;direction:rtl;text-align:center;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.02));
  border-top:1px solid ${t.goldBorder};border-bottom:1px solid ${t.goldBorder};
  content-visibility:auto;contain-intrinsic-size:auto 280px;
`
const NewsletterTitle = styled.h3`
  font-size:clamp(20px,3vw,28px);font-weight:800;color:${t.text};margin-bottom:8px;font-family:${t.font};
`
const NewsletterSub = styled.p`
  font-size:15px;color:${t.textSec};margin-bottom:28px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;
`
const NewsletterForm = styled.form`
  display:flex;align-items:center;gap:0;max-width:440px;margin:0 auto;
  background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.12);border-radius:${t.r.full};
  overflow:hidden;transition:all 0.3s;
  &:focus-within{border-color:${t.gold};box-shadow:0 0 0 3px ${t.goldDim};}
`
const NewsletterInput = styled.input`
  flex:1;padding:14px 18px;background:transparent;border:none;outline:none;
  font-size:15px;font-family:${t.font};color:${t.text};direction:ltr;text-align:right;
  &::placeholder{color:${t.textDim};}
  ${mobile}{padding:12px 14px;font-size:14px;}
`
const NewsletterBtn = styled.button<{$success?:boolean}>`
  display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 24px;
  background:${pr=>pr.$success?t.ok:`linear-gradient(135deg,${t.gold},${t.goldBright})`};color:${t.bg};
  border:none;font-size:14px;font-weight:700;font-family:${t.font};cursor:pointer;
  white-space:nowrap;transition:all 0.3s;border-radius:0 ${t.r.full} ${t.r.full} 0;
  &:hover{opacity:0.9;}
  ${mobile}{padding:12px 16px;font-size:13px;}
`
const NewsletterPrivacy = styled.p`
  font-size:11px;color:${t.textDim};margin-top:14px;max-width:380px;margin-left:auto;margin-right:auto;
`

/* ══════ DISCLAIMER ══════ */
const DisclaimerBanner = styled.div`
  padding:20px 24px;direction:rtl;text-align:center;
  background:linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02));
  border-top:1px solid rgba(245,158,11,0.15);
`
const DisclaimerInner = styled.div`
  max-width:800px;margin:0 auto;display:flex;align-items:flex-start;gap:10px;
  justify-content:center;
  ${mobile}{flex-direction:column;align-items:center;text-align:center;}
`
const DisclaimerText = styled.p`
  font-size:11px;color:${t.textDim};line-height:1.7;margin:0;
`

/* ── Scroll Reveal Wrapper ── */
const RevealWrap = styled.div<{$visible:boolean}>`
  opacity:${pr=>pr.$visible?1:0};
  transform:translateY(${pr=>pr.$visible?'0':'24px'});
  transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1);
`
function Reveal({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView({ rootMargin: '0px 0px -20px 0px', threshold: 0.05 })
  return <RevealWrap ref={ref} $visible={inView}>{children}</RevealWrap>
}

/* ── data ── */
const PARTICLES = Array.from({length:8},(_,i)=>({x:Math.random()*100,size:3+Math.random()*4,dur:8+Math.random()*7,delay:i*1.5}))
const FALLBACK_STATS = [
  {value:120,suffix:'+',label:'חלקות זמינות'},
  {value:35,suffix:'+',label:'יישובים מכוסים'},
  {value:32,suffix:'%',label:'תשואה ממוצעת'},
  {value:12,suffix:'+',label:'שנות ניסיון'},
]
const STEPS = [
  {num:'1',icon:MapPin,title:'בחרו אזור',desc:'סננו לפי עיר, מחיר ופוטנציאל על מפה אינטראקטיבית'},
  {num:'2',icon:TrendingUp,title:'נתחו השקעה',desc:'קבלו ניתוח AI, נתוני ועדות ותחזית תשואה מדויקת'},
  {num:'3',icon:Zap,title:'התחילו להרוויח',desc:'השאירו פרטים ומומחה קרקע יחזור אליכם תוך שעה'},
]
const FEATURES = [
  {icon:MapPin,title:'מפה אינטראקטיבית',desc:'שכבות גוש/חלקה, סינון מתקדם וצפייה בכל אזור בארץ.'},
  {icon:MessageCircle,title:'יועץ AI חכם',desc:'בינה מלאכותית שמנתחת כל חלקה ומספקת תחזיות מותאמות אישית.'},
  {icon:TrendingUp,title:'נתונים בזמן אמת',desc:'סטטוס ועדות, שומות שמאי, מגמות שוק ונתוני תקן 22.'},
  {icon:Bell,title:'התראות מותאמות',desc:'קבלו התראות מיידיות על שינויי מחיר והזדמנויות חדשות.'},
  {icon:Smartphone,title:'גישה מכל מכשיר',desc:'חוויית שימוש מושלמת במובייל, טאבלט ודסקטופ.'},
  {icon:Briefcase,title:'כלים מקצועיים',desc:'מחשבון תשואה, השוואת חלקות ודוחות PDF לאנשי עסקים.'},
]
const TESTIMONIALS = [
  {name:'יוסי כהן',city:'תל אביב',hue:210,initials:'יכ',quote:'LandMap שינתה לי את הגישה להשקעות קרקע. המידע כאן חסך לי חודשים של מחקר ועשרות אלפי שקלים.',stars:5},
  {name:'מיכל לוי',city:'הרצליה',hue:340,initials:'מל',quote:'הכלי הכי מקצועי שפגשתי בתחום. הנתונים מדויקים, האנליזה של ה-AI פשוט מדהימה, והתמיכה אישית.',stars:5},
  {name:'אבי ברק',city:'ירושלים',hue:150,initials:'אב',quote:'מצאתי חלקה עם פוטנציאל ענק דרך הפלטפורמה. תוך 18 חודשים הכפלתי את ההשקעה. תודה LandMap!',stars:5},
]
const AVATARS = [{initials:'דכ',hue:220},{initials:'רמ',hue:330},{initials:'אל',hue:160},{initials:'שב',hue:30}]

const FAQ_ITEMS = [
  { q: 'מה זה קרקע חקלאית להשקעה ואיך מרוויחים ממנה?', a: 'קרקע חקלאית היא קרקע שטרם שונה ייעודה לבנייה. הרווח נוצר כאשר מתקדמות תוכניות סטטוטוריות (תב"ע) שמשנות את ייעוד הקרקע מחקלאית לבנייה — מה שמעלה את ערכה משמעותית. משקיעים שנכנסים בשלבים מוקדמים נהנים מתשואות גבוהות.' },
  { q: 'מהם השלבים התכנוניים של קרקע בישראל?', a: 'התהליך כולל: קרקע חקלאית → הפקדת תוכנית מתאר → אישור תוכנית מתאר → הכנת תוכנית מפורטת → הפקדת תוכנית מפורטת → אישור תוכנית מפורטת → מכרז יזמים → היתר בנייה. כל שלב שמתקדם מעלה את ערך הקרקע.' },
  { q: 'מה זה תקן 22 ולמה הוא חשוב?', a: 'תקן 22 הוא תקן שמאי מקרקעין שקובע כיצד לחשב את שווי הקרקע בכל שלב תכנוני. הנתונים ב-LandMap מבוססים על מתודולוגיה זו, מה שמאפשר הערכת שווי מדויקת ומקצועית של כל חלקה.' },
  { q: 'איך LandMap שונה מ-Madlan או Yad2?', a: 'LandMap מתמחה בקרקעות להשקעה — לא דירות. אנחנו מציעים מפה אינטראקטיבית עם שכבות גוש/חלקה, ניתוח AI לכל חלקה, ציון השקעה מותאם אישית, תחזיות תשואה, ומעקב אחרי התקדמות סטטוטורית — כלים שלא קיימים בפלטפורמות דירות.' },
  { q: 'האם השימוש בפלטפורמה חינמי?', a: 'כן! צפייה במפה, סינון חלקות וקבלת מידע בסיסי הם חינמיים לחלוטין. משתמשים רשומים נהנים מכלים נוספים כמו שמירת מועדפים, השוואת חלקות ודוחות מפורטים.' },
  { q: 'כמה זמן לוקח עד שקרקע מניבה רווח?', a: 'תלוי בשלב התכנוני. קרקע בשלב מתקדם (תוכנית מפורטת מאושרת) יכולה להניב תוך 1-3 שנים. קרקע חקלאית בשלבים מוקדמים — 5-10 שנים ומעלה. ככל שנכנסים מוקדם יותר, הסיכון גבוה יותר אך גם פוטנציאל התשואה.' },
]

/* ── FAQ Accordion ── */
function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const toggle = useCallback((i: number) => setOpenIdx(prev => prev === i ? null : i), [])
  return (
    <>
      <FaqGrid>
        {FAQ_ITEMS.map((item, i) => (
          <FaqItem key={i} $open={openIdx === i}>
            <FaqQ onClick={() => toggle(i)} aria-expanded={openIdx === i} aria-controls={`faq-a-${i}`}>
              {item.q}
              <FaqChevron $open={openIdx === i}><ChevronDown size={16} /></FaqChevron>
            </FaqQ>
            <FaqA id={`faq-a-${i}`} $open={openIdx === i} role="region">{item.a}</FaqA>
          </FaqItem>
        ))}
      </FaqGrid>
      {/* FAQPage Schema.org JSON-LD for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }) }} />
    </>
  )
}

/* ══════ PAGE ══════ */
/* ── Quick search cities for autocomplete ── */
const SEARCH_CITIES = ['חדרה', 'נתניה', 'קיסריה', 'הרצליה', 'כפר סבא', 'רעננה', 'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נס ציונה']

export default function Landing(){
  useDocumentTitle('קרקעות להשקעה בישראל — מפה אינטראקטיבית')
  useMetaDescription('מצא קרקעות להשקעה בישראל עם מפה אינטראקטיבית, ניתוח AI, ציוני השקעה, תחזיות תשואה ומעקב סטטוטורי. חינם.')
  const [vis,setVis]=useState(false)
  const [heroSearch, setHeroSearch] = useState('')
  const [heroDropOpen, setHeroDropOpen] = useState(false)
  const [heroFocusIdx, setHeroFocusIdx] = useState(-1)
  const [nlEmail, setNlEmail] = useState('')
  const [nlSubmitted, setNlSubmitted] = useState(false)
  const heroTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const prefetchCity = usePrefetchPlotsByCity()
  useEffect(()=>{setVis(true)},[])

  // Fetch live market data for stats (used by ticker, city cards, hot opportunity count)
  const { data: plots, isLoading: plotsLoading } = useAllPlots()

  // Fetch featured plots from dedicated lightweight endpoint (server-scored, cached 5min)
  // Avoids client-side scoring computation — server already ranks by deal factor + ROI + freshness
  const { data: serverFeatured, isLoading: featuredLoading } = useFeaturedPlots(3)
  const { data: popularPlots } = usePopularPlots(6)

  // Recently viewed plots for returning users
  const { ids: recentIds } = useRecentlyViewed()
  const { data: recentPlots } = usePlotsBatch(recentIds.slice(0, 4))

  // Newsletter signup handler
  const handleNewsletterSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!nlEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nlEmail)) return
    // Store email locally (could be sent to server later)
    try {
      const existing = JSON.parse(localStorage.getItem('nl_emails') || '[]') as string[]
      if (!existing.includes(nlEmail.trim())) {
        localStorage.setItem('nl_emails', JSON.stringify([...existing, nlEmail.trim()]))
      }
    } catch {}
    setNlSubmitted(true)
    setNlEmail('')
    setTimeout(() => setNlSubmitted(false), 5000)
  }, [nlEmail])

  // Per-city live data for city cards
  const cityData = useMemo(() => {
    if (!plots || plots.length === 0) return new Map<string, { count: number; avgPrice: number; avgPpd: number }>()
    const map = new Map<string, { prices: number[]; ppds: number[] }>()
    for (const pl of plots) {
      if (!pl.city) continue
      if (!map.has(pl.city)) map.set(pl.city, { prices: [], ppds: [] })
      const entry = map.get(pl.city)!
      const d = p(pl)
      if (d.price > 0) entry.prices.push(d.price)
      const ppd = pricePerDunam(pl)
      if (ppd > 0) entry.ppds.push(ppd)
    }
    const result = new Map<string, { count: number; avgPrice: number; avgPpd: number }>()
    for (const [city, data] of map) {
      result.set(city, {
        count: data.prices.length || 1,
        avgPrice: data.prices.length > 0 ? Math.round(data.prices.reduce((s, v) => s + v, 0) / data.prices.length) : 0,
        avgPpd: data.ppds.length > 0 ? Math.round(data.ppds.reduce((s, v) => s + v, 0) / data.ppds.length) : 0,
      })
    }
    return result
  }, [plots])

  // Hero search autocomplete suggestions
  const heroSuggestions = useMemo(() => {
    const q = heroSearch.trim().toLowerCase()
    if (!q) return SEARCH_CITIES.slice(0, 6).map(name => ({ name, emoji: POPULAR_CITIES.find(c => c.name === name)?.emoji || '📍', hue: POPULAR_CITIES.find(c => c.name === name)?.hue ?? 200 }))
    return SEARCH_CITIES
      .filter(c => c.includes(q))
      .slice(0, 6)
      .map(name => ({ name, emoji: POPULAR_CITIES.find(c => c.name === name)?.emoji || '📍', hue: POPULAR_CITIES.find(c => c.name === name)?.hue ?? 200 }))
  }, [heroSearch])

  const selectHeroSuggestion = useCallback((city: string) => {
    setHeroSearch(city)
    setHeroDropOpen(false)
    setHeroFocusIdx(-1)
    navigate(`/explore?city=${encodeURIComponent(city)}`)
  }, [navigate])

  const handleHeroKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!heroDropOpen || heroSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHeroFocusIdx(i => Math.min(i + 1, heroSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHeroFocusIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && heroFocusIdx >= 0) {
      e.preventDefault()
      selectHeroSuggestion(heroSuggestions[heroFocusIdx].name)
    }
  }, [heroDropOpen, heroSuggestions, heroFocusIdx, selectHeroSuggestion])

  // Reset focus index when search changes
  useEffect(() => { setHeroFocusIdx(-1) }, [heroSearch])

  // Market ticker items — build from real plot data
  const tickerItems = useMemo(() => {
    if (!plots || plots.length === 0) return []
    return plots
      .filter(pl => p(pl).price > 0)
      .map(pl => {
        const d = p(pl)
        const r = roi(pl)
        const score = calcScore(pl)
        const grade = getGrade(score)
        return {
          city: pl.city,
          block: d.block,
          price: fmt.compact(d.price),
          roi: r > 0 ? `+${Math.round(r)}%` : null,
          grade: grade.grade,
          color: grade.color,
          status: pl.status,
        }
      })
      .sort(() => Math.random() - 0.5) // shuffle for variety
  }, [plots])

  // Featured plots — prefer server-scored featured endpoint (pre-computed, cached 5min).
  // Falls back to client-side scoring if the endpoint hasn't responded yet.
  const featuredPlots = useMemo(() => {
    // Prefer server-scored featured plots (lighter, pre-ranked)
    if (serverFeatured && serverFeatured.length > 0) return serverFeatured
    // Fallback: compute from all plots while server data loads
    if (!plots || plots.length === 0) return []
    return [...plots]
      .filter(pl => p(pl).price > 0 && roi(pl) > 0)
      .sort((a, b) => calcScore(b) - calcScore(a) || roi(b) - roi(a))
      .slice(0, 3)
  }, [serverFeatured, plots])

  // Count high-opportunity plots (score >= 7 AND positive ROI) for the live badge
  const hotOpportunityCount = useMemo(() => {
    if (!plots || plots.length === 0) return 0
    return plots.filter(pl => calcScore(pl) >= 7 && roi(pl) > 0 && p(pl).price > 0).length
  }, [plots])

  const liveStats = useMemo(() => {
    if (!plots || plots.length === 0) return FALLBACK_STATS
    const uniqueCities = new Set(plots.map(pl => pl.city).filter(Boolean))
    const rois = plots.map(roi).filter(v => v > 0)
    const avgRoi = rois.length > 0 ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length) : 32
    const totalValue = plots.reduce((s, pl) => s + p(pl).price, 0)
    return [
      { value: plots.length, suffix: '', label: 'חלקות זמינות' },
      { value: uniqueCities.size, suffix: '', label: 'יישובים מכוסים' },
      { value: avgRoi, suffix: '%', label: 'תשואה ממוצעת' },
      { value: Math.round(totalValue / 1e6), suffix: 'M₪', label: 'שווי כולל בפלטפורמה' },
    ]
  }, [plots])

  return(
    <PublicLayout>
      <Dark>
        {/* ── Hero ── */}
        <Hero>
          <MeshBg/>
          {PARTICLES.map((p,i)=><Particle key={i} $x={p.x} $size={p.size} $dur={p.dur} $delay={p.delay}/>)}
          <Orb $size={340} $top="8%" $left="3%" $delay={0}/>
          <Orb $size={220} $top="55%" $left="82%" $delay={2}/>
          <Orb $size={160} $top="20%" $left="68%" $delay={4}/>
          <Orb $size={120} $top="70%" $left="15%" $delay={3}/>
          <HeroContent>
            <Headline>המקום שבו קרקע הופכת לזהב</Headline>
            <Sub>פלטפורמת הנדל"ן המובילה בישראל &mdash; מפה אינטראקטיבית, ניתוח AI, נתוני ועדות ותקן 22 במקום אחד</Sub>
            <SocialProof>
              <AvatarStack>
                {AVATARS.map((a,i)=><Avatar key={i} $i={i} $hue={a.hue}>{a.initials}</Avatar>)}
              </AvatarStack>
              <ProofText>מאות משקיעים כבר בפלטפורמה</ProofText>
            </SocialProof>
            <CTAs>
              <HeroGold to="/explore" onMouseEnter={preloadRoutes.explore} onFocus={preloadRoutes.explore}>גלו את ההזדמנויות <ChevronLeft size={18}/></HeroGold>
              <HeroGhost to="/login" onMouseEnter={preloadRoutes.auth} onFocus={preloadRoutes.auth}>הרשמה חינם</HeroGhost>
            </CTAs>
            <TrustRow>
              <TrustBadge><Shield size={14}/> מידע מאובטח</TrustBadge>
              <TrustBadge><FileText size={14}/> נתוני תקן 22</TrustBadge>
              <TrustBadge><Building2 size={14}/> נתוני ועדות</TrustBadge>
            </TrustRow>
            {hotOpportunityCount > 0 && (
              <LiveOppBadge onClick={() => navigate('/explore?ripeness=high')}>
                <LiveOppDot />
                <LiveOppCount>{hotOpportunityCount}</LiveOppCount> הזדמנויות חמות זמינות עכשיו
              </LiveOppBadge>
            )}
            <HeroSearchWrap onSubmit={e => { e.preventDefault(); navigate(`/explore${heroSearch ? `?city=${encodeURIComponent(heroSearch)}` : ''}`) }}>
              <HeroSearchInput
                value={heroSearch}
                onChange={e => { setHeroSearch(e.target.value); setHeroDropOpen(true) }}
                onFocus={() => setHeroDropOpen(true)}
                onBlur={() => { heroTimeoutRef.current = setTimeout(() => setHeroDropOpen(false), 180) }}
                onKeyDown={handleHeroKeyDown}
                placeholder="חפשו עיר, ישוב או גוש..."
                autoComplete="off"
                role="combobox"
                aria-expanded={heroDropOpen && heroSuggestions.length > 0}
                aria-autocomplete="list"
                aria-label="חיפוש קרקעות"
              />
              <HeroSearchBtn type="submit"><Search size={18}/> חיפוש</HeroSearchBtn>
              {heroDropOpen && heroSuggestions.length > 0 && (
                <HeroDropdown role="listbox" onMouseDown={() => { if (heroTimeoutRef.current) clearTimeout(heroTimeoutRef.current) }}>
                  <HeroDropGroup>📍 {heroSearch.trim() ? 'תוצאות' : 'ערים פופולריות'}</HeroDropGroup>
                  {heroSuggestions.map((s, i) => {
                    const cd = cityData.get(s.name)
                    return (
                      <HeroDropItem
                        key={s.name}
                        $focused={heroFocusIdx === i}
                        role="option"
                        aria-selected={heroFocusIdx === i}
                        onMouseDown={() => selectHeroSuggestion(s.name)}
                      >
                        <HeroDropIcon $hue={s.hue}>{s.emoji}</HeroDropIcon>
                        <HeroDropInfo>
                          <HeroDropName>{s.name}</HeroDropName>
                          <HeroDropMeta>
                            {cd ? (
                              <>
                                <span><HeroDropMetaVal>{cd.count}</HeroDropMetaVal> חלקות</span>
                                {cd.avgPrice > 0 && <span>ממוצע <HeroDropMetaVal>{fmt.compact(cd.avgPrice)}</HeroDropMetaVal></span>}
                                {cd.avgPpd > 0 && <span><HeroDropMetaVal>₪{(cd.avgPpd/1000).toFixed(0)}K</HeroDropMetaVal>/דונם</span>}
                              </>
                            ) : (
                              <span>{POPULAR_CITIES.find(c => c.name === s.name)?.count || 'חפשו חלקות'}</span>
                            )}
                          </HeroDropMeta>
                        </HeroDropInfo>
                      </HeroDropItem>
                    )
                  })}
                </HeroDropdown>
              )}
            </HeroSearchWrap>
          </HeroContent>
          <ScrollIndicator onClick={() => document.getElementById('cities')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>גללו למטה</span>
            <ArrowDown size={20}/>
          </ScrollIndicator>
        </Hero>

        {/* ── Market Ticker ── */}
        {tickerItems.length > 0 && (
          <TickerStrip>
            <TickerTrack $dur={Math.max(20, tickerItems.length * 4)}>
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <TickerItem key={i}>
                  <TickerDot $c={item.color} />
                  📍 {item.city} · גוש {item.block} ·{' '}
                  <TickerVal>{item.price}</TickerVal>
                  {item.roi && (
                    <>
                      {' · תשואה '}
                      <TickerVal $c={t.ok}>{item.roi}</TickerVal>
                    </>
                  )}
                  {' · '}
                  <TickerVal $c={item.color}>{item.grade}</TickerVal>
                </TickerItem>
              ))}
            </TickerTrack>
          </TickerStrip>
        )}

        {/* ── Popular Cities ── */}
        <Reveal>
        <CitiesSection id="cities">
          <CitiesSectionHead>חפשו קרקע לפי <span>עיר</span></CitiesSectionHead>
          <CitiesGrid>
            {POPULAR_CITIES.map((c,i)=>{
              const cd = cityData.get(c.name)
              return (
              <CityCard key={c.name} to={`/explore?city=${encodeURIComponent(c.name)}`} $hue={c.hue} $delay={i*0.06} onMouseEnter={() => { prefetchCity(c.name); preloadRoutes.explore() }}>
                <CityEmoji>{c.emoji}</CityEmoji>
                <CityName>{c.name}</CityName>
                {cd ? (
                  <CityLiveData>
                    <CityLiveItem><CityLiveVal>{cd.count}</CityLiveVal><CityLiveLabel>חלקות</CityLiveLabel></CityLiveItem>
                    {cd.avgPrice > 0 && <CityLiveItem><CityLiveVal>{fmt.compact(cd.avgPrice)}</CityLiveVal><CityLiveLabel>ממוצע</CityLiveLabel></CityLiveItem>}
                    {cd.avgPpd > 0 && <CityLiveItem><CityLiveVal>₪{(cd.avgPpd/1000).toFixed(0)}K</CityLiveVal><CityLiveLabel>/דונם</CityLiveLabel></CityLiveItem>}
                  </CityLiveData>
                ) : (
                  <CityCount>{c.count}</CityCount>
                )}
              </CityCard>
              )
            })}
          </CitiesGrid>
        </CitiesSection>
        </Reveal>

        {/* ── Featured Plots ── */}
        {(featuredPlots.length > 0 || featuredLoading || plotsLoading) && (
          <Reveal><FeaturedSection id="featured">
            <CitiesSectionHead>🔥 חלקות <span>מומלצות</span> להשקעה</CitiesSectionHead>
            <FeaturedGrid>
              {(featuredLoading || plotsLoading) && featuredPlots.length === 0 && Array.from({length:3}).map((_,i) => (
                <FeaturedSkelCard key={i}>
                  <FeaturedSkelHeader>
                    <SkelBar $w="45%" $h="12px" />
                    <SkelBar $w="70%" $h="20px" />
                    <SkelBar $w="55%" $h="12px" />
                  </FeaturedSkelHeader>
                  <FeaturedSkelBody>
                    <SkelBar $w="40%" $h="28px" />
                    <FeaturedSkelMetrics>
                      {[1,2,3].map(j => (
                        <FeaturedSkelMetric key={j}>
                          <SkelBar $w="60%" $h="14px" />
                          <SkelBar $w="80%" $h="10px" />
                        </FeaturedSkelMetric>
                      ))}
                    </FeaturedSkelMetrics>
                  </FeaturedSkelBody>
                  <FeaturedSkelFooter>
                    <SkelBar $w="30%" $h="12px" />
                    <SkelBar $w="25%" $h="12px" />
                  </FeaturedSkelFooter>
                </FeaturedSkelCard>
              ))}
              {featuredPlots.map((pl, i) => {
                const d = p(pl)
                const score = calcScore(pl)
                const grade = getGrade(score)
                const plotRoi = roi(pl)
                const ppd = pricePerDunam(pl)
                const cityEmoji = POPULAR_CITIES.find(c => c.name === pl.city)?.emoji || '📍'
                const cityHue = POPULAR_CITIES.find(c => c.name === pl.city)?.hue ?? 200
                return (
                  <FeaturedCard key={pl.id} to={`/plot/${pl.id}`} $delay={i * 0.1} onMouseEnter={preloadRoutes.plotDetail} onFocus={preloadRoutes.plotDetail}>
                    <FeaturedHeader $hue={cityHue}>
                      <FeaturedBadges>
                        {score >= 8 && (
                          <FeaturedBadge $bg="rgba(239,68,68,0.15)" $c="#EF4444">
                            <Flame size={11}/> חם
                          </FeaturedBadge>
                        )}
                        <FeaturedBadge $bg={`${grade.color}18`} $c={grade.color}>
                          {grade.grade}
                        </FeaturedBadge>
                      </FeaturedBadges>
                      <FeaturedTitle>{cityEmoji} גוש {d.block} חלקה {pl.number}</FeaturedTitle>
                      <FeaturedCity><MapPin size={13}/> {pl.city} · {zoningLabels[d.zoning] || d.zoning}</FeaturedCity>
                    </FeaturedHeader>
                    <FeaturedBody>
                      <FeaturedPrice>{fmt.compact(d.price)}</FeaturedPrice>
                      <FeaturedMetrics>
                        <FeaturedMetric>
                          <FeaturedMetricVal $c={t.ok}>+{Math.round(plotRoi)}%</FeaturedMetricVal>
                          <FeaturedMetricLabel>תשואה צפויה</FeaturedMetricLabel>
                        </FeaturedMetric>
                        <FeaturedMetric>
                          <FeaturedMetricVal>{fmt.dunam(d.size)} דונם</FeaturedMetricVal>
                          <FeaturedMetricLabel>שטח</FeaturedMetricLabel>
                        </FeaturedMetric>
                        <FeaturedMetric>
                          <FeaturedMetricVal>{ppd > 0 ? `₪${(ppd / 1000).toFixed(0)}K` : '—'}</FeaturedMetricVal>
                          <FeaturedMetricLabel>מחיר/דונם</FeaturedMetricLabel>
                        </FeaturedMetric>
                      </FeaturedMetrics>
                    </FeaturedBody>
                    <FeaturedFooter>
                      <FeaturedScore $c={grade.color}>
                        <TrendingUp size={13}/> ציון {score}/10
                      </FeaturedScore>
                      <FeaturedCta>
                        צפו בפרטים <ArrowUpRight size={14}/>
                      </FeaturedCta>
                    </FeaturedFooter>
                  </FeaturedCard>
                )
              })}
            </FeaturedGrid>
            <ViewAllBtn to="/explore" onMouseEnter={preloadRoutes.explore} onFocus={preloadRoutes.explore}>
              <Eye size={18}/> צפו בכל החלקות על המפה
            </ViewAllBtn>
            {/* ItemList Schema.org JSON-LD — helps Google index featured plots as rich results.
                Google displays "Top picks" or "Recommended" cards in SERPs when ItemList is present.
                Each item links to the canonical plot page for better crawling & indexing. */}
            {featuredPlots.length > 0 && (
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: 'חלקות מומלצות להשקעה',
                description: 'חלקות קרקע מובילות להשקעה בישראל — דירוג לפי פוטנציאל תשואה וערך עסקה',
                numberOfItems: featuredPlots.length,
                itemListElement: featuredPlots.map((pl, i) => {
                  const d = p(pl)
                  return {
                    '@type': 'ListItem',
                    position: i + 1,
                    item: {
                      '@type': 'RealEstateListing',
                      name: `גוש ${d.block} חלקה ${pl.number} - ${pl.city}`,
                      url: `${window.location.origin}/plot/${pl.id}`,
                      ...(d.price > 0 && {
                        offers: { '@type': 'Offer', price: d.price, priceCurrency: 'ILS', availability: 'https://schema.org/InStock' },
                      }),
                      address: { '@type': 'PostalAddress', addressLocality: pl.city, addressCountry: 'IL' },
                      ...(d.size > 0 && {
                        floorSize: { '@type': 'QuantitativeValue', value: d.size, unitCode: 'MTK' },
                      }),
                    },
                  }
                }),
              }) }} />
            )}
          </FeaturedSection></Reveal>
        )}

        {/* ── Popular / Most Viewed (like Yad2's "הכי נצפים") ── */}
        {popularPlots && popularPlots.length > 0 && (
          <Reveal><PopularStrip>
            <CitiesSectionHead>👁️ הכי <span>נצפים</span> השבוע</CitiesSectionHead>
            <PopularScroll>
              {popularPlots.map((pl, i) => {
                const d = p(pl)
                const plotRoi = roi(pl)
                const score = calcScore(pl)
                const grade = getGrade(score)
                const views = (pl as any)._viewVelocity != null
                  ? `${((pl as any)._viewVelocity as number).toFixed(1)}/יום`
                  : `${pl.views || 0}`
                return (
                  <PopularCard key={pl.id} to={`/plot/${pl.id}`} $delay={i * 0.08} onMouseEnter={preloadRoutes.plotDetail}>
                    <PopularCardTop>
                      <PopularCardCity>{pl.city}</PopularCardCity>
                      <PopularCardViews><Eye size={11} /> {views}</PopularCardViews>
                    </PopularCardTop>
                    <PopularCardBody>
                      <PopularCardTitle>גוש {d.block} · חלקה {pl.number}</PopularCardTitle>
                      <PopularCardPrice>{d.price > 0 ? fmt.compact(d.price) : '—'}</PopularCardPrice>
                      <PopularCardMeta>
                        <PopularCardMetaItem $c={t.ok}>
                          <TrendingUp size={11} /> {plotRoi > 0 ? `+${Math.round(plotRoi)}%` : '—'}
                        </PopularCardMetaItem>
                        <PopularCardMetaItem>
                          {fmt.dunam(d.size)} דונם
                        </PopularCardMetaItem>
                        <PopularCardMetaItem $c={grade.color}>
                          {grade.grade}
                        </PopularCardMetaItem>
                      </PopularCardMeta>
                    </PopularCardBody>
                  </PopularCard>
                )
              })}
            </PopularScroll>
          </PopularStrip></Reveal>
        )}

        {/* ── Stats (live market data) ── */}
        <Reveal><StatsStrip>
          <StatsGrid>
            {liveStats.map((s,i)=>(
              <StatItem key={i} $delay={i*0.1}>
                <StatNum><CountUpNumber value={s.value}/>{s.suffix}</StatNum>
                <StatLabel>{s.label}</StatLabel>
              </StatItem>
            ))}
          </StatsGrid>
        </StatsStrip></Reveal>

        {/* ── How It Works ── */}
        <Reveal><HowSection>
          <SectionHead>איך זה עובד?</SectionHead>
          <StepsRow>
            {STEPS.map((s,i)=>(
              <React.Fragment key={i}>
                {i>0 && <Connector><svg width="40" height="2" viewBox="0 0 40 2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4"/></svg></Connector>}
                <StepCard $delay={i*0.2}>
                  <StepNum>{s.num}</StepNum>
                  <StepIcon><s.icon size={28}/></StepIcon>
                  <CardTitle>{s.title}</CardTitle>
                  <CardDesc>{s.desc}</CardDesc>
                </StepCard>
              </React.Fragment>
            ))}
          </StepsRow>
        </HowSection></Reveal>

        {/* ── Features ── */}
        <Reveal><Features id="features">
          <SectionHead>למה LandMap?</SectionHead>
          <FeatGrid>
            {FEATURES.map((f,i)=>(
              <Card key={i} $delay={i*0.1}>
                <IconWrap><f.icon size={24}/></IconWrap>
                <CardTitle>{f.title}</CardTitle>
                <CardDesc>{f.desc}</CardDesc>
              </Card>
            ))}
          </FeatGrid>
        </Features></Reveal>

        {/* ── Comparison Table ── */}
        <Reveal><CompareSection>
          <SectionHead>למה LandMap ולא המתחרים?</SectionHead>
          <CompareTable>
            <CompareRow $header>
              <CompareLabel $header>תכונה</CompareLabel>
              <CompareLabel $header style={{textAlign:'center'}}>LandMap</CompareLabel>
              <CompareLabel $header style={{textAlign:'center'}}>Madlan</CompareLabel>
              <CompareLabel $header style={{textAlign:'center'}}>Yad2</CompareLabel>
            </CompareRow>
            {COMPARE_FEATURES.map((f,i) => (
              <CompareRow key={i} $even={i%2===0}>
                <CompareLabel>{f.feature}</CompareLabel>
                <CompareCheck $yes={f.us}>{f.us ? '✅' : '❌'}</CompareCheck>
                <CompareCheck $yes={f.madlan}>{f.madlan ? '✅' : '❌'}</CompareCheck>
                <CompareCheck $yes={f.yad2}>{f.yad2 ? '✅' : '❌'}</CompareCheck>
              </CompareRow>
            ))}
          </CompareTable>
        </CompareSection></Reveal>

        {/* ── Testimonials ── */}
        <Reveal><TestSection>
          <SectionHead>מה אומרים המשקיעים שלנו</SectionHead>
          <TestGrid>
            {TESTIMONIALS.map((tt,i)=>(
              <TestCard key={i} $delay={i*0.15}>
                <TestHeader>
                  <TestAvatar $hue={tt.hue}>{tt.initials}</TestAvatar>
                  <div><TestName>{tt.name}</TestName><TestCity>{tt.city}</TestCity></div>
                </TestHeader>
                <TestStars>{Array.from({length:tt.stars}).map((_,j)=><Star key={j} size={16} fill={t.goldBright} strokeWidth={0}/>)}</TestStars>
                <TestQuote>"{tt.quote}"</TestQuote>
              </TestCard>
            ))}
          </TestGrid>
        </TestSection></Reveal>

        {/* ── FAQ ── */}
        <Reveal><FaqSection id="faq">
          <SectionHead>שאלות נפוצות</SectionHead>
          <FaqAccordion />
        </FaqSection></Reveal>

        {/* ── Recently Viewed (returning users only) ── */}
        {recentPlots && recentPlots.length > 0 && (
          <Reveal><RecentSection>
            <CitiesSectionHead><Clock size={22} style={{verticalAlign:'middle',marginLeft:8}} /> חזרתם? הנה מה <span>שצפיתם</span> לאחרונה</CitiesSectionHead>
            <RecentGrid>
              {recentPlots.slice(0, 4).map((pl, i) => {
                const d = p(pl), score = calcScore(pl), grade = getGrade(score)
                return (
                  <RecentCard key={pl.id} to={`/plot/${pl.id}`} $delay={i * 0.08} onMouseEnter={preloadRoutes.plotDetail} onFocus={preloadRoutes.plotDetail}>
                    <RecentScoreBubble $c={grade.color}>{score}</RecentScoreBubble>
                    <RecentInfo>
                      <RecentName>גוש {d.block} · {pl.city}</RecentName>
                      <RecentMeta>
                        <span>{fmt.dunam(d.size)} דונם</span>
                        <span>·</span>
                        <span style={{color:grade.color,fontWeight:700}}>{grade.grade}</span>
                      </RecentMeta>
                    </RecentInfo>
                    <RecentPrice>{fmt.compact(d.price)}</RecentPrice>
                  </RecentCard>
                )
              })}
            </RecentGrid>
            <RecentSeeAll to="/explore">
              <Eye size={16}/> צפו בכל ההיסטוריה שלי
            </RecentSeeAll>
          </RecentSection></Reveal>
        )}

        {/* ── Newsletter Signup ── */}
        <Reveal><NewsletterSection>
          <Mail size={32} color={t.gold} style={{marginBottom:12}} />
          <NewsletterTitle>קבלו התראות על הזדמנויות חדשות</NewsletterTitle>
          <NewsletterSub>הירשמו לעדכוני שוק שבועיים — חלקות חדשות, שינויי מחירים, והזדמנויות השקעה ישירות למייל</NewsletterSub>
          <NewsletterForm onSubmit={handleNewsletterSubmit}>
            <NewsletterInput
              type="email"
              value={nlEmail}
              onChange={e => setNlEmail(e.target.value)}
              placeholder="your@email.com"
              required
              aria-label="כתובת אימייל לעדכונים"
              dir="ltr"
            />
            <NewsletterBtn type="submit" $success={nlSubmitted}>
              {nlSubmitted ? <>✓ נרשמת!</> : <><Bell size={16}/> הרשמה</>}
            </NewsletterBtn>
          </NewsletterForm>
          <NewsletterPrivacy>🔒 לא נשלח ספאם. ניתן לבטל בכל עת. פרטיות מלאה.</NewsletterPrivacy>
        </NewsletterSection></Reveal>

        {/* ── WhatsApp ── */}
        <WaSection>
          <SectionHead style={{marginBottom:24}}>רוצים לדבר עם מומחה?</SectionHead>
          <p style={{color:t.textSec,marginBottom:28,fontSize:16}}>צוות מומחי הקרקע שלנו זמין עבורכם לכל שאלה</p>
          <WaBtn href={SITE_CONFIG.waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={22}/> שלח הודעה בוואטסאפ
          </WaBtn>
          <br/>
          <PhoneLink href={`tel:${SITE_CONFIG.phone}`}><Phone size={15}/> {SITE_CONFIG.phone}</PhoneLink>
        </WaSection>

        {/* ── Final CTA ── */}
        <FinalCTA>
          <FinalTitle>אל תפספסו את ההזדמנות הבאה</FinalTitle>
          <FinalSub>הצטרפו למשקיעים חכמים שכבר מרוויחים עם LandMap</FinalSub>
          <FinalBtns>
            <CtaLink to="/login">הרשמה חינם <ChevronLeft size={16}/></CtaLink>
            <CtaGhost to="/login">כניסה למערכת</CtaGhost>
          </FinalBtns>
        </FinalCTA>

        {/* ── Investment Disclaimer ── */}
        <DisclaimerBanner>
          <DisclaimerInner>
            <AlertTriangle size={14} color={t.warn} style={{flexShrink:0,marginTop:2}} />
            <DisclaimerText>
              המידע באתר הינו לצרכי מידע כללי בלבד ואינו מהווה ייעוץ השקעות, ייעוץ משפטי או ייעוץ פיננסי.
              השקעה בקרקעות כרוכה בסיכון, כולל אובדן הקרן. תשואות עבר אינן מעידות על תשואות עתידיות.
              מומלץ להתייעץ עם אנשי מקצוע מוסמכים לפני קבלת החלטות השקעה. LandMap אינה משמשת כיועצת השקעות
              ואינה אחראית לנזקים הנובעים מהסתמכות על המידע באתר.
            </DisclaimerText>
          </DisclaimerInner>
        </DisclaimerBanner>

        <ScrollToTop />
      </Dark>
    </PublicLayout>
  )
}

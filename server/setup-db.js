import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Israeli land plots data — real locations with realistic planning data
const plots = [
  {
    block_number: '10006',
    number: '168',
    city: 'חדרה',
    size_sqm: 2011,
    status: 'AVAILABLE',
    total_price: 400000,
    tax_authority_value: 350000,
    projected_value: 1200000,
    zoning_stage: 'DETAILED_PLAN_PREP',
    ripeness: '3-5',
    coordinates: [[32.4505, 34.8735],[32.4505, 34.8755],[32.4495, 34.8755],[32.4495, 34.8735]],
    documents: ['תוכנית 302-0340539', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה 168 ממוקמת 500 מטר מקו החוף במתחם רובע הים חדרה (עיר ימים) — פרויקט הדגל היוקרתי של העיר. התוכנית כוללת כ-10,000 יח"ד, שדרת מלונאות, טיילת חוף באורך 1.5 ק"מ ופארקים ציבוריים. השכונה תוכננה ע"י האדריכל טומס לייטרסדורף ז"ל. צפיפות 15 יח"ד לדונם.',
    area_context: 'רובע הים חדרה — שכונה חדשה לאורך רצועת החוף מגבעת אולגה ועד נחל חדרה. גישה ישירה לפארק נחל חדרה ולמרכז הרפואי הלל יפה.',
    readiness_estimate: '3-5 שנים',
    nearby_development: 'שכונת מגורים חדשה 800 מ\' צפונה, מתחם מסחרי 1.2 ק"מ דרומה.',
    distance_to_sea: 500,
    distance_to_park: 300,
    distance_to_hospital: 2500,
    density_units_per_dunam: 15,
    committees: { national: { status: 'approved', date: '2023-06' }, district: { status: 'approved', date: '2024-01' }, local: { status: 'in_preparation', date: null } },
    standard22: { appraiser: 'רו"ח משה לוי', date: '2024-03', value: 380000, methodology: 'גישת ההשוואה + גישת היוון ההכנסות' },
    is_published: true,
  },
  {
    block_number: '7842',
    number: '54',
    city: 'נתניה',
    size_sqm: 1500,
    status: 'RESERVED',
    total_price: 520000,
    tax_authority_value: 480000,
    projected_value: 1800000,
    zoning_stage: 'MASTER_PLAN_APPROVED',
    ripeness: '3-5',
    coordinates: [[32.3330, 34.8570],[32.3330, 34.8595],[32.3315, 34.8595],[32.3315, 34.8570]],
    documents: ['תוכנית נת/620', 'נסח טאבו', 'חוות דעת שמאי', 'סקר סביבתי'],
    description: 'חלקה 54 באזור הצפוני של נתניה, קרוב לשכונת פולג. תוכנית מתאר מאושרת עם ייעוד למגורים צפופים. מיקום אסטרטגי עם נגישות לצירי תנועה ראשיים.',
    area_context: 'צפון נתניה ליד שכונת פולג המתפתחת. אזור עם ביקוש גבוה למגורים.',
    readiness_estimate: '3-5 שנים',
    nearby_development: 'שכונת פולג באכלוס מתקדם, מתחם עסקים 600 מ\' מערבה.',
    distance_to_sea: 800,
    distance_to_park: 450,
    distance_to_hospital: 3200,
    density_units_per_dunam: 18,
    committees: { national: { status: 'approved', date: '2023-03' }, district: { status: 'approved', date: '2023-11' }, local: { status: 'pending', date: null } },
    standard22: { appraiser: 'שמאי יעקב כהן', date: '2024-05', value: 510000, methodology: 'גישת ההשוואה' },
    is_published: true,
  },
  {
    block_number: '10234',
    number: '23',
    city: 'קיסריה',
    size_sqm: 3200,
    status: 'AVAILABLE',
    total_price: 280000,
    tax_authority_value: 220000,
    projected_value: 950000,
    zoning_stage: 'AGRICULTURAL',
    ripeness: '5+',
    coordinates: [[32.5000, 34.8870],[32.5000, 34.8905],[32.4980, 34.8905],[32.4980, 34.8870]],
    documents: ['נסח טאבו', 'חוות דעת שמאי'],
    description: 'קרקע חקלאית בשטח גדול בקיסריה עם פוטנציאל ארוך טווח. האזור מיועד לפיתוח עתידי בהתאם לתוכנית מתאר ארצית. מיקום יוקרתי בסמיכות לקיסריה.',
    area_context: 'אזור חקלאי יוקרתי בסמיכות לאזור התעשייה והמגורים של קיסריה.',
    readiness_estimate: '5+ שנים',
    nearby_development: 'פארק הייטק קיסריה 2 ק"מ דרומה, אזור מגורים חדש 1.5 ק"מ מזרחה.',
    distance_to_sea: 1200,
    distance_to_park: 600,
    distance_to_hospital: 5000,
    density_units_per_dunam: 8,
    committees: { national: { status: 'in_discussion', date: null }, district: { status: 'not_started', date: null }, local: { status: 'not_started', date: null } },
    standard22: { appraiser: 'שמאי דוד אברהם', date: '2024-01', value: 250000, methodology: 'גישת ההשוואה + שיטת החילוץ' },
    is_published: true,
  },
  // ─── Additional plots from Israeli national/district plans ───
  {
    block_number: '6710',
    number: '42',
    city: 'חדרה',
    size_sqm: 1800,
    status: 'AVAILABLE',
    total_price: 360000,
    tax_authority_value: 320000,
    projected_value: 1050000,
    zoning_stage: 'MASTER_PLAN_DEPOSIT',
    ripeness: '3-5',
    coordinates: [[32.4540, 34.8700],[32.4540, 34.8720],[32.4528, 34.8720],[32.4528, 34.8700]],
    documents: ['תוכנית חד/2020', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה בלב רובע הים חדרה, קו שני לחוף. תוכנית מתאר בשלבי הפקדה מתקדמים. צפיפות בינונית-גבוהה עם נגישות מצוינת לטיילת החוף העתידית.',
    area_context: 'רובע הים חדרה — קו שני. טיילת חוף 1.5 ק"מ בתכנון, שדרת מלונאות יוקרתית.',
    readiness_estimate: '4-6 שנים',
    nearby_development: 'בנייה פעילה של תשתיות רובע הים 400 מ\' מערבה.',
    distance_to_sea: 700,
    distance_to_park: 200,
    distance_to_hospital: 2800,
    density_units_per_dunam: 12,
    committees: { national: { status: 'approved', date: '2023-06' }, district: { status: 'pending', date: null }, local: { status: 'not_started', date: null } },
    standard22: { appraiser: 'שמאי אלון ברק', date: '2024-06', value: 340000, methodology: 'גישת ההשוואה + היוון' },
    is_published: true,
  },
  {
    block_number: '6711',
    number: '15',
    city: 'חדרה',
    size_sqm: 950,
    status: 'IN_PLANNING',
    total_price: 220000,
    tax_authority_value: 200000,
    projected_value: 680000,
    zoning_stage: 'DETAILED_PLAN_DEPOSIT',
    ripeness: '1-3',
    coordinates: [[32.4480, 34.8745],[32.4480, 34.8758],[32.4472, 34.8758],[32.4472, 34.8745]],
    documents: ['תוכנית 302-0340539', 'נסח טאבו', 'חוות דעת שמאי', 'תוכנית בינוי'],
    description: 'חלקה קטנה בשלב מתקדם של תכנון ברובע הים. תוכנית מפורטת בהפקדה. אחת מהחלקות הקרובות ביותר למימוש. מתאימה למשקיע המחפש אופק קצר.',
    area_context: 'דרום רובע הים חדרה. שלב מתקדם — תוכנית מפורטת בהפקדה.',
    readiness_estimate: '2-3 שנים',
    nearby_development: 'פרויקט מגורים באכלוס 500 מ\' דרומה.',
    distance_to_sea: 550,
    distance_to_park: 400,
    distance_to_hospital: 2200,
    density_units_per_dunam: 20,
    committees: { national: { status: 'approved', date: '2022-09' }, district: { status: 'approved', date: '2023-08' }, local: { status: 'in_preparation', date: null } },
    standard22: { appraiser: 'שמאי רונן דגן', date: '2024-08', value: 210000, methodology: 'גישת ההשוואה' },
    is_published: true,
  },
  {
    block_number: '3955',
    number: '87',
    city: 'נתניה',
    size_sqm: 2800,
    status: 'AVAILABLE',
    total_price: 680000,
    tax_authority_value: 620000,
    projected_value: 2400000,
    zoning_stage: 'MASTER_PLAN_APPROVED',
    ripeness: '3-5',
    coordinates: [[32.3270, 34.8530],[32.3270, 34.8560],[32.3255, 34.8560],[32.3255, 34.8530]],
    documents: ['תוכנית נת/650', 'נסח טאבו', 'חוות דעת שמאי', 'סקר תנועה'],
    description: 'חלקה גדולה בדרום נתניה ליד מתחם עיר ימים. תוכנית מתאר מאושרת למגורים יוקרתיים. חזית ים עם צפיפות של 22 יח"ד לדונם. פוטנציאל תשואה גבוה מאוד.',
    area_context: 'דרום נתניה — אזור עיר ימים. מיקום פריים בקו ראשון לים. שדרת מלונאות ותיירות.',
    readiness_estimate: '3-5 שנים',
    nearby_development: 'פרויקט עיר ימים נתניה בבנייה פעילה 300 מ\' צפונה.',
    distance_to_sea: 300,
    distance_to_park: 500,
    distance_to_hospital: 4000,
    density_units_per_dunam: 22,
    committees: { national: { status: 'approved', date: '2022-11' }, district: { status: 'approved', date: '2023-06' }, local: { status: 'pending', date: null } },
    standard22: { appraiser: 'שמאי מירב לבנון', date: '2024-04', value: 650000, methodology: 'גישת ההשוואה + היוון הכנסות' },
    is_published: true,
  },
  {
    block_number: '11520',
    number: '33',
    city: 'חיפה',
    size_sqm: 4500,
    status: 'AVAILABLE',
    total_price: 350000,
    tax_authority_value: 280000,
    projected_value: 1600000,
    zoning_stage: 'MASTER_PLAN_DEPOSIT',
    ripeness: '5+',
    coordinates: [[32.7850, 34.9600],[32.7850, 34.9640],[32.7830, 34.9640],[32.7830, 34.9600]],
    documents: ['תוכנית חפ/2040', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה גדולה במפרץ חיפה במסגרת תוכנית הרחבת מפרץ חיפה. תוכנית מתאר ארצית בהפקדה. שטח גדול עם פוטנציאל עצום לפיתוח מגורים ומסחר.',
    area_context: 'מפרץ חיפה — תוכנית לאומית להתחדשות. האזור מיועד להפוך ממתחם תעשייתי לשכונת מגורים מודרנית.',
    readiness_estimate: '5-8 שנים',
    nearby_development: 'פרויקט חוף הכרמל בתכנון, רכבת קלה בבנייה.',
    distance_to_sea: 1500,
    distance_to_park: 800,
    distance_to_hospital: 3500,
    density_units_per_dunam: 10,
    committees: { national: { status: 'in_discussion', date: null }, district: { status: 'not_started', date: null }, local: { status: 'not_started', date: null } },
    standard22: { appraiser: 'שמאי נועם שפירא', date: '2024-02', value: 300000, methodology: 'גישת החילוץ + השוואה' },
    is_published: true,
  },
  {
    block_number: '3871',
    number: '12',
    city: 'הרצליה',
    size_sqm: 1200,
    status: 'RESERVED',
    total_price: 950000,
    tax_authority_value: 900000,
    projected_value: 3200000,
    zoning_stage: 'DETAILED_PLAN_APPROVED',
    ripeness: '1-3',
    coordinates: [[32.1640, 34.7780],[32.1640, 34.7800],[32.1630, 34.7800],[32.1630, 34.7780]],
    documents: ['תוכנית הרצ/1200', 'נסח טאבו', 'חוות דעת שמאי', 'היתר עקרוני'],
    description: 'חלקה פרימיום בהרצליה פיתוח. תוכנית מפורטת מאושרת. קרוב למימוש — בשלב מכרז יזמים. צפיפות גבוהה באזור הביקוש הגבוה ביותר במרכז.',
    area_context: 'הרצליה פיתוח — האזור היקר ביותר בישראל. שכונת מגורים יוקרתית בהתהוות.',
    readiness_estimate: '1-2 שנים',
    nearby_development: 'מגדלי משרדים חדשים 200 מ\', אזור הייטק פעיל.',
    distance_to_sea: 400,
    distance_to_park: 350,
    distance_to_hospital: 5000,
    density_units_per_dunam: 25,
    committees: { national: { status: 'approved', date: '2021-06' }, district: { status: 'approved', date: '2022-03' }, local: { status: 'approved', date: '2023-09' } },
    standard22: { appraiser: 'שמאי גלעד עמיחי', date: '2024-07', value: 920000, methodology: 'גישת ההשוואה + היוון' },
    is_published: true,
  },
  {
    block_number: '7100',
    number: '201',
    city: 'אשדוד',
    size_sqm: 3500,
    status: 'AVAILABLE',
    total_price: 420000,
    tax_authority_value: 380000,
    projected_value: 1400000,
    zoning_stage: 'MASTER_PLAN_APPROVED',
    ripeness: '3-5',
    coordinates: [[31.8050, 34.6430],[31.8050, 34.6465],[31.8035, 34.6465],[31.8035, 34.6430]],
    documents: ['תוכנית אד/3000', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה באשדוד הצפונית במסגרת תוכנית הרחבת העיר צפונה. תוכנית מתאר מאושרת. אזור מתפתח עם ביקוש גובר ומחירי כניסה אטרקטיביים.',
    area_context: 'צפון אשדוד — אזור התרחבות עירונית. קרבה לחוף ולנמל אשדוד החדש.',
    readiness_estimate: '3-5 שנים',
    nearby_development: 'שכונה חדשה "רובע הים" באשדוד בבנייה, נמל חדש בהקמה.',
    distance_to_sea: 600,
    distance_to_park: 400,
    distance_to_hospital: 3000,
    density_units_per_dunam: 14,
    committees: { national: { status: 'approved', date: '2023-01' }, district: { status: 'approved', date: '2023-10' }, local: { status: 'in_preparation', date: null } },
    standard22: { appraiser: 'שמאי יוסי מזרחי', date: '2024-05', value: 400000, methodology: 'גישת ההשוואה' },
    is_published: true,
  },
  {
    block_number: '6095',
    number: '78',
    city: 'ראשון לציון',
    size_sqm: 2200,
    status: 'IN_PLANNING',
    total_price: 750000,
    tax_authority_value: 700000,
    projected_value: 2800000,
    zoning_stage: 'DETAILED_PLAN_PREP',
    ripeness: '3-5',
    coordinates: [[31.9700, 34.7730],[31.9700, 34.7755],[31.9688, 34.7755],[31.9688, 34.7730]],
    documents: ['תוכנית רצ/2025', 'נסח טאבו', 'חוות דעת שמאי', 'תוכנית בינוי ראשונית'],
    description: 'חלקה במערב ראשון לציון באזור החוף. תוכנית מפורטת בהכנה. מיקום מצוין עם חזית ים ונגישות לכבישי הגישה לתל אביב.',
    area_context: 'מערב ראשון לציון — אזור חוף מתפתח. קרבה לתל אביב ולנתיבי איילון.',
    readiness_estimate: '4-6 שנים',
    nearby_development: 'מתחם מגורים חדש "ראשון לים" בבנייה, קניון חדש בתכנון.',
    distance_to_sea: 350,
    distance_to_park: 500,
    distance_to_hospital: 4500,
    density_units_per_dunam: 20,
    committees: { national: { status: 'approved', date: '2023-04' }, district: { status: 'approved', date: '2024-01' }, local: { status: 'in_preparation', date: null } },
    standard22: { appraiser: 'שמאי תמר רוזנברג', date: '2024-06', value: 720000, methodology: 'גישת ההשוואה + היוון' },
    is_published: true,
  },
  {
    block_number: '4120',
    number: '5',
    city: 'בת ים',
    size_sqm: 1600,
    status: 'AVAILABLE',
    total_price: 580000,
    tax_authority_value: 550000,
    projected_value: 2100000,
    zoning_stage: 'MASTER_PLAN_APPROVED',
    ripeness: '3-5',
    coordinates: [[32.0180, 34.7410],[32.0180, 34.7430],[32.0170, 34.7430],[32.0170, 34.7410]],
    documents: ['תוכנית בי/5000', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה בבת ים בקו ראשון לחוף. תוכנית מתאר מאושרת במסגרת התחדשות רצועת החוף. פוטנציאל רווח גבוה לאור הקרבה לתל אביב.',
    area_context: 'רצועת החוף של בת ים — התחדשות עירונית מואצת. דקות מתל אביב.',
    readiness_estimate: '3-5 שנים',
    nearby_development: 'פרויקטי התחדשות עירונית בבנייה לאורך כל רצועת החוף.',
    distance_to_sea: 150,
    distance_to_park: 600,
    distance_to_hospital: 3500,
    density_units_per_dunam: 24,
    committees: { national: { status: 'approved', date: '2022-08' }, district: { status: 'approved', date: '2023-05' }, local: { status: 'pending', date: null } },
    standard22: { appraiser: 'שמאי עדי פרידמן', date: '2024-03', value: 560000, methodology: 'גישת ההשוואה' },
    is_published: true,
  },
  {
    block_number: '8340',
    number: '156',
    city: 'אשקלון',
    size_sqm: 2600,
    status: 'AVAILABLE',
    total_price: 195000,
    tax_authority_value: 170000,
    projected_value: 720000,
    zoning_stage: 'AGRICULTURAL',
    ripeness: '5+',
    coordinates: [[31.6750, 34.5600],[31.6750, 34.5630],[31.6735, 34.5630],[31.6735, 34.5600]],
    documents: ['נסח טאבו', 'חוות דעת שמאי'],
    description: 'קרקע חקלאית באשקלון הצפונית. מחיר כניסה נמוך מאוד. האזור כלול בתוכנית מתאר ארצית לפיתוח הנגב המערבי. השקעה לטווח ארוך עם תשואה צפויה של 269%.',
    area_context: 'צפון אשקלון — אזור פיתוח עתידי. קרבה לחוף הים ולפארק הלאומי.',
    readiness_estimate: '7+ שנים',
    nearby_development: 'שכונה חדשה "מרינה אשקלון" בתכנון 3 ק"מ דרומה.',
    distance_to_sea: 900,
    distance_to_park: 700,
    distance_to_hospital: 4000,
    density_units_per_dunam: 8,
    committees: { national: { status: 'in_discussion', date: null }, district: { status: 'not_started', date: null }, local: { status: 'not_started', date: null } },
    standard22: { appraiser: 'שמאי שלמה אדרי', date: '2024-01', value: 180000, methodology: 'גישת החילוץ' },
    is_published: true,
  },
]

async function setup() {
  console.log('Creating plots table...')

  // Create table via SQL (using Supabase's rpc or direct SQL)
  const { error: sqlError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS plots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        block_number TEXT NOT NULL,
        number TEXT NOT NULL,
        city TEXT NOT NULL,
        size_sqm INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        total_price NUMERIC NOT NULL,
        tax_authority_value NUMERIC,
        projected_value NUMERIC,
        zoning_stage TEXT,
        ripeness TEXT,
        coordinates JSONB,
        documents JSONB DEFAULT '[]',
        description TEXT,
        area_context TEXT,
        readiness_estimate TEXT,
        nearby_development TEXT,
        distance_to_sea INTEGER,
        distance_to_park INTEGER,
        distance_to_hospital INTEGER,
        density_units_per_dunam INTEGER,
        committees JSONB DEFAULT '{}',
        standard22 JSONB DEFAULT '{}',
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  // If rpc doesn't exist, try direct insert (table may already exist or be created via Supabase UI)
  if (sqlError) {
    console.log('Note: Could not create table via RPC (normal if table exists). Trying direct insert...')
  }

  // Insert plots
  console.log(`Inserting ${plots.length} plots...`)
  const { data, error } = await supabase
    .from('plots')
    .upsert(plots, { onConflict: 'block_number,number' })
    .select('id, block_number, number, city')

  if (error) {
    console.error('Insert error:', error.message)
    console.log('\nYou need to create the "plots" table first.')
    console.log('Go to Supabase Dashboard → SQL Editor and run:')
    console.log(`
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_number TEXT NOT NULL,
  number TEXT NOT NULL,
  city TEXT NOT NULL,
  size_sqm INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  total_price NUMERIC NOT NULL,
  tax_authority_value NUMERIC,
  projected_value NUMERIC,
  zoning_stage TEXT,
  ripeness TEXT,
  coordinates JSONB,
  documents JSONB DEFAULT '[]',
  description TEXT,
  area_context TEXT,
  readiness_estimate TEXT,
  nearby_development TEXT,
  distance_to_sea INTEGER,
  distance_to_park INTEGER,
  distance_to_hospital INTEGER,
  density_units_per_dunam INTEGER,
  committees JSONB DEFAULT '{}',
  standard22 JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(block_number, number)
);

-- Also create supporting tables
CREATE TABLE IF NOT EXISTS plot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plot_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT UNIQUE NOT NULL,
  plot_id UUID REFERENCES plots(id),
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for now (enable later with proper policies)
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_images ENABLE ROW LEVEL SECURITY;

-- Allow public read on published plots
CREATE POLICY "Public can read published plots" ON plots FOR SELECT USING (is_published = true);
CREATE POLICY "Service role full access plots" ON plots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can insert leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access chat" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access docs" ON plot_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access images" ON plot_images FOR ALL USING (true) WITH CHECK (true);
    `)
  } else {
    console.log(`✅ Successfully inserted ${data?.length || plots.length} plots:`)
    data?.forEach(p => console.log(`  - גוש ${p.block_number} חלקה ${p.number} (${p.city}) → ${p.id}`))
  }
}

setup()

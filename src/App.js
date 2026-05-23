import { useState, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const KCAL_PER_GRAM_FAT = 9;
const KCAL_PER_GRAM_GLUCOSE = 4;

// Activity MET values
const ACTIVITIES = [
  { id: "walk_slow",   label: "🚶 مشي خفيف",       met: 2.5 },
  { id: "walk_normal", label: "🚶 مشي عادي",        met: 3.5 },
  { id: "jog_light",  label: "🏃 هرولة خفيفة",     met: 6.0 },
  { id: "jog_medium", label: "🏃 هرولة متوسطة",    met: 8.0 },
  { id: "swim",       label: "🏊 سباحة",            met: 6.0 },
  { id: "bike",       label: "🚴 دراجة هوائية",    met: 7.5 },
  { id: "stairs",     label: "🪜 صعود الدرج",       met: 4.0 },
];

function calcActivityBurn(minutes, weight, met) {
  return (met * weight * (minutes / 60)) / KCAL_PER_GRAM_GLUCOSE;
}
function calcBMR(weight, height, age, gender) {
  if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}
function calcDailyGlucose(bmr) {
  return Math.round((bmr * 1.2 * 0.55) / KCAL_PER_GRAM_GLUCOSE);
}
// Protein need: 0.8g/kg sedentary, 1.2g/kg light activity (we use 1.0 as default)
function calcDailyProtein(weight) {
  return Math.round(weight * 1.0);
}
function todayKey() { return new Date().toISOString().slice(0, 10); }
function formatDateShort(key) {
  const d = new Date(key + "T12:00:00");
  return (d.getMonth() + 1) + "/" + d.getDate();
}
function formatDateFull(key) {
  const d = new Date(key + "T12:00:00");
  const days = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  return days[d.getDay()] + " " + d.toLocaleDateString("ar-SA");
}

const FOOD_PRESETS = [
  // نشويات
  { name: "أرز مطبوخ", carbPer100: 28, category: "نشويات" },
  { name: "أرز نيء", carbPer100: 80, category: "نشويات" },
  { name: "خبز أبيض", carbPer100: 49, category: "نشويات" },
  { name: "خبز أسمر", carbPer100: 43, category: "نشويات" },
  { name: "توست أسمر", carbPer100: 40, category: "نشويات" },
  { name: "خبز تميس", carbPer100: 55, category: "نشويات" },
  { name: "بطاطا مسلوقة", carbPer100: 17, category: "نشويات" },
  { name: "بطاطا مقلية", carbPer100: 35, category: "نشويات" },
  { name: "معكرونة مسلوقة", carbPer100: 25, category: "نشويات" },
  { name: "شوفان مطبوخ", carbPer100: 12, category: "نشويات" },
  { name: "شوفان نيء", carbPer100: 66, category: "نشويات" },
  // محليات
  { name: "عسل", carbPer100: 82, category: "محليات" },
  { name: "تمر", carbPer100: 75, category: "محليات" },
  { name: "سكر", carbPer100: 100, category: "محليات" },
  { name: "مربى", carbPer100: 65, category: "محليات" },
  { name: "نوتيلا", carbPer100: 57, category: "محليات" },
  // فواكه
  { name: "موز", carbPer100: 23, category: "فواكه" },
  { name: "تفاح", carbPer100: 14, category: "فواكه" },
  { name: "برتقال", carbPer100: 12, category: "فواكه" },
  { name: "عنب", carbPer100: 17, category: "فواكه" },
  { name: "مانجو", carbPer100: 15, category: "فواكه" },
  { name: "بطيخ", carbPer100: 8, category: "فواكه" },
  { name: "شمام", carbPer100: 9, category: "فواكه" },
  { name: "فراولة", carbPer100: 8, category: "فواكه" },
  { name: "خوخ", carbPer100: 10, category: "فواكه" },
  { name: "كمثرى", carbPer100: 15, category: "فواكه" },
  { name: "أناناس", carbPer100: 13, category: "فواكه" },
  { name: "رمان", carbPer100: 19, category: "فواكه" },
  { name: "كيوي", carbPer100: 15, category: "فواكه" },
  { name: "تين طازج", carbPer100: 19, category: "فواكه" },
  { name: "مشمش", carbPer100: 11, category: "فواكه" },
  { name: "برقوق", carbPer100: 11, category: "فواكه" },
  { name: "جوافة", carbPer100: 14, category: "فواكه" },
  { name: "بابايا", carbPer100: 11, category: "فواكه" },
  { name: "توت", carbPer100: 10, category: "فواكه" },
  { name: "ليمون", carbPer100: 9, category: "فواكه" },
  // لحوم وبروتين
  { name: "دجاج مشوي", carbPer100: 0, proteinPer100: 31, category: "لحوم وبروتين" },
  { name: "دجاج مقلي (بالطحين)", carbPer100: 8, proteinPer100: 25, category: "لحوم وبروتين" },
  { name: "لحم بقري مشوي", carbPer100: 0, proteinPer100: 26, category: "لحوم وبروتين" },
  { name: "لحم غنم مشوي", carbPer100: 0, proteinPer100: 25, category: "لحوم وبروتين" },
  { name: "سمك مشوي", carbPer100: 0, proteinPer100: 22, category: "لحوم وبروتين" },
  { name: "سمك مقلي", carbPer100: 6, proteinPer100: 18, category: "لحوم وبروتين" },
  { name: "تونة معلبة", carbPer100: 0, proteinPer100: 26, category: "لحوم وبروتين" },
  { name: "بيض مسلوق", carbPer100: 1, proteinPer100: 13, category: "لحوم وبروتين" },
  { name: "بيض مقلي", carbPer100: 1, proteinPer100: 11, category: "لحوم وبروتين" },
  { name: "فول مدمس", carbPer100: 14, proteinPer100: 6, category: "لحوم وبروتين" },
  { name: "عدس مطبوخ", carbPer100: 20, proteinPer100: 9, category: "لحوم وبروتين" },
  { name: "حمص مطبوخ", carbPer100: 18, proteinPer100: 9, category: "لحوم وبروتين" },
  // ألبان ومنتجاتها
  { name: "حليب كامل الدسم", carbPer100: 5, category: "ألبان" },
  { name: "حليب قليل الدسم", carbPer100: 5, category: "ألبان" },
  { name: "لبن (زبادي)", carbPer100: 4, category: "ألبان" },
  { name: "لبن حليب (لاسي)", carbPer100: 5, category: "ألبان" },
  { name: "جبن أبيض", carbPer100: 1, category: "ألبان" },
  { name: "جبن شيدر", carbPer100: 1, category: "ألبان" },
  { name: "قشطة", carbPer100: 3, category: "ألبان" },
  { name: "آيس كريم", carbPer100: 23, category: "ألبان" },
  // مكسرات وبذور
  { name: "لوز", carbPer100: 9, category: "مكسرات" },
  { name: "جوز", carbPer100: 14, category: "مكسرات" },
  { name: "فول سوداني", carbPer100: 16, category: "مكسرات" },
  { name: "كاجو", carbPer100: 30, category: "مكسرات" },
  { name: "بستاشيو", carbPer100: 28, category: "مكسرات" },
  { name: "بذور الشيا", carbPer100: 42, category: "مكسرات" },
  { name: "بذور السمسم", carbPer100: 23, category: "مكسرات" },
  // مشروبات
  { name: "عصير برتقال طازج", carbPer100: 10, category: "مشروبات" },
  { name: "عصير تفاح معلب", carbPer100: 11, category: "مشروبات" },
  { name: "كولا (كوكا/بيبسي)", carbPer100: 11, category: "مشروبات" },
  { name: "مشروب طاقة (ريد بول)", carbPer100: 11, defaultWeight: 250, category: "مشروبات" },
  { name: "قهوة سادة", carbPer100: 0, category: "مشروبات" },
  { name: "شاي بدون سكر", carbPer100: 0, category: "مشروبات" },
  { name: "شاي بحليب وسكر", carbPer100: 8, defaultWeight: 200, category: "مشروبات" },
  { name: "نسكافيه بحليب", carbPer100: 6, defaultWeight: 200, category: "مشروبات" },
  { name: "لبن (علبة)", carbPer100: 5, defaultWeight: 200, category: "مشروبات" },
  // شوكولاتة وحلويات
  { name: "كيت كات 4 أصابع", carbPer100: 70, defaultWeight: 41.5, category: "شوكولاتة" },
  { name: "كيت كات 2 إصبع", carbPer100: 70, defaultWeight: 20.7, category: "شوكولاتة" },
  { name: "سنيكرز", carbPer100: 58, defaultWeight: 51, category: "شوكولاتة" },
  { name: "مارس", carbPer100: 67, defaultWeight: 51, category: "شوكولاتة" },
  { name: "تويكس", carbPer100: 67, defaultWeight: 50, category: "شوكولاتة" },
  { name: "باونتي", carbPer100: 60, defaultWeight: 57, category: "شوكولاتة" },
  { name: "ميلكي واي", carbPer100: 69, defaultWeight: 52, category: "شوكولاتة" },
  { name: "كرانش", carbPer100: 65, defaultWeight: 40, category: "شوكولاتة" },
  { name: "توبليرون", carbPer100: 62, defaultWeight: 50, category: "شوكولاتة" },
  { name: "كيندر بويينو", carbPer100: 57, defaultWeight: 43, category: "شوكولاتة" },
  { name: "كيندر برستيج", carbPer100: 55, defaultWeight: 65, category: "شوكولاتة" },
  { name: "فريور رووشيه (حبة)", carbPer100: 47, defaultWeight: 12.5, category: "شوكولاتة" },
  { name: "نسكويك (مسحوق)", carbPer100: 78, category: "شوكولاتة" },
  { name: "ميلو (مسحوق)", carbPer100: 74, category: "شوكولاتة" },
  { name: "كاكاو نيسلية", carbPer100: 15, category: "شوكولاتة" },
  // كي دي دي KDD — أوزان 180 مل و 250 مل حسب العبوات المتوفرة
  { name: "KDD عصير تفاح 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير تفاح 250مل", carbPer100: 12, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير برتقال 180مل", carbPer100: 11, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير برتقال 250مل", carbPer100: 11, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير مانجو 180مل", carbPer100: 13, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير مانجو 250مل", carbPer100: 13, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير جوافة 180مل", carbPer100: 13, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير جوافة 250مل", carbPer100: 13, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير كوكتيل 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير كوكتيل 250مل", carbPer100: 12, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير أناناس 180مل", carbPer100: 14, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير أناناس 250مل", carbPer100: 14, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير عنب أحمر 180مل", carbPer100: 18, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير عنب أحمر 250مل", carbPer100: 18, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير كرز 180مل", carbPer100: 13, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير دراق 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير دراق 250مل", carbPer100: 12, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير جريب فروت 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD حليب شوكولاتة 180مل", carbPer100: 10, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD حليب شوكولاتة 250مل", carbPer100: 10, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD حليب فراولة 180مل", carbPer100: 10, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD حليب موز 180مل", carbPer100: 11, defaultWeight: 180, category: "كي دي دي" },
  // KDD — ألبان ومنتجات أخرى
  { name: "KDD حليب كامل 1لتر", carbPer100: 5, defaultWeight: 200, category: "كي دي دي" },
  { name: "KDD حليب خالي دسم 1لتر", carbPer100: 5, defaultWeight: 200, category: "كي دي دي" },
  { name: "KDD لبن زبادي", carbPer100: 4, defaultWeight: 170, category: "كي دي دي" },
  { name: "KDD قشطة", carbPer100: 3, defaultWeight: 100, category: "كي دي دي" },
  { name: "KDD لبن للشرب", carbPer100: 5, defaultWeight: 200, category: "كي دي دي" },
  { name: "KDD زبدة", carbPer100: 0, defaultWeight: 100, category: "كي دي دي" },
  // المراعي
  { name: "المراعي حليب كامل", carbPer100: 5, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي حليب خالي دسم", carbPer100: 5, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي لبن", carbPer100: 4, defaultWeight: 170, category: "المراعي" },
  { name: "المراعي لبن للشرب", carbPer100: 5, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي قشطة", carbPer100: 3, defaultWeight: 100, category: "المراعي" },
  { name: "المراعي جبن أبيض", carbPer100: 1, defaultWeight: 100, category: "المراعي" },
  { name: "المراعي جبن شيدر شرائح", carbPer100: 2, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي زبادي بالفواكه", carbPer100: 14, defaultWeight: 120, category: "المراعي" },
  { name: "المراعي عصير برتقال", carbPer100: 10, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير مانجو", carbPer100: 13, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير تفاح", carbPer100: 11, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير جوافة", carbPer100: 12, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير كوكتيل", carbPer100: 12, defaultWeight: 200, category: "المراعي" },
  // الصافي
  { name: "الصافي ماء", carbPer100: 0, defaultWeight: 500, category: "الصافي" },
  { name: "الصافي عصير برتقال", carbPer100: 10, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير تفاح", carbPer100: 11, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير مانجو", carbPer100: 13, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير جوافة", carbPer100: 12, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير كوكتيل", carbPer100: 12, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير ليمون نعناع", carbPer100: 10, defaultWeight: 250, category: "الصافي" },
  // كتكو
  { name: "كتكو نايس خل وملح", carbPer100: 54, proteinPer100: 8.8, defaultWeight: 25, category: "كتكو" },
  // وجبات سعودية
  { name: "كبسة دجاج (مع أرز)", carbPer100: 22, category: "وجبات سعودية" },
  { name: "كبسة لحم (مع أرز)", carbPer100: 22, category: "وجبات سعودية" },
  { name: "مندي دجاج (مع أرز)", carbPer100: 20, category: "وجبات سعودية" },
  { name: "مندي لحم (مع أرز)", carbPer100: 20, category: "وجبات سعودية" },
  { name: "مجبوس", carbPer100: 21, category: "وجبات سعودية" },
  { name: "هريس", carbPer100: 18, category: "وجبات سعودية" },
  { name: "جريش", carbPer100: 24, category: "وجبات سعودية" },
  { name: "مرقوق", carbPer100: 15, category: "وجبات سعودية" },
  { name: "سليق", carbPer100: 17, category: "وجبات سعودية" },
  { name: "مطبق (محلى)", carbPer100: 38, category: "وجبات سعودية" },
  { name: "مطبق (لحم)", carbPer100: 25, category: "وجبات سعودية" },
  { name: "شاورما دجاج", carbPer100: 16, category: "وجبات سعودية" },
  { name: "فلافل", carbPer100: 17, category: "وجبات سعودية" },
  { name: "حنيذ", carbPer100: 19, category: "وجبات سعودية" },
  { name: "عسيدة", carbPer100: 28, category: "وجبات سعودية" },
];

async function loadStorage(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}
async function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function MealRow({ meal, onRemove, onSave, isFav, darkMode }) {
  return (
    <div className="meal-row">
      <span className="meal-name">{meal.name}</span>
      <span className="meal-weight">{meal.weight}غ</span>
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        <span className="meal-carb">🔥 {meal.carbs.toFixed(1)}غ</span>
        {meal.protein > 0 && <span style={{color:"#60a5fa",fontSize:10,fontWeight:600}}>💪 {meal.protein.toFixed(1)}غ</span>}
      </div>
      {onSave && <button onClick={onSave} style={{background:isFav?"rgba(234,179,8,0.25)":"rgba(255,255,255,0.06)",border:"none",borderRadius:6,color:isFav?"#fde047":"#64748b",cursor:"pointer",fontSize:13,padding:"2px 6px"}}>★</button>}
      {onRemove && <button className="remove-btn" onClick={onRemove}>✕</button>}
    </div>
  );
}
function WalkRow({ session, onRemove }) {
  return (
    <div className="meal-row">
      <span className="meal-name">🚶 {session.label}</span>
      <span className="meal-weight">{session.minutes} دقيقة</span>
      <span className="meal-carb" style={{color:"#fb923c"}}>↳ {session.burned.toFixed(1)}غ</span>
      {onRemove && <button className="remove-btn" onClick={onRemove}>✕</button>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, targetWeight }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const diff = targetWeight ? (val - targetWeight).toFixed(1) : null;
    return (
      <div style={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 12px",fontSize:12,direction:"rtl"}}>
        <div style={{color:"#94a3b8",marginBottom:3}}>{label}</div>
        <div style={{color:"#4ade80",fontWeight:800,fontSize:15}}>{val} كجم</div>
        {diff !== null && <div style={{color: parseFloat(diff) > 0 ? "#f87171" : "#4ade80",fontSize:11}}>{parseFloat(diff) > 0 ? "+" : ""}{diff} من الهدف</div>}
      </div>
    );
  }
  return null;
};

const DEFAULT_PROFILE = { height: "", age: "", gender: "male", targetWeight: "" };

export default function GlucoseTracker() {
  const [tab, setTab] = useState("today");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(DEFAULT_PROFILE);

  // Weight tracking
  const [weightLog, setWeightLog] = useState([]); // [{date, weight}]
  const [weightInput, setWeightInput] = useState("");
  const [currentWeight, setCurrentWeight] = useState(null);

  const [meals, setMeals] = useState([]);
  const [walkSessions, setWalkSessions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [foodName, setFoodName] = useState("");
  const [foodWeight, setFoodWeight] = useState("");
  const [carbPer100, setCarbPer100] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [walkInput, setWalkInput] = useState("");
  const [walkLabel, setWalkLabel] = useState("");
  const [walkActivityId, setWalkActivityId] = useState("walk_normal");
  const [darkMode, setDarkMode] = useState(true);
  const [dailyNote, setDailyNote] = useState("");
  const reportRef = useRef(null);
  const [proteinInput, setProteinInput] = useState("");



  // Derived from current weight + profile
  const w = currentWeight || 0;
  const h = parseFloat(profile.height) || 0;
  const a = parseFloat(profile.age) || 0;
  const targetW = parseFloat(profile.targetWeight) || 0;
  const hasProfile = w > 0 && h > 0 && a > 0;
  const bmr = hasProfile ? calcBMR(w, h, a, profile.gender) : 0;
  const tdee = hasProfile ? Math.round(bmr * 1.2) : 0;
  const bmi = hasProfile ? w / ((h / 100) ** 2) : 0;
  const DAILY_GLUCOSE = hasProfile ? calcDailyGlucose(bmr) : 190;
  const DAILY_PROTEIN = hasProfile ? calcDailyProtein(w) : Math.round(w * 1.0 || 80);
  const bmiLabel = bmi < 18.5 ? "نقص وزن" : bmi < 25 ? "وزن طبيعي" : bmi < 30 ? "زيادة وزن" : "سمنة";
  const bmiColor = bmi < 18.5 ? "#60a5fa" : bmi < 25 ? "#4ade80" : bmi < 30 ? "#fde047" : "#f87171";

  // Weight progress
  const firstWeight = weightLog.length > 0 ? weightLog[0].weight : null;
  const totalLost = firstWeight && currentWeight ? (firstWeight - currentWeight) : 0;
  const toGoal = targetW && currentWeight ? (currentWeight - targetW) : null;

  // Fat counter
  const FAT_GRAMS_PER_KG = 855;
  const totalFatTarget = targetW && firstWeight ? Math.round((firstWeight - targetW) * FAT_GRAMS_PER_KG) : null;
  const fatBurned = totalLost > 0 ? Math.round(totalLost * FAT_GRAMS_PER_KG) : 0;
  const fatRemaining = totalFatTarget ? Math.max(0, totalFatTarget - fatBurned) : null;
  const fatPct = totalFatTarget && fatBurned > 0 ? Math.min(100, (fatBurned / totalFatTarget) * 100) : 0;

  // Chart data (last 30 entries)
  const chartData = weightLog.slice(-30).map(e => ({
    date: formatDateShort(e.date),
    weight: e.weight,
  }));
  const chartMin = chartData.length > 0 ? Math.floor(Math.min(...chartData.map(d => d.weight), targetW || 999) - 2) : 60;
  const chartMax = chartData.length > 0 ? Math.ceil(Math.max(...chartData.map(d => d.weight)) + 2) : 100;

  useEffect(() => {
    (async () => {
      const prof = await loadStorage("profile_v2");
      if (prof) { setProfile(prof); setProfileDraft(prof); setProfileSaved(true); }
      const wlog = await loadStorage("weightLog");
      if (wlog && wlog.length > 0) { setWeightLog(wlog); setCurrentWeight(wlog[wlog.length - 1].weight); }
      const today = await loadStorage("today_" + todayKey());
      if (today) { setMeals(today.meals || []); setWalkSessions(today.walks || []); setDailyNote(today.note || ""); }
      const theme = await loadStorage("darkMode");
      if (theme !== null) setDarkMode(theme);
      const favs = await loadStorage("favorites");
      if (favs) setFavorites(favs);
      const hist = await loadStorage("history");
      if (hist) setHistory(hist);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (!loaded) return; saveStorage("today_" + todayKey(), { meals, walks: walkSessions, note: dailyNote }); }, [meals, walkSessions, dailyNote, loaded]);
  useEffect(() => { if (!loaded) return; saveStorage("favorites", favorites); }, [favorites, loaded]);
  useEffect(() => { if (!loaded) return; saveStorage("weightLog", weightLog); }, [weightLog, loaded]);
  useEffect(() => { if (!loaded) return; saveStorage("darkMode", darkMode); }, [darkMode, loaded]);

  const saveProfile = () => {
    setProfile(profileDraft);
    saveStorage("profile_v2", profileDraft);
    setProfileSaved(true);
    setEditingProfile(false);
  };

  const logWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) return;
    const today = todayKey();
    const newLog = weightLog.filter(e => e.date !== today);
    newLog.push({ date: today, weight: val });
    newLog.sort((a, b) => a.date.localeCompare(b.date));
    setWeightLog(newLog);
    setCurrentWeight(val);
    setWeightInput("");
  };

  const totalIn = meals.reduce((s, m) => s + m.carbs, 0);
  const totalProteinIn = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalWalkBurn = walkSessions.reduce((s, ww) => s + ww.burned, 0);
  const totalWalkMin = walkSessions.reduce((s, ww) => s + ww.minutes, 0);
  const netNeed = DAILY_GLUCOSE - totalIn + totalWalkBurn;
  const fatBurn = netNeed > 0 ? (netNeed * KCAL_PER_GRAM_GLUCOSE) / KCAL_PER_GRAM_FAT : 0;
  const surplus = netNeed < 0 ? Math.abs(netNeed) : 0;
  const pct = Math.min(100, (totalIn / DAILY_GLUCOSE) * 100);
  const near80 = pct >= 80 && pct < 100;
  const over100 = pct >= 100;

  // Weekly reminder state
  const [reminderDay, setReminderDay]   = useState("5");
  const [reminderHour, setReminderHour] = useState("8");
  const [reminderSet, setReminderSet]   = useState(false);
  const showReminder = reminderSet && (() => { const n=new Date(); return String(n.getDay())===reminderDay && n.getHours()===parseInt(reminderHour); })();
  const [showAbout, setShowAbout] = useState(false);

  // Weekly report from last 7 history days
  const getWeeklyReport = () => {
    const keys = Object.keys(history).sort((a,b)=>b.localeCompare(a)).slice(0,7);
    if (keys.length===0) return null;
    const days = keys.map(k=>({...history[k], key:k}));
    const avgGlucose = days.reduce((s,d)=>s+d.totalIn,0)/days.length;
    const totalFat   = days.reduce((s,d)=>s+(d.fatBurn||0),0);
    const totalWalkB = days.reduce((s,d)=>s+(d.totalWalkBurn||0),0);
    const best  = [...days].sort((a,b)=>(b.fatBurn||0)-(a.fatBurn||0))[0];
    const worst = [...days].sort((a,b)=>(a.fatBurn||0)-(b.fatBurn||0))[0];
    const daysOver = days.filter(d=>d.totalIn>DAILY_GLUCOSE).length;
    return { avgGlucose, totalFat, totalWalkB, best, worst, daysOver, count:days.length };
  };
  const weeklyReport = getWeeklyReport();

  // Goal ETA calculator
  const getGoalETA = () => {
    if (!targetW || !currentWeight || weightLog.length<2) return null;
    if (currentWeight<=targetW) return { reached:true };
    const sorted = [...weightLog].sort((a,b)=>a.date.localeCompare(b.date));
    const daysDiff = Math.max(1,(new Date(sorted[sorted.length-1].date)-new Date(sorted[0].date))/86400000);
    const lostKg = sorted[0].weight - sorted[sorted.length-1].weight;
    if (lostKg<=0) return { noProgress:true };
    const kgPerWeek = (lostKg/daysDiff)*7;
    const remaining = currentWeight - targetW;
    const weeksNeeded = remaining/kgPerWeek;
    const eta = new Date(); eta.setDate(eta.getDate()+Math.round(weeksNeeded*7));
    return { kgPerWeek:kgPerWeek.toFixed(2), remaining:remaining.toFixed(1), weeks:Math.round(weeksNeeded), eta:eta.toLocaleDateString("ar-SA") };
  };
  const goalETA = getGoalETA();

  const saveDayToHistory = () => {
    if (meals.length === 0 && walkSessions.length === 0) return;
    const key = todayKey();
    const newHist = { ...history, [key]: { meals, walks: walkSessions, totalIn, totalWalkBurn, netNeed, fatBurn } };
    setHistory(newHist); saveStorage("history", newHist);
  };

  const handlePreset = (e) => {
    const p = FOOD_PRESETS.find(f => f.name === e.target.value);
    if (p) {
      setFoodName(p.name);
      setCarbPer100(String(p.carbPer100));
      if (p.defaultWeight) setFoodWeight(String(p.defaultWeight));
    }
    setSelectedPreset(e.target.value);
  };

  const addMealManual = () => {
    const ww = parseFloat(foodWeight), c = parseFloat(carbPer100);
    if (!foodName || isNaN(ww) || isNaN(c) || ww <= 0 || c < 0) return;
    const preset = FOOD_PRESETS.find(f => f.name === foodName);
    const proteinPer100 = (preset?.proteinPer100 ?? parseFloat(proteinInput)) || 0;
    const protein = (proteinPer100 / 100) * ww;
    setMeals(prev => [...prev, { id: Date.now(), name: foodName, weight: ww, carbs: (c/100)*ww, protein, }]);
    setFoodName(""); setFoodWeight(""); setCarbPer100(""); setSelectedPreset(""); setProteinInput("");
  };

  const saveFavorite = (meal) => {
    const exists = favorites.find(f => f.name === meal.name && f.weight === meal.weight);
    if (exists) setFavorites(prev => prev.filter(f => !(f.name === meal.name && f.weight === meal.weight)));
    else setFavorites(prev => [...prev, { ...meal, id: Date.now() }]);
  };
  const isFav = (meal) => !!favorites.find(f => f.name === meal.name && f.weight === meal.weight);

  const addWalkSession = () => {
    const mins = parseFloat(walkInput);
    if (isNaN(mins) || mins <= 0) return;
    const activity = ACTIVITIES.find(a => a.id === walkActivityId) || ACTIVITIES[1];
    const label = walkLabel.trim() || activity.label;
    setWalkSessions(prev => [...prev, { id: Date.now(), minutes: mins, burned: calcActivityBurn(mins, w || 80, activity.met), label, activityId: walkActivityId }]);
    setWalkInput(""); setWalkLabel("");
  };





  const resetDay = () => { saveDayToHistory(); setMeals([]); setWalkSessions([]); };
  const historyKeys = Object.keys(history).sort((a,b)=>b.localeCompare(a)).slice(0,7);
  const showProfileSetup = !profileSaved || editingProfile;

  return (
    <div dir="rtl" style={{minHeight:"100vh",background:darkMode?"linear-gradient(135deg,#0d1117 0%,#161b27 50%,#0d1117 100%)":"linear-gradient(135deg,#f0f4f8 0%,#e2e8f0 50%,#f0f4f8 100%)",fontFamily:"'Tajawal','Cairo',sans-serif",color:darkMode?"#e2e8f0":"#1e293b",padding:"0 0 32px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .page{padding:13px}
        .card{background:${darkMode?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.8)"};border:1px solid ${darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"};border-radius:18px;padding:15px;margin-bottom:11px;backdrop-filter:blur(10px)}
        .section-title{font-size:11px;font-weight:700;letter-spacing:2px;color:${darkMode?"#64748b":"#94a3b8"};margin-bottom:11px;text-transform:uppercase}
        input,select,textarea{background:${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"};border:1px solid ${darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};border-radius:11px;color:${darkMode?"#e2e8f0":"#1e293b"};font-family:inherit;font-size:14px;padding:9px 12px;width:100%;outline:none;transition:border-color 0.2s}
        input:focus,select:focus,textarea:focus{border-color:#4ade80}
        input::placeholder,textarea::placeholder{color:${darkMode?"#475569":"#94a3b8"}}
        select option{background:${darkMode?"#1e293b":"#f8fafc"};color:${darkMode?"#e2e8f0":"#1e293b"}}
        label{font-size:11px;color:${darkMode?"#94a3b8":"#64748b"};margin-bottom:4px;display:block;font-weight:500}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .grid-4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px}
        .btn{border:none;border-radius:11px;color:white;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;padding:10px;width:100%;margin-top:8px;transition:opacity 0.2s}
        .btn:hover{opacity:0.88}
        .btn-green{background:linear-gradient(135deg,#22c55e,#16a34a)}
        .btn-orange{background:linear-gradient(135deg,#f97316,#ea580c)}
        .btn-purple{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
        .btn-blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
        .btn-teal{background:linear-gradient(135deg,#14b8a6,#0d9488)}
        .meal-row{display:flex;align-items:center;gap:6px;background:${darkMode?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"};border-radius:9px;padding:8px 10px;margin-bottom:6px;font-size:12px}
        .meal-name{flex:1;font-weight:600;font-size:12px}
        .meal-weight{color:${darkMode?"#94a3b8":"#64748b"};font-size:10px;white-space:nowrap}
        .meal-carb{color:#4ade80;font-size:10px;font-weight:600;white-space:nowrap}
        .remove-btn{background:rgba(239,68,68,0.15);border:none;border-radius:6px;color:#f87171;cursor:pointer;font-size:10px;padding:2px 6px;flex-shrink:0}
        .progress-bar{background:${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"};border-radius:100px;height:8px;overflow:hidden;margin:6px 0}
        .progress-fill{height:100%;border-radius:100px;transition:width 0.5s ease}
        .result-box{border-radius:12px;padding:11px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
        .result-label{font-size:11px;color:${darkMode?"#94a3b8":"#64748b"};font-weight:500}
        .result-value{font-size:18px;font-weight:900}
        .tag{display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:100px;margin-top:2px}
        .pulse{animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .camera-zone{border:2px dashed rgba(139,92,246,0.4);border-radius:13px;padding:18px;text-align:center;cursor:pointer;transition:border-color 0.2s;background:rgba(139,92,246,0.04)}
        .camera-zone:hover{border-color:rgba(139,92,246,0.8)}
        .tab-bar{display:flex;background:${darkMode?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.8)"};border-bottom:1px solid ${darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"};position:sticky;top:0;z-index:10;backdrop-filter:blur(10px)}
        .tab{flex:1;padding:12px 2px;text-align:center;font-size:10px;font-weight:700;color:${darkMode?"#475569":"#94a3b8"};cursor:pointer;border:none;background:none;font-family:inherit;transition:color 0.2s;border-bottom:2px solid transparent}
        .tab.active{color:#4ade80;border-bottom-color:#4ade80}
        .alert-box{background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:12px;padding:10px 13px;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;color:#fde047;font-weight:600}
        .hist-card{background:${darkMode?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.7)"};border:1px solid ${darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"};border-radius:12px;padding:12px;margin-bottom:8px}
        .fav-add-btn{background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.2);border-radius:8px;color:#4ade80;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;padding:5px 9px;white-space:nowrap}
        .stat-box{background:${darkMode?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)"};border:1px solid ${darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"};border-radius:11px;padding:9px 10px;text-align:center}
        .gender-btn{flex:1;padding:9px;border-radius:9px;border:1px solid ${darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};background:${darkMode?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"};color:${darkMode?"#64748b":"#94a3b8"};cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all 0.2s}
        .gender-btn.active{background:rgba(59,130,246,0.2);border-color:rgba(59,130,246,0.5);color:#60a5fa}
        .weight-pill{display:inline-flex;align-items:center;gap:5px;background:rgba(20,184,166,0.12);border:1px solid rgba(20,184,166,0.25);border-radius:20px;padding:4px 10px;font-size:11px;color:#2dd4bf;font-weight:600;cursor:pointer}
        .weight-pill:hover{background:rgba(20,184,166,0.2)}
      `}</style>

      {/* Header */}
      <div style={{textAlign:"center",padding:"16px 16px 6px",position:"relative"}}>
        {/* Theme toggle */}
        <button onClick={()=>setDarkMode(d=>!d)} style={{position:"absolute",left:12,top:16,background:darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",border:"none",borderRadius:20,cursor:"pointer",fontSize:16,padding:"5px 9px",lineHeight:1}}>
          {darkMode ? "☀️" : "🌙"}
        </button>
        <div style={{fontSize:28,marginBottom:2}}>🔥</div>
        <h1 style={{fontSize:18,fontWeight:900,color:"#f1f5f9"}}>متتبع الجلوكوز اليومي</h1>
        {hasProfile && !showProfileSetup && (
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"#475569"}}>احتياجك: <strong style={{color:"#4ade80"}}>{DAILY_GLUCOSE} غ</strong></span>
            {currentWeight && (
              <span className="weight-pill" onClick={()=>setTab("weight")}>
                ⚖️ {currentWeight} كجم
                {toGoal !== null && toGoal > 0 && <span style={{color:"#f87171"}}>• يتبقى {toGoal.toFixed(1)} للهدف</span>}
                {toGoal !== null && toGoal <= 0 && <span style={{color:"#4ade80"}}>• وصلت الهدف 🎉</span>}
              </span>
            )}
          </div>
        )}
        {/* About button */}
        <button onClick={()=>setShowAbout(s=>!s)}
          style={{marginTop:8,background:"none",border:"none",color:"#334155",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:20,textDecoration:"underline",textDecorationStyle:"dotted"}}>
          {showAbout ? "إخفاء فكرة التطبيق ▲" : "عن التطبيق ▾"}
        </button>
        {showAbout && (
          <div style={{margin:"8px 0 4px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"14px 16px",textAlign:"right",lineHeight:1.85}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10,textAlign:"center",letterSpacing:1}}>💡 فكرة التطبيق</div>
            <p style={{fontSize:11,color:"#64748b",marginBottom:9}}>
              جسم الإنسان يحتاج يومياً إلى كمية معينة من الجلوكوز والطاقة لتغذية الأعضاء الحيوية مثل الدماغ، الكبد، العضلات، وخلايا الجسم المختلفة. هذه الطاقة يحصل عليها الجسم عادةً من الطعام، خصوصاً الكربوهيدرات التي تتحول بعد الهضم إلى جلوكوز يُستخدم داخل الجسم.
            </p>
            <p style={{fontSize:11,color:"#64748b",marginBottom:9}}>
              فكرة التطبيق تقوم على تبسيط هذه العملية بطريقة سهلة وواضحة، بدل الدخول في تعقيدات السعرات الحرارية والأنظمة الغذائية التقليدية.
            </p>
            <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.1)",borderRadius:10,padding:"9px 12px",marginBottom:9}}>
              <div style={{fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:6}}>يقوم التطبيق بحساب:</div>
              {["كمية الجلوكوز التي دخلت الجسم من الطعام","كمية الطاقة التي استهلكها الجسم خلال المشي والنشاط","هل تم تغطية احتياج الجسم اليومي بالكامل أم لا","كمية الدهون التي قد يستخدمها الجسم لتعويض النقص"].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
                  <span style={{color:"#4ade80",fontSize:11,marginTop:1}}>✓</span>
                  <span style={{fontSize:11,color:"#64748b"}}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.1)",borderRadius:10,padding:"9px 12px",marginBottom:9}}>
              <div style={{fontSize:10,color:"#a5b4fc",fontWeight:700,marginBottom:6}}>كل ما يحتاجه المستخدم:</div>
              {["اختيار نوع الطعام أو تصويره","إدخال وزن الوجبة","إضافة مدة المشي أو النشاط اليومي"].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
                  <span style={{color:"#a5b4fc",fontSize:11,marginTop:1}}>{i+1}.</span>
                  <span style={{fontSize:11,color:"#64748b"}}>{t}</span>
                </div>
              ))}
            </div>
            <p style={{fontSize:11,color:"#64748b",marginBottom:12}}>
              ليقوم التطبيق تلقائياً بتحليل البيانات وتحويلها إلى معلومات مبسطة تساعد المستخدم على فهم كيفية استهلاك جسمه للطاقة، وإدارة وزنه أو خفض الدهون بطريقة أسهل وأكثر وعياً.
            </p>
            <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:10,textAlign:"center"}}>
              <span style={{fontSize:10,color:"#334155",fontWeight:600}}>فكرة وتطوير: </span>
              <span style={{fontSize:10,color:"#4ade80",fontWeight:800}}>عثمان الجعفر</span>
            </div>
          </div>
        )}
      </div>

      {/* Profile setup */}
      {showProfileSetup && (
        <div className="page">
          <div className="card" style={{border:"1px solid rgba(59,130,246,0.25)"}}>
            <div className="section-title">👤 بياناتك الشخصية</div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>أدخل بياناتك لحساب احتياجك بدقة (معادلة Mifflin-St Jeor)</div>
            <div style={{marginBottom:9}}>
              <label>الجنس</label>
              <div style={{display:"flex",gap:7}}>
                <button className={`gender-btn ${profileDraft.gender==="male"?"active":""}`} onClick={()=>setProfileDraft(p=>({...p,gender:"male"}))}>👨 ذكر</button>
                <button className={`gender-btn ${profileDraft.gender==="female"?"active":""}`} onClick={()=>setProfileDraft(p=>({...p,gender:"female"}))}>👩 أنثى</button>
              </div>
            </div>
            <div className="grid-3" style={{marginBottom:9}}>
              <div><label>الطول (سم)</label><input type="number" placeholder="175" value={profileDraft.height} onChange={e=>setProfileDraft(p=>({...p,height:e.target.value}))}/></div>
              <div><label>العمر (سنة)</label><input type="number" placeholder="30" value={profileDraft.age} onChange={e=>setProfileDraft(p=>({...p,age:e.target.value}))}/></div>
              <div><label>الهدف (كجم)</label><input type="number" placeholder="80" value={profileDraft.targetWeight} onChange={e=>setProfileDraft(p=>({...p,targetWeight:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:9}}>
              <label>وزنك الحالي (كجم) — يمكن تحديثه يومياً لاحقاً</label>
              <input type="number" placeholder="مثال: 90" value={weightInput} onChange={e=>setWeightInput(e.target.value)}/>
            </div>
            {parseFloat(profileDraft.height)>0 && parseFloat(profileDraft.age)>0 && parseFloat(weightInput)>0 && (()=>{
              const pb = calcBMR(parseFloat(weightInput),parseFloat(profileDraft.height),parseFloat(profileDraft.age),profileDraft.gender);
              const pg = calcDailyGlucose(pb);
              const pbmi = parseFloat(weightInput)/((parseFloat(profileDraft.height)/100)**2);
              const pbmiLabel = pbmi<18.5?"نقص وزن":pbmi<25?"وزن طبيعي":pbmi<30?"زيادة وزن":"سمنة";
              const pbmiColor = pbmi<18.5?"#60a5fa":pbmi<25?"#4ade80":pbmi<30?"#fde047":"#f87171";
              return (
                <div style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:12,padding:11,marginBottom:9}}>
                  <div style={{fontSize:10,color:"#60a5fa",fontWeight:700,marginBottom:8}}>📊 معاينة الحسابات</div>
                  <div className="grid-4">
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMR</div><div style={{fontSize:13,fontWeight:800,color:"#60a5fa"}}>{Math.round(pb)}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>TDEE</div><div style={{fontSize:13,fontWeight:800,color:"#a78bfa"}}>{Math.round(pb*1.2)}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>جلوكوز</div><div style={{fontSize:13,fontWeight:800,color:"#4ade80"}}>{pg}</div><div style={{fontSize:9,color:"#475569"}}>غ/يوم</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMI</div><div style={{fontSize:13,fontWeight:800,color:pbmiColor}}>{pbmi.toFixed(1)}</div><div style={{fontSize:9,color:pbmiColor}}>{pbmiLabel}</div></div>
                  </div>
                </div>
              );
            })()}
            <button className="btn btn-blue" onClick={()=>{ const val=parseFloat(weightInput); if(val>0){const today=todayKey();const nl=[{date:today,weight:val}];setWeightLog(nl);setCurrentWeight(val);saveStorage("weightLog",nl);} saveProfile(); }}>
              💾 حفظ البيانات والبدء
            </button>
            {profileSaved && <button onClick={()=>setEditingProfile(false)} style={{width:"100%",marginTop:7,background:"none",border:"none",color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:11,padding:"7px"}}>إلغاء</button>}
          </div>
        </div>
      )}

      {/* Main App */}
      {profileSaved && !showProfileSetup && (
        <>
          <div className="tab-bar">
            <button className={`tab ${tab==="today"?"active":""}`} onClick={()=>setTab("today")}>📅 اليوم</button>
            <button className={`tab ${tab==="weight"?"active":""}`} onClick={()=>setTab("weight")}>⚖️ الوزن</button>
            <button className={`tab ${tab==="report"?"active":""}`} onClick={()=>{saveDayToHistory();setTab("report");}}>📋 تقرير</button>
            <button className={`tab ${tab==="monthly"?"active":""}`} onClick={()=>{saveDayToHistory();setTab("monthly");}}>📆 شهري</button>
            <button className={`tab ${tab==="favorites"?"active":""}`} onClick={()=>setTab("favorites")}>★ مفضلة</button>
            <button className={`tab ${tab==="history"?"active":""}`} onClick={()=>{saveDayToHistory();setTab("history");}}>🗓 السجل</button>
          </div>

          {/* ===== WEIGHT TAB ===== */}
          {tab==="weight" && (
            <div className="page">
              {/* Log weight today */}
              <div className="card" style={{border:"1px solid rgba(20,184,166,0.25)"}}>
                <div className="section-title">⚖️ سجّل وزنك اليوم</div>
                <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                  <div style={{flex:1}}>
                    <label>الوزن (كجم)</label>
                    <input type="number" placeholder={currentWeight ? String(currentWeight) : "مثال: 90"} value={weightInput} onChange={e=>setWeightInput(e.target.value)} step="0.1"/>
                  </div>
                  <button onClick={logWeight} style={{background:"linear-gradient(135deg,#14b8a6,#0d9488)",border:"none",borderRadius:11,color:"white",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,padding:"9px 16px",marginBottom:0,flexShrink:0}}>
                    ✓ سجّل
                  </button>
                </div>
                <div style={{fontSize:10,color:"#475569",marginTop:6}}>💡 كل ما تسجّل وزن جديد تتحدث جميع الحسابات تلقائياً</div>
              </div>

              {/* Stats row */}
              {currentWeight && (
                <div className="grid-3" style={{marginBottom:11}}>
                  <div className="stat-box">
                    <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>الوزن الحالي</div>
                    <div style={{fontSize:17,fontWeight:800,color:"#2dd4bf"}}>{currentWeight}</div>
                    <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                  </div>
                  {targetW > 0 && (
                    <div className="stat-box">
                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>الهدف</div>
                      <div style={{fontSize:17,fontWeight:800,color:"#4ade80"}}>{targetW}</div>
                      <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                    </div>
                  )}
                  {targetW > 0 && toGoal !== null && (
                    <div className="stat-box">
                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{toGoal > 0 ? "يتبقى" : "تجاوزت"}</div>
                      <div style={{fontSize:17,fontWeight:800,color:toGoal>0?"#f87171":"#4ade80"}}>{Math.abs(toGoal).toFixed(1)}</div>
                      <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                    </div>
                  )}
                  {firstWeight && currentWeight !== firstWeight && (
                    <div className="stat-box">
                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>إجمالي الفقدان</div>
                      <div style={{fontSize:17,fontWeight:800,color:totalLost>0?"#4ade80":"#f87171"}}>{totalLost>0?"-":"+"}{Math.abs(totalLost).toFixed(1)}</div>
                      <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                    </div>
                  )}
                </div>
              )}

              {/* Chart */}
              {chartData.length >= 2 && (
                <div className="card">
                  <div className="section-title">📈 مسار الوزن</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{top:5,right:5,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="date" tick={{fontSize:9,fill:"#475569"}} tickLine={false} axisLine={false}/>
                      <YAxis domain={[chartMin, chartMax]} tick={{fontSize:9,fill:"#475569"}} tickLine={false} axisLine={false}/>
                      <Tooltip content={<CustomTooltip targetWeight={targetW||null}/>}/>
                      {targetW > 0 && <ReferenceLine y={targetW} stroke="#4ade80" strokeDasharray="4 4" strokeWidth={1.5} label={{value:"الهدف",position:"insideTopRight",fontSize:9,fill:"#4ade80"}}/>}
                      <Line type="monotone" dataKey="weight" stroke="#2dd4bf" strokeWidth={2.5} dot={{fill:"#2dd4bf",r:3,strokeWidth:0}} activeDot={{r:5,fill:"#2dd4bf"}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartData.length === 1 && (
                <div className="card" style={{textAlign:"center",padding:"18px 0",color:"#475569",fontSize:12}}>
                  <div style={{fontSize:24,marginBottom:7}}>📈</div>
                  <div>سجّل وزنك غداً لترى الرسم البياني</div>
                  <div style={{fontSize:10,marginTop:3}}>يحتاج تسجيلين على الأقل</div>
                </div>
              )}

              {/* Weight log list */}
              {weightLog.length > 0 && (
                <div className="card">
                  <div className="section-title">📋 سجل القياسات</div>
                  {[...weightLog].reverse().slice(0,10).map((e,i)=>{
                    const prev = weightLog[weightLog.length - 1 - i - 1];
                    const diff = prev ? (e.weight - prev.weight) : null;
                    return (
                      <div key={e.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:12}}>
                        <span style={{color:"#94a3b8",fontSize:11}}>{formatDateFull(e.date)}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {diff !== null && (
                            <span style={{fontSize:10,color:diff<0?"#4ade80":diff>0?"#f87171":"#64748b",fontWeight:600}}>
                              {diff<0?"▼":diff>0?"▲":"—"} {Math.abs(diff).toFixed(1)}
                            </span>
                          )}
                          <span style={{fontWeight:800,color:"#2dd4bf"}}>{e.weight} كجم</span>
                          <button onClick={()=>{ const nl=weightLog.filter(x=>x.date!==e.date); setWeightLog(nl); if(nl.length>0)setCurrentWeight(nl[nl.length-1].weight); else setCurrentWeight(null); }} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:5,color:"#f87171",cursor:"pointer",fontSize:10,padding:"2px 5px"}}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fat Counter */}
              {totalFatTarget && (
                <div className="card" style={{border:"1px solid rgba(251,146,60,0.3)",marginTop:4}}>
                  <div className="section-title">🔥 عداد الدهون المخزنة</div>
                  <div style={{textAlign:"center",marginBottom:12}}>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>إجمالي الدهون المستهدف حرقها</div>
                    <div style={{fontSize:32,fontWeight:900,color:"#fb923c"}}>{fatRemaining?.toLocaleString()} <span style={{fontSize:14,fontWeight:400}}>غ</span></div>
                    <div style={{fontSize:10,color:"#475569",marginTop:2}}>متبقي من أصل {totalFatTarget?.toLocaleString()} غ</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.06)",borderRadius:100,height:12,overflow:"hidden",margin:"8px 0"}} >
                    <div style={{height:"100%",borderRadius:100,background:"linear-gradient(90deg,#f97316,#fbbf24)",width:`${fatPct}%`,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:10}}>
                    <span style={{color:"#4ade80",fontWeight:700}}>✅ محروق: {fatBurned.toLocaleString()} غ</span>
                    <span style={{color:"#fb923c",fontWeight:700}}>{fatPct.toFixed(1)}%</span>
                  </div>
                  {fatBurned > 0 && (
                    <div style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:10,padding:"9px 12px",fontSize:11,color:"#94a3b8",lineHeight:1.7,textAlign:"center"}}>
                      🎉 أحرقت ما يعادل <strong style={{color:"#4ade80"}}>{(fatBurned/855).toFixed(1)} كجم</strong> دهون حقيقية!
                    </div>
                  )}
                  {fatBurned === 0 && (
                    <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>
                      سجّل وزنك بانتظام لترى العداد يتحرك 💪
                    </div>
                  )}
                </div>
              )}

              <button onClick={()=>{setProfileDraft({...profile});setEditingProfile(true);}} style={{width:"100%",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:11,color:"#60a5fa",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,padding:"10px",marginTop:4}}>
                ✏️ تعديل الهدف أو البيانات
              </button>

              {/* ── Correlation: Weight vs Glucose ── */}
              {weightLog.length >= 2 && Object.keys(history).length >= 2 && (()=>{
                // Match weight log dates with history dates
                const pairs = weightLog.map(w => {
                  const h = history[w.date];
                  return h ? { date: w.date, weight: w.weight, glucose: h.totalIn, deficit: h.netNeed > 0 } : null;
                }).filter(Boolean);

                if (pairs.length < 2) return (
                  <div className="card" style={{border:"1px solid rgba(99,102,241,0.15)",textAlign:"center",padding:"16px 0",color:"#475569",fontSize:11}}>
                    <div style={{fontSize:20,marginBottom:5}}>🔗</div>
                    سجّل وزنك في نفس أيام تسجيل الأكل لرؤية تحليل الارتباط
                  </div>
                );

                // Count correlation patterns
                const deficitDays   = pairs.filter(p => p.deficit);
                const surplusDays   = pairs.filter(p => !p.deficit);
                const avgWeightDeficit = deficitDays.length ? deficitDays.reduce((s,p)=>s+p.weight,0)/deficitDays.length : null;
                const avgWeightSurplus = surplusDays.length ? surplusDays.reduce((s,p)=>s+p.weight,0)/surplusDays.length : null;
                const trendPositive = avgWeightDeficit !== null && avgWeightSurplus !== null && avgWeightDeficit < avgWeightSurplus;

                // Combined chart data
                const chartCorr = pairs.slice(-14).map(p=>({
                  date: formatDateShort(p.date),
                  weight: p.weight,
                  glucose: Math.round(p.glucose),
                  deficit: p.deficit,
                }));

                return (
                  <div className="card" style={{border:"1px solid rgba(99,102,241,0.2)"}}>
                    <div className="section-title">🔗 ارتباط الوزن بالجلوكوز</div>

                    <div className="grid-2" style={{marginBottom:11}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام النقص</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{deficitDays.length}</div>
                        {avgWeightDeficit && <div style={{fontSize:9,color:"#475569"}}>متوسط وزن {avgWeightDeficit.toFixed(1)} كجم</div>}
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام الفائض</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#f87171"}}>{surplusDays.length}</div>
                        {avgWeightSurplus && <div style={{fontSize:9,color:"#475569"}}>متوسط وزن {avgWeightSurplus.toFixed(1)} كجم</div>}
                      </div>
                    </div>

                    {/* Insight */}
                    <div style={{background: trendPositive?"rgba(74,222,128,0.07)":"rgba(239,68,68,0.06)", border:`1px solid ${trendPositive?"rgba(74,222,128,0.15)":"rgba(239,68,68,0.12)"}`, borderRadius:10, padding:"10px 12px", marginBottom:11, fontSize:11, lineHeight:1.7}}>
                      <span style={{fontWeight:700,color:trendPositive?"#4ade80":"#f87171"}}>
                        {trendPositive ? "✅ النمط إيجابي" : "⚠️ النمط يحتاج انتباه"}
                      </span>
                      <br/>
                      {trendPositive
                        ? `في أيام نقص الجلوكوز كان وزنك أقل بـ ${(avgWeightSurplus - avgWeightDeficit).toFixed(1)} كجم مقارنةً بأيام الفائض — الجسم يحرق الدهون فعلاً عند النقص.`
                        : deficitDays.length === 0
                          ? "ما في أيام نقص مسجّلة بعد. حاول تبقى تحت الاحتياج اليومي لترى تأثيره على وزنك."
                          : "البيانات المسجّلة لا تُظهر ارتباطاً واضحاً بعد. استمر بالتسجيل لترى النمط."
                      }
                    </div>

                    {/* Dual chart */}
                    {chartCorr.length >= 2 && (
                      <>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:6,display:"flex",gap:12}}>
                          <span><span style={{color:"#2dd4bf"}}>●</span> الوزن (كجم)</span>
                          <span><span style={{color:"#a78bfa"}}>●</span> جلوكوز دخل (غ)</span>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartCorr} margin={{top:4,right:4,left:-25,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                            <XAxis dataKey="date" tick={{fontSize:8,fill:"#475569"}} tickLine={false} axisLine={false}/>
                            <YAxis yAxisId="w" orientation="right" tick={{fontSize:8,fill:"#2dd4bf"}} tickLine={false} axisLine={false}/>
                            <YAxis yAxisId="g" orientation="left" tick={{fontSize:8,fill:"#a78bfa"}} tickLine={false} axisLine={false}/>
                            <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:11,direction:"rtl"}} labelStyle={{color:"#94a3b8"}}/>
                            <Line yAxisId="w" type="monotone" dataKey="weight" stroke="#2dd4bf" strokeWidth={2} dot={{r:3,fill:"#2dd4bf",strokeWidth:0}} name="الوزن"/>
                            <Line yAxisId="g" type="monotone" dataKey="glucose" stroke="#a78bfa" strokeWidth={2} dot={{r:3,fill:"#a78bfa",strokeWidth:0}} name="الجلوكوز"/>
                          </LineChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ===== TODAY TAB ===== */}
          {tab==="today" && (
            <div className="page">
              {near80 && <div className="alert-box"><span style={{fontSize:17}}>⚠️</span><span>وصلت {pct.toFixed(0)}% من احتياجك! تبقى لك <strong>{(DAILY_GLUCOSE-totalIn).toFixed(0)} غ</strong></span></div>}
              {over100 && <div className="alert-box" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171"}}><span style={{fontSize:17}}>🚨</span><span>تجاوزت الاحتياج بـ <strong>{surplus.toFixed(1)} غ</strong></span></div>}

              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",marginBottom:3}}>
                  <span>الاحتياج اليومي ({DAILY_GLUCOSE} غ)</span>
                  <span style={{fontWeight:700,color:over100?"#f87171":near80?"#fde047":"#4ade80"}}>{pct.toFixed(0)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${pct}%`,background:over100?"linear-gradient(90deg,#f87171,#ef4444)":near80?"linear-gradient(90deg,#fde047,#f59e0b)":"linear-gradient(90deg,#4ade80,#22c55e)"}}/>
                </div>
                <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>{totalIn.toFixed(1)} غ من أصل {DAILY_GLUCOSE} غ</div>
              </div>
              {/* Add manually */}
              <div className="card">
                <div className="section-title">➕ أضف وجبة يدوياً</div>
                <div style={{marginBottom:8}}><label>اختر من القائمة</label>
                  <select value={selectedPreset} onChange={handlePreset}>
                    <option value="">— اختر أكلة شائعة —</option>
                    {["نشويات","محليات","فواكه","لحوم وبروتين","ألبان","مكسرات","مشروبات","شوكولاتة","كي دي دي","المراعي","الصافي","كتكو","وجبات سعودية"].map(cat=>(
                      <optgroup key={cat} label={"── "+cat+" ──"}>
                        {FOOD_PRESETS.filter(f=>f.category===cat).map(f=>
                          <option key={f.name} value={f.name}>
                            {f.name} ({f.carbPer100} غ/100غ{f.defaultWeight ? ` • ${f.defaultWeight}غ` : ""})
                          </option>
                        )}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{marginBottom:8}}><label>اسم الأكلة</label><input placeholder="مثال: أرز، خبز، تمر..." value={foodName} onChange={e=>setFoodName(e.target.value)}/></div>
                <div className="grid-2">
                  <div><label>الوزن (غ)</label><input type="number" placeholder="200" value={foodWeight} onChange={e=>setFoodWeight(e.target.value)}/></div>
                  <div><label>الكارب/100غ</label><input type="number" placeholder="28" value={carbPer100} onChange={e=>setCarbPer100(e.target.value)}/></div>
                </div>
                {/* Show protein input only if not in presets */}
                {foodName && !FOOD_PRESETS.find(f=>f.name===foodName)?.proteinPer100 && (
                  <div style={{marginTop:8}}><label>بروتين/100غ (اختياري)</label><input type="number" placeholder="مثال: 25" value={proteinInput} onChange={e=>setProteinInput(e.target.value)}/></div>
                )}
                <button className="btn btn-green" onClick={addMealManual}>إضافة الوجبة</button>
              </div>

              {meals.length>0 && (
                <div className="card">
                  <div className="section-title">🍽 الوجبات</div>
                  {meals.map((m,i)=><MealRow key={m.id} meal={m} onRemove={()=>setMeals(p=>p.filter((_,idx)=>idx!==i))} onSave={()=>saveFavorite(m)} isFav={isFav(m)}/>)}
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:8,marginTop:2,display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <span style={{color:"#94a3b8"}}>المجموع</span>
                    <span style={{color:"#4ade80",fontWeight:800}}>{totalIn.toFixed(1)} غ</span>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="section-title">🏃 أضف نشاط</div>
                <div style={{marginBottom:8}}>
                  <label>نوع النشاط</label>
                  <select value={walkActivityId} onChange={e=>setWalkActivityId(e.target.value)}>
                    {ACTIVITIES.map(a=><option key={a.id} value={a.id}>{a.label} (MET {a.met})</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div><label>الدقائق</label><input type="number" placeholder="30" value={walkInput} onChange={e=>setWalkInput(e.target.value)}/></div>
                  <div><label>التوقيت (اختياري)</label><input placeholder="الصبح" value={walkLabel} onChange={e=>setWalkLabel(e.target.value)}/></div>
                </div>
                {walkInput && parseFloat(walkInput)>0 && w>0 && (()=>{
                  const act = ACTIVITIES.find(a=>a.id===walkActivityId)||ACTIVITIES[1];
                  const preview = calcActivityBurn(parseFloat(walkInput), w, act.met);
                  return <div style={{fontSize:11,color:"#fb923c",fontWeight:600,textAlign:"center",marginTop:6}}>≈ {preview.toFixed(1)} غ جلوكوز ستُحرق</div>;
                })()}
                <button className="btn btn-orange" onClick={addWalkSession}>➕ إضافة النشاط</button>
                {walkSessions.length>0 && <div style={{marginTop:10}}>
                  {walkSessions.map((s,i)=><WalkRow key={s.id} session={s} onRemove={()=>setWalkSessions(p=>p.filter((_,idx)=>idx!==i))}/>)}
                  <div style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:8,padding:"7px 10px",marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <span style={{color:"#94a3b8"}}>الإجمالي: {totalWalkMin} دقيقة</span>
                    <span style={{color:"#fb923c",fontWeight:800}}>{totalWalkBurn.toFixed(1)} غ محروقة</span>
                  </div>
                </div>}
              </div>

              {/* Daily Note */}
              <div className="card">
                <div className="section-title">📝 ملاحظة اليوم</div>
                <textarea
                  placeholder="كيف حسّيت اليوم؟ أي ملاحظات على الأكل أو النشاط..."
                  value={dailyNote}
                  onChange={e=>setDailyNote(e.target.value)}
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:11,color:darkMode?"#e2e8f0":"#1e293b",fontFamily:"inherit",fontSize:13,padding:"10px 12px",width:"100%",outline:"none",resize:"none",minHeight:80,lineHeight:1.6}}
                />
              </div>

              {/* Summary + Share */}
              <div className="card" ref={reportRef}>
                <div className="section-title">📊 الملخص النهائي</div>

                {/* Protein tracker */}
                {DAILY_PROTEIN > 0 && (()=>{
                  const protPct = Math.min(100,(totalProteinIn/DAILY_PROTEIN)*100);
                  const protRemain = Math.max(0, DAILY_PROTEIN - totalProteinIn);
                  return (
                    <div style={{background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.15)",borderRadius:12,padding:"11px 13px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                        <span style={{color:"#94a3b8",fontWeight:600}}>💪 البروتين اليومي ({DAILY_PROTEIN} غ)</span>
                        <span style={{color:protPct>=100?"#4ade80":"#60a5fa",fontWeight:700}}>{protPct.toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar" style={{margin:"4px 0 6px"}}>
                        <div className="progress-fill" style={{width:`${protPct}%`,background:protPct>=100?"linear-gradient(90deg,#4ade80,#22c55e)":"linear-gradient(90deg,#60a5fa,#3b82f6)"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                        <span style={{color:"#60a5fa"}}>{totalProteinIn.toFixed(1)} غ مُغطّى</span>
                        {protRemain > 0
                          ? <span style={{color:"#f87171"}}>يتبقى {protRemain.toFixed(1)} غ</span>
                          : <span style={{color:"#4ade80"}}>✅ الهدف مكتمل!</span>
                        }
                      </div>
                    </div>
                  );
                })()}
                <div className="result-box" style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)"}}><div><div className="result-label">دخل من الأكل</div></div><div className="result-value" style={{color:"#4ade80"}}>{totalIn.toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div></div>
                {totalWalkBurn>0 && <div className="result-box" style={{background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.15)"}}><div><div className="result-label">انحرق بالنشاط</div></div><div className="result-value" style={{color:"#fb923c"}}>{totalWalkBurn.toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div></div>}
                <div className="result-box" style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)"}}>
                  <div><div className="result-label">المتبقي من الاحتياج</div>{netNeed<=0&&<span className="tag" style={{background:"rgba(239,68,68,0.2)",color:"#f87171"}}>فائض</span>}{netNeed>0&&<span className="tag" style={{background:"rgba(99,102,241,0.2)",color:"#a5b4fc"}}>ناقص</span>}</div>
                  <div className="result-value" style={{color:netNeed<=0?"#f87171":"#a5b4fc"}}>{(netNeed>0?netNeed:surplus).toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div>
                </div>
                {netNeed>0 && <div className="result-box" style={{background:"rgba(234,179,8,0.07)",border:"1px solid rgba(234,179,8,0.15)"}}><div><div className="result-label">الدهون المحتمل حرقها</div><span className="tag" style={{background:"rgba(234,179,8,0.2)",color:"#fde047"}}>لتعويض النقص</span></div><div className="result-value" style={{color:"#fde047"}}>{fatBurn.toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div></div>}
                {netNeed<=0 && <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:10,padding:"8px 12px",textAlign:"center",fontSize:11,color:"#f87171"}}>⚠️ تجاوزت الاحتياج بـ {surplus.toFixed(1)} غ</div>}

                {/* Share as text */}
                <button onClick={()=>{
                  const today = new Date().toLocaleDateString("ar-SA");
                  const lines = [
                    `📊 تقرير يومي — ${today}`,
                    `━━━━━━━━━━━━━━━━`,
                    `🍽 دخل من الأكل: ${totalIn.toFixed(1)} غ كارب`,
                    totalProteinIn > 0 ? `💪 البروتين: ${totalProteinIn.toFixed(1)} غ من ${DAILY_PROTEIN} غ` : null,
                    totalWalkBurn>0 ? `🏃 انحرق بالنشاط: ${totalWalkBurn.toFixed(1)} غ` : null,
                    `📉 المتبقي: ${(netNeed>0?netNeed:surplus).toFixed(1)} غ (${netNeed>0?"ناقص":"فائض"})`,
                    netNeed>0 ? `🔥 دهون محتمل حرقها: ${fatBurn.toFixed(1)} غ` : null,
                    dailyNote ? `\n📝 ${dailyNote}` : null,
                    `━━━━━━━━━━━━━━━━`,
                    `فكرة وتطوير: عثمان الجعفر`,
                  ].filter(Boolean).join("\n");
                  if (navigator.share) navigator.share({ text: lines });
                  else { navigator.clipboard?.writeText(lines); alert("تم نسخ التقرير!"); }
                }} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:10,color:"white",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,padding:"10px"}}>
                  📤 مشاركة التقرير
                </button>
              </div>

              <button onClick={resetDay} style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,padding:"10px"}}>🔄 إنهاء اليوم وحفظه في السجل</button>
              <div style={{textAlign:"center",fontSize:10,color:"#334155",paddingTop:9}}>1 غ دهون = 9 سعرات · 1 غ جلوكوز = 4 سعرات</div>
            </div>
          )}

          {/* ===== PROFILE TAB ===== */}
          {tab==="profile" && (
            <div className="page">
              <div className="card" style={{border:"1px solid rgba(59,130,246,0.2)"}}>
                <div className="section-title">👤 بياناتك</div>
                <div className="grid-4" style={{marginBottom:11}}>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>الوزن</div><div style={{fontSize:15,fontWeight:800,color:"#2dd4bf"}}>{currentWeight||"—"}</div><div style={{fontSize:9,color:"#475569"}}>كجم</div></div>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>الطول</div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{h||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سم</div></div>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>العمر</div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{a||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سنة</div></div>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>الهدف</div><div style={{fontSize:15,fontWeight:800,color:"#4ade80"}}>{targetW||"—"}</div><div style={{fontSize:9,color:"#475569"}}>كجم</div></div>
                </div>
                <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:11,marginBottom:11}}>
                  <div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:9}}>📊 الحسابات</div>
                  <div className="grid-4">
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMR</div><div style={{fontSize:14,fontWeight:800,color:"#60a5fa"}}>{Math.round(bmr)||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>TDEE</div><div style={{fontSize:14,fontWeight:800,color:"#a78bfa"}}>{tdee||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>جلوكوز</div><div style={{fontSize:14,fontWeight:800,color:"#4ade80"}}>{DAILY_GLUCOSE}</div><div style={{fontSize:9,color:"#475569"}}>غ/يوم</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMI</div><div style={{fontSize:14,fontWeight:800,color:bmiColor}}>{bmi.toFixed(1)||"—"}</div><div style={{fontSize:9,color:bmiColor}}>{bmiLabel}</div></div>
                  </div>
                </div>
                <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.1)",borderRadius:10,padding:"9px 12px",fontSize:10,color:"#64748b",lineHeight:1.7}}>
                  💡 <strong style={{color:"#4ade80"}}>كيف يُحسب الجلوكوز؟</strong><br/>
                  BMR بمعادلة Mifflin-St Jeor × 1.2 (نشاط خفيف) = TDEE، ثم 55% منها ÷ 4 = غرام جلوكوز يومي. يتحدث تلقائياً مع كل تسجيل وزن جديد.
                </div>
                <button className="btn btn-blue" style={{marginTop:11}} onClick={()=>{setProfileDraft({...profile});setEditingProfile(true);}}>✏️ تعديل البيانات</button>
              </div>
            </div>
          )}

          {/* ===== REPORT TAB ===== */}
          {tab==="report" && (
            <div className="page">

              {/* Weekly reminder settings */}
              <div className="card" style={{border:"1px solid rgba(234,179,8,0.2)"}}>
                <div className="section-title">🔔 تذكير أسبوعي بتسجيل الوزن</div>
                {showReminder && (
                  <div style={{background:"rgba(234,179,8,0.12)",border:"1px solid rgba(234,179,8,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12,color:"#fde047",fontWeight:600}}>
                    ⏰ حان وقت قياس وزنك الأسبوعي! اذهب لتاب الوزن وسجّل 💪
                  </div>
                )}
                <div className="grid-2" style={{marginBottom:8}}>
                  <div>
                    <label>اليوم</label>
                    <select value={reminderDay} onChange={e=>setReminderDay(e.target.value)}>
                      <option value="0">الأحد</option>
                      <option value="1">الاثنين</option>
                      <option value="2">الثلاثاء</option>
                      <option value="3">الأربعاء</option>
                      <option value="4">الخميس</option>
                      <option value="5">الجمعة</option>
                      <option value="6">السبت</option>
                    </select>
                  </div>
                  <div>
                    <label>الوقت</label>
                    <select value={reminderHour} onChange={e=>setReminderHour(e.target.value)}>
                      {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(h=>(
                        <option key={h} value={String(h)}>{h<12?`${h} صباحاً`:h===12?"12 ظهراً":`${h-12} مساءً`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={()=>setReminderSet(r=>!r)}
                  style={{width:"100%",background:reminderSet?"rgba(234,179,8,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${reminderSet?"rgba(234,179,8,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:reminderSet?"#fde047":"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,padding:"10px"}}>
                  {reminderSet ? "🔔 التذكير مُفعّل — اضغط لإيقافه" : "🔕 تفعيل التذكير"}
                </button>
                {reminderSet && (
                  <div style={{fontSize:10,color:"#475569",textAlign:"center",marginTop:6}}>
                    سيظهر تنبيه كل {["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][parseInt(reminderDay)]} الساعة {parseInt(reminderHour)<12?`${reminderHour} صباحاً`:parseInt(reminderHour)===12?"12 ظهراً":`${parseInt(reminderHour)-12} مساءً`} عند فتح التطبيق
                  </div>
                )}
              </div>

              {/* Goal ETA */}
              <div className="card" style={{border:"1px solid rgba(74,222,128,0.2)"}}>
                <div className="section-title">🎯 حاسبة الوصول للهدف</div>
                {!targetW ? (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>🎯</div>
                    <div>ما حددت هدفاً بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>اضغط "تعديل البيانات" في تاب الوزن وأضف هدفك</div>
                  </div>
                ) : goalETA?.reached ? (
                  <div style={{textAlign:"center",padding:"14px 0"}}>
                    <div style={{fontSize:32,marginBottom:6}}>🎉</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#4ade80"}}>وصلت لهدفك!</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:4}}>الهدف: {targetW} كجم • الحالي: {currentWeight} كجم</div>
                  </div>
                ) : goalETA?.noProgress ? (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#f87171",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>📈</div>
                    <div>الوزن لم ينخفض بعد</div>
                    <div style={{fontSize:10,marginTop:3,color:"#475569"}}>سجّل وزنك بانتظام لترى التقدم</div>
                  </div>
                ) : goalETA ? (
                  <div>
                    <div className="grid-2" style={{marginBottom:10}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>معدل الخسارة</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{goalETA.kgPerWeek}</div>
                        <div style={{fontSize:9,color:"#475569"}}>كجم/أسبوع</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>المتبقي للهدف</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fb923c"}}>{goalETA.remaining}</div>
                        <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                      </div>
                    </div>
                    <div style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>بهذا المعدل ستصل للهدف خلال</div>
                      <div style={{fontSize:20,fontWeight:900,color:"#4ade80"}}>{goalETA.weeks} أسبوع</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:4}}>تقريباً في {goalETA.eta}</div>
                    </div>
                    <div style={{fontSize:10,color:"#475569",marginTop:8,textAlign:"center"}}>
                      💡 الحساب بناءً على معدل خسارتك الفعلي من سجل الوزن
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>⚖️</div>
                    <div>سجّل وزنك مرتين على الأقل لحساب الوقت</div>
                  </div>
                )}
              </div>

              {/* Weekly report */}
              <div className="card" style={{border:"1px solid rgba(139,92,246,0.2)"}}>
                <div className="section-title">📋 التقرير الأسبوعي</div>
                {!weeklyReport ? (
                  <div style={{textAlign:"center",padding:"14px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>📋</div>
                    <div>ما في بيانات كافية بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>استخدم "إنهاء اليوم" يومياً لتراكم البيانات</div>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:10,color:"#64748b",marginBottom:10}}>آخر {weeklyReport.count} أيام مسجّلة</div>

                    <div className="grid-2" style={{marginBottom:10}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>متوسط الجلوكوز</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{weeklyReport.avgGlucose.toFixed(0)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غ/يوم</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>إجمالي الدهون المحروقة</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fde047"}}>{weeklyReport.totalFat.toFixed(1)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غرام دهون</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام تجاوزت الحد</div>
                        <div style={{fontSize:16,fontWeight:800,color:weeklyReport.daysOver>0?"#f87171":"#4ade80"}}>{weeklyReport.daysOver}</div>
                        <div style={{fontSize:9,color:"#475569"}}>من {weeklyReport.count}</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>جلوكوز المشي</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fb923c"}}>{weeklyReport.totalWalkB.toFixed(0)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غ محروق</div>
                      </div>
                    </div>

                    {weeklyReport.best && (
                      <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.12)",borderRadius:10,padding:"9px 12px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:10,color:"#4ade80",fontWeight:700}}>🏆 أفضل يوم</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{formatDateFull(weeklyReport.best.key)}</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#fde047"}}>{(weeklyReport.best.fatBurn||0).toFixed(1)} غ دهون</div>
                          <div style={{fontSize:10,color:"#64748b"}}>جلوكوز: {weeklyReport.best.totalIn.toFixed(0)} غ</div>
                        </div>
                      </div>
                    )}

                    {weeklyReport.worst && weeklyReport.worst.key !== weeklyReport.best?.key && (
                      <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:10,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:10,color:"#f87171",fontWeight:700}}>📉 يوم يحتاج تحسين</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{formatDateFull(weeklyReport.worst.key)}</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#f87171"}}>{(weeklyReport.worst.fatBurn||0).toFixed(1)} غ دهون</div>
                          <div style={{fontSize:10,color:"#64748b"}}>جلوكوز: {weeklyReport.worst.totalIn.toFixed(0)} غ</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ===== MONTHLY TAB ===== */}
          {tab==="monthly" && (()=>{
            const allKeys = Object.keys(history).sort((a,b)=>a.localeCompare(b));
            const now = new Date();
            const thisMonth = allKeys.filter(k => k.startsWith(now.toISOString().slice(0,7)));
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
            const lastMonth = allKeys.filter(k => k.startsWith(lastMonthDate.toISOString().slice(0,7)));

            const calcStats = (keys) => {
              if (!keys.length) return null;
              const days = keys.map(k=>history[k]);
              const avgGlucose = days.reduce((s,d)=>s+d.totalIn,0)/days.length;
              const totalFat = days.reduce((s,d)=>s+(d.fatBurn||0),0);
              const totalWalkBurn = days.reduce((s,d)=>s+(d.totalWalkBurn||0),0);
              const daysOver = days.filter(d=>d.totalIn>DAILY_GLUCOSE).length;
              const daysDeficit = days.length - daysOver;
              const best = [...days].sort((a,b)=>(b.fatBurn||0)-(a.fatBurn||0))[0];
              const bestKey = keys[days.indexOf(best)];
              return { avgGlucose, totalFat, totalWalkBurn, daysOver, daysDeficit, best, bestKey, count:keys.length };
            };

            const thisStats = calcStats(thisMonth);
            const lastStats = calcStats(lastMonth);

            // Weight change this month
            const monthWeights = weightLog.filter(e=>e.date.startsWith(now.toISOString().slice(0,7)));
            const weightChange = monthWeights.length>=2 ? (monthWeights[monthWeights.length-1].weight - monthWeights[0].weight) : null;

            // Chart: glucose per day this month
            const chartMonthly = thisMonth.map(k=>({
              date: formatDateShort(k),
              glucose: Math.round(history[k].totalIn),
              fat: parseFloat((history[k].fatBurn||0).toFixed(1)),
            }));

            return (
              <div className="page">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:darkMode?"#f1f5f9":"#1e293b"}}>
                    {now.toLocaleString("ar-SA",{month:"long",year:"numeric"})}
                  </div>
                  {lastStats && <div style={{fontSize:10,color:"#64748b"}}>مقارنة بالشهر الماضي</div>}
                </div>

                {!thisStats ? (
                  <div className="card" style={{textAlign:"center",padding:"22px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:28,marginBottom:7}}>📆</div>
                    <div>ما في بيانات هذا الشهر بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>استخدم "إنهاء اليوم" يومياً لتراكم البيانات</div>
                  </div>
                ) : (
                  <>
                    {/* Key stats */}
                    <div className="grid-2" style={{marginBottom:10}}>
                      {[
                        { label:"أيام مسجّلة", val:thisStats.count, color:"#94a3b8", prevVal:lastStats?.count },
                        { label:"متوسط الجلوكوز", val:thisStats.avgGlucose.toFixed(0)+" غ", color:"#4ade80", prevVal:lastStats?.avgGlucose.toFixed(0)+" غ" },
                        { label:"إجمالي دهون محروقة", val:thisStats.totalFat.toFixed(1)+" غ", color:"#fde047", prevVal:lastStats?.totalFat.toFixed(1)+" غ" },
                        { label:"أيام ضمن الهدف", val:thisStats.daysDeficit, color:"#60a5fa", prevVal:lastStats?.daysDeficit },
                      ].map((s,i)=>(
                        <div key={i} className="stat-box">
                          <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
                          {s.prevVal !== undefined && <div style={{fontSize:9,color:"#475569"}}>الشهر الماضي: {s.prevVal}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Weight change */}
                    {weightChange !== null && (
                      <div className="card" style={{background:weightChange<0?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.05)",border:`1px solid ${weightChange<0?"rgba(74,222,128,0.15)":"rgba(239,68,68,0.12)"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>تغيّر الوزن هذا الشهر</div>
                            <div style={{fontSize:10,color:"#475569"}}>{monthWeights[0].weight} → {monthWeights[monthWeights.length-1].weight} كجم</div>
                          </div>
                          <div style={{fontSize:22,fontWeight:900,color:weightChange<0?"#4ade80":"#f87171"}}>
                            {weightChange<0?"▼":"▲"} {Math.abs(weightChange).toFixed(1)} كجم
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Best day */}
                    {thisStats.best && (
                      <div className="card" style={{border:"1px solid rgba(234,179,8,0.15)"}}>
                        <div className="section-title">🏆 أفضل يوم هذا الشهر</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:12,fontWeight:700,color:darkMode?"#f1f5f9":"#1e293b"}}>{formatDateFull(thisStats.bestKey)}</div>
                            <div style={{fontSize:10,color:"#64748b",marginTop:2}}>جلوكوز: {thisStats.best.totalIn.toFixed(0)} غ</div>
                          </div>
                          <div style={{textAlign:"left"}}>
                            <div style={{fontSize:16,fontWeight:900,color:"#fde047"}}>{(thisStats.best.fatBurn||0).toFixed(1)} غ</div>
                            <div style={{fontSize:9,color:"#64748b"}}>دهون محروقة</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Monthly chart */}
                    {chartMonthly.length >= 3 && (
                      <div className="card">
                        <div className="section-title">📈 جلوكوز يومي — هذا الشهر</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={chartMonthly} margin={{top:4,right:4,left:-25,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                            <XAxis dataKey="date" tick={{fontSize:8,fill:"#475569"}} tickLine={false} axisLine={false}/>
                            <YAxis tick={{fontSize:8,fill:"#4ade80"}} tickLine={false} axisLine={false}/>
                            <ReferenceLine y={DAILY_GLUCOSE} stroke="#4ade80" strokeDasharray="3 3" strokeWidth={1}/>
                            <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:11,direction:"rtl"}} labelStyle={{color:"#94a3b8"}}/>
                            <Line type="monotone" dataKey="glucose" stroke="#4ade80" strokeWidth={2} dot={{r:2,fill:"#4ade80",strokeWidth:0}} name="الجلوكوز"/>
                          </LineChart>
                        </ResponsiveContainer>
                        <div style={{fontSize:9,color:"#64748b",textAlign:"center",marginTop:4}}>الخط الأخضر = الاحتياج اليومي ({DAILY_GLUCOSE} غ)</div>
                      </div>
                    )}

                    {/* Comparison with last month */}
                    {lastStats && (
                      <div className="card" style={{border:"1px solid rgba(99,102,241,0.15)"}}>
                        <div className="section-title">📊 مقارنة بالشهر الماضي</div>
                        {[
                          { label:"متوسط الجلوكوز", this:thisStats.avgGlucose, last:lastStats.avgGlucose, unit:"غ", lowerBetter:true },
                          { label:"دهون محروقة", this:thisStats.totalFat, last:lastStats.totalFat, unit:"غ", lowerBetter:false },
                          { label:"أيام ضمن الهدف", this:thisStats.daysDeficit, last:lastStats.daysDeficit, unit:"يوم", lowerBetter:false },
                        ].map((row,i)=>{
                          const diff = row.this - row.last;
                          const improved = row.lowerBetter ? diff < 0 : diff > 0;
                          return (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                              <span style={{fontSize:11,color:"#94a3b8"}}>{row.label}</span>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:11,color:"#64748b"}}>{typeof row.this==="number"&&!Number.isInteger(row.this)?row.this.toFixed(1):Math.round(row.this)} {row.unit}</span>
                                <span style={{fontSize:10,color:improved?"#4ade80":"#f87171",fontWeight:700}}>
                                  {diff>0?"+":""}{typeof diff==="number"&&!Number.isInteger(diff)?diff.toFixed(1):Math.round(diff)} {improved?"✓":"↓"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ===== FAVORITES TAB ===== */}
          {tab==="favorites" && (
            <div className="page">
              <div className="card">
                <div className="section-title">★ الوجبات المفضلة</div>
                {favorites.length===0 ? (
                  <div style={{textAlign:"center",padding:"16px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:24,marginBottom:6}}>★</div>
                    <div>ما عندك وجبات محفوظة بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>اضغط ★ بجانب أي وجبة لحفظها</div>
                  </div>
                ) : favorites.map((fav,i)=>(
                  <div key={fav.id} className="meal-row">
                    <span className="meal-name">{fav.name}</span>
                    <span className="meal-weight">{fav.weight}غ</span>
                    <span className="meal-carb">↳ {fav.carbs.toFixed(1)}غ</span>
                    <button className="fav-add-btn" onClick={()=>{setMeals(p=>[...p,{...fav,id:Date.now()}]);setTab("today");}}>+ أضف</button>
                    <button className="remove-btn" onClick={()=>setFavorites(p=>p.filter((_,idx)=>idx!==i))}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {tab==="history" && (
            <div className="page">
              <div className="section-title" style={{padding:"0 4px 8px"}}>السجل الأسبوعي</div>
              {historyKeys.length===0 ? (
                <div className="card" style={{textAlign:"center",padding:"20px 0",color:"#475569",fontSize:12}}>
                  <div style={{fontSize:24,marginBottom:6}}>📊</div>
                  <div>ما في سجل بعد</div>
                  <div style={{fontSize:10,marginTop:3}}>اضغط "إنهاء اليوم" لحفظ يومك</div>
                </div>
              ) : historyKeys.map(key=>{
                const d = history[key];
                const p = Math.min(100,(d.totalIn/DAILY_GLUCOSE)*100);
                const deficit = d.netNeed > 0;
                return (
                  <div key={key} className="hist-card">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{formatDateFull(key)}</div>
                      <div style={{fontSize:10,color:deficit?"#a5b4fc":"#f87171",fontWeight:600,background:deficit?"rgba(99,102,241,0.15)":"rgba(239,68,68,0.15)",padding:"2px 7px",borderRadius:20}}>
                        {deficit?"ناقص":"فائض"} {Math.abs(d.netNeed).toFixed(0)}غ
                      </div>
                    </div>
                    <div className="progress-bar" style={{margin:"5px 0"}}>
                      <div className="progress-fill" style={{width:`${p}%`,background:p>100?"linear-gradient(90deg,#f87171,#ef4444)":"linear-gradient(90deg,#4ade80,#22c55e)"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b"}}>
                      <span>دخل: <strong style={{color:"#4ade80"}}>{d.totalIn.toFixed(0)}غ</strong></span>
                      {d.totalWalkBurn>0 && <span>مشي: <strong style={{color:"#fb923c"}}>{d.totalWalkBurn.toFixed(0)}غ</strong></span>}
                      <span>دهون: <strong style={{color:"#fde047"}}>{d.fatBurn.toFixed(1)}غ</strong></span>
                    </div>
                    {d.meals && d.meals.length>0 && (
                      <div style={{marginTop:6,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:6}}>
                        {d.meals.map((m,i)=><div key={i} style={{fontSize:10,color:"#64748b",marginBottom:2}}>• {m.name} ({m.weight}غ) ← {m.carbs.toFixed(1)}غ</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function formatDateFull(key) {
  const d = new Date(key + "T12:00:00");
  const days = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  return days[d.getDay()] + " " + d.toLocaleDateString("ar-SA");
}

const FOOD_PRESETS = [
  // نشويات
  { name: "أرز مطبوخ", carbPer100: 28, category: "نشويات" },
  { name: "أرز نيء", carbPer100: 80, category: "نشويات" },
  { name: "خبز أبيض", carbPer100: 49, category: "نشويات" },
  { name: "خبز أسمر", carbPer100: 43, category: "نشويات" },
  { name: "توست أسمر", carbPer100: 40, category: "نشويات" },
  { name: "خبز تميس", carbPer100: 55, category: "نشويات" },
  { name: "بطاطا مسلوقة", carbPer100: 17, category: "نشويات" },
  { name: "بطاطا مقلية", carbPer100: 35, category: "نشويات" },
  { name: "معكرونة مسلوقة", carbPer100: 25, category: "نشويات" },
  { name: "شوفان مطبوخ", carbPer100: 12, category: "نشويات" },
  { name: "شوفان نيء", carbPer100: 66, category: "نشويات" },
  // محليات
  { name: "عسل", carbPer100: 82, category: "محليات" },
  { name: "تمر", carbPer100: 75, category: "محليات" },
  { name: "سكر", carbPer100: 100, category: "محليات" },
  { name: "مربى", carbPer100: 65, category: "محليات" },
  { name: "نوتيلا", carbPer100: 57, category: "محليات" },
  // فواكه
  { name: "موز", carbPer100: 23, category: "فواكه" },
  { name: "تفاح", carbPer100: 14, category: "فواكه" },
  { name: "برتقال", carbPer100: 12, category: "فواكه" },
  { name: "عنب", carbPer100: 17, category: "فواكه" },
  { name: "مانجو", carbPer100: 15, category: "فواكه" },
  { name: "بطيخ", carbPer100: 8, category: "فواكه" },
  { name: "شمام", carbPer100: 9, category: "فواكه" },
  { name: "فراولة", carbPer100: 8, category: "فواكه" },
  { name: "خوخ", carbPer100: 10, category: "فواكه" },
  { name: "كمثرى", carbPer100: 15, category: "فواكه" },
  { name: "أناناس", carbPer100: 13, category: "فواكه" },
  { name: "رمان", carbPer100: 19, category: "فواكه" },
  { name: "كيوي", carbPer100: 15, category: "فواكه" },
  { name: "تين طازج", carbPer100: 19, category: "فواكه" },
  { name: "مشمش", carbPer100: 11, category: "فواكه" },
  { name: "برقوق", carbPer100: 11, category: "فواكه" },
  { name: "جوافة", carbPer100: 14, category: "فواكه" },
  { name: "بابايا", carbPer100: 11, category: "فواكه" },
  { name: "توت", carbPer100: 10, category: "فواكه" },
  { name: "ليمون", carbPer100: 9, category: "فواكه" },
  // لحوم وبروتين
  { name: "دجاج مشوي", carbPer100: 0, proteinPer100: 31, category: "لحوم وبروتين" },
  { name: "دجاج مقلي (بالطحين)", carbPer100: 8, proteinPer100: 25, category: "لحوم وبروتين" },
  { name: "لحم بقري مشوي", carbPer100: 0, proteinPer100: 26, category: "لحوم وبروتين" },
  { name: "لحم غنم مشوي", carbPer100: 0, proteinPer100: 25, category: "لحوم وبروتين" },
  { name: "سمك مشوي", carbPer100: 0, proteinPer100: 22, category: "لحوم وبروتين" },
  { name: "سمك مقلي", carbPer100: 6, proteinPer100: 18, category: "لحوم وبروتين" },
  { name: "تونة معلبة", carbPer100: 0, proteinPer100: 26, category: "لحوم وبروتين" },
  { name: "بيض مسلوق", carbPer100: 1, proteinPer100: 13, category: "لحوم وبروتين" },
  { name: "بيض مقلي", carbPer100: 1, proteinPer100: 11, category: "لحوم وبروتين" },
  { name: "فول مدمس", carbPer100: 14, proteinPer100: 6, category: "لحوم وبروتين" },
  { name: "عدس مطبوخ", carbPer100: 20, proteinPer100: 9, category: "لحوم وبروتين" },
  { name: "حمص مطبوخ", carbPer100: 18, proteinPer100: 9, category: "لحوم وبروتين" },
  // ألبان ومنتجاتها
  { name: "حليب كامل الدسم", carbPer100: 5, category: "ألبان" },
  { name: "حليب قليل الدسم", carbPer100: 5, category: "ألبان" },
  { name: "لبن (زبادي)", carbPer100: 4, category: "ألبان" },
  { name: "لبن حليب (لاسي)", carbPer100: 5, category: "ألبان" },
  { name: "جبن أبيض", carbPer100: 1, category: "ألبان" },
  { name: "جبن شيدر", carbPer100: 1, category: "ألبان" },
  { name: "قشطة", carbPer100: 3, category: "ألبان" },
  { name: "آيس كريم", carbPer100: 23, category: "ألبان" },
  // مكسرات وبذور
  { name: "لوز", carbPer100: 9, category: "مكسرات" },
  { name: "جوز", carbPer100: 14, category: "مكسرات" },
  { name: "فول سوداني", carbPer100: 16, category: "مكسرات" },
  { name: "كاجو", carbPer100: 30, category: "مكسرات" },
  { name: "بستاشيو", carbPer100: 28, category: "مكسرات" },
  { name: "بذور الشيا", carbPer100: 42, category: "مكسرات" },
  { name: "بذور السمسم", carbPer100: 23, category: "مكسرات" },
  // مشروبات
  { name: "عصير برتقال طازج", carbPer100: 10, category: "مشروبات" },
  { name: "عصير تفاح معلب", carbPer100: 11, category: "مشروبات" },
  { name: "كولا (كوكا/بيبسي)", carbPer100: 11, category: "مشروبات" },
  { name: "مشروب طاقة (ريد بول)", carbPer100: 11, defaultWeight: 250, category: "مشروبات" },
  { name: "قهوة سادة", carbPer100: 0, category: "مشروبات" },
  { name: "شاي بدون سكر", carbPer100: 0, category: "مشروبات" },
  { name: "شاي بحليب وسكر", carbPer100: 8, defaultWeight: 200, category: "مشروبات" },
  { name: "نسكافيه بحليب", carbPer100: 6, defaultWeight: 200, category: "مشروبات" },
  { name: "لبن (علبة)", carbPer100: 5, defaultWeight: 200, category: "مشروبات" },
  // شوكولاتة وحلويات
  { name: "كيت كات 4 أصابع", carbPer100: 70, defaultWeight: 41.5, category: "شوكولاتة" },
  { name: "كيت كات 2 إصبع", carbPer100: 70, defaultWeight: 20.7, category: "شوكولاتة" },
  { name: "سنيكرز", carbPer100: 58, defaultWeight: 51, category: "شوكولاتة" },
  { name: "مارس", carbPer100: 67, defaultWeight: 51, category: "شوكولاتة" },
  { name: "تويكس", carbPer100: 67, defaultWeight: 50, category: "شوكولاتة" },
  { name: "باونتي", carbPer100: 60, defaultWeight: 57, category: "شوكولاتة" },
  { name: "ميلكي واي", carbPer100: 69, defaultWeight: 52, category: "شوكولاتة" },
  { name: "كرانش", carbPer100: 65, defaultWeight: 40, category: "شوكولاتة" },
  { name: "توبليرون", carbPer100: 62, defaultWeight: 50, category: "شوكولاتة" },
  { name: "كيندر بويينو", carbPer100: 57, defaultWeight: 43, category: "شوكولاتة" },
  { name: "كيندر برستيج", carbPer100: 55, defaultWeight: 65, category: "شوكولاتة" },
  { name: "فريور رووشيه (حبة)", carbPer100: 47, defaultWeight: 12.5, category: "شوكولاتة" },
  { name: "نسكويك (مسحوق)", carbPer100: 78, category: "شوكولاتة" },
  { name: "ميلو (مسحوق)", carbPer100: 74, category: "شوكولاتة" },
  { name: "كاكاو نيسلية", carbPer100: 15, category: "شوكولاتة" },
  // كي دي دي KDD — أوزان 180 مل و 250 مل حسب العبوات المتوفرة
  { name: "KDD عصير تفاح 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير تفاح 250مل", carbPer100: 12, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير برتقال 180مل", carbPer100: 11, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير برتقال 250مل", carbPer100: 11, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير مانجو 180مل", carbPer100: 13, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير مانجو 250مل", carbPer100: 13, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير جوافة 180مل", carbPer100: 13, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير جوافة 250مل", carbPer100: 13, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير كوكتيل 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير كوكتيل 250مل", carbPer100: 12, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير أناناس 180مل", carbPer100: 14, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير أناناس 250مل", carbPer100: 14, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير عنب أحمر 180مل", carbPer100: 18, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير عنب أحمر 250مل", carbPer100: 18, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير كرز 180مل", carbPer100: 13, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير دراق 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD عصير دراق 250مل", carbPer100: 12, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD عصير جريب فروت 180مل", carbPer100: 12, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD حليب شوكولاتة 180مل", carbPer100: 10, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD حليب شوكولاتة 250مل", carbPer100: 10, defaultWeight: 250, category: "كي دي دي" },
  { name: "KDD حليب فراولة 180مل", carbPer100: 10, defaultWeight: 180, category: "كي دي دي" },
  { name: "KDD حليب موز 180مل", carbPer100: 11, defaultWeight: 180, category: "كي دي دي" },
  // KDD — ألبان ومنتجات أخرى
  { name: "KDD حليب كامل 1لتر", carbPer100: 5, defaultWeight: 200, category: "كي دي دي" },
  { name: "KDD حليب خالي دسم 1لتر", carbPer100: 5, defaultWeight: 200, category: "كي دي دي" },
  { name: "KDD لبن زبادي", carbPer100: 4, defaultWeight: 170, category: "كي دي دي" },
  { name: "KDD قشطة", carbPer100: 3, defaultWeight: 100, category: "كي دي دي" },
  { name: "KDD لبن للشرب", carbPer100: 5, defaultWeight: 200, category: "كي دي دي" },
  { name: "KDD زبدة", carbPer100: 0, defaultWeight: 100, category: "كي دي دي" },
  // المراعي
  { name: "المراعي حليب كامل", carbPer100: 5, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي حليب خالي دسم", carbPer100: 5, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي لبن", carbPer100: 4, defaultWeight: 170, category: "المراعي" },
  { name: "المراعي لبن للشرب", carbPer100: 5, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي قشطة", carbPer100: 3, defaultWeight: 100, category: "المراعي" },
  { name: "المراعي جبن أبيض", carbPer100: 1, defaultWeight: 100, category: "المراعي" },
  { name: "المراعي جبن شيدر شرائح", carbPer100: 2, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي زبادي بالفواكه", carbPer100: 14, defaultWeight: 120, category: "المراعي" },
  { name: "المراعي عصير برتقال", carbPer100: 10, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير مانجو", carbPer100: 13, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير تفاح", carbPer100: 11, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير جوافة", carbPer100: 12, defaultWeight: 200, category: "المراعي" },
  { name: "المراعي عصير كوكتيل", carbPer100: 12, defaultWeight: 200, category: "المراعي" },
  // الصافي
  { name: "الصافي ماء", carbPer100: 0, defaultWeight: 500, category: "الصافي" },
  { name: "الصافي عصير برتقال", carbPer100: 10, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير تفاح", carbPer100: 11, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير مانجو", carbPer100: 13, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير جوافة", carbPer100: 12, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير كوكتيل", carbPer100: 12, defaultWeight: 250, category: "الصافي" },
  { name: "الصافي عصير ليمون نعناع", carbPer100: 10, defaultWeight: 250, category: "الصافي" },
  // كتكو
  { name: "كتكو نايس خل وملح", carbPer100: 54, proteinPer100: 8.8, defaultWeight: 25, category: "كتكو" },
  // وجبات سعودية
  { name: "كبسة دجاج (مع أرز)", carbPer100: 22, category: "وجبات سعودية" },
  { name: "كبسة لحم (مع أرز)", carbPer100: 22, category: "وجبات سعودية" },
  { name: "مندي دجاج (مع أرز)", carbPer100: 20, category: "وجبات سعودية" },
  { name: "مندي لحم (مع أرز)", carbPer100: 20, category: "وجبات سعودية" },
  { name: "مجبوس", carbPer100: 21, category: "وجبات سعودية" },
  { name: "هريس", carbPer100: 18, category: "وجبات سعودية" },
  { name: "جريش", carbPer100: 24, category: "وجبات سعودية" },
  { name: "مرقوق", carbPer100: 15, category: "وجبات سعودية" },
  { name: "سليق", carbPer100: 17, category: "وجبات سعودية" },
  { name: "مطبق (محلى)", carbPer100: 38, category: "وجبات سعودية" },
  { name: "مطبق (لحم)", carbPer100: 25, category: "وجبات سعودية" },
  { name: "شاورما دجاج", carbPer100: 16, category: "وجبات سعودية" },
  { name: "فلافل", carbPer100: 17, category: "وجبات سعودية" },
  { name: "حنيذ", carbPer100: 19, category: "وجبات سعودية" },
  { name: "عسيدة", carbPer100: 28, category: "وجبات سعودية" },
];

async function loadStorage(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}
async function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function MealRow({ meal, onRemove, onSave, isFav, darkMode }) {
  return (
    <div className="meal-row">
      <span className="meal-name">{meal.name}</span>
      <span className="meal-weight">{meal.weight}غ</span>
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        <span className="meal-carb">🔥 {meal.carbs.toFixed(1)}غ</span>
        {meal.protein > 0 && <span style={{color:"#60a5fa",fontSize:10,fontWeight:600}}>💪 {meal.protein.toFixed(1)}غ</span>}
      </div>
      {onSave && <button onClick={onSave} style={{background:isFav?"rgba(234,179,8,0.25)":"rgba(255,255,255,0.06)",border:"none",borderRadius:6,color:isFav?"#fde047":"#64748b",cursor:"pointer",fontSize:13,padding:"2px 6px"}}>★</button>}
      {onRemove && <button className="remove-btn" onClick={onRemove}>✕</button>}
    </div>
  );
}
function WalkRow({ session, onRemove }) {
  return (
    <div className="meal-row">
      <span className="meal-name">🚶 {session.label}</span>
      <span className="meal-weight">{session.minutes} دقيقة</span>
      <span className="meal-carb" style={{color:"#fb923c"}}>↳ {session.burned.toFixed(1)}غ</span>
      {onRemove && <button className="remove-btn" onClick={onRemove}>✕</button>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, targetWeight }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const diff = targetWeight ? (val - targetWeight).toFixed(1) : null;
    return (
      <div style={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 12px",fontSize:12,direction:"rtl"}}>
        <div style={{color:"#94a3b8",marginBottom:3}}>{label}</div>
        <div style={{color:"#4ade80",fontWeight:800,fontSize:15}}>{val} كجم</div>
        {diff !== null && <div style={{color: parseFloat(diff) > 0 ? "#f87171" : "#4ade80",fontSize:11}}>{parseFloat(diff) > 0 ? "+" : ""}{diff} من الهدف</div>}
      </div>
    );
  }
  return null;
};

const DEFAULT_PROFILE = { height: "", age: "", gender: "male", targetWeight: "" };

export default function GlucoseTracker() {
  const [tab, setTab] = useState("today");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(DEFAULT_PROFILE);

  // Weight tracking
  const [weightLog, setWeightLog] = useState([]); // [{date, weight}]
  const [weightInput, setWeightInput] = useState("");
  const [currentWeight, setCurrentWeight] = useState(null);

  const [meals, setMeals] = useState([]);
  const [walkSessions, setWalkSessions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [foodName, setFoodName] = useState("");
  const [foodWeight, setFoodWeight] = useState("");
  const [carbPer100, setCarbPer100] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [walkInput, setWalkInput] = useState("");
  const [walkLabel, setWalkLabel] = useState("");
  const [walkActivityId, setWalkActivityId] = useState("walk_normal");
  const [darkMode, setDarkMode] = useState(true);
  const [dailyNote, setDailyNote] = useState("");
  const reportRef = useRef(null);
  const [proteinInput, setProteinInput] = useState("");



  // Derived from current weight + profile
  const w = currentWeight || 0;
  const h = parseFloat(profile.height) || 0;
  const a = parseFloat(profile.age) || 0;
  const targetW = parseFloat(profile.targetWeight) || 0;
  const hasProfile = w > 0 && h > 0 && a > 0;
  const bmr = hasProfile ? calcBMR(w, h, a, profile.gender) : 0;
  const tdee = hasProfile ? Math.round(bmr * 1.2) : 0;
  const bmi = hasProfile ? w / ((h / 100) ** 2) : 0;
  const DAILY_GLUCOSE = hasProfile ? calcDailyGlucose(bmr) : 190;
  const DAILY_PROTEIN = hasProfile ? calcDailyProtein(w) : Math.round(w * 1.0 || 80);
  const bmiLabel = bmi < 18.5 ? "نقص وزن" : bmi < 25 ? "وزن طبيعي" : bmi < 30 ? "زيادة وزن" : "سمنة";
  const bmiColor = bmi < 18.5 ? "#60a5fa" : bmi < 25 ? "#4ade80" : bmi < 30 ? "#fde047" : "#f87171";

  // Weight progress
  const firstWeight = weightLog.length > 0 ? weightLog[0].weight : null;
  const totalLost = firstWeight && currentWeight ? (firstWeight - currentWeight) : 0;
  const toGoal = targetW && currentWeight ? (currentWeight - targetW) : null;

  // Fat counter
  const FAT_GRAMS_PER_KG = 855;
  const totalFatTarget = targetW && firstWeight ? Math.round((firstWeight - targetW) * FAT_GRAMS_PER_KG) : null;
  const fatBurned = totalLost > 0 ? Math.round(totalLost * FAT_GRAMS_PER_KG) : 0;
  const fatRemaining = totalFatTarget ? Math.max(0, totalFatTarget - fatBurned) : null;
  const fatPct = totalFatTarget && fatBurned > 0 ? Math.min(100, (fatBurned / totalFatTarget) * 100) : 0;

  // Chart data (last 30 entries)
  const chartData = weightLog.slice(-30).map(e => ({
    date: formatDateShort(e.date),
    weight: e.weight,
  }));
  const chartMin = chartData.length > 0 ? Math.floor(Math.min(...chartData.map(d => d.weight), targetW || 999) - 2) : 60;
  const chartMax = chartData.length > 0 ? Math.ceil(Math.max(...chartData.map(d => d.weight)) + 2) : 100;

  useEffect(() => {
    (async () => {
      const prof = await loadStorage("profile_v2");
      if (prof) { setProfile(prof); setProfileDraft(prof); setProfileSaved(true); }
      const wlog = await loadStorage("weightLog");
      if (wlog && wlog.length > 0) { setWeightLog(wlog); setCurrentWeight(wlog[wlog.length - 1].weight); }
      const today = await loadStorage("today_" + todayKey());
      if (today) { setMeals(today.meals || []); setWalkSessions(today.walks || []); setDailyNote(today.note || ""); }
      const theme = await loadStorage("darkMode");
      if (theme !== null) setDarkMode(theme);
      const favs = await loadStorage("favorites");
      if (favs) setFavorites(favs);
      const hist = await loadStorage("history");
      if (hist) setHistory(hist);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (!loaded) return; saveStorage("today_" + todayKey(), { meals, walks: walkSessions, note: dailyNote }); }, [meals, walkSessions, dailyNote, loaded]);
  useEffect(() => { if (!loaded) return; saveStorage("favorites", favorites); }, [favorites, loaded]);
  useEffect(() => { if (!loaded) return; saveStorage("weightLog", weightLog); }, [weightLog, loaded]);
  useEffect(() => { if (!loaded) return; saveStorage("darkMode", darkMode); }, [darkMode, loaded]);

  const saveProfile = () => {
    setProfile(profileDraft);
    saveStorage("profile_v2", profileDraft);
    setProfileSaved(true);
    setEditingProfile(false);
  };

  const logWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) return;
    const today = todayKey();
    const newLog = weightLog.filter(e => e.date !== today);
    newLog.push({ date: today, weight: val });
    newLog.sort((a, b) => a.date.localeCompare(b.date));
    setWeightLog(newLog);
    setCurrentWeight(val);
    setWeightInput("");
  };

  const totalIn = meals.reduce((s, m) => s + m.carbs, 0);
  const totalProteinIn = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalWalkBurn = walkSessions.reduce((s, ww) => s + ww.burned, 0);
  const totalWalkMin = walkSessions.reduce((s, ww) => s + ww.minutes, 0);
  const netNeed = DAILY_GLUCOSE - totalIn + totalWalkBurn;
  const fatBurn = netNeed > 0 ? (netNeed * KCAL_PER_GRAM_GLUCOSE) / KCAL_PER_GRAM_FAT : 0;
  const surplus = netNeed < 0 ? Math.abs(netNeed) : 0;
  const pct = Math.min(100, (totalIn / DAILY_GLUCOSE) * 100);
  const near80 = pct >= 80 && pct < 100;
  const over100 = pct >= 100;

  // Weekly reminder state
  const [reminderDay, setReminderDay]   = useState("5");
  const [reminderHour, setReminderHour] = useState("8");
  const [reminderSet, setReminderSet]   = useState(false);
  const showReminder = reminderSet && (() => { const n=new Date(); return String(n.getDay())===reminderDay && n.getHours()===parseInt(reminderHour); })();
  const [showAbout, setShowAbout] = useState(false);

  // Weekly report from last 7 history days
  const getWeeklyReport = () => {
    const keys = Object.keys(history).sort((a,b)=>b.localeCompare(a)).slice(0,7);
    if (keys.length===0) return null;
    const days = keys.map(k=>({...history[k], key:k}));
    const avgGlucose = days.reduce((s,d)=>s+d.totalIn,0)/days.length;
    const totalFat   = days.reduce((s,d)=>s+(d.fatBurn||0),0);
    const totalWalkB = days.reduce((s,d)=>s+(d.totalWalkBurn||0),0);
    const best  = [...days].sort((a,b)=>(b.fatBurn||0)-(a.fatBurn||0))[0];
    const worst = [...days].sort((a,b)=>(a.fatBurn||0)-(b.fatBurn||0))[0];
    const daysOver = days.filter(d=>d.totalIn>DAILY_GLUCOSE).length;
    return { avgGlucose, totalFat, totalWalkB, best, worst, daysOver, count:days.length };
  };
  const weeklyReport = getWeeklyReport();

  // Goal ETA calculator
  const getGoalETA = () => {
    if (!targetW || !currentWeight || weightLog.length<2) return null;
    if (currentWeight<=targetW) return { reached:true };
    const sorted = [...weightLog].sort((a,b)=>a.date.localeCompare(b.date));
    const daysDiff = Math.max(1,(new Date(sorted[sorted.length-1].date)-new Date(sorted[0].date))/86400000);
    const lostKg = sorted[0].weight - sorted[sorted.length-1].weight;
    if (lostKg<=0) return { noProgress:true };
    const kgPerWeek = (lostKg/daysDiff)*7;
    const remaining = currentWeight - targetW;
    const weeksNeeded = remaining/kgPerWeek;
    const eta = new Date(); eta.setDate(eta.getDate()+Math.round(weeksNeeded*7));
    return { kgPerWeek:kgPerWeek.toFixed(2), remaining:remaining.toFixed(1), weeks:Math.round(weeksNeeded), eta:eta.toLocaleDateString("ar-SA") };
  };
  const goalETA = getGoalETA();

  const saveDayToHistory = () => {
    if (meals.length === 0 && walkSessions.length === 0) return;
    const key = todayKey();
    const newHist = { ...history, [key]: { meals, walks: walkSessions, totalIn, totalWalkBurn, netNeed, fatBurn } };
    setHistory(newHist); saveStorage("history", newHist);
  };

  const handlePreset = (e) => {
    const p = FOOD_PRESETS.find(f => f.name === e.target.value);
    if (p) {
      setFoodName(p.name);
      setCarbPer100(String(p.carbPer100));
      if (p.defaultWeight) setFoodWeight(String(p.defaultWeight));
    }
    setSelectedPreset(e.target.value);
  };

  const addMealManual = () => {
    const ww = parseFloat(foodWeight), c = parseFloat(carbPer100);
    if (!foodName || isNaN(ww) || isNaN(c) || ww <= 0 || c < 0) return;
    const preset = FOOD_PRESETS.find(f => f.name === foodName);
    const proteinPer100 = (preset?.proteinPer100 ?? parseFloat(proteinInput)) || 0;
    const protein = (proteinPer100 / 100) * ww;
    setMeals(prev => [...prev, { id: Date.now(), name: foodName, weight: ww, carbs: (c/100)*ww, protein, }]);
    setFoodName(""); setFoodWeight(""); setCarbPer100(""); setSelectedPreset(""); setProteinInput("");
  };

  const saveFavorite = (meal) => {
    const exists = favorites.find(f => f.name === meal.name && f.weight === meal.weight);
    if (exists) setFavorites(prev => prev.filter(f => !(f.name === meal.name && f.weight === meal.weight)));
    else setFavorites(prev => [...prev, { ...meal, id: Date.now() }]);
  };
  const isFav = (meal) => !!favorites.find(f => f.name === meal.name && f.weight === meal.weight);

  const addWalkSession = () => {
    const mins = parseFloat(walkInput);
    if (isNaN(mins) || mins <= 0) return;
    const activity = ACTIVITIES.find(a => a.id === walkActivityId) || ACTIVITIES[1];
    const label = walkLabel.trim() || activity.label;
    setWalkSessions(prev => [...prev, { id: Date.now(), minutes: mins, burned: calcActivityBurn(mins, w || 80, activity.met), label, activityId: walkActivityId }]);
    setWalkInput(""); setWalkLabel("");
  };





  const resetDay = () => { saveDayToHistory(); setMeals([]); setWalkSessions([]); };
  const historyKeys = Object.keys(history).sort((a,b)=>b.localeCompare(a)).slice(0,7);
  const showProfileSetup = !profileSaved || editingProfile;

  return (
    <div dir="rtl" style={{minHeight:"100vh",background:darkMode?"linear-gradient(135deg,#0d1117 0%,#161b27 50%,#0d1117 100%)":"linear-gradient(135deg,#f0f4f8 0%,#e2e8f0 50%,#f0f4f8 100%)",fontFamily:"'Tajawal','Cairo',sans-serif",color:darkMode?"#e2e8f0":"#1e293b",padding:"0 0 32px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .page{padding:13px}
        .card{background:${darkMode?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.8)"};border:1px solid ${darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"};border-radius:18px;padding:15px;margin-bottom:11px;backdrop-filter:blur(10px)}
        .section-title{font-size:11px;font-weight:700;letter-spacing:2px;color:${darkMode?"#64748b":"#94a3b8"};margin-bottom:11px;text-transform:uppercase}
        input,select,textarea{background:${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"};border:1px solid ${darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};border-radius:11px;color:${darkMode?"#e2e8f0":"#1e293b"};font-family:inherit;font-size:14px;padding:9px 12px;width:100%;outline:none;transition:border-color 0.2s}
        input:focus,select:focus,textarea:focus{border-color:#4ade80}
        input::placeholder,textarea::placeholder{color:${darkMode?"#475569":"#94a3b8"}}
        select option{background:${darkMode?"#1e293b":"#f8fafc"};color:${darkMode?"#e2e8f0":"#1e293b"}}
        label{font-size:11px;color:${darkMode?"#94a3b8":"#64748b"};margin-bottom:4px;display:block;font-weight:500}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .grid-4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px}
        .btn{border:none;border-radius:11px;color:white;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;padding:10px;width:100%;margin-top:8px;transition:opacity 0.2s}
        .btn:hover{opacity:0.88}
        .btn-green{background:linear-gradient(135deg,#22c55e,#16a34a)}
        .btn-orange{background:linear-gradient(135deg,#f97316,#ea580c)}
        .btn-purple{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
        .btn-blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
        .btn-teal{background:linear-gradient(135deg,#14b8a6,#0d9488)}
        .meal-row{display:flex;align-items:center;gap:6px;background:${darkMode?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"};border-radius:9px;padding:8px 10px;margin-bottom:6px;font-size:12px}
        .meal-name{flex:1;font-weight:600;font-size:12px}
        .meal-weight{color:${darkMode?"#94a3b8":"#64748b"};font-size:10px;white-space:nowrap}
        .meal-carb{color:#4ade80;font-size:10px;font-weight:600;white-space:nowrap}
        .remove-btn{background:rgba(239,68,68,0.15);border:none;border-radius:6px;color:#f87171;cursor:pointer;font-size:10px;padding:2px 6px;flex-shrink:0}
        .progress-bar{background:${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"};border-radius:100px;height:8px;overflow:hidden;margin:6px 0}
        .progress-fill{height:100%;border-radius:100px;transition:width 0.5s ease}
        .result-box{border-radius:12px;padding:11px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
        .result-label{font-size:11px;color:${darkMode?"#94a3b8":"#64748b"};font-weight:500}
        .result-value{font-size:18px;font-weight:900}
        .tag{display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:100px;margin-top:2px}
        .pulse{animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .camera-zone{border:2px dashed rgba(139,92,246,0.4);border-radius:13px;padding:18px;text-align:center;cursor:pointer;transition:border-color 0.2s;background:rgba(139,92,246,0.04)}
        .camera-zone:hover{border-color:rgba(139,92,246,0.8)}
        .tab-bar{display:flex;background:${darkMode?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.8)"};border-bottom:1px solid ${darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"};position:sticky;top:0;z-index:10;backdrop-filter:blur(10px)}
        .tab{flex:1;padding:12px 2px;text-align:center;font-size:10px;font-weight:700;color:${darkMode?"#475569":"#94a3b8"};cursor:pointer;border:none;background:none;font-family:inherit;transition:color 0.2s;border-bottom:2px solid transparent}
        .tab.active{color:#4ade80;border-bottom-color:#4ade80}
        .alert-box{background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:12px;padding:10px 13px;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;color:#fde047;font-weight:600}
        .hist-card{background:${darkMode?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.7)"};border:1px solid ${darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"};border-radius:12px;padding:12px;margin-bottom:8px}
        .fav-add-btn{background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.2);border-radius:8px;color:#4ade80;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;padding:5px 9px;white-space:nowrap}
        .stat-box{background:${darkMode?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)"};border:1px solid ${darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"};border-radius:11px;padding:9px 10px;text-align:center}
        .gender-btn{flex:1;padding:9px;border-radius:9px;border:1px solid ${darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};background:${darkMode?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"};color:${darkMode?"#64748b":"#94a3b8"};cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all 0.2s}
        .gender-btn.active{background:rgba(59,130,246,0.2);border-color:rgba(59,130,246,0.5);color:#60a5fa}
        .weight-pill{display:inline-flex;align-items:center;gap:5px;background:rgba(20,184,166,0.12);border:1px solid rgba(20,184,166,0.25);border-radius:20px;padding:4px 10px;font-size:11px;color:#2dd4bf;font-weight:600;cursor:pointer}
        .weight-pill:hover{background:rgba(20,184,166,0.2)}
      `}</style>

      {/* Header */}
      <div style={{textAlign:"center",padding:"16px 16px 6px",position:"relative"}}>
        {/* Theme toggle */}
        <button onClick={()=>setDarkMode(d=>!d)} style={{position:"absolute",left:12,top:16,background:darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",border:"none",borderRadius:20,cursor:"pointer",fontSize:16,padding:"5px 9px",lineHeight:1}}>
          {darkMode ? "☀️" : "🌙"}
        </button>
        <div style={{fontSize:28,marginBottom:2}}>🔥</div>
        <h1 style={{fontSize:18,fontWeight:900,color:"#f1f5f9"}}>متتبع الجلوكوز اليومي</h1>
        {hasProfile && !showProfileSetup && (
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"#475569"}}>احتياجك: <strong style={{color:"#4ade80"}}>{DAILY_GLUCOSE} غ</strong></span>
            {currentWeight && (
              <span className="weight-pill" onClick={()=>setTab("weight")}>
                ⚖️ {currentWeight} كجم
                {toGoal !== null && toGoal > 0 && <span style={{color:"#f87171"}}>• يتبقى {toGoal.toFixed(1)} للهدف</span>}
                {toGoal !== null && toGoal <= 0 && <span style={{color:"#4ade80"}}>• وصلت الهدف 🎉</span>}
              </span>
            )}
          </div>
        )}
        {/* About button */}
        <button onClick={()=>setShowAbout(s=>!s)}
          style={{marginTop:8,background:"none",border:"none",color:"#334155",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:20,textDecoration:"underline",textDecorationStyle:"dotted"}}>
          {showAbout ? "إخفاء فكرة التطبيق ▲" : "عن التطبيق ▾"}
        </button>
        {showAbout && (
          <div style={{margin:"8px 0 4px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"14px 16px",textAlign:"right",lineHeight:1.85}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10,textAlign:"center",letterSpacing:1}}>💡 فكرة التطبيق</div>
            <p style={{fontSize:11,color:"#64748b",marginBottom:9}}>
              جسم الإنسان يحتاج يومياً إلى كمية معينة من الجلوكوز والطاقة لتغذية الأعضاء الحيوية مثل الدماغ، الكبد، العضلات، وخلايا الجسم المختلفة. هذه الطاقة يحصل عليها الجسم عادةً من الطعام، خصوصاً الكربوهيدرات التي تتحول بعد الهضم إلى جلوكوز يُستخدم داخل الجسم.
            </p>
            <p style={{fontSize:11,color:"#64748b",marginBottom:9}}>
              فكرة التطبيق تقوم على تبسيط هذه العملية بطريقة سهلة وواضحة، بدل الدخول في تعقيدات السعرات الحرارية والأنظمة الغذائية التقليدية.
            </p>
            <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.1)",borderRadius:10,padding:"9px 12px",marginBottom:9}}>
              <div style={{fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:6}}>يقوم التطبيق بحساب:</div>
              {["كمية الجلوكوز التي دخلت الجسم من الطعام","كمية الطاقة التي استهلكها الجسم خلال المشي والنشاط","هل تم تغطية احتياج الجسم اليومي بالكامل أم لا","كمية الدهون التي قد يستخدمها الجسم لتعويض النقص"].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
                  <span style={{color:"#4ade80",fontSize:11,marginTop:1}}>✓</span>
                  <span style={{fontSize:11,color:"#64748b"}}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.1)",borderRadius:10,padding:"9px 12px",marginBottom:9}}>
              <div style={{fontSize:10,color:"#a5b4fc",fontWeight:700,marginBottom:6}}>كل ما يحتاجه المستخدم:</div>
              {["اختيار نوع الطعام أو تصويره","إدخال وزن الوجبة","إضافة مدة المشي أو النشاط اليومي"].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
                  <span style={{color:"#a5b4fc",fontSize:11,marginTop:1}}>{i+1}.</span>
                  <span style={{fontSize:11,color:"#64748b"}}>{t}</span>
                </div>
              ))}
            </div>
            <p style={{fontSize:11,color:"#64748b",marginBottom:12}}>
              ليقوم التطبيق تلقائياً بتحليل البيانات وتحويلها إلى معلومات مبسطة تساعد المستخدم على فهم كيفية استهلاك جسمه للطاقة، وإدارة وزنه أو خفض الدهون بطريقة أسهل وأكثر وعياً.
            </p>
            <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:10,textAlign:"center"}}>
              <span style={{fontSize:10,color:"#334155",fontWeight:600}}>فكرة وتطوير: </span>
              <span style={{fontSize:10,color:"#4ade80",fontWeight:800}}>عثمان الجعفر</span>
            </div>
          </div>
        )}
      </div>

      {/* Profile setup */}
      {showProfileSetup && (
        <div className="page">
          <div className="card" style={{border:"1px solid rgba(59,130,246,0.25)"}}>
            <div className="section-title">👤 بياناتك الشخصية</div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>أدخل بياناتك لحساب احتياجك بدقة (معادلة Mifflin-St Jeor)</div>
            <div style={{marginBottom:9}}>
              <label>الجنس</label>
              <div style={{display:"flex",gap:7}}>
                <button className={`gender-btn ${profileDraft.gender==="male"?"active":""}`} onClick={()=>setProfileDraft(p=>({...p,gender:"male"}))}>👨 ذكر</button>
                <button className={`gender-btn ${profileDraft.gender==="female"?"active":""}`} onClick={()=>setProfileDraft(p=>({...p,gender:"female"}))}>👩 أنثى</button>
              </div>
            </div>
            <div className="grid-3" style={{marginBottom:9}}>
              <div><label>الطول (سم)</label><input type="number" placeholder="175" value={profileDraft.height} onChange={e=>setProfileDraft(p=>({...p,height:e.target.value}))}/></div>
              <div><label>العمر (سنة)</label><input type="number" placeholder="30" value={profileDraft.age} onChange={e=>setProfileDraft(p=>({...p,age:e.target.value}))}/></div>
              <div><label>الهدف (كجم)</label><input type="number" placeholder="80" value={profileDraft.targetWeight} onChange={e=>setProfileDraft(p=>({...p,targetWeight:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:9}}>
              <label>وزنك الحالي (كجم) — يمكن تحديثه يومياً لاحقاً</label>
              <input type="number" placeholder="مثال: 90" value={weightInput} onChange={e=>setWeightInput(e.target.value)}/>
            </div>
            {parseFloat(profileDraft.height)>0 && parseFloat(profileDraft.age)>0 && parseFloat(weightInput)>0 && (()=>{
              const pb = calcBMR(parseFloat(weightInput),parseFloat(profileDraft.height),parseFloat(profileDraft.age),profileDraft.gender);
              const pg = calcDailyGlucose(pb);
              const pbmi = parseFloat(weightInput)/((parseFloat(profileDraft.height)/100)**2);
              const pbmiLabel = pbmi<18.5?"نقص وزن":pbmi<25?"وزن طبيعي":pbmi<30?"زيادة وزن":"سمنة";
              const pbmiColor = pbmi<18.5?"#60a5fa":pbmi<25?"#4ade80":pbmi<30?"#fde047":"#f87171";
              return (
                <div style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:12,padding:11,marginBottom:9}}>
                  <div style={{fontSize:10,color:"#60a5fa",fontWeight:700,marginBottom:8}}>📊 معاينة الحسابات</div>
                  <div className="grid-4">
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMR</div><div style={{fontSize:13,fontWeight:800,color:"#60a5fa"}}>{Math.round(pb)}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>TDEE</div><div style={{fontSize:13,fontWeight:800,color:"#a78bfa"}}>{Math.round(pb*1.2)}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>جلوكوز</div><div style={{fontSize:13,fontWeight:800,color:"#4ade80"}}>{pg}</div><div style={{fontSize:9,color:"#475569"}}>غ/يوم</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMI</div><div style={{fontSize:13,fontWeight:800,color:pbmiColor}}>{pbmi.toFixed(1)}</div><div style={{fontSize:9,color:pbmiColor}}>{pbmiLabel}</div></div>
                  </div>
                </div>
              );
            })()}
            <button className="btn btn-blue" onClick={()=>{ const val=parseFloat(weightInput); if(val>0){const today=todayKey();const nl=[{date:today,weight:val}];setWeightLog(nl);setCurrentWeight(val);saveStorage("weightLog",nl);} saveProfile(); }}>
              💾 حفظ البيانات والبدء
            </button>
            {profileSaved && <button onClick={()=>setEditingProfile(false)} style={{width:"100%",marginTop:7,background:"none",border:"none",color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:11,padding:"7px"}}>إلغاء</button>}
          </div>
        </div>
      )}

      {/* Main App */}
      {profileSaved && !showProfileSetup && (
        <>
          <div className="tab-bar">
            <button className={`tab ${tab==="today"?"active":""}`} onClick={()=>setTab("today")}>📅 اليوم</button>
            <button className={`tab ${tab==="weight"?"active":""}`} onClick={()=>setTab("weight")}>⚖️ الوزن</button>
            <button className={`tab ${tab==="report"?"active":""}`} onClick={()=>{saveDayToHistory();setTab("report");}}>📋 تقرير</button>
            <button className={`tab ${tab==="monthly"?"active":""}`} onClick={()=>{saveDayToHistory();setTab("monthly");}}>📆 شهري</button>
            <button className={`tab ${tab==="favorites"?"active":""}`} onClick={()=>setTab("favorites")}>★ مفضلة</button>
            <button className={`tab ${tab==="history"?"active":""}`} onClick={()=>{saveDayToHistory();setTab("history");}}>🗓 السجل</button>
          </div>

          {/* ===== WEIGHT TAB ===== */}
          {tab==="weight" && (
            <div className="page">
              {/* Log weight today */}
              <div className="card" style={{border:"1px solid rgba(20,184,166,0.25)"}}>
                <div className="section-title">⚖️ سجّل وزنك اليوم</div>
                <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                  <div style={{flex:1}}>
                    <label>الوزن (كجم)</label>
                    <input type="number" placeholder={currentWeight ? String(currentWeight) : "مثال: 90"} value={weightInput} onChange={e=>setWeightInput(e.target.value)} step="0.1"/>
                  </div>
                  <button onClick={logWeight} style={{background:"linear-gradient(135deg,#14b8a6,#0d9488)",border:"none",borderRadius:11,color:"white",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,padding:"9px 16px",marginBottom:0,flexShrink:0}}>
                    ✓ سجّل
                  </button>
                </div>
                <div style={{fontSize:10,color:"#475569",marginTop:6}}>💡 كل ما تسجّل وزن جديد تتحدث جميع الحسابات تلقائياً</div>
              </div>

              {/* Stats row */}
              {currentWeight && (
                <div className="grid-3" style={{marginBottom:11}}>
                  <div className="stat-box">
                    <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>الوزن الحالي</div>
                    <div style={{fontSize:17,fontWeight:800,color:"#2dd4bf"}}>{currentWeight}</div>
                    <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                  </div>
                  {targetW > 0 && (
                    <div className="stat-box">
                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>الهدف</div>
                      <div style={{fontSize:17,fontWeight:800,color:"#4ade80"}}>{targetW}</div>
                      <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                    </div>
                  )}
                  {targetW > 0 && toGoal !== null && (
                    <div className="stat-box">
                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{toGoal > 0 ? "يتبقى" : "تجاوزت"}</div>
                      <div style={{fontSize:17,fontWeight:800,color:toGoal>0?"#f87171":"#4ade80"}}>{Math.abs(toGoal).toFixed(1)}</div>
                      <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                    </div>
                  )}
                  {firstWeight && currentWeight !== firstWeight && (
                    <div className="stat-box">
                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>إجمالي الفقدان</div>
                      <div style={{fontSize:17,fontWeight:800,color:totalLost>0?"#4ade80":"#f87171"}}>{totalLost>0?"-":"+"}{Math.abs(totalLost).toFixed(1)}</div>
                      <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                    </div>
                  )}
                </div>
              )}

              {/* Chart */}
              {chartData.length >= 2 && (
                <div className="card">
                  <div className="section-title">📈 مسار الوزن</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{top:5,right:5,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="date" tick={{fontSize:9,fill:"#475569"}} tickLine={false} axisLine={false}/>
                      <YAxis domain={[chartMin, chartMax]} tick={{fontSize:9,fill:"#475569"}} tickLine={false} axisLine={false}/>
                      <Tooltip content={<CustomTooltip targetWeight={targetW||null}/>}/>
                      {targetW > 0 && <ReferenceLine y={targetW} stroke="#4ade80" strokeDasharray="4 4" strokeWidth={1.5} label={{value:"الهدف",position:"insideTopRight",fontSize:9,fill:"#4ade80"}}/>}
                      <Line type="monotone" dataKey="weight" stroke="#2dd4bf" strokeWidth={2.5} dot={{fill:"#2dd4bf",r:3,strokeWidth:0}} activeDot={{r:5,fill:"#2dd4bf"}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartData.length === 1 && (
                <div className="card" style={{textAlign:"center",padding:"18px 0",color:"#475569",fontSize:12}}>
                  <div style={{fontSize:24,marginBottom:7}}>📈</div>
                  <div>سجّل وزنك غداً لترى الرسم البياني</div>
                  <div style={{fontSize:10,marginTop:3}}>يحتاج تسجيلين على الأقل</div>
                </div>
              )}

              {/* Weight log list */}
              {weightLog.length > 0 && (
                <div className="card">
                  <div className="section-title">📋 سجل القياسات</div>
                  {[...weightLog].reverse().slice(0,10).map((e,i)=>{
                    const prev = weightLog[weightLog.length - 1 - i - 1];
                    const diff = prev ? (e.weight - prev.weight) : null;
                    return (
                      <div key={e.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:12}}>
                        <span style={{color:"#94a3b8",fontSize:11}}>{formatDateFull(e.date)}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {diff !== null && (
                            <span style={{fontSize:10,color:diff<0?"#4ade80":diff>0?"#f87171":"#64748b",fontWeight:600}}>
                              {diff<0?"▼":diff>0?"▲":"—"} {Math.abs(diff).toFixed(1)}
                            </span>
                          )}
                          <span style={{fontWeight:800,color:"#2dd4bf"}}>{e.weight} كجم</span>
                          <button onClick={()=>{ const nl=weightLog.filter(x=>x.date!==e.date); setWeightLog(nl); if(nl.length>0)setCurrentWeight(nl[nl.length-1].weight); else setCurrentWeight(null); }} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:5,color:"#f87171",cursor:"pointer",fontSize:10,padding:"2px 5px"}}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fat Counter */}
              {totalFatTarget && (
                <div className="card" style={{border:"1px solid rgba(251,146,60,0.3)",marginTop:4}}>
                  <div className="section-title">🔥 عداد الدهون المخزنة</div>
                  <div style={{textAlign:"center",marginBottom:12}}>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>إجمالي الدهون المستهدف حرقها</div>
                    <div style={{fontSize:32,fontWeight:900,color:"#fb923c"}}>{fatRemaining?.toLocaleString()} <span style={{fontSize:14,fontWeight:400}}>غ</span></div>
                    <div style={{fontSize:10,color:"#475569",marginTop:2}}>متبقي من أصل {totalFatTarget?.toLocaleString()} غ</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.06)",borderRadius:100,height:12,overflow:"hidden",margin:"8px 0"}} >
                    <div style={{height:"100%",borderRadius:100,background:"linear-gradient(90deg,#f97316,#fbbf24)",width:,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:10}}>
                    <span style={{color:"#4ade80",fontWeight:700}}>✅ محروق: {fatBurned.toLocaleString()} غ</span>
                    <span style={{color:"#fb923c",fontWeight:700}}>{fatPct.toFixed(1)}%</span>
                  </div>
                  {fatBurned > 0 && (
                    <div style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:10,padding:"9px 12px",fontSize:11,color:"#94a3b8",lineHeight:1.7,textAlign:"center"}}>
                      🎉 أحرقت ما يعادل <strong style={{color:"#4ade80"}}>{(fatBurned/855).toFixed(1)} كجم</strong> دهون حقيقية!
                    </div>
                  )}
                  {fatBurned === 0 && (
                    <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>
                      سجّل وزنك بانتظام لترى العداد يتحرك 💪
                    </div>
                  )}
                </div>
              )}

              <button onClick={()=>{setProfileDraft({...profile});setEditingProfile(true);}} style={{width:"100%",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:11,color:"#60a5fa",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,padding:"10px",marginTop:4}}>
                ✏️ تعديل الهدف أو البيانات
              </button>

              {/* ── Correlation: Weight vs Glucose ── */}
              {weightLog.length >= 2 && Object.keys(history).length >= 2 && (()=>{
                // Match weight log dates with history dates
                const pairs = weightLog.map(w => {
                  const h = history[w.date];
                  return h ? { date: w.date, weight: w.weight, glucose: h.totalIn, deficit: h.netNeed > 0 } : null;
                }).filter(Boolean);

                if (pairs.length < 2) return (
                  <div className="card" style={{border:"1px solid rgba(99,102,241,0.15)",textAlign:"center",padding:"16px 0",color:"#475569",fontSize:11}}>
                    <div style={{fontSize:20,marginBottom:5}}>🔗</div>
                    سجّل وزنك في نفس أيام تسجيل الأكل لرؤية تحليل الارتباط
                  </div>
                );

                // Count correlation patterns
                const deficitDays   = pairs.filter(p => p.deficit);
                const surplusDays   = pairs.filter(p => !p.deficit);
                const avgWeightDeficit = deficitDays.length ? deficitDays.reduce((s,p)=>s+p.weight,0)/deficitDays.length : null;
                const avgWeightSurplus = surplusDays.length ? surplusDays.reduce((s,p)=>s+p.weight,0)/surplusDays.length : null;
                const trendPositive = avgWeightDeficit !== null && avgWeightSurplus !== null && avgWeightDeficit < avgWeightSurplus;

                // Combined chart data
                const chartCorr = pairs.slice(-14).map(p=>({
                  date: formatDateShort(p.date),
                  weight: p.weight,
                  glucose: Math.round(p.glucose),
                  deficit: p.deficit,
                }));

                return (
                  <div className="card" style={{border:"1px solid rgba(99,102,241,0.2)"}}>
                    <div className="section-title">🔗 ارتباط الوزن بالجلوكوز</div>

                    <div className="grid-2" style={{marginBottom:11}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام النقص</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{deficitDays.length}</div>
                        {avgWeightDeficit && <div style={{fontSize:9,color:"#475569"}}>متوسط وزن {avgWeightDeficit.toFixed(1)} كجم</div>}
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام الفائض</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#f87171"}}>{surplusDays.length}</div>
                        {avgWeightSurplus && <div style={{fontSize:9,color:"#475569"}}>متوسط وزن {avgWeightSurplus.toFixed(1)} كجم</div>}
                      </div>
                    </div>

                    {/* Insight */}
                    <div style={{background: trendPositive?"rgba(74,222,128,0.07)":"rgba(239,68,68,0.06)", border:`1px solid ${trendPositive?"rgba(74,222,128,0.15)":"rgba(239,68,68,0.12)"}`, borderRadius:10, padding:"10px 12px", marginBottom:11, fontSize:11, lineHeight:1.7}}>
                      <span style={{fontWeight:700,color:trendPositive?"#4ade80":"#f87171"}}>
                        {trendPositive ? "✅ النمط إيجابي" : "⚠️ النمط يحتاج انتباه"}
                      </span>
                      <br/>
                      {trendPositive
                        ? `في أيام نقص الجلوكوز كان وزنك أقل بـ ${(avgWeightSurplus - avgWeightDeficit).toFixed(1)} كجم مقارنةً بأيام الفائض — الجسم يحرق الدهون فعلاً عند النقص.`
                        : deficitDays.length === 0
                          ? "ما في أيام نقص مسجّلة بعد. حاول تبقى تحت الاحتياج اليومي لترى تأثيره على وزنك."
                          : "البيانات المسجّلة لا تُظهر ارتباطاً واضحاً بعد. استمر بالتسجيل لترى النمط."
                      }
                    </div>

                    {/* Dual chart */}
                    {chartCorr.length >= 2 && (
                      <>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:6,display:"flex",gap:12}}>
                          <span><span style={{color:"#2dd4bf"}}>●</span> الوزن (كجم)</span>
                          <span><span style={{color:"#a78bfa"}}>●</span> جلوكوز دخل (غ)</span>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartCorr} margin={{top:4,right:4,left:-25,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                            <XAxis dataKey="date" tick={{fontSize:8,fill:"#475569"}} tickLine={false} axisLine={false}/>
                            <YAxis yAxisId="w" orientation="right" tick={{fontSize:8,fill:"#2dd4bf"}} tickLine={false} axisLine={false}/>
                            <YAxis yAxisId="g" orientation="left" tick={{fontSize:8,fill:"#a78bfa"}} tickLine={false} axisLine={false}/>
                            <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:11,direction:"rtl"}} labelStyle={{color:"#94a3b8"}}/>
                            <Line yAxisId="w" type="monotone" dataKey="weight" stroke="#2dd4bf" strokeWidth={2} dot={{r:3,fill:"#2dd4bf",strokeWidth:0}} name="الوزن"/>
                            <Line yAxisId="g" type="monotone" dataKey="glucose" stroke="#a78bfa" strokeWidth={2} dot={{r:3,fill:"#a78bfa",strokeWidth:0}} name="الجلوكوز"/>
                          </LineChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ===== TODAY TAB ===== */}
          {tab==="today" && (
            <div className="page">
              {near80 && <div className="alert-box"><span style={{fontSize:17}}>⚠️</span><span>وصلت {pct.toFixed(0)}% من احتياجك! تبقى لك <strong>{(DAILY_GLUCOSE-totalIn).toFixed(0)} غ</strong></span></div>}
              {over100 && <div className="alert-box" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171"}}><span style={{fontSize:17}}>🚨</span><span>تجاوزت الاحتياج بـ <strong>{surplus.toFixed(1)} غ</strong></span></div>}

              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",marginBottom:3}}>
                  <span>الاحتياج اليومي ({DAILY_GLUCOSE} غ)</span>
                  <span style={{fontWeight:700,color:over100?"#f87171":near80?"#fde047":"#4ade80"}}>{pct.toFixed(0)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${pct}%`,background:over100?"linear-gradient(90deg,#f87171,#ef4444)":near80?"linear-gradient(90deg,#fde047,#f59e0b)":"linear-gradient(90deg,#4ade80,#22c55e)"}}/>
                </div>
                <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>{totalIn.toFixed(1)} غ من أصل {DAILY_GLUCOSE} غ</div>
              </div>
              {/* Add manually */}
              <div className="card">
                <div className="section-title">➕ أضف وجبة يدوياً</div>
                <div style={{marginBottom:8}}><label>اختر من القائمة</label>
                  <select value={selectedPreset} onChange={handlePreset}>
                    <option value="">— اختر أكلة شائعة —</option>
                    {["نشويات","محليات","فواكه","لحوم وبروتين","ألبان","مكسرات","مشروبات","شوكولاتة","كي دي دي","المراعي","الصافي","كتكو","وجبات سعودية"].map(cat=>(
                      <optgroup key={cat} label={"── "+cat+" ──"}>
                        {FOOD_PRESETS.filter(f=>f.category===cat).map(f=>
                          <option key={f.name} value={f.name}>
                            {f.name} ({f.carbPer100} غ/100غ{f.defaultWeight ? ` • ${f.defaultWeight}غ` : ""})
                          </option>
                        )}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{marginBottom:8}}><label>اسم الأكلة</label><input placeholder="مثال: أرز، خبز، تمر..." value={foodName} onChange={e=>setFoodName(e.target.value)}/></div>
                <div className="grid-2">
                  <div><label>الوزن (غ)</label><input type="number" placeholder="200" value={foodWeight} onChange={e=>setFoodWeight(e.target.value)}/></div>
                  <div><label>الكارب/100غ</label><input type="number" placeholder="28" value={carbPer100} onChange={e=>setCarbPer100(e.target.value)}/></div>
                </div>
                {/* Show protein input only if not in presets */}
                {foodName && !FOOD_PRESETS.find(f=>f.name===foodName)?.proteinPer100 && (
                  <div style={{marginTop:8}}><label>بروتين/100غ (اختياري)</label><input type="number" placeholder="مثال: 25" value={proteinInput} onChange={e=>setProteinInput(e.target.value)}/></div>
                )}
                <button className="btn btn-green" onClick={addMealManual}>إضافة الوجبة</button>
              </div>

              {meals.length>0 && (
                <div className="card">
                  <div className="section-title">🍽 الوجبات</div>
                  {meals.map((m,i)=><MealRow key={m.id} meal={m} onRemove={()=>setMeals(p=>p.filter((_,idx)=>idx!==i))} onSave={()=>saveFavorite(m)} isFav={isFav(m)}/>)}
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:8,marginTop:2,display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <span style={{color:"#94a3b8"}}>المجموع</span>
                    <span style={{color:"#4ade80",fontWeight:800}}>{totalIn.toFixed(1)} غ</span>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="section-title">🏃 أضف نشاط</div>
                <div style={{marginBottom:8}}>
                  <label>نوع النشاط</label>
                  <select value={walkActivityId} onChange={e=>setWalkActivityId(e.target.value)}>
                    {ACTIVITIES.map(a=><option key={a.id} value={a.id}>{a.label} (MET {a.met})</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div><label>الدقائق</label><input type="number" placeholder="30" value={walkInput} onChange={e=>setWalkInput(e.target.value)}/></div>
                  <div><label>التوقيت (اختياري)</label><input placeholder="الصبح" value={walkLabel} onChange={e=>setWalkLabel(e.target.value)}/></div>
                </div>
                {walkInput && parseFloat(walkInput)>0 && w>0 && (()=>{
                  const act = ACTIVITIES.find(a=>a.id===walkActivityId)||ACTIVITIES[1];
                  const preview = calcActivityBurn(parseFloat(walkInput), w, act.met);
                  return <div style={{fontSize:11,color:"#fb923c",fontWeight:600,textAlign:"center",marginTop:6}}>≈ {preview.toFixed(1)} غ جلوكوز ستُحرق</div>;
                })()}
                <button className="btn btn-orange" onClick={addWalkSession}>➕ إضافة النشاط</button>
                {walkSessions.length>0 && <div style={{marginTop:10}}>
                  {walkSessions.map((s,i)=><WalkRow key={s.id} session={s} onRemove={()=>setWalkSessions(p=>p.filter((_,idx)=>idx!==i))}/>)}
                  <div style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:8,padding:"7px 10px",marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <span style={{color:"#94a3b8"}}>الإجمالي: {totalWalkMin} دقيقة</span>
                    <span style={{color:"#fb923c",fontWeight:800}}>{totalWalkBurn.toFixed(1)} غ محروقة</span>
                  </div>
                </div>}
              </div>

              {/* Daily Note */}
              <div className="card">
                <div className="section-title">📝 ملاحظة اليوم</div>
                <textarea
                  placeholder="كيف حسّيت اليوم؟ أي ملاحظات على الأكل أو النشاط..."
                  value={dailyNote}
                  onChange={e=>setDailyNote(e.target.value)}
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:11,color:darkMode?"#e2e8f0":"#1e293b",fontFamily:"inherit",fontSize:13,padding:"10px 12px",width:"100%",outline:"none",resize:"none",minHeight:80,lineHeight:1.6}}
                />
              </div>

              {/* Summary + Share */}
              <div className="card" ref={reportRef}>
                <div className="section-title">📊 الملخص النهائي</div>

                {/* Protein tracker */}
                {DAILY_PROTEIN > 0 && (()=>{
                  const protPct = Math.min(100,(totalProteinIn/DAILY_PROTEIN)*100);
                  const protRemain = Math.max(0, DAILY_PROTEIN - totalProteinIn);
                  return (
                    <div style={{background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.15)",borderRadius:12,padding:"11px 13px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                        <span style={{color:"#94a3b8",fontWeight:600}}>💪 البروتين اليومي ({DAILY_PROTEIN} غ)</span>
                        <span style={{color:protPct>=100?"#4ade80":"#60a5fa",fontWeight:700}}>{protPct.toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar" style={{margin:"4px 0 6px"}}>
                        <div className="progress-fill" style={{width:`${protPct}%`,background:protPct>=100?"linear-gradient(90deg,#4ade80,#22c55e)":"linear-gradient(90deg,#60a5fa,#3b82f6)"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                        <span style={{color:"#60a5fa"}}>{totalProteinIn.toFixed(1)} غ مُغطّى</span>
                        {protRemain > 0
                          ? <span style={{color:"#f87171"}}>يتبقى {protRemain.toFixed(1)} غ</span>
                          : <span style={{color:"#4ade80"}}>✅ الهدف مكتمل!</span>
                        }
                      </div>
                    </div>
                  );
                })()}
                <div className="result-box" style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)"}}><div><div className="result-label">دخل من الأكل</div></div><div className="result-value" style={{color:"#4ade80"}}>{totalIn.toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div></div>
                {totalWalkBurn>0 && <div className="result-box" style={{background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.15)"}}><div><div className="result-label">انحرق بالنشاط</div></div><div className="result-value" style={{color:"#fb923c"}}>{totalWalkBurn.toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div></div>}
                <div className="result-box" style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)"}}>
                  <div><div className="result-label">المتبقي من الاحتياج</div>{netNeed<=0&&<span className="tag" style={{background:"rgba(239,68,68,0.2)",color:"#f87171"}}>فائض</span>}{netNeed>0&&<span className="tag" style={{background:"rgba(99,102,241,0.2)",color:"#a5b4fc"}}>ناقص</span>}</div>
                  <div className="result-value" style={{color:netNeed<=0?"#f87171":"#a5b4fc"}}>{(netNeed>0?netNeed:surplus).toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div>
                </div>
                {netNeed>0 && <div className="result-box" style={{background:"rgba(234,179,8,0.07)",border:"1px solid rgba(234,179,8,0.15)"}}><div><div className="result-label">الدهون المحتمل حرقها</div><span className="tag" style={{background:"rgba(234,179,8,0.2)",color:"#fde047"}}>لتعويض النقص</span></div><div className="result-value" style={{color:"#fde047"}}>{fatBurn.toFixed(1)} <span style={{fontSize:11,fontWeight:400}}>غ</span></div></div>}
                {netNeed<=0 && <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:10,padding:"8px 12px",textAlign:"center",fontSize:11,color:"#f87171"}}>⚠️ تجاوزت الاحتياج بـ {surplus.toFixed(1)} غ</div>}

                {/* Share as text */}
                <button onClick={()=>{
                  const today = new Date().toLocaleDateString("ar-SA");
                  const lines = [
                    `📊 تقرير يومي — ${today}`,
                    `━━━━━━━━━━━━━━━━`,
                    `🍽 دخل من الأكل: ${totalIn.toFixed(1)} غ كارب`,
                    totalProteinIn > 0 ? `💪 البروتين: ${totalProteinIn.toFixed(1)} غ من ${DAILY_PROTEIN} غ` : null,
                    totalWalkBurn>0 ? `🏃 انحرق بالنشاط: ${totalWalkBurn.toFixed(1)} غ` : null,
                    `📉 المتبقي: ${(netNeed>0?netNeed:surplus).toFixed(1)} غ (${netNeed>0?"ناقص":"فائض"})`,
                    netNeed>0 ? `🔥 دهون محتمل حرقها: ${fatBurn.toFixed(1)} غ` : null,
                    dailyNote ? `\n📝 ${dailyNote}` : null,
                    `━━━━━━━━━━━━━━━━`,
                    `فكرة وتطوير: عثمان الجعفر`,
                  ].filter(Boolean).join("\n");
                  if (navigator.share) navigator.share({ text: lines });
                  else { navigator.clipboard?.writeText(lines); alert("تم نسخ التقرير!"); }
                }} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:10,color:"white",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,padding:"10px"}}>
                  📤 مشاركة التقرير
                </button>
              </div>

              <button onClick={resetDay} style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,padding:"10px"}}>🔄 إنهاء اليوم وحفظه في السجل</button>
              <div style={{textAlign:"center",fontSize:10,color:"#334155",paddingTop:9}}>1 غ دهون = 9 سعرات · 1 غ جلوكوز = 4 سعرات</div>
            </div>
          )}

          {/* ===== PROFILE TAB ===== */}
          {tab==="profile" && (
            <div className="page">
              <div className="card" style={{border:"1px solid rgba(59,130,246,0.2)"}}>
                <div className="section-title">👤 بياناتك</div>
                <div className="grid-4" style={{marginBottom:11}}>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>الوزن</div><div style={{fontSize:15,fontWeight:800,color:"#2dd4bf"}}>{currentWeight||"—"}</div><div style={{fontSize:9,color:"#475569"}}>كجم</div></div>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>الطول</div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{h||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سم</div></div>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>العمر</div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{a||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سنة</div></div>
                  <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>الهدف</div><div style={{fontSize:15,fontWeight:800,color:"#4ade80"}}>{targetW||"—"}</div><div style={{fontSize:9,color:"#475569"}}>كجم</div></div>
                </div>
                <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:11,marginBottom:11}}>
                  <div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:9}}>📊 الحسابات</div>
                  <div className="grid-4">
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMR</div><div style={{fontSize:14,fontWeight:800,color:"#60a5fa"}}>{Math.round(bmr)||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>TDEE</div><div style={{fontSize:14,fontWeight:800,color:"#a78bfa"}}>{tdee||"—"}</div><div style={{fontSize:9,color:"#475569"}}>سعرة</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>جلوكوز</div><div style={{fontSize:14,fontWeight:800,color:"#4ade80"}}>{DAILY_GLUCOSE}</div><div style={{fontSize:9,color:"#475569"}}>غ/يوم</div></div>
                    <div className="stat-box"><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>BMI</div><div style={{fontSize:14,fontWeight:800,color:bmiColor}}>{bmi.toFixed(1)||"—"}</div><div style={{fontSize:9,color:bmiColor}}>{bmiLabel}</div></div>
                  </div>
                </div>
                <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.1)",borderRadius:10,padding:"9px 12px",fontSize:10,color:"#64748b",lineHeight:1.7}}>
                  💡 <strong style={{color:"#4ade80"}}>كيف يُحسب الجلوكوز؟</strong><br/>
                  BMR بمعادلة Mifflin-St Jeor × 1.2 (نشاط خفيف) = TDEE، ثم 55% منها ÷ 4 = غرام جلوكوز يومي. يتحدث تلقائياً مع كل تسجيل وزن جديد.
                </div>
                <button className="btn btn-blue" style={{marginTop:11}} onClick={()=>{setProfileDraft({...profile});setEditingProfile(true);}}>✏️ تعديل البيانات</button>
              </div>
            </div>
          )}

          {/* ===== REPORT TAB ===== */}
          {tab==="report" && (
            <div className="page">

              {/* Weekly reminder settings */}
              <div className="card" style={{border:"1px solid rgba(234,179,8,0.2)"}}>
                <div className="section-title">🔔 تذكير أسبوعي بتسجيل الوزن</div>
                {showReminder && (
                  <div style={{background:"rgba(234,179,8,0.12)",border:"1px solid rgba(234,179,8,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12,color:"#fde047",fontWeight:600}}>
                    ⏰ حان وقت قياس وزنك الأسبوعي! اذهب لتاب الوزن وسجّل 💪
                  </div>
                )}
                <div className="grid-2" style={{marginBottom:8}}>
                  <div>
                    <label>اليوم</label>
                    <select value={reminderDay} onChange={e=>setReminderDay(e.target.value)}>
                      <option value="0">الأحد</option>
                      <option value="1">الاثنين</option>
                      <option value="2">الثلاثاء</option>
                      <option value="3">الأربعاء</option>
                      <option value="4">الخميس</option>
                      <option value="5">الجمعة</option>
                      <option value="6">السبت</option>
                    </select>
                  </div>
                  <div>
                    <label>الوقت</label>
                    <select value={reminderHour} onChange={e=>setReminderHour(e.target.value)}>
                      {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(h=>(
                        <option key={h} value={String(h)}>{h<12?`${h} صباحاً`:h===12?"12 ظهراً":`${h-12} مساءً`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={()=>setReminderSet(r=>!r)}
                  style={{width:"100%",background:reminderSet?"rgba(234,179,8,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${reminderSet?"rgba(234,179,8,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:reminderSet?"#fde047":"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,padding:"10px"}}>
                  {reminderSet ? "🔔 التذكير مُفعّل — اضغط لإيقافه" : "🔕 تفعيل التذكير"}
                </button>
                {reminderSet && (
                  <div style={{fontSize:10,color:"#475569",textAlign:"center",marginTop:6}}>
                    سيظهر تنبيه كل {["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][parseInt(reminderDay)]} الساعة {parseInt(reminderHour)<12?`${reminderHour} صباحاً`:parseInt(reminderHour)===12?"12 ظهراً":`${parseInt(reminderHour)-12} مساءً`} عند فتح التطبيق
                  </div>
                )}
              </div>

              {/* Goal ETA */}
              <div className="card" style={{border:"1px solid rgba(74,222,128,0.2)"}}>
                <div className="section-title">🎯 حاسبة الوصول للهدف</div>
                {!targetW ? (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>🎯</div>
                    <div>ما حددت هدفاً بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>اضغط "تعديل البيانات" في تاب الوزن وأضف هدفك</div>
                  </div>
                ) : goalETA?.reached ? (
                  <div style={{textAlign:"center",padding:"14px 0"}}>
                    <div style={{fontSize:32,marginBottom:6}}>🎉</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#4ade80"}}>وصلت لهدفك!</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:4}}>الهدف: {targetW} كجم • الحالي: {currentWeight} كجم</div>
                  </div>
                ) : goalETA?.noProgress ? (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#f87171",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>📈</div>
                    <div>الوزن لم ينخفض بعد</div>
                    <div style={{fontSize:10,marginTop:3,color:"#475569"}}>سجّل وزنك بانتظام لترى التقدم</div>
                  </div>
                ) : goalETA ? (
                  <div>
                    <div className="grid-2" style={{marginBottom:10}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>معدل الخسارة</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{goalETA.kgPerWeek}</div>
                        <div style={{fontSize:9,color:"#475569"}}>كجم/أسبوع</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>المتبقي للهدف</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fb923c"}}>{goalETA.remaining}</div>
                        <div style={{fontSize:9,color:"#475569"}}>كجم</div>
                      </div>
                    </div>
                    <div style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>بهذا المعدل ستصل للهدف خلال</div>
                      <div style={{fontSize:20,fontWeight:900,color:"#4ade80"}}>{goalETA.weeks} أسبوع</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:4}}>تقريباً في {goalETA.eta}</div>
                    </div>
                    <div style={{fontSize:10,color:"#475569",marginTop:8,textAlign:"center"}}>
                      💡 الحساب بناءً على معدل خسارتك الفعلي من سجل الوزن
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>⚖️</div>
                    <div>سجّل وزنك مرتين على الأقل لحساب الوقت</div>
                  </div>
                )}
              </div>

              {/* Weekly report */}
              <div className="card" style={{border:"1px solid rgba(139,92,246,0.2)"}}>
                <div className="section-title">📋 التقرير الأسبوعي</div>
                {!weeklyReport ? (
                  <div style={{textAlign:"center",padding:"14px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>📋</div>
                    <div>ما في بيانات كافية بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>استخدم "إنهاء اليوم" يومياً لتراكم البيانات</div>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:10,color:"#64748b",marginBottom:10}}>آخر {weeklyReport.count} أيام مسجّلة</div>

                    <div className="grid-2" style={{marginBottom:10}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>متوسط الجلوكوز</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{weeklyReport.avgGlucose.toFixed(0)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غ/يوم</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>إجمالي الدهون المحروقة</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fde047"}}>{weeklyReport.totalFat.toFixed(1)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غرام دهون</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام تجاوزت الحد</div>
                        <div style={{fontSize:16,fontWeight:800,color:weeklyReport.daysOver>0?"#f87171":"#4ade80"}}>{weeklyReport.daysOver}</div>
                        <div style={{fontSize:9,color:"#475569"}}>من {weeklyReport.count}</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>جلوكوز المشي</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fb923c"}}>{weeklyReport.totalWalkB.toFixed(0)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غ محروق</div>
                      </div>
                    </div>

                    {weeklyReport.best && (
                      <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.12)",borderRadius:10,padding:"9px 12px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:10,color:"#4ade80",fontWeight:700}}>🏆 أفضل يوم</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{formatDateFull(weeklyReport.best.key)}</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#fde047"}}>{(weeklyReport.best.fatBurn||0).toFixed(1)} غ دهون</div>
                          <div style={{fontSize:10,color:"#64748b"}}>جلوكوز: {weeklyReport.best.totalIn.toFixed(0)} غ</div>
                        </div>
                      </div>
                    )}

                    {weeklyReport.worst && weeklyReport.worst.key !== weeklyReport.best?.key && (
                      <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:10,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:10,color:"#f87171",fontWeight:700}}>📉 يوم يحتاج تحسين</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{formatDateFull(weeklyReport.worst.key)}</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#f87171"}}>{(weeklyReport.worst.fatBurn||0).toFixed(1)} غ دهون</div>
                          <div style={{fontSize:10,color:"#64748b"}}>جلوكوز: {weeklyReport.worst.totalIn.toFixed(0)} غ</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ===== MONTHLY TAB ===== */}
          {tab==="monthly" && (()=>{
            const allKeys = Object.keys(history).sort((a,b)=>a.localeCompare(b));
            const now = new Date();
            const thisMonth = allKeys.filter(k => k.startsWith(now.toISOString().slice(0,7)));
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
            const lastMonth = allKeys.filter(k => k.startsWith(lastMonthDate.toISOString().slice(0,7)));

            const calcStats = (keys) => {
              if (!keys.length) return null;
              const days = keys.map(k=>history[k]);
              const avgGlucose = days.reduce((s,d)=>s+d.totalIn,0)/days.length;
              const totalFat = days.reduce((s,d)=>s+(d.fatBurn||0),0);
              const totalWalkBurn = days.reduce((s,d)=>s+(d.totalWalkBurn||0),0);
              const daysOver = days.filter(d=>d.totalIn>DAILY_GLUCOSE).length;
              const daysDeficit = days.length - daysOver;
              const best = [...days].sort((a,b)=>(b.fatBurn||0)-(a.fatBurn||0))[0];
              const bestKey = keys[days.indexOf(best)];
              return { avgGlucose, totalFat, totalWalkBurn, daysOver, daysDeficit, best, bestKey, count:keys.length };
            };

            const thisStats = calcStats(thisMonth);
            const lastStats = calcStats(lastMonth);

            // Weight change this month
            const monthWeights = weightLog.filter(e=>e.date.startsWith(now.toISOString().slice(0,7)));
            const weightChange = monthWeights.length>=2 ? (monthWeights[monthWeights.length-1].weight - monthWeights[0].weight) : null;

            // Chart: glucose per day this month
            const chartMonthly = thisMonth.map(k=>({
              date: formatDateShort(k),
              glucose: Math.round(history[k].totalIn),
              fat: parseFloat((history[k].fatBurn||0).toFixed(1)),
            }));

            return (
              <div className="page">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:darkMode?"#f1f5f9":"#1e293b"}}>
                    {now.toLocaleString("ar-SA",{month:"long",year:"numeric"})}
                  </div>
                  {lastStats && <div style={{fontSize:10,color:"#64748b"}}>مقارنة بالشهر الماضي</div>}
                </div>

                {!thisStats ? (
                  <div className="card" style={{textAlign:"center",padding:"22px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:28,marginBottom:7}}>📆</div>
                    <div>ما في بيانات هذا الشهر بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>استخدم "إنهاء اليوم" يومياً لتراكم البيانات</div>
                  </div>
                ) : (
                  <>
                    {/* Key stats */}
                    <div className="grid-2" style={{marginBottom:10}}>
                      {[
                        { label:"أيام مسجّلة", val:thisStats.count, color:"#94a3b8", prevVal:lastStats?.count },
                        { label:"متوسط الجلوكوز", val:thisStats.avgGlucose.toFixed(0)+" غ", color:"#4ade80", prevVal:lastStats?.avgGlucose.toFixed(0)+" غ" },
                        { label:"إجمالي دهون محروقة", val:thisStats.totalFat.toFixed(1)+" غ", color:"#fde047", prevVal:lastStats?.totalFat.toFixed(1)+" غ" },
                        { label:"أيام ضمن الهدف", val:thisStats.daysDeficit, color:"#60a5fa", prevVal:lastStats?.daysDeficit },
                      ].map((s,i)=>(
                        <div key={i} className="stat-box">
                          <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
                          {s.prevVal !== undefined && <div style={{fontSize:9,color:"#475569"}}>الشهر الماضي: {s.prevVal}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Weight change */}
                    {weightChange !== null && (
                      <div className="card" style={{background:weightChange<0?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.05)",border:`1px solid ${weightChange<0?"rgba(74,222,128,0.15)":"rgba(239,68,68,0.12)"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>تغيّر الوزن هذا الشهر</div>
                            <div style={{fontSize:10,color:"#475569"}}>{monthWeights[0].weight} → {monthWeights[monthWeights.length-1].weight} كجم</div>
                          </div>
                          <div style={{fontSize:22,fontWeight:900,color:weightChange<0?"#4ade80":"#f87171"}}>
                            {weightChange<0?"▼":"▲"} {Math.abs(weightChange).toFixed(1)} كجم
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Best day */}
                    {thisStats.best && (
                      <div className="card" style={{border:"1px solid rgba(234,179,8,0.15)"}}>
                        <div className="section-title">🏆 أفضل يوم هذا الشهر</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:12,fontWeight:700,color:darkMode?"#f1f5f9":"#1e293b"}}>{formatDateFull(thisStats.bestKey)}</div>
                            <div style={{fontSize:10,color:"#64748b",marginTop:2}}>جلوكوز: {thisStats.best.totalIn.toFixed(0)} غ</div>
                          </div>
                          <div style={{textAlign:"left"}}>
                            <div style={{fontSize:16,fontWeight:900,color:"#fde047"}}>{(thisStats.best.fatBurn||0).toFixed(1)} غ</div>
                            <div style={{fontSize:9,color:"#64748b"}}>دهون محروقة</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Monthly chart */}
                    {chartMonthly.length >= 3 && (
                      <div className="card">
                        <div className="section-title">📈 جلوكوز يومي — هذا الشهر</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={chartMonthly} margin={{top:4,right:4,left:-25,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                            <XAxis dataKey="date" tick={{fontSize:8,fill:"#475569"}} tickLine={false} axisLine={false}/>
                            <YAxis tick={{fontSize:8,fill:"#4ade80"}} tickLine={false} axisLine={false}/>
                            <ReferenceLine y={DAILY_GLUCOSE} stroke="#4ade80" strokeDasharray="3 3" strokeWidth={1}/>
                            <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:11,direction:"rtl"}} labelStyle={{color:"#94a3b8"}}/>
                            <Line type="monotone" dataKey="glucose" stroke="#4ade80" strokeWidth={2} dot={{r:2,fill:"#4ade80",strokeWidth:0}} name="الجلوكوز"/>
                          </LineChart>
                        </ResponsiveContainer>
                        <div style={{fontSize:9,color:"#64748b",textAlign:"center",marginTop:4}}>الخط الأخضر = الاحتياج اليومي ({DAILY_GLUCOSE} غ)</div>
                      </div>
                    )}

                    {/* Comparison with last month */}
                    {lastStats && (
                      <div className="card" style={{border:"1px solid rgba(99,102,241,0.15)"}}>
                        <div className="section-title">📊 مقارنة بالشهر الماضي</div>
                        {[
                          { label:"متوسط الجلوكوز", this:thisStats.avgGlucose, last:lastStats.avgGlucose, unit:"غ", lowerBetter:true },
                          { label:"دهون محروقة", this:thisStats.totalFat, last:lastStats.totalFat, unit:"غ", lowerBetter:false },
                          { label:"أيام ضمن الهدف", this:thisStats.daysDeficit, last:lastStats.daysDeficit, unit:"يوم", lowerBetter:false },
                        ].map((row,i)=>{
                          const diff = row.this - row.last;
                          const improved = row.lowerBetter ? diff < 0 : diff > 0;
                          return (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                              <span style={{fontSize:11,color:"#94a3b8"}}>{row.label}</span>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:11,color:"#64748b"}}>{typeof row.this==="number"&&!Number.isInteger(row.this)?row.this.toFixed(1):Math.round(row.this)} {row.unit}</span>
                                <span style={{fontSize:10,color:improved?"#4ade80":"#f87171",fontWeight:700}}>
                                  {diff>0?"+":""}{typeof diff==="number"&&!Number.isInteger(diff)?diff.toFixed(1):Math.round(diff)} {improved?"✓":"↓"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ===== FAVORITES TAB ===== */}
          {tab==="favorites" && (
            <div className="page">
              <div className="card">
                <div className="section-title">★ الوجبات المفضلة</div>
                {favorites.length===0 ? (
                  <div style={{textAlign:"center",padding:"16px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:24,marginBottom:6}}>★</div>
                    <div>ما عندك وجبات محفوظة بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>اضغط ★ بجانب أي وجبة لحفظها</div>
                  </div>
                ) : favorites.map((fav,i)=>(
                  <div key={fav.id} className="meal-row">
                    <span className="meal-name">{fav.name}</span>
                    <span className="meal-weight">{fav.weight}غ</span>
                    <span className="meal-carb">↳ {fav.carbs.toFixed(1)}غ</span>
                    <button className="fav-add-btn" onClick={()=>{setMeals(p=>[...p,{...fav,id:Date.now()}]);setTab("today");}}>+ أضف</button>
                    <button className="remove-btn" onClick={()=>setFavorites(p=>p.filter((_,idx)=>idx!==i))}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {tab==="history" && (
            <div className="page">
              <div className="section-title" style={{padding:"0 4px 8px"}}>السجل الأسبوعي</div>
              {historyKeys.length===0 ? (
                <div className="card" style={{textAlign:"center",padding:"20px 0",color:"#475569",fontSize:12}}>
                  <div style={{fontSize:24,marginBottom:6}}>📊</div>
                  <div>ما في سجل بعد</div>
                  <div style={{fontSize:10,marginTop:3}}>اضغط "إنهاء اليوم" لحفظ يومك</div>
                </div>
              ) : historyKeys.map(key=>{
                const d = history[key];
                const p = Math.min(100,(d.totalIn/DAILY_GLUCOSE)*100);
                const deficit = d.netNeed > 0;
                return (
                  <div key={key} className="hist-card">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{formatDateFull(key)}</div>
                      <div style={{fontSize:10,color:deficit?"#a5b4fc":"#f87171",fontWeight:600,background:deficit?"rgba(99,102,241,0.15)":"rgba(239,68,68,0.15)",padding:"2px 7px",borderRadius:20}}>
                        {deficit?"ناقص":"فائض"} {Math.abs(d.netNeed).toFixed(0)}غ
                      </div>
                    </div>
                    <div className="progress-bar" style={{margin:"5px 0"}}>
                      <div className="progress-fill" style={{width:`${p}%`,background:p>100?"linear-gradient(90deg,#f87171,#ef4444)":"linear-gradient(90deg,#4ade80,#22c55e)"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b"}}>
                      <span>دخل: <strong style={{color:"#4ade80"}}>{d.totalIn.toFixed(0)}غ</strong></span>
                      {d.totalWalkBurn>0 && <span>مشي: <strong style={{color:"#fb923c"}}>{d.totalWalkBurn.toFixed(0)}غ</strong></span>}
                      <span>دهون: <strong style={{color:"#fde047"}}>{d.fatBurn.toFixed(1)}غ</strong></span>
                    </div>
                    {d.meals && d.meals.length>0 && (
                      <div style={{marginTop:6,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:6}}>
                        {d.meals.map((m,i)=><div key={i} style={{fontSize:10,color:"#64748b",marginBottom:2}}>• {m.name} ({m.weight}غ) ← {m.carbs.toFixed(1)}غ</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
                      💡 الحساب بناءً على معدل خسارتك الفعلي من سجل الوزن
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign:"center",padding:"12px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>⚖️</div>
                    <div>سجّل وزنك مرتين على الأقل لحساب الوقت</div>
                  </div>
                )}
              </div>

              {/* Weekly report */}
              <div className="card" style={{border:"1px solid rgba(139,92,246,0.2)"}}>
                <div className="section-title">📋 التقرير الأسبوعي</div>
                {!weeklyReport ? (
                  <div style={{textAlign:"center",padding:"14px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:22,marginBottom:5}}>📋</div>
                    <div>ما في بيانات كافية بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>استخدم "إنهاء اليوم" يومياً لتراكم البيانات</div>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:10,color:"#64748b",marginBottom:10}}>آخر {weeklyReport.count} أيام مسجّلة</div>

                    <div className="grid-2" style={{marginBottom:10}}>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>متوسط الجلوكوز</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{weeklyReport.avgGlucose.toFixed(0)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غ/يوم</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>إجمالي الدهون المحروقة</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fde047"}}>{weeklyReport.totalFat.toFixed(1)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غرام دهون</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>أيام تجاوزت الحد</div>
                        <div style={{fontSize:16,fontWeight:800,color:weeklyReport.daysOver>0?"#f87171":"#4ade80"}}>{weeklyReport.daysOver}</div>
                        <div style={{fontSize:9,color:"#475569"}}>من {weeklyReport.count}</div>
                      </div>
                      <div className="stat-box">
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>جلوكوز المشي</div>
                        <div style={{fontSize:16,fontWeight:800,color:"#fb923c"}}>{weeklyReport.totalWalkB.toFixed(0)}</div>
                        <div style={{fontSize:9,color:"#475569"}}>غ محروق</div>
                      </div>
                    </div>

                    {weeklyReport.best && (
                      <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.12)",borderRadius:10,padding:"9px 12px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:10,color:"#4ade80",fontWeight:700}}>🏆 أفضل يوم</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{formatDateFull(weeklyReport.best.key)}</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#fde047"}}>{(weeklyReport.best.fatBurn||0).toFixed(1)} غ دهون</div>
                          <div style={{fontSize:10,color:"#64748b"}}>جلوكوز: {weeklyReport.best.totalIn.toFixed(0)} غ</div>
                        </div>
                      </div>
                    )}

                    {weeklyReport.worst && weeklyReport.worst.key !== weeklyReport.best?.key && (
                      <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:10,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:10,color:"#f87171",fontWeight:700}}>📉 يوم يحتاج تحسين</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{formatDateFull(weeklyReport.worst.key)}</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#f87171"}}>{(weeklyReport.worst.fatBurn||0).toFixed(1)} غ دهون</div>
                          <div style={{fontSize:10,color:"#64748b"}}>جلوكوز: {weeklyReport.worst.totalIn.toFixed(0)} غ</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ===== MONTHLY TAB ===== */}
          {tab==="monthly" && (()=>{
            const allKeys = Object.keys(history).sort((a,b)=>a.localeCompare(b));
            const now = new Date();
            const thisMonth = allKeys.filter(k => k.startsWith(now.toISOString().slice(0,7)));
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
            const lastMonth = allKeys.filter(k => k.startsWith(lastMonthDate.toISOString().slice(0,7)));

            const calcStats = (keys) => {
              if (!keys.length) return null;
              const days = keys.map(k=>history[k]);
              const avgGlucose = days.reduce((s,d)=>s+d.totalIn,0)/days.length;
              const totalFat = days.reduce((s,d)=>s+(d.fatBurn||0),0);
              const totalWalkBurn = days.reduce((s,d)=>s+(d.totalWalkBurn||0),0);
              const daysOver = days.filter(d=>d.totalIn>DAILY_GLUCOSE).length;
              const daysDeficit = days.length - daysOver;
              const best = [...days].sort((a,b)=>(b.fatBurn||0)-(a.fatBurn||0))[0];
              const bestKey = keys[days.indexOf(best)];
              return { avgGlucose, totalFat, totalWalkBurn, daysOver, daysDeficit, best, bestKey, count:keys.length };
            };

            const thisStats = calcStats(thisMonth);
            const lastStats = calcStats(lastMonth);

            // Weight change this month
            const monthWeights = weightLog.filter(e=>e.date.startsWith(now.toISOString().slice(0,7)));
            const weightChange = monthWeights.length>=2 ? (monthWeights[monthWeights.length-1].weight - monthWeights[0].weight) : null;

            // Chart: glucose per day this month
            const chartMonthly = thisMonth.map(k=>({
              date: formatDateShort(k),
              glucose: Math.round(history[k].totalIn),
              fat: parseFloat((history[k].fatBurn||0).toFixed(1)),
            }));

            return (
              <div className="page">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:darkMode?"#f1f5f9":"#1e293b"}}>
                    {now.toLocaleString("ar-SA",{month:"long",year:"numeric"})}
                  </div>
                  {lastStats && <div style={{fontSize:10,color:"#64748b"}}>مقارنة بالشهر الماضي</div>}
                </div>

                {!thisStats ? (
                  <div className="card" style={{textAlign:"center",padding:"22px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:28,marginBottom:7}}>📆</div>
                    <div>ما في بيانات هذا الشهر بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>استخدم "إنهاء اليوم" يومياً لتراكم البيانات</div>
                  </div>
                ) : (
                  <>
                    {/* Key stats */}
                    <div className="grid-2" style={{marginBottom:10}}>
                      {[
                        { label:"أيام مسجّلة", val:thisStats.count, color:"#94a3b8", prevVal:lastStats?.count },
                        { label:"متوسط الجلوكوز", val:thisStats.avgGlucose.toFixed(0)+" غ", color:"#4ade80", prevVal:lastStats?.avgGlucose.toFixed(0)+" غ" },
                        { label:"إجمالي دهون محروقة", val:thisStats.totalFat.toFixed(1)+" غ", color:"#fde047", prevVal:lastStats?.totalFat.toFixed(1)+" غ" },
                        { label:"أيام ضمن الهدف", val:thisStats.daysDeficit, color:"#60a5fa", prevVal:lastStats?.daysDeficit },
                      ].map((s,i)=>(
                        <div key={i} className="stat-box">
                          <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
                          {s.prevVal !== undefined && <div style={{fontSize:9,color:"#475569"}}>الشهر الماضي: {s.prevVal}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Weight change */}
                    {weightChange !== null && (
                      <div className="card" style={{background:weightChange<0?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.05)",border:`1px solid ${weightChange<0?"rgba(74,222,128,0.15)":"rgba(239,68,68,0.12)"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>تغيّر الوزن هذا الشهر</div>
                            <div style={{fontSize:10,color:"#475569"}}>{monthWeights[0].weight} → {monthWeights[monthWeights.length-1].weight} كجم</div>
                          </div>
                          <div style={{fontSize:22,fontWeight:900,color:weightChange<0?"#4ade80":"#f87171"}}>
                            {weightChange<0?"▼":"▲"} {Math.abs(weightChange).toFixed(1)} كجم
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Best day */}
                    {thisStats.best && (
                      <div className="card" style={{border:"1px solid rgba(234,179,8,0.15)"}}>
                        <div className="section-title">🏆 أفضل يوم هذا الشهر</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:12,fontWeight:700,color:darkMode?"#f1f5f9":"#1e293b"}}>{formatDateFull(thisStats.bestKey)}</div>
                            <div style={{fontSize:10,color:"#64748b",marginTop:2}}>جلوكوز: {thisStats.best.totalIn.toFixed(0)} غ</div>
                          </div>
                          <div style={{textAlign:"left"}}>
                            <div style={{fontSize:16,fontWeight:900,color:"#fde047"}}>{(thisStats.best.fatBurn||0).toFixed(1)} غ</div>
                            <div style={{fontSize:9,color:"#64748b"}}>دهون محروقة</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Monthly chart */}
                    {chartMonthly.length >= 3 && (
                      <div className="card">
                        <div className="section-title">📈 جلوكوز يومي — هذا الشهر</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={chartMonthly} margin={{top:4,right:4,left:-25,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                            <XAxis dataKey="date" tick={{fontSize:8,fill:"#475569"}} tickLine={false} axisLine={false}/>
                            <YAxis tick={{fontSize:8,fill:"#4ade80"}} tickLine={false} axisLine={false}/>
                            <ReferenceLine y={DAILY_GLUCOSE} stroke="#4ade80" strokeDasharray="3 3" strokeWidth={1}/>
                            <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:11,direction:"rtl"}} labelStyle={{color:"#94a3b8"}}/>
                            <Line type="monotone" dataKey="glucose" stroke="#4ade80" strokeWidth={2} dot={{r:2,fill:"#4ade80",strokeWidth:0}} name="الجلوكوز"/>
                          </LineChart>
                        </ResponsiveContainer>
                        <div style={{fontSize:9,color:"#64748b",textAlign:"center",marginTop:4}}>الخط الأخضر = الاحتياج اليومي ({DAILY_GLUCOSE} غ)</div>
                      </div>
                    )}

                    {/* Comparison with last month */}
                    {lastStats && (
                      <div className="card" style={{border:"1px solid rgba(99,102,241,0.15)"}}>
                        <div className="section-title">📊 مقارنة بالشهر الماضي</div>
                        {[
                          { label:"متوسط الجلوكوز", this:thisStats.avgGlucose, last:lastStats.avgGlucose, unit:"غ", lowerBetter:true },
                          { label:"دهون محروقة", this:thisStats.totalFat, last:lastStats.totalFat, unit:"غ", lowerBetter:false },
                          { label:"أيام ضمن الهدف", this:thisStats.daysDeficit, last:lastStats.daysDeficit, unit:"يوم", lowerBetter:false },
                        ].map((row,i)=>{
                          const diff = row.this - row.last;
                          const improved = row.lowerBetter ? diff < 0 : diff > 0;
                          return (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                              <span style={{fontSize:11,color:"#94a3b8"}}>{row.label}</span>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:11,color:"#64748b"}}>{typeof row.this==="number"&&!Number.isInteger(row.this)?row.this.toFixed(1):Math.round(row.this)} {row.unit}</span>
                                <span style={{fontSize:10,color:improved?"#4ade80":"#f87171",fontWeight:700}}>
                                  {diff>0?"+":""}{typeof diff==="number"&&!Number.isInteger(diff)?diff.toFixed(1):Math.round(diff)} {improved?"✓":"↓"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ===== FAVORITES TAB ===== */}
          {tab==="favorites" && (
            <div className="page">
              <div className="card">
                <div className="section-title">★ الوجبات المفضلة</div>
                {favorites.length===0 ? (
                  <div style={{textAlign:"center",padding:"16px 0",color:"#475569",fontSize:12}}>
                    <div style={{fontSize:24,marginBottom:6}}>★</div>
                    <div>ما عندك وجبات محفوظة بعد</div>
                    <div style={{fontSize:10,marginTop:3}}>اضغط ★ بجانب أي وجبة لحفظها</div>
                  </div>
                ) : favorites.map((fav,i)=>(
                  <div key={fav.id} className="meal-row">
                    <span className="meal-name">{fav.name}</span>
                    <span className="meal-weight">{fav.weight}غ</span>
                    <span className="meal-carb">↳ {fav.carbs.toFixed(1)}غ</span>
                    <button className="fav-add-btn" onClick={()=>{setMeals(p=>[...p,{...fav,id:Date.now()}]);setTab("today");}}>+ أضف</button>
                    <button className="remove-btn" onClick={()=>setFavorites(p=>p.filter((_,idx)=>idx!==i))}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {tab==="history" && (
            <div className="page">
              <div className="section-title" style={{padding:"0 4px 8px"}}>السجل الأسبوعي</div>
              {historyKeys.length===0 ? (
                <div className="card" style={{textAlign:"center",padding:"20px 0",color:"#475569",fontSize:12}}>
                  <div style={{fontSize:24,marginBottom:6}}>📊</div>
                  <div>ما في سجل بعد</div>
                  <div style={{fontSize:10,marginTop:3}}>اضغط "إنهاء اليوم" لحفظ يومك</div>
                </div>
              ) : historyKeys.map(key=>{
                const d = history[key];
                const p = Math.min(100,(d.totalIn/DAILY_GLUCOSE)*100);
                const deficit = d.netNeed > 0;
                return (
                  <div key={key} className="hist-card">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{formatDateFull(key)}</div>
                      <div style={{fontSize:10,color:deficit?"#a5b4fc":"#f87171",fontWeight:600,background:deficit?"rgba(99,102,241,0.15)":"rgba(239,68,68,0.15)",padding:"2px 7px",borderRadius:20}}>
                        {deficit?"ناقص":"فائض"} {Math.abs(d.netNeed).toFixed(0)}غ
                      </div>
                    </div>
                    <div className="progress-bar" style={{margin:"5px 0"}}>
                      <div className="progress-fill" style={{width:`${p}%`,background:p>100?"linear-gradient(90deg,#f87171,#ef4444)":"linear-gradient(90deg,#4ade80,#22c55e)"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b"}}>
                      <span>دخل: <strong style={{color:"#4ade80"}}>{d.totalIn.toFixed(0)}غ</strong></span>
                      {d.totalWalkBurn>0 && <span>مشي: <strong style={{color:"#fb923c"}}>{d.totalWalkBurn.toFixed(0)}غ</strong></span>}
                      <span>دهون: <strong style={{color:"#fde047"}}>{d.fatBurn.toFixed(1)}غ</strong></span>
                    </div>
                    {d.meals && d.meals.length>0 && (
                      <div style={{marginTop:6,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:6}}>
                        {d.meals.map((m,i)=><div key={i} style={{fontSize:10,color:"#64748b",marginBottom:2}}>• {m.name} ({m.weight}غ) ← {m.carbs.toFixed(1)}غ</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

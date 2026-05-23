# 🔥 متتبع الجلوكوز اليومي — PWA

فكرة وتطوير: عثمان الجعفر

## طريقة الرفع على Vercel (مجاني — 5 دقائق)

### الخطوات:

1. **حمّل المشروع** من هنا (glucose-pwa.zip)

2. **افتح** [vercel.com](https://vercel.com) وسجّل دخول بـ GitHub

3. **اسحب المجلد** مباشرة لصفحة Vercel أو:
   - اضغط "Add New Project"
   - اختر "Import Git Repository" أو "Deploy from CLI"

4. **الإعدادات:**
   - Framework: Create React App
   - Build Command: `npm run build`
   - Output Directory: `build`

5. اضغط **Deploy** — ينتهي خلال دقيقتين وتحصل على رابط مثل:
   `https://glucose-tracker-xxx.vercel.app`

## تثبيته كتطبيق على جوالك

### iPhone:
1. افتح الرابط في **Safari** (مش Chrome)
2. اضغط زر المشاركة ↑
3. اختر **"Add to Home Screen"**
4. اضغط Add ✓

### Android:
1. افتح الرابط في **Chrome**
2. ستظهر رسالة "Add to Home Screen" تلقائياً
3. أو اضغط القائمة ⋮ ← "Install App"

## تشغيل محلي للتطوير

```bash
npm install
npm start
```

## ملاحظات تقنية
- التخزين: localStorage (يبقى على الجهاز)
- AI: يحتاج إنترنت (Anthropic API)
- باقي الميزات: تشتغل offline


const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_ADMIN_PIN = String(process.env.ADMIN_PIN || "64686123");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT,"public");
const DATA_DIR = path.join(ROOT,"data");
const UPLOAD_DIR = path.join(ROOT,"uploads");
const PRODUCTS_FILE = path.join(DATA_DIR,"products.json");
const ORDERS_FILE = path.join(DATA_DIR,"orders.json");
const CUSTOMERS_FILE = path.join(DATA_DIR,"customers.json");
const USERS_FILE = path.join(DATA_DIR,"users.json");
const SETTINGS_FILE = path.join(ROOT,"private-settings.json");

for(const d of [DATA_DIR,UPLOAD_DIR]) if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true});

function readJson(file,fallback){
  try{
    if(!fs.existsSync(file)) return fallback;
    const raw=fs.readFileSync(file,"utf8");
    return raw?JSON.parse(raw):fallback;
  }catch(e){ console.error("Read error",file,e.message); return fallback; }
}
function writeJson(file,data){ fs.writeFileSync(file,JSON.stringify(data,null,2),"utf8"); }
function safe(v,max=500){ return String(v??"").trim().slice(0,max); }
function num(v,fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function id(prefix){ return prefix+Date.now().toString(36)+crypto.randomBytes(3).toString("hex"); }

const BD_DISTRICTS=new Set([
  "Barguna","Barishal","Bhola","Jhalokathi","Patuakhali","Pirojpur",
  "Bandarban","Brahmanbaria","Chandpur","Chattogram","Cumilla","Cox's Bazar","Feni","Khagrachhari","Lakshmipur","Noakhali","Rangamati",
  "Dhaka","Faridpur","Gazipur","Gopalganj","Kishoreganj","Madaripur","Manikganj","Munshiganj","Narayanganj","Narsingdi","Rajbari","Shariatpur","Tangail",
  "Bagerhat","Chuadanga","Jashore","Jhenaidah","Khulna","Kushtia","Magura","Meherpur","Narail","Satkhira",
  "Jamalpur","Mymensingh","Netrokona","Sherpur",
  "Bogura","Joypurhat","Naogaon","Natore","Chapainawabganj","Pabna","Rajshahi","Sirajganj",
  "Dinajpur","Gaibandha","Kurigram","Lalmonirhat","Nilphamari","Panchagarh","Rangpur","Thakurgaon",
  "Habiganj","Moulvibazar","Sunamganj","Sylhet"
]);
function normalizeSpaces(v,max=500){return safe(v,max).replace(/\s+/g," ").trim()}
function validHumanName(v){
  const s=normalizeSpaces(v,100);
  const letters=s.match(/\p{L}/gu)||[];
  if(s.length<3||letters.length<2)return false;
  const compact=s.replace(/[\s.'’-]/g,"");
  if(compact.length<2)return false;
  return !/^(.)(\1)+$/u.test(compact);
}
function validAreaText(v){
  const s=normalizeSpaces(v,120),letters=s.match(/\p{L}/gu)||[];
  return s.length>=2&&letters.length>=2&&!/^(.)(\1)+$/u.test(s.replace(/\s/g,""));
}
function validAddress(v){
  const s=normalizeSpaces(v,500),letters=s.match(/\p{L}/gu)||[];
  if(s.length<10||letters.length<4)return false;
  const compact=s.replace(/[\s,./#\-]/g,"");
  return compact.length>=6&&!/^(.)(\1)+$/u.test(compact);
}
function strictCodOtp(){return String(process.env.COD_STRICT_OTP||"false").toLowerCase()==="true"}
function hashSecret(secret,salt=crypto.randomBytes(16).toString("hex")){
  const hash=crypto.scryptSync(String(secret),salt,64).toString("hex");
  return {salt,hash};
}
function verifySecret(secret,rec){
  try{
    const h=crypto.scryptSync(String(secret),rec.salt,64);
    const b=Buffer.from(rec.hash,"hex");
    return h.length===b.length && crypto.timingSafeEqual(h,b);
  }catch{return false}
}

const defaultProducts = [
{id:1001,name:"Premium Men's Sneakers",category:"Fashion",price:1490,oldPrice:1890,costPrice:1050,stock:18,badge:"BEST SELLER",rating:4.9,description:"Clean everyday sneakers with a premium casual look.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85","https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85"],featured:true,createdAt:new Date().toISOString()},
{id:1002,name:"Luxury Smart Watch",category:"Electronics",price:2190,oldPrice:2790,costPrice:1550,stock:12,badge:"TRENDING",rating:4.8,description:"Modern smart watch with a clean premium finish.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85","https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=1000&q=85"],featured:true,createdAt:new Date().toISOString()},
{id:1003,name:"Wireless Headphones",category:"Electronics",price:1290,oldPrice:1690,costPrice:880,stock:23,badge:"NEW",rating:4.8,description:"Wireless headphones for music, calls and daily entertainment.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=85"],featured:true,createdAt:new Date().toISOString()},
{id:1004,name:"Women's Premium Handbag",category:"Fashion",price:1890,oldPrice:2390,costPrice:1320,stock:9,badge:"LIMITED",rating:4.9,description:"Elegant handbag with a minimalist premium look.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85"],featured:false,createdAt:new Date().toISOString()},
{id:1005,name:"Skin Care Collection",category:"Beauty",price:1190,oldPrice:1490,costPrice:770,stock:17,badge:"POPULAR",rating:4.7,description:"A clean daily skin-care collection.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1000&q=85"],featured:false,createdAt:new Date().toISOString()},
{id:1006,name:"Premium Travel Backpack",category:"Lifestyle",price:1390,oldPrice:1790,costPrice:940,stock:14,badge:"TRENDING",rating:4.8,description:"Durable backpack for travel, office and everyday use.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85"],featured:true,createdAt:new Date().toISOString()},
{id:1007,name:"Classic Polo Shirt",category:"Fashion",price:990,oldPrice:1290,costPrice:620,stock:30,badge:"NEW",rating:4.6,description:"Minimal polo shirt for a clean everyday look.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?auto=format&fit=crop&w=1000&q=85"],featured:false,createdAt:new Date().toISOString()},
{id:1008,name:"Portable Bluetooth Speaker",category:"Electronics",price:1590,oldPrice:1990,costPrice:1080,stock:15,badge:"BEST SELLER",rating:4.8,description:"Compact speaker with a modern, travel-friendly design.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=85"],featured:true,createdAt:new Date().toISOString()},
{id:1009,name:"Signature Eau de Parfum",category:"Beauty",price:1790,oldPrice:2290,costPrice:1200,stock:11,badge:"PREMIUM",rating:4.9,description:"A polished fragrance presentation for gifting or personal use.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85"],featured:true,createdAt:new Date().toISOString()},
{id:1010,name:"Minimal Steel Bottle",category:"Lifestyle",price:690,oldPrice:890,costPrice:390,stock:25,badge:"NEW",rating:4.6,description:"Reusable bottle with a clean minimal finish.",sourceWebsite:"Demo",sourceUrl:"",images:["https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85"],featured:false,createdAt:new Date().toISOString()}
];

const defaultPublicSettings = {
  storeName:"KalaiyaBazar",
  domain:"kalaiyabazar.com",
  supportPhone:"01604540726",
  supportEmail:"",
  heroTitle:"Shop better. Live smarter.",
  heroBangla:"ফ্যাশন, টেক, বিউটি ও লাইফস্টাইল—প্রয়োজনীয় পণ্য আরও সুন্দরভাবে খুঁজে নিন।",
  heroButton:"Shop Collection",
  announcement:"Premium shopping • Cash on Delivery • WhatsApp support: 01604540726",
  insideDelivery:80,
  outsideDelivery:130,
  freeDeliveryAt:2500,
  coupons:[{code:"KALAIYA10",type:"percent",value:10,minOrder:0,active:true}],
  paymentMethods:{cod:true,bkash:true,nagad:true}
};

if(!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE,defaultProducts);
if(!fs.existsSync(ORDERS_FILE)) writeJson(ORDERS_FILE,[]);
if(!fs.existsSync(CUSTOMERS_FILE)) writeJson(CUSTOMERS_FILE,[]);
if(!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE,[]);
if(!fs.existsSync(SETTINGS_FILE)){
  const adminPin=hashSecret(DEFAULT_ADMIN_PIN);
  writeJson(SETTINGS_FILE,{
    adminPin,
    telegramBotToken:"",
    telegramChatId:"",
    public:defaultPublicSettings
  });
}

function privateSettings(){
  const s=readJson(SETTINGS_FILE,{});
  if(!s.adminPin) s.adminPin=hashSecret(DEFAULT_ADMIN_PIN);
  if(!s.public) s.public=defaultPublicSettings;
  if(!Array.isArray(s.public.coupons)) s.public.coupons=defaultPublicSettings.coupons;
  if(!s.public.domain||s.public.domain==="kalaiyabazar.online") s.public.domain="kalaiyabazar.com";
  if(!s.public.supportPhone) s.public.supportPhone="01604540726";
  return s;
}
function saveSettings(s){writeJson(SETTINGS_FILE,s)}
function publicSettings(){return privateSettings().public}

app.use(express.json({limit:"400kb"}));
app.use("/uploads",express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

const adminSessions=new Map();
const userSessions=new Map();
const codVerifiedTokens=new Map();
const otpRate=new Map();
const SESSION_TTL=12*60*60*1000;
function bearer(req){const h=String(req.headers.authorization||"");return h.startsWith("Bearer ")?h.slice(7):""}
function adminAuth(req,res,next){
  const t=bearer(req),x=adminSessions.get(t);
  if(!t||!x||x<Date.now()) return res.status(401).json({success:false,message:"Admin login required"});
  adminSessions.set(t,Date.now()+SESSION_TTL); req.adminToken=t; next();
}
function userAuth(req,res,next){
  const t=bearer(req),x=userSessions.get(t);
  if(!t||!x||x.expires<Date.now()) return res.status(401).json({success:false,message:"Please login first"});
  x.expires=Date.now()+SESSION_TTL; req.userPhone=x.phone; req.userToken=t; next();
}
function createAdminSession(){const t=crypto.randomBytes(32).toString("hex");adminSessions.set(t,Date.now()+SESSION_TTL);return t}
function createUserSession(phone){const t=crypto.randomBytes(32).toString("hex");userSessions.set(t,{phone,expires:Date.now()+SESSION_TTL});return t}


/* COD phone verification (Twilio Verify when configured) */
function bdPhone(v){
  const p=safe(v,30).replace(/\s+/g,"");
  return /^01\d{9}$/.test(p)?p:"";
}
function e164bd(phone){ return "+880"+phone.slice(1); }
function twilioVerifyConfigured(){
  const service=String(process.env.TWILIO_VERIFY_SERVICE_SID||"").trim();
  const keySid=String(process.env.TWILIO_API_KEY_SID||"").trim();
  const keySecret=String(process.env.TWILIO_API_KEY_SECRET||"").trim();
  const accountSid=String(process.env.TWILIO_ACCOUNT_SID||"").trim();
  const authToken=String(process.env.TWILIO_AUTH_TOKEN||"").trim();
  return Boolean(service && ((keySid&&keySecret)||(accountSid&&authToken)));
}
function twilioAuthHeader(){
  const user=String(process.env.TWILIO_API_KEY_SID||process.env.TWILIO_ACCOUNT_SID||"").trim();
  const pass=String(process.env.TWILIO_API_KEY_SECRET||process.env.TWILIO_AUTH_TOKEN||"").trim();
  return "Basic "+Buffer.from(user+":"+pass).toString("base64");
}
async function twilioVerifyRequest(endpoint,params){
  const sid=String(process.env.TWILIO_VERIFY_SERVICE_SID||"").trim();
  const r=await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(sid)}/${endpoint}`,{
    method:"POST",
    headers:{
      "Authorization":twilioAuthHeader(),
      "Content-Type":"application/x-www-form-urlencoded"
    },
    body:new URLSearchParams(params)
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.message||`OTP service error (${r.status})`);
  return d;
}
function otpRateAllowed(key){
  const now=Date.now(),windowMs=10*60*1000,max=3;
  const old=(otpRate.get(key)||[]).filter(t=>now-t<windowMs);
  if(old.length>=max){otpRate.set(key,old);return false}
  old.push(now);otpRate.set(key,old);return true;
}
function issueCodVerifiedToken(phone){
  const token=crypto.randomBytes(28).toString("hex");
  codVerifiedTokens.set(token,{phone,expires:Date.now()+15*60*1000});
  return token;
}
function consumeCodVerifiedToken(token,phone){
  const rec=codVerifiedTokens.get(String(token||""));
  if(!rec||rec.phone!==phone||rec.expires<Date.now()) return false;
  codVerifiedTokens.delete(String(token||""));
  return true;
}
function orderRisk(phone,orders){
  const mine=orders.filter(o=>o.phone===phone);
  const cancelled=mine.filter(o=>o.status==="Cancelled").length;
  const unverified=mine.filter(o=>o.status==="Unverified").length;
  const last24=mine.filter(o=>Date.now()-Date.parse(o.createdAt||0)<24*60*60*1000).length;
  let score=Math.min(100,cancelled*35+unverified*10+(last24>=3?20:0));
  const level=score>=60?"High":score>=30?"Medium":"Low";
  const reasons=[];
  if(cancelled) reasons.push(`${cancelled} previous cancelled order(s)`);
  if(unverified>=2) reasons.push(`${unverified} unverified order(s)`);
  if(last24>=3) reasons.push(`${last24} orders in the last 24 hours`);
  return {score,level,reasons};
}

/* uploads */
const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOAD_DIR),
  filename:(req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomBytes(5).toString("hex")}${path.extname(file.originalname).toLowerCase()||".jpg"}`)
});
const upload=multer({storage,limits:{fileSize:5*1024*1024,files:6},fileFilter:(req,file,cb)=>file.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Only image files allowed"))});

/* telegram */
async function sendTelegram(text){
  const s=privateSettings();
  if(!s.telegramBotToken||!s.telegramChatId) return {ok:false,message:"Telegram is not configured"};
  try{
    const r=await fetch(`https://api.telegram.org/bot${s.telegramBotToken}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:s.telegramChatId,text})});
    const d=await r.json();
    return d.ok?{ok:true}:{ok:false,message:d.description||"Telegram error"};
  }catch(e){return {ok:false,message:e.message}}
}
function maskToken(t){if(!t)return"";return t.length<14?"••••••••":t.slice(0,6)+"••••••••"+t.slice(-5)}

function sanitizeProductInput(body,existing={}){
  const images=Array.isArray(body.images)?body.images.map(x=>safe(x,700)).filter(Boolean).slice(0,6):(existing.images||[]);
  const name=safe(body.name,120),price=Math.max(0,num(body.price));
  if(!name||price<=0||!images.length) throw new Error("Name, valid price and at least one image are required");
  return {
    ...existing,
    name,
    category:safe(body.category,50)||"Lifestyle",
    price,
    oldPrice:Math.max(price,num(body.oldPrice,price)),
    costPrice:Math.max(0,num(body.costPrice,0)),
    stock:Math.max(0,Math.floor(num(body.stock,0))),
    badge:safe(body.badge,30)||"NEW",
    description:safe(body.description,1200),
    sourceWebsite:safe(body.sourceWebsite,80),
    sourceUrl:safe(body.sourceUrl,700),
    sourcePrice:Math.max(0,num(body.sourcePrice,0)),
    sourceCurrency:safe(body.sourceCurrency,12),
    sourceAsin:safe(body.sourceAsin,40),
    images,
    featured:Boolean(body.featured),
    rating:num(existing.rating,4.8),
    createdAt:existing.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  }
}


/* Amazon product-link importer (best effort; public page metadata only) */
const AMAZON_BASE_DOMAINS=[
  "amazon.com","amazon.in","amazon.co.uk","amazon.ae","amazon.sa","amazon.ca","amazon.com.au",
  "amazon.de","amazon.fr","amazon.it","amazon.es","amazon.co.jp","amazon.sg","amazon.nl",
  "amazon.se","amazon.pl","amazon.com.mx","amazon.com.br","amazon.com.tr","amazon.eg"
];
function isAmazonHost(host){
  const h=String(host||"").toLowerCase().replace(/\.$/,"");
  return AMAZON_BASE_DOMAINS.some(d=>h===d||h.endsWith("."+d));
}
function cleanHtmlText(v){
  return String(v||"")
    .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&nbsp;/gi," ")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
    .replace(/\s+/g," ").trim();
}
function htmlMeta(html,key){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  key=String(key).toLowerCase();
  for(const tag of tags){
    const attrs={};
    for(const m of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) attrs[m[1].toLowerCase()]=m[2];
    if(String(attrs.property||attrs.name||"").toLowerCase()===key && attrs.content) return cleanHtmlText(attrs.content);
  }
  return "";
}
function jsonLdProduct(html){
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const walk=v=>{
    if(!v)return null;
    if(Array.isArray(v)){for(const x of v){const f=walk(x);if(f)return f}return null}
    if(typeof v==="object"){
      const t=v["@type"];
      if((typeof t==="string"&&t.toLowerCase()==="product")||(Array.isArray(t)&&t.some(x=>String(x).toLowerCase()==="product")))return v;
      if(v["@graph"]){const f=walk(v["@graph"]);if(f)return f}
      for(const x of Object.values(v)){if(x&&typeof x==="object"){const f=walk(x);if(f)return f}}
    }
    return null;
  };
  for(const s of scripts){
    try{const obj=JSON.parse(s[1].trim());const p=walk(obj);if(p)return p}catch{}
  }
  return null;
}
function normalizeImageList(value){
  const arr=[];
  const push=x=>{if(typeof x==="string"&&/^https:\/\//i.test(x)&&!arr.includes(x))arr.push(x)};
  if(Array.isArray(value)) value.forEach(push); else push(value);
  return arr.slice(0,6);
}
function priceFromOffer(offers){
  const list=Array.isArray(offers)?offers:[offers];
  for(const o of list){
    if(!o||typeof o!=="object")continue;
    const n=num(o.price??o.lowPrice,NaN);
    if(Number.isFinite(n)&&n>0)return {price:n,currency:safe(o.priceCurrency,12)};
  }
  return {price:0,currency:""};
}
async function fetchAmazonPage(startUrl){
  let current=new URL(startUrl);
  if(current.protocol!=="https:"||!isAmazonHost(current.hostname)) throw new Error("Please paste a valid Amazon product link");
  for(let i=0;i<4;i++){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
    let r;
    try{
      r=await fetch(current.toString(),{
        redirect:"manual",signal:ctrl.signal,
        headers:{
          "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept":"text/html,application/xhtml+xml",
          "Accept-Language":"en-US,en;q=0.9"
        }
      });
    }finally{clearTimeout(timer)}
    if([301,302,303,307,308].includes(r.status)){
      const loc=r.headers.get("location");if(!loc)throw new Error("Amazon redirect could not be followed");
      current=new URL(loc,current);
      if(current.protocol!=="https:"||!isAmazonHost(current.hostname))throw new Error("Amazon redirected outside an allowed Amazon domain");
      continue;
    }
    if(!r.ok)throw new Error(`Amazon page could not be read (${r.status}). You can still add the product manually.`);
    const len=num(r.headers.get("content-length"),0);
    if(len>2500000)throw new Error("Amazon page is too large to import safely");
    let html=await r.text();if(html.length>2500000)html=html.slice(0,2500000);
    return {html,url:current.toString()};
  }
  throw new Error("Too many Amazon redirects");
}
function amazonPreviewFromHtml(html,finalUrl){
  const ld=jsonLdProduct(html)||{};
  const offer=priceFromOffer(ld.offers);
  const title=cleanHtmlText(ld.name||htmlMeta(html,"og:title")||htmlMeta(html,"twitter:title")||((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||""));
  const description=cleanHtmlText(ld.description||htmlMeta(html,"og:description")||htmlMeta(html,"description"));
  let images=normalizeImageList(ld.image);
  const og=htmlMeta(html,"og:image");if(og&&!images.includes(og))images.unshift(og);
  images=images.filter(x=>/^https:\/\//i.test(x)).slice(0,6);
  const price=offer.price||num(htmlMeta(html,"product:price:amount"),0);
  const currency=offer.currency||htmlMeta(html,"product:price:currency");
  const asin=((finalUrl.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)||[])[1]||"").toUpperCase();
  if(!title&&!images.length)throw new Error("Amazon did not expose usable product metadata. Please add this product manually.");
  return {title:title.replace(/\s*[:|]\s*Amazon\.[^|:]+.*$/i,"").slice(0,180),description:description.slice(0,1200),images,sourcePrice:price,sourceCurrency:currency,asin,sourceUrl:finalUrl,sourceWebsite:"Amazon"};
}

/* public */
app.get("/api/settings",(req,res)=>res.json({success:true,settings:publicSettings()}));
app.get("/api/products",(req,res)=>{
  const p=readJson(PRODUCTS_FILE,defaultProducts).map(({costPrice,sourceWebsite,sourceUrl,sourcePrice,sourceCurrency,sourceAsin,...x})=>x);
  res.json({success:true,products:p});
});


app.get("/api/cod/config",(req,res)=>{
  res.json({success:true,otpEnabled:twilioVerifyConfigured(),otpRequired:strictCodOtp()||twilioVerifyConfigured(),manualFallback:!strictCodOtp()});
});
app.post("/api/cod/send-otp",userAuth,async(req,res)=>{
  try{
    const phone=bdPhone(req.body.phone);
    if(!phone) return res.status(400).json({success:false,message:"Valid 11-digit Bangladesh mobile number is required"});
    if(phone!==req.userPhone) return res.status(403).json({success:false,message:"OTP can only be sent to your logged-in account number"});
    if(!twilioVerifyConfigured()){
      return res.status(503).json({success:false,manual:true,message:"SMS OTP is not configured yet. You can still place the COD order; Admin will verify by phone call."});
    }
    const rateKey=`${req.ip}:${phone}`;
    if(!otpRateAllowed(rateKey)) return res.status(429).json({success:false,message:"Too many OTP requests. Please wait 10 minutes."});
    const d=await twilioVerifyRequest("Verifications",{To:e164bd(phone),Channel:"sms"});
    res.json({success:true,status:d.status||"pending",message:"OTP sent to your mobile number"});
  }catch(e){
    res.status(400).json({success:false,message:e.message||"Could not send OTP"});
  }
});
app.post("/api/cod/verify-otp",userAuth,async(req,res)=>{
  try{
    const phone=bdPhone(req.body.phone),code=safe(req.body.code,12);
    if(!phone||!/^\d{4,10}$/.test(code)) return res.status(400).json({success:false,message:"Valid phone and OTP code are required"});
    if(phone!==req.userPhone) return res.status(403).json({success:false,message:"OTP verification must use your logged-in account number"});
    if(!twilioVerifyConfigured()) return res.status(503).json({success:false,manual:true,message:"SMS OTP is not configured. Admin phone verification will be used."});
    const d=await twilioVerifyRequest("VerificationCheck",{To:e164bd(phone),Code:code});
    if(d.status!=="approved") return res.status(400).json({success:false,message:"OTP is not correct or has expired"});
    const verificationToken=issueCodVerifiedToken(phone);
    res.json({success:true,verificationToken,message:"Phone verified successfully"});
  }catch(e){
    res.status(400).json({success:false,message:e.message||"Could not verify OTP"});
  }
});

app.post("/api/orders",userAuth,async(req,res)=>{
  try{
    const users=readJson(USERS_FILE,[]),account=users.find(u=>u.phone===req.userPhone);
    if(!account) return res.status(401).json({success:false,message:"Please login again"});

    const name=normalizeSpaces(req.body.name,100),phone=req.userPhone,district=safe(req.body.district,100),
      upazila=normalizeSpaces(req.body.upazila,120),address=normalizeSpaces(req.body.address,500),
      payment=safe(req.body.payment,60)||"Cash on Delivery",
      area=req.body.area==="outside"?"outside":"inside",orderNote=normalizeSpaces(req.body.orderNote,500),
      clientOrderKey=safe(req.body.clientOrderKey,80);

    if(bdPhone(req.body.phone)!==phone) return res.status(403).json({success:false,message:"Checkout phone must match your logged-in account"});
    if(!validHumanName(name)) return res.status(400).json({success:false,message:"Please enter a valid customer name"});
    if(!BD_DISTRICTS.has(district)) return res.status(400).json({success:false,message:"Please select a valid district"});
    if(!validAreaText(upazila)) return res.status(400).json({success:false,message:"Please enter a valid Upazila/Thana"});
    if(!validAddress(address)) return res.status(400).json({success:false,message:"Please enter a complete delivery address (at least 10 characters)"});
    if(req.body.confirmAccurate!==true) return res.status(400).json({success:false,message:"Please confirm that your delivery information is correct"});
    if(!["Cash on Delivery","bKash","Nagad"].includes(payment)) return res.status(400).json({success:false,message:"Invalid payment method"});

    const requested=Array.isArray(req.body.items)?req.body.items.slice(0,30):[];
    if(!requested.length) return res.status(400).json({success:false,message:"Your order has no products"});

    const orders=readJson(ORDERS_FILE,[]);
    if(clientOrderKey){
      const duplicate=orders.find(o=>o.phone===phone&&o.clientOrderKey===clientOrderKey);
      if(duplicate) return res.json({success:true,duplicate:true,orderId:duplicate.id,total:duplicate.total,status:duplicate.status,codVerified:duplicate.codVerified,riskLevel:duplicate.riskLevel});
    }

    const settings=publicSettings(),products=readJson(PRODUCTS_FILE,defaultProducts),items=[];let subtotal=0;
    for(const r of requested){
      const p=products.find(x=>Number(x.id)===Number(r.id)),qty=Math.max(1,Math.min(99,Math.floor(num(r.qty,1))));
      if(!p)return res.status(400).json({success:false,message:"A product in your order no longer exists"});
      if(p.stock<qty)return res.status(400).json({success:false,message:`${p.name}: insufficient stock`});
      const lineTotal=p.price*qty;subtotal+=lineTotal;items.push({id:p.id,name:p.name,qty,price:p.price,lineTotal});
    }

    const couponCode=safe(req.body.coupon,40).toUpperCase();
    const coupon=(settings.coupons||[]).find(c=>c.active&&String(c.code).toUpperCase()===couponCode&&subtotal>=num(c.minOrder,0));
    if(couponCode&&!coupon) return res.status(400).json({success:false,message:"Coupon is invalid, inactive, or minimum order was not met"});
    let discount=0;
    if(coupon) discount=coupon.type==="fixed"?num(coupon.value):Math.round(subtotal*num(coupon.value)/100);

    // Non-Dhaka districts can never use the Dhaka-city delivery rate.
    const safeArea=district!=="Dhaka"?"outside":area;
    const delivery=subtotal>=num(settings.freeDeliveryAt,2500)?0:(safeArea==="outside"?num(settings.outsideDelivery,130):num(settings.insideDelivery,80));
    const total=Math.max(0,subtotal+delivery-discount);

    const isCod=payment==="Cash on Delivery";
    const otpAvailable=twilioVerifyConfigured();
    const codVerified=isCod?consumeCodVerifiedToken(req.body.codVerificationToken,phone):false;
    if(isCod&&(strictCodOtp()||otpAvailable)&&!codVerified){
      return res.status(400).json({success:false,message:"Please verify your mobile number with OTP before placing a COD order"});
    }
    if(isCod&&strictCodOtp()&&!otpAvailable){
      return res.status(503).json({success:false,message:"COD OTP verification is temporarily unavailable. Please try again later."});
    }

    const risk=orderRisk(phone,orders);
    const initialStatus=isCod?(codVerified?"OTP Verified":"Unverified"):"Pending";

    for(const item of items){const p=products.find(x=>Number(x.id)===Number(item.id));p.stock-=item.qty}
    const order={
      id:"KB"+Date.now().toString().slice(-9),clientOrderKey,name,phone,district,upazila,address,payment,area:safeArea,orderNote,
      coupon:coupon?coupon.code:"",items,subtotal,delivery,discount,total,status:initialStatus,
      codVerified,verificationMethod:codVerified?"SMS OTP":(isCod?"Admin Call":"Not Required"),
      riskScore:risk.score,riskLevel:risk.level,riskReasons:risk.reasons,
      location:account.lastLocation&&account.lastLocation.consent===true?account.lastLocation:null,
      accountRequired:true,createdAt:new Date().toISOString()
    };
    orders.unshift(order);writeJson(ORDERS_FILE,orders);writeJson(PRODUCTS_FILE,products);

    const customers=readJson(CUSTOMERS_FILE,[]),c=customers.find(x=>x.phone===phone);
    if(c){
      Object.assign(c,{name,address,district,upazila,lastOrder:order.id,orderCount:num(c.orderCount,0)+1,riskLevel:risk.level,riskScore:risk.score});
    }else{
      customers.unshift({id:Date.now(),name,phone,address,district,upazila,lastOrder:order.id,orderCount:1,riskLevel:risk.level,riskScore:risk.score,createdAt:new Date().toISOString()});
    }
    writeJson(CUSTOMERS_FILE,customers);

    account.name=name;account.address=address;account.district=district;account.upazila=upazila;writeJson(USERS_FILE,users);

    const msg=`🛍 NEW KALAIYABAZAR ORDER\n\nOrder ID: ${order.id}\nCustomer: ${name}\nPhone: ${phone}\nDistrict: ${district}\nUpazila/Thana: ${upazila}\nAddress: ${address}\nTotal: ৳${total}\nPayment: ${payment}\nCOD Verification: ${isCod?(codVerified?"OTP Verified":"Needs Admin Call"):"Not Required"}\nRisk: ${risk.level} (${risk.score})\nStatus: ${initialStatus}`;
    const tg=await sendTelegram(msg);
    res.json({success:true,orderId:order.id,total,status:initialStatus,codVerified,riskLevel:risk.level,telegramSent:tg.ok});
  }catch(e){console.error(e);res.status(500).json({success:false,message:"Could not create order"})}
});

/* account */
app.post("/api/account/register",(req,res)=>{
  const name=normalizeSpaces(req.body.name,100),phone=bdPhone(req.body.phone),password=String(req.body.password||"");
  if(!validHumanName(name)||!phone||password.length<6)return res.status(400).json({success:false,message:"Valid name, Bangladesh mobile number and password (6+ characters) are required"});
  const users=readJson(USERS_FILE,[]);
  if(users.some(u=>u.phone===phone))return res.status(409).json({success:false,message:"An account already exists with this phone"});
  const pass=hashSecret(password);
  users.push({id:id("U"),name,phone,password:pass,address:"",district:"",upazila:"",wishlist:[],createdAt:new Date().toISOString()});
  writeJson(USERS_FILE,users);
  const token=createUserSession(phone);
  res.json({success:true,token,user:{name,phone,address:"",district:"",upazila:""}});
});
app.post("/api/account/login",(req,res)=>{
  const phone=safe(req.body.phone,30),password=String(req.body.password||"");
  const users=readJson(USERS_FILE,[]),u=users.find(x=>x.phone===phone);
  if(!u||!verifySecret(password,u.password))return res.status(401).json({success:false,message:"Wrong phone or password"});
  const token=createUserSession(phone);
  res.json({success:true,token,user:{name:u.name,phone:u.phone,address:u.address||"",district:u.district||"",upazila:u.upazila||""}});
});
app.post("/api/account/logout",userAuth,(req,res)=>{userSessions.delete(req.userToken);res.json({success:true})});
app.get("/api/account/me",userAuth,(req,res)=>{
  const u=readJson(USERS_FILE,[]).find(x=>x.phone===req.userPhone);
  if(!u)return res.status(404).json({success:false,message:"Account not found"});
  const orders=readJson(ORDERS_FILE,[]).filter(o=>o.phone===u.phone);
  res.json({success:true,user:{name:u.name,phone:u.phone,address:u.address||"",district:u.district||"",upazila:u.upazila||"",wishlist:u.wishlist||[],location:u.lastLocation||null},orders});
});
app.put("/api/account/profile",userAuth,(req,res)=>{
  const users=readJson(USERS_FILE,[]),u=users.find(x=>x.phone===req.userPhone);
  if(!u)return res.status(404).json({success:false,message:"Account not found"});
  const name=normalizeSpaces(req.body.name,100),district=safe(req.body.district,100),upazila=normalizeSpaces(req.body.upazila,120),address=normalizeSpaces(req.body.address,500);
  if(!validHumanName(name))return res.status(400).json({success:false,message:"Please enter a valid name"});
  if(district&&!BD_DISTRICTS.has(district))return res.status(400).json({success:false,message:"Please select a valid district"});
  if(upazila&&!validAreaText(upazila))return res.status(400).json({success:false,message:"Please enter a valid Upazila/Thana"});
  if(address&&!validAddress(address))return res.status(400).json({success:false,message:"Please enter a complete address"});
  u.name=name;u.address=address;u.district=district;u.upazila=upazila;writeJson(USERS_FILE,users);
  res.json({success:true,user:{name:u.name,phone:u.phone,address:u.address,district:u.district,upazila:u.upazila}});
});

app.put("/api/account/location",userAuth,(req,res)=>{
  const lat=num(req.body.latitude,NaN),lng=num(req.body.longitude,NaN),accuracy=Math.max(0,num(req.body.accuracy,0));
  if(req.body.consent!==true||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180){
    return res.status(400).json({success:false,message:"Valid location permission and coordinates are required"});
  }
  const users=readJson(USERS_FILE,[]),u=users.find(x=>x.phone===req.userPhone);
  if(!u)return res.status(404).json({success:false,message:"Account not found"});
  u.lastLocation={latitude:lat,longitude:lng,accuracy,consent:true,updatedAt:new Date().toISOString()};
  writeJson(USERS_FILE,users);
  res.json({success:true,location:u.lastLocation});
});

app.put("/api/account/wishlist",userAuth,(req,res)=>{
  const users=readJson(USERS_FILE,[]),u=users.find(x=>x.phone===req.userPhone);
  if(!u)return res.status(404).json({success:false,message:"Account not found"});
  u.wishlist=Array.isArray(req.body.wishlist)?req.body.wishlist.map(Number).filter(Number.isFinite).slice(0,200):[];
  writeJson(USERS_FILE,users);res.json({success:true});
});

/* admin login */
app.post("/api/admin/login",(req,res)=>{
  const s=privateSettings(),pin=String(req.body.pin||"");
  if(!verifySecret(pin,s.adminPin))return res.status(401).json({success:false,message:"Wrong Admin PIN"});
  res.json({success:true,token:createAdminSession()});
});
app.post("/api/admin/logout",adminAuth,(req,res)=>{adminSessions.delete(req.adminToken);res.json({success:true})});
app.get("/api/admin/dashboard",adminAuth,(req,res)=>{
  const products=readJson(PRODUCTS_FILE,[]),orders=readJson(ORDERS_FILE,[]),customers=readJson(CUSTOMERS_FILE,[]);
  const revenue=orders.filter(o=>o.status!=="Cancelled").reduce((s,o)=>s+num(o.total),0);
  res.json({success:true,stats:{
    products:products.length,orders:orders.length,customers:customers.length,revenue,
    lowStock:products.filter(p=>p.stock<=5).length,
    unverified:orders.filter(o=>o.status==="Unverified").length,
    highRisk:orders.filter(o=>o.riskLevel==="High"&&o.status!=="Cancelled"&&o.status!=="Delivered").length
  }});
});

app.post("/api/admin/import/amazon",adminAuth,async(req,res)=>{
  try{
    const raw=safe(req.body.url,1200);
    if(!raw)return res.status(400).json({success:false,message:"Paste an Amazon product URL"});
    const page=await fetchAmazonPage(raw);
    const product=amazonPreviewFromHtml(page.html,page.url);
    res.json({success:true,product,note:"Preview imported from publicly exposed page metadata. Review images, description, price and your rights to use the content before saving."});
  }catch(e){
    res.status(400).json({success:false,message:e.message||"Amazon import failed"});
  }
});

app.get("/api/admin/products",adminAuth,(req,res)=>res.json({success:true,products:readJson(PRODUCTS_FILE,[])}));
app.post("/api/admin/upload",adminAuth,upload.array("images",6),(req,res)=>res.json({success:true,urls:(req.files||[]).map(f=>`/uploads/${f.filename}`)}));
app.post("/api/admin/products",adminAuth,(req,res)=>{
  try{const products=readJson(PRODUCTS_FILE,[]),p=sanitizeProductInput(req.body,{id:Date.now()});products.unshift(p);writeJson(PRODUCTS_FILE,products);res.json({success:true,product:p})}
  catch(e){res.status(400).json({success:false,message:e.message})}
});
app.put("/api/admin/products/:id",adminAuth,(req,res)=>{
  try{const products=readJson(PRODUCTS_FILE,[]),i=products.findIndex(p=>Number(p.id)===Number(req.params.id));if(i<0)return res.status(404).json({success:false,message:"Product not found"});products[i]=sanitizeProductInput(req.body,products[i]);writeJson(PRODUCTS_FILE,products);res.json({success:true,product:products[i]})}
  catch(e){res.status(400).json({success:false,message:e.message})}
});
app.delete("/api/admin/products/:id",adminAuth,(req,res)=>{let products=readJson(PRODUCTS_FILE,[]);products=products.filter(p=>Number(p.id)!==Number(req.params.id));writeJson(PRODUCTS_FILE,products);res.json({success:true})});
app.get("/api/admin/orders",adminAuth,(req,res)=>res.json({success:true,orders:readJson(ORDERS_FILE,[])}));
app.patch("/api/admin/orders/:id",adminAuth,async(req,res)=>{
  const allowed=["Pending","Unverified","OTP Verified","Confirmed","Packed","Shipped","Delivered","Cancelled"],
    status=safe(req.body.status,40);
  if(!allowed.includes(status))return res.status(400).json({success:false,message:"Invalid status"});
  const orders=readJson(ORDERS_FILE,[]),o=orders.find(x=>x.id===req.params.id);
  if(!o)return res.status(404).json({success:false,message:"Order not found"});
  o.status=status;o.updatedAt=new Date().toISOString();
  if(status==="Confirmed"&&!o.codVerified){
    o.manualVerified=true;o.verificationMethod="Admin Call";o.verifiedAt=new Date().toISOString();
  }
  if(status==="Cancelled")o.cancelledAt=new Date().toISOString();
  writeJson(ORDERS_FILE,orders);
  await sendTelegram(`📦 ORDER UPDATE / অর্ডার আপডেট\n\nOrder ID: ${o.id}\nCustomer: ${o.name}\nStatus: ${status}\nTotal: ৳${o.total}`);
  res.json({success:true,order:o})
});
app.get("/api/admin/customers",adminAuth,(req,res)=>res.json({success:true,customers:readJson(CUSTOMERS_FILE,[])}));

/* telegram */
app.get("/api/admin/telegram",adminAuth,(req,res)=>{const s=privateSettings();res.json({success:true,configured:Boolean(s.telegramBotToken&&s.telegramChatId),tokenMasked:maskToken(s.telegramBotToken),chatId:s.telegramChatId||""})});
app.put("/api/admin/telegram",adminAuth,(req,res)=>{const s=privateSettings(),token=safe(req.body.botToken,300),chat=safe(req.body.chatId,100);if(token)s.telegramBotToken=token;s.telegramChatId=chat;if(!s.telegramBotToken||!s.telegramChatId)return res.status(400).json({success:false,message:"Bot Token and Chat ID are required"});saveSettings(s);res.json({success:true,tokenMasked:maskToken(s.telegramBotToken),chatId:s.telegramChatId})});
app.delete("/api/admin/telegram",adminAuth,(req,res)=>{const s=privateSettings();s.telegramBotToken="";s.telegramChatId="";saveSettings(s);res.json({success:true})});
app.post("/api/admin/telegram/test",adminAuth,async(req,res)=>{const r=await sendTelegram("✅ KalaiyaBazar Telegram Test\n\nBot Token and Chat ID are connected.");if(!r.ok)return res.status(400).json({success:false,message:r.message});res.json({success:true,message:"Test message sent"})});

/* admin store settings */
app.get("/api/admin/settings",adminAuth,(req,res)=>res.json({success:true,settings:publicSettings()}));
app.put("/api/admin/settings",adminAuth,(req,res)=>{
  const s=privateSettings(),p=s.public;
  Object.assign(p,{
    storeName:safe(req.body.storeName,80)||p.storeName,domain:safe(req.body.domain,120),supportPhone:safe(req.body.supportPhone,40),supportEmail:safe(req.body.supportEmail,120),
    heroTitle:safe(req.body.heroTitle,160)||p.heroTitle,heroBangla:safe(req.body.heroBangla,300),heroButton:safe(req.body.heroButton,60)||p.heroButton,
    announcement:safe(req.body.announcement,220),insideDelivery:Math.max(0,num(req.body.insideDelivery,p.insideDelivery)),outsideDelivery:Math.max(0,num(req.body.outsideDelivery,p.outsideDelivery)),freeDeliveryAt:Math.max(0,num(req.body.freeDeliveryAt,p.freeDeliveryAt))
  });
  saveSettings(s);res.json({success:true,settings:p})
});
app.put("/api/admin/coupons",adminAuth,(req,res)=>{
  const s=privateSettings();s.public.coupons=Array.isArray(req.body.coupons)?req.body.coupons.slice(0,30).map(c=>({code:safe(c.code,40).toUpperCase(),type:c.type==="fixed"?"fixed":"percent",value:Math.max(0,num(c.value)),minOrder:Math.max(0,num(c.minOrder)),active:Boolean(c.active)})).filter(c=>c.code):[];saveSettings(s);res.json({success:true,coupons:s.public.coupons})
});
app.put("/api/admin/change-pin",adminAuth,(req,res)=>{
  const current=String(req.body.currentPin||""),next=String(req.body.newPin||"");const s=privateSettings();
  if(!verifySecret(current,s.adminPin))return res.status(400).json({success:false,message:"Current PIN is wrong"});
  if(next.length<6)return res.status(400).json({success:false,message:"New PIN must be at least 6 digits/characters"});
  s.adminPin=hashSecret(next);saveSettings(s);res.json({success:true})
});

app.get("/{*splat}",(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"index.html")));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({success:false,message:err.message||"Server error"})});
app.listen(PORT,()=>console.log(`KalaiyaBazar V12 running: http://localhost:${PORT}`));

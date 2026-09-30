
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
  domain:"kalaiyabazar.online",
  supportPhone:"",
  supportEmail:"",
  heroTitle:"Shop better. Live smarter.",
  heroBangla:"ফ্যাশন, টেক, বিউটি ও লাইফস্টাইল—প্রয়োজনীয় পণ্য আরও সুন্দরভাবে খুঁজে নিন।",
  heroButton:"Shop Collection",
  announcement:"Premium shopping • Cash on Delivery • Fast order support",
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
  return s;
}
function saveSettings(s){writeJson(SETTINGS_FILE,s)}
function publicSettings(){return privateSettings().public}

app.use(express.json({limit:"400kb"}));
app.use("/uploads",express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

const adminSessions=new Map();
const userSessions=new Map();
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
    images,
    featured:Boolean(body.featured),
    rating:num(existing.rating,4.8),
    createdAt:existing.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  }
}

/* public */
app.get("/api/settings",(req,res)=>res.json({success:true,settings:publicSettings()}));
app.get("/api/products",(req,res)=>{
  const p=readJson(PRODUCTS_FILE,defaultProducts).map(({costPrice,sourceWebsite,sourceUrl,...x})=>x);
  res.json({success:true,products:p});
});

app.post("/api/orders",async(req,res)=>{
  try{
    const name=safe(req.body.name,100),phone=safe(req.body.phone,30),district=safe(req.body.district,100),address=safe(req.body.address,500),payment=safe(req.body.payment,60)||"Cash on Delivery",area=req.body.area==="outside"?"outside":"inside";
    const requested=Array.isArray(req.body.items)?req.body.items.slice(0,30):[];
    if(!name||!/^01\d{9}$/.test(phone)||!address||!requested.length) return res.status(400).json({success:false,message:"Name, valid 11-digit phone, address and product are required"});
    const settings=publicSettings(),products=readJson(PRODUCTS_FILE,defaultProducts),items=[];let subtotal=0;
    for(const r of requested){
      const p=products.find(x=>Number(x.id)===Number(r.id)),qty=Math.max(1,Math.min(99,Math.floor(num(r.qty,1))));
      if(!p)return res.status(400).json({success:false,message:"Product not found"});
      if(p.stock<qty)return res.status(400).json({success:false,message:`${p.name}: insufficient stock`});
      const lineTotal=p.price*qty; subtotal+=lineTotal; items.push({id:p.id,name:p.name,qty,price:p.price,lineTotal});
    }
    const couponCode=safe(req.body.coupon,40).toUpperCase();
    const coupon=(settings.coupons||[]).find(c=>c.active&&String(c.code).toUpperCase()===couponCode&&subtotal>=num(c.minOrder,0));
    let discount=0;
    if(coupon) discount=coupon.type==="fixed"?num(coupon.value):Math.round(subtotal*num(coupon.value)/100);
    const delivery=subtotal>=num(settings.freeDeliveryAt,2500)?0:(area==="outside"?num(settings.outsideDelivery,130):num(settings.insideDelivery,80));
    const total=Math.max(0,subtotal+delivery-discount);
    for(const item of items){const p=products.find(x=>Number(x.id)===Number(item.id));p.stock-=item.qty}
    const order={id:"KB"+Date.now().toString().slice(-9),name,phone,district,address,payment,area,coupon:coupon?coupon.code:"",items,subtotal,delivery,discount,total,status:"Pending",createdAt:new Date().toISOString()};
    const orders=readJson(ORDERS_FILE,[]);orders.unshift(order);writeJson(ORDERS_FILE,orders);writeJson(PRODUCTS_FILE,products);
    const customers=readJson(CUSTOMERS_FILE,[]),c=customers.find(x=>x.phone===phone);
    if(c){Object.assign(c,{name,address,district,lastOrder:order.id,orderCount:num(c.orderCount,0)+1})}else customers.unshift({id:Date.now(),name,phone,address,district,lastOrder:order.id,orderCount:1,createdAt:new Date().toISOString()});
    writeJson(CUSTOMERS_FILE,customers);
    const msg=`🛍 NEW KALAIYABAZAR ORDER\n\nOrder ID: ${order.id}\nCustomer: ${name}\nPhone: ${phone}\nAddress: ${address}\nTotal: ৳${total}\nPayment: ${payment}\nStatus: Pending`;
    const tg=await sendTelegram(msg);
    res.json({success:true,orderId:order.id,total,telegramSent:tg.ok});
  }catch(e){console.error(e);res.status(500).json({success:false,message:"Could not create order"})}
});

/* account */
app.post("/api/account/register",(req,res)=>{
  const name=safe(req.body.name,100),phone=safe(req.body.phone,30),password=String(req.body.password||"");
  if(!name||!/^01\d{9}$/.test(phone)||password.length<6)return res.status(400).json({success:false,message:"Name, valid phone and password (6+ characters) are required"});
  const users=readJson(USERS_FILE,[]);
  if(users.some(u=>u.phone===phone))return res.status(409).json({success:false,message:"An account already exists with this phone"});
  const pass=hashSecret(password);
  users.push({id:id("U"),name,phone,password:pass,address:"",district:"",wishlist:[],createdAt:new Date().toISOString()});
  writeJson(USERS_FILE,users);
  const token=createUserSession(phone);
  res.json({success:true,token,user:{name,phone,address:"",district:""}});
});
app.post("/api/account/login",(req,res)=>{
  const phone=safe(req.body.phone,30),password=String(req.body.password||"");
  const users=readJson(USERS_FILE,[]),u=users.find(x=>x.phone===phone);
  if(!u||!verifySecret(password,u.password))return res.status(401).json({success:false,message:"Wrong phone or password"});
  const token=createUserSession(phone);
  res.json({success:true,token,user:{name:u.name,phone:u.phone,address:u.address||"",district:u.district||""}});
});
app.post("/api/account/logout",userAuth,(req,res)=>{userSessions.delete(req.userToken);res.json({success:true})});
app.get("/api/account/me",userAuth,(req,res)=>{
  const u=readJson(USERS_FILE,[]).find(x=>x.phone===req.userPhone);
  if(!u)return res.status(404).json({success:false,message:"Account not found"});
  const orders=readJson(ORDERS_FILE,[]).filter(o=>o.phone===u.phone);
  res.json({success:true,user:{name:u.name,phone:u.phone,address:u.address||"",district:u.district||"",wishlist:u.wishlist||[]},orders});
});
app.put("/api/account/profile",userAuth,(req,res)=>{
  const users=readJson(USERS_FILE,[]),u=users.find(x=>x.phone===req.userPhone);
  if(!u)return res.status(404).json({success:false,message:"Account not found"});
  u.name=safe(req.body.name,100)||u.name;u.address=safe(req.body.address,500);u.district=safe(req.body.district,100);writeJson(USERS_FILE,users);
  res.json({success:true,user:{name:u.name,phone:u.phone,address:u.address,district:u.district}});
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
  res.json({success:true,stats:{products:products.length,orders:orders.length,customers:customers.length,revenue,lowStock:products.filter(p=>p.stock<=5).length}});
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
  const allowed=["Pending","Confirmed","Packed","Shipped","Delivered","Cancelled"],status=safe(req.body.status,40);if(!allowed.includes(status))return res.status(400).json({success:false,message:"Invalid status"});
  const orders=readJson(ORDERS_FILE,[]),o=orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({success:false,message:"Order not found"});o.status=status;o.updatedAt=new Date().toISOString();writeJson(ORDERS_FILE,orders);await sendTelegram(`📦 ORDER UPDATE\n\nOrder ID: ${o.id}\nCustomer: ${o.name}\nStatus: ${status}\nTotal: ৳${o.total}`);res.json({success:true})
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
app.listen(PORT,()=>console.log(`KalaiyaBazar V7 running: http://localhost:${PORT}`));

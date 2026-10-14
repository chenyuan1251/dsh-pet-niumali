"use strict";
/* ════════════════════════════════════════════════════════════
   牛马力 · v8 · 双打卡生活闭环
   基线 v7.1（交互稿 v5），基于《双打卡生活闭环-修改文档-v1.5》
   新增：双打卡、饲料、手帐（叙事引擎）、连续天数、成就贴纸
   关键改动：today() 本地判日修复，KEY 升 niumali.v9
   ════════════════════════════════════════════════════════════ */

const TRAVEL_COST = 200;          // 一次旅行的路费
const FOCUS_LEN   = 25 * 60;      // 一个番茄 25 分钟
let   JOURNEY_MS  = 14000;        // 演示：全程 14 秒（真实产品为 4 小时）
let   DEMO        = false;

// ── v8 新增常量 ──
/* ── 奖励消费税率 ── */
const FEED_MOOD    = 0.5;         // 喂饲料心情增量
const TEA_FOCUS    = 150;         // 专注里程：每 150 分钟 +1 袋饲料
const STREAK_7     = 3;           // 连续 3 天触发回馈故事
const STREAK_30    = 30;          // 连续 30 天触发六耳彩蛋

/* ── 表情 ── */
const FACE = {
  happy:'小牛表情包_开心微笑', sad:'小牛表情包_伤心哭泣', wow:'小牛表情包_惊讶震惊',
  angry:'小牛表情包_生气愤怒', sorry:'小牛委屈表情包', pack:'小牛撒娇表情包', love:'小牛比心表情包',
  scold:'小牛指责表情包', roll_eyes:'小牛翻白眼表情包'
};
const face = k => `assets/images/${FACE[k]||FACE.happy}.jpg`;

/* ── 城市：photos 只存文件名，缩略图/大图路径自动派生 ── */
const full  = n => `assets/images/${n}.jpg`;
const thumb = n => `assets/images/${n}.jpg`;

const CITIES = [
  {name:'大理', stops:['越过山丘','穿过云海','听见洱海'],
   f1:'替你去了大理。替你坐了大摆锤，替你吐了。你继续开会。',
   f2:'但洱海的照片我拍了，存在你这了。',
   photos:['小牛在洱海打卡','小牛在大理古城打卡','小牛在双廊古镇打卡','小牛在喜洲稻田打卡','小牛在崇圣寺三塔打卡','小牛在苍山打卡'],
   peeks:['在洱海边坐了一会儿。风把你的会吹散了。','路过一片稻田，替你闻了。是香的。']},

  {name:'重庆', stops:['穿过隧道','越过江桥','看见灯火'],
   f1:'替你在重庆爬了八层楼。导航说就在附近。它在骗人。',
   f2:'火锅替你吃了，微辣。你的那份勇敢我替你留着。',
   photos:['小牛坐长江索道打卡','小牛在李子坝单独打卡','小牛在解放碑单独打卡'],
   peeks:['导航说前方两百米。这句话它已经说了八次。','在江边站住了，替你深呼吸了一口。']},

  {name:'西安', stops:['越过黄土','路过古墙','听见晨钟'],
   f1:'替你在西安挤了兵马俑。一号坑全是人，比你们公司年会好不到哪去。',
   f2:'但两千岁的陶俑都站得笔直。你坐直一点。',
   photos:['小牛在兵马俑打卡','小牛在古城墙打卡','小牛在回民街打卡','小牛在大唐不夜城单独打卡'],
   peeks:['城墙上一辆自行车都没有，我推着你那辆。','晨钟响了。你没听见，我替你听了。']},

  {name:'哈尔滨', stops:['穿过雪原','路过冰河','看见雾凇'],
   f1:'替你在哈尔滨看了冰雕。替你冻的。替你把外套裹紧了。',
   f2:'“东北的铁是甜的”这句话，我替你验证了。是假的。',
   photos:['小牛在冰雪大世界打卡','小牛在圣索菲亚教堂打卡','小牛在中央大街打卡','小牛在松花江打卡'],
   peeks:['下雪了。你的那一份我伸手接着了。','冰灯亮起来那一下，我想起你还在开会。']},

  {name:'厦门', stops:['穿过隧道','路过渔村','看见大海'],
   f1:'替你在厦门骑了环岛路。海风替你吹了，你的烦恼吹不走，我替你带着。',
   f2:'回来给你带了粒贝壳，在背包侧兜。',
   photos:['厦门鼓浪屿岛上拍照打卡','小牛在日光岩打卡','小牛在菽庄花园打卡','小牛在厦大校门单独打卡'],
   peeks:['海风很大。你的烦恼我拎着，有点沉。','轮渡开走了，我留在岸上多看了一眼。']},

  {name:'成都', stops:['越过平原','路过竹海','听见茶香'],
   f1:'替你在成都看了大熊猫。它一天吃 12 小时睡 12 小时——不是摆烂，是编制。',
   f2:'你也很努力了。不用和熊猫比。',
   photos:['小牛在熊猫基地打卡','小牛在IFS爬墙熊猫打卡','小牛在宽窄巷子打卡','小牛在锦里打卡'],
   peeks:['熊猫在睡觉。我学着也睡了一会儿。','茶馆里坐了半小时，什么都没干。很舒服。']},

  {name:'拉萨', stops:['越过雪山','路过经幡','看见圣湖'],
   f1:'替你在拉萨晒了太阳。紫外线比老板的目光还刺眼。我黑了八度。',
   f2:'经幡替我念了：愿你平安，不止今天。',
   photos:['小牛在布达拉宫打卡','小牛在八廓街打卡','小牛在纳木错打卡','小牛在雪山经幡打卡'],
   peeks:['海拔有点高，我替你喘了几口气。','经幡在响。我听不懂，但觉得是好事。']},

  {name:'苏州', stops:['穿过水乡','路过石桥','听见评弹'],
   f1:'替你在苏州逛了园林。一扇窗一幅画——比你们工位隔板讲究多了。',
   f2:'慢下来的风景，我替你存着。等你亲自来看。',
   photos:['小牛在园林石桥单独打卡','小牛在苏州山塘街打卡','小牛在苏州拙政园打卡'],
   peeks:['船娘唱了一句我没听清，替你记住了调子。','园子里的窗我数了七扇。第八扇在看你。']},

  {name:'福州', stops:['穿过榕荫','路过坊巷','听见闽水'],
   f1:'替你在福州走了三坊七巷。石板路比你们工位踏实多了，每一步都听得见自己的声音。',
   f2:'茉莉花茶替你喝了一杯。很香。你的焦虑它替我泡开了。',
   photos:['小牛在西禅寺打卡','小牛在上下杭打卡','小牛在鼓山打卡','小牛在福州西湖打卡'],
   peeks:['榕树须垂到肩上，替你拂了一下。','坊巷里飘来茉莉花香，替你深深吸了一口。']},

  {name:'宁德', stops:['穿过滩涂','越过山海','看见烟火'],
   f1:'替你在霞浦看了滩涂。潮水退下去的纹路，比你这周的待办清单清楚多了。',
   f2:'太姥山的云替你摸了摸。滩涂上的蛏子替你数了，三十二只。你尽管忙，远方它替你活。',
   photos:['小牛在太姥山打卡','小牛在白水洋打卡','小牛在霞浦滩涂打卡'],
   peeks:['滩涂上有人在弯腰挖蛏子，替你问了声好。','太姥山顶风很大，替你吹走了三分之二的烦恼。']},

  {name:'丽江', stops:['越过古城','穿过束河','看见雪山'],
   f1:'替你在丽江走了一趟古城。石板路比你想象的滑，它差点摔了一跤——替你摔的，不算。',
   f2:'玉龙雪山远远地看了它一眼。它说：「你工位上的山，比这个难爬。」',
   photos:['小牛丽江古城夜景打卡','小牛玉龙雪山脚下打卡','小牛丽江束河古镇漫步','小牛黑龙潭公园雪山倒影'],
   peeks:['古城里有人在弹吉他。它站了一会儿，替你把那首歌听完了。','雪山在云里藏了一半。它说另一半替你看了。']},

  {name:'香港', stops:['穿过中环','越过半山','看见维港'],
   f1:'替你在香港看了中环的楼。比你们写字楼高，但电梯一样慢。',
   f2:'维港的夜景替你拍了——不用发朋友圈，它存好在明信片里了。',
   photos:['小牛香港中环街景漫游','小牛香港茶餐厅美食体验','小牛太平山顶俯瞰香港','小牛维港夜景独旅中间版'],
   peeks:['茶餐厅的阿姨问它吃什么。它替你要了份菠萝油。','太平山顶的风很大，它说你的头发也吹过同一阵风。']}
];

/* ── 大厂打卡 ── */
const FACTORIES = [
  {name:'腾讯', stops:['园区大门','滨海长廊'],
   f1:'替你去腾讯滨海大厦门口转了一圈。工牌挂在胸前的小牛还挺像那么回事。前台说临时访客请登记——它填了你的名字。',
   f2:'滨海长廊上有人遛狗，有人跑步。电脑没有背出来的人才是真下班。它替你羡慕了一下。',
   photos:['小牛腾讯滨海大厦傍晚灯光打卡'],
   peeks:['滨海大厦的灯亮了一排。它替你数了数，三层还在加班。','门口的企鹅雕塑被人摸得发亮。它伸手摸了摸，替你沾了一点好运。']},

  {name:'华为', stops:['欧洲小镇入口','钟楼广场'],
   f1:'替你去松山湖逛了一圈——欧洲小镇的建筑群里有人在开电话会。它说：「连度假区都卷，你们公司还行。」',
   f2:'复古小火车经过的时候，它跳上去坐了一站。替你吹了吹湖风，替你放空了五分钟。',
   photos:['小牛华为松山湖钟楼前打卡','小牛华为松山湖复古小火车打卡','小牛华为松山湖草坪野餐全景打卡'],
   peeks:['钟楼响了，它替你许了个愿。没告诉你是什么。','草坪上有人在野餐。它坐下来，替你把便当吃了。']},

  {name:'阿里', stops:['西溪大门','访客中心'],
   f1:'替你在西溪园区门口的淘公仔前面站了一会儿。快递车进进出出，它替你数了数：五分钟十七辆。',
   f2:'园区里的草坪上有人在拍照。它挤进去蹭了一张——你在工位上打了个喷嚏，大概是有人在想你。',
   photos:['小牛阿里西溪园区主楼前打卡','小牛阿里西溪园区草坪休闲打卡','小牛阿里西溪园区淘公仔合影打卡'],
   peeks:['淘公仔一直在笑。它说：「这个班味比你轻。」','访客中心的外卖架上堆满了奶茶。它替你看了一圈，没有你的。']},

  {name:'宁德时代', stops:['大楼前','厂区周边'],
   f1:'替你在宁德时代大楼前拍了张照。穿静电服的人进进出出——电池的味道混着海风，它说闻起来像「未来的味道」。',
   f2:'厂区周边很安静。它坐在路边的石墩上，替你看了半小时的云。和电池厂一起。',
   photos:['小牛在宁德时代大楼打卡'],
   peeks:['大楼的灯亮了一整层。它说：「看来这里也有人没下班。」','门口那块大石头上的字它摸了摸。替你沾了点科技的光。']}
];

/* ── 状态 ── */
const KEY = 'niumali.v9';
let G = {
  fare:100, mood:3, trips:0, focusMin:0, focusSess:0, petToday:0, petBonusToday:false,
  day:'', collection:[], visits:{}, seenGuide:false, sound:true,
  departFailStreak:0, focusAbandonStreak:0,
  // v8 新增
  checkin:{ workDate:'', offDate:'', workStart:0, hours:0, streak:0, total:0 },
  feed:{ bag:0, fedTotal:0, lastFocusFeed:0 },
  journal:[], stamps:[], todos:[]
};

function today(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(G)); }catch(e){} }

function load(){
  try{
    // 尝试迁移旧存档
    const old = JSON.parse(localStorage.getItem('niumali.v5')||'null');
    if(old && !localStorage.getItem(KEY)){
      G.fare = old.fare??100; G.mood = old.mood??3; G.trips = old.trips??0;
      G.focusMin = old.focusMin??0; G.focusSess = old.focusSess??0;
      G.collection = old.collection??[]; G.visits = old.visits??{};
      G.seenGuide = old.seenGuide??false; G.sound = old.sound??true;
      G.departFailStreak = 0; G.focusAbandonStreak = 0;
    }else{
      const s = JSON.parse(localStorage.getItem(KEY)||'null');
      if(s) G = Object.assign(G, s);
    }
  }catch(e){}
  // 日重置
  if(G.day !== today()){
    G.day = today();
    G.petToday = 0; G.petBonusToday = false;
  }
  // 饲料发放：昨日闭环完成且今天还没发过
  if(yesterdayComplete() && !localStorage.getItem('feed_'+today())){
    G.feed.bag += 1;
    try{ localStorage.setItem('feed_'+today(), '1'); }catch(e){}
  }
  // 专注里程饲料
  calcFocusFeed();
}

function yesterday(){
  const d=new Date(); d.setDate(d.getDate()-1);
  return fmtDate(d);
}
function fmtDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function yesterdayComplete(){
  return G.checkin.offDate === yesterday() && G.journal.some(j => j.date === yesterday());
}
function calcFocusFeed(){
  const milestone = Math.floor(G.focusMin / TEA_FOCUS);
  const fed = milestone - (G.feed.lastFocusFeed || 0);
  if(fed > 0){ G.feed.bag += fed; G.feed.lastFocusFeed = milestone; save(); stats(); }
  return fed;
}
const PET_FARE   = 1;      // 每次摸头给的路费
const TODO_FARE  = 5;      // 划掉一条待办给的路费
const TODO_DAILY = 10;     // 每天前 10 条待办给路费
const PET_DAILY  = 30;     // 每天前 30 次给路费，之后只涨心情
const STROKE_PX  = 150;    // 累计移动多少像素算摸满一圈
const PET_HOLD_MS= 280;    // 菜单里按住「摸头」的连发间隔
let petting=false, petMoved=0, petAcc=0, petLastX=0, petLastY=0, petCombo=0, petComboT=null, petLock=false;
let traveling = false, journeyTimers = [], curCity = null, curSpot = null, curPeek = '';

/* ══ 1. 铃铛：品牌声音资产，Web Audio 合成，零素材 ══ */
let actx = null;
function ac(){
  if(!actx){ const C = window.AudioContext||window.webkitAudioContext; if(!C) return null; actx = new C(); }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function bell(kind){
  if(!G.sound) return;
  const a = ac(); if(!a) return;
  const t = a.currentTime;
  const dur = kind==='chime' ? 1.1 : kind==='tick' ? 0.28 : 2.6;
  const peak= kind==='tick' ? 0.10 : kind==='chime' ? 0.20 : 0.34;
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(peak, t+0.006);
  out.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  out.connect(a.destination);
  // 失谐泛音列 = 金属铃铛感
  const parts = kind==='tick' ? [[1320,1]] : [[1760,1],[2637,.42],[3520,.20],[5274,.09]];
  parts.forEach(([f,g])=>{
    const o = a.createOscillator(), v = a.createGain();
    o.type='sine'; o.frequency.value=f*(1+(Math.random()-.5)*0.004); v.gain.value=g;
    o.connect(v); v.connect(out); o.start(t); o.stop(t+dur+0.05);
  });
}
const $soundBtn = document.getElementById('soundBtn');
$soundBtn.addEventListener('click', ()=>{
  G.sound = !G.sound; save();
  document.getElementById('soundIc').setAttribute('href', G.sound?'#i-sound':'#i-mute');
  $soundBtn.classList.toggle('off', !G.sound);
  $soundBtn.setAttribute('aria-pressed', String(G.sound));
  if(G.sound) bell('chime');
  toast(G.sound?'铃铛打开了':'铃铛静音了');
});

/* ══ 2. Toast ══ */
const $toasts = document.getElementById('toasts');
function toast(msg, icon){
  const d = document.createElement('div');
  d.className = 'toast';
  d.innerHTML = (icon?`<svg><use href="#${icon}"/></svg>`:'') + `<span></span>`;
  d.querySelector('span').textContent = msg;
  $toasts.appendChild(d);
  setTimeout(()=>d.remove(), 3450);
  while($toasts.children.length > 3) $toasts.firstChild.remove();
}

/* ══ 3. 场景切换：不只是换背景，头像槽会变成「空位」 ══ */
const $bgDesk=document.getElementById('bgDesk'), $bgTravel=document.getElementById('bgTravel');
const $tag=document.getElementById('sceneTag'), $tagLbl=document.getElementById('sceneLbl');
const $tagIc=$tag.querySelector('.ic use'), $portrait=document.getElementById('portrait'), $stage=document.getElementById('stage');
function setScene(to){
  const travel = to==='travel';
  $bgDesk.classList.toggle('on', !travel);
  $bgTravel.classList.toggle('on', travel);
  $tag.classList.toggle('travel', travel);
  $tagIc.setAttribute('href', travel?'#i-compass':'#i-brief');
  $tagLbl.textContent = travel ? '在路上 · 替你活' : '在工位 · 默默搬砖';
  $portrait.classList.toggle('away', travel);   // ← 核心：它不在画面里
  $stage.classList.toggle('away', travel);
}

/* ══ 4. 心情 / 表情 / 头像 ══ */
const $mood=document.getElementById('moodText'), $hearts=document.getElementById('hearts'), $charImg=document.getElementById('charImg');
let moodTimer=null;
const $moodNum=document.getElementById('moodNum');
let lastMoodRendered=null;
function renderHearts(){
  /* 心情没变就不重建 DOM：否则 setMood 的延迟渲染会把刚加的 pop 动画冲掉 */
  if(lastMoodRendered===G.mood && $hearts.childElementCount===5) return;
  lastMoodRendered=G.mood;
  $hearts.innerHTML='';
  const floor=Math.floor(G.mood), frac=G.mood-floor;
  for(let i=0;i<5;i++){
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24');
    /* v5.2：+0.25 是真实增量，心形只画整数颗会把反馈吃掉，
       所以边界那颗用"半颗"表示，旁边再挂一个精确数值 */
    if(i<floor) {} else if(i===floor && frac>=0.05) s.classList.add('part'); else s.classList.add('off');
    s.innerHTML='<use href="#i-heart"/>';
    $hearts.appendChild(s);
  }
  $hearts.setAttribute('aria-label',`心情 ${G.mood.toFixed(2)} / 5`);
  if($moodNum){
    const txt=G.mood.toFixed(2);
    if($moodNum.textContent!==txt){
      $moodNum.textContent=txt;
      $moodNum.classList.remove('up'); void $moodNum.offsetWidth; $moodNum.classList.add('up');
      setTimeout(()=>$moodNum.classList.remove('up'),520);
    }
  }
}
function setFace(k){ $charImg.src=face(k); }
function setMood(text, faceKey){
  $mood.parentElement.classList.add('fade');
  clearTimeout(moodTimer);
  moodTimer=setTimeout(()=>{
    $mood.textContent=text;
    if(faceKey) setFace(faceKey);
    renderHearts();
    $mood.parentElement.classList.remove('fade');
  },180);
}
function stats(){
  set('#statTrips b', G.trips);
  set('#statCities b', G.collection.length);
  set('#statFocus b', G.focusMin);
  set('#statJournal b', G.journal.length);
  set('#statHuntAlbum b', (G.huntLoot||[]).length);
  set('#statTodo b', (G.todos||[]).filter(t=>!t.done).length);
  set('#stFare', Math.floor(G.fare));
  document.getElementById('fareBox').classList.toggle('full', G.fare>=TRAVEL_COST);
  set('#streakNum', G.checkin.streak);
  set('#statCheckin b', G.checkin.streak);
  const cnt=document.getElementById('feedCount');
  if(cnt) cnt.textContent=G.feed.bag;
  const fb=document.getElementById('feedBtn');
  if(fb) fb.classList.toggle('empty', G.feed.bag<=0);
}
const $frtOvl=document.getElementById('frtOvl'), $frtBody=document.getElementById('frtBody');
const $frtQ=document.getElementById('frtQ'), $frtR=document.getElementById('frtR');
const $frtName=document.getElementById('frtName'), $frtDesc=document.getElementById('frtDesc');
const $frtDesc2=document.getElementById('frtDesc2');
const $frtFace=document.getElementById('frtFace');
const $mbOvl=document.getElementById('mbOvl'), $mbImg=document.getElementById('mbImg');
const $mbBtn=document.getElementById('mbBtn'), $mbRes=document.getElementById('mbRes');
const $mbReward=document.getElementById('mbReward'), $mbRewardTxt=document.getElementById('mbRewardTxt');
const $mbName=document.getElementById('mbName'), $mbDesc=document.getElementById('mbDesc');
const $huntOvl=document.getElementById('huntOvl'), $huntTier=document.getElementById('huntTier');
const $haOvl=document.getElementById('haOvl'), $haBody=document.getElementById('haBody'), $haClose=document.getElementById('haClose');
const $tdOvl=document.getElementById('tdOvl');
const $huntImg=document.getElementById('huntImg'), $huntStory=document.getElementById('huntStory');
const $huntReward=document.getElementById('huntReward');
function set(sel,v){ const e=document.querySelector(sel); if(e&&e.textContent!=String(v)) e.textContent=v; }
function bump(sel){
  const e=document.querySelector(sel); if(!e) return;
  e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump');
  setTimeout(()=>e.classList.remove('bump'),340);
}

/* 面板三块语义固定：kicker=状态 / title=主信息 / sub=补充 */
const $kick=document.getElementById('pKicker'), $title=document.getElementById('pTitle'), $sub=document.getElementById('pSub');
function setPanel(kicker, title, sub, icon){
  $kick.textContent=kicker;
  if(icon){ const u=$kick.parentElement.querySelector('use'); if(u) u.setAttribute('href','#'+icon); }
  $title.textContent=title;
  $sub.classList.add('fade');
  setTimeout(()=>{ $sub.textContent=sub||''; $sub.classList.remove('fade'); },160);
}

/* 空闲时让页面「活着」：轮换自言自语 */
const IDLE = {
  hi:['今天也辛苦了。要不要送它出去走走？','它在等你抬头看它一眼。','攒够 100 路费，它就替你出发。'],
  mid:['它趴在你键盘边上打盹。','会议第 40 分钟，它替你走神了。','窗外的天不错。它想替你出去看看。'],
  low:['它有点蔫。摸一下会好。','今天还没人理它。','它在数你叹了几次气。']
};
setInterval(()=>{
  if(traveling||F.running||anyOverlay()) return;
  const pool = G.mood>=4?IDLE.hi : G.mood>=2.5?IDLE.mid : IDLE.low;
  setMood(pool[Math.floor(Math.random()*pool.length)], G.mood>=4?'happy':G.mood>=2.5?'pack':'sorry');
}, 15000);

/* ══ 5. 弧形菜单：圆心用 JS 实时取自头像，半径恒定 ══ */
/* 首次引导：提示用户按住头像抚摸（v7 移除弧形菜单） */
const $hint=document.getElementById('tapHint');
function showHint(){ $hint.classList.add('on'); }
function hideHint(){ $hint.classList.remove('on'); }

/* ══ 6. 出发 + 旅程（v7.1：改为按地点收集，每城多张照片） ══ */
function pickDestination(){
  const collected = G.collection || [];
  function visitedSpotsOf(destName){
    return collected.filter(c => c.cityName === destName).map(c => c.spotName);
  }
  // 找所有还没去过的地点（城市 + 大厂）
  const cityUnvisited = CITIES.filter(c => c.photos.some(p => !visitedSpotsOf(c.name).includes(p)));
  const factoryUnvisited = FACTORIES.filter(f => f.photos.some(p => !visitedSpotsOf(f.name).includes(p)));
  const allDone = cityUnvisited.length===0 && factoryUnvisited.length===0;

  if(allDone){
    // 全部集满 → 故地重游，两者随机
    if(Math.random()<0.2 && FACTORIES.length){
      const fac = FACTORIES[Math.floor(Math.random()*FACTORIES.length)];
      return { dest:fac, spot:fac.photos[Math.floor(Math.random()*fac.photos.length)], revisit:true, isFactory:true };
    }
    const city = CITIES[Math.floor(Math.random()*CITIES.length)];
    return { dest:city, spot:city.photos[Math.floor(Math.random()*city.photos.length)], revisit:true, isFactory:false };
  }

  // 20% 大厂（仅从未去过的里面挑）
  if(Math.random()<0.2 && factoryUnvisited.length){
    const fac = factoryUnvisited[Math.floor(Math.random()*factoryUnvisited.length)];
    const unvisited = fac.photos.filter(p => !visitedSpotsOf(fac.name).includes(p));
    return { dest:fac, spot:unvisited[Math.floor(Math.random()*unvisited.length)], revisit:false, isFactory:true };
  }

  // 80% 城市（仅从未去过的里面挑）
  if(cityUnvisited.length){
    const city = cityUnvisited[Math.floor(Math.random()*cityUnvisited.length)];
    const unvisited = city.photos.filter(p => !visitedSpotsOf(city.name).includes(p));
    return { dest:city, spot:unvisited[Math.floor(Math.random()*unvisited.length)], revisit:false, isFactory:false };
  }

  // 城市集满但大厂还没去（或反之）→ 去另一边
  if(factoryUnvisited.length){
    const fac = factoryUnvisited[Math.floor(Math.random()*factoryUnvisited.length)];
    const unvisited = fac.photos.filter(p => !visitedSpotsOf(fac.name).includes(p));
    return { dest:fac, spot:unvisited[Math.floor(Math.random()*unvisited.length)], revisit:false, isFactory:true };
  }
  // 兜底
  const city = CITIES[Math.floor(Math.random()*CITIES.length)];
  return { dest:city, spot:city.photos[Math.floor(Math.random()*city.photos.length)], revisit:true, isFactory:false };
}
function depart(){
  if(traveling){ toast('它已经在路上了','i-compass'); return; }
  if(G.fare < TRAVEL_COST){
    G.departFailStreak = (G.departFailStreak||0) + 1;
    const failMsg = G.departFailStreak >= 3
      ? ['路费不够你点什么出发！专注去！','数过了，你第三次了。专注好吗？','牛马力翻了个白眼：先专注！'][(G.departFailStreak-3)%3]
      : `还差 ${Math.ceil(TRAVEL_COST-G.fare)} 路费`;
    toast(failMsg, G.departFailStreak>=3?'i-ticket':'i-ticket');
    const faceKey = G.departFailStreak>=3
      ? (G.departFailStreak-3)%3===2 ? 'roll_eyes' : 'scold'
      : G.departFailStreak>=2 ? 'scold' : 'sorry';
    setMood(failMsg, faceKey);
    setPanel('路费不足',G.departFailStreak>=3?'你倒是专注啊':'再攒 '+Math.ceil(TRAVEL_COST-G.fare)+' 分钟',
      G.departFailStreak>=3?'摸头只给零花钱，专注才是主力':'一个番茄 25 分钟，'+Math.ceil((TRAVEL_COST-G.fare)/25)+' 个就够了','i-ticket');
    G.mood=Math.max(1,G.mood-0.5); renderHearts();
    return;
  }
  G.fare -= TRAVEL_COST; traveling=true; G.departFailStreak=0; stats(); save();
  const result = pickDestination();
  const dest = result.dest;
  const spot = result.spot;
  const isFactory = result.isFactory;
  const revisit = result.revisit;
  curCity = dest;
  curSpot = spot;
  G.visits[dest.name]=(G.visits[dest.name]||0)+1;
  setScene('travel');
  if(revisit){
    setMood('它说故地重游，说不定有新发现。','wow');
    setPanel('故地重游','再访 · '+dest.name,'集满了，它替你再看一眼','i-compass');
  }else{
    setMood('它出发了。工位空了。','wow');
    setPanel('已出发','目的地 · '+dest.name,'路上会寄东西回来','i-train');
  }
  bell('chime');

  // 轨道节点按站点数动态生成（v3 固定 5 个点，最后一个永远不亮）
  const $track=document.getElementById('track'), $fill=document.getElementById('trackFill'),
        $train=document.getElementById('trainIcon'), $j=document.getElementById('journey');
  document.getElementById('jCity').textContent=dest.name;
  $track.querySelectorAll('.node').forEach(n=>n.remove());
  const labels=['出发',...dest.stops,'到达'];
  const nodes=labels.map((t,i)=>{
    const p=i/(labels.length-1)*100;
    const n=document.createElement('div'); n.className='node';
    n.style.left=p+'%'; n.innerHTML=`<small>${t}</small>`;
    $track.appendChild(n); return {el:n,p};
  });
  $j.classList.add('on'); $fill.style.width='0%'; $train.style.left='0%';
  $train.classList.add('go'); nodes[0].el.classList.add('done');

  const per = JOURNEY_MS/(labels.length-1);
  journeyTimers=[];
  labels.forEach((t,i)=>{
    if(i===0) return;
    journeyTimers.push(setTimeout(()=>{
      const p=nodes[i].p;
      $fill.style.width=p+'%'; $train.style.left=p+'%'; nodes[i].el.classList.add('done');
      setPanel('在路上 · '+t, dest.name, t==='到达'?'正在写明信片…':'还有 '+Math.round(100-p)+'% 到', 'i-train');
    }, per*i));
  });
  // 路上寄来的碎片
  if(dest.peeks){
    dest.peeks.forEach((txt,i)=>{
      journeyTimers.push(setTimeout(()=>peek(dest, txt, i), JOURNEY_MS*(0.32+i*0.3)));
    });
  }
  journeyTimers.push(setTimeout(()=>arrive(dest, isFactory), JOURNEY_MS+500));
}
function peek(city, txt, i){
  const $p=document.getElementById('peek');
  document.getElementById('peekImg').src = thumb(city.photos[Math.min(i, city.photos.length-1)]);
  document.getElementById('peekTxt').textContent = txt;
  $p.classList.add('on'); bell('tick');
  setTimeout(()=>$p.classList.remove('on'), 4200);
}
function arrive(dest, isFactory){
  document.getElementById('trainIcon').classList.remove('go');
  const $f=document.getElementById('flash');
  $f.classList.add('on');
  setTimeout(()=>{
    bell('full');
    openPostcard(dest, null, false, curSpot, isFactory);
    $f.classList.remove('on');
  }, 520);
}

/* ══ 7. 明信片 ══ */
const $pcOvl=document.getElementById('pcOvl'), $pcCard=document.getElementById('pcCard');
let pcPhoto=null, pcFromCollection=false;
function openPostcard(city, photo, fromCollection, spotName){
  pcFromCollection=!!fromCollection;
  pcPhoto = photo || (fromCollection && spotName ? spotName : curSpot) || city.photos[Math.floor(Math.random()*city.photos.length)];
  const visits = G.visits[city.name] || 1;
  document.getElementById('pcCity').textContent=city.name;
  document.getElementById('pcIdx').textContent = fromCollection
      ? '第 '+visits+' 次去 · '+(spotName||'')
      : (spotName||'')+' · 它替你拍的';
  const img=document.getElementById('pcImg'); img.src=full(pcPhoto); img.alt=city.name;
  document.getElementById('pcCap').textContent=city.name+' · 牛马力 摄';
  document.getElementById('pcF1').textContent=city.f1;
  document.getElementById('pcF2').textContent=city.f2;
  const acts=document.getElementById('pcActs');
  const alreadyCollected = G.collection.find(c=>c.cityName===city.name && c.spotName===(spotName||curSpot||''));
  if(fromCollection || alreadyCollected){
    acts.innerHTML='<button class="btn btn-gold" disabled style="opacity:.55"><svg><use href="#i-mail"/></svg>已在册子里</button><button class="btn btn-ghost" data-close>再看一会儿</button>';
  }else{
    acts.innerHTML='<button class="btn btn-gold" id="pcKeep"><svg><use href="#i-mail"/></svg>收进册子</button><button class="btn btn-ghost" id="pcLater">待会儿再看</button>';
    document.getElementById('pcKeep').addEventListener('click', keepCard);
    document.getElementById('pcLater').addEventListener('click', ()=>closePostcard(true));
  }
  acts.querySelector('[data-close]')?.addEventListener('click', ()=>closePostcard(false));
  $pcCard.classList.remove('out'); $pcCard.style.animation='none'; void $pcCard.offsetWidth; $pcCard.style.animation='';
  $pcOvl.classList.add('on');
  setMood(fromCollection?'又看了一遍 '+city.name+' 的明信片':'收到明信片了','wow');
  if(!fromCollection){
    G.trips++; stats(); bump('#statTrips'); save();
    toast('牛马力从'+city.name+'寄来了明信片','i-mail');
  }
}
function closePostcard(back){
  hidePeek();
  $pcCard.classList.add('out');
  setTimeout(()=>{ $pcOvl.classList.remove('on'); $pcCard.classList.remove('out'); }, 380);
  // 不管是用「待会儿再看」关掉，还是用 ✕ / Esc / 点背景关掉，它都得回家。
  // 以前只有 back!==false 才回家，于是用 ✕ 关掉明信片，它就永远停在「旅途上」：
  // 摸不到、闲聊也不轮换。homeFromTrip 自己会判断是否真在旅途中，重复调用无害。
  setTimeout(homeFromTrip, 420);
}
/* 收起旅程轨道条。它只在出发时被 .add('on') 打开过，从来没有关过 ——
   所以旅行结束、明信片收进册子之后，那条「途经 XX」的进度条会一直挂在首页上。 */
function hideJourney(){
  const $j=document.getElementById('journey');
  if($j) $j.classList.remove('on');
  const $train=document.getElementById('trainIcon');
  if($train) $train.classList.remove('go');
  journeyTimers.forEach(clearTimeout); journeyTimers=[];
}
let homeToken=0;
function homeFromTrip(){
  if(!traveling) return;
  traveling=false; setScene('desk');
  setFace('happy');
  hideJourney();
  setPanel('回来了','等你下次送它出发','它把远方存在册子里了','i-spark');
  setMood('回到工位了。它有点晒黑了。','happy');
  G.lastArrival=today();
  save();
  // 「回来了」不该永远挂在首页。几秒后若没有别的事情发生，就回到待命文案。
  const token = ++homeToken;
  setTimeout(()=>{
    if(token!==homeToken) return;
    if(traveling || F.running || anyOverlay()) return;
    if($title.textContent!=='等你下次送它出发') return;   // 这中间已经切到别的状态了，别覆盖
    setPanel('牛马力正在待命','按住头像抚摸攒路费','每次 +1 路费 · +0.25 心情 · 攒够 100 就出发','i-paw');
  }, 8000);
}
function hidePeek(){ document.getElementById('peek').classList.remove('on'); }

function keepCard(){
  const city=curCity, spot=curSpot; if(!city) return;
  if(!G.collection.find(c=>c.cityName===city.name && c.spotName===spot)){
    G.collection.push({cityName:city.name, spotName:spot, at:Date.now()});
  }
  const src=document.getElementById('pcImg').getBoundingClientRect();
  const dst=document.getElementById('statCities').getBoundingClientRect();
  const fly=document.createElement('div'); fly.className='fly';
  fly.style.cssText=`left:${src.left}px;top:${src.top}px;width:${src.width}px;height:${src.height}px`;
  fly.innerHTML=`<img src="${thumb(pcPhoto)}" alt="">`;
  document.body.appendChild(fly);
  requestAnimationFrame(()=>{
    fly.style.left=(dst.left+dst.width/2-18)+'px';
    fly.style.top=(dst.top+dst.height/2-11)+'px';
    fly.style.width='36px'; fly.style.height='22px';
    fly.style.opacity='0.15'; fly.style.transform='rotate(14deg)';
  });
  setTimeout(()=>{ fly.remove(); bump('#statCities'); bell('chime'); }, 860);
  stats(); save();
  toast(spot+' 收进册子了','i-mail');
  closePostcard(true);
}

/* ══ 8. 收集册：真明信片墙 ══ */
const $colOvl=document.getElementById('colOvl'), $grid=document.getElementById('colGrid');
function openCollection(){
  const totalSpots = CITIES.reduce((s,c) => s + c.photos.length, 0);
  document.getElementById('colCount').textContent=G.collection.length;
  if(!G.collection.length){
    $grid.innerHTML=`<div class="col-empty"><svg><use href="#i-book"/></svg>
      还没有明信片<br><span style="font-size:.74rem;opacity:.7">攒够 100 路费，送牛马力出发去远方</span></div>`;
  }else{
    const allDone = G.collection.length >= totalSpots;
    let h = allDone ? `<div class="col-banner"><svg><use href="#i-spark"/></svg>全部地点都集齐了 · 接下来轮到你亲自去看看</div>` : '';
    h += `<div class="col-stat">已收集 <b>${G.collection.length}</b> / ${totalSpots} 个地点</div>`;
    h += `<div class="col-posts">${G.collection.map(item=>{
      const city=CITIES.find(c=>c.name===item.cityName);
      return `<button class="col-post" data-city="${item.cityName}" data-spot="${item.spotName}">
        <div class="post-img"><img src="${thumb(item.spotName)}" alt="${item.spotName}"></div>
        <div class="post-cap"><span class="post-city">${item.cityName}</span><span class="post-spot">${item.spotName}</span></div>
      </button>`;
    }).join('')}</div>`;
    $grid.innerHTML=h;
  }
  $colOvl.classList.add('on');
}
/* 从收集册查看已收集的地点的明信片 */
function showSpot(cityName, spotName){
  let city = CITIES.find(c=>c.name===cityName);
  if(!city) city = FACTORIES.find(f=>f.name===cityName);
  if(!city) return;
  $colOvl.classList.remove('on');
  setTimeout(()=>openPostcard(city, null, true, spotName, FACTORIES.some(f=>f.name===cityName)), 220);
}
document.getElementById('colX').addEventListener('click',()=>$colOvl.classList.remove('on'));
document.getElementById('colClose').addEventListener('click',()=>$colOvl.classList.remove('on'));
document.getElementById('pcX').addEventListener('click',()=>closePostcard(false));

/* ══ 9. 摸头 v5.1：按住来回摸（不用狂点），确定性给路费 ══
   经济口径：每次 +1 路费，每天前 30 次有效（上限 30）；之后只涨心情。
   专注仍是主力（25 分钟 = 25 路费），摸头是「零花钱」，不替代番茄钟。 */
const PET_LINES=['蹭了蹭你的手，暖暖的','舒服地眯起了眼睛','用头顶了顶你的手心',
  '尾巴晃了两下','看了你一眼，目光软软的','打了个响鼻，把下巴搁你手背上',
  '喉咙里咕噜了一声','把脑袋往你掌心里拱'];
const $petRing=document.getElementById('petRing'), $petCombo=document.getElementById('petCombo');
const RING_LEN=2*Math.PI*47;
function petQuota(){ return Math.max(0, PET_DAILY-(G.petToday||0)); }

function floatText(str, x, y){
  const e=document.createElement('div'); e.className='pet-float'; e.textContent=str;
  e.style.left=x+'px'; e.style.top=y+'px';
  $portrait.appendChild(e); setTimeout(()=>e.remove(),1100);
}
/* v5.2：浮字挂在"真正变化的那个数字"上——路费从路费数字飘，心情从心形飘。
   用户看不到数字动，就等于没给。 */
function floatFrom(sel, text, cls){
  const el = document.querySelector(sel); if(!el) return;
  const r = el.getBoundingClientRect(); if(!r.width && !r.height) return;
  const e = document.createElement('div');
  e.className = 'num-float '+(cls||''); e.textContent = text;
  e.style.left = (r.left + r.width/2)+'px';
  e.style.top  = (r.top - 6)+'px';
  document.body.appendChild(e); setTimeout(()=>e.remove(),1300);
}
const noneFloatAt={};                   // 按锚点分别节流，否则"心情满格"会盖掉"额度用完"
function floatNone(sel,text){           // 没加成也要说清楚为什么，不能静默
  const now=Date.now();
  if(noneFloatAt[sel] && now-noneFloatAt[sel]<2500) return;
  noneFloatAt[sel]=now;
  floatFrom(sel,text,'none');
}
function renderPetRing(pct){
  const c=$petRing.querySelector('circle');
  c.style.strokeDashoffset=(RING_LEN*(1-Math.min(1,Math.max(0,pct)))).toFixed(1);
}

/* 心情溢出 → 随机掉饲料 */
function maybeMoodOverflowFeed(gain, fromGame){
  const oldMood=G.mood;
  const newMood=Math.min(5, oldMood+gain);
  const overflow=oldMood+gain - newMood;
  if(overflow<=0) return;
  const chances=Math.floor(overflow/0.25);
  const prob=fromGame?0.6:0.1;  // 玩游戏60%, 摸头10%
  let drops=0;
  for(let i=0;i<chances;i++){ if(Math.random()<prob) drops++; }
  if(drops>0){
    G.feed.bag+=drops;
    toast('心情好得冒泡，溢出了 '+drops+' 袋饲料 🌾','i-spark');
    stats();
  }
}

/* 探宝稀有度映射到目录 */
const HUNT_TIER_FOLDER={t1:'普通级',t2:'稀有级',t3:'史诗级'};

/* src='stroke' 按住抚摸 / 'tap' 菜单里点一下 */
function pet(src){
  src = src || 'tap';
  if(traveling){ toast('它不在，摸不到。铃铛留在这儿了','i-bell'); setMood('摸了个空。它出发了。','sorry'); return false; }
  if(src==='tap'){ if(petLock) return false; petLock=true; setTimeout(()=>petLock=false,220); }

  G.petToday=(G.petToday||0)+1;
  const quota = petQuota() > 0;                 // 本次是否还在今日额度内
  /* v5.2：轻点 / 抚摸 / 按住连摸，一律 +0.25，和浮字写的数一致 */
  const moodGain = Math.min(0.25, Math.max(0, 5 - G.mood));
  G.mood = Math.min(5, G.mood + 0.25);

  setMood(PET_LINES[Math.floor(Math.random()*PET_LINES.length)], G.mood>=4.4?'love':'happy');
  bell(src==='stroke' ? 'tick' : 'chime');

  /* 心形 pop + 精确数值 +0.25 浮字（两条反馈同时给，别再"看不出来"） */
  renderHearts();
  if(moodGain>0) floatFrom('#hearts','+'+moodGain.toFixed(2)+' 心情','mood');
  else floatNone('#hearts','心情满格 5.00');
  const hs=$hearts.querySelectorAll('svg');
  hs.forEach((s2,i)=>{ if(i<Math.round(G.mood)){ s2.classList.remove('pop'); void s2.offsetWidth; s2.classList.add('pop'); }});

  if(quota){
    maybeMoodOverflowFeed(0.25, false);
    G.fare += PET_FARE; stats(); bump('#stFare');
    floatFrom('#stFare','+'+PET_FARE+' 路费','fare');
  }else{
    floatNone('#stFare','今日 30 次已摸完 · 只涨心情');
  }
  /* 心情满：当天第一次必得 5 路费（取消原来的 35% 随机，改成确定反馈） */
  if(G.mood>=5 && !G.petBonusToday){
    G.petBonusToday=true; G.fare+=5; stats();
    setTimeout(()=>toast('它心情太好，塞给你 5 路费','i-spark'),450);
  }
  if(G.petToday===PET_DAILY+1){
    setTimeout(()=>setPanel('今天摸了 30 次了','再摸只涨心情','专注 25 分钟 = 25 路费，摸头是零花钱','i-paw'),800);
  }
  save(); refreshPetBadge();
  return true;
}

/* 按住头像来回移动 = 抚摸；轻点（几乎没移动）仍然走「打开菜单」
   手势期间在 window 上监听，不用 setPointerCapture：
   捕获会让部分浏览器提前派发 leave/cancel，把手势打断。 */
function onPetMove(e){
  if(!petting) return;
  const dx=e.clientX-petLastX, dy=e.clientY-petLastY, d=Math.hypot(dx,dy);
  petLastX=e.clientX; petLastY=e.clientY; petMoved+=d; petAcc+=d;
  if(d>0.4) $portrait.style.setProperty('--tilt', Math.max(-7,Math.min(7,dx*0.4)).toFixed(2)+'deg');
  renderPetRing(petAcc/STROKE_PX);
  if(petAcc>=STROKE_PX){
    petAcc=0; petCombo++;
    clearTimeout(petComboT);
    petComboT=setTimeout(()=>{ petCombo=0; $petCombo.classList.remove('on'); },1500);
    if(petCombo>1){
      $petCombo.textContent='连摸 ×'+petCombo;
      $petCombo.classList.remove('on'); void $petCombo.offsetWidth; $petCombo.classList.add('on');
    }
    pet('stroke');
  }
}
function endPet(){
  if(!petting) return; petting=false;
  removeEventListener('pointermove', onPetMove);
  removeEventListener('pointerup', endPet);
  removeEventListener('pointercancel', endPet);
  $portrait.classList.remove('petting'); $petRing.classList.remove('on');
  $portrait.style.removeProperty('--tilt'); renderPetRing(0);
}
$portrait.addEventListener('pointerdown', e=>{
  if(e.button!==undefined && e.button!==0) return;
  if(traveling || anyOverlay()) return;
  if(e.cancelable) e.preventDefault();
  petting=true; petMoved=0; petAcc=0; petLastX=e.clientX; petLastY=e.clientY;
  $petRing.classList.add('on'); $portrait.classList.add('petting'); renderPetRing(0);
  addEventListener('pointermove', onPetMove, {passive:true});
  addEventListener('pointerup', endPet);
  addEventListener('pointercancel', endPet);
});

/* ══ 10. 番茄钟：v6r 专注进行中不可收起；暂停后可缩到右下角 ══ */
let F={running:false,left:FOCUS_LEN,total:FOCUS_LEN,timer:null,earned:0};
const $fcOvl=document.getElementById('fcOvl'), $badge=document.getElementById('focusBadge');
const PACK_LINES=['它在把地图塞进背包侧兜','它在给铃铛系紧一点','它替你削好了一支笔',
  '它在查天气，怕你冷','它把工牌摘下来放抽屉里了','它在数还剩多少路费'];
let packIdx=0;
function mmss(s){ s=Math.max(0,Math.round(s)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function openFocus(){ renderFocus(); $fcOvl.classList.add('on'); }
/* v6r：三态语义
   专注进行中 → 按 Esc / 点弹窗外 = 暂停（弹窗保留）
   已暂停     → 按 Esc / 点弹窗外 = 缩到右下角徽章，暂停状态保持
   未开始     → 按 Esc / 点弹窗外 = 直接关闭 */
function closeFocus(){
  if(F.running){ pauseFocus(); toast('已暂停，专注可继续','i-pause'); return; }
  if(F.left < F.total){ minFocus(); return; }
  $fcOvl.classList.remove('on');
}
function minFocus(){
  $fcOvl.classList.remove('on'); badgeOn(); renderFocus();
  toast('已收起，计时暂停中','i-pin');
}
function endFocus(){
  const hadProgress = F.left < F.total;
  const done = Math.floor((F.total-F.left)/60);
  cashOut();                       // 结算 + 入账 + 复位
  closeFocus();
  if(!hadProgress) toast('本次还没开始，没有路费入账','i-clock');
  else if(done<=0) toast('不足 1 分钟，按分钟入账所以这次是 0 —— 不收惩罚','i-clock');
  // sad：专注 <5 分钟就结束
  if(done > 0 && done < 5){
    setFace('sad');
    setMood('还没开始就结束了…你还好吗','sad');
  }
  // angry：连续 3 次放弃番茄钟（专注<10分钟）
  if(done > 0 && done < 10){
    G.focusAbandonStreak = (G.focusAbandonStreak||0) + 1;
    if(G.focusAbandonStreak >= 3){
      setFace('angry');
      setMood('又放弃了？你行不行啊','angry');
      toast('第 '+G.focusAbandonStreak+' 次了。牛马力有点生气。','i-clock');
    }
  }else{
    G.focusAbandonStreak = 0;
  }
}
document.getElementById('fcX').addEventListener('click', closeFocus);
document.getElementById('fcBtn').addEventListener('click', ()=> F.running?pauseFocus():startFocus());
document.getElementById('fcEnd').addEventListener('click', endFocus);
$badge.addEventListener('click', openFocus);

function startFocus(){
  if(F.left<=0) F.left=F.total;
  F.running=true; bell('tick');
  document.getElementById('fcCow').classList.add('run'); setFace('pack');
  if(!traveling){ setMood('它在收拾背包。你专心。','pack');
    setPanel('专注中','你在打工，它在攒路费','番茄钟不可关闭或收起','i-clock'); }
  renderFocus();
  clearInterval(F.timer);
  F.timer=setInterval(tick,1000);
}
function pauseFocus(){
  F.running=false; clearInterval(F.timer);
  document.getElementById('fcCow').classList.remove('run');
  renderFocus();
}
function tick(){
  F.left--;
  if(F.left%12===0){ packIdx=(packIdx+1)%PACK_LINES.length;
    const l=document.getElementById('fcLine');
    if(!traveling) setMood(PACK_LINES[packIdx],'pack');
    if($fcOvl.classList.contains('on')){ l.style.opacity=0; setTimeout(()=>{l.textContent=PACK_LINES[packIdx];l.style.opacity=1;},200);} }
  if(F.left<=0){ completeFocus(); return; }
  renderFocus();
}
function completeFocus(){
  clearInterval(F.timer); F.running=false;
  const got=Math.round(F.total/60);
  F.earned+=got; G.fare+=got; G.focusMin+=got; G.focusSess++;
  G.focusAbandonStreak = 0;  // 完整完成→重置放弃计数
  F.left=F.total;
  document.getElementById('fcCow').classList.remove('run');
  bell('full'); stats(); bump('#stFare'); bump('#statFocus');
  floatFrom('#stFare','+'+got+' 路费','fare');
  setFace('love'); setMood('专注完成！路费到账了','love');
  setPanel('专注完成','+'+got+' 路费','今日第 '+G.focusSess+' 个番茄'+(G.fare>=TRAVEL_COST?' · 够出发了':''),'i-spark');
  toast(`专注完成，攒了 ${got} 路费${G.fare>=TRAVEL_COST?'，可以出发了':''}`,'i-spark');
  save(); renderFocus(); badgeOff();
}
/* 提前结束：已专注的分钟照样入账，不惩罚（对齐文档 4.2） */
function cashOut(){
  if(F.left>=F.total) return;
  const done=Math.floor((F.total-F.left)/60);
  clearInterval(F.timer); F.running=false;
  document.getElementById('fcCow').classList.remove('run');
  if(done>0){ F.earned+=done; G.fare+=done; G.focusMin+=done;
    floatFrom('#stFare','+'+done+' 路费','fare'); bump('#stFare'); bump('#statFocus');
    setPanel('已结束并入账','+'+done+' 路费','已专注的分钟照样算，不惩罚','i-clock');
    toast(`结束专注，已专注的 ${done} 分钟换算成 ${done} 路费`,'i-clock'); bell('chime'); }
  F.left=F.total; stats(); save(); calcFocusFeed(); renderFocus(); badgeOff();
  setFace('happy');
}
function renderFocus(){
  const p=(F.total-F.left)/F.total;
  document.getElementById('fcTime').textContent=mmss(F.left);
  document.getElementById('fcArc').style.strokeDashoffset=(339.3*(1-p)).toFixed(1);
  document.getElementById('fcEarn').textContent=F.earned;
  document.getElementById('fcSess').textContent=G.focusSess;
  const b=document.getElementById('fcBtn'), lbl=b.querySelector('span'), ic=b.querySelector('use');
  if(F.running){ lbl.textContent='暂停'; ic.setAttribute('href','#i-pause'); b.classList.remove('btn-gold'); b.classList.add('btn-glass'); }
  else { lbl.textContent = F.left<F.total ? '继续专注' : '开始专注'; ic.setAttribute('href','#i-play'); b.classList.add('btn-gold'); b.classList.remove('btn-glass'); }
  // 徽章
  document.getElementById('fbTime').textContent=mmss(F.left);
  document.getElementById('fbArc').style.strokeDashoffset=(97.4*(1-p)).toFixed(1);
  document.getElementById('fbPct').textContent=Math.round(p*100)+'%';
  document.getElementById('fbLbl').textContent=F.running?'专注中 · 攒路费':'已暂停 · 点我继续';
}
function badgeOn(){ $badge.classList.add('on'); }
function badgeOff(){ if(F.left>=F.total) $badge.classList.remove('on'); }

/* ══ 11. 弹层管理 / 键盘 ══ */
function anyOverlay(){ return document.querySelector('.ovl.on, .guide.on'); }
addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  if(e.isComposing || e.keyCode===229) return;   // 用 Esc 取消拼音候选时别顺手关掉弹层
  if($fcOvl.classList.contains('on')) return closeFocus();
  if($colOvl.classList.contains('on')) return $colOvl.classList.remove('on');
  if($pcOvl.classList.contains('on')) return closePostcard(false);
  if($offOvl.classList.contains('on')) return closeOffCheckin();
  if(document.getElementById('jrOvl').classList.contains('on')) return document.getElementById('jrOvl').classList.remove('on');
  if(document.getElementById('hrOvl').classList.contains('on')) return document.getElementById('hrOvl').classList.remove('on');
});
document.querySelectorAll('.ovl').forEach(o=>o.addEventListener('mousedown',e=>{
  if(e.target!==o) return;
  if(o===$pcOvl) return closePostcard(false);
  if(o===$fcOvl) return closeFocus();     // 点弹窗外：有进度则结束入账，未开始则直接关闭
  if(o===$offOvl) return closeOffCheckin();
  o.classList.remove('on');
}));
/* ══ 12. 演示模式：连点 3 次左下角版本号 ══ */
let vc=0, vt=null;
document.getElementById('verTag').style.pointerEvents='auto';
document.getElementById('verTag').style.cursor='pointer';
document.getElementById('verTag').addEventListener('click',()=>{
  vc++; clearTimeout(vt); vt=setTimeout(()=>vc=0,900);
  if(vc<3) return; vc=0;
  DEMO=!DEMO; JOURNEY_MS = DEMO?5000:14000;
  if(DEMO){ G.fare+=500; stats(); save(); toast('演示模式开：路费 +500，旅程缩短到 5 秒','i-spark'); bell('chime'); }
  else toast('演示模式关：旅程 14 秒','i-clock');
});

/* ══ v8 ══ 双打卡 + 饲料 + 手帐 ══ */

/* ── 收工确认弹窗：不再让「收工」是一个说不清后果的单击 ── */
const $offOvl=document.getElementById('offOvl');
let offPendingHours=0, offOkTimer=0;

/* 开工时间写成 09:12 */
function offClockStr(ts){
  const d=new Date(ts||Date.now());
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
/* 今天收工能不能接上昨天的闭环（决定连续天数是 +1 还是清零） */
function closesYesterdayLoop(){
  return today()!==yesterday() && G.checkin.offDate===yesterday()
      && G.journal.some(j=>j.date===yesterday());
}
/* 按工时挑它的表情：走得早它舍不得，干太久它心疼，正常就开心 */
function offFaceFor(hours){
  if(hours<8)  return {key:'pack',  kicker:'今天走得早', note:'它把背包又放下了 —— 要再陪你一会儿吗？'};
  if(hours>10) return {key:'sorry', kicker:'今天有点长', note:'它没说话，只是把水杯往你那边推了推。'};
  return {key:'love', kicker:'今天辛苦了', note:'它一直替你数着时间呢。'};
}

function updateCheckinUI(){
  const btn=document.getElementById('ckBtn');
  if(G.checkin.workDate!==today()){
    btn.className='ck-btn state-work btn-gold';
    btn.innerHTML='<svg><use href="#i-check"/></svg><span>开工打卡 · 我替你守着</span>';
    btn.onclick=_=>workCheckin();
  }else if(G.checkin.offDate!==today()){
    // 收工按钮原来是不显眼的玻璃底，很多人根本不知道在这儿下班。
    // 改成和开工同级的实心按钮（配色见 .ck-btn.state-off.btn-gold）。
    btn.className='ck-btn state-off btn-gold';
    btn.innerHTML='<svg><use href="#i-clock"/></svg><span>收工打卡 · 看看今天干了多久</span>';
    btn.onclick=_=>offCheckin();
  }else{
    btn.className='ck-btn state-done';
    btn.innerHTML='<svg><use href="#i-check"/></svg><span>今日已收工 ✓</span>';
    btn.onclick=null;
  }
}

function workCheckin(){
  if(G.checkin.workDate===today()) return toast('今天已经开工了','i-check');
  G.checkin.workDate=today();
  G.checkin.workStart=Date.now();
  G.feed.bag+=3;
  save(); bell('chime');
  toast('开工打卡 +3 饲料 🌾 · 开工大吉','i-ticket');
  updateCheckinUI(); stats(); setPanel('已开工','今天预计多少工时？','收工时自动算路费','i-check');
}

function offCheckin(){
  if(G.checkin.offDate===today()) return toast('今日已收工','i-check');
  if(G.checkin.workDate!==today()) return toast('今天还没开工呢','i-clock');
  // 刚开工就「收工」几乎一定是连点误触：开工按钮点完会原地变成收工按钮，
  // 双击的第二次点击正好落在它上面。直接拦掉，别把一整天的记录烧了。
  const elapsedMin=(Date.now()-G.checkin.workStart)/60000;
  if(elapsedMin<1) return toast('才开工不到 1 分钟，先别急着收工','i-clock');
  // 自动计算工时：现在 - 上班 - 1小时午休
  const el=elapsedMin/60 - 1;
  const hours=Math.max(0.5, Math.min(16, Math.round(el*2)/2));
  askOffCheckin(hours);   // 先把工时和它的表情摊开给你看，确认了才真收工
}

/* ── 收工确认弹窗的开 / 关 ── */
function askOffCheckin(hours){
  offPendingHours=hours;
  const earned=Math.round(hours*10);
  const f=offFaceFor(hours);
  const cont=closesYesterdayLoop();
  document.getElementById('offFace').src=face(f.key);
  document.getElementById('offKicker').textContent=f.kicker;
  document.getElementById('offHours').textContent=hours.toFixed(1);
  document.getElementById('offSub').textContent=f.note;
  document.getElementById('offStart').textContent=offClockStr(G.checkin.workStart);
  document.getElementById('offEarn').textContent='+'+earned+' 路费';
  document.getElementById('offStreak').textContent=(cont? G.checkin.streak+1 : 1)+' 天';
  document.getElementById('offNote').textContent=cont
    ? '确认后它会记一页手帐，连续天数接着往上走'
    : '确认后它会记一页手帐，并从今天重新数连续天数';
  // 防连点：弹窗出来后 400ms 才让确认键可点，双击的第二下不会直接落上去
  const ok=document.getElementById('offOk');
  ok.disabled=true;
  clearTimeout(offOkTimer);
  offOkTimer=setTimeout(()=>{ ok.disabled=false; },400);
  $offOvl.classList.add('on');
}
function closeOffCheckin(){
  clearTimeout(offOkTimer); offOkTimer=0;
  $offOvl.classList.remove('on');
}
function commitOffCheckin(){
  const hours=offPendingHours;
  closeOffCheckin();
  confirmOffCheckin(hours);
}
document.getElementById('offOk').addEventListener('click', commitOffCheckin);
document.getElementById('offCancel').addEventListener('click', closeOffCheckin);
document.getElementById('offX').addEventListener('click', closeOffCheckin);

function confirmOffCheckin(hours){
  // ⚡ 先检查昨天是否闭环（此时 offDate 还是昨天的值）
  const completed=closesYesterdayLoop();
  G.checkin.offDate=today();
  G.checkin.hours=hours;
  const earned=Math.round(hours*10);
  G.fare+=earned;
  // 连续天数
  if(completed) G.checkin.streak+=1;
  else G.checkin.streak=1;
  G.checkin.total+=1;
  // 连续打卡 5 天奖励 1 袋饲料
  if(G.checkin.streak % 5 === 0){
    G.feed.bag += 1;
    toast('连续 '+G.checkin.streak+' 天打卡 · 奖励 1 袋饲料 🌾','i-ticket');
  }
  // 生成手帐
  G.journal.unshift(makeJournalEntry(hours));
  checkStamps();
  save(); bell('chime');
  toast('收工！工时 '+hours.toFixed(1)+'h · +'+earned+' 路费 💰','i-ticket');
  updateCheckinUI(); stats();
  setPanel('已收工','工时 '+hours.toFixed(1)+'h · +'+earned+' 路费','它记了一页手帐','i-book');
  // 展示手帐
  renderJournalView();
  document.getElementById('jrOvl').classList.add('on');
}

/* ── 饲料 ── */
function feedCow(){
  if(G.feed.bag<=0) return;
  // 防连点：已有游戏弹窗时忽略
  if($frtOvl.classList.contains('on')||$mbOvl.classList.contains('on')||$huntOvl.classList.contains('on')) return;
  G.feed.bag-=1;
  save(); bell('chime');
  stats();
  // 随机 3 种玩法
  const roll=Math.random();
  if(roll<0.33) openFortune();
  else if(roll<0.66) openMoonBlock();
  else openTreasureHunt();
}

/* ══ 摸鱼探宝 ══ */
const HUNT_TIERS={
  t1:{name:'普通',emoji:'🟢',prob:0.60,fare:5, moodUp:0.1, clr:'t1'},
  t2:{name:'稀有',emoji:'🔵',prob:0.25,fare:10,moodUp:0.2, clr:'t2'},
  t3:{name:'史诗',emoji:'🟣',prob:0.10,fare:20,moodUp:0.3, clr:'t3'},
  t4:{name:'传说',emoji:'🟡',prob:0.04,fare:40,moodUp:0.5, clr:'t4'},
  t5:{name:'究极',emoji:'🔴',prob:0.01,fare:80,moodUp:1.0, clr:'t5'},
};
const HUNT_ITEMS=[
  // 普通级
  {tier:'t1',file:'便利贴乌龟打叉李总.jpg',story:'在打印机下面发现的便利贴，画了只乌龟，下面写「王总」又划掉了——改成了「李总」'},
  {tier:'t1',file:'同事零食抽屉干净版2025.jpg',story:'同事的零食抽屉——满的，像刚补过货。旁边一张纸条：「随便吃，别告诉老板 🤫」'},
  {tier:'t1',file:'外卖漫画.jpg',story:'外卖单背面画了四格漫画：工位→会议→工位→天黑。旁边一行小字：「又是充实的一天」'},
  {tier:'t1',file:'离职申请文件堆角落.jpg',story:'文件柜深处压着一份离职申请，日期是三年前的。谁写的不知道，但字很好看'},
  {tier:'t1',file:'绿萝求救写实桌面版.jpg',story:'窗台上那盆绿萝枯了一半，花盆上贴了一张便利贴：「我叫绿萝。救救我。——来自你的同事」'},
  {tier:'t1',file:'C位小牛团建大合照.jpg',story:'它翻出一张团建大合照——你在C位，笑得特别开心。它盯着看了半天：「原来你笑起来是这样的啊」'},
  {tier:'t1',file:'抽屉翻出暖心纸条微距特写版.jpg',story:'抽屉最深处翻出一张发黄的纸条，上面写着：「加油！你做得很好🫶」——应该是很久以前谁偷偷塞进去的'},
  {tier:'t1',file:'漫画风暂时离开工位.jpg',story:'工位上贴了一张手绘告示：「暂时离开，去接杯水顺便思考了一下人生。——你的工位」'},
  {tier:'t1',file:'窗台绿萝开花治愈插画版.jpg',story:'窗台上的绿萝居然开花了——它说这盆花它天天浇水，叫「办公室的第三個员工」'},
  {tier:'t1',file:'牛马力显示器微光中裹毯熟睡.jpg',story:'它发现你缩在显示器前面睡着了，毯子裹得像个茧。它把铃铛调成了静音——「睡吧，我替你盯着。」'},
  {tier:'t1',file:'章鱼打工人八爪齐飞.jpg',story:'一张手绘——章鱼坐在工位上，八只手同时敲键盘、接电话、喝咖啡、摸鱼。它看完沉默了：「原来你的工位是这么用的。」'},
  {tier:'t1',file:'章鱼八爪开花全能打工人.jpg',story:'章鱼老板的桌上贴了一张员工表，你的照片旁边画了八只触手。它数了数：「你一个人干了八个岗位的活……这个家没有你得散。」'},
  // 稀有级
  {tier:'t2',file:'性感小鸡夜店热舞.jpg',story:'它从门卫大爷的电脑回收站里翻出来的。大爷的收藏……比你的丰富'},
  {tier:'t2',file:'沙滩橘猫咬嘴唇版.jpg',story:'它路过前台小姐姐的工位，看见键盘上放着一只橘猫手机支架。小牛说：「你同事的猫比你好看。」'},
  {tier:'t2',file:'赛博朋克狗狗DJ.jpg',story:'老板的办公室传出来的音乐。小牛贴着门听了一会儿：「你老板的歌单……还行」'},
  {tier:'t2',file:'拍立得团建合照便利贴版.jpg',story:'一张拍立得，背后写着你的名字和一颗爱心。它翻过来看了看：「有人专门写了你的名字。你猜是谁？」'},
  {tier:'t2',file:'动物轰趴团建KTV.jpg',story:'它不知道从哪翻出一张团建合照，全员在KTV——你不在里面。它说：「你那天在加班。」'},
  {tier:'t2',file:'动物露营团建小牛跳舞版.jpg',story:'露营团建的签名板！上面有你的名字，旁边画了一只跳舞的小牛。它看了很久，「这是我画的哦」'},
  {tier:'t2',file:'小牛凌晨上线成功侧面光影微笑.jpg',story:'凌晨两点，系统终于上线了。它不知道从哪溜进机房，看见你对着屏幕笑了一下。它没出声，在角落坐了一会儿就走了。'},
  // 史诗级
  {tier:'t3',file:'国潮小牛封面_男明星pose版.jpg',story:'一张国潮风封面——小牛穿着印花衬衫站在天台，旁边写着你的名字。它清了清嗓子：「这是下一期团建的海报模特。」'},
  {tier:'t3',file:'Niumali宝丽来像素诞生.jpg',story:'一张宝丽来照片——像素风的小方块排列成牛马力的形状。它举着照片说：「这是我年轻的时候，像素还是热的。」'},
  {tier:'t3',file:'牛马力春日樱花树下小憩电影海报.jpg',story:'一张电影海报：「牛马力の春」。它躺在樱花树下，头顶飘着花瓣。它说：「这部电影的主演是我，编剧是你。」'},
  {tier:'t3',file:'Niumali屋顶仰望银河_仰视角度.jpg',story:'它半夜爬上天台，仰面躺着看星星。你说「外面冷」，它说「银河不冷。」然后打了个喷嚏。'},
];

function openTreasureHunt(){
  // 选稀有度
  const r=Math.random(); let acc=0; let tierKey='t1';
  for(const key of ['t1','t2','t3','t4','t5']){
    acc+=HUNT_TIERS[key].prob; if(r<acc){tierKey=key; break;}
  }
  const tier=HUNT_TIERS[tierKey];
  // 从该等级挑一张图（可重复抽中）
  const items=HUNT_ITEMS.filter(i=>i.tier===tierKey);
  const item=items.length?items[Math.floor(Math.random()*items.length)]:null;
  
  // 结算：找到东西才给奖励
  if(item){
    G.fare+=tier.fare; G.mood=Math.min(G.mood+(tier.moodUp||0),5);
    maybeMoodOverflowFeed(tier.moodUp||0, true);
    G.feed.fedTotal+=1;
    // 探宝手册不重复记录
    G.huntLoot=G.huntLoot||[];
    if(!G.huntLoot.some(l=>l.file===item.file)){
      G.huntLoot.unshift({tier:tierKey,name:tier.name,emoji:tier.emoji,file:item.file,story:item.story,fare:tier.fare,date:today()});
    }
  }
  save();
  
  // 显示
  $huntTier.textContent=tier.emoji+' '+tier.name;
  $huntTier.className='hunt-tier '+tier.clr;
  if(item){
    $huntImg.src='assets/images/探宝/'+(HUNT_TIER_FOLDER[item.tier]||'')+'/'+item.file;
    $huntImg.style.display='block';
    $huntStory.textContent=item.story;
  }else{
    $huntImg.style.display='none';
    $huntStory.textContent='它溜达了一圈，没找到什么特别的东西……';
  }
  $huntReward.textContent='+'+tier.fare+' 路费 · ❤️+'+(tier.moodUp||0);
  $huntOvl.classList.add('on');
  toast(tier.emoji+' 摸到'+tier.name+'级宝贝：+'+tier.fare+'路费','i-ticket');
  renderHearts(); stats();
}
function closeTreasureHunt(){ $huntOvl.classList.remove('on'); }

/* ── 探宝手册 ── */
function openHuntAlbum(){
  const loot=G.huntLoot||[];
  let html='';
  if(!loot.length){
    html='<div class="ha-empty"><span class="ha-empty-ico">🔎</span><div>还没有发现过宝藏</div><div class="dim">喂饲料出去溜达看看？</div></div>';
  }else{
    // 统计各等级
    const keys=['t1','t2','t3','t4','t5'];
    const emojis={t1:'🟢',t2:'🔵',t3:'🟣',t4:'🟡',t5:'🔴'};
    const names={t1:'普通',t2:'稀有',t3:'史诗',t4:'传说',t5:'究极'};
    const stats=keys.map(k=>({k,c:loot.filter(i=>i.tier===k).length,emo:emojis[k],n:names[k]})).filter(s=>s.c>0);
    html='<div class="ha-stats"><span>累计发现 '+loot.length+' 件宝藏</span><span class="ha-tier-dots">'+stats.map(s=>'<span class="ha-dot">'+s.emo+s.c+'</span>').join('')+'</span></div>';
    for(const item of loot){
      const tierClr='t'+(item.tier||'1').slice(1);
      html+='<div class="ha-card '+tierClr+'"><img class="ha-card-img" src="assets/images/探宝/'+(HUNT_TIER_FOLDER[item.tier]||'')+'/'+item.file+'" alt=""><div class="ha-card-body"><span class="ha-card-tier">'+item.emoji+' '+item.name+'</span><span class="ha-card-story">'+item.story+'</span><span class="ha-card-meta">+'+item.fare+' 路费 · '+(item.date||'')+'</span></div></div>';
    }
  }
  $haBody.innerHTML=html;
  $haOvl.classList.add('on');
}
function closeHuntAlbum(){ $haOvl.classList.remove('on'); }

/* ── 工具函数 ── */
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ── 待办清单 ── */
function renderTodoList(){
  const todos=G.todos||[];
  const done=todos.filter(t=>t.done).length;
  document.getElementById('tdSub').textContent=done+' / '+todos.length+' 已完成';
  if(!todos.length){
    document.getElementById('tdBody').innerHTML='<div class="td-empty">还没有待办<br><span class="td-tag">在下方输入添加</span></div>';
    return;
  }
  document.getElementById('tdBody').innerHTML=todos.map(t=>
    '<div class="td-item" data-id="'+t.id+'">'+
      '<div class="td-check'+(t.done?' done':'')+'" data-act="toggle"></div>'+
      '<span class="td-text'+(t.done?' done':'')+'">'+escHtml(t.text)+'</span>'+
      '<button class="td-del" data-act="del">✕</button>'+
    '</div>'
  ).join('');
  // 事件委托
  const body=document.getElementById('tdBody');
  body.onclick=function(e){
    const item=e.target.closest('.td-item');
    if(!item) return;
    const id=parseInt(item.dataset.id);
    const act=e.target.dataset.act;
    if(act==='toggle') toggleTodo(id);
    else if(act==='del') deleteTodo(id);
  };
}
/* 面板和首页那枚「N 待办」徽标必须一起刷新，否则数字会对不上：
   以前只有 toggleTodo 顺手调了 stats()，「新加一条」和「删掉一条」
   都不刷新首页——面板里 4 条未完成，首页还停在 2。 */
function refreshTodos(){ renderTodoList(); stats(); }
function openTodo(){ refreshTodos(); document.getElementById('tdOvl').classList.add('on'); }
function closeTodo(){ document.getElementById('tdOvl').classList.remove('on'); }
function addTodo(){
  const inp=document.getElementById('tdInput');
  const text=inp.value.trim();
  if(!text) return;
  G.todos=G.todos||[];
  const id=Date.now();
  G.todos.unshift({id,text,done:false,createdAt:today()});
  inp.value='';
  save(); refreshTodos();
}
function toggleTodo(id){
  const t=(G.todos||[]).find(t=>t.id===id);
  if(!t) return;
  t.done=!t.done;
  if(t.done){
    t.completedAt=today();
    const doneToday=(G.todos||[]).filter(t2=>t2.done && t2.completedAt===today()).length;
    if(doneToday<=TODO_DAILY){
      G.fare+=TODO_FARE;
      toast('划掉待办 +'+TODO_FARE+' 路费 💰','i-ticket');
    }else{
      toast('今日待办路费已领完（前 '+TODO_DAILY+' 条）','i-check');
    }
  }else{
    delete t.completedAt;
  }
  save(); refreshTodos();
}
function deleteTodo(id){
  G.todos=(G.todos||[]).filter(t=>t.id!==id);
  save(); refreshTodos();       // 删掉一条也要同步首页徽标
}

/* ── 今日求签 ── */
const FORTUNE_SLIPS=[
  {emoji:'🏆',name:'上上签',desc:'今日事事顺心 · 老板请假了',prob:0.03,fare:50,moodUp:1, face:'小牛比心表情包.jpg'},
  {emoji:'🎋',name:'上签',desc:'好运正在路上 · 茶水间送奶茶',prob:0.12,fare:30,moodUp:0.5, face:'小牛撒娇表情包.jpg'},
  {emoji:'🍃',name:'中签',desc:'宜静不宜动 · 下午不用开会',prob:0.25,fare:10,moodUp:0.25, face:'小牛表情包_开心微笑.jpg'},
  {emoji:'🍂',name:'下签',desc:'好事多磨 · 周五了',prob:0.15,fare:5,moodUp:0, face:'小牛表情包_惊讶震惊.jpg'},
  {emoji:'🪵',name:'下下签',desc:'凡事宜耐心 · 还有2小时下班',prob:0.45,fare:0,moodUp:0, face:'小牛表情包_伤心哭泣.jpg'},
];
function openFortune(){
  $frtOvl.classList.add('on');
  $frtQ.classList.remove('hidden');
  $frtR.classList.add('hidden');
  $frtBody.onclick=function revealFortune(){
    $frtBody.onclick=null;
    // 签筒摇晃
    const qImg=$frtQ.querySelector('.frt-q-img');
    if(qImg) qImg.classList.add('frt-shake');
    setTimeout(function(){
      $frtQ.classList.add('hidden');
      if(qImg) qImg.classList.remove('frt-shake');
      const r=Math.random(); let acc=0; let slip=FORTUNE_SLIPS[4];
      for(const s of FORTUNE_SLIPS){
        acc+=s.prob; if(r<acc){slip=s;break;}
      }
      if(slip.fare>0){
        G.fare+=slip.fare; G.mood=Math.min(G.mood+(slip.moodUp||0),5);
        maybeMoodOverflowFeed(slip.moodUp||0, true);
        G.feed.fedTotal+=1;
      }
      save();
      $frtFace.src='assets/images/'+slip.face;
      $frtName.textContent=slip.name;
      $frtDesc.textContent=slip.desc;
      $frtDesc2.textContent=slip.fare>0?'+'+slip.fare+' 路费':'无奖励';
      $frtR.classList.remove('hidden');
      $frtR.style.opacity='0'; $frtR.style.transform='scale(.8)';
      requestAnimationFrame(function(){ $frtR.style.opacity='1'; $frtR.style.transform='scale(1)'; });
      renderHearts(); stats();
      toast(slip.emoji+' '+slip.name+'：'+slip.desc,'i-ticket');
    },1000);
  };
}
function closeFortune(){ $frtOvl.classList.remove('on'); }

/* ── 掷圣杯 ── */
const MOON_RESULTS=[
  {name:'圣杯',emoji:'▬▬',desc:'两面平整 · 诸事大吉',prob:0.5,fare:30,moodUp:0.5},
  {name:'笑杯',emoji:'⌣⌣',desc:'两面凸起 · 好事将近',prob:0.3,fare:15,moodUp:0.25},
  {name:'阴杯',emoji:'▬⌣',desc:'一阴一阳 · 宜静待',prob:0.2,fare:5,moodUp:0},
];
function openMoonBlock(){
  $mbOvl.classList.add('on');
  $mbRes.classList.add('hidden');
  $mbReward.classList.add('hidden');
  $mbImg.src='assets/images/圣杯合拢太极月牙原木边版.jpg';
  $mbImg.className='mb-img mb-shake';
  $mbBtn.disabled=false; $mbBtn.textContent='🙏 掷圣杯';
}
function throwMoonBlocks(){
  if($mbBtn.disabled) return;
  $mbBtn.disabled=true; $mbBtn.textContent='🙏 …';
  $mbImg.className='mb-img mb-shake';
  setTimeout(function(){
    const r=Math.random(); let acc=0; let res=MOON_RESULTS[2];
    for(const m of MOON_RESULTS){
      acc+=m.prob; if(r<acc){res=m;break;}
    }
    $mbImg.src='assets/images/'+MB_IMGS[res.name];
    $mbImg.className='mb-img';
    G.fare+=res.fare; G.mood=Math.min(G.mood+(res.moodUp||0),5);
    maybeMoodOverflowFeed(res.moodUp||0, true);
    G.feed.fedTotal+=1; save();
    renderHearts(); stats();
    $mbName.textContent=res.emoji+' '+res.name;
    $mbDesc.textContent=res.desc+' · +'+res.fare+' 路费';
    $mbRes.classList.remove('hidden');
    $mbRes.style.opacity='0'; $mbRes.style.transform='scale(.8)';
    requestAnimationFrame(function(){ $mbRes.style.opacity='1'; $mbRes.style.transform='scale(1)'; });
  },1000);
}
function closeMoonBlock(){ $mbOvl.classList.remove('on'); }
const MB_IMGS={
  '圣杯':'小牛庙宇加入标准圣杯允.jpg',
  '笑杯':'小牛庙宇笑杯姿态统一版.jpg',
  '阴杯':'小牛庙宇阴杯怒姿态版.jpg',
};

/* ── 手帐叙事引擎 ── */
const NARRATIVE_POOL={
  travel:[
    '今天替你去了{city}。{feature}。回来的时候铃铛里多了一粒沙。',
    '替你去{city}走了一圈。{feature}。下次想带你去。',
    '说走就走——今天去了趟{city}。{feature}。回程路上买了根糖葫芦，想了想又给你带了。',
    '早上蹭了蹭你的手就出发了。目的地：{city}。{feature}。那边的风的味道不一样。',
    '去了{city}，在那边待了一整天。{feature}。拍了好多照片回来——选不出一张最喜欢的。',
    '今天心情好，去{city}溜达了。{feature}。路上遇见一只橘猫，它看了我一眼，继续睡了。',
    '翻开地图，闭眼一指——{city}。{feature}。好的，就这里了。',
    '趁你专注的时候溜去{city}一趟。{feature}。铃铛上沾了一片叶子，送给你。',
    '替你去{city}看了看。{feature}。回来的时候太阳已经下山了——刚好赶上看见你还在忙。',
    '今天出门有点晚，但还是去了{city}。{feature}。回来的路上月亮很大，像你上次画的圆圈。',
  ],
  tea:[
    '出门溜达了一圈。路过泉州批发市场，顺手批了件衣服去厦门卖。赚了两杯奶茶，一杯自己喝了，另一杯挂在门把手上给你——猜你还没起床。',
    '今天一直在外面忙活。回来的时候嘴边沾着奶沫，蹄子上绑了个小杯子，想着你可能喜欢甜的。',
    '用三颗糖换了一杯奶茶，放在你桌上。老板问我为什么自己不舍得喝，我说：「家里有人。」他愣了一下，又给我多加了一份珍珠。',
    '今天替你去喝了杯奶茶——其实是路过闻见味道没忍住。回来的时候偷偷把吸管塞进了你包里——你看看有没有硌手。',
    '在奶茶店门口排了十分钟队，发现没带钱。跟前面的小姐姐借了两块钱，说回头让主人还。她笑了，说「你家牛还挺有礼貌。」',
    '今天接了个外快——帮隔壁奶茶店送了一单外卖。赚到了自己这杯。我问老板能不能赊一杯给你——他叹了口气，送了我一张优惠券。',
    '天太热了，路过奶茶店没忍住。喝了一半才想起你——然后对着吸管说：「这半杯是替你喝的。」旁边的人看了我一眼。',
    '拿着铃铛去换了一杯无糖的。老板认识我了，问：「今天不加珍珠？」我说：「不加，主人不喜欢。」他还真记住了。',
    '今天在路上捡了一块钱，在马路边想了很久，决定拿去给你换杯奶茶。虽然最后只买到了半杯——但心意是全的。',
    '街角新开了一家奶茶店，开业活动第二杯半价。我站在门口等了十分钟，没人一起拼。最后还是买了两杯——另一杯给你。虽然你可能不渴。',
  ],
  rest:[
    '今天哪儿也没去，就在工位上趴了一天。中间打了个盹，梦见自己在麦田里跑。醒来发现口水把键盘弄湿了一小块。',
    '今天很安静。在窗台上坐了一会儿，看了看外面的云。像你上次专注时的样子。',
    '今天没有出门。把窝里的垫子重新铺了一遍，又把铃铛擦了擦。然后趴在窗台上，等门开的声音。',
    '睡了很久的午觉。梦见你给我带了一颗糖，醒来发现是太阳晒到脸上了。翻了个身继续睡。',
    '今天下雨了，没出去。窝在键盘旁边听雨声。偶尔动一下尾巴——表示我还在。',
    '今天把爪子泡在温水里泡了很久。什么都不想。偶尔看看你的方向——如果你也在发呆的话，那我们算一起呆了。',
    '今天做了个实验：趴在阳光照得到的地方，看影子能挪多远。结果从桌角挪到了鼠标旁。挪了一整个下午。',
    '今天什么都没做。连铃铛都没摇。就是坐着。你的工位在，我也在。算不算一种很好的今天？',
    '傍晚的时候醒了。在房间里走了三圈，喝了几口水，又躺回去了。今天的主要运动量：翻了个身。',
    '今天把脑袋搁在桌沿，看着你的屏幕亮了又暗、暗了又亮。我不知道你在忙什么，但我在旁边等的话，应该不算打扰。',
  ],
  focus:[
    '你今天一口气做了{num}个番茄。我数了数，说：「{num}个……那我得走{num2}倍的路。」然后真的走了。回来的时候蹄子上沾着不同颜色的土。',
    '你专注的时候特别安静。我在旁边数你的呼吸——没有在摸鱼。今天做了{num}个番茄，我也乖乖趴了{num}轮。',
    '做了{num}个番茄钟！你敲键盘的时候我在旁边看着。说实话没看懂你在写什么——但我觉得你写得很好。',
    '今天你专注了{num}轮。我在旁边练了{num2}次摇铃铛——现在已经能摇出节奏感了。你要听吗？',
    '{num}个番茄！你合上电脑的时候，我数了数你的呼吸：稳的。不错，今天状态很好。',
    '你专注的时候我去跑了跑——你做一个番茄，我绕着桌子走十圈。今天做了{num}个，所以我走了{num2}圈。腿有点短，但坚持下来了。',
    '你在写东西的时候我趴在旁边，假装自己是一本书。被你翻了好几次——虽然一个字都没看懂，但很高兴。今天{num}个番茄。',
    '专注{num}轮完成！我给你保存了空气里你刚刚满意的那个表情。虽然你看不见——但我看见了。',
  ],
  miss:[
    '今天没等到你。在门口坐了一会儿，然后自己进屋睡了。',
    '我在走廊里走了好几遍，你没在。你的杯子是空的，椅子是冷的。我把你的拖鞋摆正了。',
    '今天你没有来。我对着门说了一句话——如果你明天来，我就再说一遍。',
    '今天我在窗台上待了很久。每次听到脚步声都竖起耳朵——不是你。天黑了就睡了。明天见。',
    '今天给自己做了一份番茄汤。做多了，吃不完。想着如果你在的话，应该可以分你一半。',
    '我把铃铛挂在门把手上——这样你开门的时候它会响。今天它没响。明天会响的。',
  ],
};

function chooseNarrativeCat(){
  // 今天有旅行
  if(G.lastArrival===today() && curCity) return 'travel';
  // 连续7天打卡买奶茶
  if(G.checkin.streak>0 && G.checkin.streak%STREAK_7===0) return 'tea';
  // 今天专注>=4轮
  if(G.focusSess>=4) return 'focus';
  // 今天有打卡上班
  if(G.checkin.workDate===today()) return 'rest';
  // 今天没来
  return 'miss';
}

const PAGE_BG = ['空白手帐本页面.jpg','空白手帐本单页.jpg'];
function randPageBg(){ return 'assets/images/'+PAGE_BG[Math.floor(Math.random()*PAGE_BG.length)]; }

function makeJournalEntry(hours){
  const cat=chooseNarrativeCat();
  let txt='';
  if(cat==='travel' && curCity){
    const p=curCity.peeks||[];
    // 选与当前景点匹配的记事文本
    let pick='';
    if(curSpot && p.length>1){
      const hits=p.filter(l=>curSpot.includes(l.slice(0,4))||l.includes(curSpot.slice(3,7)));
      if(hits.length) pick=hits[0];
    }
    if(!pick) pick=p[Math.floor(Math.random()*p.length)];
    txt=pick||'替你去看了个地方。';
  }else{
    const pool=NARRATIVE_POOL[cat]||NARRATIVE_POOL.rest;
    txt=pool[Math.floor(Math.random()*pool.length)];
    txt=txt.replace(/\{city\}/g,curCity?curCity.name:'一个地方');
    const feat=curCity?curCity.f1.slice(0,18)+'…':'';
    txt=txt.replace(/\{feature\}/g,feat);
    txt=txt.replace(/\{num\}/g,String(G.focusSess));
    txt=txt.replace(/\{num2\}/g,String(G.focusSess*2));
  }
  const arrivedToday = G.lastArrival===today();
  return {
    date: today(),
    category: cat,
    narrative: txt,
    doodleIdx: Math.floor(Math.random()*10),
    pageBg: randPageBg(),
    data:{ hours, focusSess:G.focusSess, focusMin:G.focusMin, pets:G.petToday,
      travelled:arrivedToday && !!curCity, city:arrivedToday && curCity?curCity.name:null }
  };
}

function checkStamps(){
  const s=G.stamps;
  if(!s.includes('first_focus') && G.focusSess>=1){ s.push('first_focus'); toast('解锁贴纸：首次专注','i-spark'); }
  if(!s.includes('streak_7') && G.checkin.streak>=7){ s.push('streak_7'); toast('连续 7 天 · 它的回馈故事已写入手帐','i-spark'); }
  if(!s.includes('streak_30') && G.checkin.streak>=30){ s.push('streak_30'); toast('连续 30 天 · 六耳彩蛋已解锁','i-spark'); }
  save();
}

/* ── 手帐翻阅：按月 + 按页翻 ══ */
let _jrMonthIdx=0, _jrPageIdx=0, _jrMonths=[], _jrMap={};
function rebuildJournalIndex(){
  _jrMap={}; _jrMonths=[];
  G.journal.forEach(j=>{
    const mm=j.date.slice(0,7);
    if(!_jrMap[mm]){ _jrMap[mm]=[]; _jrMonths.push(mm); }
    _jrMap[mm].push(j);
  });
  _jrMonths.sort().reverse();
}
function renderJournalView(){
  rebuildJournalIndex();
  _jrMonthIdx=0; _jrPageIdx=0;
  renderJournalPage();
}
function renderJournalPage(){
  const body=document.getElementById('jrBody');
  if(!_jrMonths.length){
    body.innerHTML='<div class="jr-empty">还没有手帐记录<br>收工打卡后会自动生成</div>';
    document.getElementById('jrMonth').textContent='—';
    updateJrnNav();
    return;
  }
  const m=_jrMonths[_jrMonthIdx];
  const [y,mo]=m.split('-');
  document.getElementById('jrMonth').textContent=y+'年'+parseInt(mo)+'月';
  const entries=_jrMap[m];
  // 第0页=月封面，1~N=对应条目
  if(_jrPageIdx===0){
    const travelDays=entries.filter(e=>e.data.travelled).length;
    const totalHours=entries.reduce((s,e)=>s+e.data.hours,0);
    body.innerHTML=`<div class="jr-page jr-cover">
      <img class="jr-cover-img" src="assets/images/小牛写日记温馨插画.jpg" alt="小牛写日记" id="jrCoverImg">
      <h3>${y}年${parseInt(mo)}月</h3>
      <p>它替你走了 ${travelDays} 个地方 · 累计工时 ${totalHours.toFixed(1)}h<br>手帐 ${entries.length} 页</p>
    </div>`;
    // 点击插画中的笔记本 → 翻开第一页
    document.getElementById('jrCoverImg').onclick=function(){
      if(entries.length){ _jrPageIdx=1; renderJournalPage(); }
    };
  }else{
    const e=entries[_jrPageIdx-1];
    const bgFile=e.pageBg||randPageBg();
    body.innerHTML=`<div class="jr-page jr-entry">
      <img class="jr-entry-bg" src="${bgFile}" alt="" aria-hidden="true">
      ${e.category==='tea'?'<div style="font-size:2.8rem;margin:.3rem 0">🧋</div>':''}
      <div class="jr-entry-inner">
        <div class="jr-date">${e.date}</div>
        <div class="jr-narrative">${e.narrative}</div>
        <div class="jr-footer">
          <span>工时 ${e.data.hours.toFixed(1)}h</span>
          <span>专注 ×${e.data.focusSess}</span>
          <span>爪印 ×${e.data.pets}</span>
          ${e.data.travelled?'<span class="tag">🚂 '+e.data.city+'</span>':''}
        </div>
        <div class="jr-page-num">${_jrPageIdx} / ${entries.length}</div>
      </div>
    </div>`;
  }
  updateJrnNav();
}
function updateJrnNav(){
  const m=_jrMonths[_jrMonthIdx];
  const entries=m?_jrMap[m]:[];
  const maxPage=entries?entries.length:0;  // 0=月封面, maxPage=条目数
  const hasPrev=(_jrMonthIdx>0) || (_jrPageIdx>0);
  const hasNext=(_jrMonthIdx<_jrMonths.length-1) || (_jrPageIdx<maxPage);
  document.getElementById('jrPrev').classList.toggle('disabled',!hasPrev);
}
function jrPrevPage(){
  if(_jrPageIdx>0){ _jrPageIdx--; renderJournalPage(); return; }
  if(_jrMonthIdx<_jrMonths.length-1){
    _jrMonthIdx++;
    const entries=_jrMap[_jrMonths[_jrMonthIdx]];
    _jrPageIdx=entries.length;
    renderJournalPage();
  }
}

/* ══ 翻页动画：掀起 → 翻折 → 翻页 ══ */
const $jrTurn=document.getElementById('jrTurn'), $jrTurnImg=document.getElementById('jrTurnImg');
const TURN_A='assets/images/手帐本翻页过程二_掀起.jpg';
const TURN_B='assets/images/手帐本翻页过程三_翻折.jpg';
let _turnTimer=null;

function jrAnimateNext(){
  if(_turnTimer) return;
  $jrTurnImg.src=TURN_A; $jrTurn.classList.add('on');
  _turnTimer=setTimeout(function(){
    $jrTurnImg.src=TURN_B;
  }, 220);
  setTimeout(function(){
    $jrTurn.classList.remove('on'); _turnTimer=null;
    const m=_jrMonths[_jrMonthIdx];
    const entries=m?_jrMap[m]:[];
    if(_jrPageIdx<entries.length){ _jrPageIdx++; renderJournalPage(); return; }
    if(_jrMonthIdx>0){ _jrMonthIdx--; _jrPageIdx=0; renderJournalPage(); }
  }, 500);
}
function jrAnimatePrev(){
  if(_turnTimer) return;
  $jrTurnImg.src=TURN_A; $jrTurn.classList.add('on');
  _turnTimer=setTimeout(function(){
    $jrTurnImg.src=TURN_B;
  }, 220);
  setTimeout(function(){
    $jrTurn.classList.remove('on'); _turnTimer=null;
    if(_jrPageIdx>0){ _jrPageIdx--; renderJournalPage(); return; }
    if(_jrMonthIdx<_jrMonths.length-1){ _jrMonthIdx++; _jrPageIdx=0; renderJournalPage(); }
  }, 500);
}

/* ══ v9 AI Agent（智谱 GLM） ══ */
/* ══ 13. 启动 ══ */
function boot(){
  load();
  // 清除旧版残留的模拟数据
  if(G.journal[0] && G.journal[0]._demoV){ G.journal=[]; G.checkin={streak:0,total:0,last:null,history:[]};
    save(); }
  document.getElementById('soundIc').setAttribute('href', G.sound?'#i-sound':'#i-mute');
  $soundBtn.classList.toggle('off',!G.sound);
  document.getElementById('soundBtn').setAttribute('aria-pressed',String(G.sound));
  renderHearts(); stats(); setScene('desk'); renderFocus();
  if(G.collection.length){
    setPanel('牛马力在家','按住头像抚摸 · 攒路费','每次 +1 · 每日前 30 次有效','i-paw');
    setMood('它趴在桌上等你','happy');
  }else{
    setPanel('牛马力正在待命','按住头像抚摸攒路费','每次 +1 路费 · +0.25 心情 · 攒够 100 就出发','i-paw');
    setMood('正在收拾背包','pack');
  }
  // 使用竖屏手机壁纸背景
  document.getElementById('imgDesk').src='assets/images/小牛办公工位手机竖屏图.jpg';
  document.getElementById('imgTravel').src='assets/images/空工位手机壁纸出门旅行.jpg';
  // 首次引导
  if(!G.seenGuide){
    document.getElementById('guide').classList.add('on');
    document.getElementById('guideGo').addEventListener('click',()=>{
      document.getElementById('guide').classList.remove('on');
      G.seenGuide=true; save(); bell('chime');
      toast('开工红包 100 路费已到账，够出发一次','i-ticket');
      setTimeout(showHint, 700);
      setTimeout(hideHint, 9000);
    },{once:true});
  }else{
    setTimeout(showHint,900); setTimeout(hideHint,7000);
  }
  setTimeout(hideHint, 12000);
  // 预加载旅行背景
  // 绑定 stat bar 事件
  document.getElementById('statTrips').addEventListener('click', depart);
  document.getElementById('statCities').addEventListener('click', openCollection);
  document.getElementById('statFocus').addEventListener('click', openFocus);
  // 收集册网格事件委托
  $grid.addEventListener('click', function(e){
    const btn=e.target.closest('.col-post');
    if(!btn) return;
    const cityName=btn.getAttribute('data-city');
    const spotName=btn.getAttribute('data-spot');
    if(cityName&&spotName) showSpot(cityName, spotName);
  });
  // ── v8 打卡 · 饲料 · 手帐 ──
  updateCheckinUI();
  if(G.checkin.workDate===today()){
    setPanel('已开工 · '+G.checkin.workStart?'专注攒路费':'','摸摸头攒路费','收工时记得打卡 · 它替你记着手帐','i-check');
  }
  document.getElementById('ckBtn').addEventListener('click', function(e){
    // onclick 已在 updateCheckinUI 中通过 btn.onclick 设置
  });
  document.getElementById('feedBtn').addEventListener('click', feedCow);
  // ── 求签 · 掷筊 ──
  document.getElementById('frtX').addEventListener('click', closeFortune);
  document.getElementById('mbX').addEventListener('click', closeMoonBlock);
  $frtOvl.addEventListener('mousedown', function(e){ if(e.target===this) closeFortune(); });
  $mbOvl.addEventListener('mousedown', function(e){ if(e.target===this) closeMoonBlock(); });
  // ── 探宝 ──
  document.getElementById('huntClose').addEventListener('click', closeTreasureHunt);
  $huntOvl.addEventListener('mousedown', function(e){ if(e.target===this) closeTreasureHunt(); });
  document.getElementById('statJournal').addEventListener('click', function(){
    renderJournalView();
    document.getElementById('jrOvl').classList.add('on');
  });
  // 手帐导航
  document.getElementById('jrX').addEventListener('click', function(){
    document.getElementById('jrOvl').classList.remove('on');
  });
  document.getElementById('jrPrev').addEventListener('click', function(){ jrAnimatePrev(); });
  // ── 探宝手册 ──
  document.getElementById('statHuntAlbum').addEventListener('click', openHuntAlbum);
  $haClose.addEventListener('click', closeHuntAlbum);
  $haOvl.addEventListener('mousedown', function(e){ if(e.target===this) closeHuntAlbum(); });
  // ── 待办清单 ──
  document.getElementById('statTodo').addEventListener('click', openTodo);
  document.getElementById('tdX').addEventListener('click', closeTodo);
  document.getElementById('tdAdd').addEventListener('click', addTodo);
  /* 中文输入法：用回车「选词」不能当成「添加待办」。
     否则打 srm 时一按回车选词，就先凭空多出一条 srm。 */
  const $tdInput=document.getElementById('tdInput');
  let tdComposing=false;
  $tdInput.addEventListener('compositionstart', ()=>{ tdComposing=true; });
  $tdInput.addEventListener('compositionend',   ()=>{ setTimeout(()=>{ tdComposing=false; }, 0); });
  $tdInput.addEventListener('keydown', function(e){
    if(e.key!=='Enter') return;
    if(e.isComposing || e.keyCode===229 || tdComposing) return;   // 正在选词 → 放行给输入法
    e.preventDefault();
    addTodo();
    e.target.focus();
  });
  $tdOvl.addEventListener('mousedown', function(e){ if(e.target===this) closeTodo(); });
  // ── 打卡统计入口 ──
  document.getElementById('statCheckin').addEventListener('click', function(){ document.getElementById('ckBtn').click(); });
  // 点击手帐页面本体 → 翻页动画 → 下一页
  document.getElementById('jrBody').addEventListener('click', function(e){
    if(e.target.closest('.jr-cover-img')) return;
    jrAnimateNext();
  });
  // 首次引导后自动开工打卡
  if(!G.seenGuide){
    const origGuide=document.getElementById('guideGo').onclick;
    document.getElementById('guideGo').addEventListener('click', function(){
      setTimeout(function(){
        if(!G.checkin.workDate) workCheckin();
      }, 500);
    });
  }
}


boot();

/* ════════════════════════════════════════════════════════════
   v7.1 变更说明
   经济调整：
   · PET_FARE 2→1（每次摸头给 1 路费，上限 30 次不变）
   · 摸头日产出 60→30，零花钱定位更明确，专注是主力

   收集改为按地点：
   · pickCity() 返回 {city, spot, revisit}，按地点而非按城市选
   · G.collection 改为 [{cityName, spotName, at}]，每城可收集多张照片
   · 收集册改为城市折叠卡片，展开显示 x/N 个地点进度
   · keepCard() toast 显示具体地点名
   · stats() 的「城市」数值改为已收集地点总数
   · 明信片封面显示具体地点名（如「洱海旁·它替你拍的」）

   情绪扩展（三个新触发）：
   · sad（伤心哭泣）：专注<5分钟提前结束 → "还没开始就结束了…你还好吗"
   · angry（生气愤怒）：连续 3 次放弃番茄钟（专注<10分钟结束时累计） →
     "又放弃了？你行不行啊" → 完全完成一次专注后重置
   · scold（指责）：连续 3 次路费不够还点出发 → "路费不够你点什么出发！"
     → 第 4 次起循环 3 句指责文案 → 成功出发后重置

   v7 变更说明
   移除弧形菜单，数值条改为直通各功能：
   · 删除整个弧形菜单（HTML/CSS/JS）：arc-veil、arc-origin、renderArc()、openArc()、closeArc()
   · 移除菜单按钮（出发/摸头/收集册/专注），删除 holding 状态和 petBadge 更新
   · 删除 beacon 呼吸光环 CSS 和 DOM
   · 头像点击：不再弹出弧形菜单，改为仅响应抚摸手势
   · 数值条：statTrips → depart()、statCities → openCollection()、statFocus → openFocus()
   · 数值条可交互样式：cursor:pointer + hover 背景
   · 引导文案：原「轻点头像开菜单 → 摸头」改为「按住头像来回抚摸」
   · 首页面板：原「摸头·出发·收集册」改为「按住头像抚摸·攒路费」
   · 清除所有 arcOpen、$veil、$origin 相关引用
   · 更新 anyOverlay() 移除 arc-veil.on 检查
   · 更新 Esc 退出处理移除 arcOpen 分支
   · 更新文件名字为 v6→v6r（不变，内容迭代到 v7）

   v6r 变更说明（修订版，修正 v6 对番茄钟的过度修正）
   番茄钟三态语义：
   · 专注进行中 → 按 Esc / 点弹窗外 = 先暂停，弹窗保留（不自作主张收起）
   · 已暂停     → 按 Esc / 点弹窗外 = 缩到右下角徽章，暂停状态保持
   · 未开始     → 按 Esc / 点弹窗外 = 直接关闭
   核心区别：计时在跑的时候不可收起（必须先暂停），暂停后的"存放"是 OK 的。
   弹窗内不再放置「收起到右下角」按钮——不主动鼓励收起行为，仅保留 Esc/弹窗外路线。
   恢复的内容：专注徽章（HTML/CSS/JS）、minFocus()、badgeOn()/badgeOff()
   5  新增福州、宁德两座旅行城市，共 10 城（原 8 城）
      - 福州：西禅寺 / 上下杭 / 鼓山 / 福州西湖
      - 宁德：宁德时代大楼 / 太姥山 / 白水洋 / 霞浦滩涂
   6  对应素材全部就位：原始图、网页版大图、收集册缩略图

   v5.2 变更说明（本轮修订）
   1  摸头「加了但看不见」——三个原因一起修：
      a) 心情只有 5 颗整数心，+0.25 被 Math.round 吃掉，摸 2 次才有半颗变化。
         现在心形支持「半颗」（边界那颗半透明），旁边常驻精确数值 3.25 / 5.00，
         数值变化时有弹跳动效。
      b) 浮字原来只在头像上飘一个"+2"，和路费数字没有视觉关联。
         现在浮字挂在真正变化的数字上：路费数字上飘「+2 路费」（金），
         心形上飘「+0.25 心情」（粉）；专注结算同样从路费数字飘「+N 路费」。
      c) 每天 30 次额度用完 / 心情满 5 时，原来是静默不给——用户以为坏了。
         现在明确浮字说明「今日 30 次已摸完 · 只涨心情」「心情满格 5.00」，
         菜单角标同步变「满」（灰）。两类提示分别节流，不会互相盖掉。
   2  摸头操作太累：菜单里的「摸头」按钮改成按住不放 = 每 280ms 连摸一次，
      菜单不关闭，可以一直摸；配「连摸 ×N」计数。头像上的来回抚摸保留，
      但摸满一圈的距离从 260px 调到 150px（头像本身只有 226px 宽，
      原来一整趟都摸不出一次，这是"按住来回摸没反应"的真正原因）。
   3  轻点 / 抚摸 / 按住连摸，心情一律 +0.25，和浮字写的数字一致
      （原来轻点是 +0.4，浮字却写 +0.25，对不上）。
   4  番茄钟语义按用户心智重做（原来 ✕ 只隐藏、计时还在跑，很困惑）：
      · 「收起到右下角」按钮 / 点弹窗外 / Esc = 缩成右下角徽章，计时继续
      · 右上「结束」（✕ 加文字，破坏性动作不伪装成一个叉）= 直接结束，
        已专注的分钟按 1 分钟 = 1 路费当场换算入账，面板与路费数字同时反馈
      · 「暂停」仍然是真的停表，收起后徽章写「已暂停 · 点我继续」
      · 不足 1 分钟结束时明确告知"这次是 0"，不静默、不惩罚
   5  弧形菜单布局算法改为「按按钮数量算最靠上/最靠外的分量」：
      奇数个按钮时正中那颗是垂直朝上的、吃满整个半径，
      v5.2 一度因此在 1440×900 把按钮顶出屏幕。现在先保证不压头像的最小半径，
      再用竖直剩余空间反推张角（132°~196°），横向放不下才收半径。
      实测 420×760 / 1024×700 / 1280×720 / 1366×768 / 1440×900 / 1600×900 /
      1920×1080 / 2560×1440 / 3840×1600 九种分辨率：零重叠、零越界、不压 HUD。

   v5.1 变更说明
   1  背景恢复原稿取景：取消 Ken Burns 推近（曾放大到 1.13 造成压迫感），
      遮罩浓度还原为原稿的 .35/.08/.50，去掉四周暗角；
      素材改用 2560px 高清版（原图 5504px，此前压到 1920 在大屏发虚）。
   2  摸头重做：原设计摸头完全不给路费，只有心情满时 35% 概率掉 5，
      用户几乎无法靠摸头攒出路费，且 260ms 冷却让连点很吃力。
      现改为「按住头像来回摸」——每累计 260px 移动算摸满一圈，
      确定 +2 路费；每天前 30 次有效（上限 60），之后只涨心情，
      专注仍是主力收入。取消随机，心情满当天首次必得 +5。
      配套：环形进度、连摸 ×N、+2 上浮字、头像随手轻微侧倾。
      拖动超过 12px 不再触发「打开菜单」，两种手势不打架。

   v5 变更说明（相对 v3/v4 的《牛马力-场景切换设计稿.html》）

   【修坏的】
   1  弧形菜单圆心改为 JS 实时取自头像 rect —— 修掉桌面端「摸头/收集」
      两个按钮压在头像上的问题，四个按钮半径恒定，并依次弹出
   2  玻璃容器底色 rgba(0,0,0,.10)→rgba(35,25,15,.58)、边框 .03→.18，
      加内高光与投影 —— 旅行背景上卡片不再消失（原边界差仅 1~2/255）
   3  场景标签底色加重，白字对比度提到 AA 以上
   4  进度节点按 stops 数动态生成（原固定 5 个，最后一个永远不亮）；
      火车图标加 translate(-50%) 不再溢出轨道右端
   5  移除 eval()，菜单项改函数引用；overlay 加 role/aria，支持 Esc 关闭

   【提质感】
   6  全站 emoji → 统一线条 SVG 图标（收集册/数值条/场景标签/按钮）
      跨 macOS / Windows / 投影渲染一致，符合「像同一个人画的」美术红线
   7  收集册改用真明信片缩略图做墙，不再用 🏔️ 占位；集齐八城有专属横幅
   8  背景与表情压缩：3.6MB→292KB、6.1MB→416KB；按屏宽加载 900/1920 两档
   9  毛笔字体加 Kaiti 兜底（Google Fonts 失效时不会掉成宋体）
   10 html 用 clamp() 流式字号，1440/1920 下整套 UI 等比放大
      （原稿从 1440→1920 卡片恒定 220px、头像恒定 130px）
   11 加纸纹颗粒、暗角、Ken Burns 缓慢漂移，让静态背景有呼吸
   12 移动端安全区 env(safe-area-inset-*)

   【改体验】
   13 场景切换不再只换背景：旅行中头像槽变成「空位」（虚线圈 +  swinging 铃铛
      +「它不在」），UI 整体后退 —— 把「你上班，它替你活」画出来
   14 旅程从 3.6 秒延长到 14 秒，途经站点逐个点亮，路上两次弹出「碎片」
      （一张模糊小图 + 一句它发来的话）
   15 到达改为：暗场 → 铃铛响 → 明信片 3D 翻牌入场
   16 铃铛声音资产落地：Web Audio 合成（full/chime/tick 三档），零素材，
      右上角可静音并持久化
   17 番茄钟关闭弹窗不再中断计时，主界面挂进度徽章；专注中头像切「收拾背包」
      并轮播文案；提前结束按已专注分钟入账（对齐文档「不做惩罚」）
   18 收藏加「明信片飞入城市格 + 数字弹跳」动效
   19 状态面板拆成 kicker/title/sub 三块固定语义，不再让最大字号的元素
      在「心情 / 目的地 / 提示」之间漂移
   20 localStorage 持久化（路费/心情/收集/专注/引导/声音），刷新不丢
   21 经济口径对齐产品文档：路费单位=分钟，专注 25 分钟=+25，成本 100；
      摸头只影响心情不给路费（心情满时 35% 概率掉 5 路费彩蛋）
      —— 修掉原稿「+300 撞 200 上限被丢弃」「toast 写 25 实际加 300」
   22 首次进入加引导浮层 + 头像呼吸光环与「点我」气泡（原提示只在 :hover 出现）
   23 空闲每 15 秒轮换自言自语，按心情分三档文案池
   24 演示模式：连点左下角版本号 3 次，路费 +500、旅程缩到 5 秒
   ════════════════════════════════════════════════════════════ */

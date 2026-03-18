(()=>{var x="./pokemon-attack-preview-data.json",w="../assets/pokemon-rby-clean/red-green/back/6.png",A="../assets/pokemon-rby-clean/red-green/9.png";var f={player:{name:"Charizard",sprite:w},foe:{name:"Blastoise",sprite:A}},u=(r,e,a)=>Math.min(Math.max(r,e),a),h=(r,e,a)=>r+(e-r)*a,N=new Set(["bide","counter","dragonrage","nightshade","psywave","seismictoss","sonicboom","superfang"]),_=new Set(["fissure","guillotine","horndrill"]),F={SE_DELAY_ANIMATION_10:700,SE_DARK_SCREEN_FLASH:280,SE_DARK_SCREEN_PALETTE:0,SE_RESET_SCREEN_PALETTE:0,SE_FLASH_SCREEN_LONG:700,SE_SHAKE_SCREEN:420,SE_WATER_DROPLETS_EVERYWHERE:700,SE_DARKEN_MON_PALETTE:420,SE_LIGHT_SCREEN_PALETTE:560,SE_BLINK_MON:420,SE_FLASH_MON_PIC:280,SE_HIDE_MON_PIC:0,SE_SHOW_MON_PIC:0,SE_MOVE_MON_HORIZONTALLY:350,SE_RESET_MON_POSITION:210,SE_SLIDE_MON_OFF:560,SE_SLIDE_MON_HALF_OFF:490,SE_SLIDE_MON_UP:420,SE_SLIDE_MON_DOWN:420,SE_SLIDE_MON_DOWN_AND_HIDE:560,SE_SQUISH_MON_PIC:420,SE_BOUNCE_UP_AND_DOWN:560,SE_MINIMIZE_MON:560,SE_SUBSTITUTE_MON:0,SE_TRANSFORM_MON:560,SE_PETALS_FALLING:700,SE_LEAVES_FALLING:700,SE_SHAKE_ENEMY_HUD:350,SE_SHAKE_BACK_AND_FORTH:420,SE_WAVY_SCREEN:700,SE_SPIRAL_BALLS_INWARD:700,SE_SHOOT_BALLS_UPWARD:560,SE_SHOOT_MANY_BALLS_UPWARD:630,SE_SHOW_ENEMY_MON_PIC:0,SE_HIDE_ENEMY_MON_PIC:0,SE_BLINK_ENEMY_MON:420,SE_SLIDE_ENEMY_MON_OFF:560},O={AnimationFlashScreen:280,DoBlizzardSpecialEffects:700,DoExplodeSpecialEffects:560,DoGrowlSpecialEffects:420,DoRockSlideSpecialEffects:560,FlashScreenEveryEightFrameBlocks:420,FlashScreenEveryFourFrameBlocks:560},L=`
  :root{color-scheme:dark;--bg:#07120d;--panel:#11231c;--line:rgba(173,209,188,.15);--text:#eef6ee;--muted:#b6cdbd;--gold:#e5c965;--accent:#8fd1ff}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;font-family:Georgia,"Times New Roman",serif;background:radial-gradient(circle at top left, rgba(206,175,86,.18), transparent 26%),radial-gradient(circle at top right, rgba(60,126,110,.2), transparent 24%),linear-gradient(180deg,#08140f 0%,#0d1914 100%);color:var(--text)}
  button{font:inherit}
  .label{font-size:.74rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(235,241,231,.74)}
  .preview-shell{width:min(1420px,calc(100vw - 28px));margin:0 auto;padding:20px 0 32px;display:grid;gap:18px}
  .preview-card,.preview-moves{background:linear-gradient(180deg, rgba(19,37,31,.96), rgba(12,25,20,.98));border:1px solid var(--line);border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.25)}
  .preview-card{padding:22px 24px}
  .preview-header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}
  .preview-header h1,.preview-stage-head h2{margin:4px 0 0;font-size:clamp(1.8rem,2vw + 1rem,3rem);line-height:.95}
  .preview-header p{margin:10px 0 0;max-width:72ch;color:var(--muted);line-height:1.45}
  .preview-meta{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .preview-meta span,.preview-current span{padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#e3eedf;font-size:.92rem}
  .preview-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
  .preview-current-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:flex-end}
  .preview-current h2{margin:6px 0 0;font-size:clamp(1.4rem,1.5vw + .9rem,2.2rem)}
  .preview-current p{margin:8px 0 0;color:var(--muted)}
  .preview-buttons{display:flex;flex-wrap:wrap;gap:10px}
  .btn-primary,.btn-ghost,.move-chip{border:none;cursor:pointer}
  .btn-primary,.btn-ghost{padding:12px 18px;border-radius:999px;font-weight:700}
  .btn-primary{background:linear-gradient(180deg,#f0d56f,#d8bb57);color:#223125}
  .btn-ghost{background:rgba(255,255,255,.06);color:var(--text);border:1px solid rgba(255,255,255,.08)}
  .btn-ghost.active{background:rgba(143,209,255,.16);border-color:rgba(143,209,255,.4)}
  .preview-stage-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,320px);gap:16px;align-items:start}
  .preview-stage-stack{display:grid;gap:16px}
  .preview-stage-panel{padding:18px;display:grid;gap:12px}
  .preview-stage-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
  .preview-stage{width:100%}
  .preview-stage.desktop{max-width:1080px;margin:0 auto}
  .preview-stage.mobile{max-width:320px;margin:0 auto}
  .battle-stage{position:relative;height:clamp(352px,28vw,430px);border:3px solid #151d11;border-radius:10px;overflow:hidden;background:linear-gradient(180deg,#e7f3cb 0%,#e7f3cb 54%,#cadc9a 54%,#cadc9a 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.2),0 24px 60px rgba(0,0,0,.22)}
  .battle-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 34%,rgba(255,255,255,.28),transparent 26%),radial-gradient(circle at 27% 78%,rgba(255,255,255,.24),transparent 24%);pointer-events:none}
  .battle-field{position:absolute;inset:0 0 21% 0}
  .battle-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .battle-feed{position:absolute;left:2.8%;right:2.8%;bottom:3.2%;border:3px solid #151d11;border-radius:8px;padding:1.7% 2.1%;display:grid;align-content:center;min-height:16.8%;background:#f8f5e8;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);z-index:3}
  .feed-line{color:#1e2b14;text-align:left;font-size:1.02rem;line-height:1.45;font-weight:700;text-transform:uppercase}
  .battle-status{position:absolute;padding:2.4% 2.8%;border:3px solid #151d11;border-radius:8px;background:#f8f5e8;color:#1e2b14;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);z-index:3}
  .battle-status-foe{top:6%;left:4.5%;width:24%}
  .battle-status-player{right:4.5%;bottom:24%;width:25%}
  .battle-status-top,.battle-status-meta,.battle-hp-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .battle-status-meta{margin-top:4px;color:#4d5b41;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
  .battle-hp-row{margin-top:8px}
  .hp-label{color:#1e2b14;font-size:.86rem;font-weight:700;letter-spacing:.08em}
  .hp{height:14px;width:100%;border-radius:999px;border:2px solid #1e2b14;background:#b7bf9c;overflow:hidden}
  .hp-fill{height:100%;background:linear-gradient(90deg,#6eb24b,#9fd050);transition:width 80ms linear}
  .hp-fill.hp-mid{background:linear-gradient(90deg,#d4bf48,#e9da79)}
  .hp-fill.hp-low{background:linear-gradient(90deg,#b44b41,#de7c60)}
  .battle-sprite-wrap{position:absolute;display:flex;align-items:flex-end;justify-content:center;z-index:2}
  .battle-sprite-foe{top:15.5%;right:5.5%;width:22%;height:31%}
  .battle-sprite-player{left:5.5%;bottom:14.1%;width:25%;height:38%}
  .battle-shadow{position:absolute;left:50%;bottom:4%;width:56%;height:11%;border-radius:50%;background:radial-gradient(circle,rgba(34,49,20,.38) 0%,rgba(34,49,20,.16) 58%,transparent 74%);transform:translateX(-50%)}
  .sprite.battle{width:100%;height:100%;object-fit:contain;object-position:center bottom;image-rendering:pixelated;filter:drop-shadow(0 12px 0 rgba(255,255,255,.18)) drop-shadow(0 20px 18px rgba(0,0,0,.22));transition:transform 70ms linear,opacity 90ms linear,filter 80ms linear}
  .battle-sprite-foe .sprite.battle.front{transform:translateX(2%) translateY(0)}
  .battle-sprite-player .sprite.battle.back{transform:translateX(-2%) translateY(12%)}
  .sprite.battle.hurt{filter:brightness(1.85) contrast(1.35) drop-shadow(0 0 10px rgba(255,255,255,.75))}
  .preview-moves{padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;max-height:68vh;overflow:auto}
  .move-chip{display:grid;gap:4px;text-align:left;padding:12px;border-radius:18px;background:rgba(255,255,255,.04);color:var(--text);border:1px solid rgba(255,255,255,.07)}
  .move-chip strong{font-size:.78rem;letter-spacing:.14em;color:#f2d977}
  .move-chip span{font-size:1rem;font-weight:700}
  .move-chip em{font-style:normal;font-size:.8rem;color:var(--muted)}
  .move-chip.active{border-color:rgba(143,209,255,.6);box-shadow:0 0 0 1px rgba(143,209,255,.24);background:rgba(143,209,255,.08)}
  @media (max-width:1080px){.preview-header,.preview-controls,.preview-stage-grid{grid-template-columns:1fr}.preview-meta{justify-content:flex-start}.preview-moves{max-height:32vh}}
  @media (max-width:720px){.preview-shell{width:min(100vw - 16px, 440px);padding:12px 0 20px;gap:12px}.preview-card,.preview-moves{border-radius:22px}.preview-card{padding:14px}.preview-header h1,.preview-stage-head h2{font-size:1.55rem}.preview-stage.mobile,.preview-stage.desktop{max-width:100%}.preview-moves{grid-template-columns:repeat(2,minmax(0,1fr));max-height:34vh}.battle-stage{height:auto;min-height:34vh;border-radius:8px}.battle-status{padding:8px 10px;border-width:2px;border-radius:6px}.battle-status-foe{top:4%;left:3%;width:36%}.battle-status-player{right:3%;bottom:22%;width:38%}.battle-status-meta{font-size:.68rem;letter-spacing:.05em}.battle-sprite-foe{top:11%;right:6%;width:29%;height:35%}.battle-sprite-player{left:7%;bottom:13.5%;width:26%;height:30%}.battle-feed{left:3%;right:3%;bottom:3%;min-height:17%;padding:2% 2.4%;border-width:2px;border-radius:6px}.feed-line{font-size:.8rem}}
`;function P(r){return!r||r.category==="Status"?0:r.id==="superfang"?.5:r.id==="sonicboom"?.22:r.id==="dragonrage"?.28:_.has(r.id)?.96:N.has(r.id)?.34:u(.18+Math.max(20,r.power||40)/240,.2,.62)}function R(r){return r.category!=="Status"||N.has(r.id)||_.has(r.id)}function T(r,e,a){return R(r)?_.has(r.id)?`${a} is taken out in one hit.`:`${a} reels from ${r.name}.`:r.type==="Psychic"?`${a} is wrapped in a psychic effect.`:r.type==="Poison"?`${a} is caught in a toxic effect.`:r.id==="transform"?`${e} changes form.`:r.id==="substitute"?`${e} hides behind a substitute.`:r.id==="recover"||r.id==="softboiled"||r.id==="rest"?`${e} restores itself.`:`${r.name} finishes its effect.`}function y(r,e,a){let t=[],i=0;for(let d of r.commands){if(d.kind==="special"){let n=F[d.effect]??280;t.push({...d,start:i,end:i+n}),i+=n;continue}for(let n=0;n<d.frames[e].length;n+=1){let o=d.frames[e][n],p=Math.max(70,o.durationFrames*(a.effectFrameMs||70));t.push({kind:"subframe",animationId:d.animationId,subanimation:d.subanimation,moveSpecificEffect:d.moveSpecificEffect,frameIndex:n,frame:o,start:i,end:i+p}),i+=p}}let s=R(r)?i:null,l=s===null?i+260:s+280;return{segments:t,impactTime:s,resolveTime:l,total:l+520}}function D(){if(document.getElementById("attack-preview-styles"))return;let r=document.createElement("style");r.id="attack-preview-styles",r.textContent=L,document.head.appendChild(r)}function S(r){return String(r).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}function H(r){return new Promise((e,a)=>{let t=new Image;t.onload=()=>e(t),t.onerror=()=>a(new Error(`Failed to load image: ${r}`)),t.src=r})}var b=class{constructor(e,a,t){this.root=e,this.mode=a,this.tilesets=t,this.stage=e.querySelector(".battle-stage"),this.field=e.querySelector(".battle-field"),this.feed=e.querySelector(".feed-line"),this.canvas=e.querySelector("canvas"),this.ctx=this.canvas.getContext("2d"),this.ctx.imageSmoothingEnabled=!1,this.playerSprite=e.querySelector(".attack-preview-player"),this.foeSprite=e.querySelector(".attack-preview-foe"),this.playerStatus=e.querySelector(".battle-status-player"),this.foeStatus=e.querySelector(".battle-status-foe"),this.playerHpFill=e.querySelector("[data-player-hp-fill]"),this.foeHpFill=e.querySelector("[data-foe-hp-fill]"),this.playerHpValue=e.querySelector("[data-player-hp-value]"),this.foeHpValue=e.querySelector("[data-foe-hp-value]")}resize(){let e=this.canvas.getBoundingClientRect();this.canvas.width=Math.round(e.width*devicePixelRatio),this.canvas.height=Math.round(e.height*devicePixelRatio),this.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0),this.ctx.imageSmoothingEnabled=!1}fieldMetrics(e){let a=this.stage.getBoundingClientRect(),t=this.field.getBoundingClientRect(),i=t.width,s=t.height,l=Math.min(i/e.coordinateSpace.width,s/e.coordinateSpace.height),d=e.coordinateSpace.width*l,n=e.coordinateSpace.height*l;return{x:t.left-a.left+(i-d)/2,y:t.top-a.top+(s-n)/2,width:d,height:n,scale:l}}resetSprites(){this.stage.style.transform="",this.field.style.transform="";for(let e of[this.playerSprite,this.foeSprite,this.playerStatus,this.foeStatus])e.style.transform="",e.style.opacity="",e.style.filter="";this.playerSprite.classList.remove("hurt"),this.foeSprite.classList.remove("hurt")}applyHp(e,a,t){let i=Math.round(u(t,0,1)*100);e.style.width=`${i}%`,e.classList.toggle("hp-mid",i<=50&&i>20),e.classList.toggle("hp-low",i<=20),a.textContent=`${i}/100`}drawSpriteTile(e,a){let t=this.tilesets[e.tileset]||this.tilesets[0];if(!t)return;let i=8,s=e.tile%16*i,l=Math.floor(e.tile/16)*i,d=a.x+e.x*a.scale,n=a.y+e.y*a.scale,o=i*a.scale;this.ctx.save(),this.ctx.translate(d+o/2,n+o/2),this.ctx.scale(e.flipX?-1:1,e.flipY?-1:1),this.ctx.drawImage(t,s,l,i,i,-(o/2),-(o/2),o,o),this.ctx.restore()}drawFlash(e,a){a<=0||(this.ctx.save(),this.ctx.globalAlpha=a,this.ctx.fillStyle=e,this.ctx.fillRect(0,0,this.canvas.clientWidth,this.canvas.clientHeight),this.ctx.restore())}drawGlow(e,a,t,i,s=.35){this.ctx.save();let l=this.ctx.createRadialGradient(e,a,t*.15,e,a,t);l.addColorStop(0,`${i}${Math.round(s*255).toString(16).padStart(2,"0")}`),l.addColorStop(1,`${i}00`),this.ctx.fillStyle=l,this.ctx.beginPath(),this.ctx.arc(e,a,t,0,Math.PI*2),this.ctx.fill(),this.ctx.restore()}drawScreenParticles(e,a,t,i){let s=this.ctx,l=t.x+t.width*(i==="player"?.26:.74),d=t.y+t.height*(i==="player"?.78:.3);if(e==="leaves"||e==="petals"){let n=e==="leaves"?"#8fc45f":"#f0a7bf";for(let o=0;o<12;o+=1){let p=t.x+(o*19+a*240)%t.width,m=t.y+(o*13+a*t.height*1.3)%t.height;s.save(),s.fillStyle=n,s.translate(p,m),s.rotate(a*6+o),s.beginPath(),s.ellipse(0,0,5*t.scale,2.5*t.scale,0,0,Math.PI*2),s.fill(),s.restore()}}if(e==="droplets"){s.save(),s.fillStyle="#94d8ff";for(let n=0;n<18;n+=1){let o=t.x+(n*17+a*120)%t.width,p=t.y+(n*9+a*t.height*1.6)%t.height;s.fillRect(o,p,2*t.scale,6*t.scale)}s.restore()}if(e==="spiral"){s.save(),s.fillStyle="#ffe57b";for(let n=0;n<8;n+=1){let o=a*Math.PI*4+Math.PI*2*n/8,p=h(t.width*.18,2*t.scale,a),m=l+Math.cos(o)*p,E=d+Math.sin(o)*p;s.beginPath(),s.arc(m,E,3.4*t.scale,0,Math.PI*2),s.fill()}s.restore()}if(e==="balls-up"){s.save(),s.fillStyle="#ffe57b";for(let n=0;n<5;n+=1){let o=n*10*t.scale,p=d-(a*48*t.scale+o);s.beginPath(),s.arc(l+(n-2)*6*t.scale,p,3*t.scale,0,Math.PI*2),s.fill()}s.restore()}}applySpecialEffect(e,a,t){let i=t.side==="player"?this.playerSprite:this.foeSprite,s=t.side==="player"?this.foeSprite:this.playerSprite,l=t.metrics;switch(e){case"SE_DARK_SCREEN_FLASH":case"AnimationFlashScreen":this.drawFlash("#fff2a8",.24+Math.sin(a*Math.PI)*.36);break;case"SE_FLASH_SCREEN_LONG":case"FlashScreenEveryFourFrameBlocks":case"FlashScreenEveryEightFrameBlocks":this.drawFlash(a<.5?"#f2e7a8":"#d6e3ff",.24+Math.sin(a*Math.PI*4)*.18);break;case"SE_DARK_SCREEN_PALETTE":this.drawFlash("#1a1f33",.34);break;case"SE_DARKEN_MON_PALETTE":s.style.filter="brightness(.55) saturate(.8)";break;case"SE_LIGHT_SCREEN_PALETTE":this.drawFlash("#d7f0ff",.14),this.drawGlow(l.x+l.width*(t.side==="player"?.26:.74),l.y+l.height*(t.side==="player"?.78:.32),l.width*.14,"#bfe8ff",.45);break;case"SE_SHAKE_SCREEN":this.stage.style.transform=`translate(${Math.sin(a*Math.PI*10)*5}px, 0px)`;break;case"SE_WATER_DROPLETS_EVERYWHERE":this.drawScreenParticles("droplets",a,l,t.side);break;case"DoBlizzardSpecialEffects":this.drawScreenParticles("petals",a,l,t.side);break;case"SE_PETALS_FALLING":this.drawScreenParticles("petals",a,l,t.side);break;case"SE_LEAVES_FALLING":this.drawScreenParticles("leaves",a,l,t.side);break;case"SE_SPIRAL_BALLS_INWARD":this.drawScreenParticles("spiral",a,l,t.side);break;case"SE_SHOOT_BALLS_UPWARD":case"SE_SHOOT_MANY_BALLS_UPWARD":this.drawScreenParticles("balls-up",a,l,t.side);break;case"SE_MOVE_MON_HORIZONTALLY":i.style.transform=`translate(${t.side==="player"?18:-18}px, 0px)`;break;case"SE_RESET_MON_POSITION":i.style.transform="";break;case"SE_BLINK_MON":i.style.opacity=Math.floor(a*10)%2===0?"0.15":"1";break;case"SE_FLASH_MON_PIC":i.classList.toggle("hurt",Math.floor(a*10)%2===0);break;case"SE_HIDE_MON_PIC":i.style.opacity="0";break;case"SE_SHOW_MON_PIC":i.style.opacity="1";break;case"SE_HIDE_ENEMY_MON_PIC":s.style.opacity="0";break;case"SE_SHOW_ENEMY_MON_PIC":s.style.opacity="1";break;case"SE_BLINK_ENEMY_MON":s.style.opacity=Math.floor(a*10)%2===0?"0.15":"1";break;case"SE_SLIDE_MON_OFF":i.style.transform=`translate(${h(0,t.side==="player"?-90:90,a)}px, 0px)`,i.style.opacity=String(1-a);break;case"SE_SLIDE_MON_HALF_OFF":i.style.transform=`translate(${h(0,t.side==="player"?-42:42,a)}px, 0px)`;break;case"SE_SLIDE_ENEMY_MON_OFF":s.style.transform=`translate(${h(0,t.side==="player"?80:-80,a)}px, 0px)`,s.style.opacity=String(1-a);break;case"SE_SLIDE_MON_UP":i.style.transform=`translate(0px, ${h(0,-34,a)}px)`;break;case"SE_SLIDE_MON_DOWN":i.style.transform=`translate(0px, ${h(0,34,a)}px)`;break;case"SE_SLIDE_MON_DOWN_AND_HIDE":i.style.transform=`translate(0px, ${h(0,46,a)}px)`,i.style.opacity=String(1-a);break;case"SE_SQUISH_MON_PIC":i.style.transform=`scaleY(${h(1,.4,a)})`;break;case"SE_BOUNCE_UP_AND_DOWN":i.style.transform=`translate(0px, ${Math.sin(a*Math.PI*2)*-18}px)`;break;case"SE_MINIMIZE_MON":i.style.transform=`scale(${h(1,.45,a)})`;break;case"SE_SUBSTITUTE_MON":i.style.filter="sepia(.6) saturate(.4) brightness(1.15)";break;case"SE_TRANSFORM_MON":i.style.filter=`brightness(${1+Math.sin(a*Math.PI*6)*.8}) saturate(1.3)`;break;case"SE_SHAKE_ENEMY_HUD":this.foeStatus.style.transform=`translate(${Math.sin(a*Math.PI*12)*4}px, 0px)`;break;case"SE_SHAKE_BACK_AND_FORTH":i.style.transform=`translate(${Math.sin(a*Math.PI*10)*12}px, 0px)`;break;case"SE_WAVY_SCREEN":this.field.style.transform=`translateX(${Math.sin(a*Math.PI*8)*4}px)`;break;case"DoExplodeSpecialEffects":this.drawFlash("#ffd26d",.16+Math.sin(a*Math.PI*3)*.32);break;case"DoGrowlSpecialEffects":this.foeStatus.style.transform=`translate(${Math.sin(a*Math.PI*8)*3}px, 0px)`;break;case"DoRockSlideSpecialEffects":this.drawFlash("#b88f64",.12+Math.sin(a*Math.PI*2)*.1);break;default:break}}render(e){this.resetSprites(),this.resize(),this.ctx.clearRect(0,0,this.canvas.clientWidth,this.canvas.clientHeight),this.feed.textContent=e.log,this.applyHp(this.playerHpFill,this.playerHpValue,e.playerHp),this.applyHp(this.foeHpFill,this.foeHpValue,e.foeHp);let a=this.fieldMetrics(e.source);if(e.metrics=a,e.activeFrame)for(let t of e.activeFrame.sprites)this.drawSpriteTile(t,a);for(let t of e.activeEffects){let i=Math.max(1,t.end-t.start),s=u((e.time-t.start)/i,0,1);this.applySpecialEffect(t.effectName,s,e)}if(e.hiddenAttacker){let t=e.side==="player"?this.playerSprite:this.foeSprite;t.style.opacity="0"}if(e.hiddenDefender){let t=e.side==="player"?this.foeSprite:this.playerSprite;t.style.opacity="0"}e.hitActive&&(e.side==="player"?this.foeSprite:this.playerSprite).classList.toggle("hurt",Math.floor(e.time/90)%2===0)}},g=class{constructor(e,a){this.data=e,this.tilesets=a,this.moveIndex=0,this.side="player",this.playing=!0,this.loopAll=!1,this.startedAt=performance.now(),this.timeline=null,this.viewports=[],this.currentMove=null}viewportMarkup(e){return`
      <div class="preview-stage ${e}" data-viewport="${e}">
        <div class="battle-stage">
          <div class="battle-field"><canvas class="battle-layer"></canvas></div>
          <div class="battle-status battle-status-foe">
            <div class="battle-status-top"><strong>${S(f.foe.name)}</strong><span>Lv100</span></div>
            <div class="battle-status-meta"><span>Front Sprite</span><span data-foe-hp-value>100/100</span></div>
            <div class="battle-hp-row"><span class="hp-label">HP</span><div class="hp"><div class="hp-fill" data-foe-hp-fill></div></div></div>
          </div>
          <div class="battle-status battle-status-player">
            <div class="battle-status-top"><strong>${S(f.player.name)}</strong><span>Lv100</span></div>
            <div class="battle-status-meta"><span>Back Sprite</span><span data-player-hp-value>100/100</span></div>
            <div class="battle-hp-row"><span class="hp-label">HP</span><div class="hp"><div class="hp-fill" data-player-hp-fill></div></div></div>
          </div>
          <div class="battle-sprite-wrap battle-sprite-foe">
            <div class="battle-shadow"></div>
            <img class="sprite battle front attack-preview-foe" src="${A}" alt="${S(f.foe.name)}">
          </div>
          <div class="battle-sprite-wrap battle-sprite-player">
            <div class="battle-shadow"></div>
            <img class="sprite battle back attack-preview-player" src="${w}" alt="${S(f.player.name)}">
          </div>
          <div class="battle-feed"><div class="feed-line"></div></div>
        </div>
      </div>
    `}markup(){return`
      <div class="preview-shell">
        <section class="preview-card preview-header">
          <div>
            <div class="label">Gen 1 Source Preview</div>
            <h1>Pokemon Attack Animation Audit</h1>
            <p>This preview now reads the original move animation scripts from <a href="https://github.com/pret/pokered" target="_blank" rel="noreferrer">pret/pokered</a>. Each move uses the actual Gen 1 script order, subanimation frames, base coordinates and battle-effect routines as the source of truth.</p>
          </div>
          <div class="preview-meta">
            <span>165 Gen 1 moves</span>
            <span>Original subanimations</span>
            <span>Desktop + Mobile stage</span>
          </div>
        </section>
        <section class="preview-card preview-controls">
          <div class="preview-current">
            <div class="preview-current-head">
              <div>
                <div class="label">Current Move</div>
                <h2 data-current-name></h2>
                <p data-current-meta></p>
              </div>
              <span data-current-source></span>
            </div>
          </div>
          <div class="preview-buttons">
            <button class="btn-ghost" data-action="prev">Prev</button>
            <button class="btn-primary" data-action="replay">Replay</button>
            <button class="btn-ghost" data-action="next">Next</button>
            <button class="btn-ghost" data-action="side">Attacker: Player</button>
            <button class="btn-ghost" data-action="loop">Loop All: Off</button>
          </div>
        </section>
        <section class="preview-stage-grid">
          <div class="preview-stage-stack">
            <div class="preview-card preview-stage-panel">
              <div class="preview-stage-head">
                <div>
                  <div class="label">Desktop Battle View</div>
                  <h2>Live Stage Preview</h2>
                </div>
                <span>Matches the battle composition</span>
              </div>
              ${this.viewportMarkup("desktop")}
            </div>
            <div class="preview-card preview-stage-panel">
              <div class="preview-stage-head">
                <div>
                  <div class="label">Mobile Battle View</div>
                  <h2>Phone Stage Preview</h2>
                </div>
                <span>Same move, narrower battle frame</span>
              </div>
              ${this.viewportMarkup("mobile")}
            </div>
          </div>
          <aside class="preview-moves" data-move-list></aside>
        </section>
      </div>
    `}mount(e){e.innerHTML=this.markup(),this.nameNode=e.querySelector("[data-current-name]"),this.metaNode=e.querySelector("[data-current-meta]"),this.sourceNode=e.querySelector("[data-current-source]"),this.sideButton=e.querySelector('[data-action="side"]'),this.loopButton=e.querySelector('[data-action="loop"]'),this.moveList=e.querySelector("[data-move-list]"),e.querySelector('[data-action="prev"]').addEventListener("click",()=>this.step(-1)),e.querySelector('[data-action="next"]').addEventListener("click",()=>this.step(1)),e.querySelector('[data-action="replay"]').addEventListener("click",()=>this.replay()),this.sideButton.addEventListener("click",()=>{this.side=this.side==="player"?"foe":"player",this.sideButton.textContent=`Attacker: ${this.side==="player"?"Player":"Foe"}`,this.replay()}),this.loopButton.addEventListener("click",()=>{this.loopAll=!this.loopAll,this.loopButton.textContent=`Loop All: ${this.loopAll?"On":"Off"}`,this.loopButton.classList.toggle("active",this.loopAll)}),this.viewports=Array.from(e.querySelectorAll("[data-viewport]")).map(t=>new b(t,t.dataset.viewport,this.tilesets)),this.renderMoveList(),this.setMove(0);let a=t=>{this.tick(t),requestAnimationFrame(a)};requestAnimationFrame(a)}renderMoveList(){this.moveList.innerHTML=this.data.moves.map((e,a)=>`
      <button class="move-chip${a===this.moveIndex?" active":""}" data-move-index="${a}">
        <strong>#${e.num.toString().padStart(3,"0")}</strong>
        <span>${S(e.name)}</span>
        <em>${S(e.pointerLabel)}</em>
      </button>
    `).join(""),this.moveList.querySelectorAll("[data-move-index]").forEach(e=>{e.addEventListener("click",()=>this.setMove(Number(e.dataset.moveIndex)))})}setMove(e){this.moveIndex=(e+this.data.moves.length)%this.data.moves.length,this.currentMove=this.data.moves[this.moveIndex],this.timeline=y(this.currentMove,this.side,this.data.source),this.startedAt=performance.now(),this.playing=!0,this.nameNode.textContent=this.currentMove.name,this.metaNode.textContent=`${this.currentMove.type} | ${this.currentMove.category} | PP ${this.currentMove.pp??"-"} | Acc ${this.currentMove.accuracy??"-"}`,this.sourceNode.textContent=this.currentMove.pointerLabel,this.renderMoveList()}step(e){this.setMove(this.moveIndex+e)}replay(){this.timeline=y(this.currentMove,this.side,this.data.source),this.startedAt=performance.now(),this.playing=!0}currentScene(e){let a=e-this.startedAt,t=this.playing?a:Math.min(a,this.timeline.total),i=this.timeline.segments.find(c=>c.kind==="subframe"&&t>=c.start&&t<c.end)?.frame||null,s=[],l=!1,d=!1,n=!1;for(let c of this.timeline.segments)c.kind!=="special"||t<c.start||(c.effect==="SE_DARK_SCREEN_PALETTE"&&(l=!0),c.effect==="SE_RESET_SCREEN_PALETTE"&&(l=!1),c.effect==="SE_HIDE_MON_PIC"&&(d=!0),c.effect==="SE_SHOW_MON_PIC"&&(d=!1),c.effect==="SE_HIDE_ENEMY_MON_PIC"&&(n=!0),c.effect==="SE_SHOW_ENEMY_MON_PIC"&&(n=!1),t>=c.start&&t<c.end&&s.push({...c,effectName:c.effect}));let o=this.timeline.segments.find(c=>c.kind==="subframe"&&c.moveSpecificEffect&&t>=c.start&&t<c.end);o&&s.push({effectName:o.moveSpecificEffect,start:o.start,end:o.start+(O[o.moveSpecificEffect]||o.end-o.start)}),l&&s.push({effectName:"SE_DARK_SCREEN_PALETTE",start:0,end:t+1});let p=this.side==="player"?f.player.name:f.foe.name,m=this.side==="player"?f.foe.name:f.player.name,E=`${p} used ${this.currentMove.name}!`;this.timeline.impactTime!==null&&t>=this.timeline.impactTime&&t<this.timeline.resolveTime?E=`${this.currentMove.name} hits ${m}!`:t>=this.timeline.resolveTime&&(E=T(this.currentMove,p,m));let v=P(this.currentMove),M=this.timeline.impactTime===null?0:u((t-this.timeline.impactTime)/200,0,1),k=this.side==="foe"?1-v*M:1,I=this.side==="player"?1-v*M:1;return{time:t,side:this.side,source:this.data.source,activeFrame:i,activeEffects:s,hiddenAttacker:d,hiddenDefender:n,hitActive:this.timeline.impactTime!==null&&t>=this.timeline.impactTime&&t<this.timeline.impactTime+220,playerHp:k,foeHp:I,log:E}}tick(e){if(!this.currentMove||!this.timeline)return;if(e-this.startedAt>=this.timeline.total){if(this.loopAll){this.setMove(this.moveIndex+1);return}this.playing=!1}let t=this.currentScene(e);for(let i of this.viewports)i.render(t)}};async function $(){D();let r=await fetch(x);if(!r.ok)throw new Error(`Failed to load ${x}`);let e=await r.json(),a=await Promise.all(Object.entries(e.source.tilesets).map(async([s,l])=>[s,await H(l)])),t=Object.fromEntries(a);new g(e,t).mount(document.getElementById("app"))}$().catch(r=>{console.error(r),document.getElementById("app").innerHTML=`<pre style="padding:16px;color:#fff;background:#300">${S(r.stack||r.message)}</pre>`});})();

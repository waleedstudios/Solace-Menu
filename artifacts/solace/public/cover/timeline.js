import {calculate,contributions,service,money} from './data.js';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>n*n*(3-2*n);
// One DOM object per identity per act. x is stage fraction; y is CSS pixels.
// Keyframes: [x,y,scale,rotation,opacity].
const choreography=[
 {invoice:[[.02,355,.4,-8,1],[.05,48,.88,0,1],[.00,38,.62,-3,1],[.01,20,.4,-5,.35],[.01,20,.4,-5,0]],chicken:[[.02,315,.7,-12,0],[.05,185,.8,0,0],[.03,345,.92,0,1],[.02,160,.92,0,1],[.02,150,.92,0,1]],mayo:[[.02,355,.7,-12,0],[.05,280,.8,0,0],[.03,435,.92,0,1],[.02,300,.92,0,1],[.02,290,.92,0,1]]},
 {chicken:[[.01,70,1,0,1],[.01,75,.9,0,.4],[.02,65,.9,0,1],[.01,80,.85,0,1],[.01,80,.85,0,.4]],mayo:[[.01,205,1,0,1],[.04,215,.85,0,1],[.27,160,.4,0,0],[.01,210,.8,0,0],[.01,210,.8,0,0]],prep:[[.01,340,.8,0,0],[.01,360,.92,0,1],[.02,215,.92,0,1],[.01,230,.85,0,1],[.01,230,.85,0,.4]],bowl:[[.02,425,.6,0,0],[.02,425,.7,0,0],[.01,390,.95,0,1],[.01,390,.85,0,1],[.01,390,.85,0,.6]]},
 {report:[[.01,70,1,-4,1],[.02,50,.85,0,1],[.05,90,.7,0,.5],[.1,80,.5,0,0],[.1,80,.5,0,0]],bowl:[[.01,365,.9,0,.5],[.01,300,.9,0,1],[.01,300,.9,0,1],[.01,320,.9,0,1],[.01,320,.9,0,.5]],chicken:[[.01,150,.7,0,0],[.01,150,.7,0,0],[.01,160,.8,0,0],[.01,105,.9,0,1],[.01,105,.9,0,.5]]},
 {mayo:[[.01,100,.95,0,1],[.01,75,.9,0,1],[.05,45,.65,0,0],[.01,100,.8,0,0],[.01,100,.8,0,0]],prep:[[.01,265,.8,0,0],[.01,230,.9,0,1],[.05,165,.65,0,0],[.01,230,.8,0,0],[.01,230,.8,0,0]],bowl:[[.01,405,.7,0,0],[.01,390,.9,0,1],[.02,310,.94,0,1],[.01,300,.6,0,0],[.01,300,.6,0,0]]}
];
export function initTimeline(){
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 900px)');
 const acts=[...document.querySelectorAll('.act')].map((el,i)=>({el,i,stage:el.querySelector('.stage-body'),panels:[...el.querySelectorAll('[data-panel]')],copies:[...el.querySelectorAll('[data-copy]')],entities:[...el.querySelectorAll('[data-entity]')],progress:el.querySelector('.act-progress i'),step:el.querySelector('.chapter-step'),rows:[...el.querySelectorAll('.assembly-row,.reveal-row')],paths:el.querySelector('.connections')}));
 let sizes=[],frame=0,sequential=false,reading=false;
 const readingButton=document.querySelector('#motion-toggle');
 function measure(){const reduced=motion.matches||reading;document.body.classList.toggle('reduced',reduced);readingButton?.setAttribute('aria-pressed',String(reduced));sequential=reduced||mobile.matches;sizes=acts.map(a=>({top:a.el.getBoundingClientRect().top+scrollY,range:Math.max(1,a.el.offsetHeight-innerHeight),width:sequential?0:a.stage.clientWidth}));schedule();}
 function toggleReading(){reading=!reading;measure()}
 readingButton?.addEventListener('click',toggleReading);
 function update(){frame=0;let current=0;
 acts.forEach((a,i)=>{const box=sizes[i];if(!box)return;const p=clamp((scrollY-box.top)/box.range)*4,step=Math.min(3,Math.floor(p)),local=p>=4?1:p-step;if(scrollY>=box.top-100)current=i;
 if(sequential){a.panels.forEach(el=>{el.removeAttribute('aria-hidden');el.inert=false});a.copies.forEach(el=>{el.removeAttribute('aria-hidden');el.inert=false});a.el.querySelector('[data-counter=prep]')?.replaceChildren(money(calculate('spicyMayo').cost*600));a.el.querySelector('[data-counter=bowl]')?.replaceChildren(money(calculate('bowl').cost));a.el.querySelector('[data-counter=service]')?.replaceChildren(money(service().cost));return;}
 a.el.style.setProperty('--ticket-travel',`${-local*70}px`);a.progress.style.transform=`scaleX(${p/4})`;a.step.textContent=`${String(step+1).padStart(2,'0')} — 04`;
 a.panels.forEach((el,j)=>{let alpha=j===step?1:0;if(local>.85&&step<3){const t=(local-.85)/.15;alpha=j===step?1-t:j===step+1?t:0;}el.style.opacity=alpha;el.style.transform=`translateY(${(1-alpha)*20}px)`;el.style.pointerEvents=alpha>.5?'auto':'none';el.inert=alpha<=.5;el.setAttribute('aria-hidden',String(alpha<=.5));});
 a.copies.forEach((el,j)=>{const active=j===step;el.style.opacity=active?1:0;el.style.transform=`translateY(${active?0:12}px)`;el.style.pointerEvents=active?'auto':'none';el.inert=!active;el.setAttribute('aria-hidden',String(!active));});
 a.entities.forEach(el=>{const keys=choreography[i][el.dataset.entity],from=keys[step],to=keys[step+1],t=ease(clamp((local-.48)/.40));const v=from.map((n,k)=>n+(to[k]-n)*t);el.style.transform=`translate(${v[0]*box.width}px,${v[1]}px) scale(${v[2]}) rotate(${v[3]}deg)`;el.style.opacity=v[4];});
 a.paths.style.setProperty('--path-offset',1-clamp((local-.15)/.5));a.paths.style.opacity=i===0&&step<2?0:1;
 a.rows.forEach(el=>{const ix=Number([...el.classList].find(c=>/^row-\d/.test(c))?.split('-')[1]||0),t=clamp((local-.10-ix*.065)/.2);el.style.opacity=.2+.8*t;el.style.transform=`translateX(${-30*(1-t)}px)`;});
 if(i===0){const scan=step===1?clamp((local-.1)/.55):step>1?1:0;a.el.style.setProperty('--scan',`${scan*260}px`);a.el.style.setProperty('--scanning',step===1?'1':'0');a.el.querySelectorAll('[data-detect]').forEach((el,j)=>el.style.setProperty('--detected',scan>(j+1)/6?'1':'0'));}
 if(i===1){a.el.style.setProperty('--mix',`${Math.sin(local*Math.PI*2)*12}px`);a.el.style.setProperty('--bowl-scale',.65+.35*clamp(local/.6));a.el.style.setProperty('--bowl-rotate',`${-8+8*clamp(local/.6)}deg`);if(step===1)a.el.querySelector('[data-counter=prep]').textContent=money(contributions('spicyMayo').reduce((n,c,j)=>n+c.cost*clamp((local-.1-j*.13)/.16),0));if(step===2)a.el.querySelector('[data-counter=bowl]').textContent=money(contributions('bowl').reduce((n,c,j)=>n+c.cost*clamp((local-.08-j*.07)/.12),0));}
 if(i===2){a.el.style.setProperty('--cost-fill',service().percent/100*(step===2?clamp(local/.6):1));if(step===2)a.el.querySelector('[data-counter=service]').textContent=money(service().cost*clamp((local-.1)/.5));}
 if(i===3)a.el.style.setProperty('--label-scan',`${clamp(local/.6)*260}px`);
 });
 document.querySelectorAll('.site-header nav a').forEach((a,i)=>{if(i===current)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 const resize=new ResizeObserver(measure);acts.forEach(a=>resize.observe(a.el));
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);motion.addEventListener('change',measure);mobile.addEventListener('change',measure);document.fonts?.ready.then(measure);addEventListener('load',measure,{once:true});measure();
 const begin=document.querySelector('[data-begin]');function start(e){e.preventDefault();scrollTo({top:sizes[0].top+sizes[0].range*.26,behavior:motion.matches?'instant':'smooth'})}begin?.addEventListener('click',start);
 const scenarioLinks=[...document.querySelectorAll('[data-story-scene]')];
 function jump(e){const link=e.currentTarget,target=acts.findIndex(a=>'#'+a.el.id===link.hash);if(target<0||sequential)return;e.preventDefault();scrollTo({top:sizes[target].top+sizes[target].range*(Number(link.dataset.storyScene)+.65)/4,behavior:motion.matches?'instant':'smooth'})}
 scenarioLinks.forEach(a=>a.addEventListener('click',jump));
 return ()=>{cancelAnimationFrame(frame);resize.disconnect();removeEventListener('load',measure);begin?.removeEventListener('click',start);removeEventListener('scroll',schedule);removeEventListener('resize',measure);readingButton?.removeEventListener('click',toggleReading);scenarioLinks.forEach(a=>a.removeEventListener('click',jump));motion.removeEventListener('change',measure);mobile.removeEventListener('change',measure)};
}


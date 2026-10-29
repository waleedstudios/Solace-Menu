export const menuDishes={
 burger:{name:'The House Burger',price:18,base:[310,25,9,19],parts:{tomatoes:{name:'Tomatoes',nutrition:[8,.4,1.8,.1]},cheese:{name:'Cheddar',nutrition:[80,5,1,6.5]},bun:{name:'Brioche bun',nutrition:[210,7,36,5]}}},
 salad:{name:'Garden Caesar',price:15,base:[65,4,9,2],parts:{croutons:{name:'Croutons',nutrition:[100,3,16,3]},cheese:{name:'Parmesan',nutrition:[65,6,.5,4.5]},dressing:{name:'Caesar dressing',nutrition:[120,1,2,12]}}},
 pizza:{name:'Wood-fired Pizza',price:19,base:[480,18,68,15],parts:{pepperoni:{name:'Pepperoni',nutrition:[130,6,1,11]},olives:{name:'Olives',nutrition:[35,.3,2,3]},cheese:{name:'Extra mozzarella',nutrition:[85,7,1,6]}}},
 rice:{name:'Harvest Rice Bowl',price:17,base:[75,3,12,2],parts:{rice:{name:'Steamed rice',nutrition:[234,4.5,51,.5]},chicken:{name:'Grilled chicken',nutrition:[198,37,0,4.3]},avocado:{name:'Avocado',nutrition:[112,1.4,6,10.3]}}}
};
export function menuTotals(id,removed=[]){const d=menuDishes[id];return d.base.map((n,i)=>n+Object.entries(d.parts).reduce((sum,[key,p])=>sum+(removed.includes(key)?0:p.nutrition[i]),0));}
const ellipse=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const scatter=(count,shape)=>Array.from({length:count},(_,i)=>{const a=i*2.399,r=28+Math.sqrt(i/count)*105;return shape(240+Math.cos(a)*r,175+Math.sin(a)*r*.62,i)}).join('');
export function foodLayers(id){
 const wrap=(key,body)=>`<g class="food-layer" data-food-part="${key}" style="transform-origin:240px 180px">${body}</g>`;
 let base='',layers='';
 if(id==='burger'){
 base=wrap('bun',ellipse(240,232,133,31,'#bd7b35'))+ellipse(240,214,139,24,'#497441')+ellipse(240,189,133,28,'url(#seared)')+ellipse(240,177,125,12,'#734328');
 layers=wrap('tomatoes',ellipse(195,167,73,16,'#c3442e')+ellipse(288,163,71,16,'#e0603d')+ellipse(195,165,57,8,'#f08a57'))+wrap('cheese','<path d="M105 154L335 145 377 165 309 188 250 168 161 186Z" fill="#f2be52"/>')+wrap('bun','<path d="M102 143C105 36 373 36 378 143Q240 184 102 143" fill="url(#bread)"/>'+Array.from({length:22},(_,i)=>ellipse(145+(i*43%190),93+(i*17%43),4,1.5,'#f9e1ad')).join(''));
 }else{
 base=ellipse(240,180,153,99,id==='pizza'?'url(#bread)':'#e2e0cc')+ellipse(240,176,139,86,id==='pizza'?'#ba4830':'#486843');
 if(id==='pizza')base+=ellipse(240,175,132,79,'#e7bf72');
 else base+=scatter(28,(x,y,i)=>`<ellipse cx="${x}" cy="${y}" rx="27" ry="13" fill="${['#738c43','#a2aa5a','#436b39'][i%3]}" transform="rotate(${i*47} ${x} ${y})"/>`);
 if(id==='salad')layers=wrap('croutons',scatter(13,(x,y,i)=>`<rect x="${x-8}" y="${y-8}" width="18" height="16" rx="3" fill="${i%2?'#c38b47':'#e1b36a'}" transform="rotate(${i*30} ${x} ${y})"/>`))+wrap('cheese',scatter(17,(x,y,i)=>`<path d="M${x} ${y}l19 -5 -6 12 -15 1Z" fill="#f2e5b2"/>`))+wrap('dressing','<path d="M145 142Q320 110 300 145T170 178 320 190 205 225" fill="none" stroke="#e7d8ac" stroke-width="7" stroke-linecap="round"/>');
 if(id==='pizza')layers=wrap('cheese',scatter(23,(x,y)=>ellipse(x,y,13,8,'#fff0be')))+wrap('pepperoni',scatter(13,(x,y)=>ellipse(x,y,19,13,'#a63e29')+ellipse(x-3,y-3,3,2,'#dc8d5c')))+wrap('olives',scatter(15,(x,y)=>`<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="none" stroke="#303b27" stroke-width="5"/>`));
 if(id==='rice')layers=wrap('rice',scatter(90,(x,y,i)=>`<ellipse cx="${x}" cy="${y}" rx="9" ry="3" fill="${i%2?'#ede2c4':'#fff6da'}" transform="rotate(${i*23} ${x} ${y})"/>`))+wrap('chicken',Array.from({length:6},(_,i)=>`<g transform="translate(${168+i*19} ${130+i*8}) rotate(-24)"><rect width="34" height="92" rx="15" fill="url(#seared)"/><path d="M3 20h28M3 42h28M3 64h28" stroke="#704222" stroke-width="3"/></g>`).join(''))+wrap('avocado',Array.from({length:5},(_,i)=>`<path d="M${305+i*10} 125q-75 35 -30 95q-20 -55 42 -75Z" fill="${i%2?'#a7b95d':'#d4d48a'}" stroke="#648345" stroke-width="3"/>`).join(''));
 }
 return `<svg class="food-art" viewBox="0 0 480 330" role="img" aria-label="Layered illustration of ${menuDishes[id].name}"><defs><radialGradient id="plate"><stop stop-color="#fffdf5"/><stop offset=".8" stop-color="#eeebe0"/><stop offset="1" stop-color="#c8c8b9"/></radialGradient><linearGradient id="bread" x2="0" y2="1"><stop stop-color="#edc17a"/><stop offset=".55" stop-color="#c8893c"/><stop offset="1" stop-color="#9d5925"/></linearGradient><linearGradient id="seared" x2="0" y2="1"><stop stop-color="#c69053"/><stop offset=".5" stop-color="#85532f"/><stop offset="1" stop-color="#513323"/></linearGradient><filter id="foodshadow"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#2c2014" flood-opacity=".24"/></filter></defs>${ellipse(240,270,183,28,'#241e1722')}<g filter="url(#foodshadow)">${ellipse(240,191,204,123,'url(#plate)')}${ellipse(240,188,174,103,'#d9d9c955')}<g class="food-base">${base}</g>${layers}</g></svg>`;
}
export function menuCards(){return Object.entries(menuDishes).map(([id,d])=>`<button class="menu-tile" data-open-dish="${id}">${foodLayers(id)}<span><small>FROM THE PASS · INTERACTIVE DEMO</small><b>${d.name}<i>$${d.price}</i></b><p>Make it yours. Watch the nutrition change.</p><em>Open & customize ↗</em></span></button>`).join('');}

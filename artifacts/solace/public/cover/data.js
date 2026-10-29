export const LB = 453.59237;
export const supplier = {id:'supply',name:'Restaurant Supply Co.'};
export const nutrients=['calories','protein','carbs','fat','sodium'];
const label=(basis,calories,protein,carbs,fat,sodium)=>({basis,calories,protein,carbs,fat,sodium});
export const ingredients={
 chicken:{id:'chicken',name:'Chicken Breast',pack:20*LB,packText:'20 lb',price:189.80,yield:1,label:label(100,165,31,0,3.6,74),color:'chicken'},
 avocado:{id:'avocado',name:'Avocado',pack:24*150,packText:'24 ct · 150 g usable each',price:28.99,yield:1,label:label(100,160,2,8.5,14.7,7),color:'sage'},
 mayo:{id:'mayo',name:'House Mayo',pack:8000,packText:'1 case · 8,000 g net',price:52.75,yield:1,label:label(15,100,0,0,11,90),color:'gold'},
 rice:{id:'rice',name:'Long-grain Rice',pack:50*LB,packText:'50 lb dry',price:41.50,yield:1,label:label(100,365,7.1,80,0.7,5),color:'cream'},
 spinach:{id:'spinach',name:'Baby Spinach',pack:100*3,packText:'300 g bag',price:18,yield:1,label:label(3,10,1,1,0,15),color:'sage'},
 sriracha:{id:'sriracha',name:'Sriracha',pack:750,packText:'750 g',price:3.45,yield:1,label:label(5,5,0,1,0,80),color:'chicken'},
 oil:{id:'oil',name:'Chili Oil',pack:500,packText:'500 g measured net',price:9,yield:1,label:label(14,120,0,0,14,0),color:'gold'},
 crunch:{id:'crunch',name:'Toasted Seeds',pack:1000,packText:'1,000 g',price:5.5,yield:1,label:label(100,520,7,58,29,620),color:'gold'}
};
export const invoice={id:'invoice-10482',number:'10482',date:'Oct 28, 2026',supplierId:'supply',lines:[
 {id:'line-chicken',ingredient:'chicken',description:'CHICKEN BREAST 20LB CS',quantity:'20 lb'},
 {id:'line-avocado',ingredient:'avocado',description:'AVOCADO HASS 24 CT',quantity:'24 ct'},
 {id:'line-mayo',ingredient:'mayo',description:'HOUSE MAYO 8KG CASE',quantity:'1 case'},
 {id:'line-rice',ingredient:'rice',description:'LONG GRAIN RICE 50LB',quantity:'50 lb'},
 {id:'line-spinach',ingredient:'spinach',description:'BABY SPINACH 300G',quantity:'300 g'}]};
export const recipes={
 spicyMayo:{id:'spicyMayo',name:'Spicy Mayo',yield:600,kind:'prep',lines:[['mayo',500],['sriracha',80],['oil',20]]},
 cookedRice:{id:'cookedRice',name:'Cooked long-grain rice',yield:3000,kind:'prep',lines:[['rice',1000]]},
 bowl:{id:'bowl',name:'Chicken Rice Bowl',servings:1,price:13,kind:'menu',image:'bowl.svg',description:'Atlantic chicken, avocado, seasoned rice and our house spicy mayo.',lines:[['cookedRice',180],['spinach',3],['chicken',85],['avocado',35],['spicyMayo',25],['crunch',15]]},
 wrap:{id:'wrap',name:'Chicken Wrap',servings:1,price:18,kind:'menu',image:'bowl.svg',description:'A generous serving of chicken, rice and avocado with house spicy mayo.',lines:[['cookedRice',240],['spinach',6],['chicken',145],['avocado',60],['spicyMayo',42],['crunch',20]]},
 grilled:{id:'grilled',name:'Grilled Chicken',servings:1,price:9,kind:'menu',image:'bowl.svg',description:'Atlantic chicken over a measured portion of long-grain rice.',lines:[['cookedRice',90],['chicken',55]]},
 salad:{id:'salad',name:'Chicken Salad',servings:1,price:17,kind:'menu',image:'bowl.svg',description:'Chicken, avocado and rice, finished with our house spicy mayo.',lines:[['cookedRice',220],['chicken',120],['avocado',70],['spicyMayo',35],['crunch',10]]}
};
export const sales=[{id:'sale-bowl',name:'CHICKEN BOWL',recipe:'bowl',quantity:42},{id:'sale-wrap',name:'CHICKEN WRAP',recipe:'wrap',quantity:24},{id:'sale-grilled',name:'GRILLED CHICKEN',recipe:'grilled',quantity:18},{id:'sale-salad',name:'CHICKEN SALAD',recipe:'salad',quantity:31}];
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
export const fixed=(n,d=1)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
export function calculate(id,{chickenPrice=9.49,nutritionReady=true,missing=[]}={},stack=[]){
 if(stack.includes(id))throw Error('Recipe cycle');
 if(ingredients[id]){const i=ingredients[id],cost=id==='chicken'?chickenPrice/LB:i.price/(i.pack*i.yield),complete=!missing.includes(id)&&(id!=='mayo'||nutritionReady);return {cost,complete,nutrition:Object.fromEntries(nutrients.map(n=>[n,complete?i.label[n]/i.label.basis:null]))};}
 const r=recipes[id];if(!r)throw Error('Unknown ingredient or recipe');
 const parts=r.lines.map(([key,g])=>({g,result:calculate(key,{chickenPrice,nutritionReady,missing},[...stack,id])}));
 const divisor=r.kind==='prep'?r.yield:r.servings,complete=parts.every(p=>p.result.complete);
 return {cost:parts.reduce((sum,p)=>sum+p.result.cost*p.g,0)/divisor,complete,nutrition:Object.fromEntries(nutrients.map(n=>[n,complete?parts.reduce((sum,p)=>sum+p.result.nutrition[n]*p.g,0)/divisor:null]))};
}
export function service(chickenPrice=9.49){const revenue=sales.reduce((sum,s)=>sum+s.quantity*recipes[s.recipe].price,0),cost=sales.reduce((sum,s)=>sum+s.quantity*calculate(s.recipe,{chickenPrice}).cost,0);return {revenue,cost,percent:cost/revenue*100,contribution:revenue-cost,quantity:sales.reduce((n,s)=>n+s.quantity,0)};}
export function contributions(id,options){return recipes[id].lines.map(([key,g])=>({id:key,name:(ingredients[key]||recipes[key]).name,grams:g,cost:calculate(key,options).cost*g}));}

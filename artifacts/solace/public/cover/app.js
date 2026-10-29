import './live-menu.js';
import {recipes,calculate,nutrients,money,fixed} from './data.js';
import {invoiceDocument,priceResults} from './components.js';
import {initTimeline} from './timeline.js';
const $=s=>document.querySelector(s);
const mobileInvoice=document.createElement('div');mobileInvoice.className='mobile-invoice';mobileInvoice.innerHTML=invoiceDocument();$('.scanner-panel .panel-content').append(mobileInvoice);
let cleanup=initTimeline();addEventListener('pagehide',()=>cleanup());addEventListener('pageshow',e=>{if(e.persisted)cleanup=initTimeline()});
const slider=$('#chicken-price');
function updatePrice(){const price=Number(slider.value);$('#chicken-price-output').textContent=`${money(price)} / lb`;$('#price-results').innerHTML=priceResults(price);const token=$('#service [data-entity=chicken] div>span');if(token)token.textContent=`${money(price)} / lb`;const bowl=$('#service [data-entity=bowl] div>span');if(bowl)bowl.textContent=`${money(calculate('bowl',{chickenPrice:price}).cost)} / serving`;}
slider.addEventListener('input',updatePrice);$('#reset-price').addEventListener('click',()=>{slider.value='9.49';updatePrice()});
let audio,gain,tones=[];
$('#sound').addEventListener('click',async()=>{const on=$('#sound').getAttribute('aria-pressed')==='true';if(on){tones.forEach(o=>o.stop());tones=[];gain?.disconnect()}else{try{audio??=new AudioContext();await audio.resume();gain=audio.createGain();gain.gain.value=.012;gain.connect(audio.destination);tones=[130.81,196,261.63].map(f=>{const o=audio.createOscillator();o.frequency.value=f;o.connect(gain);o.start();return o})}catch{return}}$('#sound').setAttribute('aria-pressed',String(!on));$('#sound').setAttribute('aria-label',`Turn ambient sound ${on?'on':'off'}`);$('#sound span').textContent=`Sound ${on?'off':'on'}`});

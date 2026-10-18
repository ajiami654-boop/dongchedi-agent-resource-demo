import { card, chart, report, resourceIcon, icon } from './render.js';
export let variant = ['1','2','3','4'].includes(new URLSearchParams(location.search).get('scheme')) ? new URLSearchParams(location.search).get('scheme') : '2';
const descriptions = {1:'原方案 · 过程资源完整卡片',2:'过程用缩略图识别，最终报告完整展示',3:'保留工具后的资源链接，点击在右侧查看',4:'过程中保留文字，结束后集中展示最新资源'};
const names = {chart:'车系差评率对比',html:'车主差评分析报告'};
const toolbar=document.createElement('nav');toolbar.className='scheme-bar';toolbar.setAttribute('aria-label','展示方案对比');
toolbar.innerHTML='<span class="scheme-caption">资源展示方案</span>'+['① 卡片','② 缩略图','③ 按钮','④ 末尾集中'].map((label,i)=>`<button data-scheme="${i+1}">${label}</button>`).join('')+'<span id="scheme-description"></span><button id="scheme-replay">重新播放</button>';
document.querySelector('#topbar').after(toolbar);
const panel=document.createElement('aside');panel.id='resource-inspector';panel.hidden=true;panel.innerHTML='<header><strong id="inspector-title"></strong><button id="inspector-close" aria-label="关闭资源详情">'+icon('Close')+'</button></header><div id="inspector-body"></div>';
document.querySelector('#resources').after(panel);
const divider=document.createElement('div');divider.id='resource-divider';divider.setAttribute('role','separator');divider.setAttribute('aria-label','调整资源面板宽度');divider.setAttribute('aria-orientation','vertical');divider.tabIndex=0;panel.before(divider);
const resize=(x)=>{const app=document.querySelector('#app');const width=Math.min(800,Math.max(380,x-app.getBoundingClientRect().left-app.clientLeft));app.style.setProperty('--chat-detail-width',width+'px');};
divider.onpointerdown=e=>{divider.setPointerCapture(e.pointerId);divider.onpointermove=move=>resize(move.clientX);};divider.onpointerup=()=>divider.onpointermove=null;divider.onpointercancel=()=>divider.onpointermove=null;
divider.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(document.querySelector('#workspace').getBoundingClientRect().right+(e.key==='ArrowRight'?20:-20));}};
document.querySelector('#inspector-close').onclick=()=>{panel.hidden=true;document.querySelector('#app').classList.remove('inspecting');};
export const openInspector=(name,html)=>{document.querySelector('#inspector-title').textContent=name;document.querySelector('#inspector-body').innerHTML=html;panel.hidden=false;document.querySelector('#app').style.setProperty('--chat-detail-width','380px');document.querySelector('#app').classList.add('inspecting');};
export const closeInspector=()=>document.querySelector('#inspector-close').click();
const preview = (kind) => kind==='chart'?chart():report();
export const applyVariant=()=>{
 document.querySelector('#app').dataset.scheme=variant;
 toolbar.querySelectorAll('[data-scheme]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.scheme===variant));});
 document.querySelector('#scheme-description').textContent=descriptions[variant];
 const messages=document.querySelector('#messages');
 const toggle=messages.querySelector('#run-label');if(toggle){toggle.title='展开或收起任务过程';}
 messages.querySelectorAll('.variant-result,.process-resource').forEach(e=>e.remove());
 messages.querySelectorAll('#first>.resource-card,#second>.resource-card').forEach(original=>{
  original.classList.toggle('variant-hidden',variant!=='1');
  if(variant!=='2'||original.hidden||original.id==='report-two')return;
  const kind=original.dataset.kind;const wrapper=document.createElement('div');wrapper.className='process-resource';wrapper.dataset.source=original.id;
  wrapper.innerHTML=`<button class="resource-thumbnail" data-resource="${names[kind]}" title="查看${names[kind]}"><span class="thumb-view" aria-hidden="true" inert><span class="thumb-canvas">${preview(kind)}</span></span><span class="thumb-label">${resourceIcon(kind==='chart'?'chart':'html')}<span>${names[kind]}</span></span><span class="thumb-hover">查看详情 ↗</span></button>`;
  original.after(wrapper);
 });
 const final=messages.querySelector('#third');
 if(final&&variant!=='1'){
  const result=document.createElement('section');result.className='variant-result';result.innerHTML=variant==='4'?`<div class="result-title">最终报告</div>${card('html','final-report')}<div class="round-resources"><button type="button" class="round-resource-toggle" aria-expanded="false" aria-controls="round-resource-list"><span class="round-resource-mark" aria-hidden="true">${icon('Resource')}</span><span>本轮创建资源（2）</span><span class="round-resource-chevron" aria-hidden="true"></span></button><div class="round-resource-list" id="round-resource-list" hidden><button type="button" data-resource="车主差评分析报告">${resourceIcon('html')}<span>车主差评分析报告</span></button><button type="button" data-resource="车系差评率对比">${resourceIcon('chart')}<span>车系差评率对比</span></button></div></div>`:`<div class="result-title">最终报告</div>${card('html','final-report')}`;
  final.querySelector('.final-answer').before(result);
 }
};
export const initializeVariants = ({onChange,onReplay})=>{
 document.querySelector('#messages').addEventListener('click',event=>{const toggle=event.target.closest('.round-resource-toggle');if(!toggle)return;const expanded=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(expanded));document.querySelector('#round-resource-list').hidden=!expanded;});
 toolbar.addEventListener('click',event=>{const button=event.target.closest('button[data-scheme]');if(!button)return;variant=button.dataset.scheme;const url=new URL(location.href);url.searchParams.set('scheme',variant);history.replaceState(null,'',url);closeInspector();onChange();});
 document.querySelector('#scheme-replay').onclick=onReplay;applyVariant();
};

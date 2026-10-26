import { applyVariant, initializeVariants, variant, openInspector } from './variants.js?v=20261026b';
import { resources, series, initialQuestion, finalAnswer } from './data.js';
import { icon, resourceIcon, report, chart, stages, question, escapeHtml } from './render.js?v=20261016d';
import { dashboardMarkup, componentEditorMarkup, dashboardWidgets } from './dashboard.js?v=20261026';
const $ = (selector) => document.querySelector(selector);
const messages = $('#messages'), conversation = $('#conversation'), prompt = $('#prompt'), send = $('#send');
let timers = [], running = false, replayIndex = 0, following = true;
const toast = (text) => { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('#toast').hidden=true,3200); };
const cancel = () => { timers.forEach(clearTimeout); timers=[]; running=false; send.classList.remove('running'); send.innerHTML=icon('JiusiArrowUp'); send.setAttribute('aria-label','发送'); send.disabled=!prompt.value.trim(); };
const schedule = (fn,ms) => timers.push(setTimeout(fn,ms));
const bottom = () => { conversation.scrollTop=conversation.scrollHeight; };
const locate = (id) => { const element=document.getElementById(id); if(element) conversation.scrollTop=element.offsetTop-20; };
const renderResources = () => {
 const query=$('#resource-search').value.trim(); const onlyAI=$('#ai-only').checked;
 $('#resource-list').innerHTML=resources.filter(([name,, ,ai])=>(!query||name.includes(query))&&(!onlyAI||ai)).map(([name,type,depth,ai])=>`<button class="resource-row" data-resource="${escapeHtml(name)}" style="padding-left:${depth*20}px" title="${escapeHtml(name)}">${resourceIcon(type)}<span class="label">${name}</span>${ai?'<span class="ai-tag">AI</span>':''}</button>`).join('') || '<p class="dialog-note">没有匹配的资源</p>';
};
const complete = () => {
 cancel(); messages.classList.remove('process-collapsed'); messages.innerHTML=question()+stages.map(([id,html])=>`<section class="block" id="${id}">${html}</section>`).join('');
 applyVariant(); setProcessCollapsed(true); requestAnimationFrame(()=>locate('first'));
};
const openDetail = (name,html) => { $('#detail-title').textContent=name; $('#detail-content').innerHTML=html; if(!$('#detail').open) $('#detail').showModal(); };
const resourceDetail = (name) => {
 $('#resource-inspector').classList.toggle('dashboard-inspector',name==='自动化回填配置看板');
 if(name==='自动化回填配置看板') openInspector(name,dashboardMarkup());
 else if(name==='车主差评分析报告') openInspector(name,report());
 else if(name.includes('车系差评率')) openInspector(name,chart()+`<table class="detail-table"><thead><tr><th>车系</th><th>发言量</th><th>差评量</th><th>差评率</th></tr></thead><tbody>${series.map(([n,total,bad])=>`<tr><td>${n}</td><td>${total}</td><td>${bad}</td><td>${(bad/total*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`);
 else if(name==='差评主题构成') { openInspector(name,report()); const root=$('#inspector-body'); const frame=root.querySelector('.report-frame');frame.scrollTop=root.querySelector('.report section').offsetTop-frame.offsetTop; }
 else openInspector(name,'<p>当前截图未包含该资源的详情。</p><p class="dialog-note">此演示只还原提供的会话和图表，不虚构未提供的数据。</p>');
};
const componentEditor=document.createElement('div');componentEditor.id='component-editor';componentEditor.hidden=true;document.body.append(componentEditor);
const openComponentEditor=(id)=>{if(!dashboardWidgets[id])return;componentEditor.innerHTML=componentEditorMarkup(id);componentEditor.hidden=false;document.body.style.overflow='hidden';};
const closeComponentEditor=()=>{componentEditor.hidden=true;componentEditor.innerHTML='';document.body.style.overflow='';};
const popover = () => { const rect=$('#session-menu').getBoundingClientRect(); const el=$('#session-popover'); el.style.top=`${rect.bottom+8}px`;el.style.left=`${Math.min(rect.left,innerWidth-240)}px`;el.hidden=!el.hidden; };
const setProcessCollapsed = (collapsed) => {
 messages.classList.toggle('process-collapsed',collapsed);
 const toggle=$('#run-label');if(toggle)toggle.setAttribute('aria-expanded',String(!collapsed));
};
const setActiveToolGroup = (selector) => {
 messages.querySelectorAll('.tool-group').forEach(group=>group.open=false);
 if(selector){const group=messages.querySelector(selector);if(group)group.open=true;}
};
const replay = (text=initialQuestion) => {
 cancel(); messages.classList.remove('process-collapsed'); running=true; replayIndex=0; following=true; messages.innerHTML=question(text)+`<section class="block running" id="live"><div class="run-status">${icon('IntelligentAnalysisSelected')}<span id="live-status">正在分析评论…</span></div><p class="dialog-note">模拟回放 · 使用截图中的固定回答</p></section>`;
 prompt.value=''; send.disabled=false;send.classList.add('running');send.innerHTML=icon('JiusiStop');send.setAttribute('aria-label','停止生成');bottom();
 const live=$('#live');
 const steps=[
 ['读取评论与分析资源',()=>live.insertAdjacentHTML('beforeend','<details class="tool-group" open><summary><span class="tool-badge">◎</span>分析懂车帝评论</summary><div class="tool-rows"><div class="tool-row"><span class="dot"></span>读取车主评论，核对七类负面主题</div></div></details>')],
 ['生成差评分析报告',()=>{setActiveToolGroup();live.insertAdjacentHTML('beforeend','<p>按差评主题、车系和车主发言整理分析报告。</p>');}],
 ['核对关键图表',()=>{live.remove();messages.insertAdjacentHTML('beforeend',`<section class="block running" id="first">${stages[0][1]}</section>`);$('#run-label').textContent='正在核对 · 模拟执行';$('#report-one').hidden=true;const groups=$('#first').querySelectorAll('.tool-group');groups[1].hidden=true;groups[1].querySelectorAll('.tool-row')[1].hidden=true;setActiveToolGroup('#first .tool-group:first-of-type');}],
 ['修正颜色说明 · 首次失败',()=>{const groups=$('#first').querySelectorAll('.tool-group');groups[1].hidden=false;setActiveToolGroup('#first .tool-group:nth-of-type(2)');$('#run-label').textContent='更新资源 · 1 个失败';}],
 ['修正颜色说明 · 重试成功',()=>{const rows=$('#first').querySelectorAll('.tool-group')[1].querySelectorAll('.tool-row');rows[1].hidden=false;$('#report-one').hidden=false;$('#run-label').textContent='报告已更新 · 模拟执行';setActiveToolGroup();}],
 ['修复条形截断',()=>{messages.insertAdjacentHTML('beforeend',`<section class="block" id="second">${stages[1][1]}</section>`);$('#second').querySelectorAll('.resource-card').forEach(card=>card.hidden=true);setActiveToolGroup('#second .tool-group');}],
 ['整理最终回答',()=>{$('#second').querySelectorAll('.resource-card').forEach(card=>card.hidden=false);setActiveToolGroup();messages.insertAdjacentHTML('beforeend',`<section class="block" id="third">${stages[2][1]}</section>`);$('#first').classList.remove('running');$('#run-label').textContent='已完成 耗时 4m 1s';cancel();setProcessCollapsed(true);}]
 ];
 steps.forEach(([label,fn],index)=>schedule(()=>{replayIndex=index; if($('#live-status')) $('#live-status').textContent=label;fn();applyVariant();if(following)bottom();},900+index*1800));
};
const actions={
 start:()=>{conversation.scrollTop=0;}, first:()=>locate('first'), second:()=>locate('second'), third:()=>{locate('third');const frame=$('#report-two .report-frame');if(frame)frame.scrollTop=560;},
 replay:()=>replay(),restore:complete,new:()=>{cancel();messages.innerHTML='<section class="block"><h2>有什么需要分析的？</h2><p class="dialog-note">输入需求可播放懂车帝差评分析示例。</p></section>';prompt.value=initialQuestion;send.disabled=false;prompt.focus();},
 share:()=>openDetail('分享会话','<p>这是本地模拟会话，未连接 Test 分享服务。</p><button class="outline" style="width:auto" data-action="copy-link">复制本地演示地址</button>'),
 'copy-link':async()=>{try{await navigator.clipboard.writeText(location.href);toast('已复制本地演示地址');}catch{toast('复制失败，请复制浏览器地址');}},
 report:()=>resourceDetail('车主差评分析报告'),chart:()=>resourceDetail('车系差评率对比'),dashboard:()=>resourceDetail('自动化回填配置看板'),small:()=>$('#app').classList.toggle('small-window'),
 agent:()=>openDetail('创建Agent','<p>此入口仅作展示。当前演示不会创建或发布真实 Agent。</p>'),
 add:()=>openDetail('添加资源','<p>本地演示使用截图内固定资源，不上传或创建真实资源。</p>'),
 mention:()=>{prompt.value+='@';prompt.focus();send.disabled=false;toast('可在右侧资源列表查看资源');},
 skill:()=>openDetail('技能','<p>截图未提供技能列表，当前演示未模拟具体技能。</p>'),
 plan:()=>{const b=$('[data-action="plan"]');b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));},
 enhance:()=>{const b=$('[data-action="enhance"]');const active=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(active));b.querySelector('span').textContent=active?'开':'关';},
 model:()=>openDetail('Max','<p>此示例保留截图中的 Max 显示，不调用真实模型。</p>'),
 copy:async()=>{const div=document.createElement('div');div.innerHTML=finalAnswer;try{await navigator.clipboard.writeText(div.textContent);toast('已复制回答');}catch{toast('复制失败，请选中正文复制');}}
};
document.addEventListener('click',(event)=>{
 const editorClose=event.target.closest('[data-editor-close]');if(editorClose){closeComponentEditor();return;}
 const dashboardClose=event.target.closest('[data-dashboard-close]');if(dashboardClose){$('#inspector-close').click();return;}
 const dashboardEdit=event.target.closest('[data-dashboard-edit]');if(dashboardEdit){openComponentEditor(dashboardEdit.dataset.dashboardEdit);return;}
 const dashboardExpand=event.target.closest('[data-dashboard-expand]');if(dashboardExpand){if(dashboardExpand.dataset.dashboardExpand==='all')openComponentEditor('total');else openComponentEditor(dashboardExpand.dataset.dashboardExpand);return;}
 const dashboardAction=event.target.closest('[data-dashboard-action]');if(dashboardAction){toast(`${dashboardAction.dataset.dashboardAction} · 静态演示`);return;}
 const selectedWidget=event.target.closest('[data-widget]');if(selectedWidget){document.querySelectorAll('.db-widget.is-selected').forEach(widget=>{widget.classList.remove('is-selected');widget.setAttribute('aria-selected','false');});selectedWidget.classList.add('is-selected');selectedWidget.setAttribute('aria-selected','true');return;}
 const target=event.target.closest('button');
 if(target?.dataset.action){actions[target.dataset.action]?.();$('#session-popover').hidden=true;return;}
 if(target?.dataset.resource){resourceDetail(target.dataset.resource);return;}
 if(target?.dataset.rating){const rating=Number(target.dataset.rating);document.querySelectorAll('[data-rating]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.rating)<=rating));toast(`已记录 ${rating} 星评价（本地）`);return;}
 if(target?.id==='run-label'){setProcessCollapsed(!messages.classList.contains('process-collapsed'));return;}
 if(target?.id==='session-menu'){popover();return;}
 const header=event.target.closest('.card-header');if(header){const card=header.closest('.resource-card');const collapsed=card.classList.toggle('collapsed');const toggle=card.querySelector('.card-toggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'展开预览':'收起预览');return;}
 if(!event.target.closest('#session-popover')) $('#session-popover').hidden=true;
});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!componentEditor.hidden)closeComponentEditor();if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-widget]')){event.preventDefault();event.target.click();}});
$('#close-detail').onclick=()=>$('#detail').close();
$('#detail').addEventListener('click',(e)=>{if(e.target===$('#detail'))$('#detail').close();});
$('#composer').onsubmit=(event)=>{event.preventDefault();if(running){cancel();setActiveToolGroup();document.querySelectorAll('.running').forEach(e=>e.classList.remove('running'));if($('#live-status')) $('#live-status').textContent='已停止';if($('#run-label'))$('#run-label').textContent='已停止';toast('已停止模拟，可从会话菜单重新播放');return;}if(prompt.value.trim())replay(prompt.value.trim());};
prompt.addEventListener('input',()=>send.disabled=!running&&!prompt.value.trim());
prompt.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#composer').requestSubmit();}});
$('#jump-bottom').onclick=bottom;
conversation.addEventListener('scroll',()=>{following=conversation.scrollHeight-conversation.scrollTop-conversation.clientHeight<80;$('#jump-bottom').hidden=following;});
$('#resource-search').oninput=renderResources;$('#ai-only').onchange=renderResources;
document.addEventListener('change',(event)=>{if(event.target.closest('.report-filters')){toast('截图未提供筛选明细，保留原始统计，不模拟筛选结果');}});
new ResizeObserver(()=>{const width=$('#workspace').clientWidth;const ratio=Math.min(.92,Math.max(.52,.92-.24*(width-400)/1412));$('#workspace').style.setProperty('--gutter',`${Math.max(0,Math.round(width*(1-ratio)/2*.94))}px`);}).observe($('#workspace'));
renderResources();complete();initializeVariants({onChange:complete,onReplay:()=>replay()});
if(new URLSearchParams(location.search).get('view')==='dashboard')resourceDetail('自动化回填配置看板');
// 独立演示的可观测状态，用于核验回放而非连接生产运行时。
window.demoState=()=>({running,replayIndex,stages:stages.filter(([id])=>document.getElementById(id)).map(([id])=>id)});

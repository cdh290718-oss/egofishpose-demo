'use strict';
(() => {
 const data=window.STEPWISE_RESULTS,$=id=>document.getElementById(id);
 const variants=['S0_original','S1_reliability','S2_pose_keep','S3_local_mano'];
 const names={S0_original:'原流程',S1_reliability:'S1 · 观测可靠性',S2_pose_keep:'S2 · ＋姿态保持',S3_local_mano:'S3 · ＋局部MANO'};
 const stages={raw:'网络初始输出',rigid:'刚体调整后',pose:'姿态拟合后',final:'最终身体／融合'};
 const f=(n,d=2)=>n==null||!Number.isFinite(Number(n))?'未计算':Number(n).toFixed(d);
 const summary=v=>data.summary.find(r=>r.variant===v);
 const record=(v,id)=>data.records.find(r=>r.variant===v&&r.id===id);
 const mean=(v,stage,key)=>data.records.filter(r=>r.variant===v).reduce((n,r)=>n+r.stages[stage][key],0)/2;
 $('raw-mean').textContent=f(summary(variants[0]).raw_pa_mpjpe_mm);
 $('summary-cards').replaceChildren(...variants.map((v,i)=>{
  const card=document.createElement('article');const current=summary(v).final_pa_mpjpe_mm;
  const delta=i?current-summary(variants[i-1]).final_pa_mpjpe_mm:0;
  card.innerHTML=`<h3>${names[v]}</h3><p class="value">${f(current)} <span>mm</span></p><p>${i?`相对上一步 ${delta>0?'+':''}${f(delta)} mm`:'同一对最终PA-MPJPE基线'}</p>`;return card;
 }));
 $('metric-body').replaceChildren(...variants.map(v=>{
  const r=summary(v),tr=document.createElement('tr');
  const values=[names[v],...['pose','wrist','contour','final'].map(s=>f(r[s+'_pa_mpjpe_mm'],3)),f(record(v,'body10_left').stages.final.pa_mpjpe_mm,3),f(record(v,'body10_right').stages.final.pa_mpjpe_mm,3)];
  values.forEach((q,i)=>{const td=document.createElement('td');td.textContent=q;if(i===4)td.style.fontWeight='700';tr.append(td);});return tr;
 }));
 $('extra-body').replaceChildren(...variants.map(v=>{
  const tr=document.createElement('tr');[names[v],f(mean(v,'final','mpjpe_camera_mm')),f(mean(v,'final','gt2d_rmse_adapted_px')),f(summary(v).final_hand_rmse_px)+`（${summary(v).hand_metric_views}/2图）`,f(mean(v,'final','lower_body_pa_mm'))].forEach(q=>{const td=document.createElement('td');td.textContent=q;tr.append(td);});return tr;
 }));
 function view(){
  const id=$('camera-select').value,stage=$('stage-select').value,kind=$('kind-select').value;
  $('view-description').textContent=`${id} / ${stages[stage]} / ${kind==='mesh'?'实际输出网格＋官方二维标注':'预测骨架＋自动目标＋官方二维标注'} / 每张原分辨率872×872`;
  $('comparison-gallery').replaceChildren(...variants.map(v=>{
   const r=record(v,id),q=r.stages[stage],card=document.createElement('article');card.className='stage-card';
   const h=document.createElement('h4');h.textContent=names[v];
   const metric=document.createElement('div');metric.className='stage-card-metric';metric.innerHTML=`<span>PA ${f(q.pa_mpjpe_mm)} mm</span><span>GT2D ${f(q.gt2d_rmse_adapted_px,1)} px</span>`;
   const button=document.createElement('button');button.className='image-button';button.dataset.image=`assets/images/${v}_${id}_${stage}_${kind}.webp`;button.dataset.title=`${names[v]} / ${id} / ${stages[stage]}`;button.setAttribute('aria-label',`放大${button.dataset.title}`);
   const img=document.createElement('img');img.src=button.dataset.image;img.alt=button.dataset.title+'：绿色为官方二维标注';img.width=872;img.height=872;img.loading='lazy';button.append(img);
   const note=document.createElement('small');note.textContent=`原自动点 ${r.automatic_count} 个；残差 ${f(q.automatic_rmse_px,1)} px；非GT精度`+(r.hand_stages_skipped?'；无匹配手，后续手部阶段跳过':'');
   card.append(h,metric,button,note);return card;
  }));
  $('weight-body').replaceChildren(...Object.entries(record('S1_reliability',id).automatic_weights).map(([name,q])=>{
   const tr=document.createElement('tr');[name,f(q.score,3),f(q.initial_projection_distance_px,1),f(q.weight,5)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});return tr;
  }));
 }
 for(const id of ['camera-select','stage-select','kind-select'])$(id).addEventListener('change',view);
 function absoluteTable(){
  const key=$('absolute-select').value;
  $('absolute-unit').textContent=(key==='mpjpe_camera_mm'?'相机坐标 MPJPE / mm':'官方GT2D RMSE / px（适配后1280×720坐标）')+'；左右平均，未经PA';
  $('absolute-body').replaceChildren(...variants.map(v=>{
   const tr=document.createElement('tr');[names[v],...['raw','rigid','pose','wrist','contour','final'].map(stage=>f(mean(v,stage,key),2))].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});return tr;
  }));
 }
 $('absolute-select').addEventListener('change',absoluteTable);absoluteTable();
 const explanations=[
  '只改变Sapiens数据项的可靠性权重；原可行性门槛和活动关节范围仍保留。',
  '只在身体姿态阶段收紧到六个肩肘腕关节，并保持初始局部三维姿态；后续原中间流程仍可能改变结果。',
  '最后MANO只调整匹配侧肩肘腕，冻结整体刚体并保持输入姿态。此前阶段与S2完全相同。'
 ];
 $('conclusion-list').replaceChildren(...variants.slice(1).map((v,i)=>{
  const previous=summary(variants[i]),current=summary(v),poseDelta=current.pose_pa_mpjpe_mm-previous.pose_pa_mpjpe_mm,finalDelta=current.final_pa_mpjpe_mm-previous.final_pa_mpjpe_mm;
  const div=document.createElement('article');div.className='conclusion-item'+(finalDelta>0?' regression':'');
  const heading=document.createElement('h3');heading.textContent=`${names[v]}：最终PA${Math.abs(finalDelta)<1e-6?'误差基本不变':finalDelta>0?'误差增加':'误差下降'} ${f(Math.abs(finalDelta))} mm`;
  const p=document.createElement('p');p.textContent=`${explanations[i]} 与上一步相比，姿态阶段变化 ${poseDelta>0?'+':''}${f(poseDelta)} mm，最终PA变化 ${finalDelta>0?'+':''}${f(finalDelta)} mm。`;
  const camera=document.createElement('p');camera.textContent='最终逐视图变化：'+['body10_left','body10_right'].map(id=>{const d=record(v,id).stages.final.pa_mpjpe_mm-record(variants[i],id).stages.final.pa_mpjpe_mm;return `${id.endsWith('left')?'左图':'右图'} ${d>0?'+':''}${f(d)} mm`;}).join('；')+'。';
  div.append(heading,p,camera);
  const detail=document.createElement('p');detail.textContent=`实际执行后续手部引导 ${summary(v).hand_guidance_views}/2 张。`;
  if(v==='S3_local_mano'){
   const moved=data.records.filter(r=>r.variant===v&&!r.hand_stages_skipped&&r.mano_pose_increment_max_rad>1e-6).length;
   detail.textContent+=`其中产生可测局部姿态更新 ${moved} 张；保留输入表示发生回退，不能视为新的姿态校正；回退是否更好仍需与S2最终误差比较。`;
  }
  div.append(detail);return div;
 }));
 const runs=document.createElement('p');runs.textContent='原流程复用此前输出；S1与S2各对两张图重新运行优化，S3复用S2此前阶段。以下耗时反映不同复用范围，不能直接当作算法速度排名。';$('run-details').append(runs);
 for(const r of data.runtime){const p=document.createElement('p');p.textContent=`${r.variant} / ${r.id}：${f(r.elapsed_seconds/60,1)} 分钟，退出码 ${r.returncode}。`;$('run-details').append(p);}
 const notes=document.createElement('p');notes.textContent='原始代码、原网络缓存与原结果哈希保持。S2的非手臂局部关节、S3的整体刚体与非手臂关节均完成逐参数核验。接受／回退沿用不含GT的规则。';$('run-details').append(notes);
 const dialog=$('image-dialog');let previousFocus;
 document.addEventListener('click',event=>{const button=event.target.closest('[data-image]');if(!button)return;previousFocus=button;$('image-title').textContent=button.dataset.title;$('dialog-image').src=button.dataset.image;$('dialog-image').alt=button.dataset.title;$('dialog-download').href=button.dataset.image;document.querySelector('.dialog-viewport').classList.remove('native');dialog.showModal();document.body.style.overflow='hidden';});
 $('close-image').addEventListener('click',()=>dialog.close());$('native-image').addEventListener('click',()=>document.querySelector('.dialog-viewport').classList.add('native'));$('fit-image').addEventListener('click',()=>document.querySelector('.dialog-viewport').classList.remove('native'));
 dialog.addEventListener('close',()=>{if(dialog.open)return;document.body.style.overflow='';$('dialog-image').removeAttribute('src');previousFocus?.focus();});
 view();
})();

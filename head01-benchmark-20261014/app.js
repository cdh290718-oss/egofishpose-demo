'use strict';
(() => {
  const data = window.EXPERIMENT_RESULTS;
  const $ = id => document.getElementById(id);
  const stageNames = {raw:'网络初始输出',rigid:'刚体调整后',pose:'姿态拟合后',final:'最终身体'};
  const stageColors = {raw:'#62dfef',rigid:'#79afff',pose:'#ffbd46',final:'#eb7fec'};
  const jointNames = {Neck:'颈部',R_Shoulder:'右肩',R_Elbow:'右肘',R_Wrist:'右腕',L_Shoulder:'左肩',L_Elbow:'左肘',L_Wrist:'左腕',R_Hip:'右髋',L_Hip:'左髋',R_Knee:'右膝',L_Knee:'左膝',R_Ankle:'右踝',L_Ankle:'左踝'};
  const format = (value, digits=2) => Number(value).toFixed(digits);
  const state = {branch:'body',pair:1,reference:'same'};

  function pairOptions() {
    $('pair-select').replaceChildren(...Array.from({length:10},(_,i) => {
      const option=document.createElement('option');option.value=i+1;option.textContent=`样本 ${String(i+1).padStart(2,'0')}`;return option;
    }));
  }
  function updatePair() {
    const pair=data.pairs.find(r => r.branch===state.branch && Number(r.pair)===state.pair);
    const number=String(state.pair).padStart(2,'0');const name=state.branch==='body'?'身体':'手部';
    $('pair-select').value=state.pair;
    $('sample-title').textContent=`${name}样本 ${number}`;
    $('sample-dataset').textContent=state.branch==='body'?'UNREALEGO-RW / S9 / GT15':'DEXYCB / S0 TEST / 21 JOINTS + 778 VERTICES';
    $('sample-sequence').textContent=pair.sequence;
    const src=`assets/samples/${state.branch}_${number}.webp`;
    $('sample-image').src=src;$('sample-image').alt=`${name}第${state.pair}对固定样本：左右投影与PA对齐后的三维比较`;
    $('sample-image-button').dataset.image=src;$('sample-image-button').dataset.title=`${name}样本${number} · 左右投影与三维对齐图`;
    $('pair-metric').textContent=`双目平均 PA-MPJPE ${format(pair.pa_mpjpe_pair_mm)} mm`+(state.branch==='hand'?` · PA-MPVPE ${format(pair.pa_mpvpe_pair_mm)} mm`:'');
    $('prev-pair').disabled=state.pair===1;$('next-pair').disabled=state.pair===10;
    $('sheet-download').href=`assets/${state.branch}_10_contact_sheet.jpg`;
    $('benchmark-panel').setAttribute('aria-labelledby',`${state.branch}-tab`);
    $('branch-protocol').textContent=state.branch==='body'
      ?'身体：S9的十段预选测试序列中点；原网络权重、原拟合，采用全图／无检测器输入。GT15不含Head，脚尖沿用论文heel proxy。10对不能代表完整测试集。'
      :'手部：DexYCB S0 test，原WiLoR权重进行全新推理；官方二维点确定手框，裁剪倍率2.0。此评测评价手部分支，不代表接缝后的完整网格精度。';
  }
  document.querySelectorAll('[data-branch]').forEach(button => button.addEventListener('click',() => {
    state.branch=button.dataset.branch;document.querySelectorAll('[data-branch]').forEach(b => b.setAttribute('aria-selected',String(b===button)));updatePair();
  }));
  $('pair-select').addEventListener('change',e => {state.pair=Number(e.target.value);updatePair();});
  $('prev-pair').addEventListener('click',() => {state.pair=Math.max(1,state.pair-1);updatePair();});
  $('next-pair').addEventListener('click',() => {state.pair=Math.min(10,state.pair+1);updatePair();});

  function updateComparison() {
    const same=state.reference==='same';
    const headers=['指标（mm，越低越好）','本次新推理 · 10对',same?'论文同10对 · 单目平均':'论文全量 · 单目平均',same?'论文同10对 · 等权融合':'论文全量 · 等权融合',same?'论文同10对 · VUBTF':'论文全量 · VUBTF'];
    if (!same)headers.push('论文全量 · VUBTF＋时序');
    $('comparison-header').replaceChildren(...headers.map(name => {const th=document.createElement('th');th.scope='col';th.textContent=name;return th;}));
    const rows=same?data.benchmark.same_sample_reference:data.benchmark.published_reference;
    $('comparison-body').replaceChildren(...rows.map((r,i) => {
      const labels=['身体 PA-MPJPE / GT15','手部 PA-MPJPE / 21点','手部 PA-MPVPE / 778顶点'];
      const values=same?[r.our_fresh_10_pair_mean_mm,r.paper_cached_same10_mono_mm,r.paper_cached_same10_equal_mm,r.paper_cached_same10_vubtf_mm]
        :[r.our_10_pair_mean_mm,r.paper_full_test_mono_avg_mm,r.paper_full_test_equal_fusion_mm,r.paper_full_test_vubtf_mm,r.paper_full_test_vubtf_temporal_mm];
      const tr=document.createElement('tr');[labels[i],...values.map(v => v==null?'未报告':format(v,4))].forEach(value => {const td=document.createElement('td');td.textContent=value;tr.append(td);});return tr;
    }));
    $('comparison-caption').textContent=same?'单位mm，越低越好。论文同样10对来自历史逐样本缓存，本方法为本次新推理。'
      :'本次仅10对；论文为完整测试集（身体24,012对、手部275,688个配对实例）。样本范围不同，仅供数值参考。';
    $('reference-note').textContent=same?'论文参考来自已核对全量均值的历史逐样本缓存，未重跑论文模型。相同样本不等于相同算法条件；论文还包含模型微调、形状聚合和双目融合。'
      :'不能把本次10对直接当作论文全测试集排名，也不能据此宣称总体优于或劣于论文。手部时序PA-MPVPE未报告；本次没有新增双目融合或时序算法。';
  }
  document.querySelectorAll('[data-reference]').forEach(button => button.addEventListener('click',() => {
    state.reference=button.dataset.reference;document.querySelectorAll('[data-reference]').forEach(b => b.setAttribute('aria-selected',String(b===button)));updateComparison();
  }));

  const stages=['raw','rigid','pose','final'];
  $('stage-summary').replaceChildren(...stages.map((stage,i) => {
    const div=document.createElement('div');const mean=data.diagnosis.summary[stage].mean_pa_mpjpe_mm;
    const previous=i?data.diagnosis.summary[stages[i-1]].mean_pa_mpjpe_mm:mean;
    div.innerHTML=`<p class="stage-label">${stageNames[stage]}</p><p class="stage-value">${format(mean)} <span>mm</span></p><p class="stage-delta">${i===0?'PA-MPJPE / GT15':i===1?'PA基本不变；整体刚体变化被消除':`比上一阶段增加 ${format(mean-previous,1)} mm`}</p>`;return div;
  }));
  $('stage-select').replaceChildren(...data.diagnosis.records.map(record => {
    const option=document.createElement('option');option.value=record.id;option.textContent=`${record.id} · ${record.camera==='left'?'左相机':'右相机'}`;return option;
  }));
  function updateStage() {
    const record=data.diagnosis.records.find(r => r.id===$('stage-select').value);
    $('stage-meta').textContent=`${record.sequence} · ${record.automatic_count}个自动目标 · ${record.hand_skipped?'未匹配到手，最终沿用身体拟合':'已执行原手部相关身体处理'}`;
    $('stage-gallery').replaceChildren(...stages.map(stage => {
      const q=record.stages[stage];const card=document.createElement('article');card.className='stage-card';
      const heading=document.createElement('h4');heading.textContent=stageNames[stage];heading.style.color=stageColors[stage];
      const label=document.createElement('div');label.className='stage-card-metric';
      const pa=document.createElement('span');pa.textContent=`PA ${format(q.pa_mpjpe_mm)} mm`;
      const auto=document.createElement('span');auto.textContent=`自动点 ${format(q.auto_target_rmse_px,1)} px`;label.append(pa,auto);
      const button=document.createElement('button');button.className='image-button';button.dataset.image=`assets/stages/${record.id}_${stage}.webp`;button.dataset.title=`${record.id} · ${stageNames[stage]} · 原分辨率872×872`;button.setAttribute('aria-label',`放大${record.id}${stageNames[stage]}投影`);
      const img=document.createElement('img');img.src=button.dataset.image;img.alt=`${record.id}${stageNames[stage]}：绿色官方标注、红色自动目标、彩色预测骨架`;img.width=872;img.height=872;img.loading='lazy';button.append(img);card.append(heading,label,button);return card;
    }));
    $('target-body').replaceChildren(...record.automatic_vs_gt.map(q => {
      const tr=document.createElement('tr');const values=[jointNames[q.name]||q.name,format(q.confidence,3),`${format(q.error_adapted_px,1)} px`];
      values.forEach((value,i) => {const td=document.createElement('td');td.textContent=value;if(i===2&&q.error_adapted_px>75)td.className='high-error';tr.append(td);});return tr;
    }));
  }
  $('stage-select').addEventListener('change',updateStage);
  const handStages=[['pose','身体姿态拟合'],['wrist_final','腕部处理'],['contour_final','轮廓处理'],['final','MANO身体引导／最终身体']];
  $('hand-stage-body').replaceChildren(...handStages.map(([stage,name]) => {
    const tr=document.createElement('tr');[name,format(data.diagnosis.matched_hand13_means_mm[stage],4)].forEach(v => {const td=document.createElement('td');td.textContent=v;tr.append(td);});return tr;
  }));

  let previousFocus=null;const dialog=$('image-dialog');
  document.addEventListener('click',event => {
    const button=event.target.closest('[data-image]');if(!button)return;
    previousFocus=button;$('image-title').textContent=button.dataset.title||'结果图';
    $('dialog-image').src=button.dataset.image;$('dialog-image').alt=button.dataset.title||'放大结果图';
    $('dialog-download').href=button.dataset.image;
    document.querySelector('.dialog-viewport').classList.remove('native');dialog.showModal();document.body.style.overflow='hidden';
  });
  $('close-image').addEventListener('click',() => dialog.close());
  $('native-image').addEventListener('click',() => document.querySelector('.dialog-viewport').classList.add('native'));
  $('fit-image').addEventListener('click',() => document.querySelector('.dialog-viewport').classList.remove('native'));
  dialog.addEventListener('click',event => {if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
  dialog.addEventListener('close',() => {if(dialog.open)return;document.body.style.overflow='';$('dialog-image').removeAttribute('src');previousFocus?.focus();});
  document.querySelectorAll('[role=tablist]').forEach(tablist => tablist.addEventListener('keydown',event => {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=Array.from(tablist.querySelectorAll('[role=tab]'));const current=tabs.indexOf(document.activeElement);if(current<0)return;
    event.preventDefault();let next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();tabs[next].click();
  }));
  pairOptions();updatePair();updateComparison();updateStage();
})();

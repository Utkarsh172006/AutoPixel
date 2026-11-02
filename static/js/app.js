(() => {
  const $ = id => document.getElementById(id);
  const cy = cytoscape({container:$('cy'),elements:[],style:[
    {selector:'node',style:{'shape':'rectangle','background-color':'#160b35','border-width':3,'border-color':'#6b6bff','label':'data(label)','color':'#ffffff','font-family':'VT323, monospace','font-size':20,'width':58,'height':58,'text-valign':'center','text-halign':'center'}},
    {selector:'node[?accepting]',style:{'border-width':7,'border-style':'double','border-color':'#39ff88'}},
    {selector:'node[?initial]',style:{'background-color':'#5a1a7a','border-color':'#ff2bd6'}},
    {selector:'edge',style:{'width':3,'line-color':'#ff2bd6','target-arrow-color':'#39ff88','target-arrow-shape':'triangle','curve-style':'bezier','label':'data(label)','color':'#fff35c','font-family':'VT323, monospace','font-size':19,'text-background-color':'#000','text-background-opacity':1,'text-background-padding':'3px','text-rotation':'autorotate'}},
    {selector:'node.sim-active',style:{'background-color':'#fff35c','color':'#05030f','border-color':'#ff2bd6','border-width':6}},
    {selector:':selected',style:{'overlay-color':'#39ff88','overlay-opacity':.25,'overlay-padding':9}}
  ],layout:{name:'preset'}});
  let tool='select', pending=null, nextState=0, nextEdge=0;
  let playTimer=null;
  function stopPlayback(){if(playTimer!==null){clearInterval(playTimer);playTimer=null;}const b=$('playBtn');if(b)b.textContent='▶ Auto play';}
  const status = message => $('status').textContent=message;
  function updateStats(){ $('stats').textContent=`${cy.nodes().length} states · ${cy.edges().length} transitions`; }
  function setTool(value){tool=value;pending=null;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===value));status(value==='edge'?'Click a source state, then a target state.':`Tool: ${value}`);}
  document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  function addState(position){const id=`q${nextState++}`;cy.add({group:'nodes',data:{id,label:id,initial:cy.nodes().length===0,accepting:false},position});updateStats();status(`Added ${id}.`);}
  cy.on('tap',event=>{
    if(event.target===cy){if(tool==='state')addState(event.position);else if(tool==='edge')pending=null;return;}
    const ele=event.target;
    if(tool==='delete'){ele.remove();updateStats();renderProperties();status('Element deleted.');return;}
    if(tool==='edge'&&ele.isNode()){
      if(!pending){pending=ele.id();status(`Source ${pending} selected. Click target state.`);}
      else {const label=prompt('Transition symbol(s), comma-separated (ε for epsilon):','a');if(label!==null&&label.trim()){cy.add({group:'edges',data:{id:`e${nextEdge++}`,source:pending,target:ele.id(),label:label.trim()}});updateStats();status('Transition added.');}pending=null;}
      return;
    }
    if(tool==='select')renderProperties(ele.isNode()?ele:null);
  });
  cy.on('dbltap','node',event=>renderProperties(event.target));
  function renderProperties(node){const panel=$('properties');panel.replaceChildren();if(!node||node.removed()){panel.textContent='Select a state to edit it.';return;}
    const makeField=(name,value,type,onchange)=>{const wrapper=document.createElement('div');wrapper.className='field';const label=document.createElement('label');label.textContent=name;const input=document.createElement('input');input.type=type;if(type==='checkbox')input.checked=value;else input.value=value;input.addEventListener('change',()=>onchange(type==='checkbox'?input.checked:input.value));wrapper.append(label,input);panel.append(wrapper);};
    makeField('State name',node.data('label'),'text',v=>{if(v.trim())node.data('label',v.trim());});
    makeField('Initial state',!!node.data('initial'),'checkbox',v=>{if(v)cy.nodes().data('initial',false);node.data('initial',v);renderProperties(node);});
    makeField('Accepting state',!!node.data('accepting'),'checkbox',v=>node.data('accepting',v));
  }
  function serialize(){return {type:$('type').value,states:cy.nodes().map(n=>({...n.data(),position:n.position()})),transitions:cy.edges().map(e=>({...e.data()}))};}
  $('regexBtn').addEventListener('click',async()=>{
    try{
      const response=await fetch('/api/regex-to-nfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({regex:$('regexInput').value})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Regex conversion failed.');
      const nodes=result.states.map(n=>({group:'nodes',data:{id:n.id,label:n.label,initial:n.initial,accepting:n.accepting}}));
      const edges=result.transitions.map(e=>({group:'edges',data:e}));
      cy.elements().remove();cy.add([...nodes,...edges]);$('type').value='NFA';
      const layout=cy.layout({name:'breadthfirst',directed:true,roots:cy.nodes('[initial]'),spacingFactor:1.25,padding:45,animate:false});layout.run();
      nextState=result.states.length;nextEdge=result.transitions.length;updateStats();renderProperties();setTool('select');
      $('regexResult').className='sim-result accept';$('regexResult').textContent=`Generated ε-NFA: ${result.states.length} states, ${result.transitions.length} transitions.`;
      status('Regex converted. Use Run simulation to test a string.');
    }catch(err){$('regexResult').className='sim-result reject';$('regexResult').textContent=err.message;status('Regex conversion failed.');}
  });
  let savedNfa=null;
  $('convertDfaBtn').addEventListener('click',async()=>{
    try {
      const original=serialize();
      const response=await fetch('/api/nfa-to-dfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(original)});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Conversion failed.');
      savedNfa=original;
      cy.elements().remove();
      cy.add([...result.states.map(s=>({group:'nodes',data:s})),...result.transitions.map(t=>({group:'edges',data:t}))]);
      $('type').value='DFA';
      cy.layout({name:'breadthfirst',directed:true,roots:cy.nodes('[initial]'),padding:45,spacingFactor:1.3,animate:false}).run();
      nextState=0;nextEdge=result.transitions.length;updateStats();renderProperties();setTool('select');
      $('restoreNfaBtn').disabled=false;
      $('conversionResult').className='sim-result accept';
      $('conversionResult').textContent=`Converted to ${result.states.length} DFA states. Alphabet: ${result.alphabet.join(', ')||'∅'}. Original NFA saved for restoration.`;
      const table=$('conversionTable');table.replaceChildren();
      const heading=document.createElement('h4');heading.textContent='Subset construction table';table.append(heading);
      const grid=document.createElement('table');const head=document.createElement('tr');
      ['DFA state','NFA subset',...result.alphabet].forEach(x=>{const th=document.createElement('th');th.textContent=x;head.append(th);});grid.append(head);
      result.table.forEach(row=>{const tr=document.createElement('tr');[row.state+(row.accepting?' ✓':''),'{'+(row.subset.join(', ')||'∅')+'}',...result.alphabet.map(a=>row.moves[a])].forEach(x=>{const td=document.createElement('td');td.textContent=x;tr.append(td);});grid.append(tr);});table.append(grid);
      status('Subset construction complete. Restore NFA to compare.');
    }catch(err){$('conversionResult').className='sim-result reject';$('conversionResult').textContent=err.message;}
  });
  $('restoreNfaBtn').addEventListener('click',()=>{
    if(!savedNfa)return;
    const obj=savedNfa;
    cy.elements().remove();
    cy.add([...obj.states.map(s=>({group:'nodes',data:s,position:s.position})),...obj.transitions.map(t=>({group:'edges',data:t}))]);
    $('type').value='NFA';nextState=Math.max(0,...obj.states.map(s=>/^q\d+$/.test(s.id)?Number(s.id.slice(1))+1:0));nextEdge=Math.max(0,...obj.transitions.map(t=>/^e\d+$/.test(t.id)?Number(t.id.slice(1))+1:0));
    cy.fit(undefined,60);updateStats();renderProperties();savedNfa=null;$('restoreNfaBtn').disabled=true;
    $('conversionResult').className='sim-result';$('conversionResult').textContent='Original NFA restored.';status('Original NFA restored.');
  });
  $('saveBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(serialize(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='automaton.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Automaton exported.');});
  $('loadBtn').addEventListener('click',()=>$('fileInput').click());
  $('fileInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!Array.isArray(obj.states)||!Array.isArray(obj.transitions))throw Error('Missing states or transitions.');const ids=new Set();const nodes=obj.states.map(s=>{if(typeof s.id!=='string'||ids.has(s.id))throw Error('Invalid or duplicate state ID.');ids.add(s.id);return {group:'nodes',data:{id:s.id,label:String(s.label||s.id),initial:!!s.initial,accepting:!!s.accepting},position:{x:Number(s.position?.x)||100,y:Number(s.position?.y)||100}};});const edges=obj.transitions.map(t=>{if(!ids.has(t.source)||!ids.has(t.target))throw Error('Transition references unknown state.');return {group:'edges',data:{id:String(t.id),source:t.source,target:t.target,label:String(t.label||'')}};});cy.elements().remove();cy.add([...nodes,...edges]);$('type').value=obj.type==='NFA'?'NFA':'DFA';nextState=Math.max(0,...obj.states.map(s=>/^q\d+$/.test(s.id)?Number(s.id.slice(1))+1:0));nextEdge=Math.max(0,...obj.transitions.map(t=>/^e\d+$/.test(t.id)?Number(t.id.slice(1))+1:0));cy.fit(undefined,70);renderProperties();updateStats();status('Automaton imported.');}catch(err){status(`Import failed: ${err.message}`);}finally{e.target.value='';}});
  $('validateBtn').addEventListener('click',async()=>{try{const response=await fetch('/api/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(serialize())});const result=await response.json();status(result.valid?'Structure valid (basic checks).':result.errors.join(' | '));}catch(err){status(`Validation failed: ${err.message}`);}});
  $('fitBtn').addEventListener('click',()=>cy.fit(undefined,60));
  $('clearBtn').addEventListener('click',()=>{if(confirm('Clear the entire automaton?')){cy.elements().remove();nextState=0;nextEdge=0;renderProperties();updateStats();status('Canvas cleared.');}});
  let simulation=null, currentStep=0;
  function showStep(){
    cy.nodes().removeClass('sim-active');
    if(!simulation)return;
    const record=simulation.trace[currentStep];
    record.states.forEach(id=>cy.getElementById(id).addClass('sim-active'));
    const finished=currentStep===simulation.trace.length-1;
    const result=$('simResult');
    result.className='sim-result'+(finished?(simulation.accepted?' accept':' reject'):'');
    result.textContent=`Step ${currentStep}/${simulation.input.length} · ${record.symbol===null?'Start / ε-closure':'Read '+record.symbol} · Active: ${record.states.join(', ')||'∅'}${finished?' · '+(simulation.accepted?'ACCEPTED ✓':'REJECTED ✗'):''}`;
    const trace=$('trace');trace.replaceChildren();
    simulation.trace.forEach((item,i)=>{const div=document.createElement('div');div.className='trace-line'+(i===currentStep?' current':'');div.textContent=`${i}. ${item.symbol===null?'Start':item.symbol} → {${item.states.join(', ')||'∅'}}`;div.addEventListener('click',()=>{currentStep=i;showStep();});trace.append(div);});
    $('prevBtn').disabled=currentStep===0;
    $('nextBtn').disabled=finished;
    $('playBtn').disabled=finished;
    if(finished)stopPlayback();
  }
  $('runBtn').addEventListener('click',async()=>{
    stopPlayback();
    try{
      const response=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...serialize(),input:$('inputString').value})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Simulation failed.');
      simulation=result;currentStep=0;showStep();status('Simulation ready. Use Next to advance through input symbols.');
    }catch(err){simulation=null;cy.nodes().removeClass('sim-active');$('simResult').className='sim-result reject';$('simResult').textContent=err.message;$('trace').replaceChildren();status('Simulation failed.');}
  });
  $('nextBtn').addEventListener('click',()=>{if(simulation&&currentStep<simulation.trace.length-1){currentStep++;showStep();}});
  $('prevBtn').addEventListener('click',()=>{if(simulation&&currentStep>0){currentStep--;showStep();}});
  $('resetBtn').addEventListener('click',()=>{stopPlayback();if(simulation){currentStep=0;showStep();}});
  const oldSetTool=setTool;
  cy.on('add remove data',()=>{stopPlayback();simulation=null;cy.nodes().removeClass('sim-active');$('simResult').className='sim-result';$('simResult').textContent='Diagram changed. Run simulation again.';$('trace').replaceChildren();});
  $('type').addEventListener('change',()=>{stopPlayback();simulation=null;cy.nodes().removeClass('sim-active');$('simResult').textContent='Machine type changed. Run simulation again.';$('trace').replaceChildren();});

  // Phase 5 playback and examples.
  function startPlayback(){
    if(!simulation){status('Run simulation before starting playback.');return;}
    if(playTimer!==null){stopPlayback();return;}
    if(currentStep>=simulation.trace.length-1){currentStep=0;showStep();}
    $('playBtn').textContent='❚❚ Pause';
    playTimer=setInterval(()=>{
      if(!simulation||currentStep>=simulation.trace.length-1){stopPlayback();return;}
      currentStep++;showStep();
    },Number($('speedSelect').value));
  }
  $('playBtn').addEventListener('click',startPlayback);
  $('speedSelect').addEventListener('change',()=>{if(playTimer!==null){stopPlayback();startPlayback();}});
  $('zoomInBtn').addEventListener('click',()=>cy.zoom({level:Math.min(cy.maxZoom(),cy.zoom()*1.2),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}));
  $('zoomOutBtn').addEventListener('click',()=>cy.zoom({level:Math.max(cy.minZoom(),cy.zoom()/1.2),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}));
  $('centerBtn').addEventListener('click',()=>cy.fit(undefined,60));
  const examples={
    'ends-a':{type:'DFA',states:[{id:'q0',initial:true,accepting:false},{id:'q1',initial:false,accepting:true}],transitions:[['q0','q0','b'],['q0','q1','a'],['q1','q1','a'],['q1','q0','b']]},
    'even-ones':{type:'DFA',states:[{id:'q0',initial:true,accepting:true},{id:'q1',initial:false,accepting:false}],transitions:[['q0','q0','0'],['q0','q1','1'],['q1','q0','1'],['q1','q1','0']]},
    'epsilon':{type:'NFA',states:[{id:'q0',initial:true,accepting:false},{id:'q1',initial:false,accepting:true}],transitions:[['q0','q1','ε'],['q1','q1','a']]}
  };
  function loadExample(key){
    const obj=examples[key];if(!obj)return;
    stopPlayback();savedNfa=null;$('restoreNfaBtn').disabled=true;
    cy.elements().remove();
    cy.add([...obj.states.map(n=>({group:'nodes',data:{...n,label:n.id}})),...obj.transitions.map((t,i)=>({group:'edges',data:{id:'e'+i,source:t[0],target:t[1],label:t[2]}}))]);
    $('type').value=obj.type;
    cy.layout({name:'circle',padding:80,animate:false}).run();
    nextState=obj.states.length;nextEdge=obj.transitions.length;
    $('conversionTable').replaceChildren();$('conversionResult').textContent='Conversion results appear here.';
    updateStats();renderProperties();setTool('select');cy.fit(undefined,75);
    status('Example loaded. Enter a string and run simulation.');
  }
  $('loadExampleBtn').addEventListener('click',()=>loadExample($('exampleSelect').value));
  document.addEventListener('keydown',e=>{
    const target=e.target;
    if(target.closest('input,textarea,select')||target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;
    const key=e.key.toLowerCase();
    if(key==='v')setTool('select');
    else if(key==='s')setTool('state');
    else if(key==='t')setTool('edge');
    else if(key==='delete'||key==='backspace'){
      if(cy.$(':selected').length){cy.$(':selected').remove();updateStats();renderProperties();status('Selection deleted.');}
    }else if(e.code==='Space'){
      if(target.closest('button'))return;e.preventDefault();if(simulation&&currentStep<simulation.trace.length-1){stopPlayback();currentStep++;showStep();}
    }
  });
  // Ensure playback never survives a new editor action.
  ['clearBtn','loadBtn','regexBtn','convertDfaBtn','restoreNfaBtn'].forEach(id=>$(id).addEventListener('click',stopPlayback));

  cy.add([{group:'nodes',data:{id:'q0',label:'q0',initial:true,accepting:false},position:{x:180,y:180}},{group:'nodes',data:{id:'q1',label:'q1',initial:false,accepting:true},position:{x:420,y:180}},{group:'edges',data:{id:'e0',source:'q0',target:'q1',label:'a'}}]);nextState=2;nextEdge=1;updateStats();

  // ===== Pixel Quest: missions, XP, hearts =====
  const missions=[
    {id:'ends-a',t:'1-1 Ends in a',type:'DFA',d:'DFA over {a,b} accepting strings that END with a.'},
    {id:'contains-ab',t:'1-2 Contains ab',type:'DFA',d:'DFA over {a,b} accepting strings containing "ab". Use at most 3 states!'},
    {id:'even-ones',t:'1-3 Even 1s',type:'DFA',d:'DFA over {0,1} accepting strings with an EVEN number of 1s (empty string counts).'},
    {id:'no-aa',t:'2-1 No aa',type:'DFA',d:'DFA over {a,b} accepting strings with NO two consecutive a. Hint: you need a trap state.'},
    {id:'ends-abb',t:'3-1 NFA ends abb',type:'NFA',d:'NFA over {a,b} accepting strings that end with "abb".'},
    {id:'a-then-b',t:'3-2 a*b*',type:'NFA',d:'NFA accepting any number of a followed by any number of b. Try ε-transitions.'},
    {id:'boss',t:'BOSS (ab)* or a*',type:'NFA',d:'NFA accepting (ab)* OR a*. Use ε to branch from the start.'}
  ];
  let game={xp:0,hearts:3,cleared:[]};
  try{Object.assign(game,JSON.parse(localStorage.getItem('automataQuest')||'{}'));}catch(e){}
  const saveGame=()=>{try{localStorage.setItem('automataQuest',JSON.stringify(game));}catch(e){}};
  function hud(){$('hudXp').textContent='XP '+game.xp;$('hudLv').textContent='LV '+(Math.floor(game.xp/200)+1);$('hudHearts').textContent='♥'.repeat(game.hearts)+'♡'.repeat(3-game.hearts);
    [...$('missionSelect').options].forEach((o,i)=>o.textContent=(game.cleared.includes(missions[i].id)?'★ ':'')+missions[i].t);
    [...$('missionGrid').children].forEach((b,i)=>{b.classList.toggle('cleared',game.cleared.includes(missions[i].id));b.classList.toggle('current',i===$('missionSelect').selectedIndex);});}
  function startMission(){
    const m=missions[$('missionSelect').selectedIndex];stopPlayback();savedNfa=null;$('restoreNfaBtn').disabled=true;
    cy.elements().remove();cy.add({group:'nodes',data:{id:'q0',label:'q0',initial:true,accepting:false},position:{x:150,y:180}});
    $('type').value=m.type;nextState=1;nextEdge=0;updateStats();renderProperties();setTool('select');cy.fit(undefined,120);
    $('missionText').textContent=m.t+' — '+m.d;hud();$('missionResult').className='sim-result';$('missionResult').textContent='Build the machine, then submit.';status('Mission: '+m.t);
  }
  missions.forEach((m,i)=>{const o=document.createElement('option');o.value=m.id;$('missionSelect').append(o);
    const b=document.createElement('button');b.textContent=m.id==='boss'?'BOSS':'Mission '+(i+1);b.title=m.t;b.addEventListener('click',()=>{$('missionSelect').selectedIndex=i;startMission();});$('missionGrid').append(b);});
  $('missionSelect').addEventListener('change',startMission);
  $('checkBtn').addEventListener('click',async()=>{
    const m=missions[$('missionSelect').selectedIndex],box=$('missionResult');
    try{
      const response=await fetch('/api/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...serialize(),mission:m.id})});
      const r=await response.json();if(!response.ok)throw Error(r.error||'Check failed.');
      if(r.correct){const first=!game.cleared.includes(m.id);if(first){game.cleared.push(m.id);game.xp+=100;}game.hearts=3;saveGame();hud();
        box.className='sim-result accept';box.textContent=r.message+(first?' +100 XP ★':' (already cleared)');}
      else{game.hearts--;let extra='';if(game.hearts<=0){game.hearts=3;extra=' Out of hearts - respawned with 3!';}saveGame();hud();
        if(typeof r.counterexample==='string')$('inputString').value=r.counterexample;
        box.className='sim-result reject';box.textContent=r.message+extra+(typeof r.counterexample==='string'?' Loaded into the simulator - press Run.':'');}
    }catch(err){box.className='sim-result reject';box.textContent=err.message;}
  });
  $('startBtn').addEventListener('click',()=>{$('title').classList.add('hide');});

  // Tabbed sidebar + canvas toolbar (tools live above the canvas, not in the sidebar)
  (()=>{
    const aside=document.querySelector('aside'),order=[];let cur=null;
    [...aside.children].forEach(el=>{if(el.tagName==='H3'){cur={title:el.textContent.trim(),h:el,els:[]};order.push(cur);}else if(cur)cur.els.push(el);});
    const names=['Missions','Build','Convert','Run'],panes={},tabs=document.createElement('div');
    tabs.id='tabs';tabs.setAttribute('role','tablist');
    const show=n=>{names.forEach(k=>{panes[k].hidden=k!==n;});[...tabs.children].forEach(t=>{t.classList.toggle('active',t.textContent===n);t.setAttribute('aria-selected',t.textContent===n);});};
    names.forEach(n=>{const p=document.createElement('div');p.className='pane';panes[n]=p;const t=document.createElement('button');t.textContent=n;t.setAttribute('role','tab');t.addEventListener('click',()=>show(n));tabs.append(t);});
    const bar=document.createElement('div');bar.id='toolbar';
    const short={select:'↖ Select',state:'⊕ State',edge:'↗ Arrow',delete:'× Delete'},tip={select:'Select / move (V)',state:'Add state: click empty canvas (S)',edge:'Add transition: click source, then target (T)',delete:'Delete (Delete key)'};
    order.forEach(g=>{
      if(g.title==='Tools'){g.els.filter(e=>e.classList.contains('tool')).forEach(btn=>{btn.textContent=short[btn.dataset.tool];btn.title=tip[btn.dataset.tool];bar.append(btn);});return;}
      const key=g.title==='Missions'?'Missions':/^(Regex|NFA)/.test(g.title)?'Convert':g.title==='Simulator'?'Run':'Build';
      if(key!=='Missions')panes[key].append(g.h);panes[key].append(...g.els);
    });
    const sel=()=>cy.nodes(':selected');
    function toggleFinal(){const n=sel();if(!n.length){status('Select a state first (click it), then press Final.');return;}
      n.forEach(x=>x.data('accepting',!x.data('accepting')));renderProperties(n[0]);
      status(`${n[0].data('label')} is ${n[0].data('accepting')?'now a FINAL (accepting) state':'no longer a final state'}.`);}
    function setInitial(){const n=sel();if(!n.length){status('Select a state first (click it), then press Start.');return;}
      cy.nodes().data('initial',false);n[0].data('initial',true);renderProperties(n[0]);status(`${n[0].data('label')} is now the start state.`);}
    [['◎ Final (F)','finalBtn','Toggle the selected state as final / accepting',toggleFinal],['▶ Start (I)','startStateBtn','Make the selected state the start state',setInitial]].forEach(([txt,id,title,fn])=>{
      const b=document.createElement('button');b.id=id;b.textContent=txt;b.title=title;b.className='state-btn';b.addEventListener('click',fn);bar.append(b);});
    document.querySelector('.workspace').insertBefore(bar,document.querySelector('.canvas-tools'));
    aside.replaceChildren(tabs,...names.map(n=>panes[n]));
    show('Missions');
    cy.on('dbltap','node',()=>show('Build'));
    document.addEventListener('keydown',e=>{const t=e.target;if(t.closest('input,textarea,select')||t.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;
      const k=e.key.toLowerCase();if(k==='f')toggleFinal();else if(k==='i')setInitial();});
  })();
  hud();startMission();
})();

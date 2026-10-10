const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const presets = {
  notebook: { label:'A / Field notebook', name:'Field notebook', type:'literary', color:'#b4472e', art:'fieldnotes', paper:'paper' },
  editorial: { label:'B / Printed journal', name:'Printed journal', type:'classic', color:'#3157a3', art:'fieldnotes', paper:'white' },
  sketchbook: { label:'C / Personal sketchbook', name:'Personal sketchbook', type:'literary', color:'#36715a', art:'doodles', paper:'cream' }
};
const art = {
  fieldnotes:{src:'assets/fieldnotes.png',alt:'Original ink drawing of a folded map, flow experiment, and leaves',caption:'Fig. 01 — A little curiosity goes a long way.'},
  doodles:{src:'assets/open-doodles-coffee.svg',alt:'Open Doodles person hugging a coffee cup',caption:'An expressive line study / Open Doodles'},
  peeps:{src:'assets/open-peeps.svg',alt:'Open Peeps hand drawn character study',caption:'A character to make this space your own / Open Peeps'}
};
const typeNames={literary:'Fraunces + DM Sans',classic:'Libre Baskerville + DM Sans',clean:'DM Sans + DM Mono'};
let state={direction:'notebook',...presets.notebook};
let favorites=[];
try { const data=JSON.parse(localStorage.getItem('krunal-design-directions')||'[]'); if(Array.isArray(data)) favorites=data.filter(item=>item&&presets[item.direction]&&typeNames[item.type]&&/^#[0-9a-f]{6}$/i.test(item.color)&&['paper','white','cream'].includes(item.paper)&&['fieldnotes','doodles','peeps','none'].includes(item.art)).slice(0,30); } catch {}
function update(){
  $$('.specimen').forEach(el=>{el.dataset.direction=state.direction;el.dataset.type=state.type;el.dataset.paper=state.paper;el.style.setProperty('--accent',state.color);el.classList.toggle('no-art',state.art==='none');});
  $$('.preset').forEach(el=>el.setAttribute('aria-pressed',el.dataset.preset===state.direction));
  $$('.swatches button').forEach(el=>el.setAttribute('aria-pressed',el.dataset.color===state.color));
  $$('[data-art]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.art===state.art));
  ['type','art','paper'].forEach(key=>$('#'+key).value=state[key]);
  $('#direction-label').textContent=presets[state.direction].label;
  $('#type-names').textContent=typeNames[state.type];
  if(art[state.art]){ $$('.art-image').forEach(el=>{el.src=art[state.art].src;el.alt=art[state.art].alt;});$('.art-caption').textContent=art[state.art].caption; }
  const css=getComputedStyle($('.specimen'));
  ['ink','accent','paper','rule'].forEach(key=>$('#'+key+'-value').textContent=css.getPropertyValue('--'+(key==='rule'?'line':key)).trim());
}
function view(name,focus=false){
  $$('[data-view]').forEach(el=>{const active=el.dataset.view===name;el.setAttribute('aria-selected',active);el.tabIndex=active?0:-1;if(active&&focus)el.focus();});
  ['preview','system','saved'].forEach(key=>$('#'+key).hidden=key!==name);
}
function page(name,project){
  $('#home-page').hidden=name!=='home';$('#project-page').hidden=name!=='project';
  $$('[data-page]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.page===name));
  if(project){$('#project-name').textContent=project;$('#project-category').textContent=project==='Escher'?'Work':project==='Vietnam Trip'?'Travel':'Personal project';}
}
$$('[data-preset]').forEach(el=>el.addEventListener('click',()=>{state={direction:el.dataset.preset,...presets[el.dataset.preset]};update();}));
['type','art','paper'].forEach(key=>$('#'+key).addEventListener('change',event=>{state[key]=event.target.value;update();}));
$$('[data-color]').forEach(el=>el.addEventListener('click',()=>{state.color=el.dataset.color;update();}));
$$('[data-art]').forEach(el=>el.addEventListener('click',()=>{state.art=el.dataset.art;update();}));
$$('[data-view]').forEach(el=>el.addEventListener('click',()=>view(el.dataset.view)));
$('.tabs').addEventListener('keydown',event=>{const tabs=$$('[data-view]');const index=tabs.indexOf(document.activeElement);if(index<0)return;let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();view(tabs[next].dataset.view,true);});
$$('[data-page]').forEach(el=>el.addEventListener('click',()=>page(el.dataset.page)));
$$('[data-project]').forEach(el=>el.addEventListener('click',()=>{page('project',el.dataset.project);$('.specimen').scrollIntoView({block:'start'});}));
$('#back-home').addEventListener('click',()=>page('home'));
$$('[data-scroll]').forEach(el=>el.addEventListener('click',()=>{page('home');$('#'+el.dataset.scroll).scrollIntoView({block:'center'});}));
function persist(){try{localStorage.setItem('krunal-design-directions',JSON.stringify(favorites));return true;}catch{$('#feedback').textContent='Browser storage is unavailable. Use Export tokens to keep your current choices.';return false;}}
function renderSaved(){
  $('#saved-count').textContent=favorites.length;
  const list=$('#saved-list');list.replaceChildren();
  if(!favorites.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Nothing saved yet. Try a direction, make a few changes, and save the combination you like.';list.append(empty);return;}
  favorites.forEach((item,index)=>{const card=document.createElement('article');card.className='saved-item';const meta=document.createElement('span');meta.className='overline';meta.textContent='SAVED DIRECTION / '+String(index+1).padStart(2,'0');const title=document.createElement('h3');title.textContent=presets[item.direction].name;const desc=document.createElement('p');desc.textContent=typeNames[item.type]+' · '+item.color+' · '+item.art;const note=document.createElement('p');note.textContent=item.note||'No note added.';const actions=document.createElement('div');const load=document.createElement('button');load.textContent='Load combination';load.addEventListener('click',()=>{state={...item};$('#note').value=item.note||'';update();view('preview');});const remove=document.createElement('button');remove.textContent='Remove';remove.addEventListener('click',()=>{favorites.splice(index,1);persist();renderSaved();});actions.append(load,remove);card.append(meta,title,desc,note,actions);list.append(card);});
}
$('#save').addEventListener('click',()=>{if(favorites.length>=30){$('#feedback').textContent='Your shortlist is full. Remove a combination to make room.';return;}favorites.push({...state,note:$('#note').value.trim()});const stored=persist();renderSaved();if(stored)$('#feedback').textContent='Saved. Find it in the Saved tab.';});
$('#sample-primary').addEventListener('click',()=>{view('preview');page('project','OpenFOAM Studio');});
$('#sample-secondary').addEventListener('click',()=>$('#sample-response').textContent='A secondary action: understated, with the same accent and type.');
$('#export').addEventListener('click',()=>{const css=getComputedStyle($('.specimen'));const tokens={name:'Krunal portfolio exploration',direction:presets[state.direction].name,colors:{ink:css.getPropertyValue('--ink').trim(),accent:state.color,paper:css.getPropertyValue('--paper').trim(),rule:css.getPropertyValue('--line').trim()},typography:{display:css.getPropertyValue('--display').trim(),body:'DM Sans',metadata:'DM Mono'},spacing:[8,16,24,40,64],illustration:state.art,note:$('#note').value.trim(),savedCombinations:favorites};const blob=new Blob([JSON.stringify(tokens,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='krunal-design-tokens.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
update();renderSaved();

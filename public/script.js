// script.js - handles form interactions and submission
function onGroupChange(){
  const g = document.getElementById('groupSelect').value;
  const sel = document.getElementById('categorySelect');
  sel.innerHTML = '<option value="">Select category</option>';
  let start=0,end=0;
  if(g==='1'){start=1;end=13;}
  else if(g==='2'){start=13;end=70;}
  else if(g==='3'){start=70;end=110;}
  for(let i=start;i<=end;i++){ const o=document.createElement('option'); o.value=i; o.text=i; sel.appendChild(o); }
}

function showDocs(){
  document.getElementById('docsSection').style.display = 'block';
  document.getElementById('docsSection').scrollIntoView({behavior:'smooth'});
}

function addEducation(){
  const area = document.getElementById('educationArea');
  const div = document.createElement('div');
  div.className='edu-row';
  div.innerHTML = `<input type="text" name="educationNames[]" placeholder="INPUT EDUCATION" required />
                   <input type="file" name="educationFiles[]" accept="image/*" />`;
  area.appendChild(div);
}

async function onSubmit(e){
  e.preventDefault();
  const f = document.getElementById('form');
  const fd = new FormData(f);
  const status = document.getElementById('status');
  status.innerText = 'Submitting...';

  const cnic = fd.get('cnic');
  if(!cnic){ status.innerText='Please enter CNIC'; return; }

  try{
    const res = await fetch('/api/save', {method:'POST', body: fd});
    const js = await res.json();
    if(js.ok){
      status.innerText = 'Saved. ' + (js.message || '');
      f.reset();
      document.getElementById('docsSection').style.display = 'none';
    } else {
      status.innerText = 'Error: '+ (js.message || 'unknown');
    }
  }catch(err){
    status.innerText = 'Network error: '+err.message;
  }
}

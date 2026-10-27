(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldAdSignatures=factory()})(this,function(){
 const roles={customer:'Kunde',technician:'Monteur'},fields={customer:'unterschrift_kunde',technician:'unterschrift_monteur'};
 function binding(values,revision=''){return JSON.stringify([revision,Object.keys(values).sort().map(key=>[key,String(values[key]??'')])])}
 function validInk(signature){if(!signature||!Number.isFinite(signature.aspect)||signature.aspect<.2||signature.aspect>15||!Array.isArray(signature.strokes))return false;let count=0,moved=false,first;
  for(const stroke of signature.strokes){if(!Array.isArray(stroke))return false;for(const p of stroke){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)return false;if(!first)first=p;else if(Math.abs(p.x-first.x)+Math.abs(p.y-first.y)>.003)moved=true;count++;if(count>12000)return false}}
  return moved&&count>=2;
 }
 function status(values,signatures={},revision=''){const current=binding(values,revision),valid={},stale=[];for(const role of Object.keys(roles)){const s=signatures?.[role];if(!s)continue;if(s.binding===current&&validInk(s))valid[role]=s;else stale.push(role)}return {valid,stale}}
 function paths(signature,rect){if(!validInk(signature))throw Error('INVALID_SIGNATURE');const points=signature.strokes.flat(),minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),width=Math.max(.001,(maxX-minX)*signature.aspect),height=Math.max(.001,maxY-minY),scale=Math.min((rect.width-6)/width,(rect.height-6)/height);return signature.strokes.map(stroke=>stroke.map(p=>({x:rect.x+3+(p.x-minX)*signature.aspect*scale,y:rect.y+rect.height/2+((minY+maxY)/2-p.y)*scale}))).filter(stroke=>stroke.length>1)}
 return {roles,fields,binding,validInk,status,paths};
});

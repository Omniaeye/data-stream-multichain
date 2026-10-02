import test from 'node:test';
import assert from 'node:assert/strict';
import {packTokenTimeline} from '../src/agent-trading/token-timeline.js';

test('the first roster uses the whole field and NEW marker expiry cannot rearrange it',()=>{
 const items=Array.from({length:12},(_,i)=>({key:'token-'+i,time:100-i,band:0,radius:18,arriving:false}));
 const bounds=[{x:100,y:50,width:700,height:300}];
 const pack=values=>packTokenTimeline(values,bounds,{labels:true,scroll:true,compact:true});
 const baseline=pack(items),p=[...baseline.points.values()];
 assert.ok(Math.min(...p.map(p=>p.x-p.radius))<=120);
 assert.ok(Math.max(...p.map(p=>p.x+p.radius))>=780,'use the available field width');
 assert.ok(Math.min(...p.map(p=>p.y-p.radius))<=51);
 assert.ok(Math.max(...p.map(p=>p.y+p.radius))>=300);
 assert.deepEqual([...pack(items.map(t=>({...t,arriving:true}))).points],[...baseline.points]);
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)assert.ok(Math.abs(p[i].x-p[j].x)>=72||Math.abs(p[i].y-p[j].y)>=p[i].radius+p[j].radius+34);
});

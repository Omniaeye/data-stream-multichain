import {useState} from 'react';
import type {Capture} from './AgentTradingJev';
import {AttractorPreview} from './AttractorPreview';
import {TrenchesWorkspace} from './TrenchesWorkspace';
import './local-workspace.css';

/** Local development only. Production continues to load the JEV viewer. */
export default function LocalWorkspace(props:{capture?:Capture;connectionError:boolean;viewOnly:boolean}){
 const [preset,setPreset]=useState<'jev'|'trenches'>(()=>new URLSearchParams(location.search).get('preset')==='trenches'?'trenches':'jev');
 const selector=<select className="workspace-preset" aria-label="Preset" value={preset} onChange={e=>setPreset(e.target.value as 'jev'|'trenches')}><option value="jev">JEV</option><option value="trenches">Trenches</option></select>;
 if(preset==='jev')return <AttractorPreview {...props} presetControls={selector}/>;
 return <TrenchesWorkspace {...props} controls={selector}/>;
}

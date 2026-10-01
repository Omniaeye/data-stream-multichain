/** Reuses the OMNIA artwork; the blink is decorative, never a feed status. */
import {jevEndpoint} from './jev-endpoint';
export function ObservatoryEye(){
 return <span className="observatory-eye" role="img" aria-label="OMNIA EYE">
  <img className="eye-open" src={jevEndpoint('/assets/eye-preview-open-7f4b89b98810.webp')} alt="" decoding="async" fetchPriority="low"/>
  <img className="eye-half" src={jevEndpoint('/assets/eye-preview-half-aa95c0670799.webp')} alt="" decoding="async" fetchPriority="low"/>
  <img className="eye-closed" src={jevEndpoint('/assets/eye-preview-closed-4822ac468174.webp')} alt="" decoding="async" fetchPriority="low"/>
 </span>;
}

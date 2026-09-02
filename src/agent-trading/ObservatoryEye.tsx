/** Reuses the OMNIA artwork; the blink is decorative, never a feed status. */
export function ObservatoryEye(){
 return <span className="observatory-eye" role="img" aria-label="OMNIA EYE">
  <img className="eye-open" src="/assets/eye-master.png" alt=""/>
  <img className="eye-half" src="/assets/eye-blink-half.png" alt=""/>
  <img className="eye-closed" src="/assets/eye-blink-closed.png" alt=""/>
 </span>;
}

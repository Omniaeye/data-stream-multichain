// Keep private-preview requests in the authenticated path, including retries.
export function jevEndpoint(path,pathname=globalThis.location?.pathname??'/'){
 const prefix=pathname==='/jev-test'||pathname.startsWith('/jev-test/')?'/jev-test':pathname==='/trenches'||pathname.startsWith('/trenches/')?'/trenches'
  :pathname==='/jev'||pathname.startsWith('/jev/')?'/jev':'';
 return prefix+path;
}

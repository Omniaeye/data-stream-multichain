import {canonicalChain} from './token-selection.js';
const unknownMark='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2212%22 fill=%22none%22 stroke=%22%2378898e%22 stroke-width=%222%22/%3E%3C/svg%3E';
export const chainMark=chain=>{const network=canonicalChain(chain);return network?'/chain-marks/'+network+(network==='robinhood'?'.jpg':'.svg'):unknownMark;};

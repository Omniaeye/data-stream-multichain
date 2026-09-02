export type Parameter={key:string;group:string;label:string;unit:string;note:string};
export const PARAMETERS:Parameter[];
export const PARAMETER_GROUPS:string[];
export function parameterFor(key:string):Parameter|undefined;
export function formatParameter(field:{key:string;value:string|number|boolean}):string;

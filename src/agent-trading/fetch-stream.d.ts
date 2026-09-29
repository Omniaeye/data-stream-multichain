export function fetchStream(url:string,init?:RequestInit,budgets?:{headersMs?:number;bodyMs?:number}):Promise<{response:Response;text:string}>;

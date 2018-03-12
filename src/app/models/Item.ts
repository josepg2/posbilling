export interface Item {
    id        : number,
    prodid    : string,
    prodname  : string,
    proddisc  : string,
    isremoved : boolean,
    stock     : number,
    unitprice : number,
    category  : number,
    tax       : number,
    hasoff    : number,
    offtype   : string,
    offvalue  : number,
    updated_by: string,
    created_at?: Date,
    updated_at?: Date,
    status? : string,
    error?  : string,
    lastid? : number
}
declare module '@mysten/sui' {
    export class TransactionBlock {
        moveCall(params: {
            target: string;
            arguments: any[];
        }): void;
        object(id: string): any;
        pure(value: any): any;
    }
    export class JsonRpcProvider {
        constructor(connection: Connection);
    }
    export class Connection {
        constructor(url: string);
    }

    export interface ObjectOwner {
        AddressOwner: string;
        ObjectOwner: string;
        Shared: {
            initial_shared_version: number;
        };
        Immutable: null;
    }
} 
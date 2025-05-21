declare module 'ethers' {
    export * from 'ethers';
    export class providers {
        static Web3Provider(provider: any): any;
    }
    export class Contract {
        constructor(address: string, abi: any[], signer: any);
        [key: string]: any;
    }
    export class Signer {
        getAddress(): Promise<string>;
    }
} 
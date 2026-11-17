declare module '@hookform/resolvers/zod' {
    import { Resolver } from 'react-hook-form'
    export const zodResolver: (schema: any, schemaOptions?: any, resolverOptions?: any) => Resolver<any>
}

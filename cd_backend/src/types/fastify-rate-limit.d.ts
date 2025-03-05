// declare module '@fastify/rate-limit' {
//   import { FastifyPluginCallback } from 'fastify';

//   interface RateLimitOptions {
//     max?: number;
//     timeWindow?: string | number;
//     allowList?: (req: { headers: { origin?: string } }) => boolean | Promise<boolean>;
//     keyGenerator?: (req: any) => string;
//     errorResponseBuilder?: (req: any, context: any) => any;
//     onExceeding?: (req: any) => void;
//     onExceeded?: (req: any) => void;
//   }

//   const fastifyRateLimit: FastifyPluginCallback<RateLimitOptions>;

//   export default fastifyRateLimit;
// }

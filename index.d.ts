// Type definitions for bluecat 2.x

export type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH' | 'OPTIONS';

export interface RequestOptions {
  body?: any;
  query?: Record<string, string | number | boolean | null | undefined>;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string | (() => string | Record<string, string> | Promise<string | Record<string, string>>)>;
}

export interface RequestInfo {
  method: string;
  uri: string;
  headers: Record<string, string>;
  body?: any;
}

export interface ResponseData {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: any;
  elapsedTime: number;
}

export interface RequestResult {
  request: RequestInfo;
  data?: ResponseData;
  err: Error | null;
}

export interface SessionRules {
  requestHeader: string;
  responseHeader: string;
  startSessionHeader?: string;
}

export interface ServiceOptions {
  proxy?: string;
  strictSSL?: boolean;
  /** Custom undici Dispatcher. When set, takes precedence over proxy/strictSSL. */
  dispatcher?: unknown;
}

export interface BeforeRequestContext {
  request: RequestInfo;
}

export type BeforeRequestHook = (ctx: BeforeRequestContext) => void | Promise<void>;
export type AfterResponseHook = (ctx: BeforeRequestContext, result: RequestResult) => void | Promise<void>;

/**
 * Bluecat Service. The shape of the methods on the instance depends on the
 * api.json definition; users should cast or augment this type per project.
 */
export class Service {
  constructor(servJson: any, host: string, options?: ServiceOptions);

  setProxy(proxy?: string): void;
  setHeaders(headers: Record<string, string>): void;
  getHeaders(): Record<string, string>;
  setSessionRules(rules: SessionRules): void;
  resetCookie(): void;
  beforeRequest(fn: BeforeRequestHook): void;
  afterResponse(fn: AfterResponseHook): void;

  run<T>(fn: () => T | Promise<T>): Promise<T>;
  sleep(ms: number): Promise<void>;

  // Dynamically generated methods from api.json. Signature shown for reference:
  [key: string]: any;
}

export const ServiceSync: typeof Service;
export const ServiceAsync: typeof Service;

export function Api(name: string, apiPath?: string, urlCallback?: (target: any) => any): any;
export function Api(name: string, urlCallback: (target: any) => any): any;

export function validateApi(tree: any): any;

export interface FromOpenApiOptions {
  /** Top-level key for the resulting tree (default: "api"). */
  name?: string;
}

export function fromOpenAPI(spec: any, options?: FromOpenApiOptions): any;
export function hostFromOpenAPI(spec: any): string | undefined;

export const version: string;

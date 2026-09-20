/// <reference types="vite/client" />

declare module '*.css';

declare module 'workbox-precaching';
declare module 'workbox-routing';
declare module 'workbox-strategies';

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: any;
}

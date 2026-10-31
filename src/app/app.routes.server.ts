import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'en', renderMode: RenderMode.Prerender },
  { path: 'curriculo', renderMode: RenderMode.Prerender },
  { path: 'en/resume', renderMode: RenderMode.Prerender },
  // ServerRoute has no redirectTo; the '**' -> '' redirect lives in app.routes.ts.
  { path: '**', renderMode: RenderMode.Prerender },
];

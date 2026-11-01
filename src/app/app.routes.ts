import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { Life } from './pages/life';
import { Resume } from './pages/resume';

export const routes: Routes = [
  { path: '', component: Home, data: { lang: 'pt' } },
  { path: 'en', component: Home, data: { lang: 'en' } },
  { path: 'sobre', component: Life, data: { lang: 'pt' } },
  { path: 'en/about', component: Life, data: { lang: 'en' } },
  // Résumé pages are bare: no site header, skip link or cursor (see App).
  { path: 'curriculo', component: Resume, data: { lang: 'pt', bare: true } },
  { path: 'en/resume', component: Resume, data: { lang: 'en', bare: true } },
  { path: '**', redirectTo: '' },
];

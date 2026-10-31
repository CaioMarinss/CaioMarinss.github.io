import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    // A failed bootstrap can't drive the cinema chapters; show the static layout instead.
    document.documentElement.classList.remove('is-cinema');
    console.error(err);
  });

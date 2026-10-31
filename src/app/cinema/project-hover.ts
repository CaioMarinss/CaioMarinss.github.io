import { Injectable, WritableSignal, signal } from '@angular/core';
import { ProjectItem } from '../content/content.types';

/** Project row under the pointer or keyboard focus, shared between the projects list and the 3D scene. */
@Injectable({ providedIn: 'root' })
export class ProjectHover {
  readonly hovered: WritableSignal<ProjectItem['id'] | null> = signal(null);
}

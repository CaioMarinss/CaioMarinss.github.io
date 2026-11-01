import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { Cursor } from './cursor';
import { ScrollDirector } from './scroll-director';

/** jsdom may lack PointerEvent: a MouseEvent carrying pointerType is all the cursor reads. */
function pointer(type: string, target: EventTarget, x = 10, y = 20): void {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(e);
}

async function render(): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [Cursor],
    providers: [{ provide: ScrollDirector, useValue: { onFrame: () => () => undefined } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Cursor);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Cursor', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  it('hides over an iframe (no pointermove reaches the page there) and comes back on the next move', async () => {
    const host = await render();
    pointer('pointermove', document);
    expect(host.classList.contains('ready')).toBe(true);

    const frame = document.body.appendChild(document.createElement('iframe'));
    pointer('pointerover', frame);
    expect(host.classList.contains('ready')).toBe(false);

    pointer('pointermove', document, 30, 40);
    expect(host.classList.contains('ready')).toBe(true);
  });

  it('grows the ring over links', async () => {
    const host = await render();
    const link = document.body.appendChild(document.createElement('a'));
    pointer('pointerover', link);
    expect(host.querySelector('.ring')?.classList.contains('hover')).toBe(true);
  });
});

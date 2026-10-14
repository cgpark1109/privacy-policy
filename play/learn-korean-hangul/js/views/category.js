// Letter grid for one category (lib/screens/learn/category_screen.dart).

import { html } from '../ui.js';
import { appBar, bindBack, itemGrid, bindSpeak, resolveList, koTitle } from './shared.js';

export default function categoryView(ctx) {
  const key = ctx.params.list;
  const list = resolveList(ctx.repo, key);
  const english = list.title.replace(/^[^A-Za-z]+/, ''); // "자음 Consonants" → "Consonants"

  const el = html(`<div class="screen">
    ${appBar(list.title, { titleHtml: koTitle(list.title) })}
    <div class="page page--grid">
      ${itemGrid(list.items, key, { label: english })}
    </div>
  </div>`);

  bindBack(el, () => ctx.router.back('/learn'));
  bindSpeak(el, ctx, () => list.items);

  return { el, title: english, tab: 'learn', sub: true, parent: '/learn' };
}

import { fromEvent } from 'rxjs';

// 在页面中调用时
fromEvent(document, 'DOMContentLoaded').subscribe(e => {
  console.log('document DOMContentLoaded e is ', e);
  const appEl = document.querySelector('.app') as HTMLElement;
  console.log('appEl is ', appEl);
});


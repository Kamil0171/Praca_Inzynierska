(function () {
  window.MathJax = window.MathJax || {};
  window.MathJax.tex = Object.assign(
    {
      inlineMath: [['\\(', '\\)'], ['$', '$']],
      displayMath: [['\\[', '\\]']],
      processEscapes: true
    },
    window.MathJax.tex || {}
  );
  window.MathJax.options = Object.assign(
    {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      enableMenu: false
    },
    window.MathJax.options || {}
  );
  window.MathJax.svg = Object.assign(
    { fontCache: 'global' },
    window.MathJax.svg || {}
  );

  if (!window.__mathjaxLoadPromise) {
    window.__mathjaxLoadPromise = new Promise(function (resolve, reject) {
      if (window.MathJax && window.MathJax.startup && window.MathJax.typesetPromise) {
        resolve(window.MathJax);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.onload = function () {
        const ready = (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise)
          ? window.MathJax.startup.promise
          : Promise.resolve(window.MathJax);
        ready.then(function () { resolve(window.MathJax); }).catch(reject);
      };
      script.onerror = function (e) {
        console.error('Nie udało się załadować MathJax:', e);
        reject(e);
      };
      document.head.appendChild(script);
    });
  }

  window.MathJaxReady = window.__mathjaxLoadPromise;

  window.mathjaxTypeset = function (root) {
    const target = root || document.body;
    return window.MathJaxReady
      .then(function () {
        if (window.MathJax && window.MathJax.typesetPromise) {
          return window.MathJax.typesetPromise([target]).catch(function () {});
        }
      })
      .catch(function () {});
  };
})();

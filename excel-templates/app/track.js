/* Groma. Counts a click on a download link as an event in the site's own visit counter.
   It sends the file name only. It runs on the template pages, never on the tool pages. */
(function () {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-track]') : null;
    if (a) window.va('event', { name: 'Download', data: { file: a.getAttribute('data-track') } });
  });
})();

/* Rich-text editor: text size/colour, images (stored server-side), shapes, image resizing. */
(function () {
  'use strict';
  var form = document.getElementById('note-form');
  if (!form || typeof Quill === 'undefined') { return; }

  var csrf = form.dataset.csrf;
  var wrap = document.getElementById('editor-wrap');
  var status = document.getElementById('editor-status');
  var MAX_BYTES = 2 * 1024 * 1024;

  // Word-like point sizes instead of Quill's three defaults. The server whitelists the same set of styles.
  var Size = Quill.import('attributors/style/size');
  Size.whitelist = ['10px', '12px', '14px', '18px', '24px', '32px', '48px'];
  Quill.register(Size, true);

  var quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Start writing…',
    modules: { toolbar: { container: '#toolbar', handlers: { image: chooseImage, shape: toggleShapePanel } } }
  });

  function say(msg) { status.textContent = msg || ''; }

  /* ---------- images ---------- */
  var fileInput = document.getElementById('image-input');
  function chooseImage() { fileInput.click(); }
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) { uploadImage(fileInput.files[0]); }
    fileInput.value = '';
  });

  function uploadImage(file) {
    say('');
    if (file.size > MAX_BYTES) { say('Image is too large (max 2 MB).'); return; }
    var data = new FormData();
    data.append('image', file);
    say('Uploading image…');
    fetch('/uploads/image', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: data, credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) { say(res.body.error || 'Upload failed.'); return; }
        say('');
        insertImage(res.body.url);
      })
      .catch(function () { say('Upload failed. Check your connection and try again.'); });
  }

  function insertImage(url, width) {
    var range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', url, 'user');
    if (width) {
      var leaf = quill.getLeaf(range.index)[0];
      if (leaf && leaf.domNode) { setWidth(leaf.domNode, width); }
    }
    quill.setSelection(range.index + 1, 0, 'silent');
  }

  function setWidth(img, width) {
    var blot = Quill.find(img);
    if (blot) { blot.format('width', width); quill.update('user'); }
  }

  // Pasted or dropped pictures are uploaded instead of being embedded as huge base64 strings.
  function interceptFiles(getFiles) {
    return function (e) {
      var files = getFiles(e);
      if (files && files.length && /^image\//.test(files[0].type)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        uploadImage(files[0]);
      }
    };
  }
  quill.root.addEventListener('paste', interceptFiles(function (e) { return e.clipboardData && e.clipboardData.files; }), true);
  quill.root.addEventListener('drop', interceptFiles(function (e) { return e.dataTransfer && e.dataTransfer.files; }), true);

  /* ---------- image size toolbar ---------- */
  var tools = document.getElementById('image-tools');
  var current = null;

  function selectImage(img) {
    deselectImage();
    current = img;
    img.classList.add('is-selected');
    tools.hidden = false;
    positionTools();
  }
  function deselectImage() {
    if (current) { current.classList.remove('is-selected'); }
    current = null;
    tools.hidden = true;
  }
  function positionTools() {
    if (!current || !current.isConnected) { deselectImage(); return; }
    var r = current.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    tools.style.top = Math.max(0, r.top - w.top + 8) + 'px';
    tools.style.left = Math.max(0, r.left - w.left + 8) + 'px';
  }
  quill.root.addEventListener('click', function (e) {
    if (e.target.tagName === 'IMG') { selectImage(e.target); } else { deselectImage(); }
  });
  quill.on('text-change', function () { if (current) { positionTools(); } });
  window.addEventListener('resize', positionTools);
  tools.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || !current) { return; }
    if (btn.dataset.action === 'delete') {
      var blot = Quill.find(current);
      var index = quill.getIndex(blot);
      deselectImage();
      quill.deleteText(index, 1, 'user');
    } else {
      setWidth(current, btn.dataset.width);
      positionTools();
    }
  });

  /* ---------- shapes ---------- */
  var panel = document.getElementById('shape-panel');
  var shapeBtn = document.querySelector('.ql-shape');
  var fill = document.getElementById('shape-fill');
  var stroke = document.getElementById('shape-stroke');
  var noFill = document.getElementById('shape-nofill');

  function shapeUrl(name) {
    var f = noFill.checked ? 'none' : fill.value.slice(1);
    return '/shapes/' + name + '.svg?fill=' + f + '&stroke=' + stroke.value.slice(1);
  }
  function refreshPreviews() {
    panel.querySelectorAll('.shape-opt').forEach(function (b) {
      b.querySelector('img').src = shapeUrl(b.dataset.shape);
    });
  }
  function toggleShapePanel() {
    panel.hidden = !panel.hidden;
    shapeBtn.setAttribute('aria-expanded', String(!panel.hidden));
  }
  [fill, stroke, noFill].forEach(function (el) { el.addEventListener('input', refreshPreviews); });
  panel.addEventListener('click', function (e) {
    var opt = e.target.closest('.shape-opt');
    if (!opt) { return; }
    insertImage(shapeUrl(opt.dataset.shape), opt.dataset.shape === 'line' ? '160px' : '120px');
    panel.hidden = true;
    shapeBtn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { panel.hidden = true; deselectImage(); }
  });

  /* ---------- save ---------- */
  form.addEventListener('submit', function () {
    // nbsp would stop long lines from wrapping; the server re-sanitises everything anyway.
    document.getElementById('body-input').value = quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
  });
})();

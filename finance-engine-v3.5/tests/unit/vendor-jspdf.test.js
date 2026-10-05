// BLD-003: the vendored jsPDF and jsPDF-AutoTable used by the legacy PDF export work together.
// Node only (loads the libraries from disk into a vm context); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var vm = CFE_NODE.support('vendor-loader.js');

  T.suite('Vendored jsPDF', function () {
    T.test('the app loads exactly one jsPDF and one AutoTable build', function () {
      var lib = vm.jspdf();
      assert.ok(/^vendor\/jspdf-[0-9.]+\/jspdf\.umd\.min\.js$/.test(lib.srcs[0]), lib.srcs[0]);
      assert.ok(/^vendor\/jspdf-autotable-[0-9.]+\/jspdf\.plugin\.autotable\.min\.js$/.test(lib.srcs[1]), lib.srcs[1]);
    });

    T.test('creates a document with a 3-row autoTable (the call exportPDF uses)', function () {
      var jsPDF = vm.jspdf().jspdf.jsPDF;
      var doc = new jsPDF();
      assert.equal(typeof doc.autoTable, 'function', 'doc.autoTable is attached by the plugin');
      doc.setFontSize(18); doc.text('Smoke test', 14, 20);
      doc.autoTable({ startY: 30, head: [['Metric', 'Value']], body: [['A', '£1'], ['B', '£2'], ['C', '£3']], theme: 'grid', headStyles: { fillColor: [26, 26, 46] } });
      assert.ok(doc.lastAutoTable && doc.lastAutoTable.finalY > 30, 'lastAutoTable.finalY is set');
      var bytes = doc.output('arraybuffer').byteLength;
      assert.ok(bytes > 1000, 'PDF has ' + bytes + ' bytes');
    });
  });
})();

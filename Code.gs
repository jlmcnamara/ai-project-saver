const SHEET_NAME = 'Sheet1';
const SECRET = 'sEcuRe_2025!xyz';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (!verifyHmac(body)) return json({ ok: false, error: 'forbidden' });

    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const rows = Array.isArray(body.rows) ? body.rows : [body];

    const vals = sh.getDataRange().getValues();
    const seen = new Set(
      vals.slice(1).map(r => `${r[1]}|${r[5]}|${r[4]}`)  // Fixed: proper backticks
    );

    const toAppend = [];
    rows.forEach(b => {
      const key = `${b.platform||''}|${b.id||''}|${b.url||''}`;  // Fixed: proper backticks
      if (!seen.has(key)) {
        toAppend.push([
          new Date(), b.platform||'', b.type||'', b.title||'',
          b.url||'', b.id||'', b.notes||''
        ]);
        seen.add(key);
      }
    });

    if (toAppend.length) {
      sh.getRange(sh.getLastRow()+1,1,toAppend.length, toAppend[0].length).setValues(toAppend);
    }
    return json({ ok: true, appended: toAppend.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, pong: true, ts: new Date().toISOString() });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyHmac(body) {
  const sig = body.sig || '';
  const clone = { ...body };
  delete clone.sig;
  const calc = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(JSON.stringify(clone), SECRET)
  );
  return sig === calc;
}
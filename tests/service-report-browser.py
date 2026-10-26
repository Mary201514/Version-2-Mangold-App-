"""Functional browser/PDF tests. Requires Playwright, Chromium and PyMuPDF.
Run against `node server.cjs` with: python3 tests/service-report-browser.py
Speech events are simulated; this does not validate a real microphone/provider.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import fitz
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:4173/'
TRANSCRIPT = ('Kunde: Müller GmbH. Befund: Motor läuft nicht. '
              'Arbeiten: Lager getauscht und Probelauf durchgeführt. '
              'Material: 2 Stück Lager, Artikelnummer L-17; 1 Stück Dichtung, Artikelnummer D-4; '
              '3 Meter Kabel, Artikelnummer K-2; 1 Stück Stecker, Artikelnummer S-8. '
              'Arbeitszeit: zwei Stunden. Rüstzeit: 15 Minuten. Wartezeit: 10 Minuten. '
              'Reisezeit hin: 30 Minuten. Reisezeit rück: 45 Minuten. Kilometer: 48 km.')
FAKE_SPEECH = """class FakeRecognition {
  constructor(){window.testRecognition=this}
  start(){}
  stop(){this.onend?.()}
}; window.SpeechRecognition=FakeRecognition;"""

with sync_playwright() as p, TemporaryDirectory() as output:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1024, 'height': 768})
    page.add_init_script(FAKE_SPEECH)
    errors, downloads = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('download', lambda download: downloads.append(download.suggested_filename))
    page.goto(BASE + '#dokumentation')
    page.locator('#speech-record').click()
    assert page.evaluate('testRecognition.lang') == 'de-DE'
    page.evaluate("""text=>{
      const final=[{transcript:text}]; final.isFinal=true;
      const interim=[{transcript:'noch unbestätigt'}]; interim.isFinal=false;
      testRecognition.onresult({results:[final,interim]});
    }""", TRANSCRIPT)
    expect(page.locator('#transcript')).to_have_value(TRANSCRIPT)
    page.locator('#flow-nav .flow-next').click()
    expect(page).to_have_url(BASE + '#dokumentation')
    page.locator('#speech-record').click()
    expect(page.locator('#speech-record')).to_have_attribute('aria-pressed', 'false')
    page.locator('#flow-nav .flow-next').click()
    expect(page).to_have_url(BASE + '#pruefen')
    expect(page.locator('#field-arbeiten')).to_have_value('Lager getauscht und Probelauf durchgeführt.')
    expect(page.locator('#field-arbeit')).to_have_value('zwei Stunden.')
    page.locator('#field-arbeit').fill('3 Stunden')
    page.locator('.journey-steps a[href="#dokumentation"]').click()
    page.locator('#flow-nav .flow-next').click()
    expect(page.locator('#field-arbeit')).to_have_value('3 Stunden')
    page.get_by_role('button', name='Ausgefülltes Formular anzeigen', exact=True).click()
    expect(page.locator('.report-sheet')).to_have_count(2)
    expect(page.locator('[data-field="ausgefuehrte_arbeiten"]')).to_contain_text('Lager getauscht')
    expect(page.locator('[data-field="reiseweg_km"]')).to_have_text('48')
    expect(page.locator('[data-field="reisezeit"]')).to_have_text('1,25')
    expect(page.locator('[data-field="s2_mat_1_bezeichnung"]')).to_have_text('Stecker')
    with page.expect_download() as download:
        page.locator('#report-result a[download]').click()
    target = Path(output) / 'nachweis.pdf'
    download.value.save_as(target)
    pdf = fitz.open(target)
    first, second = pdf[0].get_text(), pdf[1].get_text()
    for value in ['Müller GmbH.', 'Lager getauscht', 'L-17', '3 Stunden', '48', '1,25', '1.0', '12.10.2026']:
        assert value in first, value
    for value in ['Stecker', 'S-8', '2026-1042']:
        assert value in second, value
    assert all(filename.endswith('.pdf') for filename in downloads), downloads
    # Reopening a locally saved report reproduces the completed form.
    page.reload()
    expect(page.locator('[data-field="stunden"]')).to_have_text('3')
    for width, height in [(1024, 768), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), width
    page.set_viewport_size({'width': 1024, 'height': 768})
    page.goto(BASE + '#pruefen')
    long_text = 'Pumpe geprüft und gereinigt. ' * 45
    page.locator('#field-arbeiten').fill(long_text)
    page.get_by_role('button', name='Ausgefülltes Formular anzeigen', exact=True).click()
    expect(page.locator('[data-field="s2_ausgefuehrte_arbeiten"]')).to_contain_text('gereinigt')
    # Overflow must show an error and retain every character, never truncate a PDF.
    page.goto(BASE + '#pruefen')
    too_long = 'Langer Bericht mit vielen Angaben. ' * 200
    page.locator('#field-arbeiten').fill(too_long)
    page.get_by_role('button', name='Ausgefülltes Formular anzeigen', exact=True).click()
    expect(page.locator('#report-result [role="alert"]')).to_contain_text('länger als die beiden Formularseiten')
    assert page.evaluate('state.fields.arbeiten') == too_long
    page.get_by_role('link', name='Angaben bearbeiten', exact=True).last.click()
    expect(page.locator('#field-arbeiten')).to_have_value(too_long)
    page.locator('#field-arbeiten').fill('Motor repariert')
    page.locator('#field-material').fill('; '.join(f'1 Stück Teil {i}' for i in range(12)))
    page.get_by_role('button', name='Ausgefülltes Formular anzeigen', exact=True).click()
    expect(page.locator('#report-result [role="alert"]')).to_contain_text('elf Materialpositionen')
    assert not errors, errors

    unsupported = browser.new_page()
    unsupported.add_init_script('window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined;')
    unsupported.goto(BASE + '#dokumentation')
    unsupported.locator('#speech-record').click()
    expect(unsupported.locator('#speech-status')).to_contain_text('Tablet-Tastatur')
    unsupported.locator('#transcript').fill('Befund: Pumpe defekt. Arbeiten: Dichtung getauscht.')
    unsupported.locator('#flow-nav .flow-next').click()
    unsupported.get_by_role('button', name='Ausgefülltes Formular anzeigen', exact=True).click()
    expect(unsupported.locator('[data-field="ausgefuehrte_arbeiten"]')).to_contain_text('Dichtung getauscht')
    denied = browser.new_page()
    denied.add_init_script(FAKE_SPEECH)
    denied.goto(BASE + '#dokumentation')
    denied.locator('#transcript').fill('Bereits erfasste Angaben')
    denied.locator('#speech-record').click()
    denied.evaluate("testRecognition.onerror({error:'not-allowed'});testRecognition.onend()")
    expect(denied.locator('#speech-status')).to_contain_text('nicht erlaubt')
    expect(denied.locator('#transcript')).to_have_value('Bereits erfasste Angaben')
    browser.close()
    print('PASS: Sprachereignisse, Zuordnung, Korrekturen, 2-seitige Vorschau, PDF-Inhalt, Neuladen, Tablet/Telefon, Text-/Materialüberlauf, Tastatur-Fallback und Mikrofonfehler. Keine JSON-Ausgabe.')

# Builds the free Excel templates, in English and Romanian.
# Usage: python build-workbooks.py <output folder>
# The formulas use functions that every Excel since 2007 and LibreOffice understand.
import sys
import os

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

OBSIDIAN, COBALT, IVORY = '131A27', '1A4FC8', 'F7F5F0'
HEAD = dict(font=Font(bold=True, color='FFFFFF'), fill=PatternFill('solid', fgColor=OBSIDIAN),
            alignment=Alignment(wrap_text=True, vertical='center'))
CALC_HEAD = dict(font=Font(bold=True, color='FFFFFF'), fill=PatternFill('solid', fgColor=COBALT),
                 alignment=Alignment(wrap_text=True, vertical='center'))
INPUT_FILL = PatternFill('solid', fgColor='FFFFFF')
CALC_FILL = PatternFill('solid', fgColor=IVORY)
THIN = Side(style='thin', color='D9D5CC')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
ROWS = 300  # rows that carry formulas


def style(cell, spec):
    for k, v in spec.items():
        setattr(cell, k, v)


def readme(wb, title, rows):
    ws = wb.create_sheet(title)
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 110
    for i, (k, v) in enumerate(rows, start=1):
        a = ws.cell(row=i, column=1, value=k)
        a.font = Font(bold=True)
        a.alignment = Alignment(vertical='top', wrap_text=True)
        b = ws.cell(row=i, column=2, value=v)
        b.alignment = Alignment(wrap_text=True, vertical='top')
    return ws


# ---------------------------------------------------------------- safety stock and reorder point
STOCK = {
    'en': {
        'file': 'simon-g-safety-stock-reorder-point.xlsx',
        'calc': 'Calculator', 'sales': 'From daily sales', 'levels': 'Service levels', 'read': 'Read me',
        'excess_label': 'Stock is excess above, days of cover',
        'inputs': ['Product', 'Description', 'Sold per day, average', 'Sold per day, standard deviation', 'Lead time, days',
                   'Lead time variation, days', 'You review orders every, days', 'Service level', 'On hand', 'On order',
                   'Pack size', 'Minimum order quantity', 'Unit cost'],
        'outputs': ['Service factor', 'Safety stock', 'Reorder point', 'Order up to', 'Proposed order', 'Order value',
                    'Days of cover', 'Status'],
        'status': ['Order now', 'Excess', 'Covered'],
        'note': 'White columns are yours to fill in. Blue columns are calculated. Rows 6 to 15 hold invented examples: replace them.',
        'sales_head': ['Date', 'Units sold'],
        'sales_labels': ['Days with a figure', 'Sold per day, average', 'Sold per day, standard deviation',
                         'Copy the two results into columns C and D of the calculator.'],
        'sales_note': 'Paste the daily sales of ONE product in columns A and B, one row per day. Write 0 for a day with no sale. Leave out the days when the product was out of stock.',
        'levels_head': ['Service level', 'Service factor', 'What it means'],
        'levels_text': 'out of 100 order cycles, about {n} end without running out',
        'readme': [
            ('What this workbook does', 'For each product it calculates the safety stock, the reorder point, the order-up-to level and a proposed order, from eight figures you fill in.'),
            ('How to use it', 'Open the sheet "Calculator". Replace the example rows with your products. If you do not know the average and the standard deviation of daily sales, the sheet "From daily sales" calculates them for one product at a time.'),
            ('Safety stock', 'Service factor × square root of [ (lead time + review period) × (standard deviation of daily sales)² + (average daily sales)² × (lead time variation)² ]. The first part covers the variation of demand, the second the variation of the supplier\'s delivery time.'),
            ('Reorder point', 'Average daily sales × lead time + safety stock.'),
            ('Order up to', 'Average daily sales × (lead time + review period) + safety stock.'),
            ('Proposed order', 'Order up to − stock on hand − stock on order, never below zero, rounded up to the pack size and raised to the minimum order quantity.'),
            ('Service factor', 'The number of standard deviations that gives the service level, from the normal distribution. 95% gives 1.64.'),
            ('What a spreadsheet cannot see', 'A day when the product was out of stock looks like a day with no demand, so the average comes out too low. The workbook also ignores season, trend and day of the week, and you fill in every product by hand.'),
            ('The free Stock Check', 'It reads your opening stock and your transactions, rebuilds the stock of every day, corrects the out-of-stock days, tests several forecasting methods per product and proposes the orders for all products at once. It runs in your browser and the file is not uploaded: groma.ro/en/simon-g/stock-check'),
            ('Licence', 'Free to use, change and share, with or without credit. Made by Groma, groma.ro. No warranty: check the results before you order.'),
        ],
        'examples': [
            ('P-1001', 'Oil filter', 42, 12, 14, 3, 7, 0.98, 510, 300, 12, 24, 4.2),
            ('P-1002', 'Air filter', 16, 6, 21, 4, 7, 0.97, 96, 360, 12, 12, 6.3),
            ('P-1003', 'Brake pads front', 9, 5, 10, 2, 7, 0.95, 240, 0, 4, 8, 18.5),
            ('P-1004', 'Brake disc', 3, 2.5, 30, 6, 14, 0.92, 410, 0, 2, 2, 31),
            ('P-1005', 'Wiper blade 600', 22, 9, 7, 1, 7, 0.96, 60, 0, 10, 50, 5.1),
            ('P-1006', 'Engine oil 5W40 4L', 35, 10, 14, 2, 7, 0.98, 1200, 0, 4, 40, 17.9),
            ('P-1007', 'Coolant 1L', 12, 8, 14, 3, 7, 0.95, 130, 120, 12, 24, 3.4),
            ('P-1008', 'Battery 70Ah', 1.4, 1.6, 21, 5, 14, 0.9, 9, 0, 1, 4, 68),
            ('P-1009', 'Spark plug', 28, 7, 10, 2, 7, 0.97, 2500, 0, 4, 100, 3.8),
            ('P-1010', 'Timing belt kit', 0.8, 1.1, 28, 7, 14, 0.9, 12, 10, 1, 1, 112),
        ],
    },
    'ro': {
        'file': 'simon-g-stoc-de-siguranta-punct-de-comanda.xlsx',
        'calc': 'Calcul', 'sales': 'Din vânzări zilnice', 'levels': 'Niveluri de serviciu', 'read': 'Citește-mă',
        'excess_label': 'Stocul este surplus peste, zile de acoperire',
        'inputs': ['Produs', 'Denumire', 'Vândut pe zi, media', 'Vândut pe zi, abaterea standard', 'Termen de livrare, zile',
                   'Variația termenului de livrare, zile', 'Revizuiți comenzile la fiecare, zile', 'Nivel de serviciu', 'Stoc curent',
                   'Deja comandat', 'Bucăți pe ambalaj', 'Cantitate minimă de comandă', 'Cost unitar'],
        'outputs': ['Factor de serviciu', 'Stoc de siguranță', 'Punct de comandă', 'Comandă până la', 'Comandă propusă',
                    'Valoarea comenzii', 'Zile de acoperire', 'Stare'],
        'status': ['De comandat', 'Surplus', 'Acoperit'],
        'note': 'Coloanele albe sunt de completat. Coloanele albastre sunt calculate. Rândurile 6–15 conțin exemple inventate: înlocuiți-le.',
        'sales_head': ['Data', 'Bucăți vândute'],
        'sales_labels': ['Zile cu o cifră', 'Vândut pe zi, media', 'Vândut pe zi, abaterea standard',
                         'Copiați cele două rezultate în coloanele C și D din foaia de calcul.'],
        'sales_note': 'Lipiți vânzările zilnice ale UNUI produs în coloanele A și B, câte un rând pe zi. Scrieți 0 pentru o zi fără vânzări. Lăsați deoparte zilele în care produsul a lipsit din stoc.',
        'levels_head': ['Nivel de serviciu', 'Factor de serviciu', 'Ce înseamnă'],
        'levels_text': 'din 100 de cicluri de comandă, aproximativ {n} se încheie fără lipsă de stoc',
        'readme': [
            ('Ce face acest fișier', 'Pentru fiecare produs calculează stocul de siguranță, punctul de comandă, nivelul până la care se comandă și o comandă propusă, din opt cifre pe care le completați.'),
            ('Cum se folosește', 'Deschideți foaia „Calcul”. Înlocuiți rândurile de exemplu cu produsele dumneavoastră. Dacă nu știți media și abaterea standard a vânzărilor zilnice, foaia „Din vânzări zilnice” le calculează pentru câte un produs.'),
            ('Stocul de siguranță', 'Factorul de serviciu × radical din [ (termenul de livrare + perioada de revizuire) × (abaterea standard a vânzărilor zilnice)² + (media vânzărilor zilnice)² × (variația termenului de livrare)² ]. Prima parte acoperă variația cererii, a doua variația termenului de livrare al furnizorului.'),
            ('Punctul de comandă', 'Media vânzărilor zilnice × termenul de livrare + stocul de siguranță.'),
            ('Comandă până la', 'Media vânzărilor zilnice × (termenul de livrare + perioada de revizuire) + stocul de siguranță.'),
            ('Comanda propusă', 'Comandă până la − stocul curent − ce este deja comandat, niciodată sub zero, rotunjită în sus la ambalaj și ridicată la cantitatea minimă de comandă.'),
            ('Factorul de serviciu', 'Numărul de abateri standard care dă nivelul de serviciu, din distribuția normală. 95% dă 1,64.'),
            ('Ce nu poate vedea un tabel', 'O zi în care produsul a lipsit din stoc arată ca o zi fără cerere, așa că media iese prea mică. Fișierul nu ține seama nici de sezon, de tendință sau de ziua săptămânii, iar fiecare produs se completează de mână.'),
            ('Verificarea de stoc, gratuită', 'Citește stocul inițial și tranzacțiile, reface stocul fiecărei zile, corectează zilele fără stoc, încearcă mai multe metode de prognoză pentru fiecare produs și propune comenzile pentru toate produsele deodată. Rulează în browser, iar fișierul nu este trimis nicăieri: groma.ro/simon-g/verificare-stoc'),
            ('Licență', 'Se poate folosi, schimba și da mai departe liber, cu sau fără menționarea sursei. Făcut de Groma, groma.ro. Fără garanție: verificați rezultatele înainte de a comanda.'),
        ],
        'examples': None,
    },
}
STOCK['ro']['examples'] = [
    (r[0], n) + r[2:] for r, n in zip(STOCK['en']['examples'], [
        'Filtru de ulei', 'Filtru de aer', 'Plăcuțe de frână față', 'Disc de frână', 'Ștergător 600', 'Ulei motor 5W40 4L',
        'Antigel 1L', 'Baterie 70Ah', 'Bujie', 'Kit distribuție'])]


def stock_workbook(lang):
    x = STOCK[lang]
    wb = Workbook()
    ws = wb.active
    ws.title = x['calc']
    ws['A1'] = 'Simon G. · Groma'
    ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = x['note']
    ws['A3'] = x['excess_label']
    ws['A3'].font = Font(bold=True)
    ws['D3'] = 180
    ws['D3'].border = BOX
    head_row, first = 5, 6
    heads = x['inputs'] + x['outputs']
    for c, h in enumerate(heads, start=1):
        cell = ws.cell(row=head_row, column=c, value=h)
        style(cell, HEAD if c <= len(x['inputs']) else CALC_HEAD)
        cell.border = BOX
    ws.row_dimensions[head_row].height = 48
    order, excess, covered = x['status']
    for i in range(ROWS):
        r = first + i
        if i < len(x['examples']):
            for c, v in enumerate(x['examples'][i], start=1):
                ws.cell(row=r, column=c, value=v)
        f = {
            14: f'=IF(OR($A{r}="",H{r}=""),"",NORMSINV(H{r}))',
            15: f'=IF(OR($A{r}="",N{r}="",C{r}=""),"",ROUNDUP(N{r}*SQRT((E{r}+G{r})*D{r}^2+C{r}^2*F{r}^2),0))',
            16: f'=IF(O{r}="","",ROUND(C{r}*E{r}+O{r},0))',
            17: f'=IF(O{r}="","",ROUND(C{r}*(E{r}+G{r})+O{r},0))',
            18: f'=IF(Q{r}="","",IF(Q{r}-I{r}-J{r}<=0,0,MAX(L{r},IF(K{r}>0,ROUNDUP((Q{r}-I{r}-J{r})/K{r},0)*K{r},ROUNDUP(Q{r}-I{r}-J{r},0)))))',
            19: f'=IF(OR(R{r}="",M{r}=""),"",R{r}*M{r})',
            20: f'=IF(OR($A{r}="",C{r}="",C{r}<=0),"",ROUND(I{r}/C{r},0))',
            21: f'=IF(R{r}="","",IF(R{r}>0,"{order}",IF(AND(T{r}<>"",T{r}>$D$3),"{excess}","{covered}")))',
        }
        for c, formula in f.items():
            ws.cell(row=r, column=c, value=formula)
        for c in range(1, len(heads) + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = BOX
            cell.fill = INPUT_FILL if c <= len(x['inputs']) else CALC_FILL
        ws.cell(row=r, column=8).number_format = '0%'
        ws.cell(row=r, column=14).number_format = '0.00'
        ws.cell(row=r, column=13).number_format = '#,##0.00'
        ws.cell(row=r, column=19).number_format = '#,##0'
    widths = [11, 22, 11, 12, 10, 12, 12, 9, 9, 9, 9, 11, 9, 9, 10, 10, 10, 10, 11, 10, 13]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=first, column=3)
    dv = DataValidation(type='decimal', operator='between', formula1='0.5', formula2='0.999', allow_blank=True)
    dv.error = '50% – 99.9%'
    ws.add_data_validation(dv)
    dv.add(f'H{first}:H{first + ROWS - 1}')

    sh = wb.create_sheet(x['sales'])
    sh['A1'] = x['sales_note']
    sh['A1'].alignment = Alignment(wrap_text=True, vertical='top')
    sh.merge_cells('A1:F1')
    sh.row_dimensions[1].height = 48
    for c, h in enumerate(x['sales_head'], start=1):
        style(sh.cell(row=3, column=c, value=h), HEAD)
    sample = [40, 47, 38, 51, 44, 0, 0, 39, 45, 42, 55, 48, 0, 0, 36, 41, 49, 52, 46, 0, 0, 43, 40, 44, 58, 50, 0, 0]
    import datetime as dt
    day = dt.date(2026, 8, 3)
    for i, q in enumerate(sample):
        sh.cell(row=4 + i, column=1, value=day + dt.timedelta(days=i)).number_format = 'YYYY-MM-DD'
        sh.cell(row=4 + i, column=2, value=q)
    labels = x['sales_labels']
    sh['D3'], sh['E3'] = labels[0], '=COUNT(B4:B2000)'
    sh['D4'], sh['E4'] = labels[1], '=IF(E3>0,ROUND(AVERAGE(B4:B2000),2),"")'
    sh['D5'], sh['E5'] = labels[2], '=IF(E3>1,ROUND(STDEV(B4:B2000),2),"")'
    sh['D7'] = labels[3]
    for a in ('D3', 'D4', 'D5'):
        sh[a].font = Font(bold=True)
    for a in ('E3', 'E4', 'E5'):
        sh[a].fill = CALC_FILL
        sh[a].border = BOX
    sh.column_dimensions['A'].width = 13
    sh.column_dimensions['B'].width = 13
    sh.column_dimensions['D'].width = 34
    sh.column_dimensions['E'].width = 12

    lv = wb.create_sheet(x['levels'])
    for c, h in enumerate(x['levels_head'], start=1):
        style(lv.cell(row=1, column=c, value=h), HEAD)
    for i, p in enumerate([0.85, 0.9, 0.92, 0.95, 0.96, 0.97, 0.98, 0.99, 0.995], start=2):
        lv.cell(row=i, column=1, value=p).number_format = '0.0%'
        lv.cell(row=i, column=2, value=f'=NORMSINV(A{i})').number_format = '0.00'
        lv.cell(row=i, column=3, value=x['levels_text'].format(n=('%g' % (p * 100)).replace('.', ',' if lang == 'ro' else '.')))
    lv.column_dimensions['A'].width = 16
    lv.column_dimensions['B'].width = 16
    lv.column_dimensions['C'].width = 70

    readme(wb, x['read'], x['readme'])
    wb.save(os.path.join(OUT, x['file']))
    print(x['file'])


# ---------------------------------------------------------------- working capital days
CASH = {
    'en': {
        'file': 'simon-g-working-capital-days.xlsx', 'calc': 'Calculator', 'read': 'Read me',
        'note': 'Fill in the white cells from your last two annual balance sheets and profit and loss accounts. Blue cells are calculated. The figures shown are invented.',
        'years': ['Last year', 'The year before'],
        'inputs': ['Revenue', 'Cost of goods sold', 'Stock, at year end', 'Receivables from customers, at year end', 'Payables to suppliers, at year end'],
        'outputs': ['Days of stock', 'Days to collect', 'Days to pay', 'Cash cycle, days', 'Cash tied up in stock and receivables, less payables',
                    'One day of stock is worth', 'One day of collection is worth'],
        'change': 'Change',
        'what_if': 'What if', 'wi': ['Days of stock you take out', 'Days of collection you take out', 'Cash released'],
        'readme': [
            ('What this workbook does', 'From five figures per year it calculates how many days your money stays in stock and in receivables, how many days your suppliers finance you, and what one day is worth.'),
            ('Days of stock', 'Stock ÷ cost of goods sold × 365.'),
            ('Days to collect', 'Receivables from customers ÷ revenue × 365.'),
            ('Days to pay', 'Payables to suppliers ÷ cost of goods sold × 365.'),
            ('Cash cycle', 'Days of stock + days to collect − days to pay. It is the number of days between paying your supplier and being paid by your customer.'),
            ('One day is worth', 'One day of stock = cost of goods sold ÷ 365. One day of collection = revenue ÷ 365.'),
            ('What these figures hide', 'Year-end balances are one day out of 365. A company that empties its warehouse in December looks better than it is. The figures also say nothing about which products or which customers hold the money.'),
            ('The free tools', 'The Working Capital Check does this calculation in your browser and explains each figure: groma.ro/en/simon-g/working-capital. The Stock Check shows which products hold the excess: groma.ro/en/simon-g/stock-check. The Credit Check shows which customers pay late: groma.ro/en/simon-g/credit-check.'),
            ('Licence', 'Free to use, change and share, with or without credit. Made by Groma, groma.ro. No warranty.'),
        ],
    },
    'ro': {
        'file': 'simon-g-zile-capital-de-lucru.xlsx', 'calc': 'Calcul', 'read': 'Citește-mă',
        'note': 'Completați celulele albe din ultimele două bilanțuri și conturi de profit și pierdere anuale. Celulele albastre sunt calculate. Cifrele afișate sunt inventate.',
        'years': ['Anul trecut', 'Anul dinainte'],
        'inputs': ['Cifra de afaceri', 'Costul mărfurilor vândute', 'Stocuri, la sfârșitul anului', 'Creanțe clienți, la sfârșitul anului', 'Datorii către furnizori, la sfârșitul anului'],
        'outputs': ['Zile de stoc', 'Zile până la încasare', 'Zile până la plată', 'Ciclul de numerar, zile', 'Bani blocați în stocuri și creanțe, minus datoriile către furnizori',
                    'O zi de stoc valorează', 'O zi de încasare valorează'],
        'change': 'Schimbare',
        'what_if': 'Ce-ar fi dacă', 'wi': ['Zile de stoc pe care le scoateți', 'Zile de încasare pe care le scoateți', 'Bani eliberați'],
        'readme': [
            ('Ce face acest fișier', 'Din cinci cifre pe an calculează câte zile stau banii dumneavoastră în stocuri și în creanțe, câte zile vă finanțează furnizorii și cât valorează o zi.'),
            ('Zile de stoc', 'Stocuri ÷ costul mărfurilor vândute × 365.'),
            ('Zile până la încasare', 'Creanțe clienți ÷ cifra de afaceri × 365.'),
            ('Zile până la plată', 'Datorii către furnizori ÷ costul mărfurilor vândute × 365.'),
            ('Ciclul de numerar', 'Zile de stoc + zile până la încasare − zile până la plată. Este numărul de zile dintre plata furnizorului și încasarea de la client.'),
            ('Cât valorează o zi', 'O zi de stoc = costul mărfurilor vândute ÷ 365. O zi de încasare = cifra de afaceri ÷ 365.'),
            ('Ce ascund aceste cifre', 'Soldurile de la sfârșitul anului sunt o zi din 365. O firmă care își golește depozitul în decembrie arată mai bine decât este. Cifrele nu spun nici ce produse sau ce clienți țin banii.'),
            ('Instrumentele gratuite', 'Verificarea capitalului de lucru face acest calcul în browser și explică fiecare cifră: groma.ro/simon-g/capital-de-lucru. Verificarea de stoc arată ce produse țin surplusul: groma.ro/simon-g/verificare-stoc. Verificarea de credit arată ce clienți plătesc târziu: groma.ro/simon-g/verificare-credit.'),
            ('Licență', 'Se poate folosi, schimba și da mai departe liber, cu sau fără menționarea sursei. Făcut de Groma, groma.ro. Fără garanție.'),
        ],
    },
}
CASH_EXAMPLE = [(48200000, 45900000), (37100000, 35600000), (9400000, 8100000), (7900000, 7200000), (6100000, 6000000)]


def cash_workbook(lang):
    x = CASH[lang]
    wb = Workbook()
    ws = wb.active
    ws.title = x['calc']
    ws['A1'] = 'Simon G. · Groma'
    ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = x['note']
    style(ws.cell(row=4, column=1, value=''), HEAD)
    for c, y in enumerate(x['years'], start=2):
        style(ws.cell(row=4, column=c, value=y), HEAD)
    style(ws.cell(row=4, column=4, value=x['change']), HEAD)
    for i, label in enumerate(x['inputs']):
        r = 5 + i
        ws.cell(row=r, column=1, value=label)
        for c in (2, 3):
            cell = ws.cell(row=r, column=c, value=CASH_EXAMPLE[i][c - 2])
            cell.number_format = '#,##0'
            cell.border = BOX
    # rows: 5 revenue, 6 cogs, 7 stock, 8 receivables, 9 payables
    out = [
        ('=IF(OR({c}6="",{c}6=0),"",ROUND({c}7/{c}6*365,0))', '0'),
        ('=IF(OR({c}5="",{c}5=0),"",ROUND({c}8/{c}5*365,0))', '0'),
        ('=IF(OR({c}6="",{c}6=0),"",ROUND({c}9/{c}6*365,0))', '0'),
        ('=IF(OR({c}11="",{c}12="",{c}13=""),"",{c}11+{c}12-{c}13)', '0'),
        ('=IF({c}7="","",{c}7+{c}8-{c}9)', '#,##0'),
        ('=IF(OR({c}6="",{c}6=0),"",{c}6/365)', '#,##0'),
        ('=IF(OR({c}5="",{c}5=0),"",{c}5/365)', '#,##0'),
    ]
    for i, label in enumerate(x['outputs']):
        r = 11 + i
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        for c in ('B', 'C'):
            cell = ws[f'{c}{r}']
            cell.value = out[i][0].format(c=c)
            cell.number_format = out[i][1]
            cell.fill = CALC_FILL
            cell.border = BOX
        d = ws[f'D{r}']
        d.value = f'=IF(OR(B{r}="",C{r}=""),"",B{r}-C{r})'
        d.number_format = '+' + out[i][1] + ';-' + out[i][1] + ';0'
        d.fill = CALC_FILL
        d.border = BOX
    style(ws.cell(row=20, column=1, value=x['what_if']), CALC_HEAD)
    ws['A21'], ws['B21'] = x['wi'][0], 10
    ws['A22'], ws['B22'] = x['wi'][1], 5
    ws['A23'] = x['wi'][2]
    ws['A23'].font = Font(bold=True)
    ws['B23'] = '=IF(OR(B16="",B17=""),"",B21*B16+B22*B17)'
    ws['B23'].number_format = '#,##0'
    ws['B23'].fill = CALC_FILL
    for a in ('B21', 'B22', 'B23'):
        ws[a].border = BOX
    ws.column_dimensions['A'].width = 62
    for c in 'BCD':
        ws.column_dimensions[c].width = 18
    readme(wb, x['read'], x['readme'])
    wb.save(os.path.join(OUT, x['file']))
    print(x['file'])


for lang in ('en', 'ro'):
    stock_workbook(lang)
    cash_workbook(lang)

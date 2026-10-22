import json, re, base64, collections
import pandas as pd, numpy as np
import analysis

D = '/home/claude/data/'
out = {}

# ---------------- SmartScout market
d = json.load(open(D + 'ss_bed.json'))
P = pd.DataFrame(d['products']); Bd = pd.DataFrame(d['brands'])
cols = [c['title'] for c in d['columns']]
for i, c in enumerate(cols):
    P[c] = P.classifiedValues.map(lambda x: x[i]['value'])
P['t'] = P.rawTitle.str.lower()
tot = P.revenue.sum()
Bs = Bd.sort_values('revenue', ascending=False)
out['kpi'] = dict(rev=tot, brands=len(Bd), asins=len(P), units=int(Bd.estMonthlyUnits.sum()),
                  asp=float(tot / Bd.estMonthlyUnits.sum()), cr5=float(Bs.revenue.head(5).sum() / tot), cr10=float(Bs.revenue.head(10).sum() / tot),
                  rating=float((P.rating * P.revenue).sum() / P.revenue.sum()))

def grp(X, col, mapping=None, top=None, tot_=None):
    s = X[col] if mapping is None else X[col].map(mapping)
    g = X.assign(k=s).groupby('k').agg(rev=('revenue', 'sum'), n=('asin', 'count'), price=('price', 'median'))
    g = g[g.index != ''].sort_values('rev', ascending=False)
    if top: g = g.head(top)
    g['rpa'] = g.rev / g.n
    return [dict(k=k, rev=round(r.rev), n=int(r.n), price=round(float(r.price), 2), rpa=round(r.rpa)) for k, r in g.iterrows()]

matmap = {'metal': 'Kim loại', 'steel': 'Kim loại', 'iron': 'Kim loại', 'upholstered': 'Bọc vải/nệm', 'velvet': 'Bọc vải/nệm', 'linen': 'Bọc vải/nệm',
          'fabric': 'Bọc vải/nệm', 'boucle': 'Bọc vải/nệm', 'chenille': 'Bọc vải/nệm', 'faux leather': 'Da PU', 'pu leather': 'Da PU', 'leather': 'Da PU',
          'Solid Wood': 'Gỗ tự nhiên', 'Solid Wood + metal (Hybrid)': 'Gỗ + kim loại', 'Engineered Wood': 'Gỗ công nghiệp', 'rattan': 'Mây/rattan', 'wicker': 'Mây/rattan', '': ''}
out['material'] = grp(P, 'Chất liệu', lambda v: matmap.get(v, 'Khác'))
def sz(t):
    for s, lab in [('california king', 'Cal King'), ('cal king', 'Cal King'), ('king', 'King'), ('queen', 'Queen'), ('full', 'Full'), ('twin xl', 'Twin XL'), ('twin', 'Twin')]:
        if s in t: return lab
    return ''
P['sz'] = P.t.map(sz)
out['size_all'] = grp(P, 'sz')
bins = [0, 75, 125, 175, 250, 400, 600, 1e6]; lab = ['<$75', '$75–125', '$125–175', '$175–250', '$250–400', '$400–600', '$600+']
P['band'] = pd.cut(P.price, bins, labels=lab).astype(str)
W = P[P['Chất liệu'] == 'Solid Wood'].copy()
def bandtab(X):
    g = X.groupby('band').agg(rev=('revenue', 'sum'), n=('asin', 'count')).reindex(lab).fillna(0)
    return [dict(k=k, rev=round(r.rev), n=int(r.n), rpa=round(r.rev / r.n) if r.n else 0, share=r.rev / g.rev.sum()) for k, r in g.iterrows()]
out['band_all'] = bandtab(P); out['band_wood'] = bandtab(W)
out['size_wood'] = grp(W, 'sz')
out['wood_total'] = dict(rev=round(W.revenue.sum()), n=len(W), share=W.revenue.sum() / tot, brands=int(W.brand.nunique()),
                         cr5=float(W.groupby('brand').revenue.sum().nlargest(5).sum() / W.revenue.sum()), price=float(W.price.median()))
species = [('Acacia', 'acacia'), ('Walnut', 'walnut'), ('Oak', 'oak'), ('Bamboo', 'bamboo'), ('Rubberwood', 'rubberwood|rubber wood'), ('Pine', 'pine'), ('Teak', 'teak')]
out['species'] = [dict(k=k, n=int(W.t.str.contains(p).sum()), rev=round(W[W.t.str.contains(p)].revenue.sum()), price=float(W[W.t.str.contains(p)].price.median()),
                       rpa=round(W[W.t.str.contains(p)].revenue.sum() / max(1, W.t.str.contains(p).sum()))) for k, p in species]
feats = [('Tool-free / không dụng cụ', 'tool-free|tool free|tool-less|toolless|no tools'), ('Japanese / joinery', 'japanese|joinery'), ('Mid-century', 'mid-century|mid century'),
         ('LED / sạc USB', 'led|usb|charging'), ('Có headboard', 'headboard'), ('Easy assembly', 'easy assembly|quick assembly'), ('Minimalist', 'minimalist'),
         ('Farmhouse', 'farmhouse'), ('Storage / ngăn kéo', 'storage|drawer'), ('Rattan / paper cord', 'rattan|cane|paper cord'), ('Floor bed / low profile', 'floor bed|low profile')]
out['feat_wood'] = sorted([dict(k=k, n=int(W.t.str.contains(p).sum()), rev=round(W[W.t.str.contains(p)].revenue.sum()), price=float(W[W.t.str.contains(p)].price.median()),
                                rpa=round(W[W.t.str.contains(p)].revenue.sum() / max(1, W.t.str.contains(p).sum()))) for k, p in feats], key=lambda x: -x['rpa'])
out['wood_avg_rpa'] = round(W.revenue.sum() / len(W))
colors = [('Walnut', 'walnut'), ('Natural', 'natural'), ('Light wood', 'light'), ('Black', 'black'), ('White', 'white'), ('Brown', 'brown'), ('Oak', 'oak'), ('Grey', 'grey|gray'),
          ('Dark', 'dark'), ('Espresso', 'espresso'), ('Honey', 'honey'), ('Caramel', 'caramel'), ('Chocolate', 'chocolate')]
out['color_wood'] = sorted([dict(k=k, n=int(W.t.str.contains(p).sum()), rev=round(W[W.t.str.contains(p)].revenue.sum())) for k, p in colors], key=lambda x: -x['rev'])
out['brands_top'] = [dict(k=r.brand, rev=round(r.revenue), share=r.marketShare, price=round(r.avgPrice), n=int(r.asinsCount), c=r.dominantCountry) for _, r in Bs.head(12).iterrows()]
wb = W.groupby('brand').agg(rev=('revenue', 'sum'), n=('asin', 'count'), price=('price', 'median')).sort_values('rev', ascending=False)
out['brands_wood'] = [dict(k=k, rev=round(r.rev), n=int(r.n), price=round(float(r.price))) for k, r in wb.head(12).iterrows()]
out['ss_brand'] = {b: dict(rev=round(Bd[Bd.brand == n].revenue.sum()), share=float(Bd[Bd.brand == n].marketShare.sum()), n=int(Bd[Bd.brand == n].asinsCount.sum()),
                           rank=int(Bs.reset_index().index[Bs.reset_index().brand == n][0]) + 1)
                   for b, n in [('AFW', 'AllForWood'), ('BME', 'BME'), ('Merax', 'Merax'), ('Zinus', 'Zinus')]}
out['topwood'] = [dict(asin=r.asin, brand=r.brand, price=r.price, rev=round(r.revenue), rv=int(r.reviewCount), rt=r.rating, title=r.rawTitle[:90])
                  for _, r in W.sort_values('revenue', ascending=False).head(12).iterrows()]
S = pd.DataFrame(d['searchTerms'])
S['yoy'] = S.currentSearchVolume / S.priorYearSearchVolume.replace(0, np.nan) - 1
terms = ['queen bed frame', 'king bed frame', 'wood bed frame', 'wooden bed frame', 'japanese bed frame', 'japanese joinery bed frame', 'thuma bed frame',
         'solid wood king bed frame', 'solid wood queen bed frame', 'walnut bed frame', 'japanese joinery bed frame queen', 'japanese joinery bed frame king',
         'easy assembly bed frame', 'japandi bed frame', 'mid century modern bed frame', 'japanese platform bed', 'king wooden bed frame with headboard', 'queen wood bed frame']
out['terms'] = [dict(k=t, sv=int(S[S.searchTerm == t].currentSearchVolume.iloc[0]), prev=int(S[S.searchTerm == t].priorYearSearchVolume.iloc[0]),
                     yoy=None if pd.isna(S[S.searchTerm == t].yoy.iloc[0]) else float(S[S.searchTerm == t].yoy.iloc[0]),
                     asins=int(S[S.searchTerm == t].asinCount.iloc[0])) for t in terms if (S.searchTerm == t).any()]
cl = S[S.searchTerm.str.contains('japanese|joinery|thuma|japandi|tool free|tool-free|easy assembly bed')]
out['cluster'] = dict(sv=int(cl.currentSearchVolume.sum()), prev=int(cl.priorYearSearchVolume.sum()), n=len(cl))

# ---------------- wood top-30 listing trend
L = pd.read_pickle(D + '30_listing.pkl')
L['g'] = pd.to_numeric(L.GMV.astype(str).str.replace(r'[$,]', '', regex=True), errors='coerce')
L['ym'] = L.Year.astype(str) + '-' + L.Month.astype(str).str.zfill(2)
L = L[L.ym <= '2026-02']
pv = L.pivot_table(index='ym', columns='Style', values='g', aggfunc='sum').fillna(0)
out['style_trend'] = dict(months=list(pv.index), series={c: [round(v) for v in pv[c]] for c in ['Rustic', 'Mid-Century Modern', 'Farmhouse', 'Thuma', 'Minimalist', 'Classic']})
pa = L[L.Asin.isin(['B0F4JVH6ZQ', 'B0B3MQTGL1', 'B0DFC9QX92', 'B0GHKFZ447'])].pivot_table(index='ym', columns='Asin', values='g', aggfunc='sum').reindex(pv.index).fillna(0)
out['asin_trend'] = dict(months=list(pv.index), series={a: [round(v) for v in pa[a]] for a in pa.columns})
pr = L.pivot_table(index='ym', columns='Price Range', values='g', aggfunc='sum').fillna(0)
out['price_trend'] = dict(months=list(pr.index), series={c: [round(v) for v in pr[c]] for c in pr.columns})

# ---------------- AFW / BME
rows = pd.DataFrame(json.load(open(D + 'rows.json')))
H = json.load(open(D + 'h10.json'))
num = lambda v: float(v) if isinstance(v, (int, float)) else (float(re.sub(r'[^0-9.]', '', str(v))) if re.sub(r'[^0-9.]', '', str(v)) else np.nan)
rows['price'] = rows.price.map(num)
rows['rev'] = rows.asin.map(lambda a: (H.get(a) or {}).get('a_rev') or 0)
rows['units'] = rows.asin.map(lambda a: (H.get(a) or {}).get('a_units') or 0)
# H10-only asins
known = set(rows.asin)
extra = []
from classify import line_of, size_of
from build import CAT
for a, h in H.items():
    if a in known or a == 'B07BYQGF8R': continue
    m, p = line_of({'t': h['title'], 'v': [], 'a': a})
    extra.append(dict(brand='AllForWood' if h['brandcode'] == 'AFW' else 'Bme', cat=CAT.get(p, 'Other'), line=m or '(khác)', type=p, asin=a,
                      price=h.get('h_price') or np.nan, rev=h.get('a_rev') or 0, units=h.get('a_units') or 0, title=h['title'], size=size_of({'t': h['title'], 'v': []}, p)))
R = pd.concat([rows, pd.DataFrame(extra)], ignore_index=True)
R['brand'] = R.brand.replace({'Bme': 'Bme'})
brand_out = {}
for b in ['AllForWood', 'Bme']:
    X = R[R.brand == b]
    cats = X.groupby('cat').agg(n=('asin', 'count'), rev=('rev', 'sum'), units=('units', 'sum'), pmin=('price', 'min'), pmax=('price', 'max'), pmed=('price', 'median')).sort_values('rev', ascending=False)
    types = X.groupby(['cat', 'type']).agg(n=('asin', 'count'), rev=('rev', 'sum'), pmed=('price', 'median')).sort_values('rev', ascending=False)
    lines = X.groupby(['line']).agg(n=('asin', 'count'), rev=('rev', 'sum')).sort_values('rev', ascending=False)
    top = X.sort_values('rev', ascending=False).head(8)
    brand_out[b] = dict(rev=round(X.rev.sum()), units=round(X.units.sum()), n=len(X), lines=int(X.line.nunique()), cats=len(cats),
                        cat=[dict(k=k, n=int(r.n), rev=round(r.rev), units=round(r.units), pmin=None if pd.isna(r.pmin) else round(r.pmin), pmax=None if pd.isna(r.pmax) else round(r.pmax),
                                  pmed=None if pd.isna(r.pmed) else round(r.pmed)) for k, r in cats.iterrows()],
                        type=[dict(cat=k[0], k=k[1], n=int(r.n), rev=round(r.rev), pmed=None if pd.isna(r.pmed) else round(r.pmed)) for k, r in types.head(14).iterrows()],
                        topline=[dict(k=k, n=int(r.n), rev=round(r.rev)) for k, r in lines.head(10).iterrows()],
                        top=[dict(asin=r.asin, line=r.line, type=r.type, size=r.get('size', ''), price=None if pd.isna(r.price) else r.price, rev=round(r.rev), units=round(r.units), title=str(r.title)[:80]) for _, r in top.iterrows()])
    pb = pd.cut(X.price, [0, 100, 200, 300, 400, 600, 1e5], labels=['<$100', '$100–200', '$200–300', '$300–400', '$400–600', '$600+']).astype(str)
    g = X.assign(pb=pb).groupby('pb').agg(n=('asin', 'count'), rev=('rev', 'sum'))
    brand_out[b]['band'] = [dict(k=k, n=int(g.n.get(k, 0)), rev=round(g.rev.get(k, 0))) for k in ['<$100', '$100–200', '$200–300', '$300–400', '$400–600', '$600+']]
out['brand'] = brand_out

# ---------------- bed lines
B = json.load(open(D + 'bed_images.json')); G = json.load(open(D + 'bed_gal.json'))
iid = lambda u: u.split('/I/')[1].split('.')[0]
bed = R[R.asin.isin(B.keys()) | ((R.type == 'Bed frame'))]
code = {'AllForWood': 'AFW', 'Bme': 'BME'}
lines = []
thumbs_used = set()
for (b, ln), X in bed.groupby(['brand', 'line']):
    key = f'{b}|{ln}'
    A = analysis.A.get((code[b], ln, 'Bed frame'), {})
    sizes = [s for s in ['Twin', 'Full', 'Queen', 'King', 'Cal King'] if (X['size'] == s).any()]
    szrev = {s: round(X[X['size'] == s].rev.sum()) for s in sizes}
    rr = X[X.rating.astype(str).str.strip() != '']
    xn = pd.to_numeric(X.nrat, errors='coerce')
    nrat = xn.max()
    rating = pd.to_numeric(X.rating, errors='coerce')[xn.idxmax()] if xn.notna().any() else np.nan
    k = X[X['size'] == 'King'] if (X['size'] == 'King').any() else X
    dims = next((v for v in k.dims if isinstance(v, str) and v), '')
    wt = pd.to_numeric(k.wt, errors='coerce').max()
    gal = [iid(u) for u in G['gal'].get(key, [])]
    rep = G['rep'].get(key)
    main = iid(B[rep]['main']) if rep and B.get(rep, {}).get('main') else (gal[0] if gal else None)
    pics = ([main] if main else []) + [g for g in gal if g != main][:7]
    thumbs_used.update(pics)
    t = ' '.join(X.title.astype(str)).lower()
    hb = 'Có & không' if ('without headboard' in t and 'headboard' in t.replace('without headboard', '')) else ('Không headboard' if 'without headboard' in t or 'no headboard' in t else ('Có headboard' if 'headboard' in t else '—'))
    hgt = re.findall(r'x\s*([\d.]+)"H', dims)
    if hgt and float(hgt[0]) < 20: hb = 'Không headboard'
    mat = next((m for m in X.get('mat', pd.Series(dtype=str)).astype(str) if m and m != 'nan'), '')
    lines.append(dict(brand=b, line=ln, n=len(X), colors=int(X.color.nunique()) if 'color' in X else 0, sizes=sizes, szrev=szrev,
                      pmin=None if pd.isna(X.price.min()) else round(X.price.min()), pmax=None if pd.isna(X.price.max()) else round(X.price.max()),
                      rev=round(X.rev.sum()), units=round(X.units.sum()), rating=None if pd.isna(rating) else float(rating), nrat=None if pd.isna(nrat) else int(nrat),
                      dims=dims, wt=None if pd.isna(wt) else float(wt), mat=mat, hb=hb, ngal=len(G['gal'].get(key, [])),
                      kd=A.get('kd', ''), pack=A.get('pack', ''), sp=A.get('sp', ''), usp=A.get('usp', ''), good=A.get('good', ''), bad=A.get('bad', ''), note=A.get('note', ''),
                      pics=pics, rep=rep))
lines.sort(key=lambda x: -x['rev'])
out['lines'] = lines
out['reviews'] = json.load(open(D + 'review_stats.json'))
# size split of beds per brand
out['bed_size'] = {b: {s: round(bed[(bed.brand == b) & (bed['size'] == s)].rev.sum()) for s in ['Twin', 'Full', 'Queen', 'King', 'Cal King']} for b in ['AllForWood', 'Bme']}
out['bed_rev'] = {b: round(bed[bed.brand == b].rev.sum()) for b in ['AllForWood', 'Bme']}

json.dump(out, open('/home/claude/site/data.json', 'w'), ensure_ascii=False, default=lambda o: None if (isinstance(o, float) and np.isnan(o)) else (o.item() if hasattr(o, 'item') else str(o)))
th = {}
for i in thumbs_used:
    try: th[i] = base64.b64encode(open(D + f'thumbs/{i}.jpg', 'rb').read()).decode()
    except FileNotFoundError: pass
json.dump(th, open('/home/claude/site/thumbs.json', 'w'))
print('lines', len(lines), 'thumbs', len(th), sum(len(v) for v in th.values()) // 1024, 'KB')
print(json.dumps({k: out[k] for k in ['kpi', 'wood_total', 'cluster', 'ss_brand', 'bed_rev']}, default=str, indent=0)[:2500])
for l in lines: print(l['brand'], l['line'], l['n'], l['sizes'], l['pmin'], l['pmax'], l['rev'], l['rating'], l['nrat'], l['hb'], l['mat'], l['dims'][:30], l['wt'])

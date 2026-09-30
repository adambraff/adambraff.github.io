import shapefile, json
from shapely.geometry import shape, LineString
from shapely.prepared import prep
pl = shapefile.Reader('place/tl_2025_44_place')
prov = shape(pl.shape(6).__geo_interface__).buffer(0.0005)
pp = prep(prov)
r = shapefile.Reader('tiger/tl_2025_44007_addrfeat')
names, idx, edges = [], {}, []
def hn(s):
    try: return int(s)
    except: return None
for sr in r.iterShapeRecords():
    rec = sr.record
    g = shape(sr.shape.__geo_interface__)
    if not pp.intersects(g): continue
    nm = rec['FULLNAME'].strip()
    if not nm: continue
    if nm not in idx: idx[nm] = len(names); names.append(nm)
    coords = [[round(x,5), round(y,5)] for x,y in g.coords]
    edges.append([idx[nm], hn(rec['LFROMHN']), hn(rec['LTOHN']), hn(rec['RFROMHN']), hn(rec['RTOHN']), coords])
json.dump({'source':'US Census TIGER/Line 2025 ADDRFEAT, Providence County, clipped to Providence city','names':names,'edges':edges}, open('streets.json','w'), separators=(',',':'))
print(len(names), len(edges))

# ---- compact version: clip to 2.6 mi around home, polyline-encode coords ----
import math
HOME = (41.82659, -71.39534)
def mi(lat, lon):
    dl = math.radians(lat-HOME[0]); dn = math.radians(lon-HOME[1])
    h = math.sin(dl/2)**2 + math.cos(math.radians(lat))*math.cos(math.radians(HOME[0]))*math.sin(dn/2)**2
    return 2*3958.8*math.asin(math.sqrt(h))
def enc_num(v):
    v = ~(v << 1) if v < 0 else (v << 1)
    out = ''
    while v >= 0x20:
        out += chr((0x20 | (v & 0x1f)) + 63); v >>= 5
    return out + chr(v + 63)
def encode(coords):
    out, plat, plon = '', 0, 0
    for lon, lat in coords:
        la, lo = round(lat*1e5), round(lon*1e5)
        out += enc_num(la-plat) + enc_num(lo-plon); plat, plon = la, lo
    return out
keep = [e for e in edges if any(mi(c[1], c[0]) <= 2.6 for c in e[5])]
used = sorted({e[0] for e in keep}); remap = {o:i for i,o in enumerate(used)}
cedges = [[remap[e[0]]] + [x if x is not None else '' for x in e[1:5]] + [encode(e[5])] for e in keep]
json.dump({'source':'US Census TIGER/Line 2025 ADDRFEAT, Providence city, within 2.6 mi of 56 Cooke St','enc':'polyline5','names':[names[i] for i in used],'edges':cedges}, open('streets.json','w'), separators=(',',':'))
print('compact', len(used), len(cedges))

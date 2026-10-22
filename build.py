import json,base64,glob,os
s=open('src/src.html').read()
for f in glob.glob('src/img/*.jpg'):
    k=os.path.basename(f)[:-4]
    s=s.replace(f'__IMG_{k}__','data:image/jpeg;base64,'+base64.b64encode(open(f,'rb').read()).decode())
import math
def clean(o):
    if isinstance(o,float) and (math.isnan(o) or math.isinf(o)): return None
    if isinstance(o,dict): return {k:clean(v) for k,v in o.items()}
    if isinstance(o,list): return [clean(v) for v in o]
    return o
d=json.dumps(clean(json.load(open('src/data.json'))),ensure_ascii=False).replace('</','<\\/')
s=s.replace('__DATA__',d).replace('__THUMBS__',open('src/thumbs.json').read())
assert '__IMG_' not in s
head='<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
s=s.replace('<style>','</head>\n<body>\n<style>',1) if False else s
i=s.index('<div class="ambient"')
s=head+s[:i]+'</head>\n<body>\n'+s[i:]+'\n</body>\n</html>\n'
open('index.html','w').write(s)
print(len(s)//1024,'KB')

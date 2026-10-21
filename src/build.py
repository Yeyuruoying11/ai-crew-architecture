import subprocess
subprocess.run(['python3','build_assets.py','assets.js'],check=True)
t=open('template.html',encoding='utf-8').read()
a=open('assets.js',encoding='utf-8').read()
page=t.replace('/*ASSETS*/',a)
open('page.html','w',encoding='utf-8').write(page)
head,body=page.split('<!--BODY-->',1)
html='<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+head.strip()+'\n</head>\n<body>\n'+body.strip()+'\n</body>\n</html>\n'
open('index.html','w',encoding='utf-8').write(html)
js=page.split('<script>')[1].split('</script>')[0]
open('check.js','w').write(js)

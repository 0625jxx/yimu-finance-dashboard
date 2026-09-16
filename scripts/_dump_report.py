# -*- coding: utf-8 -*-
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
flow = json.load(open(r'C:\Users\30216\Desktop\个人财务管理与可视化看板\scripts\_report_full.json', encoding='utf-8'))
for i, item in enumerate(flow):
    if item['k'] == 'P':
        print(i, '|', item['v'])
    else:
        print(i, '|', item['k'])

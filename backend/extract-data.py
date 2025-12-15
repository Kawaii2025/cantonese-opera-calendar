#!/usr/bin/env python3
"""
从 main.tsx 提取演出数据并生成 data.js
"""

import re
import json

# 读取 main.tsx 文件
with open('../src/main.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 查找所有 case 语句块
case_pattern = r"case '(\d{4}-\d{2}-\d{2})':\s*listData = \[(.*?)\];\s*break;"
matches = re.findall(case_pattern, content, re.DOTALL)

events_data = {}

for date, events_str in matches:
    # 查找所有事件对象
    event_pattern = r'\{\s*type:\s*[\'"](\w+)[\'"],\s*troupe:\s*[\'"]([^"]+)[\'"],\s*city:\s*[\'"]([^"]+)[\'"],\s*location:\s*[\'"]([^"]+)[\'"],\s*content:\s*[\'"]([^"]+)[\'"]\s*\}'
    
    events = []
    for match in re.finditer(event_pattern, events_str):
        events.append({
            'type': match.group(1),
            'troupe': match.group(2),
            'city': match.group(3),
            'location': match.group(4),
            'content': match.group(5)
        })
    
    if events:
        events_data[date] = events

# 生成 data.js 文件内容
output_lines = ['// 粤剧演出数据\nexport const eventsData = {']

for date in sorted(events_data.keys()):
    events = events_data[date]
    if len(events) == 1:
        event = events[0]
        line = f"  '{date}': [{{ type: '{event['type']}', troupe: '{event['troupe']}', city: '{event['city']}', location: '{event['location']}', content: '{event['content']}' }}],"
        output_lines.append(line)
    else:
        output_lines.append(f"  '{date}': [")
        for event in events:
            line = f"    {{ type: '{event['type']}', troupe: '{event['troupe']}', city: '{event['city']}', location: '{event['location']}', content: '{event['content']}' }},"
            output_lines.append(line)
        output_lines.append('  ],')

output_lines.append('};')

# 写入文件
with open('data.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print(f'✓ 成功提取 {len(events_data)} 个日期的演出数据')
print(f'✓ 已生成 data.js 文件')

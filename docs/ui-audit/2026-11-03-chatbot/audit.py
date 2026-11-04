import json, re, os
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
OUT=Path(os.environ.get('AUDIT_OUT', str(Path(__file__).resolve().parent)))
(OUT/'screenshots').mkdir(parents=True, exist_ok=True)
now=datetime.now(timezone.utc).isoformat()
state={'snapshot':None,'history':[], 'fail':False, 'response':'Mình đã ghi nhận. Bạn muốn ưu tiên công việc nào hôm nay?','interaction':None}
logs=[]; findings=[]
user={'_id':'ui-audit','name':'UI Reviewer','email':'review@example.test','role':'USER'}
def route(r):
 if not urlparse(r.request.url).path.startswith('/api/'): return r.continue_()
 p=r.request.url.split('/api/')[-1].split('?')[0]; method=r.request.method; body={}
 if p=='auth/me': body=user
 elif p=='tasks': body={'data':[], 'pageInfo':{'pageNo':1,'pageSize':10,'totalCount':0,'totalPage':0}}
 elif p.startswith('projects') or p.startswith('categories'): body=[]
 elif p.startswith('stats'): body={'totalTasks':0,'completedTasks':0,'inProgressTasks':0,'pendingTasks':0,'givenUpTasks':0,'dailyStats':[]}
 elif p=='ai/conversations' and method=='POST':
  cid=r.request.post_data_json['conversationId']; state['snapshot']={'conversationId':cid,'title':'UI review','mode':'auto','before':None,'pending':[],'messages':[]}; body={'conversationId':cid}
 elif p=='ai/conversations': body={'data':state['history']}
 elif p.startswith('ai/conversations'): body={'data':state['snapshot']}
 elif p=='ai/chat-mcp':
  payload=r.request.post_data_json
  if state['fail']: return r.fulfill(status=503,json={'message':'AI service temporarily unavailable. Please try again.'})
  snap=state['snapshot']; snap['mode']=payload.get('mode','auto')
  snap['messages'] += [{'id':payload['requestId'],'sender':'user','text':payload['userInput'],'timestamp':now},{'id':payload['requestId']+'bot','sender':'bot','text':state['response'],'timestamp':now}]
  if state['interaction']: snap['interaction']=state['interaction']
  body={'success':True,'data':state['response'],'status':'completed','conversationId':snap['conversationId'], **({'interaction':state['interaction']} if state['interaction'] else {})}
 r.fulfill(json=body)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path=os.environ.get('AUDIT_CHROMIUM'))
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page.on('pageerror',lambda e: (logs.append(str(e)),print('PAGEERROR',str(e),flush=True)))
 page.add_init_script('localStorage.setItem("token","audit-test-token"); localStorage.setItem("user",'+json.dumps(json.dumps(user))+'); localStorage.setItem("orbit-theme","light");')
 page.route('**/api/**',route)
 def shot(name):
  page.screenshot(path=str(OUT/'screenshots'/f'{name}.png'),full_page=True)
  print('SHOT',name,flush=True)
 def btn(name): return page.get_by_role('button',name=name,exact=True)
 def field(): return page.get_by_role('textbox',name='Message',exact=True)
 def reset():
  page.reload();page.wait_for_load_state('networkidle');btn('Open assistant').click();page.wait_for_timeout(350)
 page.goto(os.environ.get('AUDIT_URL','http://localhost:5000').rstrip('/')+'/dashboard');page.wait_for_load_state('networkidle');shot('01-dashboard')
 btn('Open assistant').click();page.wait_for_timeout(400);shot('02-empty-desktop')
 print('DOM',page.get_by_role('region',name='Assistant chat').inner_text(),flush=True)
 findings.append({'initialFocus':page.evaluate('({tag:document.activeElement.tagName,label:document.activeElement.getAttribute("aria-label")})')})
 btn('Expand options').click();page.wait_for_timeout(250);shot('03-toolbar-desktop')
 btn('Agent mode: auto').click();findings.append({'modeSwitch':btn('Agent mode: ask').count()})
 field().fill('/');page.wait_for_timeout(200);shot('04-slash-desktop')
 field().press('ArrowDown');field().press('Enter');shot('05-selected-skill')
 field().fill('Giúp tôi sắp xếp công việc hôm nay');btn('Send message').click();page.wait_for_timeout(500);shot('06-conversation')
 field().fill('Bản nháp chưa gửi');btn('Close chat').click();btn('Open assistant').click();page.wait_for_timeout(350)
 findings.append({'draftAfterClose':field().input_value()});shot('07-reopen-draft')
 btn('Expand chat').click();page.wait_for_timeout(250);shot('08-expanded')
 btn('Dock chat to right').click();page.wait_for_timeout(250);shot('09-docked')
 btn('Restore chat size').click();
 state['fail']=True;field().fill('Tạo kế hoạch cho tuần tới');btn('Send message').click();page.wait_for_timeout(400);shot('10-send-error')
 state['fail']=False;btn('Retry message').click();page.wait_for_timeout(400);shot('11-retry-success')
 btn('New chat').click();page.wait_for_timeout(300)
 page.get_by_label('Choose files',exact=True).set_input_files({'name':'notes.txt','mimeType':'text/plain','buffer':b'Plan next week'})
 shot('12-attachment-no-caption');findings.append({'attachmentOnlySendDisabled':btn('Send message').is_disabled()})
 page.get_by_label('Choose files',exact=True).set_input_files({'name':'archive.zip','mimeType':'application/zip','buffer':b'unsupported'})
 shot('13-attachment-validation')
 state['snapshot']=None;state['history']=[{'id':f'c{i}','title':t,'updatedAt':now} for i,t in enumerate(['Kế hoạch tuần tới','Luyện IELTS writing task 2','Lịch tập gym','Công việc tháng 11','Chuẩn bị bài thuyết trình'])];reset();shot('14-recent-history');btn('View all (5)').click();page.get_by_role('searchbox').fill('không tồn tại');shot('15-history-search-empty');page.get_by_role('searchbox').press('Escape')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250);shot('16-mobile-history')
 btn('Expand options').click();page.wait_for_timeout(250);shot('17-mobile-toolbar')
 findings.append({'mobileToolbarTextarea':field().bounding_box()})
 field().fill('/');page.wait_for_timeout(200);shot('18-mobile-slash');findings.append({'mobileSlashOverflow':page.get_by_role('listbox').evaluate('(e)=>({client:e.clientWidth,scroll:e.scrollWidth})')})
 field().fill('Lập kế hoạch tuần này');btn('Send message').click();page.wait_for_timeout(350)
 state['response']='## Kế hoạch tuần này\n\n| Ngày | Công việc | Kết quả mong đợi |\n|---|---|---|\n| Thứ hai | Hoàn thiện bản thiết kế giao diện dashboard | Bàn giao phiên bản đầy đủ để review |\n| Thứ ba | Kiểm thử chatbot trên điện thoại | Tổng hợp vấn đề và đề xuất |\n\n```javascript\nconst tasks = await fetch("https://example.test/api/tasks?status=pending&priority=high");\n```\n\n```mermaid\nflowchart LR\n A[Lập kế hoạch] --> B[Thực hiện] --> C[Đánh giá]\n```'
 field().fill('Trình bày bằng bảng, code và sơ đồ');btn('Send message').click();page.wait_for_timeout(1200);shot('19-mobile-rich-content')
 findings.append({'mobileDocumentWidth':page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')})
 page.set_viewport_size({'width':1440,'height':1000});page.wait_for_timeout(250);shot('20-desktop-rich-content')
 interaction={'id':'choice-review','kind':'clarification','status':'pending','question':'Bạn muốn ưu tiên nhóm công việc nào trong tuần này?','allowCustomAnswer':True,'options':[{'id':'work','label':'Công việc','description':'Hoàn thành các hạng mục quan trọng của dự án hiện tại.'},{'id':'health','label':'Sức khỏe','description':'Dành thời gian cho tập luyện và nghỉ ngơi.'},{'id':'study','label':'Học tập','description':'Duy trì lịch học IELTS mỗi ngày.'}]}
 state['snapshot']['interaction']=interaction;reset();shot('21-question-desktop');btn('Nhắn tin →').click();shot('22-message-instead');btn('← Back to question').click()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250);shot('23-question-mobile')
 page.get_by_role('radio',name='Công việc',exact=True).check();state['fail']=True;btn('Send answer').click();page.wait_for_timeout(350);shot('24-answer-error-mobile')
 findings.append({'errorQuestionText':page.get_by_role('region',name='Assistant chat').inner_text()})
 page.set_viewport_size({'width':390,'height':500});page.wait_for_timeout(250);shot('25-short-mobile-viewport')
 state['fail']=False
 state['snapshot'].pop('interaction',None)
 page.set_viewport_size({'width':390,'height':844});reset()
 scroller=page.locator('.ui-assistant-panel .overflow-y-auto').first
 scroller.evaluate('(e)=>e.scrollTop=0');shot('26-mobile-table-top')
 print('BUTTONS',page.get_by_role('button').all_text_contents(),flush=True)
 theme=page.get_by_role('button',name=re.compile('dark',re.I))
 if theme.count():
  theme.first.click();shot('27-dark-mobile')
 page.set_viewport_size({'width':1440,'height':1000})
 state['snapshot']['interaction']={**interaction,'id':'confirm-review','kind':'confirmation','question':'Tạo 3 công việc cho tuần này?','allowCustomAnswer':False,'options':[{'id':'confirm','label':'Tạo 3 công việc'},{'id':'cancel','label':'Hủy'}],'details':[{'label':'Dự án','value':'Kế hoạch cá nhân'},{'label':'Hạn hoàn thành','value':'06/11/2026'}]}
 reset();shot('28-confirmation')
 state['snapshot'].pop('interaction',None);reset()
 field().fill('Dòng đầu');field().press('Shift+Enter');field().type('Dòng thứ hai')
 findings.append({'shiftEnterDraft':field().input_value()});shot('29-multiline')
 field().fill('');btn('Expand options').click();page.wait_for_timeout(250)
 findings.append({'sendDisabledStyle':btn('Send message').evaluate('(e)=>({disabled:e.disabled,background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})')})
 field().focus();page.wait_for_timeout(250);field().press('Shift+Tab')
 findings.append({'tabBackFromInput':page.evaluate('({label:document.activeElement.getAttribute("aria-label"),rect:document.activeElement.getBoundingClientRect().toJSON()})')})
 shot('30-keyboard-focus')
 OUT.joinpath('observations.json').write_text(json.dumps({'findings':findings,'pageErrors':logs},ensure_ascii=False,indent=2))
 browser.close()

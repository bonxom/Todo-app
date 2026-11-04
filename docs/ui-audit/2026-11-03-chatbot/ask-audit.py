"""Ask-mode browser audit. API is simulated; assertions exercise actual frontend."""
import copy
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent
(OUT / 'ask-screenshots').mkdir(exist_ok=True)
NOW = datetime.now(timezone.utc).isoformat()
USER = {'_id':'ask-audit','name':'Ask Reviewer','email':'ask@example.test','role':'USER'}
QUESTION = {'id':'ask-choice','kind':'clarification','status':'pending','question':'Bạn muốn học tiếng Anh theo hướng nào?','allowCustomAnswer':True,'options':[
 {'id':'daily','label':'Thói quen nhẹ mỗi ngày','description':'15 phút mỗi ngày, dễ duy trì khi bận rộn.'},
 {'id':'speaking','label':'Tập trung giao tiếp','description':'30 phút luyện nói, ưu tiên phản xạ trong công việc.'},
 {'id':'exam','label':'Luyện thi IELTS','description':'60 phút mỗi ngày, luyện theo mục tiêu điểm số.'}]}
CONFIRM = {**QUESTION,'id':'old-confirmation','kind':'confirmation','question':'Tạo 3 công việc học tiếng Anh?','allowCustomAnswer':False,'options':[{'id':'confirm','label':'Tạo 3 công việc'},{'id':'cancel','label':'Hủy'}]}
state = {'snapshot':None,'failure':None,'requests':[]}
checks=[]; errors=[]
def record(name, passed, details=None):
 checks.append({'name':name,'passed':passed,'details':details})
 print(name, passed, flush=True)
def route(r):
 path=urlparse(r.request.url).path
 if not path.startswith('/api/'): return r.continue_()
 method=r.request.method; body={}
 if path=='/api/auth/me': body=USER
 elif path=='/api/tasks': body={'data':[],'pageInfo':{'pageNo':1,'pageSize':10,'totalCount':0,'totalPage':0}}
 elif path.startswith('/api/projects') or path.startswith('/api/categories'): body=[]
 elif path.startswith('/api/stats'): body={'totalTasks':0,'completedTasks':0,'inProgressTasks':0,'pendingTasks':0,'givenUpTasks':0,'dailyStats':[]}
 elif path=='/api/ai/conversations' and method=='POST':
  cid=r.request.post_data_json['conversationId']
  state['snapshot']={'conversationId':cid,'mode':'auto','messages':[],'pending':[],'before':None,'title':'Học tiếng Anh'}
  body={'conversationId':cid}
 elif path=='/api/ai/conversations': body={'data':[]}
 elif path.startswith('/api/ai/conversations/'): body={'data':state['snapshot']}
 elif path=='/api/ai/chat-mcp':
  data=r.request.post_data_json;state['requests'].append(data)
  if state['failure']:
   return r.fulfill(status=state['failure'],json={'message':'Không gửi được câu trả lời. Vui lòng thử lại.'})
  snap=state['snapshot'];snap['mode']=data['mode'];sel=data.get('selection');pending=snap.get('interaction')
  if pending:
   resolved=copy.deepcopy(pending)
   cancelled=not sel or sel.get('cancel',False)
   resolved['status']='cancelled' if cancelled else 'answered'
   resolved['answer']={'optionId':'cancel'} if cancelled else {k:sel[k] for k in ['optionId','customAnswer'] if k in sel}
   for m in snap['messages']:
    if m.get('interaction',{}).get('id')==pending['id']: m['interaction']=resolved
   snap.pop('interaction',None)
  snap['messages'].append({'id':data['requestId'],'sender':'user','text':data['userInput'],'timestamp':NOW,**({'replyToInteractionId':sel['interactionId']} if sel else {})})
  if not pending and data['userInput']=='Tôi muốn học tiếng Anh':
   question=copy.deepcopy(QUESTION);question['id']=data['requestId']+'-question';snap['interaction']=question
   snap['messages'].append({'id':data['requestId']+'bot','sender':'bot','text':question['question'],'timestamp':NOW,'interaction':question})
   body={'data':question['question'],'interaction':question,'status':'completed','conversationId':snap['conversationId']}
  else:
   response='Đã hủy yêu cầu.' if sel and sel.get('cancel') else 'Đã nhận lựa chọn của bạn. Đây là phản hồi mô phỏng để kiểm tra UI.'
   snap['messages'].append({'id':data['requestId']+'bot','sender':'bot','text':response,'timestamp':NOW})
   body={'data':response,'status':'completed','conversationId':snap['conversationId']}
 r.fulfill(json=body)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('AUDIT_CHROMIUM'))
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('localStorage.setItem("token","ask-audit-token");localStorage.setItem("user",'+json.dumps(json.dumps(USER))+');localStorage.setItem("orbit-theme","light");')
 page.route('**/api/**',route)
 def button(name):return page.get_by_role('button',name=name,exact=True)
 def field():return page.get_by_role('textbox',name='Message',exact=True)
 def shot(name):
  page.screenshot(path=str(OUT/'ask-screenshots'/f'{name}.png'),full_page=False)
 def settle():page.wait_for_timeout(250)
 def open_page():
  page.goto(os.environ.get('AUDIT_URL','http://localhost:5000')+'/dashboard');page.wait_for_load_state('networkidle');button('Open assistant').click();settle()
 def begin():
  state['failure']=None;button('New chat').click();settle()
  button('Expand options').click();button('Agent mode: auto').click()
  field().fill('Tôi muốn học tiếng Anh');button('Send message').click()
  expect(page.get_by_role('radio',name='Thói quen nhẹ mỗi ngày')).to_be_visible()
 def choose():page.get_by_role('radio',name='Thói quen nhẹ mỗi ngày',exact=True).check()
 def send_answer():button('Send answer').click();settle()
 open_page();begin()
 record('First request explicitly sends mode=ask',state['requests'][-1]['mode']=='ask')
 record('No option selected by default',page.get_by_role('radio',checked=True).count()==0)
 record('Send answer disabled before choosing',button('Send answer').is_disabled());shot('01-ask-question-desktop')
 choose();shot('02-option-selected');send_answer()
 record('Option payload includes interactionId and optionId',state['requests'][-1].get('selection',{}).get('optionId')=='daily',state['requests'][-1])
 expect(page.get_by_text('Đã nhận lựa chọn của bạn.',exact=False)).to_be_visible();shot('03-answer-success')
 page.reload();page.wait_for_load_state('networkidle');button('Open assistant').click();settle()
 record('Ask restored after reload',page.get_by_role('combobox',name='Agent mode').input_value()=='ask');shot('04-reload-history')
 begin();page.get_by_role('textbox',name='Other answer',exact=True).fill('Chỉ học buổi sáng, 20 phút');send_answer()
 record('Custom answer sends no optionId',state['requests'][-1].get('selection',{}).get('customAnswer')=='Chỉ học buổi sáng, 20 phút' and 'optionId' not in state['requests'][-1]['selection']);shot('05-custom-answer')
 begin();button('Nhắn tin →').click();field().fill('Tôi muốn đổi sang học tiếng Nhật');shot('06-message-instead');button('Send message').click();settle()
 record('Message instead sends ask without selection',state['requests'][-1]['mode']=='ask' and 'selection' not in state['requests'][-1]);shot('07-replaced-question')
 begin();button('Cancel').click();settle()
 record('Cancel sends selection.cancel=true',state['requests'][-1].get('selection',{}).get('cancel') is True);shot('08-cancelled')
 begin();choose();state['failure']=503;send_answer();expect(page.get_by_role('alert')).to_be_visible();shot('09-answer-503')
 record('Failure still shows success-like answer summary',page.get_by_text('Bạn đã chọn',exact=True).is_visible())
 failed=copy.deepcopy(state['requests'][-1]);state['failure']=None;button('Retry message').click();settle()
 record('Retry preserves full payload and requestId',state['requests'][-1]==failed);shot('10-retry-recovered')
 begin();choose();state['failure']=422;send_answer();shot('11-answer-422')
 record('422 removes retry action',button('Retry message').count()==0)
 state['failure']=None;button('Reload conversation').click();settle();shot('12-after-reload-422')
 record('After 422 reload user can select answer again',page.get_by_role('radio',name='Thói quen nhẹ mỗi ngày').count()>0)
 # New chat intentionally measured before switching back to Ask.
 button('New chat').click();settle()
 record('New chat resets selected Ask mode to Auto',page.get_by_role('combobox',name='Agent mode').input_value()=='auto');shot('13-new-chat-resets-mode')
 begin();page.set_viewport_size({'width':390,'height':844});settle();shot('14-mobile-ask-question')
 custom=page.get_by_role('textbox',name='Other answer',exact=True);custom.scroll_into_view_if_needed();custom.fill('Tôi chỉ có 10 phút mỗi ngày');shot('15-mobile-custom-answer');send_answer();shot('16-mobile-answer-success')
 record('Mobile custom answer reaches API in Ask mode',state['requests'][-1]['mode']=='ask' and 'customAnswer' in state['requests'][-1].get('selection',{}))
 # Historical confirmation rendering: not a claim that current agent always asks before writes.
 state['snapshot']['interaction']=copy.deepcopy(CONFIRM)
 state['snapshot']['messages'].append({'id':'legacy','sender':'bot','text':CONFIRM['question'],'timestamp':NOW,'interaction':copy.deepcopy(CONFIRM)})
 page.reload();page.wait_for_load_state('networkidle');button('Open assistant').click();settle();shot('17-legacy-confirmation-mobile')
 page.get_by_role('radio',name='Tạo 3 công việc',exact=True).check();button('Confirm').click();settle()
 record('Historical confirmation sends explicit optionId',state['requests'][-1].get('selection',{}).get('optionId')=='confirm');shot('18-confirm-success')
 state['snapshot']['interaction']={**copy.deepcopy(CONFIRM),'id':'cancel-confirm'}
 page.reload();page.wait_for_load_state('networkidle');button('Open assistant').click();settle();button('Cancel').click();settle()
 record('Historical confirmation can be cancelled',state['requests'][-1].get('selection',{}).get('cancel') is True);shot('19-confirm-cancel')
 OUT.joinpath('ask-observations.json').write_text(json.dumps({'scope':'Actual UI, mocked API; no live AI or database','checks':checks,'pageErrors':errors,'requests':state['requests']},ensure_ascii=False,indent=2))
 browser.close()

"""Deterministic fictional layout mockups. Never reads a Herdr session or user data."""
from pathlib import Path
import math,json
from PIL import Image, ImageDraw, ImageFont
import pyfiglet,imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2]
W,H=1280,800
FONT='/System/Library/Fonts/Menlo.ttc'
fonts={n:ImageFont.truetype(FONT,n) for n in [10,11,12,13,14,15,16,18,20,25,32]}
def rgb(c):return tuple(bytes.fromhex(c.lstrip('#')[:6]))
def mix(a,b,t):return tuple(int(x*(1-t)+y*t) for x,y in zip(rgb(a),rgb(b)))
def frame(name,t):
 night=name=='nightwire'; title='NIGHTWIRE' if night else 'NEON CUSTOM'
 theme=json.loads((ROOT/name/'themes'/f'{name}.json').read_text());c=theme['colors']; bg=c['background'];accent=c['accent'];pink=c['working'];fg=c['foreground'];dim=c['dim'];muted=c['muted']
 im=Image.new('RGB',(W,H),bg);d=ImageDraw.Draw(im)
 def box(rect,fill,outline=None,r=8,width=1):d.rounded_rectangle(rect,radius=r,fill=fill,outline=outline,width=width)
 def text(x,y,s,col=fg,size=13):d.text((x,y),s,font=fonts[size],fill=col)
 def pill(x,y,label,col,w=None):
  w=w or int(d.textlength(label,font=fonts[11]))+16;box((x,y,x+w,y+22),mix(bg,col,.15));text(x+8,y+4,label,col,11);return w
 def spin(x,y,col):
  ang=int(t*360)%360;d.arc((x-6,y-6,x+6,y+6),ang,ang+270,fill=col,width=2)
 def dot(x,y,col):d.ellipse((x-3,y-3,x+3,y+3),fill=col)
 # outer app and sidebar; composition follows packaged tree
 d.rectangle((0,0,248,H),fill=c['chrome']);d.line((248,0,248,H),fill=c['border'])
 for x,col in [(22,'#ff5f56'),(42,'#ffbd2e'),(62,'#27c93f')]:d.ellipse((x-5,18,x+5,28),fill=col)
 text(101,18,title,accent,13)
 for i,label in enumerate(['⌂  Home','＋  New session','◉  Agents · 4 working','⌕  Search','◇  More']):text(22,65+i*29,label,muted,13)
 text(20,229,'WORKSTREAMS',pink,11);text(218,226,'+',dim,16)
 for i,(label,machine,col) in enumerate([('Atlas UI','local',accent),('Relay API','relay',c['ansi4'] if 'ansi4'in c else '#7fb2e8'),('Orbit Docs','build','#e6c15c')]):
  y=260+i*(83 if not night else 46)
  if i==0:box((10,y-5,237,y+(73 if not night else 34)),c['selected'])
  text(21,y,'⌄ '+label,fg,13);pill(169,y-2,machine,col,60)
  if not night:
   text(38,y+26,'launch-kit',muted,11)
   pill(36,y+45,'P1  Forge',pink,91);pill(133,y+45,'P2  Scout',accent,91)
 sy=425 if night else 550;text(20,sy,'SESSIONS · ALL SPACES',dim,11);text(20,sy+30,'Today',pink,11)
 for i,label in enumerate(['launch-kit','contract-tests','docs-pass']):
  y=sy+58+i*31;dot(26,y+6,pink if i<2 else accent);text(40,y,label,muted,12)
 d.line((12,H-53,235,H-53),fill=c['border']);pill(18,H-39,'D',accent,28);text(57,H-35,'demo operator',muted,12)
 top=44
 if night:
  d.rectangle((249,0,W,174),fill=c['surface']);text(265,13,'FLEET PLACEMENT',pink,11);text(411,13,'6 agents · machine / space / session / pane',dim,10)
  pill(846,8,'Glass blocks ›',muted,115);pill(970,8,'All spaces',accent,91);text(1078,13,'This space   Collapse',dim,10)
  for i,(host,space,session) in enumerate([('local','Atlas UI','launch-kit'),('relay','Relay API','contract-tests'),('build','Orbit Docs','docs-pass')]):
   x=262+i*332;box((x,43,x+319,160),c['selected'] if i==0 else c['chrome'],pink if i==0 else c['border'],10)
   pill(x+10,52,host,accent if i==0 else '#7fb2e8',58);text(x+79,56,space,muted,12);text(x+11,81,session,fg,13)
   for j,n in enumerate(['Forge','Scout'] if i==0 else ['Vector','Echo'] if i==1 else ['Quill','Shell']):
    px=x+10+j*151;box((px,105,px+143,151),c['raised'],accent if i==j==0 else c['border'],7)
    text(px+7,111,f'P{j+1}  {n}',fg,11);text(px+7,130,'done' if t>6.5 and j==1 else 'working',accent if t>6.5 and j==1 else pink,10)
  top=186
 else:
  text(270,16,'Atlas UI  /  launch-kit',muted,13);text(1040,16,'2 panes · local',accent,12)
 # subtle stationary glass-block background (not fake animated wallpaper)
 for i in range(16):
  x=280+(i*71)%940;y=H-83-(i%4)*37
  box((x,y,x+48,y+31),mix(bg,pink if i%2 else accent,.045),mix(bg,accent,.12),5)
 x1,x2=261,770;pw=496;bottom=H-43
 for j,x in enumerate([x1,x2]):
  box((x,top,x+pw,bottom),mix(bg,c['surface'],.45),accent if j==0 else c['border'],10,width=2 if j==0 else 1)
  box((x+2,top+2,x+pw-2,top+34),c['raised'] if j==0 else c['surface'],r=8)
  text(x+12,top+10,f'P{j+1}',accent if j==0 else dim,11);text(x+45,top+9,'Forge' if j==0 else 'Scout',fg,12);pill(x+103,top+5,'local',accent,54);text(x+168,top+9,'~/demo/atlas-ui',dim,11)
  spin(x+pw-20,top+17,pink)
 # left: stepped typing, then ASCII reveal
 x=x1+19;y=top+58
 cmd='figlet -f small '+('NIGHTWIRE' if night else 'NEON')
 text(x,y,'demo@local:~$',accent,12)
 typed=cmd[:max(0,int((t-.2)*23))];text(x,y+26,typed,fg,13)
 if .2<t<1.9:d.rectangle((x+len(typed)*8,y+28,x+len(typed)*8+7,y+41),fill=accent)
 art=pyfiglet.figlet_format('NIGHTWIRE' if night else 'NEON',font='small').rstrip().splitlines()
 for i,line in enumerate(art):
  if t>1.8+i*.12:text(x,y+65+i*18,line,accent if i<2 else pink,12)
 lines=[('$ cat /etc/motd',fg),('panes in focus. fleet in view.',muted),('',fg),('◆ Atlas UI / launch-kit',fg),('  P1 Forge   → building components',pink),('  P2 Scout   → running checks',accent)]
 for i,(s,col) in enumerate(lines):
  start=2.8+i*.28
  if t>start:text(x,y+180+i*26,s[:int((t-start)*40)],col,12)
 if t>5.2:
  text(x,y+365,'[ '+('█'*min(28,int((t-5.2)*18))).ljust(28)+' ]',accent,12)
 if t>6.9:text(x,y+400,'✓ preview ready · 128 checks passed',accent,12)
 # right: fictional agent progress and animated ASCII waveform
 x=x2+19;y=top+58;text(x,y,'$ scout verify --watch',fg,13)
 entries=[('Inspecting component contracts',.4),('Checking keyboard navigation',1.4),('Reviewing pane placement',2.7),('Testing across workstreams',4.0)]
 for i,(s,delay) in enumerate(entries):
  if t>delay:
   done=t>delay+1.5; text(x,y+45+i*36,('✓ ' if done else '› ')+s,accent if done else pink,12)
 text(x,y+218,'SIGNAL / 6 AGENTS CONNECTED',dim,11)
 for r in range(5):
  wave=''.join('█' if (math.sin(k*.32+t*2)+math.cos(k*.18-t)*.7+1.7)*1.4>5-r else ' ' for k in range(45))
  text(x,y+246+r*16,wave,mix(pink,accent,r/4),12)
 if t>6.5:
  box((x,y+355,x+455,y+408),mix(bg,accent,.09),mix(bg,accent,.4));text(x+13,y+367,'✓ All checks passed',accent,13);text(x+13,y+388,'Ready for review. No deploy triggered.',muted,11)
 elif t>3:text(x,y+365,'waiting for workers'+'.'*(int(t*3)%4),muted,12)
 if int(t*2)%2==0:text(x,y+438,'▌',accent,14)
 d.rectangle((249,H-30,W,H),fill=c['chrome']);text(263,H-23,'◉  local   /   Atlas UI   /   launch-kit',muted,11);text(920,H-23,'ANIMATED MOCKUP · FICTIONAL DATA',dim,10)
 return im
if __name__=='__main__':
 for name in ['neon-custom','nightwire']:
  out=ROOT/name/'assets';out.mkdir(exist_ok=True)
  frames=[frame(name,n/15) for n in range(135)]
  frames[-1].save(ROOT/name/'preview.png')
  frames[-1].save(out/'poster.png')
  frames[::2][0].save(out/'demo.gif',save_all=True,append_images=frames[::2][1:],duration=133,loop=0,optimize=True)
  writer=imageio_ffmpeg.write_frames(str(out/'demo.mp4'),(W,H),fps=15,codec='libx264',quality=8,macro_block_size=1)
  writer.send(None)
  for f in frames:writer.send(f.tobytes())
  writer.close()
  print('rendered',name,flush=True)

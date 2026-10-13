"""Trim actual browser recordings, add quiet fades, and export H.264 delivery files.

Requires ffmpeg and ffprobe on PATH. Run record-update-demo.mjs first.
The last N seconds of each independent page recording contain its warmed, fixed shot.
"""
import hashlib,json,pathlib,shutil,subprocess

ROOT=pathlib.Path(__file__).resolve().parents[1]
folder=ROOT/'artifacts/upgrade-20261013/demo'
recording=json.loads((folder/'recording.json').read_text(encoding='utf-8'))
mobile_card=ROOT/'docs/images/mobile-quality-20261013.png'
if mobile_card.exists():
 recording['shots'].append({'id':'09b-mobile','seconds':7,'image':str(mobile_card)})
 recording['shots'].sort(key=lambda shot:shot['id'])
ffmpeg=shutil.which('ffmpeg');ffprobe=shutil.which('ffprobe')
if not ffmpeg or not ffprobe:raise SystemExit('ffmpeg and ffprobe are required')
clips=folder/'clips';clips.mkdir(exist_ok=True)
def run(arguments):subprocess.run(arguments,check=True,cwd=ROOT)
def probe(path):
 return json.loads(subprocess.check_output([ffprobe,'-v','error','-show_format','-show_streams','-of','json',str(path)],text=True,encoding='utf-8'))
report=[]
for shot in recording['shots']:
 duration=shot['seconds']
 if 'image' in shot:
  source=['-loop','1','-framerate','25','-i',shot['image']];raw_seconds=duration;start=0
 else:
  raw=ROOT/shot['raw'];info=probe(raw);raw_seconds=float(info['format']['duration'])
  start=max(0,raw_seconds-duration-.08);source=['-ss',str(start),'-i',str(raw)]
 target=clips/f"{shot['id']}.mp4"
 run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y',*source,'-t',str(duration),'-an',
  '-vf',f'fps=25,format=yuv420p,fade=t=in:st=0:d=0.2,fade=t=out:st={duration-.2}:d=0.2',
  '-c:v','libx264','-preset','medium','-crf','18','-threads','4','-movflags','+faststart',str(target)])
 report.append({'id':shot['id'],'rawSeconds':raw_seconds,'trimStart':start,'seconds':duration,'file':str(target.relative_to(ROOT))})
 print('Encoded',shot['id'],flush=True)
concat=clips/'concat.txt'
concat.write_text('\n'.join(f"file '{shot['id']}.mp4'" for shot in recording['shots']),encoding='utf-8')
master=folder/'aks-campus-update-20261013-1080p.mp4'
run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(master)])
media=ROOT/'public/media';media.mkdir(exist_ok=True)
web=media/'aks-campus-update-20261013.mp4'
run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(master),'-an','-c:v','libx264','-preset','slow','-crf','23','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',str(web)])
poster=ROOT/'docs/images/update-demo-20261013.jpg'
run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-ss','2','-i',str(master),'-frames:v','1','-q:v','3',str(poster)])
files=[]
for path in [master,web]:
 run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-i',str(path),'-f','null','-'])
 info=probe(path)
 files.append({'path':str(path.relative_to(ROOT)),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'probe':info})
(folder/'encoded-evidence.json').write_text(json.dumps({'source':recording['base'],'clips':report,'files':files},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'path':f['path'],'bytes':f['bytes'],'duration':f['probe']['format']['duration']} for f in files]),flush=True)

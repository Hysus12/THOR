"""Local stand-in for the ESP8266 servo firmware, so the five UI variants can be tried without the board.

    python mock_server.py [port]        ->  http://127.0.0.1:8770/

Serves dist/<style>.html and fakes the firmware endpoints (/status /servo /control /jog /stop /schedules
/schedule/add /schedule/delete) with the same JSON shapes and limits.
Theme switching is available in the page's Advanced settings.
"""
import json, os, sys, threading, time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, 'dist')
TZ = timezone(timedelta(hours=8))
STYLES = [('apple', 'Apple'), ('google', 'Google')]
TURN_K = 1.4918

lock = threading.Lock()
S = dict(boot=time.time(), output=1500, attached_until=0.0, running=False, mode='none', stop_at=0.0, neutral=1500,
         sch=[dict(enabled=True, days=31, hour=7, minute=0, direction='cw', speed=100, turns=1.3, msrev=1000),
              dict(enabled=True, days=96, hour=8, minute=30, direction='cw', speed=100, turns=1.3, msrev=1000)],
         last_run={})


def now():
    return datetime.now(TZ)


def start_motion(direction, speed, neutral, duration, mode):
    S['neutral'] = max(500, min(2500, neutral))
    span = S['neutral'] - 500 if direction == 'cw' else 2500 - S['neutral']
    off = span * speed // 100
    S['output'] = max(500, min(2500, S['neutral'] + (-off if direction == 'cw' else off)))
    S['running'], S['mode'], S['stop_at'] = True, mode, time.time() + duration
    S['attached_until'] = S['stop_at'] + 1


def stop_motion():
    S['running'], S['mode'] = False, 'none'
    S['attached_until'] = 0
    S['output'] = S['neutral']


def tick():
    while True:
        time.sleep(0.5)
        with lock:
            t = time.time()
            if S['running'] and t >= S['stop_at']:
                stop_motion()
            n = now()
            key = n.strftime('%Y%j')
            for i, it in enumerate(S['sch']):
                if (it['enabled'] and it['days'] & (1 << n.weekday()) and it['hour'] == n.hour and it['minute'] == n.minute
                        and S['last_run'].get(i) != key):
                    S['last_run'][i] = key
                    if not S['running']:
                        start_motion(it['direction'], it['speed'], 1500, min(21600, it['turns'] * it['msrev'] * TURN_K / 1000), 'turns')


def js(handler, code, obj):
    b = json.dumps(obj, ensure_ascii=False).encode()
    handler.send_response(code)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Cache-Control', 'no-store')
    handler.send_header('Content-Length', str(len(b)))
    handler.end_headers()
    handler.wfile.write(b)


def num(q, k, d, lo, hi, cast=float):
    try:
        v = cast(float(q.get(k, [d])[0]))
    except ValueError:
        v = d
    return max(lo, min(hi, v))


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        p = u.path.rstrip('/') or '/'
        with lock:
            if p == '/status':
                n = now()
                rem = max(0, int((S['stop_at'] - time.time()) * 1000)) if S['running'] else 0
                return js(self, 200, dict(wifiConnected=True, ip='192.168.1.57', rssi=-58, localTime=n.strftime('%Y-%m-%d %H:%M:%S'),
                                          timeSynced=True, scheduleCount=len(S['sch']), servoPwm=time.time() < S['attached_until'],
                                          uptimeSec=int(time.time() - S['boot']), running=S['running'], mode=S['mode'],
                                          remainingMs=rem, output=S['output']))
            if p == '/servo':
                if 'angle' not in q:
                    return js(self, 400, {'error': 'missing angle'})
                a = int(num(q, 'angle', 90, 0, 180))
                stop_motion()
                S['output'] = 500 + round(a * 1000 / 180)
                S['attached_until'] = time.time() + 1.5
                return js(self, 200, {'angle': a})
            if p == '/control':
                mode = q.get('mode', [''])[0]
                d = 'ccw' if q.get('direction', [''])[0] == 'ccw' else 'cw'
                sp = int(num(q, 'speed', 50, 1, 100))
                ne = int(num(q, 'neutral', 1500, 500, 2500))
                if mode == 'turns':
                    t, ms = num(q, 'turns', 1, .1, 1000), num(q, 'msrev', 1200, 100, 60000)
                    dur = t * ms * TURN_K / 1000
                    msg = f'已啟動 {t:.1f} 圈，預計 {dur:.1f} 秒'
                elif mode == 'timed':
                    sec = num(q, 'seconds', 5, .1, 21600)
                    dur, msg = sec, f'已啟動定時運轉，預計 {sec:.1f} 秒'
                else:
                    return js(self, 400, {'error': 'invalid mode'})
                start_motion(d, sp, ne, max(.1, min(21600, dur)), mode)
                return js(self, 200, {'running': True, 'message': msg})
            if p == '/jog':
                d = 'ccw' if q.get('direction', [''])[0] == 'ccw' else 'cw'
                start_motion(d, int(num(q, 'speed', 50, 1, 100)), int(num(q, 'neutral', 1500, 500, 2500)), 2.0, 'jog')
                return js(self, 200, {'running': True, 'mode': 'jog'})
            if p == '/stop':
                stop_motion()
                return js(self, 200, {'running': False, 'message': '已停止'})
            if p == '/schedules':
                n = now()
                return js(self, 200, dict(timeSynced=True, localTime=n.strftime('%Y-%m-%d %H:%M:%S'),
                                          items=[dict(id=i, **it) for i, it in enumerate(S['sch'])]))
            if p == '/schedule/add':
                if len(S['sch']) >= 8:
                    return js(self, 400, {'error': '最多只能建立 8 筆排程'})
                S['sch'].append(dict(enabled=True, days=int(num(q, 'days', 1, 1, 127)), hour=int(num(q, 'hour', 0, 0, 23)),
                                     minute=int(num(q, 'minute', 0, 0, 59)), direction='ccw' if q.get('direction', [''])[0] == 'ccw' else 'cw',
                                     speed=int(num(q, 'speed', 50, 1, 100)), turns=round(num(q, 'turns', 1, .1, 1000), 1),
                                     msrev=int(num(q, 'msrev', 1200, 100, 60000))))
                return js(self, 200, {'ok': True})
            if p == '/schedule/delete':
                i = int(num(q, 'id', -1, -1, 99))
                if i < 0 or i >= len(S['sch']):
                    return js(self, 400, {'error': '無效的排程 ID'})
                S['sch'].pop(i)
                S['last_run'] = {}
                return js(self, 200, {'ok': True})
        # ---- pages
        name = p.strip('/')
        if name.endswith('.html'):
            name = name[:-5]
        if name in ('', 'index'):
            name = 'index'
        f = os.path.join(DIST, name + '.html')
        if (name in dict(STYLES) or name == 'index') and os.path.exists(f):
            html = open(f, encoding='utf8').read()
            b = html.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(b)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(b)
            return
        self.send_response(404)
        self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
    threading.Thread(target=tick, daemon=True).start()
    print(f'mock ESP + UI variants on http://127.0.0.1:{port}/')
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()

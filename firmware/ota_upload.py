"""Upload firmware or the web filesystem over Wi-Fi, without printing credentials."""
from pathlib import Path
import argparse
import os
import base64
import json
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
BUILD = Path(os.environ.get('THOR_BUILD', ROOT / 'build')) / 'build'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('kind', choices=('firmware', 'filesystem'))
    parser.add_argument('--file', type=Path)
    args = parser.parse_args()
    credentials = json.loads((ROOT / '.local/ota-access.json').read_text(encoding='utf-8'))
    name = 'curtain_controller.ino.bin' if args.kind == 'firmware' else 'curtain_controller.littlefs.bin'
    artifact = args.file or BUILD / name
    boundary = 'curtain-' + uuid.uuid4().hex
    payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="{args.kind}"; filename="{artifact.name}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()
               + artifact.read_bytes() + f'\r\n--{boundary}--\r\n'.encode())
    auth = base64.b64encode((credentials['username'] + ':' + credentials['password']).encode()).decode()
    request = urllib.request.Request('http://' + credentials['host'] + '/update', data=payload, method='POST', headers={
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Connection': 'close',
    })
    with urllib.request.urlopen(request, timeout=120) as response:
        result = response.read().decode('utf-8')
        if response.status != 200 or '更新完成' not in result:
            raise SystemExit('OTA did not report success.')
    print(f'OTA {args.kind} succeeded; device is restarting.')


if __name__ == '__main__':
    main()

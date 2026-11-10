"""Build the controller and LittleFS image using the installed Arduino toolchain.
Credentials and generated binaries stay outside tracked source files.
"""
from pathlib import Path
import argparse
import os
import os
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SKETCH = ROOT / 'firmware/curtain_controller'
UI = ROOT / 'web-ui'
# 舊版 ESP8266 工具鏈遇到中文路徑會出錯，必要時用 THOR_BUILD 指到純英文路徑
WORK = Path(os.environ.get('THOR_BUILD', ROOT / 'build'))
CLI = Path.home() / 'AppData/Local/Programs/Arduino IDE/resources/app/lib/backend/resources/arduino-cli.exe'
PACKAGES = Path.home() / 'AppData/Local/Arduino15/packages/esp8266'
CORE = PACKAGES / 'hardware/esp8266/3.1.2'
PYTHON = PACKAGES / 'tools/python3/3.7.2-post1/python.exe'
MKFS = PACKAGES / 'tools/mklittlefs/3.1.0-gcc10.3-e5f9fec/mklittlefs.exe'
FQBN = 'esp8266:esp8266:nodemcuv2:eesz=4M2M'


def run(args):
    subprocess.run([str(arg) for arg in args], check=True)


def esptool(*args):
    code = f'import sys;sys.path[:0]={[str(CORE / "tools/pyserial"), str(CORE / "tools/esptool")]!r};import esptool;esptool.main()'
    run([PYTHON, '-c', code, *args])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--usb', help='Flash both compiled images over the specified USB port')
    parser.add_argument('--build-only', action='store_true')
    args = parser.parse_args()
    staged = WORK / 'curtain_controller'
    build = WORK / 'build'
    data = staged / 'data'
    for directory in (staged, build, data):
        directory.mkdir(parents=True, exist_ok=True)
    for pattern in ('*.ino', '*.h'):
        for source in SKETCH.glob(pattern):
            shutil.copy2(source, staged / source.name)
    if not (staged / 'secrets.h').exists():
        raise SystemExit('Missing local secrets.h; see firmware/README.md.')
    run([sys.executable, UI / 'build_esp.py'])
    for source in (UI / 'dist_esp').iterdir():
        if source.is_file() and (source.suffix == '.gz' or source.name == 'index.html'):
            shutil.copy2(source, data / source.name)
    # ESP8266 serveStatic prefers an existing raw file over its gzip sibling.
    # Keep only compressed theme/JS assets; the tiny index stays uncompressed.
    for name in ('apple.html', 'google.html', 'core.js'):
        (data / name).unlink(missing_ok=True)
    run([CLI, 'compile', '--fqbn', FQBN, '--build-path', build, '--output-dir', build, staged])
    run([MKFS, '-c', data, '-b', '8192', '-p', '256', '-s', str(0x1FA000), build / 'curtain_controller.littlefs.bin'])
    if args.usb:
        run([CLI, 'upload', '--fqbn', FQBN, '--input-dir', build, '--port', args.usb, staged])
        esptool('--chip', 'esp8266', '--port', args.usb, '--baud', '460800', 'write_flash', '0x200000', build / 'curtain_controller.littlefs.bin')
    print('Build artifacts:', build)


if __name__ == '__main__':
    main()

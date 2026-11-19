# -*- coding: utf-8 -*-
"""
레벨러 녹화 영상 '바로 재생' 스트리밍 (2026-11-19)

왜 필요한가
- 한줌 AI 서버(12080)의 녹화 파일은 조각(fragmented) MP4인데, 전체 길이(duration)와 위치 색인(sidx/mfra)이 없다.
  → 브라우저가 원하는 시점으로 가려면 앞에서부터 파일을 계속 받아 읽어야 해서(사실상 다운로드) 수백 MB 영상은 몇 분씩 걸린다.
  → 재생 URL은 5분 뒤 만료(403)라, 길게 보다가 되감기·건너뛰기를 하면 멈춘다.
- 파일 자체는 1초마다 키프레임으로 시작하는 조각이고 Range 요청을 지원하므로, 원하는 위치의 조각부터 바로 보낼 수 있다.

하는 일 (한줌 서버·파일은 건드리지 않음 — 읽기만)
- info  : 파일 크기, 시간 단위, 영상 길이(마지막 조각 시각), 앞머리(ftyp+moov)
- seek  : 0~1 위치(비율) → 그 근처 조각(moof)의 정확한 바이트 위치·시각
- stream: 앞머리 + 그 조각부터 끝까지를 이어서 보냄. 조각 시각(tfdt)을 0부터 시작하게 고쳐서
          브라우저는 '처음부터 재생하는 짧은 파일'처럼 즉시 재생. 끊기면 새 재생 URL로 이어받음.
"""
import json
import struct
import time
import threading
import urllib.request
import urllib.error
from urllib.parse import quote

UA = {"User-Agent": "ohsung-levvid-stream"}
CHUNK = 64 * 1024


def _u32(b, i):
    return struct.unpack_from(">I", b, i)[0]


def _u64(b, i):
    return struct.unpack_from(">Q", b, i)[0]


def _find_moofs(buf):
    """버퍼 안의 유효한 moof 위치 목록 (moof 바로 안에 mfhd가 있어야 진짜)"""
    out, p = [], 0
    while True:
        k = buf.find(b"moof", p)
        if k < 0:
            return out
        p = k + 4
        at = k - 4
        if at < 0 or k + 12 > len(buf):
            continue
        size = _u32(buf, at)
        if 24 <= size <= 4 * 1024 * 1024 and buf[k + 8:k + 12] == b"mfhd":
            out.append(at)


def _tfdt_pos(moof):
    """moof 안 첫 traf의 tfdt (값 위치, 버전) — 없으면 None"""
    end = len(moof)
    i = 8
    while i + 8 <= end:
        s = _u32(moof, i)
        if s < 8:
            return None
        if moof[i + 4:i + 8] == b"traf":
            j = i + 8
            while j + 8 <= i + s:
                s2 = _u32(moof, j)
                if s2 < 8:
                    return None
                if moof[j + 4:j + 8] == b"tfdt":
                    return (j + 12, moof[j + 8])
                j += s2
        i += s
    return None


def _tfdt(moof):
    p = _tfdt_pos(moof)
    if not p:
        return None
    pos, ver = p
    return _u64(moof, pos) if ver == 1 else _u32(moof, pos)


def _rebase(moof, base):
    """moof의 모든 traf tfdt를 base만큼 빼서 0부터 시작하게 (bytearray 제자리 수정)"""
    end = len(moof)
    i = 8
    while i + 8 <= end:
        s = _u32(moof, i)
        if s < 8:
            return
        if moof[i + 4:i + 8] == b"traf":
            j = i + 8
            while j + 8 <= i + s:
                s2 = _u32(moof, j)
                if s2 < 8:
                    break
                if moof[j + 4:j + 8] == b"tfdt":
                    ver = moof[j + 8]
                    if ver == 1:
                        v = max(0, _u64(moof, j + 12) - base)
                        struct.pack_into(">Q", moof, j + 12, v)
                    else:
                        v = max(0, _u32(moof, j + 12) - base)
                        struct.pack_into(">I", moof, j + 12, v)
                j += s2
        i += s


class LevVid:
    def __init__(self, vision_src, fetch_play_url=None, cache_sec=600):
        self.src = vision_src.rstrip("/")
        self._custom_play_url = fetch_play_url
        self._cache = {}
        self._lock = threading.Lock()
        self.cache_sec = cache_sec

    # ── 한줌 38080에서 서명된 재생 URL 발급 (5분 유효) ──
    def play_url(self, seg, file):
        if self._custom_play_url:
            return self._custom_play_url(seg, file)
        url = f"{self.src}/api/leveling/videos/{quote(seg, safe='')}/files/{quote(file, safe='')}/play-url"
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=12) as r:
            j = json.loads(r.read().decode("utf-8", "replace"))
        u = j.get("url") if isinstance(j, dict) else None
        if not u:
            raise RuntimeError("no play url")
        return u

    def _range(self, seg, file, start, end):
        req = urllib.request.Request(self.play_url(seg, file), headers={**UA, "Range": f"bytes={start}-{end}"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
            cr = r.headers.get("Content-Range") or ""
        total = int(cr.split("/")[-1]) if "/" in cr else None
        return data, total

    # ── 파일 정보 (10분 캐시) ──
    def info(self, seg, file):
        key = (seg, file)
        with self._lock:
            c = self._cache.get(key)
            if c and time.time() - c["_t"] < self.cache_sec:
                return c
        head, total = self._range(seg, file, 0, 256 * 1024 - 1)
        moofs = _find_moofs(head)
        if not moofs or not total:
            raise RuntimeError("조각 MP4가 아님(또는 크기 모름)")
        init = bytes(head[:moofs[0]])
        ts = 1000
        m = init.find(b"mdhd")
        if m > 0:
            ts = _u32(init, m + 24) if init[m + 4] == 1 else _u32(init, m + 16)
        first_t = _tfdt(head[moofs[0]:moofs[0] + _u32(head, moofs[0])]) or 0
        # 끝부분에서 마지막 조각 시각 → 영상 길이
        tail_start = max(0, total - 1024 * 1024)
        tail, _ = self._range(seg, file, tail_start, total - 1)
        tm = _find_moofs(tail)
        last_t = first_t
        if tm:
            a = tm[-1]
            last_t = _tfdt(tail[a:a + _u32(tail, a)]) or first_t
        frag = 0
        if len(moofs) > 1:
            t2 = _tfdt(head[moofs[1]:moofs[1] + _u32(head, moofs[1])])
            if t2 is not None:
                frag = t2 - first_t
        dur = (last_t - first_t + frag) / float(ts or 1)
        c = {"_t": time.time(), "total": total, "init": init, "timescale": ts,
             "firstT": first_t, "mediaDur": round(dur, 3), "firstMoof": moofs[0]}
        with self._lock:
            self._cache[key] = c
        return c

    # ── 비율(0~1) → 조각 위치 ──
    def seek(self, seg, file, frac):
        inf = self.info(seg, file)
        total, first = inf["total"], inf["firstMoof"]
        frac = min(max(float(frac or 0), 0.0), 1.0)
        if frac <= 0.0005:
            return {"off": first, "sec": 0.0, "frac": 0.0}
        est = int(first + (total - first) * frac)
        est = min(est, max(first, total - 2 * 1024 * 1024))
        for win in (1024 * 1024, 4 * 1024 * 1024):
            buf, _ = self._range(seg, file, est, min(total - 1, est + win - 1))
            ms = _find_moofs(buf)
            if ms:
                a = ms[0]
                t = _tfdt(buf[a:a + _u32(buf, a)])
                sec = ((t or inf["firstT"]) - inf["firstT"]) / float(inf["timescale"] or 1)
                return {"off": est + a, "sec": round(sec, 3),
                        "frac": round(sec / inf["mediaDur"], 5) if inf["mediaDur"] else frac}
        return {"off": first, "sec": 0.0, "frac": 0.0}

    # ── 앞머리 + off부터 끝까지 (tfdt 0 기준으로 고쳐서) ──
    def stream(self, seg, file, off):
        inf = self.info(seg, file)
        off = max(int(off), inf["firstMoof"])
        yield inf["init"]
        pos = off            # 위쪽에서 받은 바이트 위치(다음 요청 시작점)
        buf = bytearray()
        passthru = 0         # mdat 등 그대로 흘려보낼 남은 바이트
        base = None
        fails = 0
        while pos < inf["total"]:
            try:
                req = urllib.request.Request(self.play_url(seg, file), headers={**UA, "Range": f"bytes={pos}-"})
                with urllib.request.urlopen(req, timeout=20) as r:
                    while True:
                        chunk = r.read(CHUNK)
                        if not chunk:
                            break
                        pos += len(chunk)
                        fails = 0
                        buf += chunk
                        out = bytearray()
                        while True:
                            if passthru:
                                n = min(passthru, len(buf))
                                out += buf[:n]
                                del buf[:n]
                                passthru -= n
                                if passthru:
                                    break
                                continue
                            if len(buf) < 16:
                                break
                            size = _u32(buf, 0)
                            if size == 1:
                                size = _u64(buf, 8)
                            if size < 8:            # 크기 정보 없음/깨짐 → 나머지는 그대로
                                passthru = 1 << 62
                                continue
                            if buf[4:8] == b"moof":
                                if len(buf) < size:
                                    break
                                box = bytearray(buf[:size])
                                del buf[:size]
                                if base is None:
                                    base = _tfdt(box) or 0
                                _rebase(box, base)
                                out += box
                            else:
                                passthru = size
                        if out:
                            yield bytes(out)
            except GeneratorExit:
                raise
            except Exception:  # noqa: BLE001 — 끊김·URL 만료 → 새 URL로 이어받기
                fails += 1
                if fails > 4:
                    return
                time.sleep(1.0)
                continue
        if buf:
            yield bytes(buf)

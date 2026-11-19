// lvmirror.ts (2026-11-19) — 레벨러 PLC(LEVELING_DATA) 하루치 행을 Supabase 거울(lv_plc_mirror)에서 읽기
// 왜: 화면이 15초마다 그날 PLC 행 전체(수천 행)를 공장 MariaDB에서 인터넷으로 끌어와 공장 업로드 회선이 꽉 참 → 모든 화면이 느려짐.
// 방법: 매번 MariaDB에는 '하루 서명'(행 수·ID합·코일번호 CRC합·박스번호합, 1줄)만 묻고,
//       거울과 같으면 거울에서 읽는다. 다르면 새 행(ID > 거울 최대 ID)만 받아 넣고, 그래도 다르면(코일번호 수정 등) 그날을 통째로 다시 받는다.
// 결과 행 형식은 예전 MariaDB 질의와 같다: { ts, c, b, r, cut, mv, ld, ss, cy, corr, acc, dece, slow, coef } (ts = 'YYYY-MM-DD HH:MM:SS')
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SBH: Record<string, string> = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const COLS = `ID id, DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s.%f') tsf, COIL_ID c, BOXIDX b, RUN r, CUTLENSET cut, MOVELENSV mv,
  INVERTERSPEEDPER ld, SPEEDSET ss, CYCLETM cy, CUTLENCORR corr, ACCTM acc, DECTM dece, SLOWLENSET slow, INVERTERSPEEDCOEFF coef`;

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// MariaDB CRC32()와 같은 값(CRC-32/ISO-HDLC, UTF-8 바이트)
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(s: string): number { const b = new TextEncoder().encode(s); let c = 0xffffffff; for (const x of b) c = CRC_T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

async function rpc(fn: string, args: unknown): Promise<any> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: SBH, body: JSON.stringify(args), signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return await r.json();
}
async function upsertRows(rows: any[]) {
  for (let i = 0; i < rows.length; i += 2000) {
    const part = rows.slice(i, i + 2000).map((x) => ({
      id: Number(x.id), ts: String(x.tsf), coil: x.c == null ? null : String(x.c), crc: crc32(x.c == null ? "" : String(x.c)),
      b: x.b == null ? null : Number(x.b), r: x.r == null ? null : Number(x.r), cut: x.cut, mv: x.mv, ld: x.ld, ss: x.ss, cy: x.cy,
      corr: x.corr, acc: x.acc, dece: x.dece, slow: x.slow, coef: x.coef,
    }));
    const r = await fetch(`${SB_URL}/rest/v1/lv_plc_mirror?on_conflict=id`, { method: "POST", headers: { ...SBH, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(part), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`mirror upsert ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
}
const sigEq = (a: any, m: any) => a && m && Number(a.n) === Number(m.n) && String(a.sid ?? 0) === String(m.sid) && String(a.sc ?? 0) === String(m.sc) && String(a.sb ?? 0) === String(m.sb);
const toRow = (a: any[]) => ({ ts: a[1], c: a[2], b: a[3], r: a[4], cut: a[5], mv: a[6], ld: a[7], ss: a[8], cy: a[9], corr: a[10], acc: a[11], dece: a[12], slow: a[13], coef: a[14] });
const fromMy = (x: any) => ({ ts: String(x.tsf).slice(0, 19), c: x.c, b: x.b, r: x.r, cut: x.cut, mv: x.mv, ld: x.ld, ss: x.ss, cy: x.cy, corr: x.corr, acc: x.acc, dece: x.dece, slow: x.slow, coef: x.coef });

export const mirrorStats: Record<string, unknown> = {};

// cl: deno mysql Client. 반환: 그날 행 전체(시간순)
export async function mirrorDayRows(cl: any, date: string): Promise<any[]> {
  const d0 = date + " 00:00:00", d1 = addDays(date, 1) + " 00:00:00";
  const t0 = performance.now();
  try {
    // 공장 쪽 '지금' 서명(이 순간의 최대 ID까지). 거울도 같은 ID 범위로만 비교 → 그 사이 새로 들어온 행 때문에 어긋나지 않음
    const mySig = ((await cl.query(`SELECT COUNT(*) n, IFNULL(MAX(ID),0) mx, IFNULL(SUM(ID),0) sid, IFNULL(SUM(CRC32(IFNULL(COIL_ID,''))),0) sc, IFNULL(SUM(IFNULL(BOXIDX,0)),0) sb
                 FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ?`, [d0, d1])) as any[])[0];
    const mx = Number(mySig?.mx || 0);
    let mSig = await rpc("lv_day_sig2", { d: date, mx });
    let how = "mirror";
    if (!sigEq(mySig, mSig)) {
      let ok = false;
      if (Number(mSig.n) > 0 && Number(mSig.n) < Number(mySig.n)) {
        // 새 행만 (거울 최대 ID 다음 ~ 지금 최대 ID)
        const add = (await cl.query(`SELECT ${COLS} FROM LEVELING_DATA WHERE ID > ? AND ID <= ? AND TIMESTAMP >= ? AND TIMESTAMP < ? ORDER BY ID`, [Number(mSig.mx), mx, d0, d1])) as any[];
        if (add.length) await upsertRows(add);
        mSig = await rpc("lv_day_sig2", { d: date, mx });
        ok = sigEq(mySig, mSig); how = "append:" + add.length;
      }
      if (!ok) {
        // 그날을 다시 받아 덮어쓰고(코일번호 수정 등 반영), 공장에 없는 행은 지움 — 지우고 넣는 사이 빈 순간이 없도록 덮어쓰기 후 정리
        const all = (await cl.query(`SELECT ${COLS} FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ? AND ID <= ? ORDER BY TIMESTAMP, ID`, [d0, d1, mx])) as any[];
        if (all.length) await upsertRows(all);
        await rpc("lv_day_prune", { d: date, mx, ids: all.map((x) => Number(x.id)) });
        how = "reload:" + all.length;
        mirrorStats[date] = { how, ms: Math.round(performance.now() - t0) };
        return all.map(fromMy);
      }
    }
    const rows = ((await rpc("lv_day_rows", { d: date })) as any[]).map(toRow);
    mirrorStats[date] = { how, n: rows.length, ms: Math.round(performance.now() - t0) };
    return rows;
  } catch (e) {
    // 거울 문제 시 예전 방식(직접 조회)으로
    mirrorStats[date] = { how: "direct", err: String((e as Error)?.message || e) };
    const all = (await cl.query(`SELECT ${COLS} FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ? ORDER BY TIMESTAMP, ID`, [d0, d1])) as any[];
    return all.map(fromMy);
  }
}

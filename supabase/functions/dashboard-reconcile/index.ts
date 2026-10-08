// dashboard-reconcile: 그린ERP(미러)와 슬리팅 대시보드(erp_data)를 날짜별로 비교해 "다른 행"만 돌려주는 읽기 전용 함수.
//
// GET ?date=YYYY-MM-DD (생략하면 오늘 KST)
// 아무것도 쓰지 않는다(DB UPDATE/INSERT/DELETE 없음, 대시보드 POST 없음).
//
// 비교 기준
//  - ERP 쪽: greenp_joborders / greenp_joborder_detail (그린ERP 미러, 약 10분 주기 갱신 → 방금 생긴 건은 잠시 차이로 보일 수 있음)
//  - 대시보드 쪽: MariaDB erp_data (work_date = date)
//  - 연결 고리: dashboard_sync_log (mjunp, mdate, work_type → dashboard_erp_id)
//
// 차이 종류(kind)
//  miss : ERP에는 있는데 대시보드에 행이 없음(동기화 로그가 없거나, 로그의 행이 대시보드에서 사라짐)
//  gone : 대시보드에는 동기화한 행이 있는데 ERP 미러에서 작업번호가 사라짐(취소·번호 재발급 의심)
//  diff : 같은 작업인데 내용(품명/규격/중량/가공규칙/길이)이 다름
//  dup  : 같은 업체·작업·품명·규격의 대시보드 행이 2개 이상(로그에 없는 행 포함)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Client as MysqlClient } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function todayKST(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

function s(v: any): string {
  return String(v ?? "").trim();
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// 가공규칙은 미러(쉼표만)와 대시보드(쉼표+공백) 표기 차이가 있어 공백을 모두 제거해 비교한다.
function ruleKey(v: any): string {
  return s(v).replace(/\s+/g, "");
}

function lengthOf(raw: any): number | null {
  const t = s(raw).replace(/,/g, "");
  if (t === "") return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Math.round(parseFloat(t)) : null;
}

function sameNum(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 0.5;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayKST();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: "date는 YYYY-MM-DD 형식이어야 합니다." }, 400);

  const pass = Deno.env.get("LEVELER_DB_PASS") || "";
  if (!pass) return json({ ok: false, error: "LEVELER_DB_PASS 시크릿이 설정되어 있지 않습니다." }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let mysql: MysqlClient | null = null;

  try {
    const [jobsRes, detailRes, logRes] = await Promise.all([
      supabase.from("greenp_joborders").select("joborder_no, work_type, company_name, status_code, synced_at").eq("joborder_date", date),
      supabase.from("greenp_joborder_detail")
        .select("id, joborder_no, work_type, product_name, spec, length_val, original_weight, used_weight, process_rule, synced_at")
        .eq("joborder_date", date).order("id", { ascending: true }),
      supabase.from("dashboard_sync_log")
        .select("mjunp, mdate, board_date, work_type, dashboard_erp_id, company_name, product_name, seeded")
        .eq("seeded", false).not("dashboard_erp_id", "is", null).or(`mdate.eq.${date},board_date.eq.${date}`),
    ]);
    if (jobsRes.error) throw new Error("greenp_joborders 조회 실패: " + jobsRes.error.message);
    if (detailRes.error) throw new Error("greenp_joborder_detail 조회 실패: " + detailRes.error.message);
    if (logRes.error) throw new Error("dashboard_sync_log 조회 실패: " + logRes.error.message);

    mysql = await new MysqlClient().connect({
      hostname: Deno.env.get("LEVELER_DB_HOST") || "osungsteel.servehttp.com",
      port: parseInt(Deno.env.get("LEVELER_DB_PORT") || "33306", 10),
      username: Deno.env.get("LEVELER_DB_USER") || "ohsung",
      password: pass,
      db: Deno.env.get("LEVELER_DB_NAME") || "ohsung",
      timeout: 10000,
    });
    const dashRes = await mysql.execute(
      `SELECT id, company_name, work_type, product_name, specification, length, original_weight, used_weight, process_rule, status
         FROM erp_data WHERE work_date >= ? AND work_date < DATE_ADD(?, INTERVAL 1 DAY)`,
      [date, date],
    );
    const dashRows = ((dashRes.rows || []) as any[]).map((r) => ({
      id: Number(r.id), company: s(r.company_name), workType: s(r.work_type), product: s(r.product_name),
      spec: s(r.specification), length: num(r.length), orig: num(r.original_weight), used: num(r.used_weight),
      rule: s(r.process_rule), status: s(r.status),
    }));
    const dashById = new Map(dashRows.map((r) => [r.id, r]));

    const jobs = jobsRes.data || [];
    const firstDetail = new Map<string, any>();
    for (const d of detailRes.data || []) {
      const k = `${d.joborder_no}|${d.work_type}`;
      if (!firstDetail.has(k)) firstDetail.set(k, d);
    }
    const logRows = logRes.data || [];
    const logByJob = new Map<string, any>();
    const logsByDashId = new Map<number, any[]>();
    for (const l of logRows) {
      if (s(l.mdate) === date) logByJob.set(`${l.mjunp}|${l.work_type}`, l); // 다른 날짜에서 이월된 행은 작업번호가 겹칠 수 있어 제외
      const id = Number(l.dashboard_erp_id);
      logsByDashId.set(id, [...(logsByDashId.get(id) || []), l]);
    }
    const erpKeys = new Set(jobs.map((j: any) => `${j.joborder_no}|${j.work_type}`));

    const issues: any[] = [];

    // miss / diff
    let matched = 0;
    for (const j of jobs) {
      const key = `${j.joborder_no}|${j.work_type}`;
      const log = logByJob.get(key);
      const base = { company: s(j.company_name), workType: s(j.work_type), mjunp: s(j.joborder_no) };
      if (!log) {
        issues.push({ kind: "miss", ...base, dashIds: [], detail: "동기화 로그가 없습니다. 방금 생긴 작업이면 1~2분 뒤 다시 확인하세요.", suggestion: "잠시 후 재확인" });
        continue;
      }
      const dashId = Number(log.dashboard_erp_id);
      const d = dashById.get(dashId);
      if (!d) {
        issues.push({ kind: "miss", ...base, dashIds: [dashId], detail: `로그는 대시보드 행 ${dashId}를 가리키지만 대시보드에 그 행이 없습니다(삭제됐거나 날짜가 다름).`, suggestion: "대시보드 확인" });
        continue;
      }
      if ((logsByDashId.get(dashId) || []).length > 1) { matched++; continue; } // 나머지 확정으로 번호 2개가 한 행을 공유 — 내용 비교 생략
      const e = firstDetail.get(key);
      if (!e) { matched++; continue; }
      const diffs: string[] = [];
      if (s(e.product_name) !== d.product) diffs.push(`품명 ERP ${s(e.product_name) || "-"} / 대시보드 ${d.product || "-"}`);
      if (s(e.spec) !== d.spec) diffs.push(`규격 ERP ${s(e.spec) || "-"} / 대시보드 ${d.spec || "-"}`);
      if (!sameNum(num(e.original_weight), d.orig)) diffs.push(`원중량 ERP ${num(e.original_weight) ?? "-"} / 대시보드 ${d.orig ?? "-"}`);
      if (!sameNum(num(e.used_weight), d.used)) diffs.push(`사용중량 ERP ${num(e.used_weight) ?? "-"} / 대시보드 ${d.used ?? "-"}`);
      if (!sameNum(lengthOf(e.length_val), d.length)) diffs.push(`길이 ERP ${lengthOf(e.length_val) ?? "-"} / 대시보드 ${d.length ?? "-"}`);
      if (ruleKey(e.process_rule) !== ruleKey(d.rule)) diffs.push(`가공규칙 ERP ${s(e.process_rule) || "-"} / 대시보드 ${d.rule || "-"}`);
      if (diffs.length > 0) {
        issues.push({ kind: "diff", ...base, dashIds: [dashId], detail: diffs.join(" · "), suggestion: "다음 동기화에서 자동 반영되는지 확인" });
      } else {
        matched++;
      }
    }

    // gone (ERP 미러에 작업번호가 없음)
    for (const l of logRows) {
      if (s(l.mdate) !== date) continue;
      const key = `${l.mjunp}|${l.work_type}`;
      if (erpKeys.has(key)) continue;
      const shared = (logsByDashId.get(Number(l.dashboard_erp_id)) || []).filter((x) => x !== l).map((x) => x.mjunp);
      const retyped = jobs.find((j: any) => s(j.joborder_no) === s(l.mjunp) && s(j.work_type) !== s(l.work_type));
      const dashId = Number(l.dashboard_erp_id);
      const twin = retyped ? logByJob.get(`${l.mjunp}|${retyped.work_type}`) : null;
      issues.push({
        kind: "gone", company: s(l.company_name), workType: s(l.work_type), mjunp: s(l.mjunp), dashIds: twin ? [dashId, Number(twin.dashboard_erp_id)] : [dashId],
        detail: retyped
          ? `ERP에서 이 작업번호의 작업구분이 ${s(l.work_type)}에서 ${s(retyped.work_type)}로 바뀌었고, 대시보드에는 두 구분의 행이 모두 있습니다${twin ? `(${dashId}, ${twin.dashboard_erp_id})` : ""}.`
          : "대시보드에는 있으나 ERP 미러에 이 작업번호가 없습니다(취소 또는 번호 재발급 의심)." + (shared.length ? ` 같은 행을 쓰는 다른 번호: ${shared.join(", ")}` : ""),
        suggestion: retyped ? `${dashId} 삭제 검토(실작업 기록 확인 후)` : "현장 확인",
      });
    }

    // dup (같은 업체·작업·품명·규격의 대시보드 행이 2개 이상)
    const groups = new Map<string, typeof dashRows>();
    for (const r of dashRows) {
      const k = `${r.company}|${r.workType}|${r.product}|${r.spec}`;
      groups.set(k, [...(groups.get(k) || []), r]);
    }
    for (const rows of groups.values()) {
      if (rows.length < 2) continue;
      const ids = rows.map((r) => r.id).sort((a, b) => a - b);
      const orphans = ids.filter((id) => !logsByDashId.has(id));
      const first = rows[0];
      issues.push({
        kind: "dup", company: first.company, workType: first.workType, mjunp: "", dashIds: ids,
        detail: `대시보드 행 ${ids.join(", ")}가 같은 업체·작업·품명·규격입니다.` + (orphans.length ? ` 이 중 ${orphans.join(", ")}는 동기화 로그에 없는 행입니다.` : ""),
        suggestion: orphans.length ? `${orphans.join(", ")} 삭제 검토(실작업 기록 확인 후)` : "같은 코일의 별도 작업이면 정상",
      });
    }

    const counts: Record<string, number> = { miss: 0, gone: 0, diff: 0, dup: 0 };
    for (const i of issues) counts[i.kind]++;
    const mirrorAt = jobs.map((j: any) => j.synced_at).filter(Boolean).sort().pop() ?? null;

    return json({
      ok: true, date, mirrorSyncedAt: mirrorAt,
      summary: { erp: jobs.length, dashboard: dashRows.length, matched, issues: issues.length, counts },
      issues,
    });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  } finally {
    if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
  }
});

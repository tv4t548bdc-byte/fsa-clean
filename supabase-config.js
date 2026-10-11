/* ============================================================
   CONFIGURAÇÃO DO SUPABASE  (edite SÓ estas 2 linhas)
   Onde achar: Supabase > Project Settings > API
   - url: "Project URL"
   - anonKey: chave "publishable" / "anon public"  (NUNCA use a "secret" / "service_role" aqui!)
   A chave anon é pública por natureza; quem protege os dados são as
   regras de segurança (RLS) criadas pelo arquivo supabase-schema.sql.
   ============================================================ */
window.FSA_SUPABASE = {
  url: 'https://vjlxlihzapjojtyyaypg.supabase.co',
  anonKey: 'sb_publishable_lPvpqzf3dk9r4yZMMCTlbw_17wnBiVO'
};

window.fsaDb = function () {
  const c = window.FSA_SUPABASE || {};
  const ok = c.url && c.anonKey && c.url.indexOf('http') === 0 && c.anonKey.indexOf('COLE_') !== 0 && c.url.indexOf('COLE_') < 0;
  if (!ok || !window.supabase) return null;
  if (!window.__fsaClient) window.__fsaClient = window.supabase.createClient(c.url, c.anonKey);
  return window.__fsaClient;
};

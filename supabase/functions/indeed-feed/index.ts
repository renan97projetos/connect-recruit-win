import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const JOB_TYPE_MAP: Record<string, string> = {
  "full-time":  "fulltime",
  "part-time":  "parttime",
  "contract":   "contract",
  "internship": "internship",
  "temporary":  "temporary",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id, title, description, city, state,
      salary_min, salary_max, job_type,
      is_remote, location, created_at,
      company_name, company_id
    `)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !jobs) {
    console.error("indeed-feed error:", error);
    return new Response("Error fetching jobs", { status: 500, headers: corsHeaders });
  }

  // Lookup company names from profiles (no FK relationship to embed)
  const companyIds = Array.from(
    new Set(jobs.map((j: any) => j.company_id).filter(Boolean))
  );
  const profileMap: Record<string, string> = {};
  if (companyIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, company_name")
      .in("id", companyIds);
    (profs || []).forEach((p: any) => {
      if (p?.id && p?.company_name) profileMap[p.id] = p.company_name;
    });
  }

  const escapeXml = (str: string) =>
    (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:indeed="http://www.indeed.com/about/feeds">
  <channel>
    <title>Vagas SinapseRH</title>
    <link>https://www.sinapserh.com.br</link>
    <description>Vagas de emprego publicadas na plataforma SinapseRH</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>pt-BR</language>
${jobs.map((job: any) => {
  const companyName = escapeXml(
    profileMap[job.company_id] || job.company_name || "SinapseRH"
  );
  const title = escapeXml(job.title || "");
  const description = escapeXml(
    (job.description || "").replace(/<[^>]+>/g, " ").trim()
  );
  const city = escapeXml(job.city || "");
  const state = escapeXml(job.state || "");
  const jobUrl = `https://www.sinapserh.com.br/jobs/${job.id}`;
  const jobType = JOB_TYPE_MAP[job.job_type] || "fulltime";
  const datePosted = job.created_at
    ? new Date(job.created_at).toUTCString()
    : new Date().toUTCString();

  const location = job.is_remote
    ? "Remoto, Brasil"
    : [city, state, "Brasil"].filter(Boolean).join(", ");

  const salaryText = job.salary_min
    ? job.salary_max
      ? `R$ ${Number(job.salary_min).toLocaleString("pt-BR")} - R$ ${Number(job.salary_max).toLocaleString("pt-BR")} por mês`
      : `A partir de R$ ${Number(job.salary_min).toLocaleString("pt-BR")} por mês`
    : "";

  return `    <item>
      <title><![CDATA[${title}]]></title>
      <link><![CDATA[${jobUrl}]]></link>
      <description><![CDATA[${description || title}]]></description>
      <pubDate>${datePosted}</pubDate>
      <guid isPermaLink="true">${jobUrl}</guid>
      <indeed:jobtype>${jobType}</indeed:jobtype>
      <indeed:company><![CDATA[${companyName}]]></indeed:company>
      <indeed:city><![CDATA[${location}]]></indeed:city>
      <indeed:country>BR</indeed:country>
      ${salaryText ? `<indeed:salary><![CDATA[${salaryText}]]></indeed:salary>` : ""}
    </item>`;
}).join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

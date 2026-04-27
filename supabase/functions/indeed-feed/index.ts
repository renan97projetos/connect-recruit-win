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

  const escapeXml = (str: string) =>
    (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const jobsXml = jobs.map((job: any) => {
    const companyName = escapeXml(
      job.profiles?.company_name || job.company_name || "SinapseRH"
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
      ? new Date(job.created_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const locationXml = job.is_remote
      ? `<city>Remoto</city><country>BR</country>`
      : `${city ? `<city>${city}</city>` : ""}
         ${state ? `<state>${state}</state>` : ""}
         <country>BR</country>`;

    const salaryXml = job.salary_min
      ? `<salary>${
          job.salary_max
            ? `R$ ${Number(job.salary_min).toLocaleString("pt-BR")} - R$ ${Number(job.salary_max).toLocaleString("pt-BR")}`
            : `A partir de R$ ${Number(job.salary_min).toLocaleString("pt-BR")}`
        } por mês</salary>`
      : "";

    return `
    <job>
      <title><![CDATA[${title}]]></title>
      <date><![CDATA[${datePosted}]]></date>
      <referencenumber><![CDATA[${job.id}]]></referencenumber>
      <url><![CDATA[${jobUrl}]]></url>
      <company><![CDATA[${companyName}]]></company>
      <sourcename><![CDATA[SinapseRH]]></sourcename>
      <jobtype><![CDATA[${jobType}]]></jobtype>
      ${locationXml}
      ${salaryXml}
      <description><![CDATA[${description || title}]]></description>
    </job>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher><![CDATA[SinapseRH]]></publisher>
  <publisherurl><![CDATA[https://www.sinapserh.com.br]]></publisherurl>
  <lastBuildDate><![CDATA[${new Date().toUTCString()}]]></lastBuildDate>
${jobsXml}
</source>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

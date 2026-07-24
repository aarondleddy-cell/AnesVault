## Scheduling the weekly digest

Simplest option — pg_cron calling the function via `net.http_post` (Supabase Postgres has `pg_cron` + `pg_net` enabled by default):

```sql
select cron.schedule(
  'credential-digest-weekly',
  '0 13 * * 1', -- every Monday 13:00 UTC
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/credential-digest',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_OR_ANON_KEY>')
  );
  $$
);
```

Swap `'0 13 * * 1'` for a daily cadence (`'0 13 * * *'`) if you'd rather check every day.
Change to daily/weekly by editing the cron string above — flag which cadence you want and I'll set it as the default in this file.

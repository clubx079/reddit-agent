-- 002_seed.sql — admin account, default settings, knowledge base and DEMO posts.
-- Run after 001_schema.sql. Idempotent: re-running updates the admin, settings and
-- KB rows by their fixed ids and skips demo rows that already exist.
-- Demo posts are clearly marked (source = 'demo', reddit_id 'demo_*') and can be
-- removed later with:  delete from ra_posts where source = 'demo';

-- ---------- admin ------------------------------------------------------------------
-- admin@airosofts.com · initial password = the project password you chose (bcrypt below).
-- Change it from the app (Account) after first login.
insert into public.ra_users (id, email, full_name, password_hash, role, status)
values ('00000000-0000-4000-8000-000000000001', 'admin@airosofts.com', 'Airosofts Admin',
        '$2a$10$v4ggBjDR/x7k4j15lumflOtD7kdlkh6RKiYu/BFxzjm6Ku4HdKGla', 'admin', 'active')
on conflict (email) do update set role = 'admin', status = 'active';

-- ---------- settings ---------------------------------------------------------------
insert into public.ra_settings (key, value) values
('keywords', $$["Paraguay real estate","Asuncion apartment","Asunción apartment","houses in Asuncion","buy house Paraguay","sell house Paraguay","Paraguay property","property in Paraguay","living in Asuncion","moving to Paraguay","relocating to Paraguay","expat Paraguay housing","rent apartment Asuncion","Paraguay housing market","real estate Asuncion","retire in Paraguay","alquiler Asunción","departamento Asunción","comprar casa Paraguay","Bolivia real estate","Santa Cruz Bolivia apartment"]$$::jsonb),
('subreddits', $$["Paraguay","expats","IWantOut","SouthAmerica","ParaguayExpats","Asuncion","Bolivia","digitalnomad","ExpatFIRE"]$$::jsonb),
('scan', $${"timeWindow":"week","limitPerQuery":15,"minRelevance":25,"maxPostsPerScan":12}$$::jsonb),
('llm', $${"provider":"groq","model":"openai/gpt-oss-120b","temperature":0.6,"maxTokens":900,"fallbackToTemplate":true}$$::jsonb),
('mention', $${"targetRatio":0.12,"trackedUrl":"https://casa-libre.com.py/r/rda","countrySites":{"Paraguay":"https://casa-libre.com.py","Bolivia":"https://casa-libre.com.bo","Uruguay":"https://uy.casa-libre.com","Venezuela":"https://casa-libre.com.ve"}}$$::jsonb)
on conflict (key) do nothing;

-- ---------- knowledge base ---------------------------------------------------------
-- kind: rule (hard rules) · tone · fact · faq (per intent) · mention (how to mention) · banned
insert into public.ra_knowledge (id, kind, title, content, intent, language, priority) values
-- hard rules
('10000000-0000-4000-8000-000000000001','rule','Answer the question first',
 $$Always answer the person's actual question first, with specific, practical information. The reply must be useful even if it never mentions Casa Libre.$$, null, null, 100),
('10000000-0000-4000-8000-000000000002','rule','Mention Casa Libre rarely (about 1 in 9 replies)',
 $$Most replies must NOT mention Casa Libre at all. Only mention it when the person is actively looking to buy, rent or sell and a listings site would genuinely help. Never mention it in replies about visas, taxes, safety or general life questions.$$, null, null, 98),
('10000000-0000-4000-8000-000000000003','rule','Never pretend to be someone',
 $$Never claim to be a local, an agent, a lawyer, a notary, a customer, or to have bought or rented anything. Never invent personal experiences. Write as a knowledgeable, neutral person.$$, null, null, 97),
('10000000-0000-4000-8000-000000000004','rule','No invented facts or legal advice',
 $$Only use facts from this knowledge base. Do not invent laws, prices, statistics or timelines. For legal or tax questions give the general process and recommend an independent escribano/notario or accountant.$$, null, null, 96),
('10000000-0000-4000-8000-000000000005','rule','Reply in the post''s language',
 $$Reply in the same language as the post: Spanish posts get a reply in neutral Rioplatense Spanish (vos is fine for Paraguay), English posts get English.$$, null, null, 95),
('10000000-0000-4000-8000-000000000006','rule','Respect subreddit rules',
 $$Some subreddits ban self-promotion. If the post is in r/expats, r/IWantOut or r/digitalnomad, do not mention Casa Libre unless the person explicitly asks for listing websites.$$, null, null, 94),
-- tone
('10000000-0000-4000-8000-000000000010','tone','Reddit voice',
 $$Plain, warm, direct. 2–4 short paragraphs or a short intro plus 3–5 bullet points. No marketing language, no hype, no emojis, no hashtags, no exclamation-heavy sentences, no sign-off or signature.$$, null, null, 90),
-- mention format
('10000000-0000-4000-8000-000000000020','mention','How to mention Casa Libre',
 $$When a mention fits, add ONE short sentence at the end, as a markdown link whose visible text is the plain domain, e.g. [casa-libre.com.py](https://casa-libre.com.py/r/rda). Describe it plainly: a free property marketplace with listings from real estate agencies and private owners, filterable by neighbourhood and price, where you contact the agency or owner directly on WhatsApp. Use the country's own site: Paraguay casa-libre.com.py, Bolivia casa-libre.com.bo, Uruguay uy.casa-libre.com, Venezuela casa-libre.com.ve.$$, null, null, 92),
('10000000-0000-4000-8000-000000000021','mention','Mention — buying',
 $$When you're ready to look at actual listings, [casa-libre.com.py](https://casa-libre.com.py/r/rda) is free and lets you filter homes for sale by barrio and price; you message the agency or owner directly on WhatsApp. Handy for pulling comparables too.$$, 'buying', 'en', 60),
('10000000-0000-4000-8000-000000000022','mention','Mention — renting',
 $$For browsing rentals, [casa-libre.com.py](https://casa-libre.com.py/r/rda) has listings from agencies and owners that you can filter by barrio, and you contact them directly on WhatsApp.$$, 'renting', 'en', 60),
('10000000-0000-4000-8000-000000000023','mention','Mención — alquiler (ES)',
 $$Para ver alquileres, en [casa-libre.com.py](https://casa-libre.com.py/r/rda) hay avisos de inmobiliarias y dueños que podés filtrar por barrio, y contactás directo por WhatsApp.$$, 'renting', 'es', 60),
-- banned
('10000000-0000-4000-8000-000000000030','banned','Phrases never to use',
 $$Never write: "sin intermediarios", "no middlemen", "best", "the largest", "#1", "guaranteed", "cheapest", "DM me", "check my profile", "I work at", "we at Casa Libre". Never describe how listings get onto Casa Libre (no "aggregates", no "all listings in one place").$$, null, null, 99),
-- facts
('10000000-0000-4000-8000-000000000040','fact','What Casa Libre is',
 $$Casa Libre is a free property marketplace in South America (Paraguay, Bolivia, Uruguay, Venezuela). Real estate agencies, agents and private owners list homes, apartments and land for sale and for rent. Buyers contact the agency or owner directly by WhatsApp. It is not a real estate agency and charges no commission. Prices are shown in local currency and US dollars.$$, null, null, 80),
('10000000-0000-4000-8000-000000000041','fact','Asunción neighbourhoods',
 $$The central, most expensive barrios of Asunción are Villa Morra, Las Mercedes, Carmelitas and Recoleta. Outer barrios and nearby cities (Luque, Lambaré, San Lorenzo, Fernando de la Mora, Mariano Roque Alonso) are cheaper. Prices in central Asunción are often quoted in US dollars; further out in guaraníes.$$, null, null, 70),
-- per-intent FAQs (from the original agent's FAQ, positioning updated)
('10000000-0000-4000-8000-000000000050','faq','Buying property in Paraguay',
 $$Foreigners can buy property in Paraguay with essentially the same rights as locals; there is no citizenship or residency requirement to hold title, except for rural land near the borders. Steps: get a cédula or at least a RUC/tax number, sign a private purchase agreement (boleto de compraventa), then the public deed (escritura pública) before a notary (escribano), and register it at the Dirección General de los Registros Públicos. Always run a title search (informe de dominio) first. Budget roughly 3.5–5% on top of the price for transfer taxes, notary and registration. Tip: hire your own escribano, not the seller's.$$, 'buying', null, 70),
('10000000-0000-4000-8000-000000000051','faq','Renting in Asunción',
 $$Long-term rentals usually run on a 1–2 year contract with 1–2 months' deposit, sometimes plus a guarantor (garante) or rental insurance instead. Rent is commonly quoted in US dollars in the central barrios and in guaraníes further out. Furnished short-term places cost noticeably more per month than an unfurnished annual lease. Check who pays expensas (building fees), IVA and maintenance, and whether utilities are included.$$, 'renting', null, 70),
('10000000-0000-4000-8000-000000000052','faq','Selling property in Paraguay',
 $$To sell you need clean title (escritura), a current informe de dominio and municipal/tax clearances (impuesto inmobiliario paid). Because there is no single MLS, listing with several agents or on several portals widens the buyer pool. Pricing is anchored to price-per-m² comparables in the same barrio. Good photos are the biggest driver of enquiries. The sale closes by escritura before an escribano and is registered.$$, 'selling', null, 70),
('10000000-0000-4000-8000-000000000053','faq','Moving to Paraguay',
 $$Paraguay is one of the more accessible countries in South America for relocation: residency is comparatively straightforward and the cost of living is low. Most newcomers start in Asunción in a furnished short-term rental for a month or two, get to know the barrios, then sign an annual lease or buy. Get the cédula early; it unlocks leases, banking and eventually buying. Encarnación and Ciudad del Este are the other main cities.$$, 'moving', null, 70),
('10000000-0000-4000-8000-000000000054','faq','Paraguay property prices',
 $$Asunción is the most expensive market and price-per-m² varies a lot by barrio (central corridor highest). With no unified MLS, the best way to judge a fair price is to compare several current listings for the same barrio and property type. New-build apartments and gated developments have grown fast in recent years. Compare price-per-m² within the same barrio; city-wide averages mislead.$$, 'market', null, 70)
on conflict (id) do update set content = excluded.content, title = excluded.title, priority = excluded.priority;

-- ---------- DEMO posts (source = 'demo') -------------------------------------------
insert into public.ra_posts (id, reddit_id, subreddit, title, body, author, permalink, created_utc, reddit_score, num_comments, source, matched_keyword, relevance, intent, language, status) values
('20000000-0000-4000-8000-000000000001','demo_01','Paraguay','Moving to Asunción in January with my wife — which barrios should we look at for a 2-bed rental?',
 $$We're relocating from Texas for my job, budget is around $900/month for a furnished 2-bedroom. We don't have a car at first. Which neighbourhoods are walkable and safe, and how do people usually find apartments there? Facebook Marketplace seems chaotic.$$,
 'tx_to_py','https://www.reddit.com/r/Paraguay/comments/demo01/', now() - interval '3 hours', 42, 18, 'demo', 'rent apartment Asuncion', 91, 'renting', 'en', 'new'),
('20000000-0000-4000-8000-000000000002','demo_02','expats','Can foreigners actually buy a house in Paraguay? Any gotchas?',
 $$Looking at Paraguay for retirement. I've read foreigners can buy freely but I'm worried about title problems. What's the process and what should I watch out for?$$,
 'retire_early_ok','https://www.reddit.com/r/expats/comments/demo02/', now() - interval '9 hours', 128, 64, 'demo', 'buy house Paraguay', 84, 'buying', 'en', 'drafted'),
('20000000-0000-4000-8000-000000000003','demo_03','Paraguay','¿Dónde publican alquileres en Asunción además de Facebook?',
 $$Busco un monoambiente en Villa Morra o Carmelitas, presupuesto 3 millones de guaraníes. En los grupos de Facebook responden poco y muchos avisos son viejos. ¿Qué páginas usan ustedes?$$,
 'nico_asu','https://www.reddit.com/r/Paraguay/comments/demo03/', now() - interval '1 day', 35, 22, 'demo', 'alquiler Asunción', 88, 'renting', 'es', 'approved'),
('20000000-0000-4000-8000-000000000004','demo_04','IWantOut','[IWantOut] 34M Software dev Canada -> Paraguay?',
 $$Remote worker, thinking about Paraguay for the lower cost of living and easy residency. How hard is it to rent without local credit history? Anything I should know about housing before I go?$$,
 'maple_dev','https://www.reddit.com/r/IWantOut/comments/demo04/', now() - interval '2 days', 76, 41, 'demo', 'moving to Paraguay', 72, 'moving', 'en', 'new'),
('20000000-0000-4000-8000-000000000005','demo_05','Paraguay','Selling my late father''s house in Luque — where do I even start?',
 $$I live abroad now and inherited a house in Luque. I need to sell it but I don't know if I need an agent, how to price it, or what papers I need. Any advice appreciated.$$,
 'abroad_heir','https://www.reddit.com/r/Paraguay/comments/demo05/', now() - interval '2 days', 19, 11, 'demo', 'sell house Paraguay', 86, 'selling', 'en', 'posted'),
('20000000-0000-4000-8000-000000000006','demo_06','SouthAmerica','Is Paraguay real estate a good investment right now?',
 $$Seeing lots of new towers in Asunción. Are prices going up? Is renting out an apartment there profitable for a foreigner?$$,
 'latam_investor','https://www.reddit.com/r/SouthAmerica/comments/demo06/', now() - interval '3 days', 57, 33, 'demo', 'Paraguay housing market', 69, 'market', 'en', 'new'),
('20000000-0000-4000-8000-000000000007','demo_07','Paraguay','Best supermarket in Asunción for imported stuff?',
 $$Anyone know where to find imported cheese and good coffee?$$,
 'foodie_py','https://www.reddit.com/r/Paraguay/comments/demo07/', now() - interval '4 days', 12, 9, 'demo', 'living in Asuncion', 18, 'general', 'en', 'dismissed'),
('20000000-0000-4000-8000-000000000008','demo_08','Bolivia','Renting an apartment in Santa Cruz de la Sierra as a foreigner',
 $$Moving to Santa Cruz for a year. How do rentals work there, and which areas are good near Equipetrol?$$,
 'scz_bound','https://www.reddit.com/r/Bolivia/comments/demo08/', now() - interval '5 hours', 23, 7, 'demo', 'Santa Cruz Bolivia apartment', 77, 'renting', 'en', 'new')
on conflict (reddit_id) do nothing;

-- ---------- DEMO drafts ------------------------------------------------------------
insert into public.ra_drafts (id, post_id, body, provider, model, mention_included, status, approved_at) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',
 $$Yes, foreigners can buy with essentially the same rights as locals. There's no citizenship or residency requirement to hold title (the exception is rural land near the borders).

The usual steps:
- Get a cédula, or at least a RUC tax number
- Sign a private purchase agreement (boleto de compraventa)
- Sign the public deed (escritura pública) before a notary (escribano) and register it at Registros Públicos

The main gotcha is title. Always order an informe de dominio before paying anything, and hire your own escribano rather than the seller's. Budget roughly 3.5–5% on top of the price for taxes, notary and registration.$$,
 'template', null, false, 'draft', null),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',
 $$Te conviene mirar varias fuentes, porque no hay un sistema único de avisos. Para un monoambiente en Villa Morra o Carmelitas con 3 millones de guaraníes, fijate bien si el precio incluye expensas y si los servicios van aparte; en esos barrios muchas veces el alquiler se cotiza en dólares.

Para contratos anuales lo normal es 1 o 2 meses de depósito y a veces un garante o un seguro de alquiler.

Para ver alquileres, en [casa-libre.com.py](https://casa-libre.com.py/r/rda) hay avisos de inmobiliarias y dueños que podés filtrar por barrio, y contactás directo por WhatsApp.$$,
 'template', null, true, 'approved', now() - interval '20 hours'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000005',
 $$Sorry for your loss. Selling from abroad is very doable; the key is getting the paperwork in order first.

What you'll need:
- The escritura in the heirs' names (if the succession isn't finished yet, that comes first, through a lawyer)
- A current informe de dominio
- Municipal and property-tax payments up to date

For pricing, compare the price per m² of several current listings in Luque for similar houses. Listing with more than one agent widens your buyer pool, and you can sign a power of attorney (poder) so someone local handles the closing.$$,
 'template', null, false, 'approved', now() - interval '1 day')
on conflict (id) do nothing;

update public.ra_posts set posted_at = now() - interval '20 hours', our_comment_url = 'https://www.reddit.com/r/Paraguay/comments/demo05/comment/demo/'
 where id = '20000000-0000-4000-8000-000000000005' and posted_at is null;

insert into public.ra_activity (actor_id, action, entity, entity_id, meta)
select '00000000-0000-4000-8000-000000000001', 'seed.demo', 'post', null, '{"note":"demo data loaded"}'::jsonb
where not exists (select 1 from public.ra_activity where action = 'seed.demo');

-- Demo content so every page has something. Edit or delete from /admin later.
insert into public.posts (section, kind, slug, title_en, title_bn, body_md, excerpt, tags, status) values
 ('writing','poem','sample-poem','Sample poem','নমুনা কবিতা','Replace this demo poem.','A demo poem.','{poetry}','published'),
 ('writing','journal','sample-journal','Sample journal entry',null,'Replace this demo reflection.','A demo journal entry.','{journal}','published'),
 ('security','security_note','sample-log-analysis','Sample SOC lab note',null,'Replace this demo note on log analysis.','A demo security note.','{soc,logs}','published'),
 ('thoughts','essay','sample-essay','Sample essay',null,'Replace this demo essay.','A demo political essay.','{politics}','published');

insert into public.recipes (slug, title_en, summary, ingredients, steps, prep_minutes, cook_minutes, servings, status) values
 ('sample-recipe','Sample recipe','A demo recipe.',
  '[{"item":"Ingredient one","qty":"1 cup"},{"item":"Ingredient two","qty":"2 tsp"}]',
  '[{"text":"First step."},{"text":"Second step."}]', 10, 20, 4, 'published');

insert into public.cooking_log (slug, cooked_on, dish, occasion, notes, status) values
 ('sample-cooking-day', current_date, 'Sample dish', 'Family dinner', 'Demo entry. Works without a photo.', 'published');

insert into public.volunteer_entries (slug, organization, title, role, location, start_date, summary, story_md, status) values
 ('sample-volunteer-work','Sample organization','Sample initiative','Volunteer','Bangladesh', current_date - 365,'A demo entry.','Replace this demo story. Add photos, videos and awards from /admin.','published');

insert into public.security_tools (name, category, level, description) values
 ('Wireshark','network','learning','Packet capture and analysis.'),
 ('Splunk','siem','learning','Searching and correlating logs.'),
 ('Sysmon','edr','learning','Windows endpoint telemetry.');

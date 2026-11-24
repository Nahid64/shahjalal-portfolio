-- Replace the email with the login you created in Authentication > Users.
insert into public.admin_users select id from auth.users where email = 'YOU@EXAMPLE.COM';

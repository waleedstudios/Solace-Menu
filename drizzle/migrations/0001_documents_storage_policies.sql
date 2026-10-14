CREATE POLICY "members read docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "members upload docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "managers delete docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.can_manage(((storage.foldername(name))[1])::uuid));
-- ============================================================================
-- STORAGE POLICIES FOR task-attachments BUCKET
-- ============================================================================

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Allow authenticated users to view files
CREATE POLICY "Users can view task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid() = owner);

-- Allow public access to view files (since bucket is public)
CREATE POLICY "Public can view task attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-attachments');

SELECT '✓ Storage policies created!' as status;

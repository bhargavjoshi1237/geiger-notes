-- 1. Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'homeboard'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow authenticated users to update/upsert their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'homeboard'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'homeboard'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow public read access so images can be displayed on the canvas
CREATE POLICY "Public read access for homeboard"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'homeboard');

-- 4. Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'homeboard'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
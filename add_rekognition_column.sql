-- Migration: add rekognition_face_id to face_encodings
-- Run this in the Supabase SQL Editor

ALTER TABLE face_encodings
  ADD COLUMN IF NOT EXISTS rekognition_face_id TEXT;

-- Optional index for looking up by Rekognition face ID
CREATE INDEX IF NOT EXISTS idx_face_encodings_rekognition_face_id
  ON face_encodings(rekognition_face_id);

-- Drop pgvector match_faces RPC if no longer needed (old human-v1 flow)
-- Uncomment only after confirming all photos have been re-indexed with Rekognition:
-- DROP FUNCTION IF EXISTS match_faces(vector, float, int);

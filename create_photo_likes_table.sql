-- Create photo_likes table to track which users liked which photos
CREATE TABLE IF NOT EXISTS photo_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate likes from the same user on the same photo
    UNIQUE(photo_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo_id ON photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user_id ON photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_created_at ON photo_likes(created_at);

-- Enable Row Level Security
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view likes (for displaying like counts and checking if user liked)
CREATE POLICY "Anyone can view photo likes"
    ON photo_likes
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own likes
CREATE POLICY "Users can like photos"
    ON photo_likes
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can delete their own likes (unlike)
CREATE POLICY "Users can unlike photos"
    ON photo_likes
    FOR DELETE
    USING (true);

-- Grant permissions
-- teste
GRANT SELECT, INSERT, DELETE ON photo_likes TO anon, authenticated;
GRANT USAGE ON SEQUENCE photo_likes_id_seq TO anon, authenticated;

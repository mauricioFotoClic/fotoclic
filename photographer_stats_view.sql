CREATE OR REPLACE VIEW photographer_stats_view AS
SELECT 
    u.id as photographer_id,
    u.photo_limit,
    (SELECT count(*) FROM photos WHERE photographer_id = u.id) as photos_count,
    (SELECT count(*) FROM photos WHERE photographer_id = u.id AND moderation_status = 'approved') as approved_count,
    (SELECT count(*) FROM photos WHERE photographer_id = u.id AND moderation_status = 'rejected') as rejected_count,
    (SELECT count(*) FROM photos WHERE photographer_id = u.id AND moderation_status = 'pending') as pending_count
FROM users u;

-- Grant access
GRANT SELECT ON photographer_stats_view TO authenticated;

-- ANIME QUOTE STUDIO - SIMPLE SETUP
-- Copy and paste this entire script into Supabase SQL Editor

-- Step 1: Create anime table
CREATE TABLE anime (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    year_released INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create characters table
CREATE TABLE characters (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    anime_id BIGINT REFERENCES anime(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create quotes table (main table)
CREATE TABLE quotes (
    id BIGSERIAL PRIMARY KEY,
    quote_text TEXT NOT NULL,
    character_id BIGINT REFERENCES characters(id),
    anime_id BIGINT REFERENCES anime(id),
    episode_number INTEGER,
    emotion TEXT,
    tags TEXT[],
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create indexes for faster searches
CREATE INDEX idx_quotes_anime ON quotes(anime_id);
CREATE INDEX idx_quotes_emotion ON quotes(emotion);
CREATE INDEX idx_anime_title ON anime(title);

-- Step 5: Insert sample data (20 quotes to start)
INSERT INTO anime (title, year_released) VALUES
('Fullmetal Alchemist: Brotherhood', 2009),
('One Piece', 1999),
('Naruto', 2002),
('Naruto Shippuden', 2007),
('Fairy Tail', 2009),
('One Punch Man', 2015),
('Death Note', 2006),
('Rurouni Kenshin', 1996),
('Hunter x Hunter', 2011),
('Fate/Zero', 2011),
('Bleach', 2004),
('Kuroko''s Basketball', 2012),
('Akame ga Kill!', 2014),
('Trigun', 1998),
('No Game No Life', 2014);

INSERT INTO characters (name, anime_id) VALUES
('Roy Mustang', 1),
('Edward Elric', 1),
('Monkey D. Luffy', 2),
('Naruto Uzumaki', 3),
('Itachi Uchiha', 4),
('Natsu Dragneel', 5),
('Saitama', 6),
('L Lawliet', 7),
('Himura Kenshin', 8),
('Gildarts Clive', 5),
('Ging Freecss', 9),
('Rider', 10),
('Hitsugaya Toushirou', 11),
('Shintaro Midorima', 12),
('Hinata Hyuga', 3),
('Akame', 13),
('Vash the Stampede', 14),
('Sora', 15);

INSERT INTO quotes (quote_text, character_id, anime_id, episode_number, emotion, tags) VALUES
('It''s a terrible day for rain.', 1, 1, 10, 'sad', ARRAY['grief', 'loss', 'emotional']),
('A lesson without pain is meaningless.', 2, 1, 3, 'philosophical', ARRAY['growth', 'wisdom']),
('If you don''t take risks, you can''t create a future.', 3, 2, 45, 'motivational', ARRAY['courage', 'adventure']),
('Hard work is worthless for those that don''t believe in themselves.', 4, 3, 120, 'motivational', ARRAY['self-belief', 'determination']),
('People''s lives don''t end when they die. It ends when they lose faith.', 5, 4, 339, 'philosophical', ARRAY['legacy', 'belief']),
('I am not alone. I can hear them... I can hear everyone''s voices.', 6, 5, 175, 'epic', ARRAY['friendship', 'power']),
('I''ll leave tomorrow''s problems to tomorrow''s me.', 7, 6, 2, 'funny', ARRAY['humor', 'carefree']),
('Being alone is better than being with the wrong person.', 8, 7, 13, 'wisdom', ARRAY['solitude', 'relationships']),
('Whatever you lose, you''ll find it again. But what you throw away you''ll never get back.', 9, 8, 28, 'wisdom', ARRAY['regret', 'choices']),
('Fear is not evil. It tells you what your weakness is.', 10, 5, 76, 'wisdom', ARRAY['courage', 'self-awareness']),
('You should enjoy the little detours. To the fullest. Because that''s where you''ll find the things more important than what you want.', 11, 9, 76, 'wisdom', ARRAY['journey', 'discovery']),
('Whatever you do, enjoy it to the fullest. That is the secret of life.', 12, 10, 16, 'wisdom', ARRAY['enjoyment', 'happiness']),
('We are all like fireworks. We climb, shine, and always go our separate ways and become further apart.', 13, 11, 297, 'sad', ARRAY['friendship', 'nostalgia']),
('Don''t give up, there''s no shame in falling down! True shame is to not stand up again!', 14, 12, 41, 'motivational', ARRAY['perseverance', 'resilience']),
('Sometimes I do feel like I''m a failure. But that''s what makes me try harder.', 15, 3, 148, 'motivational', ARRAY['self-improvement', 'determination']),
('If you can''t find a reason to fight, then you shouldn''t be fighting.', 16, 13, 18, 'philosophical', ARRAY['purpose', 'motivation']),
('The ticket to the future is always open.', 17, 14, 26, 'motivational', ARRAY['hope', 'redemption']),
('Life is not a game of luck. If you wanna win, work hard.', 18, 15, 6, 'motivational', ARRAY['effort', 'strategy']),
('The world isn''t perfect, but it''s there for us trying the best it can.', 1, 1, 51, 'philosophical', ARRAY['hope', 'optimism']),
('It''s not the face that makes someone a monster, it''s the choices they make with their lives.', 4, 4, 143, 'philosophical', ARRAY['judgment', 'choices']);

-- Step 6: Create a function to search quotes
CREATE OR REPLACE FUNCTION search_quotes_simple(search_term TEXT)
RETURNS TABLE (
    id BIGINT,
    quote_text TEXT,
    character_name TEXT,
    anime_title TEXT,
    episode_number INTEGER,
    emotion TEXT,
    view_count INTEGER,
    download_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.quote_text,
        c.name as character_name,
        a.title as anime_title,
        q.episode_number,
        q.emotion,
        q.view_count,
        q.download_count
    FROM quotes q
    JOIN characters c ON q.character_id = c.id
    JOIN anime a ON q.anime_id = a.id
    WHERE 
        LOWER(q.quote_text) LIKE '%' || LOWER(search_term) || '%'
        OR LOWER(c.name) LIKE '%' || LOWER(search_term) || '%'
        OR LOWER(a.title) LIKE '%' || LOWER(search_term) || '%'
        OR LOWER(q.emotion) LIKE '%' || LOWER(search_term) || '%'
    ORDER BY q.view_count DESC, q.like_count DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Enable Row Level Security (optional for now, but good practice)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON quotes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON anime FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON characters FOR SELECT USING (true);

-- Success message
SELECT 'Database setup complete! You now have 20 quotes ready to use.' as status;
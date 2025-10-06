-- PREMIUM FEATURES - Database Schema
-- Run this in Supabase SQL Editor AFTER your initial setup

-- Step 1: Enable Supabase Auth (already enabled by default)
-- We'll use Supabase's built-in auth.users table

-- Step 2: Create user_profiles table (extends auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    subscription_tier TEXT DEFAULT 'free', -- 'free' or 'premium'
    subscription_expires_at TIMESTAMP,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    
    -- Usage limits
    downloads_today INTEGER DEFAULT 0,
    downloads_this_month INTEGER DEFAULT 0,
    last_download_date DATE DEFAULT CURRENT_DATE,
    
    -- Stats
    total_downloads INTEGER DEFAULT 0,
    total_favorites INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create user_favorites table
CREATE TABLE user_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id BIGINT REFERENCES quotes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, quote_id) -- Prevent duplicate favorites
);

-- Step 4: Create user_downloads table (track history)
CREATE TABLE user_downloads (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id BIGINT REFERENCES quotes(id) ON DELETE CASCADE,
    background_style TEXT,
    font_style TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create subscription_plans table
CREATE TABLE subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    
    -- Features
    downloads_per_day INTEGER,
    downloads_per_month INTEGER,
    has_watermark BOOLEAN DEFAULT true,
    has_hd_downloads BOOLEAN DEFAULT false,
    has_premium_backgrounds BOOLEAN DEFAULT false,
    has_premium_fonts BOOLEAN DEFAULT false,
    can_submit_quotes BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 6: Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, price_yearly, downloads_per_day, downloads_per_month, has_watermark, has_hd_downloads, has_premium_backgrounds, has_premium_fonts, can_submit_quotes) VALUES
('Free', 0, 0, 5, 50, true, false, false, false, false),
('Premium', 4.99, 39.99, 999, 999, false, true, true, true, true);

-- Step 7: Create function to check if user is premium
CREATE OR REPLACE FUNCTION is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_premium BOOLEAN;
BEGIN
    SELECT 
        subscription_tier = 'premium' 
        AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
    INTO is_premium
    FROM user_profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(is_premium, false);
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to check download limits
CREATE OR REPLACE FUNCTION can_download(user_uuid UUID)
RETURNS TABLE(can_download BOOLEAN, reason TEXT) AS $$
DECLARE
    user_tier TEXT;
    daily_limit INTEGER;
    monthly_limit INTEGER;
    downloads_today INTEGER;
    downloads_month INTEGER;
    last_download DATE;
BEGIN
    -- Get user info
    SELECT 
        up.subscription_tier,
        up.downloads_today,
        up.downloads_this_month,
        up.last_download_date,
        sp.downloads_per_day,
        sp.downloads_per_month
    INTO 
        user_tier,
        downloads_today,
        downloads_month,
        last_download,
        daily_limit,
        monthly_limit
    FROM user_profiles up
    JOIN subscription_plans sp ON sp.name = CASE WHEN up.subscription_tier = 'premium' THEN 'Premium' ELSE 'Free' END
    WHERE up.id = user_uuid;
    
    -- If no profile, assume free tier
    IF user_tier IS NULL THEN
        user_tier := 'free';
        daily_limit := 5;
        monthly_limit := 50;
        downloads_today := 0;
        downloads_month := 0;
    END IF;
    
    -- Reset daily count if new day
    IF last_download < CURRENT_DATE THEN
        downloads_today := 0;
    END IF;
    
    -- Check limits
    IF downloads_today >= daily_limit THEN
        RETURN QUERY SELECT false, 'Daily download limit reached. Upgrade to Premium for unlimited downloads!';
    ELSIF downloads_month >= monthly_limit THEN
        RETURN QUERY SELECT false, 'Monthly download limit reached. Upgrade to Premium!';
    ELSE
        RETURN QUERY SELECT true, 'OK';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to increment downloads
CREATE OR REPLACE FUNCTION increment_user_download(user_uuid UUID, quote_id_param BIGINT, bg_style TEXT, font_style TEXT)
RETURNS VOID AS $$
BEGIN
    -- Update user profile
    UPDATE user_profiles
    SET 
        downloads_today = CASE 
            WHEN last_download_date < CURRENT_DATE THEN 1
            ELSE downloads_today + 1
        END,
        downloads_this_month = CASE
            WHEN EXTRACT(MONTH FROM last_download_date) != EXTRACT(MONTH FROM CURRENT_DATE) THEN 1
            ELSE downloads_this_month + 1
        END,
        total_downloads = total_downloads + 1,
        last_download_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Log download
    INSERT INTO user_downloads (user_id, quote_id, background_style, font_style)
    VALUES (user_uuid, quote_id_param, bg_style, font_style);
    
    -- Update quote stats
    UPDATE quotes
    SET download_count = download_count + 1
    WHERE id = quote_id_param;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_downloads ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own favorites
CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Users can view their own download history
CREATE POLICY "Users can view own downloads" ON user_downloads
    FOR SELECT USING (auth.uid() = user_id);

-- Step 11: Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, username, subscription_tier)
    VALUES (NEW.id, NEW.email, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Success message
SELECT 'Premium features database setup complete!' as status;
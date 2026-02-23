-- ============================================
-- USER PROFILE ENHANCEMENT MIGRATION
-- Updates profile handling for name, phone, dob
-- ============================================

-- 1. Ensure profiles table has all columns
DO $$ 
BEGIN
    -- Add full_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Add phone if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    -- Add birth_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
        ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
    END IF;
END $$;

-- 2. Update the handle_new_user function to capture all metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        phone,
        birth_date,
        created_at
    )
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'phone',
        (new.raw_user_meta_data->>'birth_date')::DATE,
        NOW()
    );
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback if date parsing fails or other issues
        INSERT INTO public.profiles (id, email, full_name, created_at)
        VALUES (
            new.id, 
            new.email, 
            new.raw_user_meta_data->>'full_name', 
            NOW()
        );
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is active (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Done! New users will now have their profile populated from metadata.

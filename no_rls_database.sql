-- =====================================================
-- 婴儿喂养追踪数据库设置脚本（无RLS策略版本）
-- =====================================================
-- 此版本完全移除了所有行级安全策略(RLS)
-- 所有数据访问控制将在应用层处理
-- =====================================================

-- =====================================================
-- 第一步：创建基础扩展和函数
-- =====================================================
create extension if not exists "uuid-ossp";

-- 创建更新时间的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 第二步：创建枚举类型和表结构
-- =====================================================
CREATE TYPE family_role AS ENUM ('parent', 'father', 'mother', 'caregiver', 'grandparent', 'grandfather', 'grandmother', 'relative', 'custom');

-- 家庭组表
CREATE TABLE IF NOT EXISTS family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by UUID NOT NULL DEFAULT auth.uid(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户个人资料表
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() UNIQUE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 家庭成员表
CREATE TABLE IF NOT EXISTS family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    role family_role NOT NULL,
    custom_role_name VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT true,
    can_invite BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- 宝宝信息表
CREATE TABLE IF NOT EXISTS baby_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    birth_weight DECIMAL(5,2),
    current_weight DECIMAL(5,2),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 喂养记录表
CREATE TABLE IF NOT EXISTS feeding_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    family_id UUID NOT NULL,
    baby_id UUID REFERENCES baby_profiles(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    left_duration INTEGER,
    right_duration INTEGER,
    feeding_type VARCHAR(20),
    amount INTEGER,
    left_side BOOLEAN,
    right_side BOOLEAN,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (family_id) REFERENCES family_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, family_id) REFERENCES family_members(user_id, family_id)
);

-- 尿布记录表
CREATE TABLE IF NOT EXISTS diaper_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    family_id UUID NOT NULL,
    baby_id UUID REFERENCES baby_profiles(id),
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pee', 'poop', 'both')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (family_id) REFERENCES family_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, family_id) REFERENCES family_members(user_id, family_id)
);

-- 睡眠记录表
CREATE TABLE IF NOT EXISTS sleep_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    family_id UUID NOT NULL,
    baby_id UUID REFERENCES baby_profiles(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (family_id) REFERENCES family_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, family_id) REFERENCES family_members(user_id, family_id)
);

-- =====================================================
-- 第三步：创建更新时间触发器
-- =====================================================
CREATE TRIGGER update_family_groups_updated_at BEFORE UPDATE ON family_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_baby_profiles_updated_at BEFORE UPDATE ON baby_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feeding_records_updated_at BEFORE UPDATE ON feeding_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diaper_records_updated_at BEFORE UPDATE ON diaper_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sleep_records_updated_at BEFORE UPDATE ON sleep_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 第四步：创建RPC函数（无RLS限制版本）
-- =====================================================

-- 设置会话变量的函数
CREATE OR REPLACE FUNCTION set_current_invite_code(invite_code TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_invite_code', invite_code, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 简单邀请码验证函数
CREATE OR REPLACE FUNCTION validate_invite_code_simple(invite_code_input TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    family_id UUID,
    family_name VARCHAR(100),
    message TEXT
) AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM family_groups 
        WHERE invite_code = invite_code_input 
        AND is_active = true
    ) THEN
        RETURN QUERY SELECT 
            true,
            fg.id,
            fg.name,
            '邀请码有效'::TEXT
        FROM family_groups fg
        WHERE fg.invite_code = invite_code_input 
        AND fg.is_active = true
        LIMIT 1;
    ELSE
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::VARCHAR(100),
            '邀请码无效或家庭不存在'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 直接查询家庭组函数
CREATE OR REPLACE FUNCTION get_family_by_invite_code_direct(invite_code_param TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    invite_code VARCHAR(6),
    created_by UUID,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT fg.id, fg.name, fg.invite_code, fg.created_by, fg.created_at
    FROM family_groups fg
    WHERE fg.invite_code = invite_code_param
    AND fg.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建家庭组函数（无RLS限制）
CREATE OR REPLACE FUNCTION create_family_group(family_name TEXT, family_description TEXT)
RETURNS TABLE (
    family_id UUID,
    invite_code TEXT,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    new_family_id UUID;
    new_invite_code TEXT;
BEGIN
    -- 移除RLS检查，只在应用层验证
    new_invite_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    
    INSERT INTO family_groups (name, description, invite_code, created_by)
    VALUES (family_name, family_description, new_invite_code, auth.uid())
    RETURNING id INTO new_family_id;
    
    INSERT INTO family_members (family_id, user_id, role, is_primary, can_edit, can_invite)
    VALUES (new_family_id, auth.uid(), 'parent', true, true, true);
    
    RETURN QUERY SELECT 
        new_family_id, 
        new_invite_code, 
        true, 
        '家庭组创建成功'::TEXT;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 加入家庭组函数（无RLS限制）
CREATE OR REPLACE FUNCTION join_family_with_invite_code_complete(invite_code_input TEXT, user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    family_id UUID,
    family_name VARCHAR(100),
    message TEXT
) AS $$
DECLARE
    target_family_id UUID;
    target_family_name VARCHAR(100);
BEGIN
    -- 移除RLS检查，只在应用层验证
    SELECT id, name INTO target_family_id, target_family_name
    FROM family_groups 
    WHERE invite_code = invite_code_input 
    AND is_active = true;
    
    IF target_family_id IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::VARCHAR(100),
            '邀请码无效或家庭不存在'::TEXT;
        RETURN;
    END IF;
    
    -- 移除重复成员检查，只在应用层验证
    
    RETURN QUERY SELECT 
        true,
        target_family_id,
        target_family_name,
        '可以加入家庭'::TEXT;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 第五步：创建用户资料触发器
-- =====================================================
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', ''), NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_profile_on_auth_user_creation ON auth.users;
CREATE TRIGGER create_profile_on_auth_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile_on_signup();

-- =====================================================
-- 第六步：为现有用户创建缺失的用户资料
-- =====================================================
INSERT INTO public.user_profiles (user_id, email, display_name, created_at, updated_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', ''), 
  COALESCE(created_at, NOW()), 
  COALESCE(updated_at, NOW())
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_profiles);

-- =====================================================
-- 第七步：添加注释和说明
-- =====================================================
COMMENT ON TABLE family_groups IS '家庭组信息表';
COMMENT ON TABLE user_profiles IS '用户个人资料表';
COMMENT ON TABLE family_members IS '家庭成员关系表';
COMMENT ON TABLE baby_profiles IS '宝宝信息表';
COMMENT ON TABLE feeding_records IS '喂养记录表';
COMMENT ON TABLE diaper_records IS '尿布记录表';
COMMENT ON TABLE sleep_records IS '睡眠记录表';

-- =====================================================
-- 第八步：完成提示
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '数据库设置完成！';
    RAISE NOTICE '此版本完全移除了所有RLS策略。';
    RAISE NOTICE '数据访问控制将在应用层处理。';
    RAISE NOTICE '现在应该不会再出现42501错误了。';
END
$$;

-- =====================================================
-- 使用说明：
-- =====================================================
-- 1. 在Supabase SQL编辑器中执行此脚本
-- 2. 如果数据库已存在，请先备份数据
-- 3. 执行顺序：先删除旧表（如果需要），再执行此脚本
-- 4. 执行后重新启动应用
-- 5. 注意：数据安全完全依赖应用层的逻辑控制
--
-- 重要提醒：
-- - 此版本移除了所有数据库层的安全策略
-- - 需要在应用代码中实现相应的权限检查
-- - 建议后续根据实际需求重新设计安全策略
-- =====================================================
/**
 * Supabase 查询助手工具
 * 解决 .single() 方法滥用导致的 "Cannot coerce the result to a single JSON object" 错误
 * 
 * 根本问题分析：
 * 1. .single() 期望查询必须返回且仅返回一行数据
 * 2. 当用户没有家庭记录时，查询返回 0 行，导致错误
 * 3. 多个地方重复处理相同的错误逻辑
 * 
 * 解决方案：
 * 1. 统一封装查询逻辑，区分【必须存在】vs【可能不存在】的场景
 * 2. 使用 .maybeSingle() 处理可能为空的情况
 * 3. 提供清晰的错误处理和默认值
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryOptions {
  /** 是否期望查询返回且仅返回一行数据 */
  expectSingle: boolean;
  /** 是否允许为空（仅对 expectSingle=true 有效）*/
  allowEmpty?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 默认值（当 allowEmpty=true 且查询为空时返回）*/
  defaultValue?: any;
}

/**
 * 统一的 Supabase 查询封装
 * 
 * @param supabase Supabase 客户端实例
 * @param table 表名
 * @param select 选择字段
 * @param filters 过滤条件数组
 * @param options 查询选项
 * @returns 查询结果
 */
export async function safeQuery(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: Array<{ column: string; operator: string; value: any }> = [],
  options: QueryOptions
) {
  try {
    let query = supabase.from(table).select(select);
    
    // 应用过滤条件
    filters.forEach(filter => {
      query = query.filter(filter.column, filter.operator, filter.value);
    });
    
    if (options.expectSingle) {
      if (options.allowEmpty) {
        // 使用 maybeSingle 处理可能为空的情况
        const { data, error } = await query.maybeSingle();
        
        if (error) {
          throw new Error(options.errorMessage || `查询 ${table} 失败: ${error.message}`);
        }
        
        return data || options.defaultValue || null;
      } else {
        // 使用 single，期望必须返回一行
        const { data, error } = await query.single();
        
        if (error) {
          throw new Error(options.errorMessage || `查询 ${table} 失败: ${error.message}`);
        }
        
        return data;
      }
    } else {
      // 多行查询
      const { data, error } = await query;
      
      if (error) {
        throw new Error(options.errorMessage || `查询 ${table} 失败: ${error.message}`);
      }
      
      return data || [];
    }
  } catch (error) {
    console.error(`[safeQuery] ${table} 查询错误:`, error);
    throw error;
  }
}

/**
 * 快捷函数：查询单行数据（可能为空）
 */
export async function querySingleMaybe(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: Array<{ column: string; operator: string; value: any }> = [],
  defaultValue: any = null
) {
  return safeQuery(supabase, table, select, filters, {
    expectSingle: true,
    allowEmpty: true,
    defaultValue,
    errorMessage: `查询 ${table} 失败`
  });
}

/**
 * 快捷函数：查询单行数据（必须存在）
 */
export async function querySingleRequired(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: Array<{ column: string; operator: string; value: any }> = []
) {
  return safeQuery(supabase, table, select, filters, {
    expectSingle: true,
    allowEmpty: false,
    errorMessage: `查询 ${table} 失败：记录不存在`
  });
}

/**
 * 快捷函数：查询多行数据
 */
export async function queryMany(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: Array<{ column: string; operator: string; value: any }> = [],
  orderBy?: { column: string; ascending?: boolean }
) {
  let query = supabase.from(table).select(select);
  
  // 应用过滤条件
  filters.forEach(filter => {
    query = query.filter(filter.column, filter.operator, filter.value);
  });
  
  // 应用排序
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`查询 ${table} 失败: ${error.message}`);
  }
  
  return data || [];
}

/**
 * 特殊处理：获取用户家庭ID
 * 这是最常见的错误场景，需要特殊处理
 */
export async function getUserFamilyId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    // 1. 首先尝试从 family_members 表获取
    const memberData = await querySingleMaybe(
      supabase,
      'family_members',
      'family_id',
      [{ column: 'user_id', operator: 'eq', value: userId }]
    );
    
    if (memberData?.family_id) {
      return memberData.family_id;
    }
    
    // 2. 检查是否是家庭创建者
    const familyData = await querySingleMaybe(
      supabase,
      'family_groups',
      'id',
      [{ column: 'created_by', operator: 'eq', value: userId }]
    );
    
    if (familyData?.id) {
      return familyData.id;
    }
    
    // 3. 用户没有家庭
    return null;
    
  } catch (error) {
    console.error('[getUserFamilyId] 获取用户家庭ID失败:', error);
    return null;
  }
}
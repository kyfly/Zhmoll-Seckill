-- KEYS[1] 获奖列表 Seckill_AwardList#[_seckillid_]  hash
-- KEYS[2] 奖品池 Seckill_AwardPool#[_seckillid_]    list
-- KEYS[3] 黑名单　Seckill_BlackRoom#[_seckillid_]   hash
-- ARGV[1] 用户token 
-- ARGV[2] 随机数 

if redis.call("HEXISTS",KEYS[3],ARGV[1]) == 1 then
-- 作弊被加入黑名单
　return 20
end
if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
-- 已拿到奖品，就直接返回
  return 11
end
-- 未拿到奖品
if redis.call("LLEN",KEYS[2])<1 then
  -- 秒杀奖品发完
  return 12
end
if tonumber(ARGV[2])<7 then
  -- 随机丢弃
  return 13
end
-- 从奖池拿奖品
local award = redis.call("LPOP",KEYS[2])
redis.call("HSET",KEYS[1],ARGV[1],award)
return award
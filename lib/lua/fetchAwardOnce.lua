-- KEYS[1] 获奖列表 Seckill_AwardList#[_seckillid_]
-- KEYS[2] 奖品池 Seckill_AwardPool#[_seckillid_]
-- ARGV[1] 用户token 

if redis.call("HEXISTS",KEYS[1],ARGV[1])==1 then
  return nil
else
  local award = redis.call("LPOP",KEYS[2])
  redis.call("HSET",KEYS[1],ARGV[1],award)
  return award
end
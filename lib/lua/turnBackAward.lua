-- KEYS[1] 获奖列表 Seckill_AwardList#[_seckillid_]
-- KEYS[2] 奖品池 Seckill_AwardPool#[_seckillid_]
-- ARGV[1] 用户token 

local award = redis.pcall("HGET",KEYS[1],ARGV[1])
if award == nil
  return
else 
  redis.pcall("RPUSH",KEYS[2],award)
  redis.pcall("HDEL",KEYS[1],ARGV[1])
  return
end
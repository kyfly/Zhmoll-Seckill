-- KEYS[1] 获奖列表 Seckill_AwardList#[_seckillid_] hash
-- KEYS[2] 奖品池 Seckill_AwardPool#[_seckillid_] list
-- KEYS[3] 秒杀活动 Seckill#[_seckillid_] hash
-- ARGV[1] 用户token
 
if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
  -- 已拿到奖品
  local award = redis.call("HGET",KEYS[1],ARGV[1])
  redis.call("RPUSH",KEYS[2],award)
  redis.call("HDEL",KEYS[1],ARGV[1])
  redis.call("HINCRBY",KEY[3],"turnBackCount",1)
  return award
end
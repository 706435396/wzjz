#!/usr/bin/env bash
# ============================================================
# Cloudflare Pages 批量添加自定义域名 + DNS 解析 (两段式)
# 用法:
#   export CF_ACCOUNT_ID="xxxx"
#   export CF_PAGES_TOKEN="cfut_xxx"   # Account > Cloudflare Pages > Edit
#   export CF_DNS_TOKEN="cfut_xxx"     # Zone > DNS > Edit (+ Zone > Zone > Read)
#   bash scripts/cf-add-domains.sh
# 说明:
#   - 当 Pages token 与 DNS token 是分开的权限令牌时, 本脚本两段式执行:
#       阶段1: 用 Pages token POST /pages/projects/{proj}/domains 注册自定义域
#       阶段2: 用 DNS token 确保每个子域存在 CNAME -> <proj>.pages.dev (缺失则创建)
#   - 域名列表来自 public/common/domain-map.json 的 map 键 (98 个子站)。
#   - 若未设置 CF_PROJECT_NAME, 自动列出账户下 Pages 项目取第一个。
# ============================================================
set -u
API="https://api.cloudflare.com/client/v4"
PROXY="http://127.0.0.1:7890"
ZONE_NAME="72tool.com"

: "${CF_ACCOUNT_ID:?请提供环境变量 CF_ACCOUNT_ID}"
PAGES_TK="${CF_PAGES_TOKEN:-${CF_API_TOKEN:?请提供 CF_PAGES_TOKEN 或 CF_API_TOKEN}}"
DNS_TK="${CF_DNS_TOKEN:-${CF_API_TOKEN:?请提供 CF_DNS_TOKEN 或 CF_API_TOKEN}}"

# ---------- 0. 解析项目名 / pages.dev 目标 ----------
if [ -z "${CF_PROJECT_NAME:-}" ]; then
  CF_PROJECT_NAME=$(curl -s -x "$PROXY" "$API/accounts/$CF_ACCOUNT_ID/pages/projects" \
    -H "Authorization: Bearer $PAGES_TK" -H "Content-Type: application/json" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log((j.success&&j.result[0])?j.result[0].name:'')})")
  [ -z "$CF_PROJECT_NAME" ] && { echo "ERROR: 无法列出 Pages 项目, 请检查 CF_PAGES_TOKEN 权限或显式设置 CF_PROJECT_NAME" >&2; exit 1; }
fi
PAGES_DEV=$(curl -s -x "$PROXY" "$API/accounts/$CF_ACCOUNT_ID/pages/projects/$CF_PROJECT_NAME" \
  -H "Authorization: Bearer $PAGES_TK" -H "Content-Type: application/json" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log((j.success&&j.result.subdomain)?j.result.subdomain:'')})")
[ -z "$PAGES_DEV" ] && { echo "ERROR: 无法获取项目 $CF_PROJECT_NAME 的 pages.dev 子域" >&2; exit 1; }
echo ">>> 项目=$CF_PROJECT_NAME | CNAME 目标=$PAGES_DEV"

# ---------- 1. 校验 zone ----------
ZONE_ID=$(curl -s -x "$PROXY" "$API/zones?name=$ZONE_NAME" -H "Authorization: Bearer $DNS_TK" -H "Content-Type: application/json" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log((j.success&&j.result[0])?j.result[0].id:'')})")
[ -z "$ZONE_ID" ] && { echo "ERROR: zone $ZONE_NAME 不在该账户" >&2; exit 1; }
echo ">>> zone_id=$ZONE_ID"

# ---------- 2. 域名列表 ----------
DOMAINS=$(node -e "const m=require('./public/common/domain-map.json');console.log(Object.keys(m.map).join('\n'))")
TOTAL=$(echo "$DOMAINS" | grep -c .)
echo ">>> 待处理 $TOTAL 个子域"

# ---------- 3. 阶段1: 注册自定义域 (Pages token) ----------
echo "=== 阶段1: 注册自定义域 ==="
d_ok=0; d_skip=0; d_fail=0; d_fails=""
while IFS= read -r d; do
  [ -z "$d" ] && continue
  resp=$(curl -s -x "$PROXY" -X POST "$API/accounts/$CF_ACCOUNT_ID/pages/projects/$CF_PROJECT_NAME/domains" \
    -H "Authorization: Bearer $PAGES_TK" -H "Content-Type: application/json" \
    -d "{\"name\":\"$d\",\"zone_name\":\"$ZONE_NAME\"}")
  out=$(echo "$resp" | node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{try{const j=JSON.parse(s);if(j.success)console.log('OK:'+(j.result&&j.result.status||'pending'));else{const e=JSON.stringify(j.errors||[]);if(/already|8000000/.test(e))console.log('EXISTS');else console.log('FAIL:'+e.slice(0,160))}}catch(e){console.log('PARSEFAIL:'+s.slice(0,120))}})")
  echo "  [reg] $d -> $out"
  case "$out" in OK*) d_ok=$((d_ok+1));; EXISTS) d_skip=$((d_skip+1));; *) d_fail=$((d_fail+1)); d_fails="$d_fails\n  $d : $out";; esac
  node -e "setTimeout(function(){},250)" >/dev/null 2>&1
done <<< "$DOMAINS"

# ---------- 4. 阶段2: 确保每个子域有 CNAME (DNS token) ----------
echo "=== 阶段2: 确保 CNAME 解析 ($PAGES_DEV) ==="
c_ok=0; c_skip=0; c_fail=0; c_fails=""
while IFS= read -r d; do
  [ -z "$d" ] && continue
  rec=$(curl -s -x "$PROXY" "$API/zones/$ZONE_ID/dns_records?name=$d&type=CNAME" -H "Authorization: Bearer $DNS_TK" -H "Content-Type: application/json" \
    | node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const j=JSON.parse(s);if(j.success&&j.result[0])console.log(j.result[0].content+'|'+j.result[0].id);else console.log('')})")
  if [ -n "$rec" ]; then
    content="${rec%%|*}"
    if [ "$content" = "$PAGES_DEV" ]; then
      echo "  [dns] $d -> 已存在 ($content)"; c_skip=$((c_skip+1)); continue
    fi
  fi
  # 创建 CNAME
  cres=$(curl -s -x "$PROXY" -X POST "$API/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $DNS_TK" -H "Content-Type: application/json" \
    -d "{\"type\":\"CNAME\",\"name\":\"$d\",\"content\":\"$PAGES_DEV\",\"proxied\":true,\"ttl\":1}")
  cout=$(echo "$cres" | node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{try{const j=JSON.parse(s);if(j.success)console.log('CREATED');else{const e=JSON.stringify(j.errors||[]);if(/already|81057/.test(e))console.log('EXISTS');else console.log('FAIL:'+e.slice(0,160))}}catch(e){console.log('PARSEFAIL:'+s.slice(0,120))}})")
  echo "  [dns] $d -> $cout"
  case "$cout" in CREATED) c_ok=$((c_ok+1));; EXISTS) c_skip=$((c_skip+1));; *) c_fail=$((c_fail+1)); c_fails="$c_fails\n  $d : $cout";; esac
  node -e "setTimeout(function(){},250)" >/dev/null 2>&1
done <<< "$DOMAINS"

echo "=============================================="
echo "阶段1 注册域: 成功 $d_ok / 已存在 $d_skip / 失败 $d_fail"
[ $d_fail -gt 0 ] && { echo "注册失败:"; echo -e "$d_fails"; }
echo "阶段2 CNAME:  创建 $c_ok / 已存在 $c_skip / 失败 $c_fail"
[ $c_fail -gt 0 ] && { echo "CNAME 失败:"; echo -e "$c_fails"; }

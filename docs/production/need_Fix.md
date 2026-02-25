# ATP2 Phase Board (Post Batch 6)

## Current Status
- Phase A (Schema + Functional Integration, Batch 0 -> Batch 6): FINISH
- Phase B (Hardening / Auth Bridge / Policy Lockdown): ACTIVE

## Confirmed Completed (from latest functional smoke)
- Favorite flow hoạt động
- Community avatar cross-wallet hiển thị đúng
- Follow -> notification flow hoạt động
- ATP2 functional smoke 2-wallet PASS trên `vcixsdudkizgfikhmfuv`

## Phase B Priorities (Roadmap-aligned)
1. Thiết kế và triển khai wallet-auth -> Supabase auth claim bridge
2. Thay `Batch 4C` temporary public write policies bằng owner-scoped RLS policies
3. Chạy lại functional smoke 2-wallet dưới hardened RLS
4. Xác nhận không hồi quy consistency của profile/community/favorites/notifications

## Constraints (keep)
- Messaging vẫn deferred (không đưa vào phase này)
- Batch format: phạm vi hẹp, checklist chốt rõ, test sau từng bước

## Phase B Batches (Execution Order)
### H1 — Auth Claim Bridge
- Chốt claim contract: `profile_id` + `wallet_address` (lowercase)
- Chốt bridge path (API/Edge/server) + TTL/refresh/revoke
- Test: invalid/expired wallet session không cấp claim
- Gate: không còn mơ hồ ownership key cho RLS

### H2 — RLS Hardening (Replace Batch 4C)
- Xóa temp public-write policies `Batch 4C`
- Bật owner-scoped RLS cho `profiles`, `community_*`, `user_*`, `notifications`
- Giữ nguyên public-read subset `Batch 4A`
- Audit snapshot pass (temp policies = empty, owner policies missing = [])

### H3 — Functional Smoke (2 Wallet, Hardened)
- Rerun toàn bộ smoke 2-wallet trên `vcixsdudkizgfikhmfuv`
- Bổ sung negative checks cross-wallet denial
- Gate: không hồi quy consistency + không cần temp public writes

## GitHub Backup Track
- Mục tiêu: backup snapshot source + docs + migrations của ATP2 phase hiện tại
- Trạng thái hiện tại: workspace chưa là git repo, chưa có remote GitHub trong máy này
- Bước sẽ làm:
1. `git init` + `.gitignore` (node_modules, dist, .env, secrets)
2. commit local snapshot Phase A/B transition
3. push lên GitHub khi có remote URL + quyền truy cập (hoặc user cung cấp repo trống)

# Git Conflict Fix Guide

คู่มือแก้ไข Git conflict เมื่อ pull จาก remote

## 🚨 ปัญหาที่พบ

```
error: Your local changes to the following files would be overwritten by merge:
        deploy.sh
Please commit your changes or stash them before you merge.
```

## 🔧 วิธีแก้ไข

### วิธีที่ 1: Stash การเปลี่ยนแปลง (แนะนำ)

```bash
# ดูการเปลี่ยนแปลงที่ยังไม่ได้ commit
git status

# Stash การเปลี่ยนแปลงไว้ชั่วคราว
git stash

# Pull การแก้ไขล่าสุด
git pull origin main

# นำการเปลี่ยนแปลงกลับมา (ถ้าต้องการ)
git stash pop
```

### วิธีที่ 2: Commit การเปลี่ยนแปลงก่อน

```bash
# เพิ่มไฟล์ที่แก้ไข
git add deploy.sh

# Commit การเปลี่ยนแปลง
git commit -m "Local changes to deploy.sh"

# Pull และ merge
git pull origin main

# แก้ไข conflict (ถ้ามี)
# แล้ว commit อีกครั้ง
git add .
git commit -m "Resolve merge conflict"
```

### วิธีที่ 3: Reset และ Pull ใหม่ (ลบการเปลี่ยนแปลง local)

```bash
# ดูการเปลี่ยนแปลง
git diff deploy.sh

# Reset การเปลี่ยนแปลง (ระวัง: จะลบการแก้ไข local)
git checkout -- deploy.sh

# Pull การแก้ไขล่าสุด
git pull origin main
```

## 🎯 คำสั่งที่แนะนำสำหรับกรณีนี้

```bash
# 1. ดูการเปลี่ยนแปลงที่ยังไม่ได้ commit
git status

# 2. Stash การเปลี่ยนแปลง
git stash

# 3. Pull การแก้ไขล่าสุด
git pull origin main

# 4. ทดสอบ build
chmod +x test-build.sh
./test-build.sh

# 5. Deploy ระบบ
chmod +x deploy.sh
./deploy.sh
```

## 📝 คำอธิบาย

- **Stash**: เก็บการเปลี่ยนแปลงไว้ชั่วคราว ไม่ commit
- **Pull**: ดึงการแก้ไขล่าสุดจาก GitHub
- **Stash Pop**: นำการเปลี่ยนแปลงกลับมา (ถ้าต้องการ)

## ✅ หลังแก้ไขแล้ว

ระบบจะได้ไฟล์ `deploy.sh` เวอร์ชันล่าสุดที่แก้ไขปัญหา Docker Compose แล้ว

# GitHub Setup Guide

คู่มือการตั้งค่า GitHub Repository สำหรับ Cost Calculation System

## 📋 สิ่งที่ต้องเตรียม

### 1. GitHub Account
- สร้าง GitHub account ที่ https://github.com
- ตั้งค่า SSH key สำหรับ authentication

### 2. Repository Setup
- สร้าง repository ใหม่ใน GitHub
- Clone repository ลง local machine

## 🔧 การตั้งค่า Repository

### ขั้นตอนที่ 1: สร้าง Repository

1. ไปที่ GitHub.com และเข้าสู่ระบบ
2. คลิก "New repository"
3. ตั้งชื่อ repository: `cost-calculation-system`
4. เลือก "Private" หรือ "Public" ตามต้องการ
5. **อย่า** เลือก "Add a README file" (เพราะเรามีอยู่แล้ว)
6. คลิก "Create repository"

### ขั้นตอนที่ 2: Clone Repository

```bash
# Clone repository
git clone https://github.com/your-username/cost-calculation-system.git
cd cost-calculation-system

# หรือใช้ SSH (แนะนำ)
git clone git@github.com:your-username/cost-calculation-system.git
cd cost-calculation-system
```

### ขั้นตอนที่ 3: เพิ่มไฟล์เข้า Repository

```bash
# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Cost Calculation System with Docker support"

# Push to GitHub
git push origin main
```

## 🔑 การตั้งค่า SSH Key

### สร้าง SSH Key

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
```

### เพิ่ม SSH Key ใน GitHub

1. ไปที่ GitHub → Settings → SSH and GPG keys
2. คลิก "New SSH key"
3. ตั้งชื่อ key (เช่น "Production Server")
4. Paste public key ที่ copy มาจากขั้นตอนก่อนหน้า
5. คลิก "Add SSH key"

### ทดสอบ SSH Connection

```bash
ssh -T git@github.com
```

ควรได้ข้อความ: `Hi username! You've successfully authenticated...`

## ⚙️ การตั้งค่า GitHub Actions

### ขั้นตอนที่ 1: ตั้งค่า Secrets

ไปที่ Repository → Settings → Secrets and variables → Actions

เพิ่ม secrets ต่อไปนี้:

#### Required Secrets:
- **`SERVER_HOST`**: IP address ของ production server
- **`SERVER_USER`**: username สำหรับ SSH login
- **`SERVER_SSH_KEY`**: private SSH key ของ server

#### Optional Secrets:
- **`SLACK_WEBHOOK`**: webhook URL สำหรับ notification
- **`DOCKER_HUB_USERNAME`**: Docker Hub username (ถ้าใช้ Docker Hub)
- **`DOCKER_HUB_TOKEN`**: Docker Hub access token

### ขั้นตอนที่ 2: ตั้งค่า Server SSH Key

บน production server:

```bash
# Generate SSH key for server
ssh-keygen -t ed25519 -C "server@production"

# Copy private key content
cat ~/.ssh/id_ed25519

# Copy public key to authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/authorized_keys
```

### ขั้นตอนที่ 3: ทดสอบ GitHub Actions

```bash
# Push changes to trigger workflow
git add .
git commit -m "Test GitHub Actions deployment"
git push origin main
```

ตรวจสอบ workflow ที่: Repository → Actions tab

## 📁 Repository Structure

```
cost-calculation-system/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── backend/
├── frontend/
├── database/
├── docs/
├── nginx/
├── scripts/
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── deploy.sh
├── deploy.bat
├── env.example
├── DOCKER_DEPLOYMENT.md
├── GITHUB_SETUP.md
└── README.md
```

## 🔒 การตั้งค่า .gitignore

สร้างไฟล์ `.gitignore`:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
frontend/build/
frontend/dist/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker volumes
mysql_data/
mysql_default_data/

# Backup files
*.sql
backup_*.sql

# SSL certificates
nginx/ssl/
*.pem
*.key
*.crt

# Temporary files
tmp/
temp/
```

## 🔄 การใช้ Git Workflow

### การทำงานประจำวัน

```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push feature branch
git push origin feature/new-feature

# Create Pull Request on GitHub
```

### การ Deploy

```bash
# Merge to main branch
git checkout main
git merge feature/new-feature
git push origin main

# GitHub Actions will automatically deploy
```

## 📊 การ Monitor Repository

### GitHub Insights

1. **Pulse**: ดู activity ของ repository
2. **Contributors**: ดูใครมีส่วนร่วมในโปรเจกต์
3. **Traffic**: ดูจำนวน views และ clones
4. **Actions**: ดู status ของ workflows

### การตั้งค่า Branch Protection

1. ไปที่ Settings → Branches
2. คลิก "Add rule"
3. เลือก branch pattern: `main`
4. เลือก options:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Include administrators

## 🚨 การแก้ไขปัญหาที่พบบ่อย

### 1. Permission Denied (publickey)

```bash
# Check SSH key
ssh-add -l

# Test connection
ssh -T git@github.com

# Re-add SSH key
ssh-add ~/.ssh/id_ed25519
```

### 2. GitHub Actions ไม่ทำงาน

```bash
# Check workflow syntax
# ไปที่ Actions tab และดู error messages

# Check secrets
# ไปที่ Settings → Secrets และตรวจสอบว่าตั้งค่าถูกต้อง
```

### 3. Push ถูก reject

```bash
# Pull latest changes
git pull origin main

# Resolve conflicts if any
# Then push again
git push origin main
```

### 4. Large file upload

```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.sql"
git lfs track "*.log"

# Add .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

## 📝 Best Practices

### 1. Commit Messages

```bash
# Good commit messages
git commit -m "feat: add user authentication"
git commit -m "fix: resolve database connection issue"
git commit -m "docs: update deployment guide"

# Bad commit messages
git commit -m "fix"
git commit -m "update"
git commit -m "changes"
```

### 2. Branch Naming

```bash
# Good branch names
feature/user-authentication
bugfix/database-connection
hotfix/security-patch
docs/update-readme

# Bad branch names
new-feature
fix
update
```

### 3. Pull Request Guidelines

- ตั้งชื่อ PR ให้ชัดเจน
- เขียน description ที่อธิบายการเปลี่ยนแปลง
- ใส่ screenshots ถ้าจำเป็น
- Request review จากเพื่อนร่วมทีม

## 🔐 Security Considerations

### 1. Repository Security

- ใช้ Private repository สำหรับ production code
- ตั้งค่า Branch protection rules
- ใช้ 2FA สำหรับ GitHub account
- Review code ก่อน merge

### 2. Secrets Management

- อย่า commit secrets ลงใน code
- ใช้ GitHub Secrets สำหรับ sensitive data
- Rotate secrets เป็นประจำ
- Monitor secret usage

### 3. Access Control

- จำกัด access ให้เฉพาะคนที่จำเป็น
- ใช้ Team features ของ GitHub
- Review และ revoke access เป็นประจำ

## 📞 การขอความช่วยเหลือ

### GitHub Support
- GitHub Documentation: https://docs.github.com
- GitHub Community Forum: https://github.community
- GitHub Status: https://www.githubstatus.com

### Local Issues
- ตรวจสอบ Git configuration: `git config --list`
- ตรวจสอบ SSH connection: `ssh -T git@github.com`
- ตรวจสอบ repository URL: `git remote -v`

---

**หมายเหตุ**: คู่มือนี้ครอบคลุมการตั้งค่าพื้นฐาน สำหรับ advanced features เช่น GitHub Apps, Webhooks, หรือ API integration อาจต้องศึกษาเพิ่มเติม

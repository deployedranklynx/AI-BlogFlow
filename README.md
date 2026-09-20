# AI BlogFlow — Production Setup & Installation Guide

AI BlogFlow is an AI-powered blogging automation platform designed for managing multiple WordPress websites, keyword research, topic planning, content generation, SEO optimization, quality checking, internal linking, and n8n orchestration.

---

## 1. Requirements

- **Web Server**: Apache / LiteSpeed with `mod_rewrite` enabled (standard on cPanel)
- **PHP Version**: PHP 8.0, 8.1, or 8.2+
- **PHP Extensions**: `pdo_mysql`, `curl`, `mbstring`, `json`, `openssl`, `xml`
- **Database**: MySQL 8.0+ or MariaDB 10.5+
- **CMS Target**: WordPress 5.6+ with REST API enabled and Application Passwords support

---

## 2. cPanel / Shared Hosting Installation Steps

### Step 1: Upload Files
1. Download or export the project files.
2. Log in to your cPanel account.
3. Open **File Manager** and navigate to your target directory (e.g., `public_html/blogflow` or your domain's document root).
4. Upload all files. Ensure the `.htaccess` file is present.

### Step 2: Create MySQL Database
1. In cPanel, navigate to **MySQL Databases**.
2. Create a new database: e.g., `yourcpanel_blogflow`.
3. Create a new MySQL user with a strong password.
4. Add the user to the database and grant **ALL PRIVILEGES**.

### Step 3: Import Database Schema
1. Open **phpMyAdmin** in cPanel.
2. Select your newly created database.
3. Click the **Import** tab.
4. Choose `database.sql` from the project root and click **Import**.
5. All 24 normalized tables and initial seed data will be created.

### Step 4: Configure `config.php`
1. In File Manager, copy `config.example.php` and rename it to `config.php`.
2. Edit `config.php` with your database credentials:
   ```php
   'database' => [
       'host'     => '127.0.0.1',
       'database' => 'yourcpanel_blogflow',
       'username' => 'yourcpanel_dbuser',
       'password' => 'YourStrongDbPassword!',
   ],
   ```
3. Update `encryption_key` to a random 32-character key for securing credentials:
   ```php
   'encryption_key' => 'replace-with-32-character-secret-key-12345',
   ```

### Step 5: Directory Permissions
Ensure write permissions for runtime storage and logs:
- `storage/` -> `chmod 755` (or `775`)
- `storage/logs/` -> `chmod 755`

### Step 6: Initial Admin Login
1. Open your browser to `https://your-domain.com/blogflow/`.
2. Default Administrator credentials:
   - **Email**: `admin@blogflow.io`
   - **Password**: `Admin123!456`
3. Immediately navigate to **System Settings** and update your administrator password.

---

## 3. Connecting Services

### Google Gemini API Setup
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. In the AI BlogFlow Admin panel, go to **API Settings** > **AI Providers**.
3. Select **Google Gemini AI**, paste your API key, and click **Save & Test**.
4. The system validates the key using `gemini-3.8-flash`.

### WordPress Site Integration
1. Log in to your WordPress admin panel (`/wp-admin`).
2. Go to **Users** > **Profile** (or **Add User** for an automation bot).
3. Scroll to **Application Passwords**.
4. Name the application password (e.g., `BlogFlow Automation`) and click **Add New Application Password**.
5. Copy the generated password (e.g., `xxxx xxxx xxxx xxxx`).
6. In AI BlogFlow, go to **Websites** > **Add Website**:
   - **Website Name**: e.g., *Tech Insiders*
   - **WordPress URL**: `https://techinsiders.com`
   - **Username**: Your WordPress username
   - **Application Password**: The generated application password
   - **Publishing Mode**: `APPROVAL` (recommended to start), `AUTO`, or `DRAFT`
7. Click **Test Connection**. Once verified, save the website.

### n8n Automation Workflows
AI BlogFlow provides ready-to-use webhook trigger and listener endpoints:
- Ingress Endpoint: `https://your-domain.com/webhooks/n8n.php`
- Header: `X-BlogFlow-Signature` (HMAC-SHA256) or `Authorization: Bearer <n8n_master_secret>`
- Supported actions:
  1. `keyword_discovery`
  2. `topic_generation`
  3. `research`
  4. `article_generation`
  5. `seo_optimization`
  6. `quality_check`
  7. `image_generation`
  8. `internal_linking`
  9. `wordpress_publish`
  10. `performance_monitor`
  11. `content_update`

---

## 4. Emergency Controls & Safety
- **Emergency STOP Switch**: Accessible from the top header and Settings. Freezes all scheduled and webhook-triggered automations immediately.
- **Budget Caps**: Set maximum daily ($15.00 default) and monthly AI budgets to prevent unexpected API costs.

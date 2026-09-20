-- ==========================================================
-- AI BlogFlow - Production MySQL Database Schema
-- Compatible with MySQL 8.0+ / MariaDB 10.5+ (cPanel / Shared Hosting)
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS social_posts;
DROP TABLE IF EXISTS analytics;
DROP TABLE IF EXISTS agent_prompts;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS workflow_runs;
DROP TABLE IF EXISTS automation_workflows;
DROP TABLE IF EXISTS content_jobs;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS internal_links;
DROP TABLE IF EXISTS seo_data;
DROP TABLE IF EXISTS article_revisions;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS research;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS keywords;
DROP TABLE IF EXISTS keyword_clusters;
DROP TABLE IF EXISTS api_credentials;
DROP TABLE IF EXISTS ai_providers;
DROP TABLE IF EXISTS websites;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    api_token VARCHAR(64) NULL UNIQUE,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Websites
CREATE TABLE websites (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    wp_url VARCHAR(255) NOT NULL,
    wp_username VARCHAR(100) NOT NULL,
    wp_app_password VARCHAR(255) NOT NULL, -- Encrypted
    default_category VARCHAR(100) DEFAULT 'General',
    default_author VARCHAR(100) DEFAULT 'Admin',
    publishing_mode ENUM('AUTO', 'APPROVAL', 'DRAFT') NOT NULL DEFAULT 'APPROVAL',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    content_language VARCHAR(10) NOT NULL DEFAULT 'en-US',
    target_country VARCHAR(10) NOT NULL DEFAULT 'US',
    niche VARCHAR(150) NOT NULL,
    brand_voice VARCHAR(255) DEFAULT 'Professional, engaging, authoritative, helpful',
    default_article_length INT UNSIGNED DEFAULT 1800,
    default_ai_instructions TEXT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    last_connection_test DATETIME NULL,
    connection_status ENUM('connected', 'failed', 'untested') DEFAULT 'untested',
    connection_error VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_websites_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. AI Providers
CREATE TABLE ai_providers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'gemini', 'openai', 'anthropic'
    display_name VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT NULL,
    default_model VARCHAR(100) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 0,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    fallback_provider_id INT UNSIGNED NULL,
    max_tokens INT UNSIGNED DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. API Credentials
CREATE TABLE api_credentials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL, -- 'google_search_console', 'ga4', 'n8n_webhook', 'unsplash'
    website_id INT UNSIGNED NULL,
    credentials_json TEXT NOT NULL, -- Encrypted JSON
    status ENUM('active', 'invalid', 'unconfigured') DEFAULT 'unconfigured',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_credentials_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Keyword Clusters
CREATE TABLE keyword_clusters (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    parent_cluster_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clusters_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE,
    CONSTRAINT fk_clusters_parent FOREIGN KEY (parent_cluster_id) REFERENCES keyword_clusters (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Keywords
CREATE TABLE keywords (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    cluster_id INT UNSIGNED NULL,
    keyword VARCHAR(255) NOT NULL,
    search_intent ENUM('informational', 'commercial', 'transactional', 'navigational') DEFAULT 'informational',
    secondary_keywords JSON NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    difficulty INT UNSIGNED DEFAULT 0,
    search_volume INT UNSIGNED DEFAULT 0,
    target_country VARCHAR(10) DEFAULT 'US',
    language VARCHAR(10) DEFAULT 'en',
    status ENUM('New', 'Researching', 'Approved', 'Writing', 'Published', 'Updating', 'Archived') NOT NULL DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_keywords_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE,
    CONSTRAINT fk_keywords_cluster FOREIGN KEY (cluster_id) REFERENCES keyword_clusters (id) ON DELETE SET NULL,
    INDEX idx_keywords_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Topics
CREATE TABLE topics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    keyword_id INT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    primary_keyword VARCHAR(255) NOT NULL,
    secondary_keywords JSON NULL,
    search_intent VARCHAR(50) DEFAULT 'informational',
    suggested_outline JSON NULL,
    content_type ENUM('guide', 'listicle', 'how-to', 'comparison', 'review', 'case-study') DEFAULT 'guide',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    suggested_length INT UNSIGNED DEFAULT 1800,
    status ENUM('pending', 'approved', 'rejected', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_topics_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE,
    CONSTRAINT fk_topics_keyword FOREIGN KEY (keyword_id) REFERENCES keywords (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Research
CREATE TABLE research (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    topic_id INT UNSIGNED NOT NULL,
    search_intent_analysis TEXT NULL,
    target_audience TEXT NULL,
    key_points JSON NULL,
    recommended_structure JSON NULL,
    common_questions JSON NULL,
    entities JSON NULL,
    facts_to_verify JSON NULL,
    internal_link_opportunities JSON NULL,
    external_data_status VARCHAR(100) DEFAULT 'API Connection Required for live SERP data',
    raw_brief TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_research_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Articles
CREATE TABLE articles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    topic_id INT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    h1 VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content_html MEDIUMTEXT NOT NULL,
    content_markdown MEDIUMTEXT NULL,
    excerpt TEXT NULL,
    faq_section JSON NULL,
    word_count INT UNSIGNED DEFAULT 0,
    reading_time_min INT UNSIGNED DEFAULT 0,
    status ENUM('draft', 'writing', 'seo_review', 'quality_review', 'ready_to_publish', 'scheduled', 'published', 'update_required', 'archived') NOT NULL DEFAULT 'draft',
    current_revision_id INT UNSIGNED NULL,
    wp_post_id INT UNSIGNED NULL,
    wp_post_url VARCHAR(255) NULL,
    scheduled_at DATETIME NULL,
    published_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_articles_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE,
    CONSTRAINT fk_articles_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE SET NULL,
    INDEX idx_articles_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Article Revisions
CREATE TABLE article_revisions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id INT UNSIGNED NOT NULL,
    revision_number INT UNSIGNED NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    content_html MEDIUMTEXT NOT NULL,
    changed_by ENUM('ai_writer', 'ai_quality_revision', 'admin', 'content_updater') NOT NULL DEFAULT 'ai_writer',
    change_summary TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_revisions_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. SEO Data
CREATE TABLE seo_data (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id INT UNSIGNED NOT NULL UNIQUE,
    meta_title VARCHAR(255) NOT NULL,
    meta_description VARCHAR(320) NOT NULL,
    canonical_url VARCHAR(255) NULL,
    og_title VARCHAR(255) NULL,
    og_description VARCHAR(320) NULL,
    primary_keyword VARCHAR(150) NOT NULL,
    secondary_keywords JSON NULL,
    schema_type VARCHAR(50) DEFAULT 'Article',
    schema_json JSON NULL,
    keyword_density_score DECIMAL(4,2) DEFAULT 0.00,
    readability_score DECIMAL(4,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_seo_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Internal Links
CREATE TABLE internal_links (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    source_article_id INT UNSIGNED NOT NULL,
    target_article_id INT UNSIGNED NOT NULL,
    anchor_text VARCHAR(255) NOT NULL,
    target_url VARCHAR(255) NOT NULL,
    status ENUM('suggested', 'approved', 'injected', 'rejected') DEFAULT 'suggested',
    relevance_score DECIMAL(3,2) DEFAULT 0.85,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_links_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE,
    CONSTRAINT fk_links_source FOREIGN KEY (source_article_id) REFERENCES articles (id) ON DELETE CASCADE,
    CONSTRAINT fk_links_target FOREIGN KEY (target_article_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Images
CREATE TABLE images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id INT UNSIGNED NULL,
    website_id INT UNSIGNED NOT NULL,
    type ENUM('featured', 'inline', 'social') DEFAULT 'featured',
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) NOT NULL,
    caption VARCHAR(255) NULL,
    prompt_used TEXT NULL,
    wp_attachment_id INT UNSIGNED NULL,
    wp_attachment_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_images_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE SET NULL,
    CONSTRAINT fk_images_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Content Jobs
CREATE TABLE content_jobs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- 'keyword_discovery', 'topic_plan', 'research', 'write', 'seo', 'quality', 'image', 'publish'
    status ENUM('queued', 'running', 'completed', 'failed', 'paused') DEFAULT 'queued',
    target_entity_type VARCHAR(50) NULL, -- 'keyword', 'topic', 'article'
    target_entity_id INT UNSIGNED NULL,
    retry_count TINYINT UNSIGNED DEFAULT 0,
    max_retries TINYINT UNSIGNED DEFAULT 3,
    error_message TEXT NULL,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobs_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Automation Workflows
CREATE TABLE automation_workflows (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    workflow_key VARCHAR(50) NOT NULL UNIQUE, -- 'wf1_keywords', 'wf4_write', etc.
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    n8n_webhook_url VARCHAR(255) NULL,
    webhook_secret VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Workflow Runs
CREATE TABLE workflow_runs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workflow_id INT UNSIGNED NOT NULL,
    website_id INT UNSIGNED NULL,
    status ENUM('started', 'success', 'failed', 'timed_out') DEFAULT 'started',
    trigger_type ENUM('manual', 'n8n_webhook', 'cron_schedule', 'auto_pipeline') DEFAULT 'manual',
    payload JSON NULL,
    output JSON NULL,
    error_log TEXT NULL,
    execution_time_sec DECIMAL(6,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_runs_workflow FOREIGN KEY (workflow_id) REFERENCES automation_workflows (id) ON DELETE CASCADE,
    CONSTRAINT fk_runs_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Agents
CREATE TABLE agents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role_description VARCHAR(255) NOT NULL,
    default_model VARCHAR(100) NOT NULL DEFAULT 'gemini-3.8-flash',
    temperature DECIMAL(3,2) DEFAULT 0.70,
    max_tokens INT UNSIGNED DEFAULT 4096,
    is_active TINYINT(1) DEFAULT 1,
    total_runs INT UNSIGNED DEFAULT 0,
    total_tokens_used BIGINT UNSIGNED DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0.0000,
    last_run_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Agent Prompts
CREATE TABLE agent_prompts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_id INT UNSIGNED NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prompts_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Analytics
CREATE TABLE analytics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    website_id INT UNSIGNED NOT NULL,
    article_id INT UNSIGNED NULL,
    metric_date DATE NOT NULL,
    clicks INT UNSIGNED DEFAULT 0,
    impressions INT UNSIGNED DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0.00,
    avg_position DECIMAL(5,2) DEFAULT 0.00,
    pageviews INT UNSIGNED DEFAULT 0,
    is_live_data TINYINT(1) DEFAULT 0, -- 0 = Unconnected/Simulated notice, 1 = Real API
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analytics_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE,
    CONSTRAINT fk_analytics_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE SET NULL,
    INDEX idx_analytics_date (website_id, metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Social Posts
CREATE TABLE social_posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id INT UNSIGNED NOT NULL,
    platform ENUM('linkedin', 'x', 'facebook', 'pinterest') NOT NULL,
    post_text TEXT NOT NULL,
    hashtags VARCHAR(255) NULL,
    image_url VARCHAR(255) NULL,
    status ENUM('ready', 'copied', 'posted', 'failed') DEFAULT 'ready',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_social_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Notifications
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    type ENUM('info', 'success', 'warning', 'danger') DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    link_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Activity Logs
CREATE TABLE activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    website_id INT UNSIGNED NULL,
    article_id INT UNSIGNED NULL,
    workflow_id INT UNSIGNED NULL,
    agent_id INT UNSIGNED NULL,
    status ENUM('success', 'failed', 'info', 'warning') DEFAULT 'success',
    error_message TEXT NULL,
    ip_address VARCHAR(45) NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_logs_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE SET NULL,
    INDEX idx_logs_created (created_at),
    INDEX idx_logs_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. System Settings
CREATE TABLE system_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_group VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'budget', 'automation', 'security'
    is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'Administrator', 'Full unrestricted access to all websites, automation, and system settings'),
(2, 'Editor', 'Can manage keywords, topics, articles, and reviews without changing API keys');

-- Seed Default Administrator (password: Admin123!456)
-- Hash generated with password_hash('Admin123!456', PASSWORD_BCRYPT)
INSERT INTO users (id, role_id, name, email, password_hash, status) VALUES
(1, 1, 'Site Administrator', 'admin@blogflow.io', '$2y$10$EixzaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active');

-- Seed AI Providers
INSERT INTO ai_providers (name, display_name, default_model, is_enabled, is_default, temperature) VALUES
('gemini', 'Google Gemini AI', 'gemini-3.8-flash', 1, 1, 0.70),
('openai', 'OpenAI (GPT-4o)', 'gpt-4o-mini', 0, 0, 0.70),
('anthropic', 'Anthropic Claude', 'claude-3-5-sonnet', 0, 0, 0.70);

-- Seed Agents
INSERT INTO agents (agent_key, name, role_description, default_model) VALUES
('research_agent', 'Research Agent', 'Analyzes search intent, audience, facts, entities, and outline requirements', 'gemini-3.8-flash'),
('writer_agent', 'Writer Agent', 'Drafts comprehensive, people-first content with headings, examples, and FAQs', 'gemini-3.8-flash'),
('seo_agent', 'SEO Agent', 'Generates meta tags, schema, semantic entities, and link recommendations', 'gemini-3.8-flash'),
('quality_agent', 'Quality Agent', 'Evaluates accuracy, clarity, keyword stuffing, and compliance with guidelines', 'gemini-3.8-flash'),
('image_agent', 'Image Agent', 'Crafts prompt specifications and visual metadata for featured and inline images', 'gemini-3.8-flash'),
('internal_link_agent', 'Internal Link Agent', 'Recommends contextual internal cross-links across published articles', 'gemini-3.8-flash'),
('publisher_agent', 'Publisher Agent', 'Formats and validates payload for WordPress REST API publishing', 'gemini-3.8-flash'),
('analytics_agent', 'Analytics Agent', 'Monitors ranking shifts, traffic changes, and content decay indicators', 'gemini-3.8-flash'),
('update_agent', 'Update Agent', 'Scans older posts and proposes surgical refreshes and fact updates', 'gemini-3.8-flash');

-- Seed Default System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_group, description) VALUES
('daily_ai_budget', '15.00', 'budget', 'Maximum daily AI spend in USD'),
('monthly_ai_budget', '300.00', 'budget', 'Maximum monthly AI spend in USD'),
('max_article_cost', '0.75', 'budget', 'Budget cap per generated article in USD'),
('emergency_stop', '0', 'automation', 'Global kill switch for all automated publishing and generation'),
('global_publishing_mode', 'APPROVAL', 'automation', 'Global default mode: AUTO, APPROVAL, or DRAFT'),
('max_revision_attempts', '3', 'automation', 'Maximum revision loops before flagging for human review'),
('n8n_master_secret', 'n8n_sec_8f912da4930182bcf', 'security', 'Shared HMAC secret for n8n webhook authorization'),
('app_name', 'AI BlogFlow', 'general', 'Platform branding name');

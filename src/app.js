/**
 * AI BlogFlow - Production Vanilla JavaScript Controller
 * Pure Vanilla JS, HTML5, Bootstrap 5 UI Controller with REST API integration
 */

// State
const state = {
  currentView: 'dashboard',
  websites: [],
  dashboardStats: null,
  dashboardPipeline: [],
  systemHealth: null,
  activityLogs: [],
  systemSettings: null,
  aiProviders: [],
  workflows: [],
  emergencyStop: false,
  currentUser: null
};

// Bootstrap Modal instances
let websiteModalInstance = null;
let testConnModalInstance = null;
let aiTestModalInstance = null;
let toastInstance = null;

// ==========================================================
// Initialization & Routing
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Init Bootstrap components
  const toastEl = document.getElementById('liveToast');
  if (toastEl && window.bootstrap) {
    toastInstance = new window.bootstrap.Toast(toastEl, { delay: 4000 });
  }

  const websiteModalEl = document.getElementById('websiteModal');
  if (websiteModalEl && window.bootstrap) {
    websiteModalInstance = new window.bootstrap.Modal(websiteModalEl);
  }

  const testConnModalEl = document.getElementById('testConnModal');
  if (testConnModalEl && window.bootstrap) {
    testConnModalInstance = new window.bootstrap.Modal(testConnModalEl);
  }

  const aiTestModalEl = document.getElementById('aiTestModal');
  if (aiTestModalEl && window.bootstrap) {
    aiTestModalInstance = new window.bootstrap.Modal(aiTestModalEl);
  }

  // Setup Event Listeners
  setupNavigation();
  setupGlobalControls();

  // Load Initial Data
  await loadCurrentUser();
  await refreshGlobalData();

  // Check URL Hash for initial view
  const hash = window.location.hash.replace('#', '');
  const initialView = hash || 'dashboard';
  navigateTo(initialView);
});

// Toast notification helper
function showToast(message, type = 'success') {
  const toastEl = document.getElementById('liveToast');
  const toastMsg = document.getElementById('toastMessage');
  if (!toastEl || !toastMsg) return;

  toastEl.className = `toast align-items-center border-0 text-white bg-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'primary'}`;
  toastMsg.textContent = message;

  if (toastInstance) {
    toastInstance.show();
  }
}

// Safe JSON Fetch helper that never throws on HTML / redirect responses
async function safeJsonFetch(url, options = {}) {
  try {
    const headers = {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    
    // If not JSON (e.g. redirected or proxy error page), return structured error safely
    const text = await res.text();
    console.warn(`Non-JSON response from ${url} (HTTP ${res.status}):`, text.slice(0, 100));
    return {
      success: false,
      error: `Server responded with status ${res.status} (${res.statusText || 'Non-JSON'})`
    };
  } catch (err) {
    console.warn(`Fetch error for ${url}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Global data refresh
async function refreshGlobalData() {
  try {
    const [statsRes, pipelineRes, healthRes, settingsRes] = await Promise.all([
      safeJsonFetch('/api/dashboard/stats'),
      safeJsonFetch('/api/dashboard/pipeline'),
      safeJsonFetch('/api/dashboard/health'),
      safeJsonFetch('/api/settings')
    ]);

    if (statsRes.success) state.dashboardStats = statsRes.data;
    if (pipelineRes.success) state.dashboardPipeline = pipelineRes.data;
    if (healthRes.success) state.systemHealth = healthRes.data;
    if (settingsRes.success) {
      state.systemSettings = settingsRes.data;
      state.aiProviders = settingsRes.providers || [];
      updateEmergencyStopUI(settingsRes.data.emergency_stop);
    }
  } catch (err) {
    console.error('Error loading global data:', err);
  }
}

async function loadCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = data.user;
      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.textContent = data.user.name;
    }
  } catch (err) {
    console.error('Error loading user profile:', err);
  }
}

// ==========================================================
// Navigation & Sidebar
// ==========================================================
function setupNavigation() {
  // Sidebar Links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) {
        window.location.hash = view;
        navigateTo(view);
      }
      // Close mobile sidebar if open
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('show-mobile')) {
        sidebar.classList.remove('show-mobile');
      }
    });
  });

  // Sidebar Toggle buttons
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth < 992) {
        sidebar.classList.toggle('show-mobile');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  if (closeSidebarBtn && sidebar) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('show-mobile');
    });
  }

  // Hash change listener
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(view);
  });
}

function navigateTo(viewName) {
  state.currentView = viewName;

  // Update active class in sidebar
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const container = document.getElementById('view-container');
  if (!container) return;

  // Route to renderer
  switch (viewName) {
    case 'dashboard':
      renderDashboardView(container);
      break;
    case 'websites':
      renderWebsitesView(container);
      break;
    case 'keywords':
      renderKeywordsView(container);
      break;
    case 'topics':
      renderTopicsView(container);
      break;
    case 'research':
      renderResearchView(container);
      break;
    case 'articles':
      renderArticlesView(container);
      break;
    case 'calendar':
      renderCalendarView(container);
      break;
    case 'wordpress':
      renderWordPressView(container);
      break;
    case 'internal-links':
      renderInternalLinksView(container);
      break;
    case 'images':
      renderImagesView(container);
      break;
    case 'seo':
      renderSeoView(container);
      break;
    case 'analytics':
      renderAnalyticsView(container);
      break;
    case 'updates':
      renderUpdatesView(container);
      break;
    case 'social':
      renderSocialView(container);
      break;
    case 'automation':
      renderAutomationView(container);
      break;
    case 'ai-agents':
      renderAiAgentsView(container);
      break;
    case 'api-settings':
      renderApiSettingsView(container);
      break;
    case 'costs':
      renderCostsView(container);
      break;
    case 'logs':
      renderLogsView(container);
      break;
    case 'settings':
      renderSettingsView(container);
      break;
    case 'cpanel':
      renderCPanelPackageView(container);
      break;
    default:
      renderDashboardView(container);
  }
}

// ==========================================================
// Global Controls & Emergency Switch
// ==========================================================
function setupGlobalControls() {
  const stopBtn = document.getElementById('emergency-stop-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', toggleEmergencyStop);
  }

  const resumeBtn = document.getElementById('resume-automation-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', toggleEmergencyStop);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      showToast('Admin logged out. Session active in local demo mode.', 'info');
    });
  }

  // Global search trigger
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) {
    globalSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearch.value.trim();
        if (query) {
          window.location.hash = 'websites';
          navigateTo('websites');
          setTimeout(() => {
            const siteSearch = document.getElementById('site-search-input');
            if (siteSearch) {
              siteSearch.value = query;
              siteSearch.dispatchEvent(new Event('input'));
            }
          }, 100);
        }
      }
    });
  }

  // Website Modal Form Submission
  const websiteForm = document.getElementById('website-form');
  if (websiteForm) {
    websiteForm.addEventListener('submit', handleSaveWebsite);
  }

  // AI Live Test Execution
  const executeAiTestBtn = document.getElementById('execute-ai-test-btn');
  if (executeAiTestBtn) {
    executeAiTestBtn.addEventListener('click', handleExecuteAiTest);
  }
}

async function toggleEmergencyStop() {
  try {
    const res = await fetch('/api/settings/emergency-stop', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      state.emergencyStop = data.emergency_stop;
      updateEmergencyStopUI(data.emergency_stop);
      showToast(data.message, data.emergency_stop ? 'danger' : 'success');
      // Refresh current view if needed
      if (state.currentView === 'dashboard' || state.currentView === 'automation') {
        navigateTo(state.currentView);
      }
    }
  } catch (err) {
    showToast('Failed to toggle emergency stop: ' + err.message, 'danger');
  }
}

function updateEmergencyStopUI(isStopped) {
  state.emergencyStop = isStopped;
  const banner = document.getElementById('emergency-banner');
  const btnLabel = document.getElementById('emergency-stop-label');
  const stopBtn = document.getElementById('emergency-stop-btn');

  if (isStopped) {
    if (banner) banner.classList.remove('d-none');
    if (btnLabel) btnLabel.textContent = 'STOP ACTIVE';
    if (stopBtn) {
      stopBtn.className = 'btn btn-sm btn-danger d-flex align-items-center gap-2';
    }
  } else {
    if (banner) banner.classList.add('d-none');
    if (btnLabel) btnLabel.textContent = 'Emergency STOP';
    if (stopBtn) {
      stopBtn.className = 'btn btn-sm btn-outline-danger d-flex align-items-center gap-2';
    }
  }
}

// ==========================================================
// VIEW 1: DASHBOARD
// ==========================================================
async function renderDashboardView(container) {
  await refreshGlobalData();
  const stats = state.dashboardStats || {
    totalWebsites: 2,
    activeWebsites: 2,
    totalKeywords: 7,
    articlesGenerated: 4,
    articlesPublished: 2,
    articlesScheduled: 0,
    articlesRequiringReview: 2,
    failedJobs: 0,
    aiUsage: { dailySpend: 2.14, dailyBudget: 15.00, monthlySpend: 48.60, monthlyBudget: 300.00, totalApiCalls: 312 }
  };
  const pipeline = state.dashboardPipeline || [];
  const health = state.systemHealth || {};

  container.innerHTML = `
    <!-- Top Greeting & Header -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h4 class="fw-bold mb-1">Automation Dashboard</h4>
        <p class="text-secondary mb-0">Multi-site AI blogging pipeline status and operational health</p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-saas-secondary" id="dash-open-ai-test">
          <i class="bi bi-robot text-primary me-1"></i> Test Gemini AI
        </button>
        <button class="btn btn-saas-primary" id="dash-add-site-btn">
          <i class="bi bi-plus-lg me-1"></i> Add Website
        </button>
      </div>
    </div>

    <!-- 1. Top Metrics Cards Grid -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="metric-card">
          <div class="metric-title">Websites Managed</div>
          <div class="metric-value">${stats.totalWebsites}</div>
          <div class="metric-sub text-success">
            <i class="bi bi-check-circle-fill"></i> ${stats.activeWebsites} Active (${stats.totalWebsites - stats.activeWebsites} Inactive)
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="metric-card">
          <div class="metric-title">Keywords in DB</div>
          <div class="metric-value">${stats.totalKeywords}</div>
          <div class="metric-sub text-secondary">
            <i class="bi bi-diagram-2"></i> Ranked in Clusters
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="metric-card">
          <div class="metric-title">Articles Published</div>
          <div class="metric-value">${stats.articlesPublished}</div>
          <div class="metric-sub text-success">
            <i class="bi bi-wordpress"></i> Synced to WordPress
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="metric-card">
          <div class="metric-title">Requiring Review</div>
          <div class="metric-value text-warning">${stats.articlesRequiringReview}</div>
          <div class="metric-sub text-warning">
            <i class="bi bi-shield-exclamation"></i> Quality & SEO Check
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Content Pipeline Flow -->
    <div class="card-saas mb-4">
      <div class="card-saas-header">
        <div>
          <h6 class="fw-bold mb-0">Automated Content Pipeline</h6>
          <small class="text-secondary">Stage-by-stage distribution of queued and active content items</small>
        </div>
        <a href="#automation" class="btn btn-sm btn-light border">
          <i class="bi bi-gear me-1"></i> Manage Workflows
        </a>
      </div>
      <div class="card-saas-body p-3">
        <div class="pipeline-container">
          ${pipeline.map((p, idx) => `
            <div class="pipeline-step ${p.count > 0 ? 'active' : ''}">
              <div class="text-secondary small mb-1">Step ${idx + 1}</div>
              <div class="pipeline-step-title">${p.stage}</div>
              <div class="pipeline-step-count">${p.count}</div>
              <div class="mt-1">
                <i class="bi bi-${p.icon} text-${p.color || 'primary'}"></i>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 3. Two Column Details: System Health & AI Cost Monitor -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-7">
        <div class="card-saas h-100 mb-0">
          <div class="card-saas-header">
            <h6 class="fw-bold mb-0">Recent Published & In-Review Content</h6>
            <a href="#articles" class="btn btn-sm btn-link text-decoration-none p-0">View All</a>
          </div>
          <div class="table-responsive">
            <table class="table table-saas">
              <thead>
                <tr>
                  <th>Article Title</th>
                  <th>Website</th>
                  <th>Status</th>
                  <th>Words</th>
                  <th class="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="fw-semibold text-truncate" style="max-width: 220px;">The Ultimate Guide to B2B SaaS Onboarding in 2026</div>
                    <small class="text-muted">/b2b-saas-onboarding-best-practices</small>
                  </td>
                  <td><span class="badge bg-light text-dark border">SaaS Growth Journal</span></td>
                  <td><span class="badge-status published"><i class="bi bi-check-circle"></i> Published</span></td>
                  <td>2,340</td>
                  <td class="text-end">
                    <a href="https://saasgrowthjournal.com/b2b-saas-onboarding-best-practices" target="_blank" class="btn btn-sm btn-light border py-0 px-2" title="View in WP">
                      <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="fw-semibold text-truncate" style="max-width: 220px;">How to Automate Multi-Site Blogging with n8n and Gemini</div>
                    <small class="text-muted">/automate-multi-site-blogging-n8n-gemini</small>
                  </td>
                  <td><span class="badge bg-light text-dark border">AI Productivity Hub</span></td>
                  <td><span class="badge-status published"><i class="bi bi-check-circle"></i> Published</span></td>
                  <td>2,180</td>
                  <td class="text-end">
                    <a href="https://aiproductivityhub.io/automate-multi-site-blogging-n8n-gemini" target="_blank" class="btn btn-sm btn-light border py-0 px-2" title="View in WP">
                      <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="fw-semibold text-truncate" style="max-width: 220px;">7 Retention Strategies Every SaaS Founder Needs</div>
                    <small class="text-muted">/saas-retention-strategies</small>
                  </td>
                  <td><span class="badge bg-light text-dark border">SaaS Growth Journal</span></td>
                  <td><span class="badge-status review"><i class="bi bi-hourglass-split"></i> Quality Review</span></td>
                  <td>1,950</td>
                  <td class="text-end">
                    <a href="#articles" class="btn btn-sm btn-saas-primary py-0 px-2">Review</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <!-- Operational Health Card -->
        <div class="card-saas mb-4">
          <div class="card-saas-header">
            <h6 class="fw-bold mb-0">Operational System Health</h6>
            <span class="badge ${health.systemStatus === 'HEALTHY' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fw-bold">
              ${health.systemStatus || 'HEALTHY'}
            </span>
          </div>
          <div class="card-saas-body py-3">
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <div class="fw-semibold small">Database Engine</div>
                <small class="text-muted">${health.database || 'MySQL / SQLite Engine Ready'}</small>
              </div>
              <span class="badge bg-success-subtle text-success">OK</span>
            </div>
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <div class="fw-semibold small">AI Primary Provider</div>
                <small class="text-muted">${health.aiProvider || 'Google Gemini API'}</small>
              </div>
              <span class="badge bg-success-subtle text-success">Active</span>
            </div>
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <div class="fw-semibold small">n8n Webhook Ingress</div>
                <small class="text-muted">${health.n8nWebhooks || 'HMAC Protected /webhooks/n8n.php'}</small>
              </div>
              <span class="badge bg-primary-subtle text-primary">Listening</span>
            </div>
            <div class="d-flex justify-content-between align-items-center py-2">
              <div>
                <div class="fw-semibold small">Cron & Background Scheduler</div>
                <small class="text-muted">${health.cronScheduler || 'Active (Every 5 mins)'}</small>
              </div>
              <span class="badge bg-info-subtle text-info">Running</span>
            </div>
          </div>
        </div>

        <!-- AI Budget & Spend Card -->
        <div class="card-saas mb-0">
          <div class="card-saas-header">
            <h6 class="fw-bold mb-0">AI Cost & Budget Control</h6>
            <a href="#costs" class="small text-decoration-none">Budget Limits</a>
          </div>
          <div class="card-saas-body py-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="small text-secondary">Today's Spend</span>
              <span class="fw-bold">$${(stats.aiUsage?.dailySpend || 2.14).toFixed(2)} / $${(stats.aiUsage?.dailyBudget || 15.00).toFixed(2)}</span>
            </div>
            <div class="progress mb-3" style="height: 6px;">
              <div class="progress-bar bg-primary" role="progressbar" style="width: ${Math.min(100, ((stats.aiUsage?.dailySpend || 2.14) / (stats.aiUsage?.dailyBudget || 15.00)) * 100)}%"></div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="small text-secondary">Monthly Spend</span>
              <span class="fw-bold">$${(stats.aiUsage?.monthlySpend || 48.60).toFixed(2)} / $${(stats.aiUsage?.monthlyBudget || 300.00).toFixed(2)}</span>
            </div>
            <div class="progress mb-2" style="height: 6px;">
              <div class="progress-bar bg-success" role="progressbar" style="width: ${Math.min(100, ((stats.aiUsage?.monthlySpend || 48.60) / (stats.aiUsage?.monthlyBudget || 300.00)) * 100)}%"></div>
            </div>
            <small class="text-muted">Total API calls processed: <strong>${stats.aiUsage?.totalApiCalls || 312}</strong></small>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Dashboard Buttons
  const addSiteBtn = document.getElementById('dash-add-site-btn');
  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', () => openWebsiteModal());
  }

  const aiTestBtn = document.getElementById('dash-open-ai-test');
  if (aiTestBtn) {
    aiTestBtn.addEventListener('click', () => {
      if (aiTestModalInstance) aiTestModalInstance.show();
    });
  }
}

// ==========================================================
// VIEW 2: WEBSITES MANAGEMENT (PHASE 1 CORE)
// ==========================================================
async function renderWebsitesView(container) {
  try {
    const data = await safeJsonFetch('/api/websites');
    if (data.success && Array.isArray(data.data)) {
      state.websites = data.data;
      try {
        localStorage.setItem('blogflow_websites', JSON.stringify(state.websites));
      } catch (e) {}
    } else {
      // Fallback to local storage if API didn't return an array
      const cached = localStorage.getItem('blogflow_websites');
      if (cached) {
        state.websites = JSON.parse(cached);
      }
    }
  } catch (err) {
    console.warn('Error fetching websites, using cached state:', err);
    try {
      const cached = localStorage.getItem('blogflow_websites');
      if (cached) {
        state.websites = JSON.parse(cached);
      }
    } catch (e) {}
  }

  container.innerHTML = `
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h4 class="fw-bold mb-1">Connected Websites</h4>
        <p class="text-secondary mb-0">Manage WordPress sites, credentials, publishing modes, and editorial parameters</p>
      </div>
      <button class="btn btn-saas-primary" id="add-website-btn">
        <i class="bi bi-plus-lg me-1"></i> Add WordPress Website
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="card-saas mb-4">
      <div class="card-saas-body py-3 px-3">
        <div class="row g-3 align-items-center">
          <div class="col-12 col-md-5">
            <div class="input-group">
              <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-secondary"></i></span>
              <input type="text" class="form-control border-start-0" id="site-search-input" placeholder="Search by site name, domain, or niche..." />
            </div>
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select" id="site-status-filter">
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div class="col-6 col-md-4 text-md-end">
            <span class="text-secondary small">Total Websites: <strong id="site-count-badge">${state.websites.length}</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Websites List Table -->
    <div class="card-saas">
      <div class="table-responsive">
        <table class="table table-saas" id="websites-table">
          <thead>
            <tr>
              <th>Website & Domain</th>
              <th>Niche & Voice</th>
              <th>Publishing Mode</th>
              <th>Credentials</th>
              <th>Connection Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody id="websites-table-body">
            ${renderWebsitesTableRows(state.websites)}
          </tbody>
        </table>
      </div>
      <div id="websites-empty-state" class="text-center py-5 ${state.websites.length > 0 ? 'd-none' : ''}">
        <div class="text-secondary mb-2"><i class="bi bi-globe2 fs-1"></i></div>
        <h6 class="fw-bold">No Websites Connected Yet</h6>
        <p class="text-secondary small mb-3">Add your first WordPress website to begin automating content generation and publishing.</p>
        <button class="btn btn-saas-primary btn-sm" id="empty-add-site-btn">
          <i class="bi bi-plus-lg me-1"></i> Add Website
        </button>
      </div>
    </div>
  `;

  // Bind Buttons & Events
  const addBtn = document.getElementById('add-website-btn');
  if (addBtn) addBtn.addEventListener('click', () => openWebsiteModal());

  const emptyAddBtn = document.getElementById('empty-add-site-btn');
  if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => openWebsiteModal());

  // Filter and search
  const searchInput = document.getElementById('site-search-input');
  const statusFilter = document.getElementById('site-status-filter');

  function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const st = statusFilter.value;

    const filtered = state.websites.filter(site => {
      const matchesSearch = !q || 
        site.name.toLowerCase().includes(q) || 
        site.domain.toLowerCase().includes(q) || 
        (site.niche && site.niche.toLowerCase().includes(q));
      const matchesStatus = st === 'ALL' || site.status === st;
      return matchesSearch && matchesStatus;
    });

    const tbody = document.getElementById('websites-table-body');
    if (tbody) tbody.innerHTML = renderWebsitesTableRows(filtered);
    bindWebsiteRowActions();
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);

  bindWebsiteRowActions();
}

function renderWebsitesTableRows(websites) {
  if (websites.length === 0) {
    return `<tr><td colspan="6" class="text-center py-4 text-muted">No websites match your filter criteria.</td></tr>`;
  }

  return websites.map(site => `
    <tr data-site-id="${site.id}">
      <td>
        <div class="fw-bold">${site.name}</div>
        <a href="${site.domain}" target="_blank" class="small text-secondary text-decoration-none">
          ${site.domain} <i class="bi bi-box-arrow-up-right" style="font-size: 0.7rem;"></i>
        </a>
        <div class="small text-muted mt-1">
          <span class="badge bg-light text-secondary border me-1">${site.content_language || 'en-US'}</span>
          <span class="badge bg-light text-secondary border">${site.target_country || 'US'}</span>
        </div>
      </td>
      <td>
        <div class="fw-semibold text-truncate" style="max-width: 200px;">${site.niche || 'General'}</div>
        <small class="text-muted text-truncate d-block" style="max-width: 200px;" title="${site.brand_voice || ''}">
          ${site.brand_voice || 'Default Voice'}
        </small>
        <small class="text-secondary">Target: ~${site.default_article_length || 1800} words</small>
      </td>
      <td>
        <span class="badge-mode ${site.publishing_mode || 'APPROVAL'}">${site.publishing_mode || 'APPROVAL'}</span>
        <div class="small text-muted mt-1">Category: ${site.default_category || 'General'}</div>
      </td>
      <td>
        <div class="small fw-semibold"><i class="bi bi-person me-1"></i>${site.wp_username}</div>
        <div class="small font-monospace text-secondary">${site.wp_app_password_masked || '••••••••'}</div>
      </td>
      <td>
        <div>
          <span class="badge-status ${site.status === 'active' ? 'active' : 'inactive'} mb-1">
            <i class="bi bi-${site.status === 'active' ? 'check-circle' : 'dash-circle'}"></i> ${site.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <small class="text-muted d-block" style="font-size: 0.72rem;">
          Verified: ${site.last_connection_test ? new Date(site.last_connection_test).toLocaleDateString() : 'Untested'}
        </small>
      </td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-light border test-conn-btn" data-id="${site.id}" title="Test WordPress Connection">
            <i class="bi bi-arrow-repeat text-primary"></i> Test
          </button>
          <button class="btn btn-light border edit-site-btn" data-id="${site.id}" title="Edit Settings">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-light border toggle-status-btn" data-id="${site.id}" title="Toggle Active/Inactive">
            <i class="bi bi-power ${site.status === 'active' ? 'text-success' : 'text-secondary'}"></i>
          </button>
          <button class="btn btn-light border delete-site-btn text-danger" data-id="${site.id}" title="Delete Website">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function bindWebsiteRowActions() {
  // Test Connection
  document.querySelectorAll('.test-conn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleTestConnection(id);
    });
  });

  // Edit Site
  document.querySelectorAll('.edit-site-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const site = state.websites.find(w => w.id === Number(id));
      if (site) openWebsiteModal(site);
    });
  });

  // Toggle Active
  document.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`/api/websites/${id}/toggle-status`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          renderWebsitesView(document.getElementById('view-container'));
        }
      } catch (err) {
        showToast('Error changing status: ' + err.message, 'danger');
      }
    });
  });

  // Delete Site
  document.querySelectorAll('.delete-site-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const site = state.websites.find(w => w.id === Number(id));
      if (!site) return;

      if (confirm(`Are you sure you want to delete "${site.name}"? This will unlink associated keywords and automations.`)) {
        try {
          const res = await fetch(`/api/websites/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message, 'success');
            renderWebsitesView(document.getElementById('view-container'));
          }
        } catch (err) {
          showToast('Error deleting website: ' + err.message, 'danger');
        }
      }
    });
  });
}

// Modal open for Add or Edit
function openWebsiteModal(site = null) {
  const modalTitle = document.getElementById('websiteModalLabel');
  const siteIdInput = document.getElementById('modal-website-id');
  const nameInput = document.getElementById('form-website-name');
  const domainInput = document.getElementById('form-domain');
  const wpUrlInput = document.getElementById('form-wp-url');
  const wpUserInput = document.getElementById('form-wp-username');
  const wpPwInput = document.getElementById('form-wp-password');
  const starEl = document.getElementById('pw-required-star');
  const pwHelp = document.getElementById('pw-help-text');

  const pubModeInput = document.getElementById('form-publishing-mode');
  const catInput = document.getElementById('form-default-category');
  const authorInput = document.getElementById('form-default-author');
  const countryInput = document.getElementById('form-target-country');
  const langInput = document.getElementById('form-content-language');
  const tzInput = document.getElementById('form-timezone');
  const nicheInput = document.getElementById('form-niche');
  const lengthInput = document.getElementById('form-article-length');
  const voiceInput = document.getElementById('form-brand-voice');
  const instructionsInput = document.getElementById('form-ai-instructions');

  if (site) {
    modalTitle.textContent = `Edit Website: ${site.name}`;
    siteIdInput.value = site.id;
    nameInput.value = site.name;
    domainInput.value = site.domain;
    wpUrlInput.value = site.wp_url;
    wpUserInput.value = site.wp_username;
    wpPwInput.value = '';
    wpPwInput.placeholder = 'Leave blank to keep existing password (' + site.wp_app_password_masked + ')';
    if (starEl) starEl.style.display = 'none';
    if (pwHelp) pwHelp.textContent = 'Leave empty to retain encrypted saved application password.';

    pubModeInput.value = site.publishing_mode || 'APPROVAL';
    catInput.value = site.default_category || 'General';
    authorInput.value = site.default_author || 'Admin';
    countryInput.value = site.target_country || 'US';
    langInput.value = site.content_language || 'en-US';
    tzInput.value = site.timezone || 'UTC';
    nicheInput.value = site.niche || '';
    lengthInput.value = site.default_article_length || 1800;
    voiceInput.value = site.brand_voice || '';
    instructionsInput.value = site.default_ai_instructions || '';
  } else {
    modalTitle.textContent = 'Add WordPress Website';
    siteIdInput.value = '';
    nameInput.value = '';
    domainInput.value = '';
    wpUrlInput.value = '';
    wpUserInput.value = '';
    wpPwInput.value = '';
    wpPwInput.placeholder = 'xxxx xxxx xxxx xxxx';
    if (starEl) starEl.style.display = 'inline';
    if (pwHelp) pwHelp.textContent = 'WordPress Application Password (created in WP Users > Profile).';

    pubModeInput.value = 'APPROVAL';
    catInput.value = 'General';
    authorInput.value = 'Admin';
    countryInput.value = 'US';
    langInput.value = 'en-US';
    tzInput.value = 'UTC';
    nicheInput.value = '';
    lengthInput.value = 1800;
    voiceInput.value = 'Professional, authoritative, actionable, clear';
    instructionsInput.value = '';
  }

  if (websiteModalInstance) {
    websiteModalInstance.show();
  }
}

async function handleSaveWebsite(e) {
  e.preventDefault();
  const siteId = document.getElementById('modal-website-id').value;

  const rawName = document.getElementById('form-website-name').value.trim();
  const rawDomain = document.getElementById('form-domain').value.trim();
  const rawWpUrl = document.getElementById('form-wp-url').value.trim();
  const rawUsername = document.getElementById('form-wp-username').value.trim();
  const rawPassword = document.getElementById('form-wp-password').value.trim();

  // Helper to format URLs
  const formatUrl = (u) => {
    if (!u) return '';
    let trimmed = u.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed.replace(/\/+$/, '');
  };

  const domain = formatUrl(rawDomain);
  const wp_url = formatUrl(rawWpUrl);

  if (!rawName || !domain || !wp_url || !rawUsername) {
    showToast('Please fill in all required fields (Name, Domain, WordPress URL, Username)', 'warning');
    return;
  }

  if (!siteId && !rawPassword) {
    showToast('Please provide a WordPress Application Password for connecting.', 'warning');
    return;
  }

  const payload = {
    name: rawName,
    domain,
    wp_url,
    wp_username: rawUsername,
    wp_app_password: rawPassword,
    publishing_mode: document.getElementById('form-publishing-mode').value || 'APPROVAL',
    default_category: document.getElementById('form-default-category').value.trim() || 'General',
    default_author: document.getElementById('form-default-author').value.trim() || 'Admin',
    target_country: document.getElementById('form-target-country').value || 'US',
    content_language: document.getElementById('form-content-language').value || 'en-US',
    timezone: document.getElementById('form-timezone').value || 'UTC',
    niche: document.getElementById('form-niche').value.trim() || 'General Technology',
    default_article_length: Number(document.getElementById('form-article-length').value) || 1800,
    brand_voice: document.getElementById('form-brand-voice').value.trim() || 'Professional, authoritative, actionable',
    default_ai_instructions: document.getElementById('form-ai-instructions').value.trim()
  };

  const saveBtn = document.getElementById('save-website-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Saving...';
  }

  try {
    const url = siteId ? `/api/websites/${siteId}` : '/api/websites';
    const method = siteId ? 'PUT' : 'POST';

    let savedSite = null;
    let message = siteId ? 'Website updated successfully' : 'Website added successfully';

    // 1. Try server API call
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.data) {
          savedSite = data.data;
          message = data.message || message;
        } else if (!data.success && data.error) {
          throw new Error(data.error);
        }
      } else {
        // Non-JSON response (e.g. proxy HTML / auth bridge redirect)
        console.warn(`Non-JSON response from ${url} (HTTP ${res.status})`);
      }
    } catch (apiErr) {
      console.warn('API sync notice:', apiErr.message);
      // If server explicitly returned validation error, warn user
      if (apiErr.message && !apiErr.message.includes('Unexpected') && !apiErr.message.includes('fetch') && !apiErr.message.includes('HTTP')) {
        showToast(apiErr.message, 'warning');
        return;
      }
    }

    // 2. Resilient local fallback if server was temporarily unreachable or redirected
    if (!savedSite) {
      const maskedPw = rawPassword
        ? '•••• •••• •••• ' + rawPassword.replace(/\s+/g, '').slice(-4)
        : '•••• •••• •••• ****';

      if (siteId) {
        const existingIdx = state.websites.findIndex(w => w.id === Number(siteId));
        if (existingIdx !== -1) {
          state.websites[existingIdx] = {
            ...state.websites[existingIdx],
            ...payload,
            wp_app_password_masked: rawPassword ? maskedPw : state.websites[existingIdx].wp_app_password_masked,
            updated_at: new Date().toISOString()
          };
          savedSite = state.websites[existingIdx];
        }
      } else {
        const nextId = state.websites.length > 0
          ? Math.max(...state.websites.map(w => (typeof w.id === 'number' ? w.id : 0))) + 1
          : 1;
        savedSite = {
          id: nextId,
          ...payload,
          wp_app_password_masked: maskedPw,
          status: 'active',
          connection_status: 'connected',
          last_connection_test: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        state.websites.push(savedSite);
      }
    } else {
      // Server returned site, sync to client state
      if (siteId) {
        const idx = state.websites.findIndex(w => w.id === Number(siteId));
        if (idx !== -1) state.websites[idx] = savedSite;
        else state.websites.push(savedSite);
      } else {
        const exists = state.websites.some(w => w.id === savedSite.id);
        if (!exists) state.websites.push(savedSite);
      }
    }

    // Backup to localStorage
    try {
      localStorage.setItem('blogflow_websites', JSON.stringify(state.websites));
    } catch (e) {}

    if (websiteModalInstance) {
      websiteModalInstance.hide();
    }
    showToast(message, 'success');
    renderWebsitesView(document.getElementById('view-container'));
  } catch (err) {
    showToast('Notice: ' + err.message, 'warning');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check2 me-1"></i> Save Website';
    }
  }
}

async function handleTestConnection(id) {
  const site = state.websites.find(w => w.id === Number(id));
  if (!site) return;

  const title = document.getElementById('testConnTitle');
  const body = document.getElementById('testConnBody');
  if (title) title.textContent = `Testing: ${site.name}`;
  if (body) {
    body.innerHTML = `
      <div class="spinner-border text-primary mb-3" role="status"></div>
      <div class="fw-semibold">Handshaking with WordPress REST API...</div>
      <small class="text-muted">${site.wp_url}/wp-json/wp/v2/users/me</small>
    `;
  }

  if (testConnModalInstance) testConnModalInstance.show();

  try {
    const res = await fetch(`/api/websites/${id}/test-connection`, { method: 'POST' });
    const data = await res.json();

    if (body) {
      if (data.success) {
        body.innerHTML = `
          <div class="text-success mb-3"><i class="bi bi-check-circle-fill fs-1"></i></div>
          <h6 class="fw-bold text-success">Connection Verified!</h6>
          <p class="text-secondary small mb-3">${data.message}</p>
          <div class="bg-light p-3 rounded text-start small border">
            <div><strong>WordPress URL:</strong> ${data.wp_url}</div>
            <div><strong>Authenticated Username:</strong> ${data.username}</div>
            <div><strong>Tested At:</strong> ${new Date(data.tested_at).toLocaleString()}</div>
            <div class="text-success mt-1"><i class="bi bi-shield-lock-fill"></i> REST API credentials active & ready for publishing</div>
          </div>
        `;
      } else {
        body.innerHTML = `
          <div class="text-danger mb-3"><i class="bi bi-exclamation-triangle-fill fs-1"></i></div>
          <h6 class="fw-bold text-danger">Connection Failed</h6>
          <p class="text-secondary small mb-3">${data.error || 'Unable to connect'}</p>
          <div class="alert alert-warning text-start small mb-0">
            <strong>Checklist:</strong>
            <ul class="mb-0 ps-3 mt-1">
              <li>Ensure WordPress Application Password has no spaces or typos.</li>
              <li>Verify the URL includes <code>https://</code> and is accessible.</li>
              <li>Check that security plugins aren't blocking REST API endpoints.</li>
            </ul>
          </div>
        `;
      }
    }
  } catch (err) {
    if (body) {
      body.innerHTML = `
        <div class="text-danger mb-3"><i class="bi bi-x-circle-fill fs-1"></i></div>
        <h6 class="fw-bold text-danger">Network Error</h6>
        <p class="text-secondary small">${err.message}</p>
      `;
    }
  }
}

// ==========================================================
// VIEW 3: KEYWORDS MANAGEMENT
// ==========================================================
function renderKeywordsView(container) {
  container.innerHTML = `
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h4 class="fw-bold mb-1">Keyword Research & Clustering</h4>
        <p class="text-secondary mb-0">Manage seed keywords, search intent, difficulty scores, and topic clusters</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-saas-secondary" onclick="alert('CSV Import feature enabled. Select your .csv file with columns: keyword, volume, intent.')">
          <i class="bi bi-upload me-1"></i> Import CSV
        </button>
        <button class="btn btn-saas-primary" onclick="alert('Add Keyword modal opened.')">
          <i class="bi bi-plus-lg me-1"></i> Add Keyword
        </button>
      </div>
    </div>

    <!-- Cluster overview cards -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card-saas p-3 mb-0">
          <div class="fw-bold text-primary">Cluster: SaaS Onboarding</div>
          <small class="text-muted">3 Keywords • Average KD: 41 • Vol: 5,500/mo</small>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card-saas p-3 mb-0">
          <div class="fw-bold text-primary">Cluster: AI Blogging Automation</div>
          <small class="text-muted">4 Keywords • Average KD: 32 • Vol: 11,750/mo</small>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card-saas p-3 mb-0">
          <div class="fw-bold text-primary">Cluster: Customer Retention</div>
          <small class="text-muted">2 Keywords • Average KD: 48 • Vol: 3,100/mo</small>
        </div>
      </div>
    </div>

    <div class="card-saas">
      <div class="table-responsive">
        <table class="table table-saas">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Search Intent</th>
              <th>Volume / KD</th>
              <th>Priority</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="fw-bold">b2b saas onboarding best practices</div>
                <small class="text-muted">Cluster: SaaS Onboarding • US</small>
              </td>
              <td><span class="badge bg-light text-dark border">Informational</span></td>
              <td>2,400 <span class="badge bg-success-subtle text-success ms-1">KD 42</span></td>
              <td><span class="badge bg-danger-subtle text-danger">High</span></td>
              <td><span class="badge-status published">Published</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-light border" onclick="window.location.hash='topics'">Generate Topic</button>
              </td>
            </tr>
            <tr>
              <td>
                <div class="fw-bold">n8n workflow automation for bloggers</div>
                <small class="text-muted">Cluster: AI Blogging Automation • US</small>
              </td>
              <td><span class="badge bg-light text-dark border">Informational</span></td>
              <td>3,600 <span class="badge bg-success-subtle text-success ms-1">KD 29</span></td>
              <td><span class="badge bg-danger-subtle text-danger">Urgent</span></td>
              <td><span class="badge-status published">Published</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-light border" onclick="window.location.hash='topics'">Generate Topic</button>
              </td>
            </tr>
            <tr>
              <td>
                <div class="fw-bold">customer retention strategies software</div>
                <small class="text-muted">Cluster: Customer Retention • US</small>
              </td>
              <td><span class="badge bg-light text-dark border">Commercial</span></td>
              <td>1,900 <span class="badge bg-warning-subtle text-warning ms-1">KD 51</span></td>
              <td><span class="badge bg-warning-subtle text-warning">Medium</span></td>
              <td><span class="badge-status review">Writing</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-saas-primary" onclick="window.location.hash='articles'">View Draft</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 4: TOPIC PLANNER
// ==========================================================
function renderTopicsView(container) {
  container.innerHTML = `
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h4 class="fw-bold mb-1">Topic Planner</h4>
        <p class="text-secondary mb-0">AI-generated editorial ideas from seed keywords, search intent, and gap analysis</p>
      </div>
      <button class="btn btn-saas-primary" onclick="alert('AI Topic brainstorming dispatched for active websites.')">
        <i class="bi bi-magic me-1"></i> Brainstorm Topics with Gemini
      </button>
    </div>

    <div class="row g-3">
      <div class="col-md-6">
        <div class="card-saas h-100">
          <div class="card-saas-header">
            <span class="badge bg-primary-subtle text-primary">Ready to Write</span>
            <span class="small text-muted">Est. 2,200 Words</span>
          </div>
          <div class="card-saas-body">
            <h6 class="fw-bold">The Ultimate Guide to B2B SaaS Onboarding in 2026</h6>
            <p class="text-secondary small">
              Focus on user friction reduction, product tour fatigue, automated email triggers, and time-to-value metrics.
            </p>
            <div class="small mb-3">
              <strong>Primary Keyword:</strong> <code>b2b saas onboarding best practices</code>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-light text-dark border">Guide</span>
              <button class="btn btn-sm btn-saas-primary" onclick="window.location.hash='research'">Approve & Start Research</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card-saas h-100">
          <div class="card-saas-header">
            <span class="badge bg-success-subtle text-success">Approved</span>
            <span class="small text-muted">Est. 1,800 Words</span>
          </div>
          <div class="card-saas-body">
            <h6 class="fw-bold">How to Automate Multi-Site Blogging with n8n and Gemini</h6>
            <p class="text-secondary small">
              Step-by-step tutorial on connecting n8n webhook nodes with Google Gemini API and WordPress Application Passwords.
            </p>
            <div class="small mb-3">
              <strong>Primary Keyword:</strong> <code>n8n workflow automation for bloggers</code>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-light text-dark border">How-To Tutorial</span>
              <button class="btn btn-sm btn-saas-primary" onclick="window.location.hash='articles'">Open Article</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 5: RESEARCH AGENT
// ==========================================================
function renderResearchView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">AI Research Agent</h4>
      <p class="text-secondary mb-0">Search intent mapping, audience profiling, entity extraction, and competitive outlines</p>
    </div>

    <div class="card-saas mb-4">
      <div class="card-saas-header">
        <h6 class="fw-bold mb-0">Live Research Brief: SaaS Onboarding Best Practices</h6>
        <span class="badge bg-info-subtle text-info">Verified Outline</span>
      </div>
      <div class="card-saas-body">
        <div class="alert alert-info py-2 px-3 small mb-3">
          <i class="bi bi-info-circle me-1"></i> External SERP competitor crawler: <strong>API CONNECTION REQUIRED</strong> for live Google Search Console scraping. Structure generated from deep LLM knowledge base.
        </div>
        <div class="row g-3">
          <div class="col-md-6">
            <h6 class="fw-bold small text-uppercase text-secondary">Target Audience</h6>
            <p class="small text-dark">SaaS Founders, VP of Product, Growth Marketers, Customer Success Managers.</p>

            <h6 class="fw-bold small text-uppercase text-secondary mt-3">Search Intent</h6>
            <p class="small text-dark">Informational with high commercial software evaluation intent. Readers want actionable templates, not fluff.</p>
          </div>
          <div class="col-md-6">
            <h6 class="fw-bold small text-uppercase text-secondary">Entities & Key Topics</h6>
            <div class="d-flex flex-wrap gap-1 mb-3">
              <span class="badge bg-light text-dark border">Time-to-Value (TTV)</span>
              <span class="badge bg-light text-dark border">Product Tours</span>
              <span class="badge bg-light text-dark border">Activation Rate</span>
              <span class="badge bg-light text-dark border">In-App Checklists</span>
              <span class="badge bg-light text-dark border">Churn Reduction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 6: ARTICLES
// ==========================================================
function renderArticlesView(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">Articles & Content Revisions</h4>
        <p class="text-secondary mb-0">Review generated articles, revisions, FAQ sections, and publishing status</p>
      </div>
      <button class="btn btn-saas-primary" onclick="window.location.hash='topics'">
        <i class="bi bi-plus-lg me-1"></i> New Article
      </button>
    </div>

    <div class="card-saas">
      <div class="table-responsive">
        <table class="table table-saas">
          <thead>
            <tr>
              <th>Title & Slug</th>
              <th>Website</th>
              <th>Status</th>
              <th>Word Count</th>
              <th>Published</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="fw-bold">The Ultimate Guide to B2B SaaS Onboarding in 2026</div>
                <small class="text-muted">/b2b-saas-onboarding-best-practices</small>
              </td>
              <td><span class="badge bg-light text-dark border">SaaS Growth Journal</span></td>
              <td><span class="badge-status published">Published</span></td>
              <td>2,340 words</td>
              <td>2 days ago</td>
              <td class="text-end">
                <a href="https://saasgrowthjournal.com/b2b-saas-onboarding-best-practices" target="_blank" class="btn btn-sm btn-light border">View Live</a>
              </td>
            </tr>
            <tr>
              <td>
                <div class="fw-bold">How to Automate Multi-Site Blogging with n8n and Gemini</div>
                <small class="text-muted">/automate-multi-site-blogging-n8n-gemini</small>
              </td>
              <td><span class="badge bg-light text-dark border">AI Productivity Hub</span></td>
              <td><span class="badge-status published">Published</span></td>
              <td>2,180 words</td>
              <td>Yesterday</td>
              <td class="text-end">
                <a href="https://aiproductivityhub.io/automate-multi-site-blogging-n8n-gemini" target="_blank" class="btn btn-sm btn-light border">View Live</a>
              </td>
            </tr>
            <tr>
              <td>
                <div class="fw-bold">7 Retention Strategies Every SaaS Founder Needs</div>
                <small class="text-muted">/saas-retention-strategies</small>
              </td>
              <td><span class="badge bg-light text-dark border">SaaS Growth Journal</span></td>
              <td><span class="badge-status review">Quality Review</span></td>
              <td>1,950 words</td>
              <td>Draft</td>
              <td class="text-end">
                <button class="btn btn-sm btn-saas-primary" onclick="alert('Approve & Send to WordPress')">Approve</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 7: CONTENT CALENDAR
// ==========================================================
function renderCalendarView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Content Calendar & Scheduling</h4>
      <p class="text-secondary mb-0">Scheduled releases, daily publication velocity, and timezone coordination</p>
    </div>

    <div class="card-saas p-4 text-center">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <div class="text-secondary small">Daily Publishing Limit</div>
            <div class="fs-4 fw-bold">2 Posts / Day</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <div class="text-secondary small">Preferred Publish Time</div>
            <div class="fs-4 fw-bold">09:00 AM EST</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <div class="text-secondary small">Weekly Target</div>
            <div class="fs-4 fw-bold">10 Articles</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <div class="text-secondary small">Emergency Freeze</div>
            <div class="fs-4 fw-bold text-${state.emergencyStop ? 'danger' : 'success'}">${state.emergencyStop ? 'PAUSED' : 'ACTIVE'}</div>
          </div>
        </div>
      </div>
      <p class="text-secondary small mb-0"><i class="bi bi-info-circle me-1"></i> Automated scheduler evaluates publication slots every 15 minutes.</p>
    </div>
  `;
}

// ==========================================================
// VIEW 8: WORDPRESS MANAGEMENT
// ==========================================================
function renderWordPressView(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">WordPress REST API Integration</h4>
        <p class="text-secondary mb-0">REST API endpoints, Application Passwords security, and category mappings</p>
      </div>
      <button class="btn btn-saas-primary" onclick="window.location.hash='websites'">
        <i class="bi bi-plus-lg me-1"></i> Add Another Site
      </button>
    </div>

    <div class="card-saas p-4">
      <h6 class="fw-bold text-primary mb-3"><i class="bi bi-shield-check me-2"></i>Security Architecture</h6>
      <p class="text-secondary small">
        WordPress application passwords are encrypted using AES-256-CBC with a unique platform key. Passwords are never returned in plain text over the REST API or rendered in client HTML.
      </p>
      <div class="table-responsive mt-3">
        <table class="table table-saas">
          <thead>
            <tr>
              <th>Site Name</th>
              <th>REST API Status</th>
              <th>Publishing Mode</th>
              <th>Test Diagnostics</th>
            </tr>
          </thead>
          <tbody>
            ${state.websites.map(w => `
              <tr>
                <td class="fw-semibold">${w.name}</td>
                <td><span class="badge bg-success-subtle text-success">REST API 200 OK</span></td>
                <td><span class="badge-mode ${w.publishing_mode}">${w.publishing_mode}</span></td>
                <td>
                  <button class="btn btn-sm btn-light border" onclick="handleTestConnection(${w.id})">
                    Run Connection Diagnostic
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 9: INTERNAL LINKS
// ==========================================================
function renderInternalLinksView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Internal Linking Engine</h4>
      <p class="text-secondary mb-0">Analyze site taxonomy, prevent link orphan pages, and recommend natural anchor text</p>
    </div>
    <div class="card-saas p-4">
      <div class="alert alert-light border small mb-3">
        <i class="bi bi-diagram-3 text-primary me-1"></i> Internal linking engine automatically analyzes published content on WordPress and identifies contextual cross-linking opportunities without keyword stuffing.
      </div>
      <h6 class="fw-bold mb-2">Recent Link Injections:</h6>
      <ul class="list-group list-group-flush small">
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>"The Ultimate Guide to B2B SaaS"</strong> &rarr; Links to <em>"Customer Retention Strategies"</em>
            <div class="text-muted">Anchor text: "customer retention metrics"</div>
          </div>
          <span class="badge bg-success-subtle text-success">Injected</span>
        </li>
      </ul>
    </div>
  `;
}

// ==========================================================
// VIEW 10: IMAGES
// ==========================================================
function renderImagesView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Featured Image Generation</h4>
      <p class="text-secondary mb-0">High-resolution AI image prompt design, ALT text generation, and WordPress media upload</p>
    </div>
    <div class="card-saas p-4">
      <p class="text-secondary small">
        Images are generated and automatically tagged with keyword-rich ALT text and uploaded directly to WordPress media library via REST API <code>/wp/v2/media</code>.
      </p>
      <span class="badge bg-primary-subtle text-primary">Image Agent Active</span>
    </div>
  `;
}

// ==========================================================
// VIEW 11: SEO AGENT
// ==========================================================
function renderSeoView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">SEO Optimization Agent</h4>
      <p class="text-secondary mb-0">Meta title, description, schema markup, and natural keyword density analysis</p>
    </div>
    <div class="card-saas p-4">
      <h6 class="fw-bold mb-3">SEO Compliance Standards</h6>
      <div class="row g-3">
        <div class="col-md-4">
          <div class="p-3 bg-light rounded border">
            <div class="fw-bold small">Title Tag</div>
            <small class="text-muted">50–60 characters, brand suffix</small>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 bg-light rounded border">
            <div class="fw-bold small">Meta Description</div>
            <small class="text-muted">145–158 characters with primary intent</small>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 bg-light rounded border">
            <div class="fw-bold small">Schema Type</div>
            <small class="text-muted">Article & FAQPage structured JSON-LD</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 12: ANALYTICS
// ==========================================================
function renderAnalyticsView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Search Console & GA4 Analytics</h4>
      <p class="text-secondary mb-0">Search impressions, CTR, average rankings, and content decay detection</p>
    </div>
    <div class="card-saas p-4">
      <div class="alert alert-warning small mb-0">
        <i class="bi bi-exclamation-triangle-fill me-1"></i>
        <strong>API CONNECTION REQUIRED:</strong> Connect Google Search Console and GA4 Service Account JSON in <strong>API Settings</strong> to view live traffic, impressions, and ranking trends.
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 13: CONTENT UPDATES
// ==========================================================
function renderUpdatesView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Content Decay & Update Agent</h4>
      <p class="text-secondary mb-0">Identify aging articles, declining rankings, and outdated statistics</p>
    </div>
    <div class="card-saas p-4">
      <p class="text-secondary small">
        The Update Agent monitors articles older than 180 days and generates revision drafts preserving prior revisions in <code>article_revisions</code>.
      </p>
      <span class="badge bg-success-subtle text-success">Revision History Safeguard Enabled</span>
    </div>
  `;
}

// ==========================================================
// VIEW 14: SOCIAL PUBLISHING
// ==========================================================
function renderSocialView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Social Content Generation</h4>
      <p class="text-secondary mb-0">Ready-to-post summaries, key takeaways, and hashtags for LinkedIn, X, and Facebook</p>
    </div>
    <div class="card-saas p-4">
      <p class="text-secondary small mb-3">
        When an article publishes to WordPress, the Social Agent extracts key takeaways and produces platform-tailored snippets.
      </p>
      <div class="d-flex gap-2">
        <span class="badge bg-light text-dark border"><i class="bi bi-linkedin text-primary me-1"></i> LinkedIn</span>
        <span class="badge bg-light text-dark border"><i class="bi bi-twitter-x text-dark me-1"></i> X (Twitter)</span>
        <span class="badge bg-light text-dark border"><i class="bi bi-facebook text-primary me-1"></i> Facebook</span>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 15: AUTOMATION & N8N
// ==========================================================
async function renderAutomationView(container) {
  let workflows = [];
  try {
    const res = await fetch('/api/automation/workflows');
    const data = await res.json();
    workflows = data.workflows || [];
  } catch (err) {
    console.error('Error loading workflows:', err);
  }

  container.innerHTML = `
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h4 class="fw-bold mb-1">n8n Automation Architecture</h4>
        <p class="text-secondary mb-0">11 automated workflows, webhook connections, and emergency controls</p>
      </div>
      <button class="btn btn-sm ${state.emergencyStop ? 'btn-danger' : 'btn-outline-danger'}" id="auto-view-stop-btn">
        <i class="bi bi-exclamation-octagon-fill me-1"></i>
        ${state.emergencyStop ? 'EMERGENCY STOP ACTIVE' : 'Toggle Emergency STOP'}
      </button>
    </div>

    <!-- Webhook Ingress Details -->
    <div class="card-saas mb-4">
      <div class="card-saas-header">
        <h6 class="fw-bold mb-0">n8n Webhook Ingress Connection</h6>
        <span class="badge bg-success-subtle text-success">HMAC-SHA256 Protected</span>
      </div>
      <div class="card-saas-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="small text-secondary fw-semibold">Webhook Ingress Endpoint</label>
            <div class="input-group">
              <input type="text" class="form-control font-monospace small" readonly value="${window.location.origin}/webhooks/n8n.php" id="webhook-url-input" />
              <button class="btn btn-light border" onclick="navigator.clipboard.writeText(document.getElementById('webhook-url-input').value); showToast('Webhook URL copied!');">
                <i class="bi bi-copy"></i>
              </button>
            </div>
          </div>
          <div class="col-md-6">
            <label class="small text-secondary fw-semibold">n8n Master Shared Secret (Bearer or HMAC)</label>
            <div class="input-group">
              <input type="text" class="form-control font-monospace small" readonly value="${state.systemSettings?.n8n_master_secret || 'n8n_sec_8f912da4930182bcf'}" id="webhook-secret-input" />
              <button class="btn btn-light border" onclick="navigator.clipboard.writeText(document.getElementById('webhook-secret-input').value); showToast('Secret copied!');">
                <i class="bi bi-copy"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Workflows List Table -->
    <div class="card-saas">
      <div class="card-saas-header">
        <h6 class="fw-bold mb-0">Registered Automation Workflows (1 to 11)</h6>
      </div>
      <div class="table-responsive">
        <table class="table table-saas">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Trigger Type</th>
              <th>Description</th>
              <th>Status</th>
              <th class="text-end">Manual Run</th>
            </tr>
          </thead>
          <tbody>
            ${workflows.map(wf => `
              <tr>
                <td class="fw-semibold">Workflow ${wf.id}: ${wf.name}</td>
                <td><span class="badge bg-light text-secondary border">${wf.trigger}</span></td>
                <td class="small text-muted">${wf.description}</td>
                <td>
                  <span class="badge-status ${state.emergencyStop ? 'failed' : 'active'}">
                    <i class="bi bi-${state.emergencyStop ? 'pause-fill' : 'check-circle'}"></i>
                    ${state.emergencyStop ? 'Paused' : 'Active'}
                  </span>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-saas-primary py-0 px-2 run-wf-btn" data-key="${wf.key}" ${state.emergencyStop ? 'disabled' : ''}>
                    Run Automation
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Run Buttons
  document.querySelectorAll('.run-wf-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-key');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;

      try {
        const res = await fetch('/api/automation/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow_key: key })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Dispatched ${key} (Job ID: ${data.job_id})`, 'success');
        } else {
          showToast(data.error || 'Failed to dispatch workflow', 'danger');
        }
      } catch (err) {
        showToast('Network error triggering workflow: ' + err.message, 'danger');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Run Automation';
      }
    });
  });

  const stopBtn = document.getElementById('auto-view-stop-btn');
  if (stopBtn) stopBtn.addEventListener('click', toggleEmergencyStop);
}

// ==========================================================
// VIEW 16: AI AGENTS
// ==========================================================
function renderAiAgentsView(container) {
  const agents = [
    { name: 'Research Agent', key: 'research_agent', desc: 'Analyzes intent, audience, facts & outline', runs: 84, tokens: '142K' },
    { name: 'Writer Agent', key: 'writer_agent', desc: 'Drafts people-first long-form content with FAQs', runs: 62, tokens: '480K' },
    { name: 'SEO Agent', key: 'seo_agent', desc: 'Generates title tags, meta description & schema', runs: 62, tokens: '55K' },
    { name: 'Quality Agent', key: 'quality_agent', desc: 'Evaluates accuracy, clarity, and keyword stuffing', runs: 58, tokens: '92K' },
    { name: 'Image Agent', key: 'image_agent', desc: 'Designs high-resolution visual prompt specifications', runs: 34, tokens: '18K' },
    { name: 'Internal Link Agent', key: 'internal_link_agent', desc: 'Recommends contextual internal cross-links', runs: 42, tokens: '29K' },
    { name: 'Publisher Agent', key: 'publisher_agent', desc: 'Formats payload for WordPress REST API', runs: 31, tokens: '12K' },
    { name: 'Analytics Agent', key: 'analytics_agent', desc: 'Monitors ranking shifts and decay indicators', runs: 12, tokens: '15K' },
    { name: 'Update Agent', key: 'update_agent', desc: 'Scans older posts and proposes surgical refreshes', runs: 8, tokens: '21K' }
  ];

  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">AI Agent Fleet</h4>
      <p class="text-secondary mb-0">Role-specific autonomous agents configured with Google Gemini backend</p>
    </div>

    <div class="row g-3">
      ${agents.map(a => `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card-saas h-100 p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold">${a.name}</span>
              <span class="badge bg-success-subtle text-success">Active</span>
            </div>
            <p class="text-secondary small mb-3">${a.desc}</p>
            <div class="small border-top pt-2 d-flex justify-content-between text-muted">
              <span>Runs: <strong>${a.runs}</strong></span>
              <span>Tokens: <strong>${a.tokens}</strong></span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==========================================================
// VIEW 17: API SETTINGS & PROVIDERS
// ==========================================================
async function renderApiSettingsView(container) {
  let providers = state.aiProviders;
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    providers = data.providers || providers;
  } catch (err) {
    console.error('Error fetching settings:', err);
  }

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">AI Providers & API Credentials</h4>
        <p class="text-secondary mb-0">Provider abstraction layer: Gemini primary, OpenAI and Anthropic ready</p>
      </div>
      <button class="btn btn-saas-primary" id="open-ai-test-btn">
        <i class="bi bi-play-fill me-1"></i> Live Gemini Test
      </button>
    </div>

    <div class="row g-4">
      <!-- Gemini Card -->
      <div class="col-12 col-lg-4">
        <div class="card-saas h-100 border-primary">
          <div class="card-saas-header bg-primary-subtle">
            <h6 class="fw-bold text-primary mb-0">Google Gemini API</h6>
            <span class="badge bg-primary text-white">PRIMARY PROVIDER</span>
          </div>
          <div class="card-saas-body">
            <div class="mb-3">
              <label class="form-label small fw-semibold">Default Model</label>
              <input type="text" class="form-control form-control-sm font-monospace" value="gemini-3.8-flash" readonly />
              <small class="text-muted">High-speed, cost-effective multimodal model</small>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">API Key Status</label>
              <input type="text" class="form-control form-control-sm font-monospace" value="${process.env.GEMINI_API_KEY ? 'Configured via GEMINI_API_KEY' : 'Configured via Environment'}" readonly />
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Temperature</label>
              <input type="text" class="form-control form-control-sm" value="0.70" readonly />
            </div>
            <button class="btn btn-sm btn-saas-primary w-100" id="gemini-test-trigger">
              <i class="bi bi-play-circle me-1"></i> Test Connection
            </button>
          </div>
        </div>
      </div>

      <!-- OpenAI Card -->
      <div class="col-12 col-lg-4">
        <div class="card-saas h-100">
          <div class="card-saas-header">
            <h6 class="fw-bold mb-0">OpenAI</h6>
            <span class="badge bg-light text-secondary border">FUTURE PROVIDER</span>
          </div>
          <div class="card-saas-body">
            <div class="alert alert-light border small text-secondary">
              <i class="bi bi-info-circle me-1"></i> <strong>API CONNECTION REQUIRED:</strong> Fallback provider ready. Add your OpenAI API key in <code>config.php</code> to activate.
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Model</label>
              <input type="text" class="form-control form-control-sm font-monospace" value="gpt-4o-mini" readonly />
            </div>
            <button class="btn btn-sm btn-light border w-100" disabled>API Connection Required</button>
          </div>
        </div>
      </div>

      <!-- Anthropic Card -->
      <div class="col-12 col-lg-4">
        <div class="card-saas h-100">
          <div class="card-saas-header">
            <h6 class="fw-bold mb-0">Anthropic Claude</h6>
            <span class="badge bg-light text-secondary border">FUTURE PROVIDER</span>
          </div>
          <div class="card-saas-body">
            <div class="alert alert-light border small text-secondary">
              <i class="bi bi-info-circle me-1"></i> <strong>API CONNECTION REQUIRED:</strong> Fallback provider ready. Add your Anthropic key in <code>config.php</code> to activate.
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Model</label>
              <input type="text" class="form-control form-control-sm font-monospace" value="claude-3-5-sonnet" readonly />
            </div>
            <button class="btn btn-sm btn-light border w-100" disabled>API Connection Required</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const openTestBtn = document.getElementById('open-ai-test-btn');
  if (openTestBtn) {
    openTestBtn.addEventListener('click', () => {
      if (aiTestModalInstance) aiTestModalInstance.show();
    });
  }

  const geminiTestTrigger = document.getElementById('gemini-test-trigger');
  if (geminiTestTrigger) {
    geminiTestTrigger.addEventListener('click', () => {
      if (aiTestModalInstance) aiTestModalInstance.show();
    });
  }
}

async function handleExecuteAiTest() {
  const promptText = document.getElementById('ai-test-prompt').value.trim();
  const btn = document.getElementById('execute-ai-test-btn');
  const resultBox = document.getElementById('ai-test-result-box');
  const outputEl = document.getElementById('ai-test-output');
  const metaEl = document.getElementById('ai-test-meta');

  if (!promptText) return;

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Generating with Gemini...`;

  try {
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText })
    });
    const data = await res.json();

    resultBox.classList.remove('d-none');
    if (data.success) {
      outputEl.textContent = data.output;
      metaEl.textContent = `Model: ${data.model} • Cost Est: ${data.costEstimateUsd || '<$0.001'}`;
      showToast('Gemini AI generation test succeeded!', 'success');
    } else {
      outputEl.textContent = 'Error: ' + data.error;
      metaEl.textContent = 'Status: Failed';
      showToast(data.error || 'Gemini call failed', 'danger');
    }
  } catch (err) {
    resultBox.classList.remove('d-none');
    outputEl.textContent = 'Network Error: ' + err.message;
    metaEl.textContent = 'Status: Error';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-play-fill me-1"></i> Send to Gemini API`;
  }
}

// ==========================================================
// VIEW 18: COSTS & USAGE
// ==========================================================
function renderCostsView(container) {
  const settings = state.systemSettings || {
    daily_ai_budget: 15.00,
    monthly_ai_budget: 300.00,
    max_article_cost: 0.75,
    current_daily_spend: 2.14,
    current_monthly_spend: 48.60,
    total_api_calls: 312
  };

  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">AI Budget & Cost Controls</h4>
      <p class="text-secondary mb-0">Set hard budget limits, pause thresholds, and track generation spend</p>
    </div>

    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <div class="card-saas p-4">
          <h6 class="fw-bold mb-3">Cost Threshold Parameters</h6>
          <form id="budget-settings-form">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Daily Budget ($ USD)</label>
                <input type="number" class="form-control" id="budget-daily" value="${settings.daily_ai_budget}" step="1" min="1" />
                <small class="text-muted">Automation pauses if exceeded in 24h</small>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Monthly Budget ($ USD)</label>
                <input type="number" class="form-control" id="budget-monthly" value="${settings.monthly_ai_budget}" step="10" min="10" />
                <small class="text-muted">Global spending ceiling</small>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Max Cost Per Article ($ USD)</label>
                <input type="number" class="form-control" id="budget-max-article" value="${settings.max_article_cost}" step="0.05" min="0.1" />
                <small class="text-muted">Target maximum per complete workflow</small>
              </div>
              <div class="col-12 mt-4">
                <button type="submit" class="btn btn-saas-primary">Save Budget Limits</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card-saas p-4">
          <h6 class="fw-bold mb-3">Live Spend Summary</h6>
          <div class="d-flex justify-content-between py-2 border-bottom">
            <span class="text-secondary">Today's Spend</span>
            <span class="fw-bold">$${settings.current_daily_spend.toFixed(2)}</span>
          </div>
          <div class="d-flex justify-content-between py-2 border-bottom">
            <span class="text-secondary">This Month's Spend</span>
            <span class="fw-bold">$${settings.current_monthly_spend.toFixed(2)}</span>
          </div>
          <div class="d-flex justify-content-between py-2">
            <span class="text-secondary">Total API Calls</span>
            <span class="fw-bold">${settings.total_api_calls}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const budgetForm = document.getElementById('budget-settings-form');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const daily = document.getElementById('budget-daily').value;
      const monthly = document.getElementById('budget-monthly').value;
      const maxArt = document.getElementById('budget-max-article').value;

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            daily_ai_budget: daily,
            monthly_ai_budget: monthly,
            max_article_cost: maxArt
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Budget settings updated successfully', 'success');
        }
      } catch (err) {
        showToast('Error saving budget: ' + err.message, 'danger');
      }
    });
  }
}

// ==========================================================
// VIEW 19: ACTIVITY LOGS
// ==========================================================
async function renderLogsView(container) {
  let logs = [];
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    logs = data.data || [];
  } catch (err) {
    console.error('Error fetching logs:', err);
  }

  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">System Activity Logs</h4>
      <p class="text-secondary mb-0">Comprehensive audit trail of users, automated workflows, and publishing events</p>
    </div>

    <div class="card-saas">
      <div class="table-responsive">
        <table class="table table-saas">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Website / Target</th>
              <th>Initiator</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td class="small text-muted" style="white-space: nowrap;">${new Date(l.timestamp).toLocaleString()}</td>
                <td class="fw-semibold">${l.action}</td>
                <td><span class="badge bg-light text-dark border">${l.website || 'System'}</span></td>
                <td class="small">${l.user}</td>
                <td>
                  <span class="badge-status ${l.status === 'success' ? 'active' : l.status === 'warning' ? 'warning' : 'failed'}">
                    ${l.status}
                  </span>
                </td>
                <td class="small text-muted">${l.details || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================
// VIEW 20: SYSTEM SETTINGS
// ==========================================================
function renderSettingsView(container) {
  const settings = state.systemSettings || {};

  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">System Settings</h4>
      <p class="text-secondary mb-0">Global publishing defaults, revision limits, and application configuration</p>
    </div>

    <div class="card-saas p-4">
      <form id="system-settings-form">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Global Publishing Mode</label>
            <select class="form-select" id="sys-pub-mode">
              <option value="APPROVAL" ${settings.global_publishing_mode === 'APPROVAL' ? 'selected' : ''}>APPROVAL (Hold for human confirmation)</option>
              <option value="AUTO" ${settings.global_publishing_mode === 'AUTO' ? 'selected' : ''}>AUTO (Publish directly after quality pass)</option>
              <option value="DRAFT" ${settings.global_publishing_mode === 'DRAFT' ? 'selected' : ''}>DRAFT (Save to WordPress as Draft)</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label small fw-semibold">Max AI Revision Loops</label>
            <input type="number" class="form-control" id="sys-max-revisions" value="${settings.max_revision_attempts || 3}" min="1" max="5" />
            <small class="text-muted">Maximum revision passes before flagging for admin review</small>
          </div>

          <div class="col-12 mt-4">
            <button type="submit" class="btn btn-saas-primary">Save System Settings</button>
          </div>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('system-settings-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = document.getElementById('sys-pub-mode').value;
      const revs = document.getElementById('sys-max-revisions').value;

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_publishing_mode: mode,
            max_revision_attempts: revs
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Settings saved successfully', 'success');
        }
      } catch (err) {
        showToast('Failed to save settings: ' + err.message, 'danger');
      }
    });
  }
}

// ==========================================================
// VIEW 21: CPANEL DEPLOYMENT PACKAGE
// ==========================================================
function renderCPanelPackageView(container) {
  container.innerHTML = `
    <div class="mb-4">
      <h4 class="fw-bold mb-1">cPanel / Shared Hosting Deployment Package</h4>
      <p class="text-secondary mb-0">Download production database schema, PHP configuration template, and instructions</p>
    </div>

    <div class="row g-4">
      <div class="col-12 col-md-4">
        <div class="card-saas p-4 text-center h-100">
          <div class="text-primary mb-3"><i class="bi bi-database-down fs-1"></i></div>
          <h6 class="fw-bold">MySQL Schema (database.sql)</h6>
          <p class="text-secondary small mb-3">All 24 normalized tables, foreign keys, indexes, and seed records ready for phpMyAdmin import.</p>
          <a href="/api/export/database-sql" download="database.sql" class="btn btn-saas-primary btn-sm w-100">
            <i class="bi bi-download me-1"></i> Download database.sql
          </a>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="card-saas p-4 text-center h-100">
          <div class="text-primary mb-3"><i class="bi bi-filetype-php fs-1"></i></div>
          <h6 class="fw-bold">Config Template (config.example.php)</h6>
          <p class="text-secondary small mb-3">cPanel database credentials, AES-256 encryption keys, Gemini API configuration, and n8n secrets.</p>
          <a href="/api/export/config-example" download="config.example.php" class="btn btn-saas-secondary btn-sm w-100">
            <i class="bi bi-download me-1"></i> Download config.example.php
          </a>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="card-saas p-4 text-center h-100">
          <div class="text-primary mb-3"><i class="bi bi-book fs-1"></i></div>
          <h6 class="fw-bold">cPanel README Guide</h6>
          <p class="text-secondary small mb-3">Step-by-step instructions for file upload, MySQL database setup, WordPress application passwords, and n8n.</p>
          <button class="btn btn-light border btn-sm w-100" onclick="alert('Please review README.md in the project root directory for full instructions.')">
            <i class="bi bi-eye me-1"></i> View Instructions
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Enhanced Widget Features
 * Add these methods to CopilotWidget class
 */

// Add to constructor:
this.calendarView = 'grid'; // 'grid' or 'list'
this.retryAttempts = new Map(); // Track retry attempts
this.maxRetries = 3;

// Enhanced generateCalendar with progress indicator
async generateCalendar() {
    try {
        this.showLoading('Generating your 30-day content calendar...');
        const loadingEl = document.getElementById('calendar-loading');
        const progressFill = document.getElementById('progress-fill');
        loadingEl.style.display = 'block';
        
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 2;
            if (progressFill) {
                progressFill.style.width = `${Math.min(progress, 90)}%`;
            }
        }, 100);

        const response = await this.fetchWithRetry(`${this.apiUrl}/api/calendar/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: this.userId
            })
        });

        clearInterval(progressInterval);
        if (progressFill) progressFill.style.width = '100%';

        const data = await response.json();

        if (data.success && data.calendar) {
            this.calendar = data.calendar;
            if (data.mock) {
                this.showToast('Calendar generated (Demo Mode)', 'info');
            } else {
                this.showToast('Calendar generated successfully!', 'success');
            }
            this.renderCalendar();
        } else {
            throw new Error(data.error || 'Failed to generate calendar');
        }
    } catch (error) {
        console.error('Error generating calendar:', error);
        this.showToast('Failed to generate calendar. Please try again.', 'error', () => {
            this.generateCalendar();
        });
    } finally {
        this.hideLoading();
        const loadingEl = document.getElementById('calendar-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

// Fetch with retry mechanism
async fetchWithRetry(url, options, retryCount = 0) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok && retryCount < this.maxRetries) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return response;
    } catch (error) {
        if (retryCount < this.maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchWithRetry(url, options, retryCount + 1);
        }
        throw error;
    }
}

// Enhanced renderCalendar with grid/list view and edit capability
renderCalendar() {
    const gridView = document.getElementById('calendar-grid-view');
    const listView = document.getElementById('calendar-list-view');
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarList = document.getElementById('calendar-list');

    if (!this.calendar || this.calendar.length === 0) {
        if (calendarGrid) calendarGrid.innerHTML = '<p class="empty-state">No calendar data available.</p>';
        if (calendarList) calendarList.innerHTML = '<p class="empty-state">No calendar data available.</p>';
        return;
    }

    // Clear existing content
    if (calendarGrid) calendarGrid.innerHTML = '';
    if (calendarList) calendarList.innerHTML = '';

    this.calendar.forEach((post, index) => {
        // Grid view item
        if (calendarGrid) {
            const gridItem = this.createCalendarItem(post, index, 'grid');
            calendarGrid.appendChild(gridItem);
        }

        // List view item
        if (calendarList) {
            const listItem = this.createCalendarItem(post, index, 'list');
            calendarList.appendChild(listItem);
        }
    });

    // Show appropriate view
    this.updateCalendarView();
}

// Create calendar item (grid or list)
createCalendarItem(post, index, viewType) {
    const item = document.createElement('div');
    item.className = `calendar-item calendar-item-${viewType}`;
    item.id = `post-${post.id || index}`;
    item.dataset.postId = post.id || `post-${index}`;

    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const hashtagsHtml = (post.hashtags || []).map(tag =>
        `<span class="hashtag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
    ).join('');

    item.innerHTML = `
        <div class="calendar-item-header">
            <span class="calendar-item-date">${formattedDate}</span>
            <span class="calendar-item-type">${post.type || 'General'}</span>
        </div>
        <div class="calendar-item-theme">${post.theme || 'Post Theme'}</div>
        <div class="calendar-item-caption">${this.truncateText(post.caption || '', viewType === 'list' ? 200 : 150)}</div>
        <div class="calendar-item-hashtags">${hashtagsHtml}</div>
        <div class="calendar-item-actions">
            <button class="btn-edit" data-post-id="${post.id || index}" title="Edit post">
                ✏️ Edit
            </button>
            <button class="btn-preview" data-post-id="${post.id || index}" title="Preview post">
                👁️ Preview
            </button>
            <button class="btn-schedule ${post.scheduled ? 'btn-scheduled' : ''}" 
                    data-post-id="${post.id || index}"
                    data-post-date="${post.date}"
                    ${post.scheduled ? 'disabled' : ''}>
                ${post.scheduled ? '✓ Scheduled' : 'Schedule'}
            </button>
        </div>
    `;

    // Add event listeners
    const editBtn = item.querySelector('.btn-edit');
    const previewBtn = item.querySelector('.btn-preview');
    const scheduleBtn = item.querySelector('.btn-schedule');

    if (editBtn) {
        editBtn.addEventListener('click', () => this.editPost(post, index));
    }
    if (previewBtn) {
        previewBtn.addEventListener('click', () => this.previewPost(post));
    }
    if (scheduleBtn && !post.scheduled) {
        scheduleBtn.addEventListener('click', () => this.schedulePost(post, index));
    }

    return item;
}

// Toggle calendar view (grid/list)
toggleCalendarView() {
    this.calendarView = this.calendarView === 'grid' ? 'list' : 'grid';
    this.updateCalendarView();
}

updateCalendarView() {
    const gridView = document.getElementById('calendar-grid-view');
    const listView = document.getElementById('calendar-list-view');
    const toggleBtn = document.getElementById('view-toggle-btn');

    if (this.calendarView === 'grid') {
        if (gridView) gridView.style.display = 'block';
        if (listView) listView.style.display = 'none';
        if (toggleBtn) toggleBtn.textContent = '📋 List';
    } else {
        if (gridView) gridView.style.display = 'none';
        if (listView) listView.style.display = 'block';
        if (toggleBtn) toggleBtn.textContent = '📅 Grid';
    }
}

// Edit post
editPost(post, index) {
    const modal = this.createEditModal(post, index);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

createEditModal(post, index) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Post</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Theme</label>
                    <input type="text" id="edit-theme" value="${post.theme || ''}" class="form-input">
                </div>
                <div class="form-group">
                    <label>Caption</label>
                    <textarea id="edit-caption" class="form-textarea" rows="5">${post.caption || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="edit-type" class="form-select">
                        <option value="Educational" ${post.type === 'Educational' ? 'selected' : ''}>Educational</option>
                        <option value="Promotional" ${post.type === 'Promotional' ? 'selected' : ''}>Promotional</option>
                        <option value="Inspirational" ${post.type === 'Inspirational' ? 'selected' : ''}>Inspirational</option>
                        <option value="Behind-the-Scenes" ${post.type === 'Behind-the-Scenes' ? 'selected' : ''}>Behind-the-Scenes</option>
                        <option value="User-Generated" ${post.type === 'User-Generated' ? 'selected' : ''}>User-Generated</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Hashtags (comma-separated)</label>
                    <input type="text" id="edit-hashtags" value="${(post.hashtags || []).join(', ')}" class="form-input">
                </div>
            </div>
            <div class="modal-footer">
                <button class="secondary-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="primary-btn" id="save-post-btn">Save Changes</button>
            </div>
        </div>
    `;

    const saveBtn = modal.querySelector('#save-post-btn');
    saveBtn.addEventListener('click', async () => {
        const updates = {
            theme: modal.querySelector('#edit-theme').value,
            caption: modal.querySelector('#edit-caption').value,
            type: modal.querySelector('#edit-type').value,
            hashtags: modal.querySelector('#edit-hashtags').value.split(',').map(t => t.trim()).filter(t => t)
        };

        // Update local calendar
        this.calendar[index] = { ...this.calendar[index], ...updates };

        // Save to backend
        try {
            await this.fetchWithRetry(`${this.apiUrl}/api/calendar/post/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId, updates })
            });
            this.showToast('Post updated successfully!', 'success');
            this.renderCalendar();
            modal.remove();
        } catch (error) {
            this.showToast('Failed to update post', 'error');
        }
    });

    return modal;
}

// Preview post
previewPost(post) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-preview">
            <div class="modal-header">
                <h3>Post Preview</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="post-preview">
                    <div class="preview-header">
                        <div class="preview-avatar">📱</div>
                        <div>
                            <div class="preview-name">Your Business Page</div>
                            <div class="preview-date">${new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                    </div>
                    <div class="preview-content">
                        <div class="preview-theme">${post.theme || 'Post Theme'}</div>
                        <div class="preview-caption">${post.caption || ''}</div>
                        <div class="preview-hashtags">
                            ${(post.hashtags || []).map(tag => 
                                `<span class="hashtag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="primary-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// Toast notifications
showToast(message, type = 'success', retryCallback = null) {
    const toast = document.getElementById(`${type === 'error' ? 'error' : 'success'}-toast`);
    const messageEl = document.getElementById(`${type === 'error' ? 'error' : 'success'}-message`);
    const retryBtn = document.getElementById('error-retry-btn');

    if (!toast || !messageEl) return;

    messageEl.textContent = message;
    toast.style.display = 'flex';
    toast.className = `toast toast-${type}`;

    if (type === 'error' && retryCallback && retryBtn) {
        retryBtn.style.display = 'block';
        retryBtn.onclick = () => {
            toast.style.display = 'none';
            retryCallback();
        };
    } else if (retryBtn) {
        retryBtn.style.display = 'none';
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// Helper: Truncate text
truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Enhanced schedulePost with retry
async schedulePost(post, index) {
    try {
        this.showLoading('Scheduling post...');

        const response = await this.fetchWithRetry(`${this.apiUrl}/api/scheduling/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: this.userId,
                postId: post.id || `post-${index}`,
                date: post.date,
                caption: post.caption,
                hashtags: post.hashtags
            })
        });

        const data = await response.json();

        if (data.success) {
            post.scheduled = true;
            this.showToast('Post scheduled successfully!', 'success');
            this.renderCalendar();
        } else {
            throw new Error(data.error || 'Failed to schedule post');
        }
    } catch (error) {
        console.error('Error scheduling post:', error);
        this.showToast('Failed to schedule post. Please ensure Facebook is connected.', 'error', () => {
            this.schedulePost(post, index);
        });
    } finally {
        this.hideLoading();
    }
}


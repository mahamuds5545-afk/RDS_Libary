// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyDm-pq9lsbn5KASjtbeOrdIdyXdc9WgRoQ",
    authDomain: "rds-library.firebaseapp.com",
    databaseURL: "https://rds-library-default-rtdb.firebaseio.com",
    projectId: "rds-library",
    storageBucket: "rds-library.firebasestorage.app",
    messagingSenderId: "1043493423342",
    appId: "1:1043493423342:web:d4675d2a7c35fe21798bff",
    measurementId: "G-7C712Z0WJ9"
};

// Initialize Firebase
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("✅ Firebase initialized successfully!");
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    showError("Failed to initialize Firebase. Please refresh the page.");
}

// Global variables
let categories = [];
let pdfs = [];
let filteredPdfs = [];
let currentCategory = 'all';
let currentView = 'grid';
let currentPage = 1;
let sortOrder = 'newest';
const itemsPerPage = 12;
let currentPdfId = null;
let userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("📚 PDF Library Viewer Initializing...");
    
    if (!database) {
        showError("Firebase not available. Check console for errors.");
        return;
    }
    
    // Initialize current time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Load initial data
    loadCategories();
    loadPDFs();
    
    // Setup all event listeners
    setupAllEventListeners();
    
    // Update online users
    updateOnlineUsers();
});

// ==================== TIME FUNCTIONS ====================
function updateCurrentTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const timeString = now.toLocaleDateString('en-US', options);
    document.getElementById('currentTime').textContent = timeString;
}

function updateOnlineUsers() {
    const onlineUsers = Math.floor(Math.random() * 50) + 1;
    document.getElementById('onlineUsers').textContent = onlineUsers;
    
    // Update every 30 seconds
    setTimeout(updateOnlineUsers, 30000);
}

// ==================== DATA LOADING ====================
function loadCategories() {
    console.log("📂 Loading categories...");
    
    database.ref('categories').on('value', (snapshot) => {
        categories = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                categories.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`✅ Loaded ${categories.length} categories`);
            renderCategoriesDropdown();
        } else {
            console.log("⚠️ No categories found in database");
        }
        
        updateStats();
    }, (error) => {
        console.error("❌ Error loading categories:", error);
        showError("Failed to load categories from database.");
    });
}

function loadPDFs() {
    console.log("📂 Loading PDFs...");
    
    database.ref('pdfs').on('value', (snapshot) => {
        pdfs = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                pdfs.push({
                    id: child.key,
                    ...child.val(),
                    likes: child.val().likes || 0,
                    comments: child.val().comments || [],
                    uploadDate: child.val().uploadDate || new Date().toISOString()
                });
            });
            console.log(`✅ Loaded ${pdfs.length} PDFs`);
        } else {
            console.log("⚠️ No PDFs found in database");
        }
        
        // Update notice board
        updateNoticeBoard();
        filterPdfs();
        updateStats();
    }, (error) => {
        console.error("❌ Error loading PDFs:", error);
        showError("Failed to load PDFs from database.");
    });
}

// ==================== NOTICE BOARD ====================
function updateNoticeBoard() {
    const noticeItems = document.querySelectorAll('.notice-item');
    if (noticeItems.length >= 2 && pdfs.length > 0) {
        // Update first notice item with library stats
        noticeItems[0].querySelector('p').innerHTML = 
            `Library now has <strong>${pdfs.length} PDFs</strong> across <strong>${categories.length} categories</strong>`;
        
        // Update second notice item with latest PDF
        const latestPdf = getLatestPDF();
        if (latestPdf) {
            const name = latestPdf.name.length > 30 
                ? latestPdf.name.substring(0, 30) + '...' 
                : latestPdf.name;
            noticeItems[1].querySelector('p').innerHTML = 
                `Latest: <strong>${name}</strong> uploaded recently`;
        }
    }
}

function getLatestPDF() {
    if (pdfs.length === 0) return null;
    
    return pdfs.reduce((latest, current) => {
        const latestDate = new Date(latest.uploadDate || 0);
        const currentDate = new Date(current.uploadDate || 0);
        return currentDate > latestDate ? current : latest;
    });
}

// ==================== SORTING ====================
function sortPDFs(pdfsArray) {
    const sorted = [...pdfsArray];
    
    switch(sortOrder) {
        case 'newest':
            return sorted.sort((a, b) => 
                new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0)
            );
        case 'oldest':
            return sorted.sort((a, b) => 
                new Date(a.uploadDate || 0) - new Date(b.uploadDate || 0)
            );
        case 'name':
            return sorted.sort((a, b) => 
                (a.name || '').localeCompare(b.name || '')
            );
        case 'downloads':
            return sorted.sort((a, b) => 
                (b.downloads || 0) - (a.downloads || 0)
            );
        case 'likes':
            return sorted.sort((a, b) => 
                (b.likes || 0) - (a.likes || 0)
            );
        default:
            return sorted;
    }
}

// ==================== UI RENDERING ====================
function renderCategoriesDropdown() {
    const dropdown = document.getElementById('categoriesDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<div class="dropdown-item active" data-category="all">All Categories</div>';
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('data-category', category.id);
        item.textContent = category.name;
        dropdown.appendChild(item);
    });
}

function filterPdfs() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filteredPdfs = [...pdfs];
    
    // Filter by category
    if (currentCategory !== 'all') {
        filteredPdfs = filteredPdfs.filter(pdf => 
            pdf.categories && pdf.categories.includes(currentCategory)
        );
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredPdfs = filteredPdfs.filter(pdf => {
            const nameMatch = pdf.name && pdf.name.toLowerCase().includes(searchTerm);
            const descMatch = pdf.description && pdf.description.toLowerCase().includes(searchTerm);
            
            // Also search in category names
            let categoryMatch = false;
            if (pdf.categories) {
                pdf.categories.forEach(catId => {
                    const cat = categories.find(c => c.id === catId);
                    if (cat && cat.name && cat.name.toLowerCase().includes(searchTerm)) {
                        categoryMatch = true;
                    }
                });
            }
            
            return nameMatch || descMatch || categoryMatch;
        });
    }
    
    // Sort PDFs
    filteredPdfs = sortPDFs(filteredPdfs);
    
    renderPDFs();
    renderPagination();
}

function renderPDFs() {
    if (currentView === 'grid') {
        renderGridView();
    } else {
        renderListView();
    }
}

function renderGridView() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'The library is empty. Add some PDFs!' : 'Try a different search or category.'}</p>
            </div>
        `;
        return;
    }
   // renderGridView ফাংশনের পরেই এই renderListView ফাংশনটি যোগ করুন
function renderListView() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'The library is empty. Add some PDFs!' : 'Try a different search or category.'}</p>
            </div>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '<div class="pdf-list-container">';
    
    pagePdfs.forEach(pdf => {
        // Get category names
        let categoryNames = 'Uncategorized';
        if (pdf.categories && pdf.categories.length > 0) {
            const pdfCategories = categories.filter(cat => pdf.categories.includes(cat.id));
            categoryNames = pdfCategories.map(cat => cat.name).join(', ');
        }
        
        // Check if user liked this PDF
        const isLiked = userLikes[pdf.id] === true;
        
        // File type
        const isDrive = pdf.type === 'drive';
        const fileTypeIcon = isDrive ? 'fab fa-google-drive' : 'fas fa-file-upload';
        const fileTypeClass = isDrive ? 'drive' : 'local';
        
        // Format date
        const uploadDate = pdf.uploadDate ? new Date(pdf.uploadDate).toLocaleDateString() : 'Unknown';
        
        // Truncate description
        const description = pdf.description && pdf.description.length > 100 
            ? pdf.description.substring(0, 100) + '...' 
            : pdf.description || 'No description available';
        
        html += `
        <div class="pdf-list-item" onclick="openPDFModal('${pdf.id}')">
            <div class="list-item-left">
                <div class="list-file-icon">
                    <i class="fas fa-file-pdf"></i>
                    <div class="file-type-badge ${fileTypeClass}">
                        <i class="${fileTypeIcon}"></i>
                    </div>
                </div>
                <div class="list-item-info">
                    <h4>${pdf.name || 'Unnamed PDF'}</h4>
                    <p class="list-description">${description}</p>
                    <div class="list-meta">
                        <span class="meta-item">
                            <i class="fas fa-tag"></i> ${categoryNames}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i> ${uploadDate}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-weight-hanging"></i> ${pdf.size || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="list-item-right">
                <div class="list-stats">
                    <div class="list-stat">
                        <i class="fas fa-download"></i>
                        <span>${pdf.downloads || 0}</span>
                    </div>
                    <div class="list-stat">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span>${pdf.likes || 0}</span>
                    </div>
                    <div class="list-stat">
                        <i class="fas fa-comment"></i>
                        <span>${(pdf.comments || []).length}</span>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm list-action-btn" onclick="event.stopPropagation(); downloadPDF('${pdf.id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
} 
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category name
        let categoryName = 'Uncategorized';
        if (pdf.categories && pdf.categories.length > 0) {
            const firstCatId = pdf.categories[0];
            const firstCategory = categories.find(cat => cat.id === firstCatId);
            if (firstCategory) {
                categoryName = firstCategory.name;
            }
        }
        
        // Truncate name
        const displayName = pdf.name && pdf.name.length > 20 
            ? pdf.name.substring(0, 20) + '...' 
            : pdf.name || 'Unnamed PDF';
        
        // File type
        const isDrive = pdf.type === 'drive';
        const fileTypeIcon = isDrive ? 'fab fa-google-drive' : 'fas fa-file-upload';
        const fileTypeClass = isDrive ? 'drive' : '';
        
        // Check if user liked this PDF
        const isLiked = userLikes[pdf.id] === true;
        
        html += `
        <div class="pdf-icon-item" onclick="openPDFModal('${pdf.id}')">
            <div class="download-count">
                <i class="fas fa-download"></i> ${pdf.downloads || 0}
            </div>
            <div class="file-type ${fileTypeClass}">
                <i class="${fileTypeIcon}"></i>
            </div>
            <i class="fas fa-file-pdf"></i>
            <h4>${displayName}</h4>
            <div class="file-size">${pdf.size || 'N/A'}</div>
            <div class="category-tag" title="${categoryName}">${categoryName}</div>
            <div class="pdf-likes">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span>${pdf.likes || 0}</span>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderListView() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-list"></i>
            <h3>List View Coming Soon</h3>
            <p>Currently showing grid view. List view will be available in the next update.</p>
        </div>
    `;
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!pagination || !pageNumbers) return;
    
    if (filteredPdfs.length <= itemsPerPage) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
    
    pageNumbers.innerHTML = '';
    
    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    // Next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageNum = document.createElement('div');
        pageNum.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageNum.textContent = i;
        pageNum.onclick = () => {
            currentPage = i;
            renderPDFs();
            renderPagination();
        };
        pageNumbers.appendChild(pageNum);
    }
}

// ==================== MODAL FUNCTIONS ====================
function openPDFModal(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found in database.');
        return;
    }
    
    currentPdfId = pdfId;
    console.log("Opening PDF:", pdf);
    
    // Update modal content
    document.getElementById('modalPdfTitle').textContent = pdf.name || 'PDF Document';
    document.getElementById('viewingPdfName').textContent = pdf.name || 'PDF Document';
    document.getElementById('pdfViewerMessage').textContent = pdf.description || 'No description available.';
    
    // Update stats in modal
    document.getElementById('modalDownloads').textContent = pdf.downloads || 0;
    document.getElementById('modalLikes').textContent = pdf.likes || 0;
    document.getElementById('modalComments').textContent = (pdf.comments || []).length;
    
    // Update like button
    const likeBtn = document.getElementById('likePdfBtn');
    const likeCount = document.getElementById('likeCount');
    const isLiked = userLikes[pdfId] === true;
    
    if (likeBtn) {
        likeBtn.className = isLiked ? 'btn-like liked' : 'btn-like';
        likeBtn.innerHTML = `
            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
            <span>${isLiked ? 'Liked' : 'Like'}</span>
            <span class="like-count">${pdf.likes || 0}</span>
        `;
    }
    
    if (likeCount) {
        likeCount.textContent = pdf.likes || 0;
    }
    
    // Load comments
    loadComments(pdfId);
    
    // Handle Google Drive link
    const driveContainer = document.getElementById('driveEmbedContainer');
    const driveLink = document.getElementById('driveViewLink');
    
    if (driveContainer && driveLink) {
        if (pdf.type === 'drive' && pdf.driveLink) {
            // Set Google Drive link
            const driveUrl = pdf.driveLink.startsWith('http') 
                ? pdf.driveLink 
                : `https://drive.google.com/file/d/${pdf.driveLink}/view`;
            
            driveLink.href = driveUrl;
            driveLink.target = '_blank';
            driveLink.innerHTML = '<i class="fab fa-google-drive"></i> View on Google Drive';
            driveContainer.style.display = 'block';
            
            console.log("Google Drive link set:", driveUrl);
            
        } else if (pdf.fileURL) {
            // Set direct file link
            driveLink.href = pdf.fileURL;
            driveLink.target = '_blank';
            driveLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Open PDF File';
            driveContainer.style.display = 'block';
            
        } else {
            // Hide if no link available
            driveContainer.style.display = 'none';
            console.log("No link available for this PDF");
        }
    }
    
    // Set download button
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.onclick = function() {
            downloadPDF(pdfId);
        };
    }
    
    // Show modal
    document.getElementById('pdfViewerModal').classList.add('active');
}

async function downloadPDF(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found.');
        return;
    }
    
    try {
        // Increment download count
        const newDownloads = (pdf.downloads || 0) + 1;
        
        // Update in Firebase
        await database.ref('pdfs/' + pdfId).update({ 
            downloads: newDownloads,
            lastDownloaded: new Date().toISOString()
        });
        
        // Open the PDF
        if (pdf.type === 'drive' && pdf.driveLink) {
            const driveUrl = pdf.driveLink.startsWith('http') 
                ? pdf.driveLink 
                : `https://drive.google.com/file/d/${pdf.driveLink}/view`;
            
            window.open(driveUrl, '_blank');
            
        } else if (pdf.fileURL) {
            window.open(pdf.fileURL, '_blank');
            
        } else {
            alert(`PDF: ${pdf.name}\n\nNo direct download link available.`);
        }
        
        // Update local data
        pdf.downloads = newDownloads;
        updateStats();
        filterPdfs();
        
        // Update modal stats
        if (currentPdfId === pdfId) {
            document.getElementById('modalDownloads').textContent = newDownloads;
        }
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download PDF. Please try again.');
    }
}

async function toggleLike(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) return;
    
    try {
        const isLiked = userLikes[pdfId] === true;
        const newLikes = (pdf.likes || 0) + (isLiked ? -1 : 1);
        
        // Update in Firebase
        await database.ref('pdfs/' + pdfId).update({ 
            likes: newLikes
        });
        
        // Update local data
        pdf.likes = newLikes;
        userLikes[pdfId] = !isLiked;
        localStorage.setItem('userLikes', JSON.stringify(userLikes));
        
        // Update UI
        updateStats();
        filterPdfs();
        
        // Update modal if open
        if (currentPdfId === pdfId) {
            const likeBtn = document.getElementById('likePdfBtn');
            const likeCount = document.getElementById('likeCount');
            
            if (likeBtn) {
                likeBtn.className = !isLiked ? 'btn-like liked' : 'btn-like';
                likeBtn.innerHTML = `
                    <i class="${!isLiked ? 'fas' : 'far'} fa-heart"></i>
                    <span>${!isLiked ? 'Liked' : 'Like'}</span>
                    <span class="like-count">${newLikes}</span>
                `;
            }
            
            if (likeCount) {
                likeCount.textContent = newLikes;
            }
            
            document.getElementById('modalLikes').textContent = newLikes;
        }
        
    } catch (error) {
        console.error('Like error:', error);
        alert('Failed to update like. Please try again.');
    }
}

async function addComment(pdfId, commentText) {
    if (!commentText.trim()) {
        alert('Please enter a comment.');
        return;
    }
    
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) return;
    
    try {
        const comments = pdf.comments || [];
        const newComment = {
            id: Date.now().toString(),
            text: commentText,
            author: 'User' + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString(),
            timeAgo: 'Just now'
        };
        
        comments.push(newComment);
        
        // Update in Firebase
        await database.ref('pdfs/' + pdfId).update({ 
            comments: comments
        });
        
        // Update local data
        pdf.comments = comments;
        
        // Update modal
        if (currentPdfId === pdfId) {
            loadComments(pdfId);
            document.getElementById('modalComments').textContent = comments.length;
        }
        
        // Clear input
        document.getElementById('commentInput').value = '';
        
    } catch (error) {
        console.error('Comment error:', error);
        alert('Failed to add comment. Please try again.');
    }
}

function loadComments(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) return;
    
    const comments = pdf.comments || [];
    const commentsList = document.getElementById('commentsList');
    
    if (!commentsList) return;
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="comment-item">
                <div class="comment-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="comment-content">
                    <div class="comment-author">System</div>
                    <div class="comment-text">No comments yet. Be the first to comment!</div>
                    <div class="comment-time">Just now</div>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    comments.slice(-5).reverse().forEach(comment => {
        const timeAgo = getTimeAgo(comment.timestamp);
        html += `
        <div class="comment-item">
            <div class="comment-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="comment-content">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-time">${timeAgo}</div>
            </div>
        </div>
        `;
    });
    
    commentsList.innerHTML = html;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const commentDate = new Date(timestamp);
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return commentDate.toLocaleDateString();
}

function updateStats() {
    const totalPdfsElem = document.getElementById('totalPdfs');
    if (totalPdfsElem) totalPdfsElem.textContent = pdfs.length;
    
    const totalCategoriesElem = document.getElementById('totalCategories');
    if (totalCategoriesElem) totalCategoriesElem.textContent = categories.length;
    
    const totalDownloadsElem = document.getElementById('totalDownloads');
    const totalLikesElem = document.getElementById('totalLikes');
    
    if (totalDownloadsElem || totalLikesElem) {
        let totalDownloads = 0;
        let totalLikes = 0;
        
        pdfs.forEach(pdf => {
            totalDownloads += pdf.downloads || 0;
            totalLikes += pdf.likes || 0;
        });
        
        if (totalDownloadsElem) totalDownloadsElem.textContent = totalDownloads;
        if (totalLikesElem) totalLikesElem.textContent = totalLikes;
    }
}

// ==================== EVENT LISTENERS ====================
function setupAllEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            filterPdfs();
        });
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            currentPage = 1;
            filterPdfs();
        });
    }
    
    // Sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortOrder = sortSelect.value;
            filterPdfs();
        });
    }
    
    // Category dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdown = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    if (dropdownHeader && dropdown) {
        dropdownHeader.addEventListener('click', () => {
            dropdown.classList.toggle('active');
            if (dropdownArrow) {
                dropdownArrow.style.transform = dropdown.classList.contains('active') 
                    ? 'rotate(180deg)' 
                    : 'rotate(0deg)';
            }
        });
        
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                const category = e.target.getAttribute('data-category');
                
                // Update active state
                document.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update selected text
                const selectedText = document.getElementById('selectedCategory');
                if (selectedText) {
                    if (category === 'all') {
                        selectedText.textContent = 'All Categories';
                    } else {
                        const cat = categories.find(c => c.id === category);
                        selectedText.textContent = cat ? cat.name : 'All Categories';
                    }
                }
                
                // Update filter
                currentCategory = category;
                currentPage = 1;
                filterPdfs();
                
                // Close dropdown
                dropdown.classList.remove('active');
                if (dropdownArrow) {
                    dropdownArrow.style.transform = 'rotate(0deg)';
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownHeader.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
                if (dropdownArrow) {
                    dropdownArrow.style.transform = 'rotate(0deg)';
                }
            }
        });
    }
    
    // View toggle buttons
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (gridBtn && listBtn) {
        gridBtn.addEventListener('click', () => {
            if (currentView !== 'grid') {
                currentView = 'grid';
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
                renderPDFs();
            }
        });
        
        listBtn.addEventListener('click', () => {
            if (currentView !== 'list') {
                currentView = 'list';
                listBtn.classList.add('active');
                gridBtn.classList.remove('active');
                renderPDFs();
            }
        });
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPDFs();
                renderPagination();
            }
        });
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPDFs();
                renderPagination();
            }
        });
    }
    
    // Modal close button
    const closeModalBtn = document.getElementById('closeViewerModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('pdfViewerModal').classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('pdfViewerModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    // Like button
    const likeBtn = document.getElementById('likePdfBtn');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            if (currentPdfId) {
                toggleLike(currentPdfId);
            }
        });
    }
    
    // Comment submit
    const commentInput = document.getElementById('commentInput');
    const submitCommentBtn = document.getElementById('submitComment');
    
    if (submitCommentBtn && commentInput) {
        submitCommentBtn.addEventListener('click', () => {
            if (currentPdfId) {
                addComment(currentPdfId, commentInput.value);
            }
        });
        
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && currentPdfId) {
                addComment(currentPdfId, commentInput.value);
            }
        });
    }
    
    // Print button
    const printBtn = document.getElementById('printPdfBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Share button
    const shareBtn = document.getElementById('sharePdfBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (navigator.share) {
                const pdf = pdfs.find(p => p.id === currentPdfId);
                if (pdf) {
                    navigator.share({
                        title: pdf.name || 'PDF Document',
                        text: 'Check out this PDF from RDS Library',
                        url: window.location.href
                    });
                }
            } else {
                alert('Share feature is not supported in your browser. You can copy the URL manually.');
            }
        });
    }
    
    // Quick action buttons
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });
    }
    
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            darkModeToggle.innerHTML = isDark 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        });
    }
    
    // Footer links
    const viewAllPdfs = document.getElementById('viewAllPdfs');
    if (viewAllPdfs) {
        viewAllPdfs.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('selectedCategory').textContent = 'All Categories';
            currentCategory = 'all';
            currentPage = 1;
            filterPdfs();
        });
    }
    
    const viewPopular = document.getElementById('viewPopular');
    if (viewPopular) {
        viewPopular.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('sortSelect').value = 'downloads';
            sortOrder = 'downloads';
            filterPdfs();
        });
    }
    
    const viewNew = document.getElementById('viewNew');
    if (viewNew) {
        viewNew.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('sortSelect').value = 'newest';
            sortOrder = 'newest';
            filterPdfs();
        });
    }
    
    // Test Google Drive link
    const driveLink = document.getElementById('driveViewLink');
    if (driveLink) {
        driveLink.addEventListener('click', function(e) {
            if (!this.href || this.href === '#' || this.href.includes('undefined')) {
                e.preventDefault();
                alert('No valid link available for this PDF.');
            } else {
                console.log("Opening link:", this.href);
            }
        });
    }
}

function showError(message) {
    const container = document.getElementById('pdfIconGrid');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Reload Page
                </button>
            </div>
        `;
    }
}

// ==================== GLOBAL FUNCTIONS ====================
window.openPDFModal = openPDFModal;
window.downloadPDF = downloadPDF;
window.toggleLike = toggleLike;

// Test functions
window.testFirebase = function() {
    console.log("Testing Firebase connection...");
    
    database.ref('.info/connected').once('value')
        .then(snapshot => {
            if (snapshot.val() === true) {
                console.log("✅ Firebase is connected!");
                alert("Firebase connection is working!");
            } else {
                console.log("❌ Firebase is not connected");
                alert("Firebase is not connected.");
            }
        })
        .catch(error => {
            console.error("Firebase test error:", error);
            alert("Firebase test failed: " + error.message);
        });
};

console.log("🎯 PDF Library Viewer Enhanced script loaded!");
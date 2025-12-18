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
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("Firebase initialized successfully!");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const database = firebase.database();

// ==================== GLOBAL VARIABLES ====================
let categories = [];
let pdfs = [];
let currentCategory = 'all';
let currentPdfId = null;
let filteredPdfs = [];
let currentView = 'grid'; // 'grid' or 'list'
let currentPage = 1;
const itemsPerPage = 15; // 3 columns x 5 rows = 15 items per page

// ==================== INITIALIZE VIEWER ====================
function initViewer() {
    console.log("Initializing PDF Viewer...");
    
    // Show loading state
    showLoading();
    
    // Load data from Firebase
    loadCategories();
    loadPDFs();
    
    // Setup event listeners
    setupEventListeners();
}

// ==================== SHOW LOADING STATE ====================
function showLoading() {
    const container = document.getElementById('pdfIconGrid');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <h3>Connecting to Library...</h3>
                <p>Loading PDFs from Firebase database</p>
            </div>
        `;
    }
}

// ==================== LOAD CATEGORIES ====================
function loadCategories() {
    console.log("Loading categories from Firebase...");
    
    database.ref('categories').on('value', (snapshot) => {
        categories = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                categories.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`Loaded ${categories.length} categories`);
        } else {
            console.log("No categories found in database");
        }
        
        renderCategoriesDropdown();
        updateStats();
    }, (error) => {
        console.error("Error loading categories:", error);
        showError("Failed to load categories. Check Firebase connection.");
    });
}

// ==================== LOAD PDFS ====================
function loadPDFs() {
    console.log("Loading PDFs from Firebase...");
    
    database.ref('pdfs').on('value', (snapshot) => {
        pdfs = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                pdfs.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`Loaded ${pdfs.length} PDFs`);
        } else {
            console.log("No PDFs found in database");
        }
        
        filterPdfs();
        updateStats();
    }, (error) => {
        console.error("Error loading PDFs:", error);
        showError("Failed to load PDFs. Check Firebase connection.");
    });
}

// ==================== RENDER CATEGORIES DROPDOWN ====================
function renderCategoriesDropdown() {
    const container = document.getElementById('categoriesDropdown');
    const selectedCategoryElement = document.getElementById('selectedCategory');
    
    if (!container || !selectedCategoryElement) return;
    
    // Clear container
    container.innerHTML = '<div class="dropdown-item active" data-category="all">All Categories</div>';
    
    // Add each category
    if (categories.length > 0) {
        categories.forEach(category => {
            const catElement = document.createElement('div');
            catElement.className = 'dropdown-item';
            catElement.setAttribute('data-category', category.id);
            catElement.textContent = category.name;
            
            container.appendChild(catElement);
        });
    }
    
    // Update selected category text
    updateSelectedCategoryText();
}

// ==================== UPDATE SELECTED CATEGORY TEXT ====================
function updateSelectedCategoryText() {
    const selectedCategoryElement = document.getElementById('selectedCategory');
    if (!selectedCategoryElement) return;
    
    if (currentCategory === 'all') {
        selectedCategoryElement.textContent = 'All Categories';
    } else {
        const selectedCat = categories.find(cat => cat.id === currentCategory);
        selectedCategoryElement.textContent = selectedCat ? selectedCat.name : 'All Categories';
    }
}

// ==================== FILTER PDFS ====================
function filterPdfs() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = pdfs;
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(pdf => 
            pdf.categories && pdf.categories.includes(currentCategory)
        );
    }
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(pdf => {
            // Search in name
            if (pdf.name && pdf.name.toLowerCase().includes(searchTerm)) return true;
            
            // Search in description
            if (pdf.description && pdf.description.toLowerCase().includes(searchTerm)) return true;
            
            // Search in categories
            if (pdf.categories) {
                const pdfCategories = categories.filter(cat => pdf.categories.includes(cat.id));
                return pdfCategories.some(cat => 
                    cat.name && cat.name.toLowerCase().includes(searchTerm)
                );
            }
            
            return false;
        });
    }
    
    filteredPdfs = filtered;
    currentPage = 1; // Reset to first page when filtering
    renderViewerContent();
    renderPagination();
}

// ==================== RENDER VIEWER CONTENT ====================
function renderViewerContent() {
    if (currentView === 'grid') {
        renderIconGrid();
    } else {
        renderListView();
    }
}

// ==================== RENDER ICON GRID ====================
function renderIconGrid() {
    const container = document.getElementById('pdfIconGrid');
    const listContainer = document.getElementById('pdfListView');
    
    if (!container) return;
    
    // Hide list view, show grid view
    if (listContainer) {
        listContainer.style.display = 'none';
    }
    container.style.display = 'grid';
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'No PDFs in the library yet. Check back later!' : 'Try a different category or search term'}</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category names for this PDF
        const pdfCategories = categories.filter(cat => 
            pdf.categories && pdf.categories.includes(cat.id)
        );
        
        // Get primary category for display
        const primaryCategory = pdfCategories.length > 0 ? pdfCategories[0].name : 'Uncategorized';
        
        // Truncate name if too long
        const displayName = pdf.name && pdf.name.length > 25 
            ? pdf.name.substring(0, 25) + '...' 
            : pdf.name || 'Unnamed PDF';
        
        // File size
        const fileSize = pdf.size || 'N/A';
        
        // Download count
        const downloadCount = pdf.downloads || 0;
        
        // File type class
        const fileTypeClass = pdf.type === 'drive' ? 'drive' : '';
        const fileTypeIcon = pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload';
        
        html += `
        <div class="pdf-icon-item" onclick="viewPdf('${pdf.id}')">
            <div class="download-count">
                <i class="fas fa-download"></i> ${downloadCount}
            </div>
            <div class="file-type ${fileTypeClass}">
                <i class="${fileTypeIcon}"></i>
            </div>
            <i class="fas fa-file-pdf"></i>
            <h4>${displayName}</h4>
            <div class="file-size">${fileSize}</div>
            <div class="category-tag" title="${primaryCategory}">${primaryCategory}</div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== RENDER LIST VIEW ====================
function renderListView() {
    const container = document.getElementById('pdfListView');
    const gridContainer = document.getElementById('pdfIconGrid');
    
    if (!container) return;
    
    // Hide grid view, show list view
    if (gridContainer) {
        gridContainer.style.display = 'none';
    }
    container.style.display = 'block';
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'No PDFs in the library yet. Check back later!' : 'Try a different category or search term'}</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category names for this PDF
        const pdfCategories = categories.filter(cat => 
            pdf.categories && pdf.categories.includes(cat.id)
        );
        
        // Format date
        let formattedDate = 'N/A';
        if (pdf.uploadDate) {
            try {
                formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (e) {
                formattedDate = pdf.uploadDate;
            }
        }
        
        // PDF name
        const pdfName = pdf.name || 'Unnamed PDF';
        
        // Description
        const description = pdf.description || 'No description available';
        
        // File size
        const fileSize = pdf.size || 'N/A';
        
        // Download count
        const downloadCount = pdf.downloads || 0;
        
        // File type info
        const fileTypeIcon = pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload';
        const fileTypeText = pdf.type === 'drive' ? 'Google Drive' : 'Direct Upload';
        
        html += `
        <div class="pdf-list-item">
            <div class="list-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="list-content">
                <h4>${pdfName}</h4>
                <p>${description}</p>
                <div class="list-meta">
                    <span><i class="fas fa-hdd"></i> ${fileSize}</span>
                    <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="fas fa-download"></i> ${downloadCount} downloads</span>
                    <span><i class="${fileTypeIcon}"></i> ${fileTypeText}</span>
                </div>
            </div>
            <div class="list-actions">
                <button class="btn btn-primary" onclick="viewPdf('${pdf.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-success" onclick="downloadPdf('${pdf.id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== RENDER PAGINATION ====================
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
    
    // Clear page numbers
    pageNumbers.innerHTML = '';
    
    // Add page numbers (show only 5 pages at a time)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start page if we're at the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // First page button
    if (startPage > 1) {
        const firstPage = document.createElement('div');
        firstPage.className = 'page-number';
        firstPage.textContent = '1';
        firstPage.addEventListener('click', () => {
            currentPage = 1;
            renderViewerContent();
            renderPagination();
        });
        pageNumbers.appendChild(firstPage);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'page-number';
            ellipsis.textContent = '...';
            ellipsis.style.cursor = 'default';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageNumber = document.createElement('div');
        pageNumber.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageNumber.textContent = i;
        pageNumber.addEventListener('click', () => {
            currentPage = i;
            renderViewerContent();
            renderPagination();
        });
        
        pageNumbers.appendChild(pageNumber);
    }
    
    // Last page button
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'page-number';
            ellipsis.textContent = '...';
            ellipsis.style.cursor = 'default';
            pageNumbers.appendChild(ellipsis);
        }
        
        const lastPage = document.createElement('div');
        lastPage.className = 'page-number';
        lastPage.textContent = totalPages;
        lastPage.addEventListener('click', () => {
            currentPage = totalPages;
            renderViewerContent();
            renderPagination();
        });
        pageNumbers.appendChild(lastPage);
    }
    
    // Update button states
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

// ==================== VIEW PDF ====================
function viewPdf(id) {
    const pdf = pdfs.find(p => p.id === id);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    currentPdfId = id;
    
    // Update modal content
    const modalTitle = document.getElementById('modalPdfTitle');
    const pdfName = document.getElementById('viewingPdfName');
    const message = document.getElementById('pdfViewerMessage');
    const driveContainer = document.getElementById('driveEmbedContainer');
    const driveLink = document.getElementById('driveViewLink');
    
    if (modalTitle) modalTitle.textContent = pdf.name || 'PDF Document';
    if (pdfName) pdfName.textContent = pdf.name || 'PDF Document';
    
    if (pdf.type === 'drive' && pdf.driveLink) {
        if (message) message.textContent = pdf.description || "This PDF is hosted on Google Drive.";
        if (driveContainer) driveContainer.style.display = 'block';
        if (driveLink) {
            driveLink.href = pdf.driveLink;
            driveLink.innerHTML = `<i class="fab fa-google-drive"></i> View on Google Drive`;
        }
    } else if (pdf.fileURL) {
        if (message) message.textContent = pdf.description || "This PDF is available for download.";
        if (driveContainer) driveContainer.style.display = 'block';
        if (driveLink) {
            driveLink.href = pdf.fileURL;
            driveLink.innerHTML = `<i class="fas fa-external-link-alt"></i> Open PDF`;
        }
    } else {
        if (message) message.textContent = pdf.description || "PDF document preview.";
        if (driveContainer) driveContainer.style.display = 'none';
    }
    
    // Show modal
    const modal = document.getElementById('pdfViewerModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// ==================== DOWNLOAD PDF ====================
async function downloadPdf(id) {
    const pdf = pdfs.find(p => p.id === id);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    try {
        // Increment download count in database
        const newDownloads = (pdf.downloads || 0) + 1;
        await database.ref('pdfs/' + id).update({ 
            downloads: newDownloads,
            lastDownloaded: new Date().toISOString()
        });
        
        // Open the PDF
        if (pdf.type === 'drive' && pdf.driveLink) {
            // For Google Drive links, open in new tab
            window.open(pdf.driveLink, '_blank');
            alert(`Opening "${pdf.name}" from Google Drive...`);
        } else if (pdf.fileURL) {
            // For uploaded files, open the URL
            window.open(pdf.fileURL, '_blank');
            alert(`Downloading "${pdf.name}"...`);
        } else {
            alert(`PDF: ${pdf.name}\n\nIn a real application, this would download the PDF file.`);
        }
        
        // Update local data
        pdf.downloads = newDownloads;
        updateStats();
        filterPdfs();
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Failed to download PDF. Please try again.');
    }
}

// ==================== UPDATE STATISTICS ====================
function updateStats() {
    const totalPdfsElement = document.getElementById('totalPdfs');
    const totalCategoriesElement = document.getElementById('totalCategories');
    const totalDownloadsElement = document.getElementById('totalDownloads');
    
    if (totalPdfsElement) {
        totalPdfsElement.textContent = pdfs.length;
    }
    
    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = categories.length;
    }
    
    if (totalDownloadsElement) {
        let totalDownloads = 0;
        pdfs.forEach(pdf => {
            totalDownloads += pdf.downloads || 0;
        });
        totalDownloadsElement.textContent = totalDownloads;
    }
}

// ==================== SHOW ERROR ====================
function showError(message) {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
            <h3>Connection Error</h3>
            <p>${message}</p>
            <button onclick="initViewer()" class="btn btn-primary" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> Retry Connection
            </button>
        </div>
    `;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPdfs);
        
        // Clear search on escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterPdfs();
            }
        });
    }
    
    // Categories dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdownContent = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    if (dropdownHeader && dropdownContent && dropdownArrow) {
        dropdownHeader.addEventListener('click', () => {
            dropdownContent.classList.toggle('active');
            dropdownArrow.style.transform = dropdownContent.classList.contains('active') 
                ? 'rotate(180deg)' 
                : 'rotate(0deg)';
        });
        
        // Handle category selection
        dropdownContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                const category = e.target.getAttribute('data-category');
                currentCategory = category;
                
                // Update selected category text
                updateSelectedCategoryText();
                
                // Update active class
                document.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Close dropdown
                dropdownContent.classList.remove('active');
                dropdownArrow.style.transform = 'rotate(0deg)';
                
                // Filter PDFs
                filterPdfs();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdownHeader && dropdownContent && 
                !dropdownHeader.contains(e.target) && 
                !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('active');
                dropdownArrow.style.transform = 'rotate(0deg)';
            }
        });
    }
    
    // View toggle buttons
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', () => {
            if (currentView !== 'grid') {
                currentView = 'grid';
                gridViewBtn.classList.add('active');
                if (listViewBtn) listViewBtn.classList.remove('active');
                renderViewerContent();
            }
        });
    }
    
    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => {
            if (currentView !== 'list') {
                currentView = 'list';
                listViewBtn.classList.add('active');
                if (gridViewBtn) gridViewBtn.classList.remove('active');
                renderViewerContent();
            }
        });
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderViewerContent();
                renderPagination();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderViewerContent();
                renderPagination();
            }
        });
    }
    
    // Modal close button
    const closeModalBtn = document.getElementById('closeViewerModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('pdfViewerModal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    // Download button in modal
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            if (currentPdfId) {
                downloadPdf(currentPdfId);
                const modal = document.getElementById('pdfViewerModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
        });
    }
    
    // Print button in modal
    const printPdfBtn = document.getElementById('printPdfBtn');
    if (printPdfBtn) {
        printPdfBtn.addEventListener('click', () => {
            alert('Print functionality would open print dialog for the PDF.');
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('pdfViewerModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'pdfViewerModal') {
                modal.classList.remove('active');
            }
        });
    }
    
    // Test connection button (for debugging)
    window.testConnection = function() {
        console.log("Testing Firebase connection...");
        database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log("✅ Firebase is connected!");
                alert("Firebase connection is working!");
            } else {
                console.log("❌ Firebase is disconnected");
                alert("Firebase connection failed!");
            }
        });
    };
}

// ==================== INITIALIZE ON LOAD ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("PDF Viewer DOM loaded");
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        showError("Firebase SDK failed to load. Check your internet connection.");
        return;
    }
    
    // Initialize the viewer
    initViewer();
});

// ==================== SAMPLE DATA GENERATOR ====================
window.addSamplePDFs = async function() {
    const samplePDFs = [
        {
            name: "Introduction to Web Development",
            description: "A beginner's guide to HTML, CSS, and JavaScript for web development.",
            type: "drive",
            driveLink: "https://drive.google.com/file/d/1ABC123/view",
            size: "2.5 MB",
            uploadDate: new Date().toISOString().split('T')[0],
            downloads: 15
        },
        {
            name: "Business Analytics Fundamentals",
            description: "Learn the basics of business analytics and data-driven decision making.",
            type: "drive",
            driveLink: "https://drive.google.com/file/d/2DEF456/view",
            size: "3.1 MB",
            uploadDate: "2023-11-15",
            downloads: 28
        },
        {
            name: "Machine Learning Concepts",
            description: "Introduction to machine learning algorithms and their applications.",
            type: "file",
            fileURL: "https://example.com/sample.pdf",
            size: "4.2 MB",
            uploadDate: "2023-11-10",
            downloads: 42
        },
        {
            name: "Python Programming Guide",
            description: "Comprehensive guide to Python programming for beginners.",
            type: "drive",
            driveLink: "https://drive.google.com/file/d/3GHI789/view",
            size: "1.8 MB",
            uploadDate: "2023-10-20",
            downloads: 35
        },
        {
            name: "Data Structures and Algorithms",
            description: "Essential data structures and algorithms for software development.",
            type: "drive",
            driveLink: "https://drive.google.com/file/d/4JKL012/view",
            size: "2.9 MB",
            uploadDate: "2023-10-15",
            downloads: 52
        },
        {
            name: "Web Design Principles",
            description: "Modern web design principles and best practices.",
            type: "file",
            fileURL: "https://example.com/web-design.pdf",
            size: "3.5 MB",
            uploadDate: "2023-10-10",
            downloads: 27
        }
    ];
    
    try {
        // First create sample categories if none exist
        if (categories.length === 0) {
            const sampleCategories = [
                { name: "Technology", color: "technology" },
                { name: "Business", color: "business" },
                { name: "Education", color: "academic" },
                { name: "Programming", color: "technology" },
                { name: "Design", color: "business" }
            ];
            
            for (const cat of sampleCategories) {
                await database.ref('categories').push().set(cat);
            }
            console.log("Added sample categories");
        }
        
        // Wait a moment for categories to load
        setTimeout(async () => {
            // Get category IDs
            const catIds = categories.map(cat => cat.id);
            
            // Add sample PDFs with categories
            for (const pdf of samplePDFs) {
                const pdfCopy = { ...pdf };
                
                // Assign random categories (1-2 categories per PDF)
                const numCategories = Math.floor(Math.random() * 2) + 1;
                const assignedCategories = [];
                for (let i = 0; i < numCategories; i++) {
                    const randomCatId = catIds[Math.floor(Math.random() * catIds.length)];
                    if (!assignedCategories.includes(randomCatId)) {
                        assignedCategories.push(randomCatId);
                    }
                }
                pdfCopy.categories = assignedCategories;
                
                await database.ref('pdfs').push().set(pdfCopy);
            }
            
            console.log("Added sample PDFs");
            alert("Sample data added successfully!");
        }, 1000);
        
    } catch (error) {
        console.error("Error adding sample data:", error);
        alert("Failed to add sample data: " + error.message);
    }
};

// ==================== HELPER FUNCTIONS ====================
// Make functions available globally
window.viewPdf = viewPdf;
window.downloadPdf = downloadPdf;
window.initViewer = initViewedr;

// Test function to check if script is loaded
console.log("PDF Library Viewer script loaded successfully!");
